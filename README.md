# Secure Auth API

A JWT based authentication API built with TypeScript, Express, and Neon Postgres. It handles signup, login, logout, token refresh, and route protection, with security controls built in rather than added as an afterthought.

## What this project does

1. Lets a user create an account with an email and password.
2. Hashes passwords with bcrypt before storing them. Plain text passwords are never stored or logged.
3. Issues a short lived access token and a long lived refresh token on login.
4. Verifies access tokens on protected routes using a signature check, with no database call required.
5. Allows logout by revoking the refresh token tied to that session.
6. Slows down repeated failed logins per account using exponential backoff, without ever locking an account out completely.
7. Documents every route in Swagger UI with bearer token authorization support.

## Why Neon instead of Supabase

This project was originally scoped around Supabase Auth, which acts as a full identity provider. It hashes passwords and issues tokens on your behalf. Neon is only a Postgres database, so this project builds that missing layer by hand using bcrypt for password hashing and jsonwebtoken for signing and verifying tokens. That is the deliberate difference from the original assignment brief.

## Tech stack

1. Runtime: Node.js
2. Language: TypeScript, ESM modules
3. Framework: Express 5
4. Database: Neon (serverless Postgres), accessed through the pg driver
5. Password hashing: bcryptjs
6. Tokens: jsonwebtoken for access tokens, random bytes plus SHA256 for refresh tokens
7. Validation: zod
8. Security middleware: helmet, express rate limit
9. Documentation: swagger ui express

## Getting started

### 1. Create a Neon project

Sign up at neon.tech, create a new project, and copy the pooled connection string from the project dashboard.

### 2. Configure environment variables

Copy `.env.example` to `.env` and fill in real values.

```
DATABASE_URL=your_neon_pooled_connection_string
JWT_ACCESS_SECRET=generate_a_long_random_string
PORT=6767
```


Generate a secret with:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Run that command twice so `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` are different values.

### 3. Install dependencies

```bash
npm install
```

### 4. Create the database tables

```bash
npm run migrate
```

### 5. Run the server

```bash
npm run dev
```

The server starts on `http://localhost:6767`. Swagger docs are available at `http://localhost:6767/docs`.

## Swagger documentation

Screenshot of the Swagger UI showing the bearer authorization padlock on protected routes.

![Swagger UI](./docs/swagger-screenshot.png)

## API reference

| Method | Route | Auth required | Purpose |
|--------|-------|----------------|---------|
| POST | /auth/signup | none | Create a new account |
| POST | /auth/login | none, rate limited | Log in and receive an access token and refresh token |
| POST | /auth/refresh | none, needs refreshToken | Exchange a valid refresh token for a new access token |
| POST | /auth/logout | Authorization Bearer token | Revoke a refresh token |
| GET | /protected/profile | Authorization Bearer token | Read the logged in user's account details |
| GET | /protected/dashboard | Authorization Bearer token | Second example route using the same guard |
| GET | /public/info | none | Open, unauthenticated route |

Status codes used across the API:

1. 201 account created
2. 200 successful request
3. 204 logout succeeded, no content returned
4. 400 missing or invalid input
5. 401 missing, malformed, invalid, or expired token, or wrong credentials
6. 409 email already registered
7. 429 too many requests, either from the IP based rate limiter or the per account login backoff

## Sample requests

### Sign up

```bash
curl -i -X POST http://localhost:6767/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","password":"a-strong-password"}'
```

### Log in

```bash
curl -i -X POST http://localhost:6767/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","password":"a-strong-password"}'
```

Response includes both `accessToken` and `refreshToken`.

### Call a protected route

```bash
curl -i http://localhost:6767/protected/profile \
  -H "Authorization: Bearer PASTE_ACCESS_TOKEN_HERE"
```

### Refresh an expired access token

```bash
curl -i -X POST http://localhost:6767/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"PASTE_REFRESH_TOKEN_HERE"}'
```

### Log out

```bash
curl -i -X POST http://localhost:6767/auth/logout \
  -H "Authorization: Bearer PASTE_ACCESS_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"PASTE_REFRESH_TOKEN_HERE"}'
```

## Security measures

1. SQL injection defense: every database query uses parameterized placeholders through the pg driver. No query is ever built by joining strings together.
2. Password storage: bcrypt with a cost factor of 12. The plain text password never touches the database or logs.
3. Input validation: every request body is validated with zod using strict schemas that reject unknown fields, before any route logic runs.
4. Response headers: helmet sets protective headers and removes the X Powered By header that would otherwise reveal the framework in use.
5. Rate limiting: a global limiter covers the whole API, with a stricter limiter applied specifically to signup and login.
6. Per account login backoff: failed login attempts on a single account trigger an increasing delay, capped at 30 seconds, rather than a hard lockout. This avoids letting an attacker lock a real user out simply by entering the wrong password on purpose.
7. Generic authentication errors: a login failure returns the same message whether the email does not exist or the password is wrong, so the API cannot be used to check which emails are registered.
8. Body size limits: JSON request bodies are capped to prevent oversized payloads from being used to exhaust server memory.
9. Secrets management: all secrets are loaded from environment variables through a gitignored `.env` file. `.env.example` documents the required keys with placeholder values only.

## Why logout does not instantly disable the access token

Logging out revokes the refresh token, which stops the client from getting a new access token afterward. The access token the client already holds is a self contained, signed JWT, and verifying it never involves a database lookup, which is what keeps regular requests fast. That token continues to work until it naturally expires. The access token lifetime is kept short specifically to keep that window small. A system that needs to revoke access tokens instantly would need to check every token against a database on every request, which removes the main performance benefit of using JWTs in the first place.