import { randomBytes, randomUUID } from 'node:crypto';
import { createProjectApiKey, hashSecret, verifySecret } from '../auth/credentialService.js';

type QueryResult<Row> = { rows: Row[] };
export type PostgresExecutor = { query<Row = Record<string, never>>(sql: string, values?: string[]): Promise<QueryResult<Row>> };

type UserRow = { id: string; password_hash: string };
type ProjectRow = { id: string; name: string; api_key_hash?: string };
type FormRow = { id: string; projectId: string; name: string; siteUrl: string };
type DestinationRow = { id: string; formId: string; provider: 'telegram' | 'vk' | 'max' | 'email'; recipient: string; status: 'pending_activation' | 'active' };
type TemplateRow = { id: string; projectId: string; subject: string; body: string; theme: 'light' | 'dark'; redirectUrl: string };

export class PostgresIdentityStore {
  private readonly sessions = new Map<string, string>();

  constructor(private readonly database: PostgresExecutor) {}

  async register(email: string, password: string): Promise<string | undefined> {
    const id = randomUUID();
    const result = await this.database.query<{ id: string }>(
      'INSERT INTO users (id, email, password_hash) VALUES ($1, $2, $3) ON CONFLICT (email) DO NOTHING RETURNING id',
      [id, email, hashSecret(password)],
    );
    return result.rows[0]?.id;
  }

  async login(email: string, password: string): Promise<string | undefined> {
    const result = await this.database.query<UserRow>('SELECT id, password_hash FROM users WHERE email = $1', [email]);
    const user = result.rows[0];
    return user && verifySecret(password, user.password_hash) ? user.id : undefined;
  }

  createSession(userId: string): string {
    const token = randomBytes(32).toString('hex');
    this.sessions.set(token, userId);
    return token;
  }

  getSessionUser(token: string | undefined): string | undefined { return token ? this.sessions.get(token) : undefined; }

  async createProject(ownerId: string, name: string): Promise<{ id: string; apiKey: string }> {
    const id = randomUUID();
    const apiKey = createProjectApiKey();
    await this.database.query(
      'INSERT INTO projects (id, owner_id, name, api_key_hash) VALUES ($1, $2, $3, $4)',
      [id, ownerId, name, hashSecret(apiKey)],
    );
    return { id, apiKey };
  }

  async listProjects(ownerId: string): Promise<Array<Pick<ProjectRow, 'id' | 'name'>>> {
    return (await this.database.query<ProjectRow>('SELECT id, name FROM projects WHERE owner_id = $1 ORDER BY created_at', [ownerId])).rows;
  }

  async getProjectIdForApiKey(apiKey: string | undefined): Promise<string | undefined> {
    if (!apiKey) return undefined;
    const projects = await this.database.query<ProjectRow>('SELECT id, api_key_hash FROM projects');
    return projects.rows.find((project) => project.api_key_hash && verifySecret(apiKey, project.api_key_hash))?.id;
  }

  async createForm(ownerId: string, projectId: string, name: string, siteUrl: string): Promise<FormRow | undefined> {
    const result = await this.database.query<FormRow>('INSERT INTO forms (id, project_id, name, site_url) SELECT $1, $2, $3, $4 WHERE EXISTS (SELECT 1 FROM projects WHERE id = $2 AND owner_id = $5) RETURNING id, project_id AS "projectId", name, site_url AS "siteUrl"', [randomUUID(), projectId, name, siteUrl, ownerId]);
    return result.rows[0];
  }

  async listForms(ownerId: string, projectId: string): Promise<FormRow[] | undefined> {
    if (!await this.canAccessProject(ownerId, projectId)) return undefined;
    return (await this.database.query<FormRow>('SELECT id, project_id AS "projectId", name, site_url AS "siteUrl" FROM forms WHERE project_id = $1 ORDER BY created_at', [projectId])).rows;
  }

  async getForm(ownerId: string, formId: string): Promise<FormRow | undefined> {
    return (await this.database.query<FormRow>('SELECT forms.id, forms.project_id AS "projectId", forms.name, forms.site_url AS "siteUrl" FROM forms JOIN projects ON projects.id = forms.project_id WHERE forms.id = $1 AND projects.owner_id = $2', [formId, ownerId])).rows[0];
  }

  async updateForm(ownerId: string, formId: string, name: string, siteUrl: string): Promise<FormRow | undefined> {
    return (await this.database.query<FormRow>('UPDATE forms SET name = $1, site_url = $2 FROM projects WHERE forms.id = $3 AND projects.id = forms.project_id AND projects.owner_id = $4 RETURNING forms.id, forms.project_id AS "projectId", forms.name, forms.site_url AS "siteUrl"', [name, siteUrl, formId, ownerId])).rows[0];
  }

  async deleteForm(ownerId: string, formId: string): Promise<boolean | undefined> {
    return (await this.database.query<{ id: string }>('DELETE FROM forms USING projects WHERE forms.id = $1 AND projects.id = forms.project_id AND projects.owner_id = $2 RETURNING forms.id', [formId, ownerId])).rows[0] ? true : undefined;
  }

