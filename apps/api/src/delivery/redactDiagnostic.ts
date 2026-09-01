const secretPattern = /(token|authorization|api[_ -]?key)\s*[:=]\s*[^\s,;]+/gi;
const emailPattern = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;

export function redactDiagnostic(message: string): string {
  return message.replace(secretPattern, '$1=[redacted]').replace(emailPattern, '[email redacted]');
}
