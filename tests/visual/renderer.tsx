import { useState, useLayoutEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { ShipModel3D } from '../../src/features/battle/components/3d/ShipModel3D';
import { Islands3D } from '../../src/features/battle/components/3d/Islands3D';
import { SHIP_PRESETS, type ShipClass, type SailState } from '../../src/types/game';
import { useGameStore } from '../../src/stores/useGameStore';

function Camera({ length }: { length: number }) {
  const { camera } = useThree();
  useLayoutEffect(() => {
    camera.position.set(length * 1.05, length * 0.85, length * 1.2);
    camera.lookAt(0, length * 0.35, 0);
  }, [camera, length]);
  return null;
}

function Stats() {
  let time = 0;
  useFrame(({ gl }, delta) => {
    time += delta;
    if (time < 1) return;
    time = 0;
    const output = document.querySelector('output');
    if (output) output.textContent = `${gl.info.render.calls} draws · ${gl.info.render.triangles} triangles · ${gl.info.memory.geometries} geometries · ${gl.info.memory.textures} textures`;
  });
  return null;
}
function Audit() {
  const [ship, setShip] = useState<ShipClass>('brig');
  const [sail, setSail] = useState<SailState>('FULL_SAIL');
  const [night, setNight] = useState(false);
  const [islands, setIslands] = useState(false);
  const [mobile, setMobile] = useState(false);
  const config = SHIP_PRESETS[ship];
  return <>
    <div style={{ padding: 12, display: 'flex', flexWrap: 'wrap', gap: 12 }}>
      <label>Ship <select value={ship} onChange={e => setShip(e.target.value as ShipClass)}>{Object.keys(SHIP_PRESETS).map(id => <option key={id}>{id}</option>)}</select></label>
      <label>Sails <select value={sail} onChange={e => setSail(e.target.value as SailState)}>{['ANCHOR', 'HALF_SAIL', 'FULL_SAIL'].map(id => <option key={id}>{id}</option>)}</select></label>
      <label><input type="checkbox" checked={night} onChange={e => { setNight(e.target.checked); useGameStore.setState({ timeOfDay: e.target.checked ? 'NIGHT' : 'DAY' }); }} />Night</label>
      <label><input type="checkbox" checked={islands} onChange={e => setIslands(e.target.checked)} />Islands</label>
      <label><input type="checkbox" checked={mobile} onChange={e => setMobile(e.target.checked)} />Mobile detail</label>
      <output aria-label="Render statistics" />
    </div>
    <div style={{ height: 'calc(100dvh - 88px)' }}>
      <Canvas camera={{ position: [38, 24, 42], fov: 48, far: 1600 }} dpr={1} shadows={!mobile}>
        <color attach="background" args={[night ? '#08101c' : '#7195a6']} />
        <hemisphereLight args={[night ? '#617fa1' : '#dce9ee', '#715844', night ? 0.65 : 1.8]} />
        <directionalLight position={[30, 60, 20]} intensity={night ? 0.5 : 3} />
        <directionalLight position={[-20, 20, -30]} intensity={night ? 0.3 : 1.8} />
        <ShipModel3D shipClass={ship} sailState={sail} />
        <Camera length={config.length} />
        {islands && <Islands3D isMobile={mobile} />}
        <OrbitControls target={[0, config.length * 0.35, 0]} />
        <Stats />
      </Canvas>
    </div>
  </>;
}
createRoot(document.getElementById('root')!).render(<Audit />);
