// Set fake env vars before any module calls getServerEnv() / getSharedEnv()
Object.assign(process.env, {
  DATABASE_URL: "postgresql://test:test@localhost:5432/test",
  BETTER_AUTH_SECRET: "test-secret-at-least-32-characters-long",
  BETTER_AUTH_URL: "http://localhost:3001",
  SERVER_URL: "http://localhost:3001",
  CLIENT_URL: "http://localhost:3000",
  POLAR_ENABLED: "false",
  NODE_ENV: "test",
});
