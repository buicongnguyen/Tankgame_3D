// The command-screen cover: a space sky over the Meridian system, painted once with Canvas 2D.
// Nebula, stars, a ringed gas giant, moons, a burning world and the planet horizon the tank stands on
// are painted to a canvas at screen size, saved as an image URL in the CSS variable --cover-sky, and
// repainted only when the screen shape changes. Animated details (twinkle, tracers, flashes, the
// orbit around the tank) are cheap CSS layers in cover.css. No WebGL work, no per-frame drawing.

type Rand = () => number;
function seeded(seed: number): Rand {
  let s = seed >>> 0;
  return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

interface Layout { sun: [number, number]; giant: [number, number, number]; moon: [number, number, number]; red: [number, number, number]; ground: [number, number, number]; fleet: [number, number]; }

/** Where the bodies sit, as fractions of the screen; the tank and title stay readable in both shapes. */
function layout(w: number, h: number): Layout {
  const s = Math.min(w, h);
  if (h > w * 1.15) {
    // Portrait phone: title top left, tank top right, mission card in the lower half.
    return { sun: [.1 * w, .02 * h], giant: [.84 * w, .17 * h, .24 * w], moon: [.5 * w, .07 * h, .045 * w], red: [.18 * w, .33 * h, .05 * w], ground: [.45 * w, .4 * h + 1.5 * w, 1.5 * w], fleet: [.55 * w, .3 * h] };
  }
  // Landscape: title left, tank centre-left on the horizon, mission card right.
  return { sun: [.3 * w, -.08 * h], giant: [.6 * w, .27 * h, .16 * s], moon: [.43 * w, .1 * h, .03 * s], red: [.27 * w, .07 * h, .022 * s], ground: [.3 * w, .72 * h + 1.15 * w, 1.15 * w], fleet: [.47 * w, .36 * h] };
}

function glow(c: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, alpha: number) {
  const g = c.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color); g.addColorStop(1, 'transparent');
  c.globalAlpha = alpha; c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2); c.globalAlpha = 1;
}

function nebula(c: CanvasRenderingContext2D, w: number, h: number, r: Rand) {
  c.globalCompositeOperation = 'lighter';
  // A diagonal band of gas from the lower left to the upper right, magenta and violet with a teal edge.
  const colors = ['#d0177f', '#7a2bf0', '#ff5a2a', '#13b9d6', '#a51fd0', '#ff3d6e'];
  for (let i = 0; i < 70; i++) {
    const t = r(), x = (t * 1.1 - .05) * w + (r() - .5) * .25 * w, y = (1 - t) * .75 * h + (r() - .5) * .3 * h;
    glow(c, x, y, (.08 + r() * .22) * Math.max(w, h), colors[i % colors.length], .035 + r() * .05);
  }
  c.globalCompositeOperation = 'source-over';
  // Dark dust lanes give the gas shape.
  for (let i = 0; i < 26; i++) { const t = r(); glow(c, t * w, (1 - t) * .7 * h + (r() - .5) * .2 * h, (.05 + r() * .12) * Math.max(w, h), '#02030a', .35); }
}

function stars(c: CanvasRenderingContext2D, w: number, h: number, r: Rand, k: number) {
  const count = Math.round(w * h / 1400);
  for (let i = 0; i < count; i++) {
    const x = r() * w, y = r() * h, big = r() > .985, size = (big ? 1.2 + r() * 1.4 : .35 + r() * .9) * k;
    c.globalAlpha = .35 + r() * .65; c.fillStyle = ['#ffffff', '#cfe6ff', '#ffe2c4', '#bfefff'][i % 4];
    c.beginPath(); c.arc(x, y, size, 0, Math.PI * 2); c.fill();
    if (big) { glow(c, x, y, size * 7, '#bfe9ff', .5); c.globalAlpha = .55; c.fillRect(x - size * 6, y - .3 * k, size * 12, .6 * k); c.fillRect(x - .3 * k, y - size * 6, .6 * k, size * 12); }
  }
  c.globalAlpha = 1;
}

