import React,{useMemo,useRef} from 'react';
import {Canvas,useFrame} from '@react-three/fiber';
import * as THREE from 'three';

const VERTEX=String.raw;
const vertex=String.raw`
  attribute float aPhase;
  uniform float uTime;
  uniform float uMotion;
  varying float vStrength;
  void main(){
    float sway=sin(uTime*.31+aPhase*6.283)*.12*uMotion;
    vec3 p=position+vec3(sway,cos(uTime*.22+aPhase*4.0)*.13*uMotion,0.0);
    vec4 clip=projectionMatrix*modelViewMatrix*vec4(p,1.0);
    gl_Position=clip;
    gl_PointSize=clamp((5.0+aPhase*3.0)*(6.0/max(1.0,-clip.z)),2.0,11.0);
    vStrength=.25+.75*pow(.5+.5*sin(uTime*.7+aPhase*16.0),2.0);
  }`;
const fragment=String.raw`
  precision mediump float;
  varying float vStrength;
  void main(){
    float r=length(gl_PointCoord-.5)*2.0;
    float alpha=(1.0-smoothstep(0.2,1.0,r))*vStrength*.72;
    gl_FragColor=vec4(.64,1.0,.71,alpha);
  }`;
function Fireflies({reduced}){
  const shader=useRef();
  const geometry=useMemo(()=>{
    const count=94,positions=new Float32Array(count*3),phases=new Float32Array(count);
    for(let i=0;i<count;i++){
      // Stable deterministic positions so WebGL context resets do not jump.
      const x=((i*73+17)%99)/99,y=((i*37+51)%97)/97;
      positions.set([(x-.5)*13,(y-.5)*8,-1-(i%9)*.24],i*3);
      phases[i]=((i*59)%101)/101;
    }
    const geo=new THREE.BufferGeometry();
    geo.setAttribute('position',new THREE.BufferAttribute(positions,3));
    geo.setAttribute('aPhase',new THREE.BufferAttribute(phases,1));
    return geo;
  },[]);
  useFrame((_,delta)=>{
    if(shader.current&&!reduced)shader.current.uniforms.uTime.value+=Math.min(.06,delta);
  });
  return <points geometry={geometry} frustumCulled={false}>
    <shaderMaterial ref={shader} transparent blending={THREE.AdditiveBlending} depthWrite={false}
      vertexShader={vertex} fragmentShader={fragment}
      uniforms={{uTime:{value:0},uMotion:{value:reduced?0:1}}}/>
  </points>;
}
export function ForestParticles({reduced}){
  return <div className="forest-particles" aria-hidden="true">
    <Canvas dpr={[.7,1.25]} gl={{alpha:true,antialias:false,powerPreference:'low-power'}}
      camera={{fov:60,position:[0,0,7]}} frameloop={reduced?'demand':'always'} fallback={null}>
      <Fireflies reduced={reduced}/>
    </Canvas>
  </div>;
}
