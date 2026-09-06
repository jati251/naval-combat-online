import { NavalCanvas } from './3d/NavalCanvas';
import { BattleHUD } from './hud/BattleHUD';
import { SpeedMotionBlurOverlay } from './hud/SpeedMotionBlurOverlay';
import { useMobileViewport } from '@/hooks/useMobileViewport';

export default function BattleView() {
  const isMobile = useMobileViewport();
  return <>
    <NavalCanvas />
    {!isMobile && <SpeedMotionBlurOverlay />}
    <BattleHUD />
  </>;
}
