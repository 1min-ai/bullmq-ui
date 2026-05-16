const CREDS_KEY = "bullmq_studio_auth";

interface Credentials {
  username: string;
  password: string;
}

export function getCredentials(): Credentials | null {
  try {
    const raw = sessionStorage.getItem(CREDS_KEY);
    return raw ? (JSON.parse(raw) as Credentials) : null;
  } catch {
    return null;
  }
}

export function setCredentials(username: string, password: string): void {
  sessionStorage.setItem(CREDS_KEY, JSON.stringify({ username, password }));
}

export function clearCredentials(): void {
  sessionStorage.removeItem(CREDS_KEY);
}

export function getAuthHeader(): string | null {
  const creds = getCredentials();
  if (!creds) return null;
  return `Basic ${btoa(`${creds.username}:${creds.password}`)}`;
}
