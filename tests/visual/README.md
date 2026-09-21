# 3D asset review

Run `pnpm dev`, then open `/tests/visual/models.html` on the Vite server.

The category and asset selectors cover all eight ship classes, six terrain archetypes, five settlement types, cargo, and the populated islands from all three maps. Drag to orbit and scroll to inspect surface detail. This scene imports the production models directly; it is not part of the production entry point.

Terrain tests in `tests/unit/islandGeometry.test.ts` compare placement heights against ray intersections with the actual mesh, including elongated islands and settlement terraces. Run `pnpm test` for these checks.

The review scene uses neutral daylight and a flat water plane. Check the battle scene for ocean motion, night lighting, and performance on target hardware.

For the production ocean and hull buoyancy, open `/tests/visual/renderer.html`. Its ship selector, night toggle, and mobile-detail toggle exercise the shared wave surface. Use a local battle to inspect steering, camera framing, and persistent wake trails.

## Coast, sky and storms

`/tests/visual/coast.html` loads production terrain, water, sky, lighting, and postprocessing. Query options:

- `map=caribbean`, `island=0`: select a map and shoreline.
- `quality=fast|balanced|performance`, `night=1`: check each rendering profile.
- `storm=600` or `storm=800`: place the camera in transitional or severe weather.
- `motion=1`: move the camera after the sky update each frame. The sky must remain intact without flashes, holes, or dome edges; this reproduces the battle camera's update order.

Examples: `/tests/visual/coast.html?storm=800` and `/tests/visual/coast.html?quality=fast&night=1&motion=1`.

The overlay counts scene, shadow, and postprocessing draw calls together. Its FPS is a local preview measurement, not a multiplayer benchmark.

Water follows camera translation continuously without grid snapping. `oceanTime.test.ts` simulates irregular packets and a prolonged snapshot gap: ocean time must advance every frame, remain shared by every consumer, and never rewind. Corrections are limited to 5% of playback speed. Frame callbacks read `clock.elapsedTime` without advancing the renderer's clock.

The server storm tests cover the removed physical boundary, grace period, escalating damage, surface agreement, one sinking event, and safe respawn. Weather begins at radius 420 m; damage begins after eight seconds beyond 500 m and reaches full weather intensity at 760 m. Returning within 500 m immediately stops damage and resets exposure.

## Performance checks

Run `node --import tsx tests/performance/ocean.bench.ts` for seven-run median CPU timings. Terrain height queries use the rendered grid cache; coastal masking uses one 2 MiB texture. Water detail textures replace repeated fragment noise calculations, particles upload active buffer ranges, and fog conceals distant terrain before its draw calls are culled.

Local reference run: 100,000 terrain queries fell from approximately 123 ms before caching to 3.61 ms after; final wave sampling was 74.86 ms/100,000 and hull sampling 36.45 ms/10,000. Storm waves now differ outside the safe area, so wave checksums are not directly comparable to the earlier calm-only implementation. These are CPU microbenchmarks, not an overall FPS improvement claim.

`/tests/visual/effects.html` runs a vessel around a circle, stops it for eight seconds, and fires salvos every five seconds. Check that existing foam stays on the curved path, follows wave height, and dissipates on stopping; smoke expands and fades, while sparks and splash particles fall. This fixture does not connect to the multiplayer server.
