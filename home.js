(() => {
'use strict';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = t => t * t * (3 - 2 * t);
const ease = t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
if (RM) document.documentElement.classList.add('rm');

/* ================= NAV + MENU ================= */
const nav = $('#nav'), menuBtn = $('#menuBtn'), menu = $('#mobileMenu');
function setMenu(open) {
  menu.classList.toggle('open', open);
  menuBtn.setAttribute('aria-expanded', String(open));
  menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  document.body.classList.toggle('menu-open', open);
}
menuBtn.addEventListener('click', () => setMenu(!menu.classList.contains('open')));
menu.addEventListener('click', e => { if (e.target.closest('a')) setMenu(false); });
addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });

/* ================= WALLET CONNECT (EVM) ================= */
(() => {
  const buttons = $$('[data-connect-wallet]');
  if (!buttons.length) return;
  let connectedAddress = '';
  const shortAddress = a => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : 'Connect wallet');
  let toastTimer;
  function toast(message) {
    let el = $('.wallet-toast');
    if (!el) {
      el = document.createElement('div');
      el.className = 'wallet-toast';
      el.setAttribute('role', 'status');
      el.setAttribute('aria-live', 'polite');
      document.body.appendChild(el);
    }
    el.textContent = message; el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.hidden = true; }, 5200);
  }
  function paint(address) {
    connectedAddress = address || '';
    buttons.forEach(b => {
      b.textContent = connectedAddress ? shortAddress(connectedAddress) : 'Connect wallet';
      b.classList.toggle('is-connected', !!connectedAddress);
      b.setAttribute('aria-label', connectedAddress ? `Wallet connected: ${connectedAddress}` : 'Connect wallet');
    });
  }
  async function connect() {
    const provider = window.ethereum;
    if (!provider) { toast('No compatible wallet was detected. Install or enable MetaMask or another EVM wallet, then try again.'); return; }
    buttons.forEach(b => { b.disabled = true; });
    try {
      const accounts = await provider.request({ method: 'eth_requestAccounts' });
      if (!accounts || !accounts.length) { toast('Wallet connection was cancelled.'); return; }
      paint(accounts[0]);
      let chainName = 'EVM network';
      try {
        const chainId = await provider.request({ method: 'eth_chainId' });
        const names = { '0x1': 'Ethereum Mainnet', '0x89': 'Polygon', '0xa86a': 'Avalanche', '0xa4b1': 'Arbitrum One', '0xa': 'Optimism', '0x2105': 'Base', '0x38': 'BNB Smart Chain', '0xaa36a7': 'Sepolia' };
        chainName = names[String(chainId).toLowerCase()] || `Chain ${chainId}`;
      } catch (_) {}
      toast(`Wallet connected on ${chainName}.`);
    } catch (err) {
      if (err && err.code === 4001) toast('Connection request rejected in your wallet.');
      else toast((err && err.message) ? `Could not connect wallet: ${err.message}` : 'Could not connect wallet. Please try again.');
    } finally { buttons.forEach(b => { b.disabled = false; }); }
  }
  buttons.forEach(b => b.addEventListener('click', connect));
  if (window.ethereum) {
    window.ethereum.request({ method: 'eth_accounts' }).then(a => { if (a && a[0]) paint(a[0]); }).catch(() => {});
    if (typeof window.ethereum.on === 'function') {
      window.ethereum.on('accountsChanged', a => paint((a && a[0]) || ''));
      window.ethereum.on('chainChanged', () => { if (connectedAddress) toast('Wallet network changed.'); });
    }
  }
})();

/* ================= 3D LOGO (stack of layers) ================= */
const stage = $('#logoStage'), rig = $('#logoRig'), brandImg = $('.brand img');
const SRC = brandImg.getAttribute('src');
const FALLBACK = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f0c8ff"/><stop offset=".5" stop-color="#8f8cff"/><stop offset="1" stop-color="#4bd0ff"/></linearGradient></defs><circle cx="100" cy="100" r="78" fill="none" stroke="url(#g)" stroke-width="14"/><path d="M62 70h76M100 70v76" stroke="url(#g)" stroke-width="16" stroke-linecap="round" fill="none"/></svg>');
brandImg.addEventListener('error', () => { brandImg.src = FALLBACK; }, { once: true });
if (brandImg.complete && brandImg.naturalWidth === 0) brandImg.src = FALLBACK;

