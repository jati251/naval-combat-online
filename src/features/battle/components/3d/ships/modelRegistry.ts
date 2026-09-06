import type { ComponentType } from 'react';
import type { ShipClass } from '@/types/game';
import type { SubModelProps } from './types';
import { GunboatModel } from './models/GunboatModel';
import { SloopModel } from './models/SloopModel';
import { CorvetteModel } from './models/CorvetteModel';
import { BrigModel } from './models/BrigModel';
import { CarrackModel } from './models/CarrackModel';
import { GalleonModel } from './models/GalleonModel';
import { FrigateModel } from './models/FrigateModel';
import { ManOWarModel } from './models/ManOWarModel';

export const shipModels = {
  gunboat: GunboatModel, sloop: SloopModel, corvette: CorvetteModel, brig: BrigModel,
  carrack: CarrackModel, galleon: GalleonModel, frigate: FrigateModel, man_o_war: ManOWarModel,
} satisfies Record<ShipClass, ComponentType<SubModelProps>>;
