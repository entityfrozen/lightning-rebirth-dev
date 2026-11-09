import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { Html, Float, Sparkles } from '@react-three/drei';
import { useDialKit } from 'dialkit';

/**
 * Live DOM controls stay accessible outside Canvas. A canvas-texture
 * typography plate inside the 3D scene is genuinely refracted by the glass.
 * A small Html annotation moves with the mesh in world space.
 */
function PrintedPlate() {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 550;
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 1024, 550);
    gradient.addColorStop(0, '#0d2541');
    gradient.addColorStop(.45, '#282a56');
    gradient.addColorStop(1, '#100f24');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1024, 550);
    for (let i = 0; i < 120; i++) {
      ctx.fillStyle = 'rgba(190,228,255,' + (.22+(i%6)*.09) + ')';
      ctx.fillRect((i*131+37)%1024,(i*71+97)%550,1.5,1.5);
    }
    ctx.font = '900 103px sans-serif';
    ctx.fillStyle = '#e7efff';
    ctx.fillText('CELESTIAL', 74, 270);
    ctx.font = '24px sans-serif';
    ctx.fillStyle = '#9fc7ef';
    ctx.fillText('FOUR WORLDS  /  ONE UNIVERSE', 82, 328);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }, []);
  return <mesh position={[0,0,-1.55]} scale={[7.3,3.9,1]}>
    <planeGeometry args={[1,1]} />
    <meshBasicMaterial map={texture} toneMapped={false} />
  </mesh>;
}

function Objects({ settings, reduced }) {
  const group = useRef();
  const main = useRef();
  const ring = useRef();
  const drag = useRef(false);
  const target = useRef([0,0]);

  useFrame(({ pointer }, dt) => {
    if (!group.current || !main.current) return;
    const damping = Math.min(1,dt*2.5);
    group.current.rotation.y = THREE.MathUtils.lerp(group.current.rotation.y,pointer.x*.14,damping);
    group.current.rotation.x = THREE.MathUtils.lerp(group.current.rotation.x,-pointer.y*.11,damping);
    if (!reduced && !drag.current) {
      main.current.rotation.y += dt*.14;
      main.current.rotation.x += dt*.05;
      if(ring.current)ring.current.rotation.z -= dt*.11;
    }
    if(drag.current){
      main.current.position.x=THREE.MathUtils.lerp(main.current.position.x,target.current[0],.35);
      main.current.position.y=THREE.MathUtils.lerp(main.current.position.y,target.current[1],.35);
    }
  });
  const glass={
    transmission:1,
    thickness:settings.thickness,
    ior:settings.ior,
    dispersion:settings.dispersion,
    roughness:settings.roughness,
    clearcoat:1,
    clearcoatRoughness:.04,
    envMapIntensity:1.7,
    attenuationColor:'#a9e7ff',
    attenuationDistance:3
  };
  return <group ref={group}>
    <PrintedPlate />
    <Float speed={reduced?0:1.2} rotationIntensity={reduced?0:.12} floatIntensity={reduced?0:.2}>
      <mesh ref={main} position={[.13,.05,.52]}
        onPointerDown={e=>{e.stopPropagation();drag.current=true;e.target.setPointerCapture(e.pointerId);}}
        onPointerMove={e=>{if(drag.current)target.current=[THREE.MathUtils.clamp(e.point.x,-1.15,1.15),THREE.MathUtils.clamp(e.point.y,-.65,.65)];}}
        onPointerUp={e=>{drag.current=false;e.target.releasePointerCapture(e.pointerId);}}
        onPointerCancel={()=>{drag.current=false;}}>
        <icosahedronGeometry args={[1.52,2]}/>
        <meshPhysicalMaterial {...glass}/>
      </mesh>
    </Float>
    <mesh ref={ring} position={[1.68,.48,.27]} rotation={[.4,.7,.4]}>
      <torusGeometry args={[.49,.09,24,96]}/>
      <meshPhysicalMaterial {...glass} color="#b8d2ff"/>
    </mesh>
    <mesh position={[-1.66,-.59,.12]} rotation={[-.36,.5,.1]}>
      <octahedronGeometry args={[.47,1]}/>
      <meshPhysicalMaterial {...glass} color="#ffd6ba"/>
    </mesh>
    <Sparkles count={44} scale={[7,3.6,2]} size={1.8} speed={reduced?0:.2} color="#c8ebff"/>
    <Html transform position={[2.06,-.95,.8]} scale={.22} occlude={false}>
      <div className="glass-world-label" aria-hidden="true"><span className="glass-dot"/> PHYSICAL GLASS / DISPERSION</div>
    </Html>
  </group>;
}

function Scene({reduced}){
  const settings=useDialKit('Celestial • Glass',{
    dispersion:[.48,0,1.4],
    thickness:[1.65,.1,4],
    ior:[1.31,1,2.1],
    roughness:[.085,0,.45]
  });
  return <>
    <ambientLight intensity={1.5}/>
    <directionalLight position={[2,4,7]} intensity={3.5} color="#c0eaff"/>
    <pointLight position={[-4,-2,4]} intensity={42} color="#b592ff" distance={12}/>
    <pointLight position={[4,2,2]} intensity={25} color="#ffcaaa" distance={11}/>
    <Objects settings={settings} reduced={reduced}/>
  </>;
}

export function GlassHero({reduced}){
  return <div className="glass-hero" aria-label="Interactive 3D glass sculpture">
    <Canvas dpr={[.9,1.65]} gl={{antialias:true,alpha:true,powerPreference:'low-power'}}
      camera={{fov:40,position:[0,0,8.7],near:.1,far:100}}
      fallback={<div className="glass-canvas-fallback">✧</div>}>
      <Scene reduced={reduced}/>
    </Canvas>
  </div>;
}
