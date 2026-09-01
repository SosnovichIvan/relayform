## Why

Login, registration and the cabinet currently use local demo behavior. Users cannot create a real session or see projects and forms persisted by the backend.

## What Changes

- Add a same-origin Next.js BFF for backend authentication and cabinet reads.
- Store the backend session token in an `HttpOnly` cookie and add logout.
- Connect the auth form to real login/registration responses.
- Replace cabinet demo forms with real project selection, first-project creation and form loading states.
- Configure the production frontend with the internal backend URL.

## Non-goals

- Form/destination mutations, email-template persistence, API-key display/rotation, password reset and session expiry/refresh are not included.
