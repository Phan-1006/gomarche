import fs from 'fs';
import path from 'path';
import type { Firestore } from 'firebase-admin/firestore';

/**
 * Où les données sont conservées.
 * - Sans configuration : un fichier sur le disque (développement, ou serveur avec disque persistant).
 * - Avec FIREBASE_SERVICE_ACCOUNT : Firestore, pour les hébergements dont le disque est effacé
 *   à chaque redémarrage.
 * Dans les deux cas le serveur travaille en mémoire et ne fait qu'y recopier ses changements.
 */
export interface Snapshot {
  // Documents d'état (configuration, listes découpées en morceaux) : remplacés ou supprimés librement.
  state: Record<string, unknown>;
  // Documents qui ne sont jamais supprimés : une commande ou une conversation ancienne reste archivée.
  orders: Record<string, unknown>;
  chats: Record<string, unknown>;
}

export interface Store {
  kind: 'file' | 'firestore';
  load(): Promise<Snapshot | null>;
  persist(snapshot: Snapshot): Promise<void>;
  saveUpload(name: string, data: Buffer, contentType: string): Promise<void>;
  // null = stockage sur disque, servi directement par Express.
  readUpload(name: string): Promise<{ data: Buffer; contentType: string } | null>;
}

// ---------------------------------------------------------------- fichier

export function fileStore(dataDir: string, uploadsDir: string): Store {
  const file = path.join(dataDir, 'db.json');
  return {
    kind: 'file',
    async load() {
      if (!fs.existsSync(file)) return null;
      try {
        const raw = fs.readFileSync(file, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed && parsed.state) return parsed as Snapshot;
        // Ancien format (avant le découpage en documents) : laissé à db.ts, qui sait le relire.
        return { state: { __legacy: parsed }, orders: {}, chats: {} };
      } catch {
        // Fichier illisible : on le met de côté plutôt que de l'écraser.
        fs.renameSync(file, `${file}.corrupt-${Date.now()}`);
        return null;
      }
    },
    async persist(snapshot) {
      const tmp = `${file}.tmp`;
      fs.writeFileSync(tmp, JSON.stringify(snapshot), { encoding: 'utf-8', mode: 0o600 });
      fs.renameSync(tmp, file);
    },
    async saveUpload(name, data) {
      fs.writeFileSync(path.join(uploadsDir, name), data);
    },
    async readUpload() {
      return null;
    },
  };
}

// ---------------------------------------------------------------- Firestore

// Au démarrage, seules les commandes récentes sont rechargées : cela borne le nombre de lectures
// (quota gratuit) quel que soit l'historique accumulé.
const ORDERS_WINDOW_MS = 45 * 24 * 60 * 60 * 1000;
const CHATS_WINDOW_MS = 3 * 24 * 60 * 60 * 1000;
// Un document Firestore ne dépasse pas 1 Mo.
export const FIRESTORE_UPLOAD_LIMIT = 900 * 1024;

// Firestore ne garantit pas l'ordre des champs : on compare les documents sous une forme
// canonique (clés triées), sinon chaque redémarrage réécrirait tout pour rien.
function canonical(value: unknown): string {
  return JSON.stringify(value, (_key, v) =>
    v && typeof v === 'object' && !Array.isArray(v)
      ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, (v as Record<string, unknown>)[k]]))
      : v
  );
}

function parseServiceAccount(raw: string) {
  // Les erreurs ne reprennent jamais le contenu reçu : il s'agit d'une clé secrète, et les
  // journaux de l'hébergeur ne doivent pas en contenir le moindre extrait.
  const fail = (why: string) =>
    new Error(`FIREBASE_SERVICE_ACCOUNT invalide : ${why}. Collez le contenu complet du fichier JSON de clé, de la première accolade à la dernière.`);
  let json: any;
  try {
    const text = raw.trim().startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf-8');
    json = JSON.parse(text);
  } catch {
    throw fail('ce n’est pas du JSON lisible');
  }
  if (json?.type !== 'service_account' || !json.project_id || !json.client_email || !json.private_key) {
    throw fail('ce n’est pas une clé de compte de service (champs manquants)');
  }
  return json;
}

