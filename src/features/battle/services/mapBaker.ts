import * as THREE from 'three';
import type { MapDefinition } from '../maps/types';
import { createIslandTerrainGeometry, getIslandElevation } from '../components/3d/islands/islandGeometries';

/**
 * Offscreen 3D Map Baker for Naval Combat Online
 * Uses Three.js WebGLRenderer with an OrthographicCamera pointed straight down
 * to capture high-fidelity full-ocean maps with organic island coastlines, reefs, and beaches.
 * Coordinates are un-mirrored: +Z is North (top), +X is East (right).
 */
export class MapBaker {
  /**
   * Bakes the entire map (ocean, reefs, and islands) into an HTMLCanvasElement.
   * Completely eliminates square island tiles by clipping below-water terrain
   * and rendering a continuous hydrodynamic sea surface.
   */
  public static bakeMapToCanvas(mapDef: MapDefinition, resolution = 512): HTMLCanvasElement | null {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return null;
    }

    const canvas = document.createElement('canvas');
    canvas.width = resolution;
    canvas.height = resolution;

    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) {
      console.warn('[MapBaker] WebGL not supported on offscreen canvas');
      return null;
    }

    let renderer: THREE.WebGLRenderer | null = null;
    const geometriesToDispose: THREE.BufferGeometry[] = [];
    const materialsToDispose: THREE.Material[] = [];

    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: false,
        antialias: true,
        preserveDrawingBuffer: true,
        powerPreference: 'high-performance',
      });
      renderer.setSize(resolution, resolution, false);
      renderer.setPixelRatio(1);
      renderer.localClippingEnabled = true;

      const scene = new THREE.Scene();
      const radius = mapDef.radius;

      // 1. Solid ocean water background
      const oceanColor = new THREE.Color(mapDef.water.midWaterColor);
      scene.background = oceanColor;
      renderer.setClearColor(oceanColor, 1.0);

      // 2. Full-coverage ocean surface plane (spans 4x radius to eliminate all edges)
      const oceanGeo = new THREE.PlaneGeometry(radius * 4.0, radius * 4.0);
      oceanGeo.rotateX(-Math.PI / 2);
      geometriesToDispose.push(oceanGeo);

      const oceanMat = new THREE.MeshStandardMaterial({
        color: oceanColor,
        roughness: 0.65,
        metalness: 0.1,
        side: THREE.DoubleSide,
      });
      materialsToDispose.push(oceanMat);

      const oceanMesh = new THREE.Mesh(oceanGeo, oceanMat);
      oceanMesh.position.set(0, 0, 0);
      scene.add(oceanMesh);

      // 3. Lighting: ambient + sunny angled directional light for realistic relief
      const ambientLight = new THREE.AmbientLight(0xffffff, 1.6);
      scene.add(ambientLight);

      const sunLight = new THREE.DirectionalLight(0xfff7e2, 2.4);
      sunLight.position.set(300, 700, 300);
      sunLight.lookAt(0, 0, 0);
      scene.add(sunLight);

      // 4. Shared terrain material: CLIPS AWAY any vertex below sea level (world Y < 0.05)
      const waterClip = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0.05);
      const terrainMaterial = new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.88,
        metalness: 0.04,
        clippingPlanes: [waterClip],
        clipShadows: true,
        side: THREE.DoubleSide,
      });
      materialsToDispose.push(terrainMaterial);

      // 5. Shallow turquoise reef material for island fringes
      const shallowMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(mapDef.water.shallowColor),
        transparent: true,
        opacity: 0.65,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      materialsToDispose.push(shallowMat);

      // 6. Add each island
      for (let i = 0; i < mapDef.islands.length; i++) {
        const island = mapDef.islands[i];
        if (island.settlement?.type === 'sea-arch') continue;

        const scaleX = island.elongation?.scaleX ?? 1;
        const scaleZ = island.elongation?.scaleZ ?? 1;
        const rotY = island.elongation?.angle ?? 0;

        // A. Shallow coral reef disc (glowing turquoise fringe around island coastline)
        const reefRadius = Math.max(island.radius, island.sandRadius) * 1.16;
        const reefGeo = new THREE.CircleGeometry(reefRadius, 48);
        reefGeo.rotateX(-Math.PI / 2);
        geometriesToDispose.push(reefGeo);

        const reefMesh = new THREE.Mesh(reefGeo, shallowMat);
        reefMesh.position.set(island.x, 0.02, island.z);
        reefMesh.rotation.y = rotY;
        reefMesh.scale.set(scaleX, 1, scaleZ);
        scene.add(reefMesh);

        // B. 3D Island Terrain (Dry land, beach, hills, canopies)
        const geo = createIslandTerrainGeometry(island);
        geometriesToDispose.push(geo);

        const mesh = new THREE.Mesh(geo, terrainMaterial);
        mesh.position.set(0, getIslandElevation(island) + 2.0, 0);

        const group = new THREE.Group();
        group.position.set(island.x, 0, island.z);
        group.rotation.y = rotY;

        const innerGroup = new THREE.Group();
        innerGroup.scale.set(scaleX, 1, scaleZ);
        innerGroup.add(mesh);
        group.add(innerGroup);

        scene.add(group);
      }

      // 7. Tactical arena boundary ring
      const ringGeo = new THREE.RingGeometry(radius - 2.5, radius + 0.5, 96);
      ringGeo.rotateX(-Math.PI / 2);
      geometriesToDispose.push(ringGeo);
      const ringMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color('#d4af37'),
        transparent: true,
        opacity: 0.35,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      materialsToDispose.push(ringMat);
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.position.set(0, 0.03, 0);
      scene.add(ringMesh);

      // 8. Orthographic Camera pointed straight down from above
      // Frustum bounds: width = 2 * radius, height = 2 * radius
      // Orientation aligned with Heading-Up navigation:
      // +X -> Left of texture (x < 512)
      // -X -> Right of texture (x > 512)
      // +Z -> Top of texture (y < 512)
      // -Z -> Bottom of texture (y > 512)
      const camera = new THREE.OrthographicCamera(
        -radius,
        radius,
        radius,
        -radius,
        1,
        2500
      );
      camera.position.set(0, 1200, 0);
      camera.rotation.set(-Math.PI / 2, 0, Math.PI);
      camera.updateMatrixWorld();
      camera.updateProjectionMatrix();

      // Render 1 complete frame
      renderer.render(scene, camera);

      // Snapshot rendered pixels into a persistent 2D canvas before destroying WebGL context
      const outputCanvas = document.createElement('canvas');
      outputCanvas.width = resolution;
      outputCanvas.height = resolution;
      const outCtx = outputCanvas.getContext('2d');
      if (outCtx) {
        outCtx.drawImage(canvas, 0, 0);
      }

      return outputCanvas;
    } catch (err) {
      console.error('[MapBaker] Error during map baking:', err);
      return null;
    } finally {
      for (let i = 0; i < geometriesToDispose.length; i++) {
        geometriesToDispose[i].dispose();
      }
      for (let i = 0; i < materialsToDispose.length; i++) {
        materialsToDispose[i].dispose();
      }
      if (renderer) {
        try {
          renderer.forceContextLoss();
          renderer.dispose();
        } catch {
          // ignore disposal errors
        }
      }
    }
  }

  /**
   * Bakes the map and returns a base64 DataURL (WebP format).
   */
  public static exportMapAsDataUrl(mapDef: MapDefinition, resolution = 1024): string | null {
    const canvas = this.bakeMapToCanvas(mapDef, resolution);
    if (!canvas) return null;
    return canvas.toDataURL('image/webp', 0.95);
  }

  /**
   * Utility to trigger a browser file download of the baked map texture.
   */
  public static downloadBakedMap(mapDef: MapDefinition, resolution = 1024): void {
    if (typeof document === 'undefined') return;
    const dataUrl = this.exportMapAsDataUrl(mapDef, resolution);
    if (!dataUrl) return;

    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `${mapDef.id}_minimap.webp`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
