/* ========================================
   SKY MODE MANAGER
   Modes: 0 = Night Sky, 1 = Arctic Aurora, 2 = Light Day
======================================== */

const SkyMode = (() => {
  let current = 0;
  const MODES = ['night', 'aurora', 'light'];
  const listeners = [];

  function get() { return current; }
  function name() { return MODES[current]; }

  function next() {
    current = (current + 1) % 3;
    listeners.forEach(fn => fn(current, MODES[current]));
  }

  function on(fn) { listeners.push(fn); }

  return { get, name, next, on };
})();

/* ========================================
   MODE TOGGLE BUTTON
======================================== */

(function initModeToggle() {
  const btn = document.getElementById('modeToggle');
  if (!btn) return;

  const icons  = ['☀️', '☀️', '☀️'];   // same icon always
  const labels = ['Night Sky', 'Arctic Aurora', 'Light Mode'];

  SkyMode.on((idx, name) => {
    btn.setAttribute('aria-label', `Switch to ${labels[(idx + 1) % 3]}`);
    btn.title = labels[idx];
    // Apply body class
    document.body.className = document.body.className
      .replace(/\bmode-\w+\b/g, '').trim();
    document.body.classList.add('mode-' + name);
  });

  btn.addEventListener('click', () => {
    SkyMode.next();
  });
})();

/* ========================================
   CANVAS ENGINE — drives all three modes
======================================== */