/** A sphere lit from the sun: base colour, shadow on the far side, a thin bright rim and an atmosphere halo. */
function sphere(c: CanvasRenderingContext2D, x: number, y: number, rad: number, sun: [number, number], base: (c: CanvasRenderingContext2D) => void, atmo: string, atmoAlpha = .55) {
  glow(c, x, y, rad * 1.35, atmo, atmoAlpha * .55);
  c.save(); c.beginPath(); c.arc(x, y, rad, 0, Math.PI * 2); c.clip();
  base(c);
  const a = Math.atan2(sun[1] - y, sun[0] - x), lx = x + Math.cos(a) * rad * .55, ly = y + Math.sin(a) * rad * .55;
  const shade = c.createRadialGradient(lx, ly, rad * .1, lx, ly, rad * 2.05);
  shade.addColorStop(0, 'rgba(255,255,255,.12)'); shade.addColorStop(.45, 'rgba(0,0,0,0)'); shade.addColorStop(.8, 'rgba(2,3,12,.82)'); shade.addColorStop(1, 'rgba(2,3,12,.97)');
  c.fillStyle = shade; c.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  c.restore();
  c.save(); c.globalCompositeOperation = 'lighter'; c.lineWidth = Math.max(1, rad * .03); c.strokeStyle = atmo; c.globalAlpha = .8;
  c.beginPath(); c.arc(x, y, rad - c.lineWidth / 2, a - 1.25, a + 1.25); c.stroke(); c.restore();
}

function giant(c: CanvasRenderingContext2D, [x, y, rad]: [number, number, number], sun: [number, number], r: Rand) {
  const tilt = -.32;
  const ring = (front: boolean) => {
    c.save(); c.translate(x, y); c.rotate(tilt); c.scale(1, .26);
    c.beginPath(); if (front) c.rect(-rad * 3, 0, rad * 6, rad * 3); else c.rect(-rad * 3, -rad * 3, rad * 6, rad * 3); c.clip();
    for (let i = 0; i < 34; i++) {
      const rr = rad * (1.32 + i * .028); c.globalAlpha = (.12 + r() * .3) * (i > 26 ? .5 : 1);
      c.strokeStyle = ['#ffd9a8', '#e7a86a', '#f6e7cf', '#b98058'][i % 4]; c.lineWidth = rad * .026 / .26 * .3;
      c.beginPath(); c.arc(0, 0, rr, 0, Math.PI * 2); c.stroke();
    }
    c.restore(); c.globalAlpha = 1;
  };
  ring(false);
  sphere(c, x, y, rad, sun, k => {
    k.save(); k.translate(x, y); k.rotate(tilt);
    const bands = ['#f3c58b', '#d9864f', '#f7dfb8', '#b8613d', '#eab178', '#8c4a35', '#f5d2a0', '#c87447'];
    for (let i = 0, yy = -rad; yy < rad; i++) { const hgt = rad * (.06 + r() * .14); k.fillStyle = bands[i % bands.length]; k.fillRect(-rad, yy, rad * 2, hgt + 1); yy += hgt; }
    k.globalAlpha = .5; k.fillStyle = '#7d2f24'; k.beginPath(); k.ellipse(rad * .25, rad * .28, rad * .16, rad * .07, 0, 0, Math.PI * 2); k.fill(); k.globalAlpha = 1;
    k.restore();
  }, '#ffb46b', .45);
  ring(true);
}

function moon(c: CanvasRenderingContext2D, [x, y, rad]: [number, number, number], sun: [number, number], r: Rand) {
  sphere(c, x, y, rad, sun, k => {
    k.fillStyle = '#9fb3c9'; k.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    for (let i = 0; i < 14; i++) { k.globalAlpha = .25; k.fillStyle = '#56677e'; k.beginPath(); k.arc(x + (r() - .5) * rad * 1.6, y + (r() - .5) * rad * 1.6, rad * (.06 + r() * .18), 0, Math.PI * 2); k.fill(); }
    k.globalAlpha = 1;
  }, '#a9d6ff', .35);
}

/** The contested world: dark red rock with burning cities on its night side. */
function warWorld(c: CanvasRenderingContext2D, [x, y, rad]: [number, number, number], sun: [number, number], r: Rand) {
  sphere(c, x, y, rad, sun, k => {
    k.fillStyle = '#8b2a1e'; k.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    for (let i = 0; i < 10; i++) { k.globalAlpha = .45; k.fillStyle = '#3b0f0d'; k.beginPath(); k.arc(x + (r() - .5) * rad * 1.8, y + (r() - .5) * rad * 1.8, rad * (.15 + r() * .3), 0, Math.PI * 2); k.fill(); }
    k.globalAlpha = 1;
  }, '#ff5a3c', .6);
  c.save(); c.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 9; i++) { const a = r() * Math.PI * 2, d = r() * rad * .85; glow(c, x + Math.cos(a) * d, y + Math.sin(a) * d, rad * .22, '#ff8a2a', .7); }
  c.restore();
}