const N = 16;            // layers in the stack
const SOLID = 2;         // front layers keep the original artwork; the rest are tinted silhouettes
const tintDefs = $('#tintDefs');
const NS = 'http://www.w3.org/2000/svg';
const stops = [[0, [36, 16, 88]], [.55, [106, 77, 255]], [1, [217, 79, 255]]];
function stopColor(t) {
  for (let i = 0; i < stops.length - 1; i++) {
    const [a, ca] = stops[i], [b, cb] = stops[i + 1];
    if (t <= b) { const u = clamp((t - a) / (b - a)); return ca.map((v, j) => lerp(v, cb[j], u) / 255); }
  }
  return stops[stops.length - 1][1].map(v => v / 255);
}
for (let k = 0; k < N; k++) {
  const img = new Image();
  img.alt = ''; img.decoding = 'async'; img.draggable = false; img.src = SRC;
  img.addEventListener('error', () => { if (img.src !== FALLBACK) img.src = FALLBACK; }, { once: true });
  img.style.setProperty('--k', (k - (N - 1) / 2).toFixed(2));
  if (k < N - SOLID) {
    const [r, g, b] = stopColor(k / (N - SOLID - 1));
    const f = document.createElementNS(NS, 'filter');
    f.setAttribute('id', 'tint' + k);
    f.setAttribute('color-interpolation-filters', 'sRGB');
    const m = document.createElementNS(NS, 'feColorMatrix');
    m.setAttribute('type', 'matrix');
    m.setAttribute('values', `0 0 0 0 ${r.toFixed(3)}  0 0 0 0 ${g.toFixed(3)}  0 0 0 0 ${b.toFixed(3)}  0 0 0 1 0`);
    f.appendChild(m); tintDefs.appendChild(f);
    img.style.filter = `url(#tint${k})`;
  }
  rig.appendChild(img);
}

/* ================= SCENE CONFIG ================= */
const ORDER = ['hero', 'problem', 'how', 'signals', 'layer', 'surfaces', 'final'];
const LABELS = ['Intro', 'The problem', 'How it works', 'Six rights', 'The layer', 'Surfaces', 'Get started'];
// pose: x,y as viewport fractions, s scale, ry/rx degrees, o opacity, ex = layer explosion 0..1
const P = (x, y, s, ry, rx, o, ex) => ({ x, y, s, ry, rx, o, ex });
const POSES = {
  d: {
    hero: P(.71, .5, 1, -16, 6, 1, 0),
    problem: P(.24, .5, .9, 372, 4, 1, 0),
    how: P(.5, .5, .75, 720, 0, .14, 0),
    signals: P(.5, .5, 1.3, 1080, 0, .1, 0),
    layer: P(.5, .52, 1, 1474, 14, 1, 0),
    surfaces: P(.5, .5, 1.4, 1800, 0, .07, 0),
    final: P(.5, .3, .62, 2120, 0, 1, 0)
  },
  m: {
    hero: P(.5, .27, .9, -14, 6, 1, 0),
    problem: P(.5, .2, .62, 372, 4, 1, 0),
    how: P(.5, .5, .85, 720, 0, .12, 0),
    signals: P(.5, .5, 1.1, 1080, 0, .1, 0),
    layer: P(.5, .52, .9, 1474, 14, 1, 0),
    surfaces: P(.5, .5, 1.2, 1800, 0, .06, 0),
    final: P(.5, .24, .6, 2120, 0, 1, 0)
  }
};

/* ================= ELEMENTS ================= */
const heroCopy = $('#heroCopy'), heroFacts = $('#heroFacts'), scrollCue = $('#scrollCue');
const problemCopy = $('#problemCopy');
const lines = $$('.problem .ln');
const scrub = $('.scrub');
{
  const txt = scrub.textContent.trim();
  scrub.textContent = '';
  const parts = txt.split(/\s+/);
  parts.forEach((w, i) => {
    const s = document.createElement('span'); s.className = 'w'; s.textContent = w;
    scrub.append(s, i < parts.length - 1 ? ' ' : '');
  });
}
const words = $$('.w', scrub);
const tunnelPin = $('#tunnelPin'), tunnelWorld = $('#tunnelWorld'), tunnelTitle = $('#tunnelTitle');
const tCards = $$('.t-card'), tBars = $$('#tRail i');
const ringRig = $('#ringRig'), rCards = $$('.r-card'), rDots = $$('#ringReadout i');
const layerSec = $('#the-layer'), tags = $$('.layer-tags li');
const sCards = $$('.s-card');
const rail = $('#rail');

/* ================= STATE ================= */
let vw = 0, vh = 0, mobile = false, poses = POSES.d, secs = [];
let ringR = 330, sTop = [], xAmp = 0;
let ps = scrollY, mx = 0, my = 0, cmx = 0, cmy = 0, running = false;
let activeRail = -1, activeRing = -1, activeT = -1;

/* rail dots */
const railBtns = ORDER.map((k, i) => {
  const b = document.createElement('button');
  b.type = 'button'; b.setAttribute('aria-label', LABELS[i]);
  b.innerHTML = `<span>${LABELS[i]}</span>`;
  b.addEventListener('click', () => { const s = secs[i]; if (s) scrollTo({ top: i === 0 ? 0 : s.top, behavior: 'smooth' }); });
  rail.appendChild(b);
  return b;
});

