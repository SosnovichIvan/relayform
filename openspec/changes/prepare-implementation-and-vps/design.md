## Delivery model

The VPS script is run manually by an administrator with `sudo` on a fresh Ubuntu/Debian host. It reads a shell-compatible configuration file, validates required non-secret fields, then installs OS dependencies, obtains the repository with an existing read-only SSH deploy key, renders Nginx and provisions/renews a Let's Encrypt certificate.

The config names an existing application environment file and a separate service-token file on the VPS. It never stores passwords, API keys, private keys or certificate material in Git. The script refuses unsafe values, a missing deploy key, token file, Compose file, or a domain that does not resolve to the VPS.

The application contract is Docker Compose with a loopback-only application port and a health endpoint. The actual Dockerfile and production Compose service are explicit prerequisites for the frontend/backend bootstrapping tasks, so the script can prepare a host but is not represented as a deployable app before they exist.

## Task decomposition

- Frontend task: bootstrap Next.js/FSD, implement landing/auth/cabinet from Figma, adopt API contracts, then test accessibility and states.
- Backend task: implement account/project/event/destination models, recipient onboarding, queue/delivery lifecycle, confirmation e-mails and observability.
- Infrastructure task: complete Docker image/Compose contract, then use the VPS bootstrap guide for a first controlled release.

## Safety decisions

- Use an unprivileged deploy user for the repository and Docker Compose; `sudo` is used only for packages, Nginx, UFW and Certbot.
- Nginx is the sole public HTTP(S) entry point; the app is bound to `127.0.0.1`.
- Certbot's Nginx plugin handles renewal; certificate issuance occurs only after DNS is verified.
- The script is idempotent for package installation, repository update, Nginx rendering and certificate renewal.
- During MVP, provider tokens are loaded only from the separate VPS token file through Docker Compose `env_file`; application code receives them as runtime environment variables and never reads a repository file.
- Credential acquisition is documented as an administrator-only procedure with official provider links, least-privilege guidance, a test/rotation checklist and a distinction between credentials that can be obtained now and provider approvals that are prerequisites.
