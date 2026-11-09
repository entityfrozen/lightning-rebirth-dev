// Celestial sky. No dependencies.
const VERTEX="attribute vec2 aPosition;\nvoid main(){gl_Position=vec4(aPosition,0.,1.);}";
const FRAGMENT="precision mediump float;\nuniform vec2 uResolution;\nuniform vec2 uPointer;\nuniform float uTime;\nuniform float uDay;\nuniform float uMotion;\nuniform float uIntensity;\n\nfloat hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}\nfloat noise(vec2 p){\n vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);\n return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),\n            mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y);\n}\nfloat fbm(vec2 p){\n float total=0.,a=.5;\n for(int i=0;i<4;i++){total+=noise(p)*a;p=p*2.02+vec2(3.8,1.7);a*=.5;}\n return total;\n}\nfloat stars(vec2 uv,float scale,float time,float radius){\n vec2 p=uv*scale,c=floor(p),seed=vec2(hash(c),hash(c+37.41));\n float dist=length(p-(c+.18+seed*.64));\n float visibility=step(.945,hash(c+92.33));\n float shine=.82+.18*sin(time*(1.1+seed.x*2.)+seed.y*6.283);\n return ((1.-smoothstep(0.,radius,dist))+exp(-dist*13.)*.35)*visibility*shine;\n}\nvoid main(){\n vec2 uv=gl_FragCoord.xy/uResolution;\n float aspect=uResolution.x/max(1.,uResolution.y);\n vec2 space=vec2(uv.x*aspect,uv.y);\n float t=uTime*uMotion;\n vec2 mouse=(uPointer-.5)*.07*uMotion;\n vec2 field=space*2.45-vec2(.42,.12)+mouse;\n field+=vec2(fbm(field*.66+vec2(t*.018,-.02)),\n             fbm(field*.72+vec2(.0,t*.014)))*.35;\n float cloud=fbm(field*1.25-vec2(t*.011,t*.016));\n float strands=fbm(field*2.8+cloud*1.5+vec2(-t*.022,t*.009));\n float nebula=smoothstep(.38,.79,cloud*.72+strands*.43);\n float aurora=smoothstep(.44,.85,fbm(field*1.1+vec2(.6,-.5)+t*.006));\n vec3 night=mix(vec3(.019,.027,.066),vec3(.038,.024,.098),uv.x);\n night+=vec3(.24,.10,.57)*nebula*(.28+.42*aurora);\n night+=vec3(.08,.28,.48)*aurora*.18;\n night+=vec3(.28,.14,.55)*exp(-length((uv-vec2(.70,.77))*vec2(1.5,2.4))*2.1)*.15;\n vec3 day=mix(vec3(.90,.91,.985),vec3(.96,.955,1.),uv.y);\n day+=vec3(.23,.15,.34)*nebula*.04;\n float star=stars(space+vec2(t*.0007,0.),34.,t,.055)*.85+\n            stars(space+vec2(-t*.0003,t*.0003),65.,t*.8,.037)*.65+\n            stars(space,105.,t*.6,.028)*.50;\n vec3 stellar=vec3(.72,.81,1.)*star*(1.-uDay*.95);\n vec3 base=mix(night,day,uDay);\n vec3 color=mix(base,base+stellar,uIntensity);\n gl_FragColor=vec4(color,1.);\n}";

function compile(gl, type, source) {
  const item = gl.createShader(type);
  gl.shaderSource(item, source);
  gl.compileShader(item);
  if (!gl.getShaderParameter(item, gl.COMPILE_STATUS)) {
    const message = gl.getShaderInfoLog(item);
    gl.deleteShader(item);
    throw new Error(message || 'Shader compilation failed');
  }
  return item;
}
function createProgram(gl) {
  const vertex = compile(gl, gl.VERTEX_SHADER, VERTEX);
  const fragment = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT);
  const program = gl.createProgram();
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.bindAttribLocation(program, 0, 'aPosition');
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(program) || 'Shader linking failed');
  }
  return program;
}

