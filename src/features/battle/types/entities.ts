import type { ShipSnapshot } from '@/types';

export interface ShipEntityProps {
  ship: ShipSnapshot;
  isSelf: boolean;
  isMobile?: boolean;
}

export interface DeadReckoningState {
  lastPacketTime: number;
  snapshotPosX: number;
  snapshotPosY: number;
  snapshotPosZ: number;
  snapshotHeading: number;
  snapshotVx: number;
  snapshotVz: number;
  lastSeqKey: string;
}

export interface InterpolatedTransform {
  x: number;
  y: number;
  z: number;
  rotationY: number;
  pitch: number;
  roll: number;
}
