import type { MapId } from '../maps/types';
import { getMapConfig, MAP_LIST } from '../maps';
import { MapBaker } from './mapBaker';

export type MapTextureSource = HTMLCanvasElement | HTMLImageElement;
type TextureReadyListener = (mapId: MapId, texture: MapTextureSource) => void;

/**
 * Cache and loading manager for high-definition minimap textures.
 * Tries pre-rendered WebP files from /maps/[mapId]_minimap.webp first.
 * If not present, seamlessly falls back to offscreen Three.js MapBaker.
 */
class MapTextureService {
  private cache = new Map<MapId, MapTextureSource>();
  private listeners = new Set<TextureReadyListener>();

  public subscribe(listener: TextureReadyListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(mapId: MapId, texture: MapTextureSource): void {
    this.listeners.forEach((cb) => {
      try {
        cb(mapId, texture);
      } catch (err) {
        console.error('[MapTextureService] Error in listener:', err);
      }
    });
  }

  private inflight = new Map<MapId, Promise<MapTextureSource | null>>();

  /**
   * Synchronous getter for render loops (e.g. requestAnimationFrame).
   * Kicks off async loading if texture is not yet cached.
   */
  public getMapTexture(mapId: MapId): MapTextureSource | null {
    const cached = this.cache.get(mapId);
    if (cached) return cached;

    if (!this.inflight.has(mapId)) {
      this.loadMapTexture(mapId).catch((err) => {
        console.warn(`[MapTextureService] Failed loading texture for ${mapId}:`, err);
      });
    }
    return null;
  }

  /**
   * Manually store a texture into cache.
   */
  public setMapTexture(mapId: MapId, texture: MapTextureSource): void {
    this.cache.set(mapId, texture);
    this.notify(mapId, texture);
  }

  /**
   * Asynchronously loads or bakes a map texture.
   */
  public async loadMapTexture(mapId: MapId): Promise<MapTextureSource | null> {
    if (this.cache.has(mapId)) {
      return this.cache.get(mapId)!;
    }
    const existing = this.inflight.get(mapId);
    if (existing) {
      return existing;
    }
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return null;
    }

    const promise = (async (): Promise<MapTextureSource | null> => {
      // 1. Try static asset (/maps/{mapId}_minimap.webp)
      const staticUrl = `/maps/${mapId}_minimap.webp`;
      try {
        const img = await this.loadImage(staticUrl);
        this.cache.set(mapId, img);
        this.notify(mapId, img);
        return img;
      } catch {
        // 2. Static asset not available, fall back to dynamic Three.js offscreen baker
        try {
          const mapDef = getMapConfig(mapId);
          const canvas = MapBaker.bakeMapToCanvas(mapDef);
          if (canvas) {
            this.cache.set(mapId, canvas);
            this.notify(mapId, canvas);
            return canvas;
          }
        } catch (bakeErr) {
          console.warn(`[MapTextureService] Dynamic bake failed for ${mapId}:`, bakeErr);
        }
      }
      return null;
    })().finally(() => {
      this.inflight.delete(mapId);
    });

    this.inflight.set(mapId, promise);
    return promise;
  }

  /**
   * Pre-loads all maps in the background during idle time.
   */
  public async preloadAllMaps(): Promise<void> {
    for (const mapDef of MAP_LIST) {
      if (!this.cache.has(mapDef.id)) {
        await this.loadMapTexture(mapDef.id);
      }
    }
  }

  /**
   * Clears in-memory texture cache to allow fresh re-baking.
   */
  public clearCache(): void {
    this.cache.clear();
    this.inflight.clear();
  }

  private loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = (e) => reject(e);
      img.src = url;
    });
  }
}

export const mapTextureService = new MapTextureService();

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    mapTextureService.clearCache();
  });
}
