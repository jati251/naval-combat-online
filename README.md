# ⚓ Naval Combat Online

<div align="center">

![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![React 19](https://img.shields.io/badge/React_19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Three.js](https://img.shields.io/badge/Three.js-black?style=for-the-badge&logo=three.js&logoColor=white)
![Zustand](https://img.shields.io/badge/Zustand-443e38?style=for-the-badge&logo=react&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![uWebSockets.js](https://img.shields.io/badge/uWebSockets.js-005571?style=for-the-badge&logo=cplusplus&logoColor=white)

**Real-time 3D multiplayer naval warfare game inspired by *Assassin's Creed IV: Black Flag*.**  
Powered by React 19, Three.js, deterministic Gerstner ocean waves, procedural audio synthesis, and a high-throughput uWebSockets.js game server.

[Features](#-gameplay--technical-features) • [Controls](#-gameplay-controls) • [Ships](#-warship-commission-classes) • [Architecture](#-architecture--vertical-slice-structure) • [Getting Started](#-getting-started)

</div>

---

## 🌊 Gameplay & Technical Features

### 1. Synchronized Caribbean Ocean Simulation
- **Zero-Bandwidth Deterministic Waves**: 4-octave Gerstner wave mathematics ($h = f(x, z, t_{\text{server}})$) synchronized perfectly with server timestamps. Ship floating, pitch, and roll match visual wave crests without sending vertex coordinates across the network.
- **Translucent Subsurface Scattering (SSS)**: Waves facing the sun transmit luminous emerald/cyan rays through thin crests.
- **Dual-Layer Optical Depth Caustics**: Moving underwater light refractions that simulate clear tropical Caribbean water.
- **Procedural Fractional Brownian Motion (FBM) Foam**: Dynamic whitecaps and sea foam dynamically generated at wave peaks.
- **Camera-Centered Horizon Tracking**: Infinite ocean horizon rendered efficiently at 120+ FPS with only $140 \times 140$ vertices.

### 2. Tactical Caribbean Islands & Archipelago
- **4 Handcrafted Islands**: *Dead Man's Cay*, *Isla de la Muerte*, *Smuggler's Reef*, and *Tortuga Atoll* featuring sandy coral shoals, rocky limestone cliffs, and coconut palms.
- **Physical Collision & Grounding**: Ships cutting too close to island shallows are physically repelled with an 80% speed grounding penalty.
- **Ballistic Tactical Cover**: Island terrain obstructs enemy cannonballs, enabling tactical ambushes and hit-and-run maneuvers.
- **Nautical Compass Radar**: Islands and enemy vessels are mapped in real-time onto the circular compass HUD with boundary clipping.

### 3. Black Flag Naval Combat & Ballistics
- **Independent Broadside Batteries**: Port and Starboard batteries reload independently with distinct reload cooldown gauges.
- **Ballistic Trajectory Arc**: Holding Port (`Q`) or Starboard (`E`) swings the camera into broadside aim and projects a glowing 3D ballistic arc showing projectile drop and landing points.
- **Procedural Web Audio Engine**: Zero external audio asset dependencies. Synthesizes cannon thunders with lowpass gunpowder sweeps, sub-bass rumbles, ship bells, wood splinters, ocean splashes, and sail unfurling whooshes.

### 4. Authoritative Multiplayer Engine
- **30 Hz Simulation Tick**: Powered by **`uWebSockets.js`** (C++ V8 engine) for ultra-low latency WebSocket frame handling.
- **Server-Side Anti-Cheat**: Speed capping, arena perimeter repelling (500m radius), aground collision detection, and authoritative damage calculation.
- **Spectator Mode**: Sunk captains seamlessly transition to spectating the remaining fleet until a victor is crowned.

---

## 🎮 Gameplay Controls

| Action | Primary Key | Secondary / Mouse | Description |
| :--- | :--- | :--- | :--- |
| **Steer Port (Left)** | <kbd>A</kbd> | <kbd>←</kbd> | Turn rudder to port (left) |
| **Steer Starboard (Right)** | <kbd>D</kbd> | <kbd>→</kbd> | Turn rudder to starboard (right) |
| **Unfurl Sails (Faster)** | <kbd>W</kbd> | <kbd>↑</kbd> | Shift sails: `Anchor` $\rightarrow$ `Half Sail` $\rightarrow$ `Full Sail` |
| **Reef Sails (Slower)** | <kbd>S</kbd> | <kbd>↓</kbd> | Shift sails: `Full Sail` $\rightarrow$ `Half Sail` $\rightarrow$ `Anchor` |
| **Aim Port Battery** | <kbd>Q</kbd> *(Hold)* | — | Swing camera to left gunports & project trajectory |
| **Aim Starboard Battery** | <kbd>E</kbd> *(Hold)* | — | Swing camera to right gunports & project trajectory |
| **Fire Broadside Salvo** | <kbd>SPACE</kbd> | **Left Mouse Click** | Unleash devastating cannon barrage from aimed battery |
| **Toggle Audio Mute** | HUD Icon | — | Mute / unmute procedural sound engine |
| **Abandon Battle** | HUD Icon | — | Return to harbor lobby |

---

## 🚢 Warship Commission Classes

| Class | Title | Hull HP | Top Speed | Turn Rate | Cannons | Playstyle |
| :--- | :--- | :---: | :---: | :---: | :---: | :--- |
| **Sloop** | *Swift Corsair* | **100 HP** | **18.0 kts** | **1.20 rad/s** | 4 (2 per side) | Agile raider. Excels at circling and outmaneuvering heavier vessels. |
| **Brig** | *Iron Marauder* | **180 HP** | **14.0 kts** | **0.85 rad/s** | 8 (4 per side) | Balanced warship. Dual masts with dependable firepower and armor. |
| **Frigate** | *Leviathan Dreadnought* | **260 HP** | **10.5 kts** | **0.55 rad/s** | 12 (6 per side) | Floating fortress. Devastating six-gun broadsides capable of pulverizing any fleet. |

---

## 📐 Architecture & Vertical-Slice Structure

The project strictly follows a **feature-driven vertical slice architecture** separating domain logic, state management, and 3D simulation:

```text
naval-combat-online/
├── server/                                # Authoritative Game Server (30 Hz)
│   └── src/
│       ├── engine/
│       │   ├── PhysicsEngine.ts           # Authoritative kinematics, island collision & ballistics
│       │   ├── RoomManager.ts             # Fleet matchmaking & lifecycle
│       │   └── WaveMath.ts                # Deterministic Gerstner wave math
│       ├── types/
│       │   └── protocol.ts                # Binary / JSON WebSocket protocol schemas
│       └── server.ts                      # uWebSockets.js entrypoint & HTTP static server
│
├── src/                                   # Client Application (React 19 + Three.js)
│   ├── app/
│   │   └── App.tsx                        # Root application stage orchestrator
│   ├── components/ui/                     # Shared domain-agnostic UI (Toasts, Modals)
│   ├── services/
│   │   └── networkClient.ts               # WebSocket connection & protocol dispatcher
│   ├── stores/                            # Modular Zustand State Store
│   │   ├── slices/
│   │   │   ├── createSessionSlice.ts      # Identity, connection, ping, mute
│   │   │   ├── createLobbySlice.ts        # Fleet rooms & matchmaking
│   │   │   ├── createBattleSlice.ts       # 30 Hz world snapshots & combat logs
│   │   │   └── createControlsSlice.ts     # Local rudder, sails & reload timers
│   │   └── useGameStore.ts                # Composed typed store
│   ├── types/                             # Modular Domain Types
│   │   ├── ship.ts                        # ShipClass, ShipConfig, presets, snapshots
│   │   ├── room.ts                        # RoomInfo, RoomPlayer, GameStage
│   │   ├── combat.ts                      # PlayerInput, Cannonballs, CombatLogs
│   │   ├── environment.ts                 # Wave parameters & Island definitions
│   │   └── index.ts                       # Public types barrel
│   └── features/
│       ├── lobby/                         # Lobby Feature Slice
│       │   ├── components/
│       │   │   ├── LobbyHeader.tsx        # Captain identity & server status
│       │   │   ├── RoomCard.tsx           # Fleet room card
│       │   │   ├── RoomList.tsx           # Fleet browser with live refresh
│       │   │   ├── RoomLobby.tsx          # Anchorage roster, ready status & deploy
│       │   │   ├── ShipSelector.tsx       # Vessel stats & 3D turntable preview
│       │   │   ├── ShipTurntable3D.tsx    # Interactive rotating 3D ship preview
│       │   │   ├── CreateRoomModal.tsx    # New fleet dialog
│       │   │   ├── ServerConfigModal.tsx  # Custom WebSocket endpoint modal
│       │   │   └── LobbyView.tsx          # Orchestrator view
│       │   ├── hooks/useLobby.ts          # Lobby action handlers & readiness logic
│       │   └── index.ts                   # Feature barrel export
│       └── battle/                        # Battle Feature Slice
│           ├── components/
│           │   ├── 3d/
│           │   │   ├── NavalCanvas.tsx    # Three.js Canvas & scene composition
│           │   │   ├── OceanWater.tsx     # Gerstner shader, SSS, caustics & FBM foam
│           │   │   ├── Islands3D.tsx      # Tactical archipelago geometry & palms
│           │   │   ├── ShipModel3D.tsx    # Procedural ship mesh, rigging & sails
│           │   │   ├── CannonSystem3D.tsx # Trajectory arc & flying cannonballs
│           │   │   ├── Environment3D.tsx  # Azure sky dome, tropical sun & clouds
│           │   │   └── PostProcessing3D.tsx# Native Three.js bloom pass
│           │   └── hud/
│           │       ├── BattleHUD.tsx      # HUD orchestrator
│           │       ├── CompassMinimap.tsx # Circular nautical radar with islands
│           │       ├── ShipStatusBar.tsx  # HP bar, captain name, fleet afloat counter
│           │       ├── SpeedRudderControl.tsx# Sails selector & rudder steering gauge
│           │       ├── BroadsideGauges.tsx# Port/Starboard reload bars & fire salvo
│           │       ├── AimCrosshair.tsx   # Battery lock crosshair overlay
│           │       ├── CombatLogFeed.tsx  # Floating damage/sinking log feed
│           │       └── DebriefModal.tsx   # Victory / defeat celebration modal
│           ├── hooks/
│           │   ├── useShipControls.ts     # Keyboard / mouse input controller
│           │   └── useBattleCamera.ts     # Third-person follow & broadside aim lerping
│           ├── services/
│           │   └── navalAudio.ts          # Procedural Web Audio API sound engine
│           ├── utils/
│           │   └── controls.ts            # Keybindings & camera tuning constants
│           └── index.ts                   # Feature barrel export
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js $\ge 18.0.0$
- [pnpm](https://pnpm.io/) $\ge 9.0.0$

### 1. Installation
```bash
pnpm install
```

### 2. Running Locally

#### Terminal 1: Start authoritative game server (Port 3000)
```bash
pnpm run dev:server
```

#### Terminal 2: Start Vite client dev server (Port 5173)
```bash
pnpm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser. The Vite development server automatically proxies WebSocket requests to `ws://localhost:3000/ws`.

### 3. Connecting to the Live Remote Server
In the lobby header, click on the **Server Endpoint** button and select:
- **Live Production Server**: `wss://naval-combat.cekcok.my.id/ws`
- Or enter any custom WebSocket gateway URL.

---

## 📦 Production Build & Testing

```bash
# Typecheck & build client bundle
pnpm run build:client

# Compile TypeScript game server
pnpm run build:server

# Build both client and server
pnpm run build

# Run linter
pnpm run lint

# Start production server (serves client dist/ and handles WebSockets)
pnpm start
```

---

## 🚢 Production Deployment

The project includes containerization and Kubernetes GitOps manifests:

- **Container Image**: `ghcr.io/jati251/naval-combat-online:latest`
- **Cluster**: Kubernetes on `192.168.1.41` (Namespace `apps`)
- **Domain**: `naval-combat.cekcok.my.id`
- **Ingress**: Ingress-Nginx with WebSocket upgrades (`nginx.org/websocket-services`)

---

## 📜 License
MIT License. Created by Jati Suryo.
