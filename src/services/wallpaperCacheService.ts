import { openDB, type IDBPDatabase } from 'idb';
import type { WallpaperGenerationResult } from '../types/wallpaper';

const DB_NAME = 'aura3d-wallpapers-db';
const STORE_NAME = 'wallpapers';
const DB_VERSION = 1;

export class WallpaperCacheService {
  private static dbPromise: Promise<IDBPDatabase> | null = null;

  private static getDB(): Promise<IDBPDatabase> {
    if (!this.dbPromise) {
      this.dbPromise = openDB(DB_NAME, DB_VERSION, {
        upgrade(db) {
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            store.createIndex('createdAt', 'createdAt');
            store.createIndex('isFavorite', 'isFavorite');
          }
        },
      });
    }
    return this.dbPromise;
  }

  /**
   * Guarda un wallpaper generado en IndexedDB
   */
  static async save(wallpaper: WallpaperGenerationResult): Promise<void> {
    try {
      const db = await this.getDB();
      await db.put(STORE_NAME, wallpaper);
    } catch (err) {
      console.warn('[WallpaperCache] Error saving to IndexedDB:', err);
    }
  }

  /**
   * Obtiene un wallpaper por ID
   */
  static async get(id: string): Promise<WallpaperGenerationResult | undefined> {
    try {
      const db = await this.getDB();
      return await db.get(STORE_NAME, id);
    } catch (err) {
      console.warn('[WallpaperCache] Error reading from IndexedDB:', err);
      return undefined;
    }
  }

  /**
   * Retorna todos los wallpapers guardados ordenados por fecha
   */
  static async getAll(): Promise<WallpaperGenerationResult[]> {
    try {
      const db = await this.getDB();
      const all = await db.getAll(STORE_NAME);
      return all.sort((a, b) => b.createdAt - a.createdAt);
    } catch (err) {
      console.warn('[WallpaperCache] Error listing from IndexedDB:', err);
      return [];
    }
  }

  /**
   * Retorna los favoritos
   */
  static async getFavorites(): Promise<WallpaperGenerationResult[]> {
    try {
      const db = await this.getDB();
      return await db.getAllFromIndex(STORE_NAME, 'isFavorite', true as any);
    } catch {
      const all = await this.getAll();
      return all.filter((w) => w.isFavorite);
    }
  }

  /**
   * Elimina un wallpaper por ID
   */
  static async delete(id: string): Promise<void> {
    try {
      const db = await this.getDB();
      await db.delete(STORE_NAME, id);
    } catch (err) {
      console.warn('[WallpaperCache] Error deleting from IndexedDB:', err);
    }
  }

  /**
   * Limpia toda la caché de wallpapers
   */
  static async clear(): Promise<void> {
    try {
      const db = await this.getDB();
      await db.clear(STORE_NAME);
    } catch (err) {
      console.warn('[WallpaperCache] Error clearing IndexedDB:', err);
    }
  }

  /**
   * Calcula el peso acumulado en bytes
   */
  static async getCacheSize(): Promise<number> {
    try {
      const items = await this.getAll();
      return items.reduce((sum, item) => sum + (item.fileSize || 0), 0);
    } catch {
      return 0;
    }
  }
}