/* ================= MEASURE ================= */
function measure() {
  vw = innerWidth; vh = innerHeight; mobile = vw < 820;
  poses = mobile ? POSES.m : POSES.d;
  const size = Math.min(vw * (mobile ? .74 : .5), vh * (mobile ? .4 : .62), 540);
  stage.style.setProperty('--ls', size + 'px');

  const sy = scrollY;
  secs = ORDER.map(k => {
    const el = $(`[data-pose="${k}"]`);
    const r = el.getBoundingClientRect();
    const top = r.top + sy, h = r.height;
    const a = top - vh * .1;
    const b = Math.max(a + 1, top + h - vh * .9);
    return { k, el, top, h, a, b };
  });

  if (RM) return;

  // tunnel framing
  const cx = mobile ? vw * .5 : vw * .66, cy = mobile ? vh * .6 : vh * .52;
  tunnelWorld.style.setProperty('--cx', cx + 'px');
  tunnelWorld.style.setProperty('--cy', cy + 'px');
  tunnelPin.style.perspectiveOrigin = `${cx}px ${cy}px`;
  xAmp = mobile ? vw * .03 : vw * .05;

  // ring radius from real card width
  const cw = rCards[0].offsetWidth || 280;
  ringR = cw * 1.1;
  ringRig.style.setProperty('--R', ringR + 'px');

  // layer tags around the exploded logo
  const rx = mobile ? vw * .36 : clamp(vw * .3, 160, 440);
  const ry = mobile ? vh * .23 : clamp(vh * .28, 130, 260);
  tags.forEach((li, i) => {
    const a = (-90 + i * 60) * Math.PI / 180;
    li.style.setProperty('--tx', (Math.cos(a) * rx).toFixed(1) + 'px');
    li.style.setProperty('--ty', (Math.sin(a) * ry).toFixed(1) + 'px');
  });

  // stacking cards: sticky offsets
  sTop = sCards.map(c => parseFloat(getComputedStyle(c).top) || 0);
}

/* ================= POSE MATH ================= */
function hold(i, t) {
  const b = poses[ORDER[i]];
  const p = Object.assign({}, b);
  p.ry = b.ry + t * 40;
  if (ORDER[i] === 'layer') p.ex = smooth(clamp(t / .55));
  return p;
}
function mix(a, b, t) {
  const o = {};
  for (const k in a) o[k] = lerp(a[k], b[k], t);
  return o;
}
function poseAt(s) {
  for (let i = 0; i < secs.length; i++) {
    const c = secs[i];
    if (s < c.a) {
      if (i === 0) return hold(0, 0);
      const pr = secs[i - 1];
      const t = clamp((s - pr.b) / Math.max(1, c.a - pr.b));
      return mix(hold(i - 1, 1), hold(i, 0), ease(t));
    }
    if (s <= c.b) return hold(i, (s - c.a) / Math.max(1, c.b - c.a));
  }
  return hold(secs.length - 1, 1);
}
const prog = (sec, lead, s) => clamp((s - (sec.top - lead * vh)) / (sec.h - vh + lead * vh));

/* ================= PER-FRAME UPDATE ================= */
function applyPose(pose) {
  stage.style.transform = `translate3d(${(pose.x * vw).toFixed(1)}px,${(pose.y * vh).toFixed(1)}px,0) scale(${pose.s.toFixed(3)})`;
  stage.style.opacity = pose.o.toFixed(3);
  rig.style.transform = `rotateX(${(pose.rx - cmy * 6).toFixed(2)}deg) rotateY(${(pose.ry + cmx * 10).toFixed(2)}deg)`;
  rig.style.setProperty('--gap', (2.2 + pose.ex * 15).toFixed(2) + 'px');
}

