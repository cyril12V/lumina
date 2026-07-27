import fs from 'fs';
import path from 'path';

/**
 * Où vit le fichier SQLite entre deux démarrages.
 *
 * La base tient entièrement en mémoire (sql.js) : on ne persiste que des
 * instantanés du fichier complet. C'est ce qui permet de garder une API de
 * requêtes synchrone tout en tournant sur un hébergement gratuit dont le
 * système de fichiers est éphémère.
 */
export interface SnapshotStore {
  /** Description lisible, pour les logs de démarrage. */
  readonly description: string;
  /** Renvoie l'instantané existant, ou `null` si aucun n'a encore été écrit. */
  load(): Promise<Uint8Array | null>;
  save(data: Uint8Array): Promise<void>;
  /**
   * Variante synchrone, utilisée en dernier recours dans `process.on('exit')`
   * où l'on ne peut plus attendre de promesse. `null` si le backend ne sait
   * pas écrire de façon synchrone (cas du stockage distant).
   */
  saveSync: ((data: Uint8Array) => void) | null;
}

/** Disque local : développement, Docker, ou hébergement avec disque persistant. */
export class LocalFileStore implements SnapshotStore {
  readonly description: string;

  constructor(private readonly file: string) {
    this.description = `fichier local ${file}`;
  }

  async load(): Promise<Uint8Array | null> {
    return this.loadSync();
  }

  loadSync(): Uint8Array | null {
    if (!fs.existsSync(this.file)) return null;
    return fs.readFileSync(this.file);
  }

  async save(data: Uint8Array): Promise<void> {
    this.saveSync(data);
  }

  /** Écriture atomique : fichier temporaire puis renommage. */
  saveSync = (data: Uint8Array): void => {
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    const tmpFile = `${this.file}.tmp`;
    fs.writeFileSync(tmpFile, data);
    fs.renameSync(tmpFile, this.file);
  };
}

/**
 * Stockage objet distant, via un simple GET/PUT authentifié par jeton porteur.
 * Compatible tel quel avec Supabase Storage, et avec tout service exposant une
 * URL d'objet en lecture/écriture.
 *
 * Un `PUT` ne peut pas être émis depuis `process.on('exit')` : l'arrêt propre
 * repose sur les signaux SIGTERM/SIGINT, que tous les hébergeurs envoient avant
 * d'éteindre un conteneur.
 */
export class RemoteHttpStore implements SnapshotStore {
  readonly description: string;
  readonly saveSync = null;

  constructor(
    private readonly url: string,
    private readonly token: string | undefined
  ) {
    this.description = `stockage distant ${new URL(url).origin}`;
  }

  private headers(extra: Record<string, string> = {}): Record<string, string> {
    return {
      ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
      ...extra,
    };
  }

  async load(): Promise<Uint8Array | null> {
    const response = await fetch(this.url, { headers: this.headers() });

    // Aucun instantané encore écrit : premier démarrage, on partira d'une base neuve.
    if (response.status === 404) return null;

    // Toute autre erreur doit être fatale. Repartir d'une base vide reviendrait
    // à écraser l'instantané distant à la première écriture, donc à perdre
    // toutes les données à cause d'une panne réseau passagère.
    if (!response.ok) {
      throw new Error(
        `Lecture de l'instantané impossible (HTTP ${response.status} ${response.statusText}). ` +
          `Démarrage interrompu pour ne pas risquer d'écraser les données distantes.`
      );
    }

    return new Uint8Array(await response.arrayBuffer());
  }

  async save(data: Uint8Array): Promise<void> {
    const response = await fetch(this.url, {
      method: 'PUT',
      headers: this.headers({
        'Content-Type': 'application/octet-stream',
        // Supabase Storage : autorise l'écrasement de l'objet existant.
        'x-upsert': 'true',
      }),
      body: data,
    });

    if (!response.ok) {
      throw new Error(
        `Écriture de l'instantané impossible (HTTP ${response.status} ${response.statusText})`
      );
    }
  }
}
