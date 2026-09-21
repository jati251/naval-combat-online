import {useRef} from 'react';
import {createRoot} from 'react-dom/client';
import {Canvas,useFrame} from '@react-three/fiber';
import {OrbitControls} from '@react-three/drei';
import * as THREE from 'three';
import {ShipModel3D} from '../../src/features/battle/components/3d/ShipModel3D';
import {ShipWakeSplash3D} from '../../src/features/battle/components/3d/ShipWakeSplash3D';
import {CannonFX2D} from '../../src/features/battle/components/3d/CannonFX2D';
import {Islands3D} from '../../src/features/battle/components/3d/Islands3D';
import {OceanWater} from '../../src/features/battle/components/3d/OceanWater';
import {Environment3D} from '../../src/features/battle/components/3d/Environment3D';
import {NavalPostProcessing} from '../../src/features/battle/components/3d/rendering/NavalPostProcessing';
import {fireEventQueue} from '../../src/features/battle/services/fireEventQueue';
import {useGameStore} from '../../src/stores/useGameStore';
import {SHIP_PRESETS,type ShipSnapshot} from '../../src/types/game';
import {getHullWaterPose} from '../../src/features/battle/utils/waveMath';
import {GRAPHIC_PROFILES} from '../../src/features/settings/config/graphicProfiles';
const profile=GRAPHIC_PROFILES.balanced,config=SHIP_PRESETS.brig;
const ship:ShipSnapshot={id:'preview',name:'Preview',shipClass:'brig',x:0,y:0,z:24,rotationY:Math.PI/2,pitch:0,roll:0,speed:6,health:180,maxHealth:180,sail:'FULL_SAIL',rudder:0,isSunk:false,score:0};
useGameStore.setState({ships:[ship],selfId:ship.id,timeOfDay:'DAY',snapshotReceivedAt:0});
function Vessel(){
 const hull=useRef<THREE.Group>(null),phase=useRef(0),lastFire=useRef(-1);
 useFrame(({clock},delta)=>{
  const moving=clock.elapsedTime%24<16;
  phase.current+=moving?Math.min(delta,0.05)*0.25:0;
  const heading=Math.PI/2+phase.current,x=Math.sin(phase.current)*24,z=Math.cos(phase.current)*24;
  const pose=getHullWaterPose(x,z,heading,config.length,config.width,clock.elapsedTime);
  if(hull.current){hull.current.position.set(x,pose.y-config.width*0.22,z);hull.current.rotation.set(pose.pitch,heading,pose.roll,'YXZ');}
  useGameStore.setState({ships:[{...ship,x,z,y:pose.y,rotationY:heading,speed:moving?6:0}]});
  const cycle=Math.floor(clock.elapsedTime/5);
  if(cycle!==lastFire.current){lastFire.current=cycle;fireEventQueue.push({id:String(cycle),ownerId:ship.id,side:'left',timestamp:performance.now()});}
  const out=document.querySelector('output');if(out)out.textContent=moving?'Turning: the old wake should stay in place. Salvo every 5 seconds.':'Stopped: foam and smoke should disperse smoothly.';
 },-2);
 return <><group ref={hull}><ShipModel3D shipClass="brig" sailState="FULL_SAIL" /></group><ShipWakeSplash3D hullRef={hull} shipId={ship.id} shipLength={config.length} shipWidth={config.width}/></>;
}
const root=createRoot(document.getElementById('root')!);
if(import.meta.hot)import.meta.hot.dispose(()=>root.unmount());
root.render(<><Canvas camera={{position:[60,40,65],fov:48,near:0.2,far:1800}} dpr={1} shadows gl={{toneMapping:THREE.NoToneMapping}}>
 <Environment3D profile={profile}/><Islands3D/><OceanWater profile={profile}/><Vessel/><CannonFX2D/><OrbitControls target={[0,0,0]}/><NavalPostProcessing profile={profile} isNight={false}/>
 </Canvas><output>Preparing effects…</output></>);
