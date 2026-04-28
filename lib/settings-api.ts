export type ServerSettingsPayload = {
  profile?: Record<string, unknown>;
  language?: Record<string, unknown>;
  notifications?: Record<string, unknown>;
  security?: Record<string, unknown>;
  database?: Record<string, unknown>;
  alerts?: Record<string, unknown>;
};

export async function fetchServerSettings(): Promise<ServerSettingsPayload | null> {
  try {
    const res = await fetch('/api/settings', {
      cache: 'no-store',
      credentials: 'include',
    });

    if (!res.ok) {
      return null;
    }

    return await res.json();
  } catch {
    return null;
  }
}

export async function saveServerSettings(payload: ServerSettingsPayload): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, error: data?.error || 'Erreur serveur' };
    }

    return { ok: true };
  } catch {
    return { ok: false, error: 'Erreur réseau' };
  }
}
