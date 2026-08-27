export const openApiSpec = {
  openapi: "3.0.0",
  info: {
    title: "Secure Auth API",
    version: "1.0.0",
    description: "JWT-based authentication API built on Neon Postgres.",
  },
  servers: [{ url: "/" }],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
    },
  },
  paths: {
    "/auth/signup": {
      post: {
        summary: "Create a new account",
        responses: {
          "201": { description: "Account created" },
          "400": { description: "Missing or invalid input" },
          "409": { description: "Email already registered" },
        },
      },
    },
    "/auth/login": {
      post: {
        summary: "Log in and receive an access + refresh token",
        responses: {
          "200": { description: "accessToken and refreshToken returned" },
          "401": { description: "Invalid credentials" },
          "429": { description: "Too many failed attempts, backoff in effect" },
        },
      },
    },
    "/auth/refresh": {
      post: {
        summary: "Exchange a refresh token for a new access token",
        responses: {
          "200": { description: "New accessToken returned" },
          "401": { description: "Invalid or expired refresh token" },
        },
      },
    },
    "/auth/logout": {
      post: {
        summary: "Revoke a refresh token",
        security: [{ bearerAuth: [] }],
        responses: {
          "204": { description: "Logged out" },
          "401": { description: "Missing/invalid access token" },
        },
      },
    },
    "/protected/profile": {
      get: {
        summary: "Get the logged-in user's profile",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "User profile" },
          "401": { description: "Missing, malformed, or invalid/expired token" },
        },
      },
    },
    "/protected/dashboard": {
      get: {
        summary: "Get the logged-in user's dashboard",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Welcome message" },
          "401": { description: "Missing, malformed, or invalid/expired token" },
        },
      },
    },
    "/public/info": {
      get: {
        summary: "Open, unauthenticated route",
        responses: { "200": { description: "Public message" } },
      },
    },
  },
};