/** The planet horizon under the tank: ocean, continents, clouds, city lights and a bright atmosphere limb. */
function homeworld(c: CanvasRenderingContext2D, [x, y, rad]: [number, number, number], sun: [number, number], w: number, h: number, r: Rand) {
  c.save(); c.beginPath(); c.arc(x, y, rad, 0, Math.PI * 2); c.clip();
  const sea = c.createLinearGradient(0, y - rad, 0, y - rad + h * .5);
  sea.addColorStop(0, '#0f4f86'); sea.addColorStop(.25, '#082f5a'); sea.addColorStop(1, '#030b1d');
  c.fillStyle = sea; c.fillRect(0, 0, w, h);
  const top = y - rad;
  for (let i = 0; i < 90; i++) {
    const px = r() * w, py = top + Math.pow(r(), 1.6) * h * .45, rr = (.02 + r() * .07) * w;
    c.globalAlpha = .45; c.fillStyle = ['#1f6b4c', '#3e7a3a', '#7a6a3a', '#255d55'][i % 4];
    c.beginPath(); c.ellipse(px, py, rr, rr * .32, (r() - .5) * .4, 0, Math.PI * 2); c.fill();
  }
  for (let i = 0; i < 70; i++) {
    const px = r() * w, py = top + Math.pow(r(), 1.4) * h * .4, rr = (.02 + r() * .09) * w;
    c.globalAlpha = .18 + r() * .2; c.fillStyle = '#e8f6ff';
    c.beginPath(); c.ellipse(px, py, rr, rr * .16, (r() - .5) * .3, 0, Math.PI * 2); c.fill();
  }
  c.globalAlpha = 1; c.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 160; i++) { const px = (.45 + r() * .6) * w, py = top + Math.pow(r(), 1.2) * h * .35; c.globalAlpha = .4 + r() * .5; c.fillStyle = r() > .3 ? '#ffb45c' : '#ff6a3c'; c.fillRect(px, py, 1.5, 1.5); }
  c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
  // Night falls toward the bottom of the screen so the mission card and dock stay readable.
  const night = c.createLinearGradient(0, top, 0, top + h * .55);
  night.addColorStop(0, 'rgba(2,4,14,0)'); night.addColorStop(.35, 'rgba(2,4,14,.55)'); night.addColorStop(1, 'rgba(2,4,14,.96)');
  c.fillStyle = night; c.fillRect(0, top, w, h);
  c.restore();
  // Atmosphere: a cyan limb that warms to amber where the sun touches it.
  c.save(); c.globalCompositeOperation = 'lighter';
  const sa = Math.atan2(sun[1] - y, sun[0] - x);
  for (const [width, alpha, color] of [[rad * .05, .14, '#2fb6ff'], [rad * .018, .4, '#57d6ff'], [rad * .005, .9, '#c9f3ff']] as [number, number, string][]) {
    c.lineWidth = width; c.globalAlpha = alpha; c.strokeStyle = color; c.beginPath(); c.arc(x, y, rad, Math.PI * 1.05, Math.PI * 1.95); c.stroke();
  }
  c.lineWidth = rad * .012; c.globalAlpha = .7; c.strokeStyle = '#ffb35c'; c.beginPath(); c.arc(x, y, rad, sa - .18, sa + .18); c.stroke();
  c.restore();
}

/** Distant warships near the gas giant: small wedges with engine glows, tracer lines between them. */
function fleet(c: CanvasRenderingContext2D, [fx, fy]: [number, number], s: number, r: Rand) {
  const k = s / 900;
  for (let i = 0; i < 9; i++) {
    const x = fx + (r() - .5) * 340 * k, y = fy + (r() - .5) * 150 * k, len = (10 + r() * 16) * k, hostile = i % 3 === 0;
    c.save(); c.translate(x, y); c.rotate(hostile ? Math.PI * .92 : -.08);
    c.fillStyle = hostile ? '#2a0f14' : '#1a2a3f'; c.beginPath(); c.moveTo(len, 0); c.lineTo(-len * .6, -len * .28); c.lineTo(-len * .45, 0); c.lineTo(-len * .6, len * .28); c.closePath(); c.fill();
    c.restore();
    c.save(); c.globalCompositeOperation = 'lighter';
    const ex = x + (hostile ? 1 : -1) * len * .55; glow(c, ex, y, len * .7, hostile ? '#ff3b4f' : '#5fe0ff', .9);
    c.restore();
  }
  c.save(); c.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 6; i++) {
    const x = fx + (r() - .5) * 300 * k, y = fy + (r() - .5) * 120 * k, a = (r() - .5) * .6, len = (40 + r() * 90) * k;
    c.strokeStyle = i % 2 ? '#ff4d6a' : '#6ff0ff'; c.globalAlpha = .55; c.lineWidth = 1.2 * Math.max(1, k);
    c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len); c.stroke();
  }
  for (let i = 0; i < 3; i++) glow(c, fx + (r() - .5) * 260 * k, fy + (r() - .5) * 110 * k, (16 + r() * 20) * k, '#ffd27a', .8);
  c.restore();
}