(function initCanvas() {
  const canvas = document.getElementById('starCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let W, H, animId, lastTs = 0;
  let scrollY = 0;

  // ── shared rand util ──
  function rand(a, b) { return a + Math.random() * (b - a); }

  /* ─────────────────────────────────────
     NIGHT SKY DATA
  ───────────────────────────────────── */
  const LAYERS = [
    { count: 160, minR: 0.25, maxR: 0.8,  speed: 0.007, alpha: [0.3,  0.7 ] },
    { count: 100, minR: 0.6,  maxR: 1.3,  speed: 0.016, alpha: [0.45, 0.90] },
    { count:  50, minR: 1.1,  maxR: 1.9,  speed: 0.028, alpha: [0.65, 1.0 ] },
  ];
  let stars = [], shootingStars = [], shootTimer = 0;

  // Milky Way micro-stars (dense band)
  let milkyStars = [];

  // Nebula blobs
  const NEBULAE = [
    { cx: 0.30, cy: 0.25, rx: 0.28, ry: 0.18, hue: 270, sat: 60, alpha: 0.055 },
    { cx: 0.72, cy: 0.15, rx: 0.22, ry: 0.14, hue: 240, sat: 70, alpha: 0.045 },
    { cx: 0.55, cy: 0.50, rx: 0.35, ry: 0.20, hue: 280, sat: 50, alpha: 0.035 },
    { cx: 0.15, cy: 0.60, rx: 0.20, ry: 0.14, hue: 200, sat: 55, alpha: 0.030 },
  ];

  function buildStars() {
    stars = [];
    LAYERS.forEach((layer, i) => {
      for (let k = 0; k < layer.count; k++) {
        stars.push({
          x: Math.random() * W, y: Math.random() * H,
          r: rand(layer.minR, layer.maxR),
          baseAlpha: rand(layer.alpha[0], layer.alpha[1]),
          alpha: 0,
          twPhase: Math.random() * Math.PI * 2,
          twSpeed: rand(0.003, 0.018),
          twAmp:   rand(0.10, 0.35),
          speed: layer.speed, layer: i,
          hue: Math.random() < 0.14 ? rand(200,240) :
               Math.random() < 0.11 ? rand(28, 50)  : 0,
          sat: Math.random() < 0.25 ? rand(30, 75) : 0,
        });
      }
    });

    // Milky Way — diagonal band of micro-stars
    milkyStars = [];
    const MW_COUNT = 380;
    for (let i = 0; i < MW_COUNT; i++) {
      const t  = Math.random();
      const bx = W * 0.05 + t * W * 0.90;
      const by = H * 0.05 + t * H * 0.55;
      milkyStars.push({
        x: bx + rand(-W * 0.12, W * 0.12),
        y: by + rand(-H * 0.07, H * 0.07),
        r: rand(0.15, 0.55),
        alpha: rand(0.08, 0.45),
      });
    }
  }

  function spawnShootingStar() {
    const angle = rand(0.08, 0.42) * Math.PI;
    const spd   = rand(5, 11);
    shootingStars.push({
      x: rand(0, W * 0.75), y: rand(0, H * 0.35),
      vx: Math.cos(angle) * spd, vy: Math.sin(angle) * spd,
      alpha: 1, width: rand(0.9, 2.0),
      tailLen: rand(90, 200),
    });
  }

  /* ─────────────────────────────────────
     AURORA DATA — Curtain-based physical model
     Real auroras: vertical ray curtains along
     a horizontal band, driven by solar wind.
     Colour: green (557.7nm O), violet top edge,
     red fringe at altitude, blue/pink at base.
  ───────────────────────────────────── */
  const CURTAINS = [
    { baseY:0.24, amp:0.09, freq:1.6,  drift:0.00018, hue:145, sat:100, alphaMax:0.72, rayDensity:220, curtainH:0.32 },
    { baseY:0.28, amp:0.07, freq:2.1,  drift:0.00025, hue:155, sat: 98, alphaMax:0.55, rayDensity:180, curtainH:0.28 },
    { baseY:0.20, amp:0.12, freq:1.3,  drift:0.00014, hue:160, sat: 95, alphaMax:0.38, rayDensity:150, curtainH:0.38 },
    { baseY:0.16, amp:0.06, freq:2.8,  drift:0.00032, hue:280, sat:100, alphaMax:0.28, rayDensity:120, curtainH:0.18 },
    { baseY:0.19, amp:0.05, freq:3.2,  drift:0.00040, hue:300, sat: 90, alphaMax:0.20, rayDensity:100, curtainH:0.14 },
    { baseY:0.10, amp:0.04, freq:1.9,  drift:0.00012, hue:  5, sat: 90, alphaMax:0.10, rayDensity: 80, curtainH:0.10 },
  ];
  const CURTAIN_STATE = CURTAINS.map(() => ({
    t:      Math.random() * 1000,
    pulse:  Math.random() * Math.PI * 2,
    pulseV: rand(0.0004, 0.0012),
    fold:   Math.random() * Math.PI * 2,
    foldV:  rand(0.0002, 0.0008),
  }));

  // sparse arctic stars
  let arcticStars = [];
  function buildArcticStars() {
    arcticStars = [];
    for (let i = 0; i < 220; i++) {
      arcticStars.push({
        x: Math.random() * W, y: Math.random() * H * 0.85,
        r: rand(0.2, 0.9),
        alpha: rand(0.2, 0.65),
        twPhase: Math.random() * Math.PI * 2,
        twSpeed: rand(0.002, 0.012),
        twAmp:   rand(0.08, 0.25),
      });
    }
  }

  /* ─────────────────────────────────────
     LIGHT DAY DATA
  ───────────────────────────────────── */
  const CLOUDS = [];
  function buildClouds() {
    CLOUDS.length = 0;
    for (let i = 0; i < 5; i++) {
      CLOUDS.push({
        x: Math.random() * W,
        y: rand(H * 0.06, H * 0.35),
        w: rand(160, 340),
        h: rand(40, 90),
        speed: rand(0.06, 0.18),
        alpha: rand(0.55, 0.80),
      });
    }
  }

  /* ─────────────────────────────────────
     RESIZE
  ───────────────────────────────────── */
  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
    buildStars();
    buildArcticStars();
    buildClouds();
  }

  /* ─────────────────────────────────────
     DRAW — NIGHT SKY
  ───────────────────────────────────── */
  function drawNight(ts, dt) {
    // Sky gradient
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0,   '#01030f');
    bg.addColorStop(0.5, '#030818');
    bg.addColorStop(1,   '#060d28');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Nebulae
    NEBULAE.forEach(n => {
      const gx = ctx.createRadialGradient(n.cx*W, n.cy*H, 0, n.cx*W, n.cy*H, n.rx*W);
      gx.addColorStop(0,   `hsla(${n.hue},${n.sat}%,55%,${n.alpha})`);
      gx.addColorStop(0.5, `hsla(${n.hue},${n.sat}%,45%,${n.alpha * 0.4})`);
      gx.addColorStop(1,   `hsla(${n.hue},${n.sat}%,35%,0)`);
      ctx.save();
      ctx.scale(1, n.ry / n.rx);
      ctx.fillStyle = gx;
      ctx.beginPath();
      ctx.arc(n.cx*W, (n.cy*H) * (n.rx/n.ry), n.rx*W, 0, Math.PI*2);
      ctx.fill();
      ctx.restore();
    });

    // Milky Way
    milkyStars.forEach(ms => {
      ctx.beginPath();
      ctx.arc(ms.x, ms.y, ms.r, 0, Math.PI*2);
      ctx.fillStyle = `rgba(210,200,255,${ms.alpha})`;
      ctx.fill();
    });

    // Stars with twinkle + parallax
    stars.forEach(s => {
      s.twPhase += s.twSpeed;
      s.alpha = Math.max(0.04, Math.min(1, s.baseAlpha + Math.sin(s.twPhase) * s.twAmp));
      const dy = (s.y - (scrollY * s.speed) % H + H) % H;

      ctx.beginPath();
      ctx.arc(s.x, dy, s.r, 0, Math.PI*2);
      ctx.fillStyle = s.hue
        ? `hsla(${s.hue},${s.sat}%,90%,${s.alpha})`
        : `rgba(255,255,255,${s.alpha})`;
      ctx.fill();

      // Bloom on bright foreground stars
      if (s.layer === 2 && s.alpha > 0.68) {
        const gr = ctx.createRadialGradient(s.x, dy, 0, s.x, dy, s.r * 5);
        const ga = (s.alpha - 0.68) * 0.30;
        gr.addColorStop(0, `rgba(190,170,255,${ga})`);
        gr.addColorStop(1, 'rgba(190,170,255,0)');
        ctx.beginPath();
        ctx.arc(s.x, dy, s.r * 5, 0, Math.PI*2);
        ctx.fillStyle = gr;
        ctx.fill();
      }
    });

    // Shooting stars — throttle spawn
    shootTimer -= dt;
    if (shootTimer <= 0) {
      spawnShootingStar();
      shootTimer = rand(4000, 10000);
    }
    for (let i = shootingStars.length - 1; i >= 0; i--) {
      const ss = shootingStars[i];
      const tx = ss.x - ss.vx * (ss.tailLen / 11);
      const ty = ss.y - ss.vy * (ss.tailLen / 11);
      const g  = ctx.createLinearGradient(tx, ty, ss.x, ss.y);
      g.addColorStop(0,   'rgba(255,255,255,0)');
      g.addColorStop(0.65,`rgba(220,200,255,${ss.alpha * 0.55})`);
      g.addColorStop(1,   `rgba(255,255,255,${ss.alpha})`);
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.lineTo(ss.x, ss.y);
      ctx.strokeStyle = g;
      ctx.lineWidth = ss.width;
      ctx.lineCap = 'round';
      ctx.stroke();
      ss.x += ss.vx; ss.y += ss.vy; ss.alpha -= 0.020;
      if (ss.alpha <= 0) shootingStars.splice(i, 1);
    }
  }

  /* ─────────────────────────────────────
     DRAW — ARCTIC AURORA (physically-based curtain renderer)

     Architecture:
     1. Dark arctic sky gradient
     2. Stars behind aurora (dim — light pollution from aurora)
     3. Per-curtain: sample spine Y at every column, draw
        a vertical ray column with:
          • top colour = hue (green/violet/red)
          • mid blend  = slightly warmer hue
          • base fade  = transparency
        Ray height modulated by a local brightness noise
        function (Perlin-like sum of sines) per column.
     4. Global curtain alpha pulsed independently per curtain
     5. Horizon ice reflection
  ───────────────────────────────────── */
  function drawAurora(ts) {
    // 1. Arctic sky — near-black with deep teal/green tint
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0,    '#00070a');
    bg.addColorStop(0.35, '#000f0c');
    bg.addColorStop(0.75, '#001208');
    bg.addColorStop(1,    '#001a0e');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // 2. Stars — dim behind aurora glow
    arcticStars.forEach(s => {
      s.twPhase += s.twSpeed;
      const a = Math.max(0.03, Math.min(0.5, s.alpha + Math.sin(s.twPhase) * s.twAmp));
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(180,220,210,${a})`;
      ctx.fill();
    });

    // 3. Curtains
    const COL_W = 3; // column width in px — finer = more ray detail
    const COLS  = Math.ceil(W / COL_W);

    CURTAINS.forEach((c, ci) => {
      const st = CURTAIN_STATE[ci];
      st.t     += c.drift * 16;
      st.pulse += st.pulseV * 16;
      st.fold  += st.foldV  * 16;

      // Global alpha pulse for this curtain (auroras breathe)
      const globalPulse = 0.55 + 0.45 * Math.sin(st.pulse);
      const curtainAlpha = c.alphaMax * globalPulse;

      const curtainHeightPx = c.curtainH * H;

      ctx.save();

      for (let col = 0; col < COLS; col++) {
        const x = col * COL_W;
        const nx = x / W; // normalised 0–1

        // ── Spine Y: where this curtain's top edge sits at this column ──
        // Sum of 4 harmonics → organic non-repeating wave
        const spineY = (
          c.baseY * H
          + Math.sin(nx * c.freq * Math.PI * 2 + st.t)               * c.amp * H
          + Math.sin(nx * c.freq * Math.PI * 3.7 + st.t * 1.3 + 1.2) * c.amp * H * 0.40
          + Math.sin(nx * c.freq * Math.PI * 6.1 + st.t * 0.7 + 2.5) * c.amp * H * 0.18
          + Math.sin(nx * c.freq * Math.PI * 0.9 + st.fold)           * c.amp * H * 0.25
        );

        // ── Local brightness noise: makes ray lengths vary column-by-column ──
        // Simulates discrete ray structure of real aurora
        const rayNoise = (
          0.5
          + 0.30 * Math.sin(nx * 80  + st.t * 2.1)
          + 0.15 * Math.sin(nx * 160 + st.t * 3.3 + st.fold)
          + 0.05 * Math.sin(nx * 320 + st.t * 5.7)
        );
        const rayH = curtainHeightPx * Math.max(0.05, rayNoise);

        // ── Column alpha: edges of curtain fade out, centre bright ──
        // Also modulated by rayNoise for flickering
        const edgeFade = Math.sin(nx * Math.PI); // 0 at edges, 1 at centre
        const colAlpha = curtainAlpha * (0.5 + 0.5 * edgeFade) * (0.6 + 0.4 * rayNoise);

        if (colAlpha < 0.005) continue;

        // ── Vertical gradient per column: physical aurora colours ──
        // Top: faint red/magenta fringe (high altitude O emission)
        // Upper: bright green core (557.7nm peak)
        // Mid:   blue-green fade
        // Base:  transparent (lower atmosphere quenches emission)
        const g = ctx.createLinearGradient(x, spineY - rayH * 0.12, x, spineY + rayH);
        g.addColorStop(0,    `hsla(${c.hue + 15},${c.sat}%,80%,0)`);
        g.addColorStop(0.08, `hsla(${c.hue + 10},${c.sat}%,78%,${colAlpha * 0.35})`);
        g.addColorStop(0.22, `hsla(${c.hue},${c.sat}%,72%,${colAlpha})`);
        g.addColorStop(0.45, `hsla(${c.hue - 5},${c.sat}%,65%,${colAlpha * 0.80})`);
        g.addColorStop(0.68, `hsla(${c.hue - 10},${c.sat - 10}%,55%,${colAlpha * 0.40})`);
        g.addColorStop(0.88, `hsla(${c.hue - 15},${c.sat - 20}%,45%,${colAlpha * 0.12})`);
        g.addColorStop(1,    `hsla(${c.hue},${c.sat}%,40%,0)`);

        ctx.fillStyle = g;
        ctx.fillRect(x, spineY - rayH * 0.12, COL_W + 1, rayH * 1.12);
      }

      ctx.restore();
    });

    // 4. Soft glow bloom pass — composited on top with screen-like effect
    // A blurred wide horizontal band reinforces the overall aurora presence
    CURTAINS.slice(0, 3).forEach((c, ci) => {
      const st     = CURTAIN_STATE[ci];
      const pulse  = 0.55 + 0.45 * Math.sin(st.pulse);
      const midY   = c.baseY * H;
      const bloom  = ctx.createLinearGradient(0, midY - c.curtainH*H*0.5, 0, midY + c.curtainH*H);
      const bAlpha = c.alphaMax * pulse * 0.18;
      bloom.addColorStop(0,   `hsla(${c.hue},${c.sat}%,70%,0)`);
      bloom.addColorStop(0.3, `hsla(${c.hue},${c.sat}%,70%,${bAlpha})`);
      bloom.addColorStop(0.6, `hsla(${c.hue},${c.sat}%,60%,${bAlpha * 0.5})`);
      bloom.addColorStop(1,   `hsla(${c.hue},${c.sat}%,50%,0)`);
      ctx.fillStyle = bloom;
      ctx.fillRect(0, midY - c.curtainH*H*0.5, W, c.curtainH*H * 1.5);
    });

    // 5. Horizon — ice plain reflecting aurora (snow/ice = diffuse green tint)
    const hGlow = ctx.createLinearGradient(0, H * 0.80, 0, H);
    hGlow.addColorStop(0,   'rgba(0,200,110,0)');
    hGlow.addColorStop(0.4, 'rgba(0,180,100,0.055)');
    hGlow.addColorStop(0.8, 'rgba(0,160,90,0.110)');
    hGlow.addColorStop(1,   'rgba(0,140,80,0.180)');
    ctx.fillStyle = hGlow;
    ctx.fillRect(0, H * 0.80, W, H * 0.20);

    // Horizon line — faint bright edge where sky meets ice plain
    const hLine = ctx.createLinearGradient(0, 0, W, 0);
    hLine.addColorStop(0,    'rgba(80,220,160,0)');
    hLine.addColorStop(0.2,  'rgba(80,220,160,0.08)');
    hLine.addColorStop(0.5,  'rgba(100,240,180,0.14)');
    hLine.addColorStop(0.8,  'rgba(80,220,160,0.08)');
    hLine.addColorStop(1,    'rgba(80,220,160,0)');
    ctx.fillStyle = hLine;
    ctx.fillRect(0, H * 0.795, W, 2);
  }

  /* ─────────────────────────────────────
     DRAW — LIGHT DAY
  ───────────────────────────────────── */
  function drawLight(ts) {
    // Daytime sky gradient
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0,   '#4a90d9');
    bg.addColorStop(0.45,'#7ab8f5');
    bg.addColorStop(0.85,'#b8d9f5');
    bg.addColorStop(1,   '#ddeeff');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Sun
    const sx = W * 0.82, sy = H * 0.12;
    // Halo
    const sunHalo = ctx.createRadialGradient(sx, sy, 0, sx, sy, 110);
    sunHalo.addColorStop(0,   'rgba(255,245,180,0.35)');
    sunHalo.addColorStop(0.5, 'rgba(255,235,120,0.12)');
    sunHalo.addColorStop(1,   'rgba(255,220,80,0)');
    ctx.fillStyle = sunHalo;
    ctx.beginPath();
    ctx.arc(sx, sy, 110, 0, Math.PI*2);
    ctx.fill();
    // Sun disc
    const sunDisc = ctx.createRadialGradient(sx-4, sy-4, 0, sx, sy, 36);
    sunDisc.addColorStop(0,   'rgba(255,255,220,1)');
    sunDisc.addColorStop(0.5, 'rgba(255,240,100,1)');
    sunDisc.addColorStop(1,   'rgba(255,210,60,0.9)');
    ctx.fillStyle = sunDisc;
    ctx.beginPath();
    ctx.arc(sx, sy, 36, 0, Math.PI*2);
    ctx.fill();

    // Clouds
    CLOUDS.forEach(cl => {
      cl.x += cl.speed;
      if (cl.x - cl.w > W) cl.x = -cl.w;

      ctx.save();
      ctx.globalAlpha = cl.alpha;
      // Multiple overlapping ellipses = fluffy cloud
      const puffs = [
        { dx: 0,          dy: 0,          rx: cl.w*0.42, ry: cl.h*0.55 },
        { dx: -cl.w*0.22, dy: cl.h*0.10,  rx: cl.w*0.30, ry: cl.h*0.44 },
        { dx:  cl.w*0.22, dy: cl.h*0.08,  rx: cl.w*0.32, ry: cl.h*0.46 },
        { dx: -cl.w*0.38, dy: cl.h*0.22,  rx: cl.w*0.22, ry: cl.h*0.34 },
        { dx:  cl.w*0.38, dy: cl.h*0.20,  rx: cl.w*0.22, ry: cl.h*0.34 },
      ];
      puffs.forEach(p => {
        const cg = ctx.createRadialGradient(cl.x+p.dx, cl.y+p.dy, 0, cl.x+p.dx, cl.y+p.dy, p.rx);
        cg.addColorStop(0,   'rgba(255,255,255,1)');
        cg.addColorStop(0.6, 'rgba(240,246,255,0.85)');
        cg.addColorStop(1,   'rgba(220,235,255,0)');
        ctx.fillStyle = cg;
        ctx.save();
        ctx.scale(1, p.ry / p.rx);
        ctx.beginPath();
        ctx.arc(cl.x+p.dx, (cl.y+p.dy)*(p.rx/p.ry), p.rx, 0, Math.PI*2);
        ctx.fill();
        ctx.restore();
      });
      ctx.restore();
    });

    // Subtle horizon haze
    const haze = ctx.createLinearGradient(0, H*0.75, 0, H);
    haze.addColorStop(0, 'rgba(255,255,255,0)');
    haze.addColorStop(1, 'rgba(220,235,255,0.35)');
    ctx.fillStyle = haze;
    ctx.fillRect(0, H*0.75, W, H*0.25);
  }

  /* ─────────────────────────────────────
     RAF LOOP
     Night: 60fps cap  |  Aurora: uncapped (full fidelity)  |  Light: 30fps cap
  ───────────────────────────────────── */
  const FPS_CAP = { night: 60, aurora: 0, light: 30 }; // 0 = uncapped

  // Pause shoot timer when tab is hidden so stars don't accumulate
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      shootTimer = Math.max(shootTimer, rand(1500, 3000));
    } else {
      lastTs = performance.now();
      shootingStars.length = 0;
    }
  });

  function loop(ts) {
    const mode = SkyMode.name();
    const cap  = FPS_CAP[mode] ? 1000 / FPS_CAP[mode] : 0;
    // Clamp dt to 100ms max so tab-return doesn't cause a burst
    const dt   = Math.min(ts - lastTs, 100);

    if (cap === 0 || dt >= cap) {
      lastTs = ts;
      ctx.clearRect(0, 0, W, H);
      if (mode === 'night')  drawNight(ts, dt);
      if (mode === 'aurora') drawAurora(ts);
      if (mode === 'light')  drawLight(ts);
    }
    animId = requestAnimationFrame(loop);
  }

  window.addEventListener('scroll', () => { scrollY = window.scrollY; }, { passive: true });
  window.addEventListener('resize', resize, { passive: true });
  resize();
  animId = requestAnimationFrame(loop);
})();

/* ========================================
   BODY CLASS → CSS MODE THEMING
======================================== */

// Set initial mode class
document.body.classList.add('mode-night');

/* ========================================
   COUNTDOWN TIMER
======================================== */

(function initCountdown() {
  const el = document.getElementById('countdown');
  if (!el) return;
  const target = new Date('2026-06-27T09:00:00+05:30').getTime();

  function update() {
    const diff = target - Date.now();
    if (diff <= 0) { el.textContent = '✦ Event is Live! ✦'; return; }
    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    const m = Math.floor((diff % 3600000)  / 60000);
    const s = Math.floor((diff % 60000)    / 1000);
    const p = n => String(n).padStart(2,'0');
    el.textContent = `${d}d  ${p(h)}h  ${p(m)}m  ${p(s)}s`;
  }
  update();
  setInterval(update, 1000);
})();

/* ========================================
   MODAL SYSTEM
======================================== */

const eventDetails = {
  'Genesis Face-Off': {
    subtitle: 'Bible Quiz',
    details: [
      { heading: 'Rules', items: ['Portion: Book of Genesis', "Two participants per church", 'Questions will be asked in Tamil only', 'Prelims begin at 10:00 AM sharp'] }
    ]
  },
  'Gospel Unleashed': {
    subtitle: 'Participants: 2 per church',
    details: [
      { heading: 'Topics Covered', items: ['Bible Stories', 'Bible Characters', 'Bible Places', 'Bible Verses', 'Lyrics', 'General Christian Songs','Order of Service','Lectionary','Lutheran Traditions'] },
    ]
  },
  'Incandescent Voices': {
    subtitle: 'Rules',
    details: [
      { heading: '', items: [
        'Theme-based performance',
'Minimum 4 members per church',
'5 minutes including introduction',
'Karaoke is not allowed',
'Own composition carries extra marks',
'3 copies of lyrics must be submitted'] },
    ]
  },
  'Divine Dramatics': {
    subtitle: 'Participants: 1 per church',
    details: [
      { heading: 'Rules', items: ['Any biblical character can be portrayed',
'Time limit: 1 minute',
'Background music and pictures are allowed',
'Materials must be emailed on or before June 14',
'Email: radiance.ayf@gmail.com',
'Recorded vocals are strictly prohibited',
'Background dialogues are strictly prohibited'] },
    ]
  },
  'Heavenly Creation': {
    subtitle: 'Participants: 1 per church',
    details: [
      { heading: 'Rules', items: [
'A3 sheet will be provided',
'Participants must bring their own materials',
'Water colours and paints are not allowed',
'Gadgets are prohibited',
'References are prohibited',
'Pre-made sketches are prohibited',
'Tracing is prohibited',
'Artwork must be completed within 60 minutes'
  ] },
    ]
  },
};

(function initModals() {
  const modal      = document.getElementById('eventModal');
  const modalTitle = document.getElementById('modalTitle');
  const modalBody  = document.getElementById('modalBody');
  const closeBtn   = document.querySelector('.close');
  if (!modal) return;

  function openModal(name) {
    const data = eventDetails[name];
    if (!data) return;
    modalTitle.textContent = name;
    modalBody.innerHTML = '';
    const sub = document.createElement('p');
    sub.style.cssText = 'color:var(--accent);font-family:"Space Mono",monospace;font-size:0.72rem;letter-spacing:3px;text-transform:uppercase;margin-bottom:18px;';
    sub.textContent = data.subtitle;
    modalBody.appendChild(sub);
    data.details.forEach(sec => {
      const h = document.createElement('h3');
      h.textContent = sec.heading;
      modalBody.appendChild(h);
      const ul = document.createElement('ul');
      sec.items.forEach(item => {
        const li = document.createElement('li');
        li.textContent = item;
        ul.appendChild(li);
      });
      modalBody.appendChild(ul);
    });
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
    closeBtn && closeBtn.focus();
  }

  function closeModal() {
    modal.classList.remove('open');
    document.body.style.overflow = '';
  }

  document.querySelectorAll('.event-card').forEach(card => {
    card.addEventListener('click', () => openModal(card.dataset.event));
    card.setAttribute('tabindex', '0');
    card.setAttribute('role', 'button');
    card.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openModal(card.dataset.event); }
    });
  });

  closeBtn && closeBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && modal.classList.contains('open')) closeModal();
  });
})();

/* ========================================
   MOBILE NAV TOGGLE
======================================== */

(function initNav() {
  const toggle = document.querySelector('.menu-toggle');
  const navUl  = document.querySelector('nav ul');
  if (!toggle || !navUl) return;

  toggle.addEventListener('click', () => {
    navUl.classList.toggle('show');
    toggle.setAttribute('aria-expanded', navUl.classList.contains('show'));
  });

  navUl.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      navUl.classList.remove('show');
      toggle.setAttribute('aria-expanded', 'false');
    });
  });

  const nav = document.querySelector('nav');
  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 60);
  }, { passive: true });
})();

/* ========================================
   SCROLL REVEAL
======================================== */

(function initReveal() {
  const items = document.querySelectorAll('.reveal');
  if (!items.length) return;
  const io = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const siblings = [...entry.target.parentElement.querySelectorAll('.reveal')];
        entry.target.style.transitionDelay = `${siblings.indexOf(entry.target) * 0.07}s`;
        entry.target.classList.add('visible');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  items.forEach(el => io.observe(el));
})();