function update() {
  const s = ps;
  const pose = poseAt(s);
  applyPose(pose);
  layerSec.style.setProperty('--ex', pose.ex.toFixed(3));

  nav.classList.toggle('scrolled', s > 24);

  // hero
  const hp = clamp(s / (vh * .75));
  heroCopy.style.transform = `translate3d(0,${(s * .16).toFixed(1)}px,0)`;
  heroCopy.style.opacity = (1 - hp * 1.15).toFixed(3);
  heroFacts.style.opacity = (1 - hp * 2).toFixed(3);
  scrollCue.style.opacity = (1 - hp * 3).toFixed(3);

  // problem: lines then word-by-word scrub
  const pr = prog(secs[1], .45, s);
  lines.forEach((ln, i) => {
    const a = smooth(clamp((pr - i * .12) / .14));
    ln.style.opacity = a.toFixed(3);
    ln.style.transform = `translate3d(0,${((1 - a) * 46).toFixed(1)}px,0)`;
  });
  const L = clamp((pr - .24) / .6) * words.length;
  for (let i = 0; i < words.length; i++) {
    words[i].style.opacity = (.14 + .86 * clamp(L - i)).toFixed(3);
  }
  problemCopy.style.opacity = (1 - clamp((pr - .93) / .07)).toFixed(3);

  // tunnel: camera flies through four cards
  const tp = prog(secs[2], .3, s);
  const D = 900;
  const cam = lerp(-.55 * D, (tCards.length - 1 + .5) * D, tp);
  let best = 0, bd = Infinity;
  tCards.forEach((c, i) => {
    const rel = -i * D + cam;
    const op = clamp((rel + 1900) / 800) * clamp((320 - rel) / 320);
    const side = i % 2 ? -1 : 1;
    const ry = side * 14 * clamp(Math.abs(rel) / D, 0, 1.3);
    const pass = Math.max(rel, 0);   // cards that fly past the camera peel away up and to the right
    c.style.opacity = op.toFixed(3);
    c.style.transform = `translate3d(${(side * xAmp + pass * .9).toFixed(1)}px,${(-side * vh * .035 - pass * .35).toFixed(1)}px,${rel.toFixed(1)}px) rotateY(${ry.toFixed(2)}deg) translate(-50%,-50%)`;
    const d = Math.abs(rel);
    if (d < bd) { bd = d; best = i; }
  });
  if (best !== activeT) { activeT = best; tBars.forEach((b, i) => b.classList.toggle('on', i === best)); }
  tunnelTitle.style.opacity = (1 - clamp((tp - .9) / .1)).toFixed(3);

  // ring: cylinder turns with a dwell on each card
  const rp = prog(secs[3], .2, s);
  const u = rp * 5, ii = Math.min(5, Math.floor(u)), fr = u - ii;
  const angle = 60 * (ii + smooth(clamp((fr - .25) / .5)));
  ringRig.style.transform = `translateZ(${(-ringR).toFixed(1)}px) rotateY(${(-angle).toFixed(2)}deg)`;
  let act = 0, af = -2;
  rCards.forEach((c, i) => {
    const f = Math.cos((i * 60 - angle) * Math.PI / 180);
    c.style.opacity = (.2 + .8 * clamp((f + .25) / 1.25)).toFixed(3);
    if (f > af) { af = f; act = i; }
  });
  if (act !== activeRing) {
    activeRing = act;
    rCards.forEach((c, i) => c.classList.toggle('on', i === act));
    rDots.forEach((d, i) => d.classList.toggle('on', i === act));
  }

  // surfaces: cards stack and tilt back
  sCards.forEach((c, i) => {
    const n = sCards[i + 1];
    if (!n) return;
    const d = clamp(1 - (n.getBoundingClientRect().top - sTop[i]) / (vh * .6));
    c.style.transform = `translate3d(0,${(-d * 14).toFixed(1)}px,${(-d * 60).toFixed(1)}px) rotateX(${(-d * 4).toFixed(2)}deg) scale(${(1 - d * .06).toFixed(3)})`;
    c.style.setProperty('--dim', d.toFixed(3));
  });

  // rail
  let cur = 0;
  secs.forEach((c, i) => { if (s >= c.a - vh * .3) cur = i; });
  if (cur !== activeRail) { activeRail = cur; railBtns.forEach((b, i) => b.classList.toggle('on', i === cur)); }
}

/* ================= LOOP ================= */
function tick() {
  ps += (scrollY - ps) * .15;
  cmx += (mx - cmx) * .06;
  cmy += (my - cmy) * .06;
  update();
  if (Math.abs(scrollY - ps) > .25 || Math.abs(mx - cmx) > .001 || Math.abs(my - cmy) > .001) {
    requestAnimationFrame(tick);
  } else {
    ps = scrollY; running = false; update();
  }
}
function kick() { if (!running) { running = true; requestAnimationFrame(tick); } }

/* ================= INIT ================= */
measure();
if (RM) {
  const p = POSES[mobile ? 'm' : 'd'].hero;
  applyPose(p);
  stage.style.opacity = '.22';
} else {
  ps = scrollY;
  update();
  addEventListener('scroll', kick, { passive: true });
  if (matchMedia('(pointer:fine)').matches) {
    addEventListener('pointermove', e => { mx = e.clientX / innerWidth - .5; my = e.clientY / innerHeight - .5; kick(); }, { passive: true });
  }
  let rt;
  addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { measure(); kick(); }, 120); });
  addEventListener('load', () => { measure(); kick(); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { measure(); kick(); });
}
})();
