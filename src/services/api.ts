/**
 * Client de l'API Gomarché. Le serveur est la seule source de vérité : rien de ce qui compte
 * (comptes, prix, commandes, configuration) n'est décidé ou stocké dans le navigateur.
 */

export class ApiError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export async function api<T = any>(method: 'GET' | 'POST' | 'PUT' | 'DELETE', path: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      method,
      credentials: 'same-origin',
      headers: {
        'X-Requested-With': 'gomarche',
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError('Connexion au serveur impossible. Vérifiez votre réseau.', 0);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.error || 'Une erreur est survenue.', res.status, data.code);
  return data as T;
}

export const errorMessage = (e: unknown) => (e instanceof Error ? e.message : 'Une erreur est survenue.');