export async function firestoreStore(): Promise<Store> {
  const { initializeApp, cert } = await import('firebase-admin/app');
  const { getFirestore } = await import('firebase-admin/firestore');
  let firestore: Firestore;
  if (process.env.FIRESTORE_EMULATOR_HOST) {
    firestore = getFirestore(initializeApp({ projectId: process.env.FIREBASE_PROJECT_ID || 'demo-gomarche' }));
  } else {
    const account = parseServiceAccount(process.env.FIREBASE_SERVICE_ACCOUNT!);
    firestore = getFirestore(initializeApp({ credential: cert(account), projectId: account.project_id }));
  }
  firestore.settings({ ignoreUndefinedProperties: true });

  // Dernier état connu de chaque document : seuls les documents réellement modifiés sont réécrits.
  const written = new Map<string, string>();
  const uploadCache = new Map<string, { data: Buffer; contentType: string }>();

  return {
    kind: 'firestore',
    async load() {
      const now = Date.now();
      const [state, orders, chats] = await Promise.all([
        firestore.collection('state').get(),
        firestore.collection('orders').where('createdAt', '>=', now - ORDERS_WINDOW_MS).get(),
        firestore.collection('chats').where('updatedAt', '>=', now - CHATS_WINDOW_MS).get(),
      ]);
      if (state.empty) return null;
      const snapshot: Snapshot = { state: {}, orders: {}, chats: {} };
      const read = (target: Record<string, unknown>, collection: string, docs: typeof state.docs) => {
        for (const doc of docs) {
          target[doc.id] = doc.data();
          written.set(`${collection}/${doc.id}`, canonical(doc.data()));
        }
      };
      read(snapshot.state, 'state', state.docs);
      read(snapshot.orders, 'orders', orders.docs);
      read(snapshot.chats, 'chats', chats.docs);
      return snapshot;
    },
    async persist(snapshot) {
      const ops: { path: string; json: string | null; data?: unknown }[] = [];
      const diff = (collection: string, docs: Record<string, unknown>, deletable: boolean) => {
        for (const [id, data] of Object.entries(docs)) {
          const key = `${collection}/${id}`;
          const json = canonical(data);
          if (written.get(key) !== json) ops.push({ path: key, json, data: JSON.parse(json) });
        }
        if (deletable) {
          for (const key of written.keys()) {
            if (key.startsWith(`${collection}/`) && !(key.slice(collection.length + 1) in docs)) ops.push({ path: key, json: null });
          }
        }
      };
      diff('state', snapshot.state, true);
      diff('orders', snapshot.orders, false);
      diff('chats', snapshot.chats, false);

      // Un lot Firestore accepte 500 écritures au plus.
      for (let i = 0; i < ops.length; i += 400) {
        const batch = firestore.batch();
        const slice = ops.slice(i, i + 400);
        for (const op of slice) {
          if (op.json === null) batch.delete(firestore.doc(op.path));
          else batch.set(firestore.doc(op.path), op.data as FirebaseFirestore.DocumentData);
        }
        await batch.commit();
        for (const op of slice) {
          if (op.json === null) written.delete(op.path);
          else written.set(op.path, op.json);
        }
      }
    },
    async saveUpload(name, data, contentType) {
      await firestore.collection('uploads').doc(name).set({ data, contentType, createdAt: Date.now() });
      uploadCache.set(name, { data, contentType });
    },
    async readUpload(name) {
      const cached = uploadCache.get(name);
      if (cached) return cached;
      const doc = await firestore.collection('uploads').doc(name).get();
      const value = doc.data();
      if (!doc.exists || !value) return null;
      const entry = { data: Buffer.from(value.data), contentType: String(value.contentType) };
      // Les images sont immuables (nom aléatoire) : on garde les plus récentes en mémoire.
      if (uploadCache.size >= 200) uploadCache.delete(uploadCache.keys().next().value!);
      uploadCache.set(name, entry);
      return entry;
    },
  };
}
