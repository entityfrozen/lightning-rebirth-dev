// Lightning's glass day/night switch: one WebGL fragment pass, no dependencies.

const VERTEX_SOURCE = `
attribute vec2 aPosition;
varying vec2 vUv;
void main() {
  vUv = aPosition * 0.5 + 0.5;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;

const FRAGMENT_SOURCE = `
precision highp float;

varying vec2 vUv;
uniform vec2 uSize;
uniform float uProgress;
uniform float uMotion;
uniform vec3 uDarkBackground;
uniform vec3 uLightBackground;
uniform vec3 uDarkSurface;
uniform vec3 uLightSurface;
uniform vec4 uPairs[49];

float roundedBox(vec2 point, vec2 halfSize, float radius) {
  vec2 q = abs(point) - halfSize + radius;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - radius;
}
float mask(float distanceValue, float feather) {
  return 1.0 - smoothstep(-feather, feather, distanceValue);
}
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}
vec3 underlay(vec2 p) {
  vec3 base = mix(
    mix(uDarkBackground, uDarkSurface, 0.62),
    mix(uLightBackground, uLightSurface, 0.68),
    uProgress
  );
  float bloom = exp(-length((p - vec2(12.0, 12.0)) / vec2(80.0, 46.0)));
  vec3 flare = mix(vec3(0.36, 0.26, 0.58), vec3(0.98, 0.77, 0.49), uProgress);
  float cross = sin(p.x * 0.078 + p.y * 0.03) * 0.014;
  return base + flare * bloom * 0.11 + vec3(cross + (hash(floor(p * 0.9)) - 0.5) * 0.015);
}
vec3 frosted(vec2 at) {
  vec3 sum = underlay(at) * 0.34;
  sum += underlay(at + vec2(2.5, 0.0)) * 0.165;
  sum += underlay(at - vec2(2.5, 0.0)) * 0.165;
  sum += underlay(at + vec2(0.0, 2.5)) * 0.165;
  sum += underlay(at - vec2(0.0, 2.5)) * 0.165;
  return sum;
}