  async createDestination(ownerId: string, formId: string, provider: DestinationRow['provider'], recipient: string) {
    const result = await this.database.query<DestinationRow>('INSERT INTO destinations (id, form_id, provider, recipient, status) SELECT $1, $2, $3, $4, $5 WHERE EXISTS (SELECT 1 FROM forms JOIN projects ON projects.id = forms.project_id WHERE forms.id = $2 AND projects.owner_id = $6) RETURNING id, form_id AS "formId", provider, recipient, status', [randomUUID(), formId, provider, recipient, 'pending_activation', ownerId]);
    return this.mapDestination(result.rows[0]);
  }

  async listDestinations(ownerId: string, formId: string) {
    if (!await this.canAccessForm(ownerId, formId)) return undefined;
    return (await this.database.query<DestinationRow>('SELECT id, form_id AS "formId", provider, recipient, status FROM destinations WHERE form_id = $1 ORDER BY created_at', [formId])).rows.map((row) => this.mapDestination(row)!);
  }

  async updateDestination(ownerId: string, destinationId: string, recipient: string) {
    const result = await this.database.query<DestinationRow>('UPDATE destinations SET status = CASE WHEN destinations.provider = \'email\' AND destinations.recipient <> $1 THEN \'pending_activation\' ELSE destinations.status END, recipient = $1 FROM forms, projects WHERE destinations.id = $2 AND forms.id = destinations.form_id AND projects.id = forms.project_id AND projects.owner_id = $3 RETURNING destinations.id, destinations.form_id AS "formId", destinations.provider, destinations.recipient, destinations.status', [recipient, destinationId, ownerId]);
    return this.mapDestination(result.rows[0]);
  }

  async deleteDestination(ownerId: string, destinationId: string): Promise<boolean | undefined> {
    return (await this.database.query<{ id: string }>('DELETE FROM destinations USING forms, projects WHERE destinations.id = $1 AND forms.id = destinations.form_id AND projects.id = forms.project_id AND projects.owner_id = $2 RETURNING destinations.id', [destinationId, ownerId])).rows[0] ? true : undefined;
  }

  async createEmailTemplate(ownerId: string, projectId: string, subject: string, body: string, theme: 'light' | 'dark', redirectUrl: string): Promise<TemplateRow | undefined> {
    const result = await this.database.query<TemplateRow>('INSERT INTO email_templates (id, project_id, subject, body, theme, redirect_url) SELECT $1, $2, $3, $4, $5, $6 WHERE EXISTS (SELECT 1 FROM projects WHERE id = $2 AND owner_id = $7) RETURNING id, project_id AS "projectId", subject, body, theme, redirect_url AS "redirectUrl"', [randomUUID(), projectId, subject, body, theme, redirectUrl, ownerId]);
    return result.rows[0];
  }

  async listEmailTemplates(ownerId: string, projectId: string): Promise<TemplateRow[] | undefined> {
    if (!await this.canAccessProject(ownerId, projectId)) return undefined;
    return (await this.database.query<TemplateRow>('SELECT id, project_id AS "projectId", subject, body, theme, redirect_url AS "redirectUrl" FROM email_templates WHERE project_id = $1 ORDER BY created_at', [projectId])).rows;
  }

  async getEmailTemplate(ownerId: string, templateId: string): Promise<TemplateRow | undefined> {
    return (await this.database.query<TemplateRow>('SELECT email_templates.id, email_templates.project_id AS "projectId", email_templates.subject, email_templates.body, email_templates.theme, email_templates.redirect_url AS "redirectUrl" FROM email_templates JOIN projects ON projects.id = email_templates.project_id WHERE email_templates.id = $1 AND projects.owner_id = $2', [templateId, ownerId])).rows[0];
  }

  async getEmailTemplateForProject(projectId: string, templateId: string): Promise<TemplateRow | undefined> {
    return (await this.database.query<TemplateRow>('SELECT id, project_id AS "projectId", subject, body, theme, redirect_url AS "redirectUrl" FROM email_templates WHERE id = $1 AND project_id = $2', [templateId, projectId])).rows[0];
  }

  async updateEmailTemplate(ownerId: string, templateId: string, subject: string, body: string, theme: 'light' | 'dark', redirectUrl: string): Promise<TemplateRow | undefined> {
    return (await this.database.query<TemplateRow>('UPDATE email_templates SET subject = $1, body = $2, theme = $3, redirect_url = $4, updated_at = now() FROM projects WHERE email_templates.id = $5 AND projects.id = email_templates.project_id AND projects.owner_id = $6 RETURNING email_templates.id, email_templates.project_id AS "projectId", email_templates.subject, email_templates.body, email_templates.theme, email_templates.redirect_url AS "redirectUrl"', [subject, body, theme, redirectUrl, templateId, ownerId])).rows[0];
  }