/** Paint the whole sky. Exported for tests: the same size always gives the same picture. */
export function paintSky(w: number, h: number, scale = 1): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(w * scale)); canvas.height = Math.max(1, Math.round(h * scale));
  const c = canvas.getContext('2d')!; c.scale(scale, scale);
  const r = seeded(20261121), L = layout(w, h), s = Math.min(w, h);
  const bg = c.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, '#02030b'); bg.addColorStop(.55, '#070a22'); bg.addColorStop(1, '#0a0820');
  c.fillStyle = bg; c.fillRect(0, 0, w, h);
  nebula(c, w, h, r);
  stars(c, w, h, r, Math.max(1, s / 700));
  c.save(); c.globalCompositeOperation = 'lighter'; glow(c, L.sun[0], L.sun[1], Math.max(w, h) * .45, '#ffb86b', .22); glow(c, L.sun[0], L.sun[1], s * .12, '#fff1d6', .6); c.restore();
  warWorld(c, L.red, L.sun, r);
  moon(c, L.moon, L.sun, r);
  fleet(c, L.fleet, s, r);
  giant(c, L.giant, L.sun, r);
  homeworld(c, L.ground, L.sun, w, h, r);
  // Edge vignette keeps text corners dark.
  const v = c.createRadialGradient(w * .5, h * .45, s * .3, w * .5, h * .5, Math.max(w, h) * .8);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(1,2,8,.6)');
  c.fillStyle = v; c.fillRect(0, 0, w, h);
  return canvas;
}

let current = '', painting = false, again = false;
/** Paint for the current screen and publish it as --cover-sky. Repaints only when the size class changes. */
export function refreshCover() {
  const w = innerWidth, h = innerHeight; if (!w || !h) return;
  const key = `${Math.round(w / 40)}x${Math.round(h / 40)}`;
  if (key === current) return;
  if (painting) { again = true; return; }
  painting = true; current = key;
  const coarse = matchMedia('(pointer: coarse)').matches, scale = Math.min(devicePixelRatio || 1, coarse ? 1.5 : 1.25);
  let canvas: HTMLCanvasElement;
  try { canvas = paintSky(w, h, scale); } catch { painting = false; return; }
  const done = (url: string) => {
    const root = document.documentElement, old = root.dataset.coverUrl;
    root.style.setProperty('--cover-sky', `url("${url}")`); root.dataset.coverUrl = url; root.dataset.cover = 'ready';
    if (old?.startsWith('blob:')) setTimeout(() => URL.revokeObjectURL(old), 2000);
    painting = false; if (again) { again = false; refreshCover(); }
  };
  if (canvas.toBlob) canvas.toBlob(b => { if (b) done(URL.createObjectURL(b)); else done(canvas.toDataURL('image/jpeg', .9)); }, 'image/webp', .9);
  else done(canvas.toDataURL('image/jpeg', .9));
}

/** Painted key art (docs/COVER_ART_PROMPTS.md, public/cover/). Variant B was chosen for both shapes. */
/** Absolute address for a public file. These URLs go into CSS variables, and a relative url() in a variable
 *  resolves against the stylesheet that uses it: in the built game that is /assets/, so "./cover/x.webp"
 *  became /assets/cover/x.webp and 404ed on Pages (2026-11-21). Dev inlines the CSS, so only the build broke. */
