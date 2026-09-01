## ADDED Requirements

### Requirement: Config-driven VPS bootstrap
The repository MUST provide a documented VPS bootstrap script that reads deployment settings from a non-secret configuration file.

#### Scenario: Administrator prepares a new VPS
- **WHEN** the administrator supplies a valid configuration and runs the script with sudo on a supported host
- **THEN** the script validates prerequisites and prepares Docker Compose, Nginx, firewall rules and certificate management without placing secrets in the repository

### Requirement: TLS and reverse proxy
The deployment baseline MUST route public traffic through Nginx and provision a Let's Encrypt certificate only after domain/DNS validation.

#### Scenario: Domain does not resolve to the VPS
- **WHEN** DNS validation fails
- **THEN** the script stops before certificate issuance and reports the required corrective action

### Requirement: Application deployment prerequisites
The deployment documentation MUST state the required Docker Compose, loopback port and health-endpoint contract for the application.

#### Scenario: Application image is not yet implemented
- **WHEN** the project lacks its Dockerfile or Compose service
- **THEN** the documentation identifies it as a frontend/backend prerequisite rather than claiming the VPS script deploys a working application

### Requirement: Isolated MVP service tokens
The deployment baseline MUST use a separate unversioned token file for Relayform-owned provider credentials during MVP.

#### Scenario: Application starts on a VPS
- **WHEN** Docker Compose starts the application and worker
- **THEN** provider tokens are supplied only via the VPS token file, are readable by the deploy user, and are not present in the repository, deploy config or client-facing API

### Requirement: Provider credential acquisition guide
The repository MUST document where an administrator obtains each supported provider credential, the relevant prerequisite or approval, and how it is placed and rotated in the MVP token file.

#### Scenario: Administrator enables a delivery provider
- **WHEN** the administrator prepares a provider for Relayform
- **THEN** they can follow an official-source guide without asking a tenant to supply credentials