/** Ambient stars: one fullscreen draw with reduced-motion and CSS fallback. */
export function createCelestialSky(canvas, { mode = 'dark', motion = true } = {}) {
  if (!canvas) return { setMode() {}, setMotion() {}, destroy() {} };
  let gl = null, program = null, buffer = null, uniforms = null;
  let scheduled = 0, previous = 0, elapsed = 0;
  let day = mode === 'light' ? 1 : 0, target = day;
  let motionEnabled = Boolean(motion), pointer = [.5,.5], intensity = 1;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const small = window.matchMedia('(max-width: 800px)');
  const isStatic = () => reduced.matches || !motionEnabled;
  const active = () => !document.hidden && !isStatic();

  function resize() {
    const ratio = Math.min(window.devicePixelRatio || 1, small.matches ? .8 : 1.25);
    const w = Math.max(2, Math.round(window.innerWidth * ratio));
    const h = Math.max(2, Math.round(window.innerHeight * ratio));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
  }
  function schedule() {
    if (gl && !scheduled && !document.hidden) scheduled = requestAnimationFrame(draw);
  }
  function draw(timestamp) {
    scheduled = 0;
    if (!gl || gl.isContextLost()) return;
    if (previous && timestamp - previous < 32 && active()) { schedule(); return; }
    const dt = previous ? Math.min((timestamp - previous) / 1000, .08) : 0;
    previous = timestamp;
    if (active()) elapsed += dt;
    const delta = target - day;
    day += isStatic() ? delta : delta * Math.min(1, dt * 4.5);
    if (Math.abs(day-target) < .002) day = target;
    resize();
    gl.viewport(0,0,canvas.width,canvas.height);
    gl.useProgram(program);
    gl.uniform2f(uniforms.size,canvas.width,canvas.height);
    gl.uniform2f(uniforms.pointer,pointer[0],pointer[1]);
    gl.uniform1f(uniforms.time,elapsed);
    gl.uniform1f(uniforms.day,day);
    gl.uniform1f(uniforms.motion,isStatic()?0:1);
    gl.uniform1f(uniforms.intensity,intensity);
    gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
    if (active() || day !== target) schedule();
  }
  function init() {
    try {
      gl = canvas.getContext('webgl', {
        alpha:false, antialias:false, depth:false, stencil:false,
        premultipliedAlpha:false, powerPreference:'low-power'
      });
      if (!gl) return;
      program = createProgram(gl);
      buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
      gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0);
      const locate = name => gl.getUniformLocation(program,name);
      uniforms = {
        size:locate('uResolution'),pointer:locate('uPointer'),
        time:locate('uTime'),day:locate('uDay'),
        motion:locate('uMotion'),intensity:locate('uIntensity')
      };
      canvas.classList.add('webgl-active');
      schedule();
    } catch(error) {
      console.warn('Celestial WebGL fallback:',error.message);
      gl = null;
      canvas.classList.remove('webgl-active');
    }
  }
  function onPointer(event) {
    if (!active()) return;
    pointer = [
      Math.max(0,Math.min(1,event.clientX/window.innerWidth)),
      1-Math.max(0,Math.min(1,event.clientY/window.innerHeight))
    ];
  }
  function onVisibility() {previous=0;if (!document.hidden) schedule();}
  function onResize() {previous=0;schedule();}
  canvas.addEventListener('webglcontextlost',event => {
    event.preventDefault();
    if (scheduled) cancelAnimationFrame(scheduled);
    scheduled=0;gl=null;
    canvas.classList.remove('webgl-active');
  });
  canvas.addEventListener('webglcontextrestored',init);
  document.addEventListener('visibilitychange',onVisibility);
  window.addEventListener('resize',onResize);
  window.addEventListener('pointermove',onPointer,{passive:true});
  reduced.addEventListener?.('change',onResize);
  init();

  return {
    setMode(next) {target=next==='light'?1:0;if(isStatic())day=target;schedule();},
    setMotion(next) {motionEnabled=Boolean(next);previous=0;schedule();},
    setIntensity(next) {intensity=Math.max(0,Math.min(1,Number(next)||0));schedule();},
    destroy() {
      if(scheduled)cancelAnimationFrame(scheduled);
      document.removeEventListener('visibilitychange',onVisibility);
      window.removeEventListener('resize',onResize);
      window.removeEventListener('pointermove',onPointer);
      reduced.removeEventListener?.('change',onResize);
      if(gl){if(buffer)gl.deleteBuffer(buffer);if(program)gl.deleteProgram(program);}
      canvas.classList.remove('webgl-active');
    }
  };
}
