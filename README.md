# Naval Combat Online (Web 3D Multiplayer)

Real-time 3D multiplayer naval warfare game built with **React 19**, **Three.js**, **React Three Fiber (R3F)**, **Zustand**, and powered by a high-performance **uWebSockets.js** game server.

---

## Architecture Highlights

- **3D Ocean & Ships**:
  - Deterministic Gerstner Wave mathematics ($h = f(x, z, t_{\text{server}})$) synchronized with server timestamp — zero network bandwidth spent on wave heights.
  - Procedural low-poly historical ship geometries (Sloop, Brig, and Frigate) with dynamic billowed sails, rotating rudder, and animated masthead pennants.
  - Parabolic broadside cannonball ballistics with server-authoritative collision detection.
- **Ultra-Fast Multiplayer Server**:
  - Node.js + TypeScript + **`uWebSockets.js`** (C++ V8 engine).
  - 30 Hz authoritative simulation tick rate.
  - Room and fleet matchmaking with spectator mode upon vessel sinking.
  - Built-in static asset serving for production Vite build.
- **GitOps & Deployment**:
  - Kubernetes cluster on `192.168.1.41` (namespace `apps`).
  - Domain: `naval-combat.cekcok.my.id`.
  - Ingress Nginx with WebSocket upgrade configuration.
  - Automated CI/CD via GitHub Actions pushing to GitHub Container Registry (`ghcr.io/jati251/naval-combat-online`).

---

## Development

Install dependencies with pnpm:
```bash
pnpm install
```

Start the frontend Vite dev server (with WebSocket proxy to `:3000`):
```bash
pnpm run dev
```

Start the uWebSockets.js game server in watch mode:
```bash
pnpm run dev:server
```

Build both client and server:
```bash
pnpm run build
```

Run production server:
```bash
pnpm start
```
