import type { Object3D } from 'three';

export function isObjectVisible(object: Object3D | null): boolean {
  if (!object) return false;
  for (let current: Object3D | null = object; current; current = current.parent) {
    if (!current.visible) return false;
  }
  return true;
}