export const publicUrl = (path: string) => new URL(import.meta.env.BASE_URL + path, document.baseURI).href;
export const COVER_ART = { landscape: 'cover/key-art-landscape-b.webp', portrait: 'cover/key-art-portrait-b.webp', logo: 'cover/logo-steel-front.webp' };
let artWanted = '';
/** Show the painted cover for this screen shape once it has decoded; the procedural sky stays underneath. */
export function refreshArt() {
  const root = document.documentElement, portrait = innerHeight > innerWidth * 1.15;
  const src = publicUrl(portrait ? COVER_ART.portrait : COVER_ART.landscape);
  if (src === artWanted) return; artWanted = src;
  const img = new Image(); img.decoding = 'async'; img.src = src;
  img.decode().then(() => {
    if (artWanted !== src) return;
    root.style.setProperty('--cover-art', `url("${src}")`); root.dataset.coverArt = portrait ? 'portrait' : 'landscape';
  }).catch(() => { if (artWanted === src) artWanted = ''; });
}
function loadLogo() {
  const root = document.documentElement, src = publicUrl(COVER_ART.logo), img = new Image();
  img.decoding = 'async'; img.src = src;
  img.decode().then(() => { root.style.setProperty('--cover-logo', `url("${src}")`); root.dataset.coverLogo = 'ready'; }).catch(() => {});
}
/** Small stage-planet picture for stage index i (0-based). */
export const worldArt = (i: number) => publicUrl(`cover/world-${String(i + 1).padStart(2, '0')}-sm.webp`);

let installed = false;
export function installCover() {
  if (installed) return; installed = true;
  // Scripted test runs (?e2e) leave the painted art, logo and cover animations off, like the other cosmetic
  // helpers: CI composites in software and a full-screen painting under animated layers at 3x pixel density
  // pushed slow menu tests past their limits. ?e2e&art turns them on (tests/cover-art.spec.ts).
  const query = new URLSearchParams(location.search), art = !query.has('e2e') || query.has('art');
  if (!art) document.documentElement.dataset.coverQuiet = '';
  if (art) loadLogo();
  const go = () => { refreshCover(); if (art) refreshArt(); };
  requestAnimationFrame(go);
  let timer = 0; addEventListener('resize', () => { clearTimeout(timer); timer = window.setTimeout(go, 250); });
  // A mouse wheel scrolls the stage strip sideways (touch screens swipe it).
  addEventListener('wheel', e => {
    const strip = (e.target as Element | null)?.closest?.('.campaign-route .route-list') as HTMLElement | null;
    if (!strip || e.deltaX || !e.deltaY || strip.scrollWidth <= strip.clientWidth) return;
    strip.scrollLeft += e.deltaY; e.preventDefault();
  }, { passive: false });
}

/** Campaign worlds in route order, one per biome, for the orbit around the tank and the stage list. */
export const WORLD_COLORS: Record<string, [string, string]> = {
  grove: ['#7be07a', '#1c5a33'], village: ['#ffd27a', '#7a4a1c'], river: ['#5fc8ff', '#0d3f7a'], ridge: ['#b9a6ff', '#3a2a7a'],
  industrial: ['#ff9a4a', '#6a2a12'], wastes: ['#ff5a4a', '#5a0f18'], snow: ['#eaf6ff', '#5a7aa0'], glacier: ['#bff4ff', '#2a6a8a'],
  volcanic: ['#ff6a2a', '#3a0a0a'], desert: ['#ffc46a', '#8a4a1a'], jungle: ['#5ae08a', '#0f4a2a'], city: ['#c88aff', '#2a1a5a'],
  quake: ['#ff7a3a', '#4a1a10'], marsh: ['#8ad0a0', '#1f4a3a'],
};
export function orbitWorlds(biomes: string[], current: number, cleared: boolean[]) {
  // The orbit box matches .showcase-ring (an ellipse filling a box about 2.5x wider than tall, turned -12°).
  // Points are placed on that turned ellipse in box pixels, then converted back to percentages.
  const n = biomes.length, aspect = 2.5, tilt = -12 * Math.PI / 180, W = aspect, H = 1;
  return biomes.map((b, i) => {
    const a = Math.PI * (1.1 + 1.3 * i / Math.max(1, n - 1)), ex = Math.cos(a) * W / 2, ey = Math.sin(a) * H / 2;
    const px = ex * Math.cos(tilt) - ey * Math.sin(tilt), py = ex * Math.sin(tilt) + ey * Math.cos(tilt);
    const x = 50 + px / W * 100, y = 50 + py / H * 100;
    const [hi, lo] = WORLD_COLORS[b] ?? ['#9fd8ff', '#1a3a5a'];
    const state = (i === current ? ' current' : cleared[i] ? ' cleared' : '') + (Math.sin(a) > 0 ? ' front' : '');
    return `<i class="orbit-world${state}" style="left:${x.toFixed(1)}%;top:${y.toFixed(1)}%;--hi:${hi};--lo:${lo}"></i>`;
  }).join('');
}