  async deleteEmailTemplate(ownerId: string, templateId: string): Promise<boolean | undefined> {
    return (await this.database.query<{ id: string }>('DELETE FROM email_templates USING projects WHERE email_templates.id = $1 AND projects.id = email_templates.project_id AND projects.owner_id = $2 RETURNING email_templates.id', [templateId, ownerId])).rows[0] ? true : undefined;
  }

  async isDestinationOwnedByProject(projectId: string, destinationId: string): Promise<boolean> {
    return (await this.database.query('SELECT 1 FROM destinations JOIN forms ON forms.id = destinations.form_id WHERE destinations.id = $1 AND forms.project_id = $2', [destinationId, projectId])).rows.length > 0;
  }

  async getDestinationForDelivery(projectId: string, destinationId: string): Promise<(Pick<DestinationRow, 'provider' | 'recipient'> & { formId: string }) | undefined> {
    return (await this.database.query<Pick<DestinationRow, 'provider' | 'recipient'> & { formId: string }>('SELECT forms.id AS "formId", destinations.provider, destinations.recipient FROM destinations JOIN forms ON forms.id = destinations.form_id WHERE destinations.id = $1 AND forms.project_id = $2 AND destinations.status = $3', [destinationId, projectId, 'active'])).rows[0];
  }

  async getDestinationForActivation(ownerId: string, destinationId: string) {
    const destination = (await this.database.query<Pick<DestinationRow, 'provider' | 'recipient' | 'status'>>('SELECT destinations.provider, destinations.recipient, destinations.status FROM destinations JOIN forms ON forms.id = destinations.form_id JOIN projects ON projects.id = forms.project_id WHERE destinations.id = $1 AND projects.owner_id = $2', [destinationId, ownerId])).rows[0];
    return destination && { provider: destination.provider, recipient: destination.recipient, status: destination.status === 'active' ? 'active' as const : 'pendingActivation' as const };
  }

  async activateTelegramDestination(ownerId: string, destinationId: string, recipient: string) {
    const result = await this.database.query<DestinationRow>('UPDATE destinations SET recipient = $1, status = $2 FROM forms, projects WHERE destinations.id = $3 AND destinations.provider = $4 AND forms.id = destinations.form_id AND projects.id = forms.project_id AND projects.owner_id = $5 RETURNING destinations.id, destinations.form_id AS "formId", destinations.provider, destinations.recipient, destinations.status', [recipient, 'active', destinationId, 'telegram', ownerId]);
    return this.mapDestination(result.rows[0]);
  }

  async activateVkDestination(ownerId: string, destinationId: string, recipient: string) {
    const result = await this.database.query<DestinationRow>('UPDATE destinations SET recipient = $1, status = $2 FROM forms, projects WHERE destinations.id = $3 AND destinations.provider = $4 AND forms.id = destinations.form_id AND projects.id = forms.project_id AND projects.owner_id = $5 RETURNING destinations.id, destinations.form_id AS "formId", destinations.provider, destinations.recipient, destinations.status', [recipient, 'active', destinationId, 'vk', ownerId]);
    return this.mapDestination(result.rows[0]);
  }

  async activateMaxDestination(ownerId: string, destinationId: string, recipient: string) {
    const result = await this.database.query<DestinationRow>(
      `UPDATE destinations SET recipient = $3, status = 'active'
       FROM forms JOIN projects ON projects.id = forms.project_id
       WHERE destinations.id = $1 AND destinations.form_id = forms.id AND projects.owner_id = $2 AND destinations.provider = 'max'
       RETURNING destinations.id, destinations.form_id AS "formId", destinations.provider, destinations.recipient, destinations.status`,
      [destinationId, ownerId, recipient],
    );
    return this.mapDestination(result.rows[0]);
  }

  async activateEmailDestination(ownerId: string, destinationId: string) {
    const result = await this.database.query<DestinationRow>('UPDATE destinations SET status = $1 FROM forms, projects WHERE destinations.id = $2 AND destinations.provider = $3 AND forms.id = destinations.form_id AND projects.id = forms.project_id AND projects.owner_id = $4 RETURNING destinations.id, destinations.form_id AS "formId", destinations.provider, destinations.recipient, destinations.status', ['active', destinationId, 'email', ownerId]);
    return this.mapDestination(result.rows[0]);
  }

  private async canAccessProject(ownerId: string, projectId: string): Promise<boolean> {
    return (await this.database.query('SELECT 1 FROM projects WHERE id = $1 AND owner_id = $2', [projectId, ownerId])).rows.length > 0;
  }

  private async canAccessForm(ownerId: string, formId: string): Promise<boolean> {
    return (await this.database.query('SELECT 1 FROM forms JOIN projects ON projects.id = forms.project_id WHERE forms.id = $1 AND projects.owner_id = $2', [formId, ownerId])).rows.length > 0;
  }

  private mapDestination(destination: DestinationRow | undefined) {
    return destination && { ...destination, status: destination.status === 'active' ? 'active' as const : 'pendingActivation' as const };
  }
}
