import { BufferGeometry, Float32BufferAttribute } from 'three';

/** Barycentric subdivision gives the cloth interior vertices and normalized UVs. */
export function createTriangularSailGeometry(
  left: number, right: number, height: number, depth: number, segments = 12,
) {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const rows: number[] = [];
  for (let row = 0; row <= segments; row++) {
    rows.push(positions.length / 3);
    const v = row / segments;
    for (let column = 0; column <= segments - row; column++) {
      const b = column / segments;
      const a = 1 - v - b;
      const x = a * left + b * right;
      positions.push(x, v * height, 27 * a * b * v * depth);
      uvs.push((x - left) / (right - left), v);
    }
  }
  for (let row = 0; row < segments; row++) {
    for (let column = 0; column < segments - row; column++) {
      const a = rows[row] + column;
      const b = rows[row + 1] + column;
      indices.push(a, a + 1, b);
      if (column < segments - row - 1) indices.push(a + 1, b + 1, b);
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}
