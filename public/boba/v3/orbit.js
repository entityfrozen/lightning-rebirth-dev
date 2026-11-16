// The orbital atmosphere is one tiny WebGL program, not an always-on 3D engine.
// Motion stops when the hero is hidden or the user prefers reduced motion.
export function mountOrbitScene(canvas) {
  if (!canvas || !window.WebGLRenderingContext) return () => {};
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let gl;
  try { gl = canvas.getContext('webgl', { alpha: true, antialias: false, depth: false, powerPreference: 'low-power' }); }
  catch { return () => {}; }
  if (!gl) return () => {};

  const vertex = 'attribute vec2 position; void main(){gl_Position=vec4(position,0.,1.);}';
  const fragment = [
    'precision mediump float;',
    'uniform vec2 resolution;',
    'uniform vec2 pointer;',
    'uniform float time;',
    'float halo(vec2 p,float r,float w){return exp(-pow((length(p)-r)/w,2.0));}',
    'float grain(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}',
    'void main(){',
    'vec2 uv=(gl_FragCoord.xy-.5*resolution)/min(resolution.x,resolution.y);',
    'vec2 p=uv-vec2(.13,-.01);',
    'float a=time*.11;',
    'p.x += .025*sin(p.y*5.0+a);',
    'p.y += .022*cos(p.x*5.0+a);',
    'p += (pointer-.5)*.045;',
    'float d=length(p);',
    'float ring=halo(p,.285,.011);',
    'float outer=halo(p,.291,.045)*.46;',
    'float inner=halo(p,.18,.15)*.17;',
    'float arc=ring*(.35+.65*smoothstep(-.8,.8,sin(atan(p.y,p.x)*1.6+a)));',
    'float shimmer=pow(max(0.,sin(atan(p.y,p.x)*3.0-time*.21)),8.0)*ring;',
    'vec3 mint=vec3(.41,1.,.78);',
    'vec3 violet=vec3(.49,.47,.96);',
    'vec3 blue=vec3(.19,.51,.89);',
    'vec3 color=mix(mint,violet,smoothstep(-.42,.40,p.x+p.y));',
    'color += blue*inner;',
    'float stars=step(.9985,grain(floor(gl_FragCoord.xy/2.0)))*.24;',
    'float alpha=min(.97,arc*.91+outer*.43+inner*.28+shimmer*.46+stars);',
    'gl_FragColor=vec4(color*1.4,alpha);',
    '}'
  ].join('\n');

  function compile(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const message=gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw Error(message || 'Shader compilation failed');
    }
    return shader;
  }
  let program, buffer, vertexShader, fragmentShader;
  try {
    vertexShader=compile(gl.VERTEX_SHADER,vertex);
    fragmentShader=compile(gl.FRAGMENT_SHADER,fragment);
    program=gl.createProgram();
    gl.attachShader(program,vertexShader);
    gl.attachShader(program,fragmentShader);
    gl.linkProgram(program);
    if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error('WebGL shader link failed');
    buffer=gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
    gl.useProgram(program);
    const position=gl.getAttribLocation(program,'position');
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
  } catch (error) {
    console.warn('Celestial orbit unavailable:',error);
    if(buffer)gl.deleteBuffer(buffer);
    if(program)gl.deleteProgram(program);
    if(vertexShader)gl.deleteShader(vertexShader);
    if(fragmentShader)gl.deleteShader(fragmentShader);
    return () => {};
  }

  const timeLoc=gl.getUniformLocation(program,'time');
  const sizeLoc=gl.getUniformLocation(program,'resolution');
  const pointerLoc=gl.getUniformLocation(program,'pointer');
  let pointer=[.5,.5],frame=0,visible=true,disposed=false,paused=false;
  const started=performance.now();
  const resize=()=>{
    const bounds=canvas.getBoundingClientRect();
    const ratio=Math.min(devicePixelRatio||1,1.5);
    const width=Math.max(1,Math.floor(bounds.width*ratio));
    const height=Math.max(1,Math.floor(bounds.height*ratio));
    if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;}
    gl.viewport(0,0,width,height);
  };
  const draw=stamp=>{
    frame=0;
    if(disposed||!visible||document.hidden||paused)return;
    resize();
    gl.useProgram(program);
    gl.uniform1f(timeLoc,motion.matches?0:(stamp-started)*.001);
    gl.uniform2f(sizeLoc,canvas.width,canvas.height);
    gl.uniform2f(pointerLoc,pointer[0],pointer[1]);
    gl.drawArrays(gl.TRIANGLES,0,6);
    if(!motion.matches)frame=requestAnimationFrame(draw);
  };
  const start=()=>{if(!frame&&!disposed&&visible&&!document.hidden&&!paused)frame=requestAnimationFrame(draw);};
  const stop=()=>{if(frame)cancelAnimationFrame(frame);frame=0;};
  const onMotion=()=>{stop();start();};
  const onVisibility=()=>{if(document.hidden)stop();else start();};
  const onPointer=e=>{
    const r=canvas.getBoundingClientRect();
    pointer=[Math.max(0,Math.min(1,(e.clientX-r.left)/r.width)),Math.max(0,Math.min(1,1-(e.clientY-r.top)/r.height))];
  };
  const intersection=new IntersectionObserver(entries=>{
    visible=entries[0]?.isIntersecting??false;
    if(visible)start();else stop();
  },{threshold:0.05});
  const resizeObserver=new ResizeObserver(()=>{resize();if(motion.matches)start();});
  intersection.observe(canvas);
  resizeObserver.observe(canvas);
  canvas.parentElement?.addEventListener('pointermove',onPointer,{passive:true});
  document.addEventListener('visibilitychange',onVisibility);
  motion.addEventListener('change',onMotion);
  canvas.addEventListener('webglcontextlost',onContextLost);
  function onContextLost(event){event.preventDefault();paused=true;stop();}
  start();
  return ()=>{
    disposed=true;stop();intersection.disconnect();resizeObserver.disconnect();
    canvas.parentElement?.removeEventListener('pointermove',onPointer);
    document.removeEventListener('visibilitychange',onVisibility);
    motion.removeEventListener('change',onMotion);
    canvas.removeEventListener('webglcontextlost',onContextLost);
    gl.deleteBuffer(buffer);gl.deleteProgram(program);
    gl.deleteShader(vertexShader);gl.deleteShader(fragmentShader);
  };
}
