## 1. BFF and session

- [x] 1.1 Add typed backend client, stable error mapping and server-only base URL configuration.
- [x] 1.2 Add login, registration, logout, projects and project-forms route handlers.
- [x] 1.3 Store only the backend session token in a protected cookie and sanitize project creation responses.

## 2. Authentication UI

- [x] 2.1 Submit login and registration to the BFF with pending and backend error states.
- [x] 2.2 Navigate successful authentication to the cabinet and add logout.

## 3. Cabinet

- [x] 3.1 Move cabinet composition into an FSD widget slice compatible with the reserved Next.js `src/pages` directory.
- [x] 3.2 Load projects and forms with loading, empty, unauthorized and retryable error states.
- [x] 3.3 Support first-project creation and project selection without demo records.

## 4. Runtime and verification

- [x] 4.1 Configure the internal backend URL for local/Compose runtime.
- [x] 4.2 Update context and run tests, coverage, lint, typecheck, build and Compose validation.
