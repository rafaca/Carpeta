/* ============================================================
   Bubble Dancers — embeddable build (colour-capable)
   Ported 2026-07-30 from the lab colour studio (figurecolors.html):
   figureColour {a,b,c} chrome gradient, edge-only softening
   {edge,amount,core}, transparent-canvas rendering over the host
   background. Choreography, ring and mount API preserved from the
   previous embed build.
   Usage:
     BubbleDancers.mount('#dancers', { background:'#E4FFFE',
       figure:{...}, motion:{...}, eyes:{...},
       figureColour:{a,b,c}, softening:{edge,amount,core},
       pointer:'window' });
   ============================================================ */
(function(global){
'use strict';
function mount(target, opts){
opts = opts || {};
const host = typeof target === 'string' ? document.querySelector(target) : target;
if(!host) throw new Error('BubbleDancers: container not found');
// ?dancers=0 skips the canvas entirely — for isolating whether a visual
// problem comes from this layer or from the page around it
try{
  if(new URLSearchParams(location.search).get('dancers') === '0'){
    return { destroy(){}, canvas:null, figure:{}, motion:{}, setBackground(){} };
  }
}catch(e){}

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

const BASE = 6;            // the round starts with six dancers
// each extra dancer costs ~25 fragment uniform vectors, so the
// multiplication ceiling comes from the GPU's uniform budget
const MAXD = (() => {
  try{
    const g = document.createElement('canvas').getContext('webgl');
    const cap = g ? g.getParameter(g.MAX_FRAGMENT_UNIFORM_VECTORS) : 224;
    return cap >= 348 ? 12 : cap >= 276 ? 9 : 6;
  }catch(e){ return 6; }
})();
let N = BASE;              // living count — splits raise it, calm merges settle it
const SPD = 9;             // segments per dancer: 2-piece spine + head + 2×2 arms + 2×1 legs
const SEGS = MAXD * SPD;
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
uniform vec4  uBnd[${MAXD}];  // per-dancer bounding sphere, xyz + radius
uniform float uK;                // goop: how eagerly limbs melt together
uniform vec3  uBg;               // background colour (linearised)
uniform vec4  uFaceA[${MAXD*3}]; // face feature: capsule start xyz + radius w
uniform vec4  uFaceB[${MAXD*3}]; // face feature: capsule end xyz + type w (0 eye, 1 mouth)
uniform float uEyeDark;          // how dark the face reads
uniform float uEyeBlur;          // feature edge: crisp -> frosted haze
uniform vec3  uTint[${MAXD}];    // per-dancer interior colour (linearised)
uniform float uTintAmt;          // 0 = droplet (ground colour) .. 1 = full tint
uniform float uEdge;             // edge softness — higher blurs the silhouette
uniform vec3  uColA;             // figure colour — deep tone
uniform vec3  uColB;             // figure colour — bright tone
uniform vec3  uColC;             // figure colour — highlight

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
  for(int j = 0; j < ${MAXD}; j++){
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
  vec2 e = vec2((0.0012 + t*0.0009) * (0.55 + 0.6*uEdge), 0.0);
  return normalize(vec3(
    map(p + e.xyy) - map(p - e.xyy),
    map(p + e.yxy) - map(p - e.yxy),
    map(p + e.yyx) - map(p - e.yyx)));
}

vec3 pal(float t){
  return 0.5 + 0.5*cos(6.28318*(t + vec3(0.0, 0.33, 0.67)));
}
// chrome iridescence between two editable tones + a highlight
vec3 chromePal(float t){
  float k = 0.5 + 0.5*cos(6.28318*t);
  vec3 c = mix(uColA, uColB, k);
  c = mix(c, uColC, smoothstep(0.7, 1.0, k) * 0.5);
  return c;
}

/* the stage floor: pool of light, contact shadows, fog to the sky.
   shAmt scales the contact shadows — the floor takes them fully,
   a drop's body only faintly (it shouldn't wear its own shadow) */
vec3 floorColor(vec3 p, float t, vec3 bg, float shAmt){
  vec3 fl = uBg * 0.86 + vec3(0.004);
  float dc = length(p.xz - uCenter);
  fl += (uBg * 0.05 + vec3(0.006, 0.006, 0.012)) * smoothstep(2.0, 0.3, dc);
  float sh = 1.0;
  for(int i = 0; i < ${MAXD}; i++){
    float R = uBnd[i].w;                        // the figure's own radius
    float hd = length(p.xz - uSegA[i*${SPD}].xz);
    // footprint AND darkness both shrink with the figure, so a small
    // droplet drops a small, faint shadow — not a fixed dark blob
    sh *= 1.0 - 0.15*clamp(R*2.2, 0.0, 1.0)*exp(-hd*hd*1.49/(R*R));
  }
  fl *= mix(1.0, sh, shAmt);
  return mix(fl, bg, smoothstep(2.5, 8.0, t));
}

/* nearest dancer's tint — the smooth-min union loses identity, so
   re-find the closest dancer at the shading point and read its colour */
vec3 figureTint(vec3 p){
  float best = 1e5; int bi = 0;
  for(int j = 0; j < ${MAXD}; j++){
    if(length(p - uBnd[j].xyz) - uBnd[j].w > best) continue;
    float dj = 1e5;
    for(int i = 0; i < ${SPD}; i++){
      dj = min(dj, sdRoundCone(p, uSegA[j*${SPD}+i].xyz, uSegB[j*${SPD}+i].xyz,
                               uSegA[j*${SPD}+i].w, uSegB[j*${SPD}+i].w));
    }
    if(dj < best){ best = dj; bi = j; }
  }
  vec3 c = uTint[0];
  for(int j = 0; j < ${MAXD}; j++){ if(j == bi) c = uTint[j]; }
  return c;
}

/* droplets: the body takes the colour of the ground beneath it —
   only the rim, a whisper of iridescence and the speculars reveal
   the form, like drops of the page itself */
vec3 shadeFigure(vec3 p, vec3 n, vec3 v, vec3 base){
  float ndv = clamp(dot(n, v), 0.0, 1.0);
  float fre = pow(1.0 - ndv, 2.4);

  // hue separates across the form (deep tone on one flank, bright on
  // the other) as the surface normal turns
  float ph = 0.05 + 0.85*(1.0 - ndv) + 0.55*n.y + 0.40*n.x + 0.04*uTime;
  vec3 irid = chromePal(ph);

  // deep saturated core, bright toward the viewer; a strong fresnel rim
  // carries the film to the silhouette like light wrapping wet metal
  vec3 body = irid * (0.12 + 1.25*ndv*ndv);
  body += irid * fre * 1.4;

  // sharp speculars — hot white, cool, warm — the wet-chrome highlights
  vec3 l1 = normalize(vec3( 0.50, 0.85, 0.55));
  vec3 l2 = normalize(vec3(-0.55, 0.15, 0.80));
  vec3 l3 = normalize(vec3( 0.15,-0.50, 0.85));
  body += vec3(1.00, 1.00, 1.00) * pow(max(dot(reflect(-l1, n), v), 0.0), 80.0) * 2.2;
  body += vec3(0.55, 0.75, 1.00) * pow(max(dot(reflect(-l2, n), v), 0.0), 38.0) * 1.2;
  body += vec3(1.00, 0.55, 0.85) * pow(max(dot(reflect(-l3, n), v), 0.0), 22.0) * 0.7;
  // eyes: two soft frosted dots on each face — they sit on the head
  // surface facing the dancer's way, so they only read when the
  // dancer faces you
  float eyeK = 1.0;
  float shine = 0.0;
  for(int e = 0; e < ${MAXD*3}; e++){
    vec3 a = uFaceA[e].xyz; float r = uFaceA[e].w;
    vec3 ba = uFaceB[e].xyz - a;
    vec3 pa = p - a;
    float h = clamp(dot(pa, ba)/max(dot(ba, ba), 1e-6), 0.0, 1.0);
    float d = length(pa - ba*h);
    float m = 1.0 - smoothstep(r*(1.0 - uEyeBlur), r*(1.0 + uEyeBlur), d);
    if(uFaceB[e].w > 0.5){
      // the mouth is a half-disc: flat top, round bottom — mid-song
      m *= smoothstep(r*0.18, -r*0.18, p.y - a.y);
    } else if(m > 0.001){
      // catchlight: a small bright dot high in each eye, offset to
      // one side of the view so it reads like the reference face
      vec3 axis = normalize(ba + vec3(0.0, 1e-4, 0.0));
      vec3 sidev = normalize(cross(axis, v));
      vec3 hl = a + ba*0.72 + sidev*(r*0.38);
      shine += (1.0 - smoothstep(r*0.20, r*0.48, length(p - hl))) * m;
    }
    eyeK *= 1.0 - uEyeDark*m;
  }
  body *= eyeK;
  body += vec3(0.85) * min(shine, 1.0) * uEyeDark * 0.6;
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

  // background: the chosen colour with a faint radial breath
  float vig = length(uv * vec2(0.85, 1.0));
  vec3 bg = uBg * (1.0 + 0.55*smoothstep(1.4, 0.0, vig)) * (1.0 - 0.45*smoothstep(0.5, 1.7, vig));
  vec3 col = vec3(0.0);
  float alpha = 0.0;

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
    vec3 body = shadeFigure(p, n, v, vec3(0.0));
    // the figure is opaque; the floor (dFig large) stays transparent so
    // the CSS vignette shows through — only the figure carries alpha.
    // feather the very silhouette (grazing rim) in the alpha channel so
    // the edge isn't a hard cut against the soft halo — interior stays
    // fully opaque, so this softens edges only, never the detail
    float ndv = clamp(dot(n, v), 0.0, 1.0);
    alpha = (1.0 - smoothstep(0.0, 0.05, dFig)) * (0.5 + 0.5 * smoothstep(0.0, 0.16, ndv));
    col = body;
  } else {
    // silhouette anti-aliasing: grazing rays get partial coverage, so
    // the transparent edge stays smooth
    float fw = tGlow * (2.8 * uEdge) / (uRes.y * ${FL.toFixed(2)});
    if(glow < fw && tGlow > 0.0){
      vec3 pe = ro + rd*tGlow;
      alpha = 1.0 - glow/fw;
      col = shadeFigure(pe, calcNormal(pe, tGlow), -rd, vec3(0.0));
    }
  }

  col = pow(col, vec3(0.4545)); // gamma
  // premultiplied output: colour scaled by its own coverage. The straight
  // (non-premultiplied) path is mis-composited by WebKit, which paints the
  // figures' wide low-alpha glow at full strength — a giant washed dome
  // over the page on iOS/iPadOS.
  gl_FragColor = vec4(col * alpha, alpha);
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
  size:    0.624,  // overall scale of the troupe
  head:    0.084,  // head radius
  neckLift:0.114,  // how far the head floats above the shoulders
  torso:   0.267,  // hip-to-shoulder length
  torsoR:  0.118,  // torso thickness
  hip:     0.309,  // hip height off the floor
  armR:    0.059,  // arm thickness
  armLen:  0.120,  // arm reach — how far hands stretch from the shoulders
  armH:    0.525,  // free-arm height — how high the hands ride (low = arms hang)
  hand:    0.048,  // hand thickness — the round tip at the end of the arm
  elbow:   0.581,  // how much the arms fold at the joint (0 = straight reach)
  legR:    0.063,  // leg thickness
  stance:  0.120,  // how far apart the feet stand
  handH:   0.503,  // height where neighbours' hands meet
  blend:   0.064,  // goop: how eagerly limbs melt together
  tint:    0.0,    // per-figure interior colour (0 = transparent drop, matches ground)
  edge:    2.679,    // edge softness — higher blurs the silhouette, less dither
};
const FIGURE_DEFAULTS = { ...FIGURE };

/* ---------- THE EYES — all factors of head size ---------- */
const EYES = {
  dark:    0.900, // how dark the dots read
  size:    0.188, // eye dot size
  blur:    0.050, // edge blur: low = crisp print, high = frosted haze
  stretch: 0.331, // eye elongation - 0 = round dot, 0.81 = the reference pill
  sep:     0.395, // eye distance apart
  up:      0.412, // eye height on the face
  mouth:   0.109, // mouth size (0 = no mouth)
  mouthUp: -0.115,// mouth height on the face
};
const EYES_DEFAULTS = { ...EYES };

/* ---------- THE DANCE — pace & choreography (also in the editor) */
const MOTION = {
  tempo:  1.003, // beat speed — steps, bobs, arm pumps
  circle: 2.335, // how fast the ring turns
  bounce: 1.374, // step bounce height
  jump:   0.766, // jump height
  sway:   0.528, // hips, spine, arms and kick looseness
  lines:  1.938, // how often they snake off in a follow-the-leader line
  roam:   1.949, // how far the whole round promenades about the floor
  multiply: 1.0, // how often a dancer splits in two (0 = never)
  artic:  0.0,   // articulation — limbs hit poses on the beat and hold (0 = liquid drift)
};
const MOTION_DEFAULTS = { ...MOTION };
const MPARAMS = [
  ['tempo',       'tempo',  0.2, 2.5],
  ['circling',    'circle', 0.0, 3.0],
  ['bounce',      'bounce', 0.0, 2.5],
  ['jump height', 'jump',   0.0, 2.5],
  ['sway',        'sway',   0.0, 2.5],
  ['line dances', 'lines',  0.0, 2.5],
  ['roaming',     'roam',   0.0, 3.0],
  ['multiplying', 'multiply', 0.0, 2.5],
  ['articulation','artic',   0.0, 2.5],
];

const EPARAMS = [
  ['darkness',     'dark',    0.0,  0.9],
  ['size',         'size',    0.06, 0.45],
  ['blur',         'blur',    0.05, 1.5],
  ['stretch',      'stretch', 0.0,  2.0],
  ['separation',   'sep',     0.15, 1.1],
  ['height',       'up',     -0.35, 0.55],
  ['mouth size',   'mouth',   0.0,  0.35],
  ['mouth height', 'mouthUp',-0.55, 0.15],
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
  ['arm length',      'armLen',   0.10,  1.20],
  ['hand size',       'hand',     0.02,  0.14],
  ['arm height',      'armH',     0.05,  1.30],
  ['elbow bend',      'elbow',    0.0,   1.0],
  ['leg thickness',   'legR',     0.022, 0.10],
  ['stance width',    'stance',   0.03, 0.20],
  ['hand height',     'handH',    0.38, 0.80],
  ['goopiness',       'blend',    0.02, 0.12],
  ['edge softness',   'edge',     0.5,  3.5],
];

/* ---------- WebGL plumbing ---------- */
const edgeCanvas = document.createElement('canvas');
edgeCanvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none';
host.appendChild(edgeCanvas);
const canvas = document.createElement('canvas');
canvas.style.cssText = 'position:relative;display:block;width:100%;height:100%';
host.appendChild(canvas);
// premultipliedAlpha stays at its default (true) — see the shader's final
// line; the straight-alpha path is the one WebKit gets wrong
const gl = canvas.getContext('webgl', { preserveDrawingBuffer:true, alpha:true, antialias:false, depth:false, stencil:false });
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
const uBg = U('uBg'), uFaceA = U('uFaceA'), uFaceB = U('uFaceB'), uEyeDark = U('uEyeDark');
const uEyeBlur = U('uEyeBlur');
const uTint = U('uTint'), uTintAmt = U('uTintAmt'), uEdge = U('uEdge');
const uColA = U('uColA'), uColB = U('uColB'), uColC = U('uColC');
// each dancer a soft pastel of its own — golden-angle hue spacing, low
// saturation so they still read as translucent drops; linearised to
// match uBg (the shader gammas at the end)
const TINTS = (function(){
  const out = new Float32Array(MAXD * 3);
  const hsl = function(h, s, l){
    const a = s * Math.min(l, 1 - l);
    const f = function(n){ const k = (n + h*12) % 12; return l - a * Math.max(-1, Math.min(Math.min(k-3, 9-k), 1)); };
    return [f(0), f(8), f(4)];
  };
  for(let j = 0; j < MAXD; j++){
    const u = (j * 0.618034) % 1;                     // spread, non-adjacent
    const h = 0.15 + u * (0.38 - 0.15);               // yellow -> green ONLY
    const l = 0.62 + 0.13 * ((j * 0.618034 * 2.3) % 1); // vary the shade per figure
    const rgb = hsl(h, 0.55, l);
    out[j*3]   = Math.pow(rgb[0], 2.2);
    out[j*3+1] = Math.pow(rgb[1], 2.2);
    out[j*3+2] = Math.pow(rgb[2], 2.2);
  }
  return out;
})();

/* ---------- background colour ---------- */
const BG_DEFAULT = '#E4FFFE';
let bgHex = BG_DEFAULT;
let bgLin = [0, 0, 0], bgStop = 0.61;
const linHex = hex => {
  const r = parseInt(hex.slice(1,3), 16) / 255;
  const g = parseInt(hex.slice(3,5), 16) / 255;
  const b = parseInt(hex.slice(5,7), 16) / 255;
  return [Math.pow(r, 2.2), Math.pow(g, 2.2), Math.pow(b, 2.2)];
};
function applyBg(hex, topHex, stop){
  bgHex = hex;
  bgLin = linHex(hex);
  bgStop = stop == null ? (topHex ? 0.61 : 1.0) : stop;
  host.style.background = topHex
    ? `linear-gradient(180deg, ${topHex} 0%, ${hex} ${Math.round(bgStop*100)}%)`
    : hex;
}

/* ---------- figure colours (editable) ---------- */
const FIGCOL = { a:'#5960f9', b:'#f160e7', c:'#ffc0f5' };  // deep / bright / highlight (the original chrome)
const FIGCOL_DEFAULTS = { ...FIGCOL };
let colALin=[0,0,0], colBLin=[0,0,0], colCLin=[0,0,0];
function _hexLin(hex){
  const r=parseInt(hex.slice(1,3),16)/255, g=parseInt(hex.slice(3,5),16)/255, b=parseInt(hex.slice(5,7),16)/255;
  return [Math.pow(r,2.2), Math.pow(g,2.2), Math.pow(b,2.2)];
}
function applyFigCol(){ colALin=_hexLin(FIGCOL.a); colBLin=_hexLin(FIGCOL.b); colCLin=_hexLin(FIGCOL.c); }
applyFigCol();

/* ---------- softening: an EDGE-ONLY blur ----------
   The figure renders on a transparent background; a blurred copy of it
   sits BEHIND the sharp one, so the crisp interior covers itself and
   only the silhouette gets a soft, colour-matched halo. 'core blur'
   optionally softens the whole figure too. */
const SOFT_DEFAULT = { edge:3.0, amount:0.9, core:0.0 };
const SOFT = { ...SOFT_DEFAULT };
const edgeCtx = edgeCanvas.getContext('2d');
// Blur inside the canvas raster, never with a CSS filter on the element:
// iOS/iPadOS composites a filtered full-screen layer at a low raster
// scale and stretches it, which turned the halo into a giant pixelated
// dome over the page. ctx.filter keeps it in our own pixels.
// Diagnostics/escape hatches, settable per-visit:
//   ?soft=0  halo off      ?soft=1  halo on (even on iOS)
// iOS/iPadOS WebKit has repeatedly mis-composited this overlay (a giant
// blurred "glare" over the page), so it is off there by default until
// the cause is pinned down on a real device.
const Q = (function(){ try{ return new URLSearchParams(location.search); }catch(e){ return null; } })();
const qSoft = Q && Q.get('soft');
const IS_APPLE_TOUCH = (function(){
  try{
    const ua = navigator.userAgent || '';
    return /iPad|iPhone|iPod/.test(ua) ||
           (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);   // iPadOS desktop-mode
  }catch(e){ return false; }
})();
const SOFT_ALLOWED = qSoft === '1' ? true : (qSoft === '0' ? false : !IS_APPLE_TOUCH);
const CAN_BLUR = SOFT_ALLOWED && (function(){
  try{
    // an unsupported property reads back undefined — `!== 'none'` alone
    // would call that success and silently draw an unblurred duplicate
    if(typeof edgeCtx.filter !== 'string') return false;
    edgeCtx.filter = 'blur(1px)';
    const ok = edgeCtx.filter !== 'none';
    edgeCtx.filter = 'none';
    return ok;
  }catch(e){ return false; }
})();
function applySoften(){
  edgeCanvas.style.opacity = CAN_BLUR ? SOFT.amount : 0;
  canvas.style.filter = SOFT.core>0 ? 'blur('+SOFT.core.toFixed(2)+'px)' : 'none';
}
function drawEdge(){
  if(!CAN_BLUR || !(SOFT.amount>0.001 && SOFT.edge>0.001)) return;
  // the overlay shares the GL buffer's dimensions (set in resize), so the
  // copy is 1:1 — no scaling maths that can drift out of sync
  edgeCtx.clearRect(0, 0, edgeCanvas.width, edgeCanvas.height);
  edgeCtx.filter = 'blur(' + (SOFT.edge * renderScale).toFixed(2) + 'px)';
  try{ edgeCtx.drawImage(canvas, 0, 0); }catch(e){}
  edgeCtx.filter = 'none';
}
applySoften();

/* ---------- mount options ---------- */
if(opts.figure) Object.assign(FIGURE, opts.figure);
if(opts.motion) Object.assign(MOTION, opts.motion);
if(opts.eyes) Object.assign(EYES, opts.eyes);
if(opts.figureColour) Object.assign(FIGCOL, opts.figureColour);
if(opts.softening) Object.assign(SOFT, opts.softening);
applyFigCol();
applySoften();
applyBg(opts.background || BG_DEFAULT, opts.backgroundTop, opts.backgroundStop);

// full resolution (up to 1.5x on retina) — bounding spheres in the
// shader keep the per-pixel cost down, and edges stay crisp
const BASE_SCALE = Math.min(window.devicePixelRatio || 1, 1);
const MIN_SCALE = 0.55;
let renderScale = BASE_SCALE;      // adaptive — drops when frames run slow
let frameEMA = 16.7, framesSinceScale = 0;
let W, H;
function resize(){
  W = canvas.width = Math.max(1, Math.round(host.clientWidth * renderScale));
  H = canvas.height = Math.max(1, Math.round(host.clientHeight * renderScale));
  // keep the softening overlay on exactly the same pixel grid
  if(edgeCanvas.width !== W) edgeCanvas.width = W;
  if(edgeCanvas.height !== H) edgeCanvas.height = H;
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
  // every cursor position resolves to a floor point — sky-ward rays
  // are bent to a shallow grazing angle so hovering the top of the
  // page still leads the troupe in that direction
  const t = -RO[1] / Math.min(rd[1], -0.05);
  return [RO[0] + rd[0]*t, RO[2] + rd[2]*t];
}

const mouse = { x: -1e4, y: -1e4, lastMove: -1e9 };
let px = 0, py = 0;
let center = [0, 0];    // where the troupe gathers
let energy = 0;         // cursor speed → wilder moves
let broken = 0;         // 0 = hands held, 1 = circle broken, all solo
let lastTouch = -1e9;
const bornAt = performance.now();
const INTRO_MS = 5000;               // ~5s of freestyle before they hold hands
let ringA = 0;          // the circling
let last = performance.now();
const anchors = Array.from({length: BASE}, () => [0, 0]); // last frame's feet spots
const phase = Array.from({length: BASE}, () => 0);   // personal beats — splice-able, the troupe grows
const spots = Array.from({length: BASE}, () => null);     // eased floor positions
const faceAng = Array.from({length: BASE}, () => null);   // eased facing angles
let nextSplitAt = 0;           // when a dancer next splits in two
let nextMergeAt = 0;           // when a calm round next absorbs an extra
let mergeI = -1;               // dancer currently melting into its neighbour
let jumpClock = 0;             // shared beat: broken dancers jump in unison
let faceIn = 0;                // 0 = ring faces outward, 1 = they face each other
let faceInTarget = 0;
let nextFaceFlip = 12000;      // when the ring next turns in (or out)
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
const bnd  = new Float32Array(MAXD * 4);
const faceA = new Float32Array(MAXD * 3 * 4);
const faceB = new Float32Array(MAXD * 3 * 4);

// per-dancer bounding sphere over all 20 capsule endpoints,
// padded by the fattest radius + the smooth-min blend reach
function computeBounds(){
  for(let j = 0; j < N; j++){
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
  // slots beyond the living count are parked far away — the shader
  // still loops over them, but they can't touch the picture
  for(let j = N; j < MAXD; j++){
    for(let i = 0; i < SPD; i++){
      segA.set([999, -999, 999, 0.001], (j*SPD + i) * 4);
      segB.set([999, -999, 999, 0.001], (j*SPD + i) * 4);
    }
    for(let f = 0; f < 3; f++){
      faceA.set([999, -999, 999, 0.001], (j*3 + f) * 4);
      faceB.set([999, -999, 999, 1], (j*3 + f) * 4);
    }
    bnd.set([999, -999, 999, 0.001], j * 4);
  }
}

function buildSkeleton(t, wild, brk, lnW, lead, m, dt, fIn){
  const step = TAU / N;
  anchors.length = N;
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
  // while chasing the cursor they shrink to about two-thirds size —
  // everything (body, amplitudes, spacing) scales through S
  const S = FIGURE.size * (1 - 0.34 * lnW);
  const F = {};
  for(const k in FIGURE) F[k] = k === 'size' ? S : FIGURE[k] * S;
  const RRs = RR * S * Math.sqrt(N / BASE); // the round widens as it multiplies
  // longer arms bow the held hands outward, shorter arms pull the
  // grip in tight — so arm length reads in the ring pose too
  const heldR = RRs + (0.06 + (F.armLen - 0.245*S) * 0.8);
  const held = [];
  for(let i = 0; i < N; i++){
    const a = ringA + (i + 0.5) * step;
    held.push([
      center[0] + heldR * Math.cos(a) + n1(i*3+1, t) * (0.05 + 0.2*wild) * S,
      F.handH + rnd(i, 1) * 0.06 * S + n1(i*3+41, t) * (0.06 + 0.25*wild) * S,
      center[1] + heldR * Math.sin(a) + n1(i*3+81, t) * (0.05 + 0.2*wild) * S
    ]);
  }

  for(let i = 0; i < N; i++){
    const a = ringA + i * step;

    // spot on the ring vs. their own solo spot: scattered outward,
    // wandering, and shooed along if the cursor chases them
    const ringSpot = [center[0] + RRs*Math.cos(a), center[1] + RRs*Math.sin(a)];
    // roaming widens the freestyle scatter too — broken dancers
    // range across the floor instead of hovering near their spot
    const scat = (0.7 + 0.55 * MOTION.roam) * S;
    let solo = [
      ringSpot[0] + Math.cos(a)*0.22*S + n1(i*9+3, t*0.45)*scat,
      ringSpot[1] + Math.sin(a)*0.22*S + n1(i*9+53, t*0.45)*scat];
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
    // a merging dancer walks onto its neighbour and melts in
    if(i === mergeI){
      const tgt = spots[(i + 1) % N];
      if(tgt) spotT = [tgt[0], tgt[1]];
    }

    // ease toward the target spot — repulsion pushes, mode blends and
    // the chasing line all arrive as smooth steps, not snaps
    if(!spots[i]) spots[i] = spotT.slice();
    const headX = spotT[0] - spots[i][0], headZ = spotT[1] - spots[i][1];
    const se = 1 - Math.exp(-dt * (i === mergeI ? 9 : 5));
    spots[i][0] += headX * se;
    spots[i][1] += headZ * se;
    anchors[i] = spots[i];
    const ax = spots[i][0], az = spots[i][1];

    // free dancers (solo or in the line) move loosely; the held ring
    // keeps everything measured
    const loose = Math.max(brk, 0.75 * lnW);

    // facing: outward in the ring, wherever the groove goes when solo,
    // direction of travel in the line — always eased, never snapped
    let faceGoal = a + Math.PI * fIn + brk * n1(i*4+7, t*0.25) * 3.0;
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

    // ─── articulation: moves land ON the beat, then hold ───
    // A pose-clock advances in a quick burst (first ~40% of each
    // half-beat) and dwells for the rest. Limbs whose noise is
    // sampled on this clock move in deliberate, jointed bursts and
    // freeze into little poses between them, while the body keeps
    // its continuous liquid sway. artic = 0 reproduces the old
    // continuous drift exactly.
    const artic = MOTION.artic || 0;
    const beats = phase[i] * 0.5;
    const bi0 = Math.floor(beats), bf0 = beats - bi0;
    const aq = Math.min(1, bf0 / 0.38);
    const poseT = beats > 0.001 ? t * ((bi0 + aq*aq*(3 - 2*aq)) / beats) : t;
    const aW = Math.min(1, artic * (0.45 + 0.3 * loose));
    const tA = t + (poseT - t) * aW;   // articulated noise clock
    const hit = Math.pow(Math.max(0, Math.sin(phase[i] * 0.5)), 3);   // beat accent
    // weight transfer: hips settle over the planted foot each step
    const wShift = -Math.sin(phase[i]) * 0.024 * artic * S * (0.5 + 0.5*loose);

    // phase[i] is integrated in the frame loop, so tempo changes
    // (breaking away, cursor energy) never snap the limbs
    const bob = Math.abs(Math.sin(phase[i])) * (0.02 + 0.05*wild + 0.06*loose)
              * MOTION.bounce * S;
    // real jumps: whole body leaves the floor, biggest when free.
    // In the ring everyone hops to their own beat; broken away they
    // all jump AT THE SAME TIME on one shared oscillation
    const jSin = Math.sin(phase[i]*0.45 + i*2.1) * (1 - brk)
               + Math.sin(jumpClock*0.45) * brk;
    const jump = Math.pow(Math.max(0, jSin), 3.0)
               * (0.05*wild + 0.17*loose) * MOTION.jump * S;
    const swayT = n1(i*5+2, t) * (0.08 + 0.25*wild + 0.15*loose) * MOTION.sway * S;
    const leanO = n1(i*5+62, t) * (0.05 + 0.18*wild + 0.12*loose) * MOTION.sway * S;

    const floatY = Math.sin(t*0.8 + i*1.7) * 0.05 * S;   // gentle hover — the whole figure drifts up and down
    const hip  = [ax + T[0]*(swayT + wShift), F.hip + bob + jump + floatY + rnd(i,4)*0.02*S, az + T[2]*(swayT + wShift)];
    const neck = [hip[0] + T[0]*swayT*0.8 + O[0]*leanO,
                  hip[1] + F.torso,
                  hip[2] + T[2]*swayT*0.8 + O[2]*leanO];
    const head = [neck[0] + O[0]*leanO*0.7, neck[1] + F.neckLift - hit*0.014*artic*S, neck[2] + O[2]*leanO*0.7];

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
    const eUp = F.head * EYES.up, eR = F.head * Math.max(EYES.size, 0.02);
    const eHalf = eR * EYES.stretch;  // capsule half-length — tall pill eyes
    for(const sd of [-1, 1]){
      const k = (i*3 + (sd > 0 ? 1 : 0)) * 4;
      const cx = head[0] + O[0]*eFwd + T[0]*sd*eSep,
            cy = head[1] + eUp,
            cz = head[2] + O[2]*eFwd + T[2]*sd*eSep;
      faceA.set([cx, cy - eHalf, cz, eR], k);
      faceB.set([cx, cy + eHalf, cz, 0], k);
    }
    if(EYES.mouth > 0.02){
      const k = (i*3 + 2) * 4;
      const mx = head[0] + O[0]*eFwd,
            my = head[1] + F.head * EYES.mouthUp,
            mz = head[2] + O[2]*eFwd;
      faceA.set([mx, my, mz, F.head * EYES.mouth], k);
      faceB.set([mx, my, mz, 1], k);
    } else {
      faceA.set([0, -99, 0, 0.001], (i*3 + 2) * 4); // parked far under the floor
      faceB.set([0, -99, 0, 1], (i*3 + 2) * 4);
    }

    // arms: in the round they reach to the shared held hands;
    // solo they pump and wave to their own beat
    // shoulders sit out at the sides of the torso (not on the centre
    // spine) so a raised upper arm clears the head instead of welding
    // into it through the smooth-min goop
    const shoulderMid = lerp3(hip, neck, 0.82);
    const armPairs = [[held[i], 1], [held[(i + N - 1) % N], -1]];
    for(const [heldHand, side] of armPairs){
      const shoulder = [
        shoulderMid[0] + T[0]*side*F.torsoR*0.95,
        shoulderMid[1],
        shoulderMid[2] + T[2]*side*F.torsoR*0.95];
      const wave = face + side * (1.3 + n1(i*6 + side*3 + 30, tA) * 1.2 * MOTION.sway);
      const raise = F.armH + 0.08 * Math.max(0, Math.sin(phase[i]*0.5 + side*1.8)) * S;  // arm height ~ the slider, whisper of drift
      // free hands reach to ~80% of the arm's length, so the arm
      // always has slack to fold at the elbow
      const free = [
        shoulder[0] + Math.cos(wave) * F.armLen * 0.8,
        raise,
        shoulder[2] + Math.sin(wave) * F.armLen * 0.8];
      const hand = lerp3(heldHand, free, Math.max(brk, lnW));
      const mid = lerp3(shoulder, hand, 0.5);
      // elbows bend in a direction that keeps wandering — a mix of
      // droop and sideways flex, so arms curve organically
      // REAL elbows: upper arm and forearm are each ~half the reach,
      // so whatever chord the hand demands, the joint pokes out by
      // the two-bone triangle's height — arms visibly FOLD instead
      // of curving. The fold direction keeps wandering (droop +
      // sideways flex) and snaps on the beat when articulated.
      const cd = Math.hypot(hand[0]-shoulder[0], hand[1]-shoulder[1], hand[2]-shoulder[2]);
      // bones adapt when the chord overstretches (held hands in the
      // ring pull further than the arm's rest length) so the joint
      // never collapses flat — a modest bend in the round, a full
      // fold when the arms are free
      const half = Math.max(F.armLen * 0.56, cd * 0.55);
      const hMax = Math.sqrt(Math.max(0, half*half - cd*cd*0.25));
      const adx = hand[0]-shoulder[0], adz = hand[2]-shoulder[2];
      const adl = Math.hypot(adx, adz) || 1;
      let p1 = [-adz/adl, 0, adx/adl];         // horizontal perp to the arm
      // keep the elbow on the OUTSIDE: align p1 with this arm's side so
      // the forearm fans away from the head/torso, never folds across it
      if(p1[0]*T[0]*side + p1[2]*T[2]*side < 0){ p1 = [-p1[0], 0, -p1[2]]; }
      const bendA = n1(i*6 + side*4 + 70, tA*0.9) * 1.6;
      // beat accent: elbows snap into their bend on the hit, per arm
      const hitS = Math.pow(Math.max(0, Math.sin(phase[i]*0.5 + side*1.57)), 3);
      const bend = hMax * Math.min(1, (0.4 + 0.6 * F.elbow / Math.max(S, 1e-6)) * (1 + 0.5 * artic * hitS));
      const swing = Math.abs(Math.sin(bendA));         // fan out, then droop
      const elbow = [
        mid[0] + p1[0]*swing*bend,
        mid[1] - Math.abs(Math.cos(bendA))*bend*0.9,   // elbows mostly droop
        mid[2] + p1[2]*swing*bend];
      // taper the whole arm — thick where it meets the shoulder, slimming
      // to the wrist — so it reads as a fleshy limb, not a uniform tube
      seg(shoulder, elbow, F.armR*1.4, F.armR*0.9);
      seg(elbow, hand, F.armR*0.9, F.hand); // slims into the rounded hand
    }

    // legs: alternate stepping; solo kicks fly higher and wider,
    // and both feet leave the floor during a jump
    for(const side of [-1, 1]){
      const beat = phase[i] + (side > 0 ? 0 : Math.PI);
      const lift = Math.max(0, Math.sin(beat)) * (0.04 + 0.14*wild + 0.14*loose)
                 * MOTION.bounce * S + jump * 0.85;
      const kickO = n1(i*7 + side*2 + 20, tA) * (0.04 + 0.3*wild + 0.3*loose) * MOTION.sway * S;
      // the rounded foot end RESTS on the floor instead of sinking
      // into it — a buried tip read as a thin stem in a wide puddle
      const foot = [
        ax + T[0]*(side*F.stance + swayT*0.5) + O[0]*kickO,
        lift + F.legR*0.82 + floatY,   // feet rise with the body, so it floats as one
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
  const rawDt = Math.max((now - last) / 1000, 1e-3);
  const dt = Math.min(rawDt, 0.05);

  // adaptive resolution: trade a little sharpness for a steady frame
  // rate so the motion never stutters. A slow running-average frame
  // time drops the render scale; ample headroom restores it up to the
  // display's native cap. Proportions never change — only the
  // raymarch's per-pixel resolution.
  frameEMA += (rawDt*1000 - frameEMA) * 0.1;
  if(++framesSinceScale > 45){
    if(frameEMA > 26 && renderScale > MIN_SCALE){
      renderScale = Math.max(MIN_SCALE, renderScale * 0.85); resize(); framesSinceScale = 0;
    }else if(frameEMA < 15 && renderScale < BASE_SCALE){
      renderScale = Math.min(BASE_SCALE, renderScale * 1.07); resize(); framesSinceScale = 0;
    }
  }
  last = now;

  // time-based easing so behaviour is identical at any frame rate
  const ease = rate => 1 - Math.exp(-dt * rate);

  // energy: rises fast with cursor speed, decays slowly
  // real elapsed time, not the clamped dt — otherwise slow frames
  // inflate cursor speed and false-trigger the freestyle break
  const speed = Math.hypot(mouse.x - px, mouse.y - py) / rawDt;
  px = mouse.x; py = mouse.y;
  const target = Math.min(speed / 1500, 1);
  energy += (target - energy) * ease(target > energy ? 4.5 : 1.4);

  // SUSTAINED fast shaking breaks the troupe into freestyle —
  // smoothed energy, so an ordinary quick reposition doesn't trip it
  if(energy > 0.7) lastTouch = now;

  const t = now * 0.0007;

  // is the cursor touching the troupe? (near the band, or a dancer)
  const m = mouseToFloor(mouse.x, mouse.y);
  let touching = false;
  if(m){
    const dBand = Math.abs(Math.hypot(m[0]-center[0], m[1]-center[1]) - RR*FIGURE.size*Math.sqrt(N/BASE));
    const nearDancer = anchors.some(s => Math.hypot(m[0]-s[0], m[1]-s[1]) < 0.30);
    touching = dBand < 0.22 || nearDancer;
  }
  // touching breaks the ring — but not while they're deliberately
  // chasing the cursor in a line; proximity is the point there
  if(touching && now - mouse.lastMove < 100 && lineW < 0.3) lastTouch = now;

  // broken: they open the page dancing solo, gather into the ring,
  // snap open again on touch and mend slowly once left alone
  const intro = now - bornAt < INTRO_MS;
  const bt = (intro || now - lastTouch < 3000) ? 1 : 0;
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
  if(m && now - mouse.lastMove < 3500 && broken < 0.25 && energy < 0.68
     && (lineW > 0.3 || !touching)){
    if(!beckonSince) beckonSince = now;
    if(now - beckonSince > 150) lineUntil = Math.max(lineUntil, now + 3800);
  } else {
    beckonSince = 0;
  }
  if(broken > 0.5) lineUntil = 0; // breaking the ring trumps the line
  const lt = now < lineUntil ? 1 : 0;
  lineW += (lt - lineW) * ease(lt > lineW ? 2.0 : 1.2);

  // the round dance alternates: sometimes they face each other,
  // sometimes they turn outward — flipping on a lazy, uneven clock
  if(now > nextFaceFlip && broken < 0.3){
    faceInTarget = 1 - faceInTarget;
    nextFaceFlip = now + 8000 + Math.random() * 9000;
  }
  faceIn += (faceInTarget - faceIn) * ease(1.1);

  // where the leader is headed: the cursor if it's around, else a wander
  let lead;
  if(m && now - mouse.lastMove < 3800){
    const l = Math.hypot(m[0], m[1]);
    lead = l > 1.5 ? [m[0]*1.5/l, m[1]*1.5/l] : [m[0], m[1]];
  } else {
    lead = [n1(500, t*0.35) * 2.6, n1(540, t*0.35) * 1.9];
  }

  // the round drifts gently after the cursor (never when broken —
  // solo dancers hold their own ground). Left alone, the whole
  // troupe promenades slowly about the floor instead of holding
  // the centre of the stage
  const followed = m && now - mouse.lastMove < 3500 && broken < 0.5;
  let goal = [n1(620, t*0.20) * 2.3 * MOTION.roam,
              n1(660, t*0.16) * 1.5 * MOTION.roam];
  if(followed){
    const l = Math.hypot(m[0], m[1]);
    goal = l > 0.78 ? [m[0]*0.78/l, m[1]*0.78/l] : [m[0], m[1]];
  }
  const follow = ease(2.3) * (1 - broken);
  center[0] += (goal[0] - center[0]) * follow;
  center[1] += (goal[1] - center[1]) * follow;

  // during a line dance the ring centre trails the troupe, so when
  // the line ends they reform the circle wherever they've wandered
  if(lineW > 0.01){
    let cx = 0, cz = 0;
    for(const s of anchors){ cx += s[0]; cz += s[1]; }
    cx /= N; cz /= N;
    const cl = Math.hypot(cx, cz);
    if(cl > 1.1){ cx *= 1.1/cl; cz *= 1.1/cl; }
    center[0] += (cx - center[0]) * ease(1.5) * lineW;
    center[1] += (cz - center[1]) * ease(1.5) * lineW;
  }

  // the circling: steady in the round, paused while broken
  ringA += dt * (0.22 + energy * 0.9) * (1 - broken * 0.92) * MOTION.circle;

  // multiplication: at any moment a dancer can split in two — the
  // newborn slides out of its parent's droplet and the round widens
  if(!nextSplitAt) nextSplitAt = now + 9000;
  if(MOTION.multiply > 0.02 && now > nextSplitAt){
    nextSplitAt = now + (12000 + Math.random() * 20000) / MOTION.multiply;
    if(N < MAXD){
      const pi = Math.floor(Math.random() * N);
      phase.splice(pi + 1, 0, phase[pi] + 0.4);
      spots.splice(pi + 1, 0, spots[pi] ? [spots[pi][0] + 0.02, spots[pi][1]] : null);
      faceAng.splice(pi + 1, 0, faceAng[pi]);
      N++;
    }
  }
  // and back down: past the base six, a calm round now and then lets
  // one dancer melt into its neighbour
  if(mergeI < 0 && N > BASE && broken < 0.3 && lineW < 0.3 && now > nextMergeAt){
    if(!nextMergeAt){ nextMergeAt = now + 14000; }
    else mergeI = Math.floor(Math.random() * N);
  }
  if(mergeI >= 0){
    const a = spots[mergeI], b = spots[(mergeI + 1) % N];
    if(broken > 0.5 || lineW > 0.5){
      mergeI = -1; nextMergeAt = now + 9000;   // scattered — call it off
    } else if(a && b && Math.hypot(a[0]-b[0], a[1]-b[1]) < 0.18 * FIGURE.size){
      phase.splice(mergeI, 1); spots.splice(mergeI, 1); faceAng.splice(mergeI, 1);
      N--; mergeI = -1;
      nextMergeAt = now + 16000 + Math.random() * 14000;
    }
  }

  // integrate each dancer's personal beat — held: one shared tempo,
  // solo: everyone drifts to their own. Integration (not t×tempo)
  // is what keeps a tempo change from snapping the whole pose.
  for(let i = 0; i < N; i++){
    const tempo = 7 * (1 + broken * (0.35 + rnd(i, 20) * 0.5)) * (1 + 0.4*energy);
    phase[i] += tempo * dt * MOTION.tempo;
  }
  jumpClock += 7 * (1 + 0.4*energy) * dt * MOTION.tempo;

  buildSkeleton(t, energy, broken, lineW, lead, m, dt, faceIn);
  computeBounds();

  gl.uniform2f(uRes, W, H);
  gl.uniform1f(uTime, now * 0.001);
  gl.uniform2f(uCenter, center[0], center[1]);
  gl.uniform4fv(uSegA, segA);
  gl.uniform4fv(uSegB, segB);
  gl.uniform4fv(uBnd, bnd);
  gl.uniform1f(uK, FIGURE.blend * FIGURE.size);
  gl.uniform3f(uBg, bgLin[0], bgLin[1], bgLin[2]);
  gl.uniform4fv(uFaceA, faceA);
  gl.uniform4fv(uFaceB, faceB);
  gl.uniform1f(uEyeDark, EYES.dark);
  gl.uniform1f(uEyeBlur, EYES.blur);
  gl.uniform3fv(uTint, TINTS);
  gl.uniform1f(uTintAmt, FIGURE.tint);
  gl.uniform1f(uEdge, FIGURE.edge);
  gl.uniform3f(uColA, colALin[0], colALin[1], colALin[2]);
  gl.uniform3f(uColB, colBLin[0], colBLin[1], colBLin[2]);
  gl.uniform3f(uColC, colCLin[0], colCLin[1], colCLin[2]);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
  drawEdge();
  raf = requestAnimationFrame(frame);
}
let raf = requestAnimationFrame(frame);

function destroy(){
  cancelAnimationFrame(raf);
  ro.disconnect();
  window.removeEventListener('resize', resize);
  ptr.removeEventListener('pointermove', trackPointer);
  ptr.removeEventListener('pointerdown', trackPointer);
  edgeCanvas.remove();
  canvas.remove();
}
return { destroy, canvas, figure: FIGURE, motion: MOTION,
         figureColour: FIGCOL, softening: SOFT, setBackground: applyBg };


}
global.BubbleDancers = { mount };
})(typeof window !== 'undefined' ? window : this);