void main() {
  vec2 p = (vUv - 0.5) * uSize;
  float transition = clamp(uProgress, 0.0, 1.0);
  vec2 center = vec2(mix(-37.0, 37.0, transition), 0.0);
  vec2 local = p - center;

  float trackDistance = roundedBox(p, vec2(66.0, 28.0), 27.0);
  float track = mask(trackDistance, 1.1);
  float lensDistance = roundedBox(local, vec2(25.5), 10.5);
  float glass = mask(lensDistance, 1.3);

  vec3 nightGlow = vec3(0.58, 0.43, 1.0);
  vec3 dayGlow = vec3(0.78, 0.43, 0.16);
  vec3 glowColor = mix(nightGlow, dayGlow, transition);
  float arcAngle = mix(-1.5707963, 1.5707963, transition);
  float theta = atan(local.y, local.x);
  float orbitalStrip = pow(max(cos(theta - arcAngle), 0.0), 14.0);
  float strip = exp(-abs(lensDistance + 0.1) * 1.25) * orbitalStrip;
  vec2 lightSource = center + vec2(0.0, mix(-24.0, 24.0, transition));
  float bloom = exp(-length((p - lightSource) / vec2(38.0, 21.0)) * 1.5);
  float spill = exp(-max(trackDistance, 0.0) / 21.0) * (bloom * 0.65 + strip * 0.5);
  float light = clamp(strip * 2.0 + bloom * 0.6, 0.0, 2.4);

  vec3 trackColor = mix(
    mix(uDarkBackground, uDarkSurface, 0.5),
    mix(uLightBackground, uLightSurface, 0.37),
    transition
  );
  trackColor = mix(trackColor, glowColor, 0.09 + 0.24 * bloom);
  trackColor += vec3(0.11) * exp(-abs(trackDistance) * 0.95);
  vec3 rgb = trackColor;
  float alpha = track * 0.91;

  // The same radiance drives both modes. Day uses a darker amber tint so
  // light remains visible against a pale workspace, not only against black.
  rgb = mix(rgb, glowColor, spill * (1.0 - track) * 0.74);
  alpha = max(alpha, spill * 0.56);
  rgb += glowColor * light * 0.15 * track;

  float dx = roundedBox(local + vec2(0.48, 0.0), vec2(25.5), 10.5)
           - roundedBox(local - vec2(0.48, 0.0), vec2(25.5), 10.5);
  float dy = roundedBox(local + vec2(0.0, 0.48), vec2(25.5), 10.5)
           - roundedBox(local - vec2(0.0, 0.48), vec2(25.5), 10.5);
  vec2 normal = normalize(vec2(dx, dy) + vec2(0.0001));
  float edge = 1.0 - smoothstep(-6.0, -1.2, lensDistance);
  vec2 bend = normal * (2.5 + 3.5 * edge) * glass;
  vec3 refracted = vec3(
    frosted(p + bend * 1.19).r,
    frosted(p + bend).g,
    frosted(p + bend * 0.79).b
  );
  vec3 lensTint = mix(vec3(0.75, 0.78, 1.0), vec3(1.0, 0.98, 0.89), transition);
  vec3 lensColor = mix(refracted, lensTint, 0.23 + 0.11 * edge);
  lensColor += vec3(0.075) * edge + glowColor * (0.06 + 0.17 * strip);
  rgb = mix(rgb, lensColor, glass);
  alpha = max(alpha, glass * 0.81);

  // The dot sprites are paired by polar angle on the CPU. A particle's
  // timeline depends only on knob progress, so a half-drag freezes the swirl.
  vec2 glyphPoint = local / 2.75;
  vec3 pixels = vec3(0.0);
  float coverage = 0.0;
  for (int i = 0; i < 49; i++) {
    float rank = float(i) / 48.0;
    float stagger = 0.12 * (0.5 + 0.5 * sin(rank * 39.6));
    float t = clamp((transition - stagger) / (1.0 - 2.0 * stagger), 0.0, 1.0);
    float ease = t * t * (3.0 - 2.0 * t);
    vec2 from = uPairs[i].xy;
    vec2 to = uPairs[i].zw;
    vec2 spin = vec2(-from.y, from.x) * (0.25 + 0.09 * sin(float(i)));
    vec2 swirl = spin * sin(3.1415927 * t) * uMotion;
    float spring = sin(t * 18.0 + rank * 5.0) * exp(-4.0 * t)
                 * sin(3.1415927 * t) * 0.6 * uMotion;
    vec2 point = mix(from, to, ease) + swirl
               + normalize(to - from + vec2(0.01)) * spring;
    float dotDistance = roundedBox(glyphPoint - point, vec2(0.34), 0.07);
    float square = mask(dotDistance, 0.07);
    coverage = max(coverage, square);
    pixels += mix(vec3(0.73, 0.77, 1.0), vec3(1.0, 0.75, 0.3), ease) * square * 0.82;
  }
  pixels = min(pixels, vec3(1.3));
  rgb = mix(rgb, pixels + lensColor * 0.16, min(coverage * 0.95, 1.0) * glass);

  float bevel = exp(-abs(lensDistance + 1.05) * 1.5);
  float outerRim = exp(-abs(lensDistance) * 0.8);
  float upperReflection = max(normal.y, 0.0);
  rgb += vec3(0.42, 0.43, 0.52) * bevel * glass * (0.27 + upperReflection * 0.55);
  rgb += glowColor * (strip * 0.69 + outerRim * bloom * 0.1);
  alpha = max(alpha, bevel * 0.95);

  // Crisp white glass edge over the soft chromatic fringe.
  rgb += vec3(0.11, 0.17, 0.31) * outerRim * (1.0 - transition);
  rgb += vec3(0.22, 0.14, 0.03) * outerRim * transition;
  gl_FragColor = vec4(clamp(rgb, 0.0, 1.0), clamp(alpha, 0.0, 1.0));
}
`;

const PAIR_COUNT = 49;
const clamp = value => Math.max(0, Math.min(1, value));

function hexRgb(hex) {
  const clean = /^#[0-9a-f]{6}$/i.test(hex) ? hex : '#888888';
  return [1, 3, 5].map(i => parseInt(clean.slice(i, i + 2), 16) / 255);
}

export function makePairs() {
  const moon = [];
  const sun = [];
  for (let y = -6; y <= 6; y++) {
    for (let x = -6; x <= 6; x++) {
      const moonBody = Math.hypot(x + 0.9, y) < 5.55;
      const moonCutout = Math.hypot(x - 1.9, y + 1.55) < 4.75;
      if (moonBody && !moonCutout) moon.push([x, y]);
      const r = Math.hypot(x, y);
      const angle = Math.atan2(y, x);
      const ray = Math.abs(Math.sin(4 * angle)) < 0.18;
      if (r <= 3.45 || (r >= 4.55 && r <= 6.4 && ray)) sun.push([x, y]);
    }
  }
  const byAngle = (a, b) =>
    Math.atan2(a[1], a[0]) - Math.atan2(b[1], b[0]) ||
    Math.hypot(...a) - Math.hypot(...b);
  moon.sort(byAngle);
  sun.sort(byAngle);
  const pairs = new Float32Array(PAIR_COUNT * 4);
  for (let i = 0; i < PAIR_COUNT; i++) {
    const from = moon[Math.floor(i * moon.length / PAIR_COUNT)];
    const to = sun[Math.floor(i * sun.length / PAIR_COUNT)];
    pairs.set([...from, ...to], i * 4);
  }
  return pairs;
}

function shader(gl, kind, source) {
  const instance = gl.createShader(kind);
  gl.shaderSource(instance, source);
  gl.compileShader(instance);
  if (!gl.getShaderParameter(instance, gl.COMPILE_STATUS)) {
    const message = gl.getShaderInfoLog(instance);
    gl.deleteShader(instance);
    throw new Error(message || 'Shader compilation failed');
  }
  return instance;
}

function createProgram(gl) {
  const vertex = shader(gl, gl.VERTEX_SHADER, VERTEX_SOURCE);
  const fragment = shader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SOURCE);
  const program = gl.createProgram();
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const message = gl.getProgramInfoLog(program);
    gl.deleteProgram(program);
    throw new Error(message || 'Shader linking failed');
  }
  return program;
}

/**
 * A draggable day/night switch. The track, glass, light and paired pixel
 * sprites share one WebGL fragment pass; a CSS backdrop softens the real
 * pixels behind the canvas. The shader also has a non-WebGL fallback.
 */
export function createGlassToggle(button, { initial = 'dark', onChange = () => {} } = {}) {
  if (!button) return { setMode() {}, setThemes() {}, setReducedMotion() {} };

  const canvas = button.querySelector('canvas');
  const media = window.matchMedia('(prefers-reduced-motion: reduce)');
  let gl = null;
  let program = null;
  let uniforms = null;
  let frameId = 0;
  let previousTime = 0;
  let mode = initial;
  let position = initial === 'light' ? 1 : 0;
  let destination = position;
  let velocity = 0;
  let dragging = false;
  let moved = false;
  let pointer = null;
  let pointerX = 0;
  let motionEnabled = true;
  let dark = { background: '#100a1b', surface: '#241631' };
  let light = { background: '#f6f5ff', surface: '#ffffff' };
  const pairs = makePairs();

  function reduced() {
    return !motionEnabled || media.matches;
  }

  function draw() {
    button.style.setProperty('--glass-position', position.toFixed(4));
    if (!gl || !program || gl.isContextLost()) return;

    const rect = canvas.getBoundingClientRect();
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.round(rect.width * ratio));
    const height = Math.max(1, Math.round(rect.height * ratio));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    gl.viewport(0, 0, width, height);
    gl.useProgram(program);
    gl.uniform2f(uniforms.size, rect.width, rect.height);
    gl.uniform1f(uniforms.progress, position);
    gl.uniform1f(uniforms.motion, reduced() ? 0 : 1);
    gl.uniform3fv(uniforms.darkBackground, hexRgb(dark.background));
    gl.uniform3fv(uniforms.darkSurface, hexRgb(dark.surface));
    gl.uniform3fv(uniforms.lightBackground, hexRgb(light.background));
    gl.uniform3fv(uniforms.lightSurface, hexRgb(light.surface));
    gl.uniform4fv(uniforms.pairs, pairs);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  function tick(now) {
    frameId = 0;
    const dt = previousTime ? Math.min((now - previousTime) / 16.667, 2) : 1;
    previousTime = now;

    if (!dragging) {
      if (reduced()) {
        position = destination;
        velocity = 0;
      } else {
        velocity = (velocity + (destination - position) * 0.12 * dt) * Math.pow(0.77, dt);
        position += velocity * dt;
        if (Math.abs(position - destination) < 0.0008 && Math.abs(velocity) < 0.0008) {
          position = destination;
          velocity = 0;
        }
      }
    }
    draw();

    if (!dragging && (Math.abs(position - destination) > 0.0001 || Math.abs(velocity) > 0.0001)) {
      schedule();
    }
  }

  function schedule() {
    if (!frameId) frameId = requestAnimationFrame(tick);
  }

  function setMode(next, animate = true) {
    mode = next === 'light' ? 'light' : 'dark';
    destination = mode === 'light' ? 1 : 0;
    button.dataset.mode = mode;
    button.setAttribute('aria-checked', String(mode === 'light'));
    button.title = 'Switch to ' + (mode === 'light' ? 'dark' : 'light') + ' mode';
    if (!animate || reduced()) {
      position = destination;
      velocity = 0;
    }
    schedule();
  }

  function choose(next) {
    const normalized = next === 'light' ? 'light' : 'dark';
    if (mode !== normalized) {
      setMode(normalized, true);
      onChange(normalized);
    } else {
      setMode(normalized, true);
    }
  }

  function progressFromPointer(clientX) {
    const rect = button.getBoundingClientRect();
    const centerOfLeftKnob = rect.left + rect.width * 0.25;
    const distanceBetweenStops = rect.width * 0.5;
    return clamp((clientX - centerOfLeftKnob) / distanceBetweenStops);
  }

  button.addEventListener('pointerdown', event => {
    if (event.button !== 0 || pointer !== null) return;
    event.preventDefault();
    button.focus({ preventScroll: true });
    pointer = event.pointerId;
    pointerX = event.clientX;
    moved = false;
    dragging = true;
    velocity = 0;
    previousTime = 0;
    button.setPointerCapture(pointer);
  });

  button.addEventListener('pointermove', event => {
    if (event.pointerId !== pointer) return;
    if (Math.abs(event.clientX - pointerX) > 4) moved = true;
    if (!moved) return;
    position = progressFromPointer(event.clientX);
    schedule();
  });

  button.addEventListener('pointerup', event => {
    if (event.pointerId !== pointer) return;
    const selected = moved
      ? (progressFromPointer(event.clientX) >= 0.5 ? 'light' : 'dark')
      : (mode === 'dark' ? 'light' : 'dark');
    dragging = false;
    pointer = null;
    choose(selected);
  });

  button.addEventListener('pointercancel', event => {
    if (event.pointerId !== pointer) return;
    dragging = false;
    pointer = null;
    setMode(mode, true);
  });

  button.addEventListener('click', event => {
    // Keyboard and assistive-technology clicks have detail=0.
    // Pointer clicks were already handled by pointerup.
    if (event.detail === 0) choose(mode === 'light' ? 'dark' : 'light');
  });

  button.addEventListener('keydown', event => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault();
      choose(event.key === 'ArrowRight' ? 'light' : 'dark');
    }
  });

  function initWebGL() {
    try {
      gl = canvas.getContext('webgl', {
        alpha: true,
        antialias: true,
        premultipliedAlpha: false,
        powerPreference: 'low-power'
      });
      if (!gl) throw new Error('WebGL is unavailable');
      program = createProgram(gl);
      const buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        -1, -1, 1, -1, -1, 1, 1, 1
      ]), gl.STATIC_DRAW);
      gl.useProgram(program);
      const attribute = gl.getAttribLocation(program, 'aPosition');
      gl.enableVertexAttribArray(attribute);
      gl.vertexAttribPointer(attribute, 2, gl.FLOAT, false, 0, 0);
      const locate = name => gl.getUniformLocation(program, name);
      uniforms = {
        size: locate('uSize'),
        progress: locate('uProgress'),
        motion: locate('uMotion'),
        pairs: locate('uPairs[0]'),
        darkBackground: locate('uDarkBackground'),
        darkSurface: locate('uDarkSurface'),
        lightBackground: locate('uLightBackground'),
        lightSurface: locate('uLightSurface')
      };
      button.classList.add('glass-ready');
      schedule();
    } catch (error) {
      // GPU-disabled browsers still get the normal, accessible switch.
      button.classList.remove('glass-ready');
      gl = null;
      program = null;
      console.warn('Lightning glass toggle fallback:', error.message);
    }
  }

  canvas.addEventListener('webglcontextlost', event => {
    event.preventDefault();
    gl = null;
    program = null;
    button.classList.remove('glass-ready');
  });
  canvas.addEventListener('webglcontextrestored', initWebGL);
  const observer = new ResizeObserver(schedule);
  observer.observe(button);
  media.addEventListener?.('change', schedule);

  setMode(initial, false);
  initWebGL();

  return {
    setMode,
    setThemes(themes) {
      dark = themes.dark || dark;
      light = themes.light || light;
      schedule();
    },
    setReducedMotion(enabled) {
      motionEnabled = !enabled;
      if (reduced()) {
        position = destination;
        velocity = 0;
      }
      schedule();
    }
  };
}
