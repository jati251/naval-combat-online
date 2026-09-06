# 3D asset review

Run `pnpm dev`, then open `/tests/visual/models.html` on the Vite server.

The category and asset selectors cover all eight ship classes, six terrain archetypes, five settlement types, cargo, and the populated islands from all three maps. Drag to orbit and scroll to inspect surface detail. This scene imports the production models directly; it is not part of the production entry point.

Terrain tests in `tests/unit/islandGeometry.test.ts` compare placement heights against ray intersections with the actual mesh, including elongated islands and settlement terraces. Run `pnpm test` for these checks.

The review scene uses neutral daylight and a flat water plane. Check the battle scene for ocean motion, night lighting, and performance on target hardware.
