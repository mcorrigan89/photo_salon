type RuntimeConfig = {
  __SERVER_URL__?: string;
  __CLIENT_URL__?: string;
};

export function getServerUrl(): string {
  return (globalThis as RuntimeConfig).__SERVER_URL__ ?? "http://localhost:3001";
}

export function getClientUrl(): string {
  return (globalThis as RuntimeConfig).__CLIENT_URL__ ?? "http://localhost:3000";
}
