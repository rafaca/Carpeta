/* ============================================================
   Bubble Dancers — embeddable build
   Usage:
     <div id="dancers" style="height:70vh"></div>
     <script src="dancers-embed.js"></script>
     <script>
       BubbleDancers.mount('#dancers', {
         background: '#E4FFFE',          // any hex — the whole scene derives from it
         figure: { size: 0.8 },          // optional FIGURE overrides
         motion: { tempo: 0.705 },       // optional MOTION overrides
         backgroundTop: '#FFFFFF',       // optional: vertical gradient top colour
         backgroundStop: 0.61,           // optional: where the gradient settles
         pointer: 'window',              // for click-through full-page background layers
       });
     </script>
   The instance returned has .destroy(), .setBackground(hex),
   .figure and .motion (live-editable objects).
   Interaction: hover calmly and the troupe follows the cursor
   pied-piper style; move fast and they scatter into freestyle;
   go still and they reform the circle dance; touching the ring
   breaks it. Pure WebGL, no dependencies.
   ============================================================ */
export function mount(target, opts){
opts = opts || {};
const host = typeof target === 'string' ? document.querySelector(target) : target;
if(!host) throw new Error('BubbleDancers: container not found');

/* ============================================================
   Six dancers holding hands in a circle dance on one floor.
   Each dancer is a stick skeleton of 3D capsules (torso, head,
   2-segment arms and legs); the shader smooth-min unions them
   into gummy figures and shades them like soap bubbles — dark
   glass, thin-film iridescent rim, hot specular.

   The ring turns slowly, drifting gently after the cursor.
   TOUCH the ring and it breaks: hands release, the six scatter
   and each dances on their own — own tempo, own moves — dodging
   the cursor if you chase them. Leave them alone for a moment
   and they drift back, join hands, and the round dance resumes.
   ============================================================ */

const DANCERS = 6;
const SPD = 9;             // segments per dancer: 2-piece spine + head + 2×2 arms + 2×1 legs
const SEGS = DANCERS * SPD;
const TAU = Math.PI * 2;
const RR = 0.92;           // radius of the ring at size 1 (scales with FIGURE.size)

// camera (shared between shader and the JS mouse ray)
const RO = [0, 2.8, 4.2];    // eye — elevated, pulled back: the ring reads as a wide ellipse
const TA = [0, 0.35, 0];     // look-at
const FL = 2.3;              // focal length — longer lens, flatter perspective

const VERT = `
attribute vec2 aPos;
void main(){ gl_Position = vec4(aPos, 0.0, 1.0); }`;

const FRAG = `
precision highp float;
uniform vec2  uRes;
uniform float uTime;
uniform vec2  uCenter;           // stage-light centre on the floor (xz)
uniform vec4  uSegA[${SEGS}];    // limb start xyz + start radius in w
uniform vec4  uSegB[${SEGS}];    // limb end xyz + end radius in w
uniform vec4  uBnd[${DANCERS}];  // per-dancer bounding sphere, xyz + radius
uniform float uK;                // goop: how eagerly limbs melt together
uniform vec3  uBg;               // base colour, bottom of the gradient (linearised)
uniform vec3  uBgTop;            // top-of-page colour (linearised)
uniform float uBgStop;           // where the gradient settles (0..1 of canvas height)
uniform vec4  uEyes[${DANCERS*3}];  // face dots (2 eyes + mouth) xyz + softness in w
uniform float uEyeDark;          // how dark the eye dots read

/* tapered capsule (round cone) — limbs slim toward wrists and
   ankles instead of reading as constant-width pegs */
float sdRoundCone(vec3 p, vec3 a, vec3 b, float r1, float r2){
  vec3 ba = b - a;
  float l2 = dot(ba, ba);
  if(l2 < 1e-7) return length(p - a) - r1;
  float rr = r1 - r2;
  float a2 = l2 - rr*rr;
  float il2 = 1.0/l2;
  vec3 pa = p - a;
  float y = dot(pa, ba);
  float z = y - l2;
  vec3 xv = pa*l2 - ba*y;
  float x2 = dot(xv, xv);
  float y2 = y*y*l2;
  float z2 = z*z*l2;
  float k = sign(rr)*rr*rr*x2;
  if(sign(z)*a2*z2 > k) return sqrt(x2 + z2)*il2 - r2;
  if(sign(y)*a2*y2 < k) return sqrt(x2 + y2)*il2 - r1;
  return (sqrt(x2*a2*il2) + y*rr)*il2 - r1;
}

float smin(float a, float b, float k){
  float h = clamp(0.5 + 0.5*(b - a)/k, 0.0, 1.0);
  return mix(b, a, h) - k*h*(1.0 - h);
}

float mapFigures(vec3 p){
  float d = 1e5;
  for(int j = 0; j < ${DANCERS}; j++){
    // outside a dancer's bounding sphere, the sphere distance is a
    // safe lower bound — skip their 10 capsules entirely
    float bd = length(p - uBnd[j].xyz) - uBnd[j].w;
    if(bd > uK + 0.04){ d = min(d, bd); continue; }
    for(int i = 0; i < ${SPD}; i++){
      d = smin(d, sdRoundCone(p, uSegA[j*${SPD}+i].xyz, uSegB[j*${SPD}+i].xyz,
                              uSegA[j*${SPD}+i].w, uSegB[j*${SPD}+i].w), uK);
    }
  }
  return d;
}

/* floor at y=0, with a tiny meniscus where feet touch down */
float map(vec3 p){
  return smin(p.y, mapFigures(p), 0.018);
}

/* wider sampling for distant hits smooths normals like mipmapping —
   without it the iridescent rim shimmers into per-pixel confetti */
vec3 calcNormal(vec3 p, float t){
  vec2 e = vec2(0.0012 + t*0.0009, 0.0);
  return normalize(vec3(
    map(p + e.xyy) - map(p - e.xyy),
    map(p + e.yxy) - map(p - e.yxy),
    map(p + e.yyx) - map(p - e.yyx)));
}

vec3 pal(float t){
  return 0.5 + 0.5*cos(6.28318*(t + vec3(0.0, 0.33, 0.67)));
}

/* the stage floor: pool of light, contact shadows, fog to the sky.
   shAmt scales the contact shadows — the floor takes them fully,
   a drop's body only faintly (it shouldn't wear its own shadow) */
vec3 floorColor(vec3 p, float t, vec3 bg, float shAmt){
  vec3 fl = uBg * 0.86 + vec3(0.004);
  float dc = length(p.xz - uCenter);
  fl += (uBg * 0.11 + vec3(0.02, 0.02, 0.03)) * smoothstep(2.0, 0.3, dc);
  float sh = 1.0;
  for(int i = 0; i < ${DANCERS}; i++){
    float hd = length(p.xz - uSegA[i*${SPD}].xz);
    sh *= 1.0 - 0.5*exp(-hd*hd*7.0);
  }
  fl *= mix(1.0, sh, shAmt);
  return mix(fl, bg, smoothstep(2.5, 8.0, t));
}

/* droplets: the body takes the colour of the ground beneath it —
   only the rim, a whisper of iridescence and the speculars reveal
   the form, like drops of the page itself */
vec3 shadeFigure(vec3 p, vec3 n, vec3 v, vec3 base){
  float ndv = max(dot(n, v), 0.0);
  float fre = pow(1.0 - ndv, 3.0);
  float lum = dot(base, vec3(0.333));

  float lightness = smoothstep(0.10, 0.30, lum);
  vec3 body = base * (0.96 + 0.04*ndv);
  // rim reads darker on light grounds, brighter on dark ones
  vec3 rim = mix(base + vec3(0.40), base * 0.5, lightness);
  body = mix(body, rim, fre * 0.6);
  // thin-film iridescence, full range: the phase cycles the palette
  // several times across the edge gradient, so the rim shows
  // CONCENTRIC rainbow bands like a real soap bubble. On dark
  // grounds the bands ADD light; on light grounds added light
  // washes out, so the rim absorbs like a film — colour by tinting
  // a wider falloff than the fresnel keeps the bands visible on
  // figures this small — the colour reaches into the body, not just
  // the outermost pixels
  float freW = pow(1.0 - ndv, 1.5);
  float film = 3.2*freW + 0.25*n.x + 0.18*n.y + 0.05*uTime;
  vec3 irid = pal(film);
  body += irid * freW * 1.35 * (1.0 - lightness);
  body = mix(body, body * (0.20 + 1.4*irid), min(freW * 1.3, 1.0) * lightness);
  vec3 l1 = normalize(vec3(0.55, 0.75, 0.55));
  vec3 l2 = normalize(vec3(-0.6, -0.3, 0.7));
  body += vec3(1.0) * pow(max(dot(reflect(-l1, n), v), 0.0), 90.0) * 1.2;
  body += vec3(0.25, 0.3, 0.4) * pow(max(dot(reflect(-l2, n), v), 0.0), 24.0) * 0.15;
  // eyes: two soft frosted dots on each face — they sit on the head
  // surface facing the dancer's way, so they only read when the
  // dancer faces you
  float eyeK = 1.0;
  for(int e = 0; e < ${DANCERS*3}; e++){
    vec3 ev = p - uEyes[e].xyz;
    float s2 = uEyes[e].w * uEyes[e].w;
    eyeK *= 1.0 - uEyeDark*exp(-dot(ev, ev)/(2.0*s2));
  }
  body *= eyeK;
  return body;
}

void main(){
  vec2 uv = (2.0*gl_FragCoord.xy - uRes) / uRes.y;

  vec3 ro = vec3(${RO.join(',')});
  vec3 ta = vec3(${TA.join(',')});
  vec3 f = normalize(ta - ro);
  vec3 r = normalize(cross(f, vec3(0.0, 1.0, 0.0)));
  vec3 u = cross(r, f);
  vec3 rd = normalize(r*uv.x + u*uv.y + f*${FL.toFixed(2)});

  // background: vertical gradient (top colour settling into the base
  // by uBgStop) with a faint radial breath
  float vy = 1.0 - gl_FragCoord.y / uRes.y;
  vec3 bg = mix(uBgTop, uBg, smoothstep(0.0, max(uBgStop, 1e-3), vy));
  bg *= 1.0 - 0.06*length(uv);
  vec3 col = bg;

  float t = 0.0, glow = 1e5, tGlow = 0.0;
  bool hit = false;
  vec3 p;
  for(int i = 0; i < 90; i++){
    p = ro + rd*t;
    float d = map(p);
    // track grazes at figure height and figure range only — tracking
    // the floor plane painted a glowing horizon across the background
    if(d < glow && p.y > 0.05 && t < 7.0){ glow = d; tGlow = t; }
    if(d < 0.002){ hit = true; break; }
    t += d*0.9;
    if(t > 10.0) break;
  }

  if(hit){
    vec3 n = calcNormal(p, t);
    vec3 v = -rd;
    float dFig = mapFigures(p);

    vec3 fl = floorColor(p, t, bg, 1.0);
    // the drop takes the colour of the ground directly beneath it
    vec3 body = shadeFigure(p, n, v, floorColor(vec3(p.x, 0.0, p.z), t, bg, 0.25));

    // blend across the foot meniscus so contacts stay goopy
    col = mix(body, fl, smoothstep(0.0, 0.05, dFig));
  } else {
    // faint iridescent halo hugging the silhouettes — additive light,
    // so it fades out automatically on bright backgrounds
    float darkness = clamp(1.0 - dot(uBg, vec3(0.4)), 0.0, 1.0);
    col += vec3(0.05, 0.03, 0.09) * exp(-glow*24.0) * 0.35 * darkness;

    // silhouette anti-aliasing: rays that grazed a figure by less
    // than a pixel's footprint get a share of its rim colour
    float fw = tGlow * 2.8 / (uRes.y * ${FL.toFixed(2)});
    if(glow < fw && tGlow > 0.0){
      vec3 pe = ro + rd*tGlow;
      float cov = 1.0 - glow/fw;
      vec3 eBase = floorColor(vec3(pe.x, 0.0, pe.z), tGlow, bg, 0.25);
      col = mix(col, shadeFigure(pe, calcNormal(pe, tGlow), -rd, eBase), cov*cov);
    }
  }

  col = pow(col, vec3(0.4545)); // gamma
  gl_FragColor = vec4(col, 1.0);
}`;

/* ---------- tiny seeded value noise (for motion) ---------- */
function makeNoise(seed){
  let s = seed >>> 0 || 1;
  const rnd = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
  const perm = [...Array(256).keys()];
  for(let i = 255; i > 0; i--){ const j = Math.floor(rnd() * (i + 1)); [perm[i], perm[j]] = [perm[j], perm[i]]; }
  const p = new Uint8Array(512);
  for(let i = 0; i < 512; i++) p[i] = perm[i & 255];
  const fade = t => t * t * (3 - 2 * t);
  return (x, y = 0) => {
    const X = Math.floor(x) & 255, Y = Math.floor(y) & 255;
    x -= Math.floor(x); y -= Math.floor(y);
    const u = fade(x), v = fade(y);
    const va = p[p[X] + Y] / 255,     vb = p[p[X + 1] + Y] / 255;
    const vc = p[p[X] + Y + 1] / 255, vd = p[p[X + 1] + Y + 1] / 255;
    return va + (vb - va) * u + (vc - va + (va - vb + vd - vc) * u) * v;
  };
}
const noise = makeNoise(7);
const n1 = (a, b) => noise(a, b) - 0.5;                            // animated, -0.5..0.5
const rnd = (i, j) => noise(i * 13.7 + 3.1, j * 27.9 + 9.4) - 0.5; // per-dancer constant

/* ---------- THE FIGURES — sculpt them here (or press "edit figures") ----------
   All values are world units; a dancer stands roughly 0.85 tall. */
// the established proportions, exactly as tuned. `size` scales the
// WHOLE dancer — body, motion amplitudes, ring, spacing — uniformly,
// so the look is preserved at any scale (0.8 = the 20% smaller ask)
const FIGURE = {
  size:    0.8,    // overall scale of the troupe
  head:    0.105,  // head radius
  neckLift:0.061,  // how far the head floats above the shoulders
  torso:   0.267,  // hip-to-shoulder length
  torsoR:  0.110,  // torso thickness
  hip:     0.424,  // hip height off the floor
  armR:    0.064,  // arm thickness
  armLen:  0.215,  // arm reach — how far hands stretch from the shoulders
  legR:    0.085,  // leg thickness
  stance:  0.080,  // how far apart the feet stand
  handH:   0.622,  // height where neighbours' hands meet
  blend:   0.099,  // goop: how eagerly limbs melt together
};
const FIGURE_DEFAULTS = { ...FIGURE };

/* ---------- THE EYES — all factors of head size ---------- */
const EYES = {
  dark:    0.55,  // how dark the dots read
  size:    0.17,  // eye softness
  sep:     0.42,  // eye distance apart
  up:      0.16,  // eye height on the face
  mouth:   0.11,  // mouth size (0 = no mouth)
  mouthUp: -0.22, // mouth height on the face
};
const EYES_DEFAULTS = { ...EYES };

/* ---------- THE DANCE — pace & choreography (also in the editor) */
const MOTION = {
  tempo:  0.705, // beat speed — steps, bobs, arm pumps
  circle: 2.775, // how fast the ring turns
  bounce: 1.782, // step bounce height
  jump:   0.742, // jump height
  sway:   0.547, // hips, spine, arms and kick looseness
  lines:  1.0,   // how often they snake off in a follow-the-leader line
};
const MOTION_DEFAULTS = { ...MOTION };
const MPARAMS = [
  ['tempo',       'tempo',  0.2, 2.5],
  ['circling',    'circle', 0.0, 3.0],
  ['bounce',      'bounce', 0.0, 2.5],
  ['jump height', 'jump',   0.0, 2.5],
  ['sway',        'sway',   0.0, 2.5],
  ['line dances', 'lines',  0.0, 2.5],
];

// the editor panel: label, key, min, max
const PARAMS = [
  ['size',            'size',     0.5,  1.3],
  ['head size',       'head',     0.04, 0.14],
  ['neck lift',       'neckLift', 0.03, 0.18],
  ['torso length',    'torso',    0.16, 0.45],
  ['torso thickness', 'torsoR',   0.03, 0.13],
  ['hip height',      'hip',      0.28, 0.62],
  ['arm thickness',   'armR',     0.018, 0.09],
  ['arm length',      'armLen',   0.15,  0.50],
  ['leg thickness',   'legR',     0.022, 0.10],
  ['stance width',    'stance',   0.03, 0.20],
  ['hand height',     'handH',    0.38, 0.80],
  ['goopiness',       'blend',    0.02, 0.12],
];

/* ---------- WebGL plumbing ---------- */
const canvas = document.createElement('canvas');
canvas.style.cssText = 'display:block;width:100%;height:100%';
host.appendChild(canvas);
const gl = canvas.getContext('webgl');
function sh(type, src){
  const h = gl.createShader(type);
  gl.shaderSource(h, src); gl.compileShader(h);
  if(!gl.getShaderParameter(h, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(h));
  return h;
}
const prog = gl.createProgram();
gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
gl.linkProgram(prog);
if(!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
gl.useProgram(prog);

const buf = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, buf);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW);
const aPos = gl.getAttribLocation(prog, 'aPos');
gl.enableVertexAttribArray(aPos);
gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

const U = n => gl.getUniformLocation(prog, n);
const uRes = U('uRes'), uTime = U('uTime'), uCenter = U('uCenter');
const uSegA = U('uSegA'), uSegB = U('uSegB'), uBnd = U('uBnd'), uK = U('uK');
const uBg = U('uBg'), uBgTop = U('uBgTop'), uBgStop = U('uBgStop');
const uEyes = U('uEyes'), uEyeDark = U('uEyeDark');

/* ---------- background colour ---------- */
const BG_DEFAULT = '#E4FFFE';
let bgHex = BG_DEFAULT;
let bgLin = [0, 0, 0], bgTopLin = [0, 0, 0], bgStop = 0.61;
const linHex = hex => {
  const r = parseInt(hex.slice(1,3), 16) / 255;
  const g = parseInt(hex.slice(3,5), 16) / 255;
  const b = parseInt(hex.slice(5,7), 16) / 255;
  // linearise: the shader gammas at the end, returning the exact hex
  return [Math.pow(r, 2.2), Math.pow(g, 2.2), Math.pow(b, 2.2)];
};
function applyBg(hex, topHex, stop){
  bgHex = hex;
  bgLin = linHex(hex);
  bgTopLin = linHex(topHex || hex);
  bgStop = stop == null ? (topHex ? 0.61 : 1.0) : stop;
  host.style.background = topHex
    ? `linear-gradient(180deg, ${topHex} 0%, ${hex} ${Math.round(bgStop*100)}%)`
    : hex;
}
if(opts.figure) Object.assign(FIGURE, opts.figure);
if(opts.motion) Object.assign(MOTION, opts.motion);
if(opts.eyes) Object.assign(EYES, opts.eyes);
applyBg(opts.background || BG_DEFAULT, opts.backgroundTop, opts.backgroundStop);

// full resolution (up to 1.5x on retina) — bounding spheres in the
// shader keep the per-pixel cost down, and edges stay crisp
const RES_SCALE = Math.min(window.devicePixelRatio || 1, 1.5);
let W, H;
function resize(){
  W = canvas.width = Math.round(host.clientWidth * RES_SCALE);
  H = canvas.height = Math.round(host.clientHeight * RES_SCALE);
  gl.viewport(0, 0, W, H);
}
const ro = new ResizeObserver(resize);
ro.observe(host);
window.addEventListener('resize', resize);
resize();

/* ---------- cursor: project the mouse onto the floor ---------- */
const sub = (a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]];
const cross = (a,b)=>[a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
const norm = a=>{const l=Math.hypot(...a)||1; return [a[0]/l,a[1]/l,a[2]/l];};
const camF = norm(sub(TA, RO));
const camR = norm(cross(camF, [0,1,0]));
const camU = cross(camR, camF);

function mouseToFloor(mx, my){
  // mouse is in CSS px; canvas buffer is scaled, but the ratios match
  const ux = (2*mx - host.clientWidth) / host.clientHeight, uy = (host.clientHeight - 2*my) / host.clientHeight;
  const rd = norm([
    camR[0]*ux + camU[0]*uy + camF[0]*FL,
    camR[1]*ux + camU[1]*uy + camF[1]*FL,
    camR[2]*ux + camU[2]*uy + camF[2]*FL]);
  if(rd[1] > -0.02) return null;            // pointing at the sky
  const t = -RO[1] / rd[1];
  return [RO[0] + rd[0]*t, RO[2] + rd[2]*t];
}

const mouse = { x: -1e4, y: -1e4, lastMove: -1e9 };
let px = 0, py = 0;
let center = [0, 0];    // where the troupe gathers
let energy = 0;         // cursor speed → wilder moves
let broken = 0;         // 0 = hands held, 1 = circle broken, all solo
let lastTouch = -1e9;
let ringA = 0;          // the circling
let last = performance.now();
const anchors = Array.from({length: DANCERS}, () => [0, 0]); // last frame's feet spots
const phase = new Float64Array(DANCERS); // each dancer's personal beat, integrated
const spots = Array.from({length: DANCERS}, () => null);     // eased floor positions
const faceAng = Array.from({length: DANCERS}, () => null);   // eased facing angles
let lineW = 0;                 // 0 = ring formation, 1 = follow-the-leader line
let lineUntil = 0;             // when the current line dance ends
let nextLineAt = 9000;         // when the next one starts
let beckonSince = 0;           // how long the cursor has been playing pied piper

function trackPointer(e){
  const r = canvas.getBoundingClientRect();
  mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
  mouse.lastMove = performance.now();
}
// pointer:'window' lets a click-through background layer
// (pointer-events:none) still see the cursor anywhere on the page
const ptr = opts.pointer === 'window' ? window : host;
ptr.addEventListener('pointermove', trackPointer);
ptr.addEventListener('pointerdown', trackPointer);

/* ---------- the troupe ---------- */
const segA = new Float32Array(SEGS * 4);
const segB = new Float32Array(SEGS * 4);
const bnd  = new Float32Array(DANCERS * 4);
const eyes = new Float32Array(DANCERS * 3 * 4);

// per-dancer bounding sphere over all 20 capsule endpoints,
// padded by the fattest radius + the smooth-min blend reach
function computeBounds(){
  for(let j = 0; j < DANCERS; j++){
    let cx = 0, cy = 0, cz = 0, maxR = 0;
    for(let i = 0; i < SPD; i++){
      const k = (j*SPD + i) * 4;
      cx += segA[k] + segB[k]; cy += segA[k+1] + segB[k+1]; cz += segA[k+2] + segB[k+2];
      maxR = Math.max(maxR, segA[k+3], segB[k+3]);
    }
    cx /= SPD*2; cy /= SPD*2; cz /= SPD*2;
    let r = 0;
    for(let i = 0; i < SPD; i++){
      const k = (j*SPD + i) * 4;
      r = Math.max(r,
        Math.hypot(segA[k]-cx, segA[k+1]-cy, segA[k+2]-cz),
        Math.hypot(segB[k]-cx, segB[k+1]-cy, segB[k+2]-cz));
    }
    bnd.set([cx, cy, cz, r + maxR + 0.06], j * 4);
  }
}

function buildSkeleton(t, wild, brk, lnW, lead, m, dt){
  const step = TAU / DANCERS;
  let n = 0;
  const seg = (a, b, rA, rB) => {
    segA.set([a[0], a[1], a[2], rA], n * 4);
    segB.set([b[0], b[1], b[2], rB], n * 4);
    n++;
  };
  const lerp3 = (a, b, k) => [a[0]+(b[0]-a[0])*k, a[1]+(b[1]-a[1])*k, a[2]+(b[2]-a[2])*k];
  const mix2 = (a, b, k) => [a[0]+(b[0]-a[0])*k, a[1]+(b[1]-a[1])*k];

  // shared hand points between neighbours — these hold the ring together
  // one scale to rule them all: every body dimension, motion
  // amplitude and formation distance multiplies by FIGURE.size, so
  // resizing the troupe never changes its proportions or character
  const S = FIGURE.size;
  const F = {};
  for(const k in FIGURE) F[k] = k === 'size' ? S : FIGURE[k] * S;
  const RRs = RR * S;
  // longer arms bow the held hands outward, shorter arms pull the
  // grip in tight — so arm length reads in the ring pose too
  const heldR = RRs + (0.06 + (F.armLen - 0.245*S) * 0.8);
  const held = [];
  for(let i = 0; i < DANCERS; i++){
    const a = ringA + (i + 0.5) * step;
    held.push([
      center[0] + heldR * Math.cos(a) + n1(i*3+1, t) * (0.05 + 0.2*wild) * S,
      F.handH + rnd(i, 1) * 0.06 * S + n1(i*3+41, t) * (0.06 + 0.25*wild) * S,
      center[1] + heldR * Math.sin(a) + n1(i*3+81, t) * (0.05 + 0.2*wild) * S
    ]);
  }

  for(let i = 0; i < DANCERS; i++){
    const a = ringA + i * step;

    // spot on the ring vs. their own solo spot: scattered outward,
    // wandering, and shooed along if the cursor chases them
    const ringSpot = [center[0] + RRs*Math.cos(a), center[1] + RRs*Math.sin(a)];
    let solo = [
      ringSpot[0] + Math.cos(a)*0.22*S + n1(i*9+3, t*0.45)*S,
      ringSpot[1] + Math.sin(a)*0.22*S + n1(i*9+53, t*0.45)*S];
    if(brk > 0.01 && m){
      const dx = solo[0]-m[0], dz = solo[1]-m[1];
      const d = Math.hypot(dx, dz);
      if(d < 0.5 && d > 1e-4){
        const push = (0.5 - d) * 1.1;
        solo = [solo[0] + dx/d*push, solo[1] + dz/d*push];
      }
    }
    // line formation: dancer 0 chases the lead point, everyone else
    // trails a fixed spacing behind the dancer ahead of them
    let spotT = mix2(ringSpot, solo, brk);
    if(lnW > 0.001){
      let lineSpot;
      if(i === 0){
        // the leader stays one step behind the piper, never on it
        const cur = spots[0] || ringSpot;
        const dx = lead[0] - cur[0], dz = lead[1] - cur[1];
        const l = Math.hypot(dx, dz), gap = 0.16*S;
        lineSpot = l > gap
          ? [lead[0] - dx/l*gap, lead[1] - dz/l*gap]
          : [cur[0], cur[1]];
      } else {
        const prev = spots[i-1] || ringSpot, cur = spots[i] || ringSpot;
        const dx = cur[0] - prev[0], dz = cur[1] - prev[1];
        const l = Math.hypot(dx, dz) || 1;
        lineSpot = [prev[0] + dx/l*0.34*S, prev[1] + dz/l*0.34*S];
      }
      spotT = mix2(spotT, lineSpot, lnW);
    }

    // ease toward the target spot — repulsion pushes, mode blends and
    // the chasing line all arrive as smooth steps, not snaps
    if(!spots[i]) spots[i] = spotT.slice();
    const headX = spotT[0] - spots[i][0], headZ = spotT[1] - spots[i][1];
    const se = 1 - Math.exp(-dt * 5);
    spots[i][0] += headX * se;
    spots[i][1] += headZ * se;
    anchors[i] = spots[i];
    const ax = spots[i][0], az = spots[i][1];

    // free dancers (solo or in the line) move loosely; the held ring
    // keeps everything measured
    const loose = Math.max(brk, 0.75 * lnW);

    // facing: outward in the ring, wherever the groove goes when solo,
    // direction of travel in the line — always eased, never snapped
    let faceGoal = a + brk * n1(i*4+7, t*0.25) * 3.0;
    if(lnW > 0.4 && Math.hypot(headX, headZ) > 0.02){
      faceGoal = Math.atan2(headZ, headX);
    } else if(lnW > 0.4 && faceAng[i] !== null){
      faceGoal = faceAng[i];
    }
    if(faceAng[i] === null) faceAng[i] = faceGoal;
    const dAng = ((faceGoal - faceAng[i] + Math.PI) % TAU + TAU) % TAU - Math.PI;
    faceAng[i] += dAng * (1 - Math.exp(-dt * 4));
    const face = faceAng[i];
    const O = [Math.cos(face), 0, Math.sin(face)];   // outward / facing
    const T = [-Math.sin(face), 0, Math.cos(face)];  // sideways

    // phase[i] is integrated in the frame loop, so tempo changes
    // (breaking away, cursor energy) never snap the limbs
    const bob = Math.abs(Math.sin(phase[i])) * (0.02 + 0.05*wild + 0.06*loose)
              * MOTION.bounce * S;
    // real jumps: whole body leaves the floor, biggest when free
    const jump = Math.pow(Math.max(0, Math.sin(phase[i]*0.45 + i*2.1)), 3.0)
               * (0.05*wild + 0.17*loose) * MOTION.jump * S;
    const swayT = n1(i*5+2, t) * (0.08 + 0.25*wild + 0.15*loose) * MOTION.sway * S;
    const leanO = n1(i*5+62, t) * (0.05 + 0.18*wild + 0.12*loose) * MOTION.sway * S;

    const hip  = [ax + T[0]*swayT, F.hip + bob + jump + rnd(i,4)*0.02*S, az + T[2]*swayT];
    const neck = [hip[0] + T[0]*swayT*0.8 + O[0]*leanO,
                  hip[1] + F.torso,
                  hip[2] + T[2]*swayT*0.8 + O[2]*leanO];
    const head = [neck[0] + O[0]*leanO*0.7, neck[1] + F.neckLift, neck[2] + O[2]*leanO*0.7];

    // two-piece spine with a wandering belly point — the torso
    // breathes and curves instead of standing like a post
    const spO = n1(i*8+11, t*0.9) * (0.02 + 0.05*loose) * MOTION.sway * S;
    const spT = n1(i*8+51, t*0.9) * (0.025 + 0.06*loose) * MOTION.sway * S;
    const belly = [(hip[0]+neck[0])/2 + O[0]*spO + T[0]*spT,
                   (hip[1]+neck[1])/2,
                   (hip[2]+neck[2])/2 + O[2]*spO + T[2]*spT];

    seg(hip, belly, F.torsoR*1.08, F.torsoR*0.96);  // torso, hips widest
    seg(belly, neck, F.torsoR*0.96, F.torsoR*0.78); // slims to shoulders
    seg(head, head, F.head, F.head);                // head

    // the face rides the head, looking wherever the dancer faces:
    // two eyes and a small mouth below them
    const eSep = F.head * EYES.sep, eFwd = F.head * 1.02;
    const eUp = F.head * EYES.up, eSoft = F.head * Math.max(EYES.size, 0.02);
    for(const sd of [-1, 1]){
      eyes.set([
        head[0] + O[0]*eFwd + T[0]*sd*eSep,
        head[1] + eUp,
        head[2] + O[2]*eFwd + T[2]*sd*eSep,
        eSoft], (i*3 + (sd > 0 ? 1 : 0)) * 4);
    }
    if(EYES.mouth > 0.02){
      eyes.set([
        head[0] + O[0]*eFwd,
        head[1] + F.head * EYES.mouthUp,
        head[2] + O[2]*eFwd,
        F.head * EYES.mouth], (i*3 + 2) * 4);
    } else {
      eyes.set([0, -99, 0, 0.001], (i*3 + 2) * 4); // parked far under the floor
    }

    // arms: in the round they reach to the shared held hands;
    // solo they pump and wave to their own beat
    const shoulder = lerp3(hip, neck, 0.85);
    const armPairs = [[held[i], 1], [held[(i + DANCERS - 1) % DANCERS], -1]];
    for(const [heldHand, side] of armPairs){
      const wave = face + side * (1.3 + n1(i*6 + side*3 + 30, t) * 1.2 * MOTION.sway);
      const raise = (0.42 + 0.4 * Math.max(0, Math.sin(phase[i]*0.5 + side*1.8))) * S;
      const free = [
        shoulder[0] + Math.cos(wave) * F.armLen,
        raise,
        shoulder[2] + Math.sin(wave) * F.armLen];
      const hand = lerp3(heldHand, free, Math.max(brk, lnW));
      const mid = lerp3(shoulder, hand, 0.5);
      // elbows bend in a direction that keeps wandering — a mix of
      // droop and sideways flex, so arms curve organically
      const adx = hand[0]-shoulder[0], adz = hand[2]-shoulder[2];
      const adl = Math.hypot(adx, adz) || 1;
      const p1 = [-adz/adl, 0, adx/adl];       // horizontal perp to the arm
      const bendA = n1(i*6 + side*4 + 70, t*0.9) * 1.6;
      const eb = (0.028*(1 + rnd(i, 5 + side)) + 0.045*loose) * S;
      const elbow = [
        mid[0] + p1[0]*Math.sin(bendA)*eb,
        mid[1] - Math.cos(bendA)*eb,
        mid[2] + p1[2]*Math.sin(bendA)*eb];
      seg(shoulder, elbow, F.armR, F.armR*0.85);
      seg(elbow, hand, F.armR*0.85, F.armR*0.66); // slims to the wrist
    }

    // legs: alternate stepping; solo kicks fly higher and wider,
    // and both feet leave the floor during a jump
    for(const side of [-1, 1]){
      const beat = phase[i] + (side > 0 ? 0 : Math.PI);
      const lift = Math.max(0, Math.sin(beat)) * (0.04 + 0.14*wild + 0.14*loose)
                 * MOTION.bounce * S + jump * 0.85;
      const kickO = n1(i*7 + side*2 + 20, t) * (0.04 + 0.3*wild + 0.3*loose) * MOTION.sway * S;
      // the rounded foot end RESTS on the floor instead of sinking
      // into it — a buried tip read as a thin stem in a wide puddle
      const foot = [
        ax + T[0]*(side*F.stance + swayT*0.5) + O[0]*kickO,
        lift + F.legR*0.82,
        az + T[2]*(side*F.stance + swayT*0.5) + O[2]*kickO];
      // each leg roots at its OWN point beside the hip, slimmer at
      // the top — two fat thighs sharing one origin plus the torso
      // base used to smooth-min into a giant bulge
      const root = [
        hip[0] + T[0]*side*F.stance*0.52,
        hip[1] - 0.05*S,
        hip[2] + T[2]*side*F.stance*0.52];
      // ONE tapered cone per leg, no knee joint: with heavy goop the
      // smooth-min inflates every joint, so a jointed leg reads as
      // beads on a string — bulge at the knee, thin tube below.
      // A single segment has nothing to bead.
      seg(root, foot, F.legR*1.05, F.legR*0.82);
    }
  }
}

/* ---------- main loop ---------- */
function frame(now){
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;

  // time-based easing so behaviour is identical at any frame rate
  const ease = rate => 1 - Math.exp(-dt * rate);

  // energy: rises fast with cursor speed, decays slowly
  const speed = Math.hypot(mouse.x - px, mouse.y - py) / Math.max(dt, 1e-3);
  px = mouse.x; py = mouse.y;
  const target = Math.min(speed / 1500, 1);
  energy += (target - energy) * ease(target > energy ? 7 : 1);

  // a cursor too fast to follow breaks the troupe into freestyle
  if(target > 0.55 && now - mouse.lastMove < 100) lastTouch = now;

  const t = now * 0.0007;

  // is the cursor touching the troupe? (near the band, or a dancer)
  const m = mouseToFloor(mouse.x, mouse.y);
  let touching = false;
  if(m){
    const dBand = Math.abs(Math.hypot(m[0]-center[0], m[1]-center[1]) - RR*FIGURE.size);
    const nearDancer = anchors.some(s => Math.hypot(m[0]-s[0], m[1]-s[1]) < 0.30);
    touching = dBand < 0.22 || nearDancer;
  }
  // touching breaks the ring — but not while they're deliberately
  // chasing the cursor in a line; proximity is the point there
  if(touching && now - mouse.lastMove < 100 && lineW < 0.3) lastTouch = now;

  // broken: snaps open on touch, mends slowly once left alone
  const bt = now - lastTouch < 3000 ? 1 : 0;
  broken += (bt - broken) * ease(bt > broken ? 9 : 1.4);

  // from time to time (never while broken) they snake off in a
  // line, following the leader — and the leader follows the cursor
  if(now > nextLineAt && broken < 0.1 && MOTION.lines > 0.02){
    lineUntil = now + 11000 + Math.random() * 6000;
    nextLineAt = lineUntil + (22000 + Math.random() * 16000) / MOTION.lines;
  }

  // pied piper: a HOVERING cursor (present and calm) draws the troupe
  // into a line behind it — as long as it keeps leading, they keep
  // following. A cursor moving too fast broke them above; a cursor
  // that goes still lets everything decay back to the circle dance.
  if(m && now - mouse.lastMove < 1500 && broken < 0.15 && energy < 0.35
     && (lineW > 0.3 || !touching)){
    if(!beckonSince) beckonSince = now;
    if(now - beckonSince > 900) lineUntil = Math.max(lineUntil, now + 1800);
  } else {
    beckonSince = 0;
  }
  if(broken > 0.5) lineUntil = 0; // breaking the ring trumps the line
  const lt = now < lineUntil ? 1 : 0;
  lineW += (lt - lineW) * ease(lt > lineW ? 2.0 : 1.2);

  // where the leader is headed: the cursor if it's around, else a wander
  let lead;
  if(m && now - mouse.lastMove < 3000){
    const l = Math.hypot(m[0], m[1]);
    lead = l > 1.5 ? [m[0]*1.5/l, m[1]*1.5/l] : [m[0], m[1]];
  } else {
    lead = [n1(500, t*0.35) * 2.6, n1(540, t*0.35) * 1.9];
  }

  // the round drifts gently after the cursor (never when broken —
  // solo dancers hold their own ground)
  const followed = m && now - mouse.lastMove < 2500 && broken < 0.5 && lineW < 0.5;
  let goal = [0, 0];
  if(followed){
    const l = Math.hypot(m[0], m[1]);
    goal = l > 0.55 ? [m[0]*0.55/l, m[1]*0.55/l] : [m[0], m[1]];
  }
  const follow = ease(1.4) * (1 - broken);
  center[0] += (goal[0] - center[0]) * follow;
  center[1] += (goal[1] - center[1]) * follow;

  // during a line dance the ring centre trails the troupe, so when
  // the line ends they reform the circle wherever they've wandered
  if(lineW > 0.01){
    let cx = 0, cz = 0;
    for(const s of anchors){ cx += s[0]; cz += s[1]; }
    cx /= DANCERS; cz /= DANCERS;
    const cl = Math.hypot(cx, cz);
    if(cl > 1.1){ cx *= 1.1/cl; cz *= 1.1/cl; }
    center[0] += (cx - center[0]) * ease(1.5) * lineW;
    center[1] += (cz - center[1]) * ease(1.5) * lineW;
  }

  // the circling: steady in the round, paused while broken
  ringA += dt * (0.22 + energy * 0.9) * (1 - broken * 0.92) * MOTION.circle;

  // integrate each dancer's personal beat — held: one shared tempo,
  // solo: everyone drifts to their own. Integration (not t×tempo)
  // is what keeps a tempo change from snapping the whole pose.
  for(let i = 0; i < DANCERS; i++){
    const tempo = 7 * (1 + broken * (0.35 + rnd(i, 20) * 0.5)) * (1 + 0.4*energy);
    phase[i] += tempo * dt * MOTION.tempo;
  }

  buildSkeleton(t, energy, broken, lineW, lead, m, dt);
  computeBounds();

  gl.uniform2f(uRes, W, H);
  gl.uniform1f(uTime, now * 0.001);
  gl.uniform2f(uCenter, center[0], center[1]);
  gl.uniform4fv(uSegA, segA);
  gl.uniform4fv(uSegB, segB);
  gl.uniform4fv(uBnd, bnd);
  gl.uniform1f(uK, FIGURE.blend * FIGURE.size);
  gl.uniform3f(uBg, bgLin[0], bgLin[1], bgLin[2]);
  gl.uniform3f(uBgTop, bgTopLin[0], bgTopLin[1], bgTopLin[2]);
  gl.uniform1f(uBgStop, bgStop);
  gl.uniform4fv(uEyes, eyes);
  gl.uniform1f(uEyeDark, EYES.dark);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
  raf = requestAnimationFrame(frame);
}
let raf = requestAnimationFrame(frame);



function destroy(){
  cancelAnimationFrame(raf);
  ro.disconnect();
  window.removeEventListener('resize', resize);
  ptr.removeEventListener('pointermove', trackPointer);
  ptr.removeEventListener('pointerdown', trackPointer);
  canvas.remove();
}
return { destroy, canvas, figure: FIGURE, motion: MOTION, setBackground: applyBg };
}
