// Prop art: one procedural pixel-art drawer per object type used in layouts.js. Each drawer paints in
// local coordinates (0,0 = top-left of the object's bounding box; y = height is the floor contact).
(function () {
  const P = PALETTE, OL = P.outline, A = WorldArt, T = A.types;
  const mix = A.mix, darken = A.darken, lighten = A.lighten;
  const sin = Math.sin;
  const dimmed = env => env.light.level < 0.99;
  const lampOn = (o, env) => o.state.off ? false : ((o.type === 'desk_lamp' || o.type === 'table_lamp' || o.type === 'bedside_lamp') ? true : (o.state.on || dimmed(env)));
  const seedOf = s => { let h = 2166136261; for (const ch of String(s)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return h >>> 0; };

  // Crisp 4px-tall micro bitmap font for tiny labels (door signs, price tags, pizza box).
  const MICRO = {
    O: ['.#.', '#.#', '#.#', '.#.'],
    P: ['##.', '#.#', '##.', '#..'],
    E: ['###', '##.', '#..', '###'],
    N: ['##.', '#.#', '#.#', '#.#'],
    S: ['.##', '#..', '..#', '##.'],
    H: ['#.#', '###', '#.#', '#.#'],
    U: ['#.#', '#.#', '#.#', '###'],
    T: ['###', '.#.', '.#.', '.#.'],
    I: ['#', '#', '#', '#'],
    Z: ['###', '..#', '.#.', '###'],
    A: ['.#.', '#.#', '###', '#.#'],
    B: ['##.', '##.', '#.#', '##.'],
    C: ['.##', '#..', '#..', '.##'],
    D: ['##.', '#.#', '#.#', '##.'],
    F: ['###', '##.', '#..', '#..'],
    L: ['#.', '#.', '#.', '##'],
    R: ['##.', '#.#', '##.', '#.#'],
    Y: ['#.#', '#.#', '.#.', '.#.'],
    $: ['.##', '##.', '.##', '##.'],
    '0': ['###', '#.#', '#.#', '###'],
    '1': ['.#', '##', '.#', '.#'],
    '2': ['##.', '..#', '.#.', '###'],
    '3': ['##.', '.#.', '..#', '##.'],
    '4': ['#.#', '###', '..#', '..#'],
    '5': ['###', '##.', '..#', '##.'],
    '6': ['.##', '###', '#.#', '###'],
    '7': ['###', '..#', '.#.', '.#.'],
    '8': ['###', '.#.', '#.#', '###'],
    '9': ['###', '#.#', '###', '..#']
  };
  function microMeasure(text) {
    const s = String(text).toUpperCase();
    let w = 0;
    for (let i = 0; i < s.length; i++) {
      const m = MICRO[s[i]];
      w += (m ? m[0].length : 2) + (i < s.length - 1 ? 1 : 0);
    }
    return w;
  }
  function microText(g, text, x, y, col) {
    let cx = Math.round(x);
    for (const raw of String(text).toUpperCase()) {
      const m = MICRO[raw];
      if (!m) { cx += 2; continue; }
      for (let r = 0; r < m.length; r++) {
        for (let c = 0; c < m[r].length; c++) {
          if (m[r][c] === '#') g.px(cx + c, Math.round(y) + r, col);
        }
      }
      cx += m[0].length + 1;
    }
  }
  function microTextC(g, text, cx, y, col) {
    microText(g, text, Math.round(cx - microMeasure(text) / 2), y, col);
  }

  // ---------------------------------------------------------------- Shared helpers
  function flower(g, x, y, kind, t) {
    const pr = P.props;
    if (kind === 'sunflower') {
      g.r(x - 2, y - 1, 5, 3, pr.sunflower); g.r(x - 1, y - 2, 3, 5, pr.sunflower);
      g.px(x - 2, y - 2, pr.sunflowerDark); g.px(x + 2, y + 2, pr.sunflowerDark);
      g.r(x - 1, y - 1, 3, 3, pr.sunCenter); g.px(x, y, '#3f2412');
    } else if (kind === 'peony') {
      g.r(x - 2, y - 1, 5, 3, pr.peony); g.r(x - 1, y - 2, 3, 5, pr.peony);
      g.r(x - 1, y - 1, 2, 2, pr.peonyLight); g.px(x + 1, y + 1, pr.peonyDark); g.px(x - 2, y + 1, pr.peonyDark);
    } else if (kind === 'tulip') {
      g.r(x - 1, y - 1, 3, 3, pr.tulip); g.px(x, y - 2, pr.tulip); g.px(x - 1, y - 2, lighten(pr.tulip, 0.2)); g.px(x + 1, y - 2, lighten(pr.tulip, 0.2));
      g.px(x + 1, y + 1, darken(pr.tulip, 0.25));
    } else if (kind === 'tulipY') {
      g.r(x - 1, y - 1, 3, 3, '#f2c94c'); g.px(x - 1, y - 2, '#f8e08a'); g.px(x + 1, y - 2, '#f8e08a'); g.px(x + 1, y + 1, '#c9a12e');
    } else if (kind === 'tulipP') {
      g.r(x - 1, y - 1, 3, 3, '#f39bb6'); g.px(x - 1, y - 2, '#fbd0dd'); g.px(x + 1, y - 2, '#fbd0dd'); g.px(x + 1, y + 1, '#d3678a');
    } else if (kind === 'daisy') {
      g.px(x, y - 1, '#fbf7f2'); g.px(x, y + 1, '#fbf7f2'); g.px(x - 1, y, '#fbf7f2'); g.px(x + 1, y, '#fbf7f2');
      g.px(x - 1, y - 1, '#e8e4dc'); g.px(x + 1, y + 1, '#e8e4dc');
      g.px(x, y, '#f4c430');
    } else if (kind === 'baby') {
      g.px(x, y, '#fbf7f2'); g.px(x + 1, y - 1, '#fbf7f2'); g.px(x - 1, y - 1, '#f3ece6');
    } else {
      g.r(x - 1, y - 1, 3, 3, '#e8574a'); g.px(x, y, '#f8b0a0');
    }
  }
  function stem(g, x0, y0, x1, y1) { g.line(x0, y0, x1, y1, P.props.leafDark); }
  function leaf(g, x, y, dir, c) {
    c = c || P.props.leaf;
    g.r(x, y, 2, 1, c); g.px(x + (dir > 0 ? 2 : -1), y - 1, c); g.px(x + (dir > 0 ? 1 : 0), y - 1, lighten(c, 0.2));
  }
  function bouquetHeads(g, cx, top, type, t) {
    const sway = Math.round(sin(t * 1.3) * 0.6);
    if (type === 'sunflower') {
      flower(g, cx - 3 + sway, top + 3, 'sunflower'); flower(g, cx + 3, top + 2, 'sunflower'); flower(g, cx + sway, top - 1, 'sunflower');
      leaf(g, cx - 6, top + 5, -1); leaf(g, cx + 5, top + 6, 1);
    } else if (type === 'peony') {
      flower(g, cx - 3, top + 3, 'peony'); flower(g, cx + 3 + sway, top + 3, 'peony'); flower(g, cx, top, 'peony');
      flower(g, cx - 5, top + 1, 'baby'); flower(g, cx + 5, top, 'baby');
      leaf(g, cx - 6, top + 6, -1); leaf(g, cx + 5, top + 6, 1);
    } else {
      flower(g, cx - 3, top + 3, 'peony'); flower(g, cx + 3, top + 2, 'tulip'); flower(g, cx + sway, top - 1, 'sunflower');
      flower(g, cx - 5, top, 'daisy'); flower(g, cx + 5, top + 5, 'baby'); flower(g, cx + 1, top + 4, 'tulipY');
      leaf(g, cx - 6, top + 6, -1); leaf(g, cx + 5, top + 7, 1);
    }
  }
  function potPlant(g, w, h, t, o, big) {
    const pot = '#b0654a', potL = '#c97a5c', potD = '#8a4a35';
    const ph = big ? 11 : 9;
    g.shadow(3, h - 2, w - 6);
    // Leaves (behind the pot rim).
    const cx = Math.floor(w / 2), base = h - ph, seed = seedOf(o.id), n = big ? 11 : 8;
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (i / (n - 1) - 0.5) * 2.4 + ((seed >> i) & 1) * 0.15;
      const len = (big ? 20 : 15) + ((seed >> (i + 3)) & 7) - (Math.abs(i - n / 2) < 2 ? -3 : 2);
      const sw = sin(t * 1.2 + i * 0.7 + seed % 7) * (0.5 + len / 30);
      const ex = cx + Math.cos(a) * len * 0.8 + sw, ey = base + Math.sin(a) * len;
      g.line(cx, base, ex, ey, P.props.leafDark);
      g.line(cx + 1, base, ex + 1, ey, P.props.leafDark);
      g.o(Math.round(ex) - 3, Math.round(ey) - 2, 7, 4, i % 2 ? P.props.leaf : mix(P.props.leaf, P.props.leafDark, 0.35));
      g.px(Math.round(ex) - 1, Math.round(ey) - 1, lighten(P.props.leaf, 0.3));
    }
    g.box(3, h - ph, w - 6, ph, pot, potL, potD);
    g.o(2, h - ph - 1, w - 4, 3, potL);
    g.r(3, h - ph, w - 6, 1, '#4a3324');
  }
  function clockFace(g, cx, cy, r, minutes, env) {
    g.disc(cx, cy, r, '#fbf7f2', OL);
    for (let i = 0; i < 12; i += 3) {
      const a = i / 12 * Math.PI * 2;
      g.px(Math.round(cx + Math.sin(a) * (r - 1)), Math.round(cy - Math.cos(a) * (r - 1)), '#4a3a4e');
    }
    const m = minutes % 60, hr = (minutes / 60) % 12;
    const am = m / 60 * Math.PI * 2, ah = hr / 12 * Math.PI * 2;
    g.line(cx, cy, cx + Math.sin(am) * (r - 1.5), cy - Math.cos(am) * (r - 1.5), OL);
    g.line(cx, cy, cx + Math.sin(ah) * (r - 3), cy - Math.cos(ah) * (r - 3), OL);
    const s = Math.floor(env.t) % 60, as = s / 60 * Math.PI * 2;
    g.px(Math.round(cx + Math.sin(as) * (r - 2)), Math.round(cy - Math.cos(as) * (r - 2)), '#d6455a');
    g.px(cx, cy, '#d6455a');
  }
  const CLOCK_BASE = { office: 17 * 60 + 58, kitchen: 19 * 60 + 40, hallway: 19 * 60 + 40, living: 19 * 60 + 40, bedroom: 22 * 60 + 15 };
  function minutesNow(env) { return (A.clockMinutes != null ? A.clockMinutes : (CLOCK_BASE[env.room] || 18 * 60)) + env.t / 60; }

  function skyColors(env) {
    const lv = env.light.level, m = env.light.mode;
    if (m === 'night' || m === 'dark') return ['#141a3a', '#1f2a55', '#2d3a6e'];
    if (m === 'evening') return [mix('#2d3566', '#6a4a7a', lv), mix('#6a4a7a', '#d9776a', lv), mix('#8c4f7a', '#f2b37a', lv)];
    if (m === 'sunset') return ['#8c4f7a', '#e2775f', '#f6b26b'];
    return ['#8fc4e8', '#a8d4ee', '#cfe8f4'];
  }
  function skyPane(g, x, y, w, h, env) {
    const c = skyColors(env);
    const b1 = Math.floor(h / 3), b2 = Math.floor(h * 2 / 3);
    g.r(x, y, w, b1, c[0]); g.r(x, y + b1, w, b2 - b1, c[1]); g.r(x, y + b2, w, h - b2, c[2]);
    for (let i = 0; i < w; i += 2) { g.px(x + i, y + b1, c[0]); g.px(x + i + 1, y + b2, c[1]); }
    const m = env.light.mode;
    if (m === 'night' || m === 'dark') {
      g.px(x + 3, y + 2, '#f3efd8'); g.px(x + w - 5, y + 4, '#f3efd8'); g.px(x + Math.floor(w / 2), y + 1, '#c9cff0');
      if (w > 20) { g.disc(x + w - 8, y + 6, 2, '#f3efd8'); g.px(x + w - 7, y + 5, c[1]); }
    }
  }

  // ================================================================= OFFICE
  T.office_desk = (g, w, h, o) => {
    const c = P.office, pen = o.variant === 'penguin';
    const wood = pen ? '#6f4a34' : c.wood, sh = pen ? '#523525' : c.woodShade, li = pen ? '#8c6247' : c.woodLight;
    const fy = h - 9;
    g.shadow(2, h - 2, w - 4);
    g.sq(3, fy + 2, 6, h - fy - 2, sh); g.r(4, fy + 3, 1, h - fy - 4, wood);
    const px = w - 27;
    g.sq(px, fy + 2, 25, h - fy - 2, wood);
    g.r(px + 1, fy + 5, 23, 1, OL); g.r(px + 10, fy + 3, 5, 1, li); g.r(px + 10, fy + 6, 5, 1, li);
    g.r(9, fy + 2, px - 9, 4, darken(sh, 0.35));
    g.box(0, 0, w, fy + 3, wood, li, sh);
    const R = A.rng(seedOf(o.id));
    for (let i = 0; i < 9; i++) g.r(3 + Math.floor(R() * (w - 18)), 3 + Math.floor(R() * (fy - 4)), 6 + Math.floor(R() * 10), 1, R() < 0.5 ? li : mix(wood, sh, 0.5));
    g.r(1, fy, w - 2, 2, sh);
    if (pen) { g.o(Math.floor(w / 2) - 9, fy - 6, 18, 5, '#e6c46a'); g.r(Math.floor(w / 2) - 7, fy - 4, 14, 1, '#8a6a2a'); }
  };
  T.office_chair = (g, w, h, o) => {
    const pen = o.variant === 'penguin';
    const col = pen ? '#2d3142' : '#3d4a6e', li = pen ? '#454a60' : '#566592', sh = pen ? '#1f2230' : '#2b3550';
    g.shadow(3, h - 2, w - 6);
    g.r(4, h - 3, w - 8, 1, OL); g.r(3, h - 3, 3, 3, OL); g.r(w - 6, h - 3, 3, 3, OL); g.r(Math.floor(w / 2) - 1, h - 3, 3, 3, OL);
    g.r(Math.floor(w / 2) - 1, h - 9, 3, 6, P.office.metalShade); g.r(Math.floor(w / 2) - 1, h - 9, 1, 6, OL);
    g.box(2, h - 13, w - 4, 5, col, li, sh);
    g.box(4, 3, w - 8, 12, col, li, sh);
    g.r(6, 5, w - 12, 1, li);
    g.r(Math.floor(w / 2) - 2, 15, 5, 2, sh);
  };
  T.office_monitor = (g, w, h, o, env) => {
    const beige = o.variant === 'beige';
    const frame = beige ? P.bedroom.crt : '#3a3f4a', frameS = beige ? P.bedroom.crtShade : '#262a33';
    const sh = h - 5, cx = Math.floor(w / 2);
    g.r(cx - 2, sh, 4, 3, frameS); g.o(cx - 6, h - 3, 12, 3, frame);
    g.box(0, 0, w, sh, frame, lighten(frame, 0.2), frameS);
    const on = !o.state.off;
    const scr = beige ? (o.state.on ? P.bedroom.crtScreen : '#20302e') : (on ? P.office.screen : '#1c1f26');
    g.r(2, 2, w - 4, sh - 4, scr);
    if (on && !beige) {
      const R = A.rng(seedOf(o.id));
      for (let y = 3; y < sh - 3; y += 2) g.r(3, y, 2 + Math.floor(R() * (w - 9)), 1, R() < 0.3 ? '#f0a6b8' : P.office.screenGlow);
      if (Math.floor(env.t * 2) % 2) g.r(w - 6, sh - 5, 2, 1, '#fbf7f2');
    } else if (beige && o.state.on) {
      for (let y = 3; y < sh - 3; y += 3) g.r(3, y, w - 8 - (y * 3) % 9, 1, P.bedroom.crtGlow);
    } else {
      g.line(3, sh - 4, 7, 3, 'rgba(255,255,255,0.12)');
    }
    g.px(w - 3, sh - 2, on ? '#7fd48a' : '#55505e');
  };
  T.keyboard = (g, w, h, o) => {
    const beige = o.variant === 'beige';
    const col = beige ? P.bedroom.crt : '#4a4f5a', key = beige ? lighten(P.bedroom.crt, 0.4) : '#7a8090';
    g.o(0, 0, w, h, col);
    for (let y = 1; y < h - 1; y += 2) for (let x = 2; x < w - 2; x += 2) g.px(x, y, key);
    if (h > 5) g.r(Math.floor(w / 2) - 5, h - 2, 10, 1, key);
  };
  T.desk_mouse = (g, w, h) => {
    g.px(2, 0, '#3a3f4a');
    g.o(0, 1, w, h - 1, '#5a6070');
    g.px(1, 2, '#9aa3ad');
    g.px(Math.floor(w / 2), 1, OL);
  };
  T.desk_lamp = (g, w, h, o, env) => {
    const studio = o.variant === 'studio';
    const col = studio ? '#c2453f' : '#3a3f5a', li = studio ? '#e06a5a' : '#566592';
    const on = lampOn(o, env);
    if (on) {
      for (let y = 7; y < h - 1; y++) {
        const k = (y - 7) / Math.max(1, h - 8);
        const lx = Math.round(-k * 5), lw = 9 + Math.round(k * 9);
        g.r(lx, y, lw, 1, k < 0.45 ? 'rgba(255,244,185,0.42)' : 'rgba(255,232,155,0.24)');
      }
      g.r(-4, h - 2, 16, 2, 'rgba(255,245,195,0.45)');
    }
    g.o(2, h - 3, 9, 3, col); g.r(3, h - 3, 7, 1, li);
    g.line(7, h - 3, 9, h - 11, OL); g.line(8, h - 3, 10, h - 11, col);
    g.line(9, h - 11, 4, 4, OL); g.line(10, h - 11, 5, 4, col);
    g.px(9, h - 11, '#c3cad2');
    g.o(0, 1, 8, 5, col); g.r(1, 2, 6, 1, li);
    g.r(1, 5, 6, 1, on ? '#ffe89e' : darken(col, 0.35));
    g.r(2, 6, 4, 1, on ? '#fffbe6' : '#6a6d7a');
  };
  T.paper_stack = (g, w, h, o) => {
    // Pile of messy staggered office papers slightly askew on Roni's desk
    g.r(1, h - 2, w - 2, 2, 'rgba(20,14,24,0.28)');
    g.o(0, 3, w - 3, h - 4, '#dcd6ca');
    g.o(3, 2, w - 3, h - 4, '#ede8de');
    g.o(1, 1, w - 4, h - 4, '#f5f0e6');
    g.o(2, 0, w - 3, h - 5, '#fbf7f2');
    // Loose sheet corner & scribbles
    g.r(w - 5, 1, 3, 2, '#f3ede0');
    g.r(4, 1, 6, 1, '#8c96a4');
    g.r(4, 3, 7, 1, '#b6bfc9');
    g.r(3, 5, 5, 1, '#8c96a4');
    // Sticky note tabs poking out
    g.r(w - 4, 3, 3, 2, '#f2d16b');
    if (!o.state.read) g.r(1, 2, 2, 2, '#d6455a');
  };
  T.work_bag = (g, w, h) => {
    const pr = P.props;
    g.shadow(1, h - 2, w - 2);
    g.r(6, 2, 6, 1, OL); g.r(5, 3, 1, 5, OL); g.r(12, 3, 1, 5, OL);
    g.r(6, 3, 6, 1, pr.bagStrap); g.r(6, 4, 1, 4, pr.bagStrap); g.r(11, 4, 1, 4, pr.bagStrap);
    g.box(0, 7, w, h - 7, pr.bag, pr.bagLight, pr.bagShade);
    g.r(1, 8, w - 2, 5, pr.bagShade); g.r(1, 13, w - 2, 1, OL);
    g.r(8, 12, 2, 3, '#e6c46a'); g.px(8, 12, '#fff3c4');
    g.r(2, h - 3, w - 4, 1, darken(pr.bag, 0.3));
  };
  T.wastebasket = (g, w, h, o) => {
    const c = P.office;
    g.shadow(1, h - 2, w - 2);
    g.box(1, 4, w - 2, h - 4, c.metalShade, null, darken(c.metalShade, 0.3));
    for (let x = 3; x < w - 2; x += 2) g.r(x, 6, 1, h - 8, c.metal);
    g.o(0, 3, w, 3, c.metalLight);
    if (!o.state.emptied) { g.disc(4, 3, 2, '#fbf7f2', OL); g.disc(8, 2, 2, '#e8e4dc', OL); g.px(8, 2, '#c3cad2'); }
  };
  T.coaster = (g, w, h) => {
    g.ellipse(Math.floor(w / 2), h - 2, Math.floor(w / 2) - 1, 1, '#9a7248');
    g.ellipse(Math.floor(w / 2), h - 2, Math.floor(w / 2) - 2, 1, '#b88a5a');
  };
  T.pen_holder = (g, w, h) => {
    g.box(1, 3, w - 2, h - 3, '#4a5b78', '#6a7d9e', '#334058');
    g.line(2, 4, 1, 0, '#e6c46a');
    g.line(4, 4, 4, 1, '#3f7a52');
    g.line(w - 3, 4, w - 2, 0, '#c2453f');
    g.r(w - 2, 0, 1, 1, '#fbf7f2');
  };
  T.desk_plant = (g, w, h, o) => {
    g.box(1, h - 5, w - 2, 5, '#b86b4a', '#d48462', '#8c4e33');
    g.r(2, h - 5, w - 4, 1, '#5a3a22');
    if (o && o.variant === 'succulent') {
      g.disc(Math.floor(w / 2), h - 6, 3, '#5b8a54', OL);
      g.disc(Math.floor(w / 2), h - 7, 2, '#7eb075');
      g.px(Math.floor(w / 2), h - 7, '#a2d698');
    } else {
      g.disc(Math.floor(w / 2), h - 6, 3, '#4f7a4c', OL);
      g.disc(Math.floor(w / 2) - 1, h - 7, 2, '#6ea066');
      g.px(Math.floor(w / 2) + 1, h - 7, '#96c888');
    }
  };
  T.photo_frame = (g, w, h) => {
    g.o(0, 0, w, h, '#7c5836', OL);
    g.r(1, 1, w - 2, h - 2, '#fbf7f2');
    g.r(2, 2, w - 4, h - 4, '#5a789e');
    g.px(3, 3, '#e6d8a2');
    g.r(3, h - 3, 2, 1, '#4a5e42');
  };
  T.calendar = (g, w, h) => {
    g.box(0, 0, w, h, '#f4eee0', '#ffffff', '#d6cdbd');
    g.r(0, 0, w, 5, '#c2453f');
    g.textC('NOV', Math.floor(w / 2), 1, '#ffffff');
    for (let y = 7; y < h - 4; y += 4) {
      for (let x = 2; x < w - 2; x += 3) g.px(x, y, '#6a7082');
    }
    g.o(Math.floor(w / 2) - 2, 11, 5, 5, null, '#c2453f');
    g.px(Math.floor(w / 2), 13, '#c2453f');
  };
  T.tripod_camera = (g, w, h, o, env) => {
    const cx = Math.floor(w / 2);
    // Tripod legs extending down
    g.line(cx, 10, 2, h - 1, '#5a483a');
    g.line(cx, 10, cx, h - 1, '#7a6452');
    g.line(cx, 10, w - 3, h - 1, '#5a483a');
    // Camera body
    g.box(3, 4, 12, 7, '#2a2624', '#4a4440', '#181615');
    // Lens facing north/up towards subjects
    g.o(cx - 3, 1, 6, 4, '#3a3836', OL);
    g.disc(cx, 2, 2, '#486884');
    g.px(cx, 2, '#8ec0e4');
    // Blinking timer indicator
    if (o.state.timer) {
      const bl = Math.sin((env.t || 0) * 12) > 0;
      g.px(w - 5, 5, bl ? '#ff3b30' : '#701010');
    }
  };
  T.hanging_basket = (g, w, h, o, env) => {
    const cx = Math.floor(w / 2);
    g.line(cx, 0, 3, 16, '#9a8a72');
    g.line(cx, 0, w - 4, 16, '#9a8a72');
    g.ellipse(cx, 18, 6, 3, '#8a6242');
    const sw = Math.round(Math.sin((env.t || 0) * 1.5 + (o.x || 0)) * 0.8);
    g.r(3 + sw, 16, 3, 8, '#4f7a4c');
    g.r(w - 6 - sw, 17, 3, 9, '#3d6148');
    flower(g, cx - 3, 15, 'peony');
    flower(g, cx + 3, 14, 'tulipP');
    flower(g, cx + sw, 19, 'daisy');
  };
  T.wall_flower_rack = (g, w, h) => {
    g.r(0, 16, w, 3, '#7a5438'); g.r(0, 34, w, 3, '#7a5438');
    flower(g, 15, 12, 'sunflower'); flower(g, 35, 12, 'peony'); flower(g, 55, 12, 'tulip');
    flower(g, 75, 12, 'tulipY'); flower(g, 95, 12, 'peony'); flower(g, 110, 12, 'daisy');
    flower(g, 20, 30, 'peony'); flower(g, 45, 30, 'sunflower'); flower(g, 70, 30, 'tulipP');
    flower(g, 90, 30, 'daisy'); flower(g, 105, 30, 'sunflower');
  };
  T.mug = (g, w, h, o, env) => {
    g.o(0, 1, 5, 5, '#fbf7f2'); g.r(1, 1, 3, 1, '#6b3f1f'); g.r(5, 2, 1, 2, OL); g.r(1, 4, 3, 1, '#c2453f');
    const k = (env.t * 1.5) % 3;
    g.px(2 + Math.round(sin(env.t * 3)), Math.round(-k), 'rgba(255,255,255,0.45)');
  };
  T.filing_cabinet = (g, w, h, o) => {
    const c = P.office;
    g.shadow(1, h - 2, w - 2);
    g.box(0, 5, w, h - 5, c.metal, c.metalLight, c.metalShade);
    g.o(0, 0, w, 7, c.metalLight); g.r(2, 2, w - 4, 1, '#e1e6ea');
    for (let i = 0; i < 3; i++) {
      const y = 8 + i * 12 + (o.state.open && i === 1 ? 2 : 0);
      g.o(2, y, w - 4, 11, c.metal);
      g.r(3, y + 1, w - 6, 1, c.metalLight);
      g.r(9, y + 6, 9, 2, c.metalShade); g.r(9, y + 6, 9, 1, OL);
      g.sq(10, y + 2, 7, 3, '#fbf7f2', c.metalShade);
    }
    g.r(2, h - 3, w - 4, 1, c.metalShade);
  };
  T.water_cooler = (g, w, h, o, env) => {
    g.shadow(1, h - 2, w - 2);
    g.o(2, 0, 10, 12, '#9fd0f0'); g.r(3, 1, 2, 9, '#d4ecfa'); g.r(3, 3, 8, 8, '#7fbbe0'); g.r(3, 3, 8, 1, '#b8e0f6');
    const b = (env.t * 6) % 8;
    g.px(8, 10 - Math.floor(b), '#e6f6ff');
    g.r(5, 11, 4, 2, '#5f8fb5');
    g.box(1, 12, 12, h - 12, '#e8ecef', '#fbf7f2', '#c4cbd1');
    g.r(3, 16, 2, 2, '#4a6fa5'); g.r(9, 16, 2, 2, '#d6455a');
    g.r(3, 21, 8, 2, '#9aa3ad'); g.r(3, 21, 8, 1, OL);
  };
  T.tall_plant = (g, w, h, o, env) => potPlant(g, w, h, env.t, o, o.variant === 'big');
  T.office_window = (g, w, h, o, env) => {
    const frame = '#e8ecef', frameS = '#b6bbc0';
    g.sq(0, 0, w, h, frame);
    skyPane(g, 2, 2, w - 4, h - 6, env);
    // Distant skyline silhouette and sun glare through the glass.
    const R = A.rng(seedOf(o.id));
    let x = 2;
    const sil = env.light.level > 0.5 ? '#6a4a6e' : '#1a1f3a';
    while (x < w - 2) { const bw = 6 + Math.floor(R() * 10), bh = 8 + Math.floor(R() * 18); g.r(x, h - 4 - bh, Math.min(bw, w - 2 - x), bh, sil); if (env.light.level < 0.6) g.px(x + 2, h - bh, '#f6c66a'); x += bw + 1; }
    if (env.light.level > 0.5) { g.r(4, 4, 1, h - 12, 'rgba(255,255,255,0.18)'); g.line(10, h - 8, 22, 4, 'rgba(255,240,200,0.18)'); }
    for (let i = 1; i < 3; i++) g.r(Math.floor(i * w / 3), 2, 2, h - 6, frame);
    g.r(2, Math.floor(h / 2) - 1, w - 4, 1, frameS);
    // Rolled venetian blind.
    g.r(1, 1, w - 2, 5, '#d9d0c0'); for (let y = 2; y < 6; y += 2) g.r(1, y, w - 2, 1, '#b9ae93');
    g.r(0, h - 4, w, 4, frameS); g.r(0, h - 4, w, 1, '#fbf7f2'); g.r(0, h - 1, w, 1, OL);
  };
  T.noticeboard = (g, w, h, o) => {
    g.sq(0, 0, w, h, P.office.wood); g.r(1, 1, w - 2, 1, P.office.woodLight);
    g.r(2, 2, w - 4, h - 4, '#c9a06a');
    const R = A.rng(seedOf(o.id));
    for (let i = 0; i < 40; i++) g.px(3 + Math.floor(R() * (w - 6)), 3 + Math.floor(R() * (h - 6)), '#b08a58');
    const notes = [[4, 4, 10, 8, '#fbf7f2'], [16, 3, 9, 9, '#f2d16b'], [27, 5, 9, 7, '#9fd6ff'], [6, 15, 12, 10, '#f1b7c6'], [21, 15, 14, 9, '#fbf7f2']];
    for (const [x, y, nw, nh, col] of notes) {
      g.r(x + 1, y + 1, nw, nh, 'rgba(40,20,30,0.25)');
      g.r(x, y, nw, nh, col);
      for (let ly = y + 2; ly < y + nh - 1; ly += 2) g.r(x + 1, ly, nw - 3, 1, '#9aa3ad');
      g.px(x + Math.floor(nw / 2), y, '#d6455a');
    }
  };
  T.wall_clock = (g, w, h, o, env) => {
    const r = Math.floor(w / 2) - 1;
    clockFace(g, Math.floor(w / 2), Math.floor(h / 2), r, minutesNow(env), env);
  };
  T.desk_organizer = (g, w, h) => {
    g.box(0, 3, w, h - 3, '#7a5136', '#9b6b46', '#593a26');
    g.r(2, 0, 1, 4, '#3a7ab8');
    g.r(4, -1, 1, 5, '#c2453f');
    g.r(6, 1, 1, 3, '#e6c46a');
    g.r(8, 2, 4, 3, '#f6e27a');
    g.r(8, 2, 4, 1, '#fff5a8');
    g.r(13, 1, 2, 3, '#3d3945');
    g.r(12, 3, 4, 2, '#8a5a3a');
  };
  T.elevator = (g, w, h, o, env) => {
    const c = P.office, open = Math.max(0, Math.min(1, o.state.openAmt || 0));
    g.sq(0, 0, w, h, c.metalShade);
    g.r(1, 1, w - 2, h - 2, c.metal);
    // Floor indicator: G2, G1, L, M, 1, 2, 3; arrow hidden at G2 and 3.
    const fl = o.state.floor != null ? String(o.state.floor) : 'G2';
    g.sq(8, 2, 19, 7, '#1a1420');
    g.text(fl, fl.length > 1 ? 10 : 12, 3, '#f2a65a');
    if (o.state.dir === 'down') {
      g.r(20, 3, 5, 1, '#f2a65a');
      g.r(21, 4, 3, 1, '#f2a65a');
      g.px(22, 5, '#f2a65a');
    } else if (o.state.dir === 'up') {
      g.px(22, 3, '#f2a65a');
      g.r(21, 4, 3, 1, '#f2a65a');
      g.r(20, 5, 5, 1, '#f2a65a');
    }
    // Warm wood-paneled car interior visible clearly as doors slide apart.
    const dx = 4, dy = 11, dw = 22, dh = h - dy - 1;
    g.r(dx, dy, dw, dh, '#6b4a36');
    g.r(dx, dy, dw, 4, '#d9cdb5');
    g.r(dx + 2, dy + 2, dw - 4, 1, '#fff6dc');
    g.r(dx, dy + 4, 2, dh - 12, '#4a3224');
    g.r(dx + dw - 2, dy + 4, 2, dh - 12, '#4a3224');
    g.r(dx + 2, dy + 27, dw - 4, 2, '#c9a24a');
    g.r(dx, dy + dh - 8, dw, 8, '#8a8478');
    // Sliding steel doors clipped smoothly to the doorway opening.
    const half = Math.round(dw / 2 * (1 - open));
    if (half > 0) {
      const lx = dx, rx = dx + dw - half;
      g.r(lx, dy, half, dh, c.metal);
      g.r(lx, dy, Math.max(0, half - 1), 2, c.metalLight);
      g.r(lx + half - 1, dy, 1, dh, OL);
      if (half > 4) g.o(lx + 2, dy + 4, half - 4, dh - 8, c.metalLight, c.metalShade);

      g.r(rx, dy, half, dh, c.metal);
      g.r(rx + 1, dy, Math.max(0, half - 1), 2, c.metalLight);
      g.r(rx, dy, 1, dh, OL);
      if (half > 4) g.o(rx + 2, dy + 4, half - 4, dh - 8, c.metalLight, c.metalShade);
    }
    g.sq(dx - 1, dy - 1, dw + 2, dh + 2, null, OL);
    g.r(dx, dy, dw, 1, OL);
    // Call button panel (solid indicator without distracting light animation).
    g.sq(28, 34, 5, 11, c.metalShade);
    g.px(30, 37, '#9aa3ad');
    g.px(30, 41, (o.state.called || open > 0.05) ? '#f2a65a' : '#e1e6ea');
  };
  T.exit_sign = (g, w, h, o, env) => {
    g.o(0, 0, w, h, '#3f8a52'); g.r(1, 1, w - 2, 1, '#5fb070');
    g.textC('EXIT', Math.floor(w / 2) + 1, 2, '#fbf7f2');
    g.px(3, 4, '#fbf7f2'); g.r(2, 4, 1, 1, '#fbf7f2');
  };

  // ================================================================= STREET
  T.streetlamp = (g, w, h, o, env) => {
    const post = P.street.lampPost, li = lighten(post, 0.25);
    let on = lampOn(o, env);
    if (on && (o.variant === 'flicker' || o.state.flicker)) {
      const n = sin(env.t * 31) * sin(env.t * 7.7) * sin(env.t * 2.3 + o.x);
      if (n > 0.55 || (o.state.flicker && n > 0.2)) on = false;
    }
    g.shadow(2, h - 2, 8);
    g.o(2, h - 5, 8, 5, post); g.r(3, h - 4, 6, 1, li);
    g.o(3, h - 9, 6, 5, post);
    g.r(4, 12, 4, h - 20, OL); g.r(5, 12, 2, h - 20, post); g.r(5, 12, 1, h - 20, li);
    g.o(3, Math.floor(h / 2), 6, 3, post); g.o(3, 13, 6, 3, post);
    g.r(1, 11, 10, 2, post); g.r(1, 11, 10, 1, OL);
    g.o(2, 3, 8, 9, on ? P.street.lampLight : '#5a6070');
    g.r(4, 4, 1, 7, post); g.r(7, 4, 1, 7, post);
    if (on) g.r(5, 5, 2, 5, '#fffbe6');
    g.r(1, 1, 10, 3, post); g.r(1, 1, 10, 1, OL); g.px(5, 0, OL); g.px(6, 0, OL);
  };
  T.storefront = (g, w, h, o, env) => {
    const c = P.street, lit = dimmed(env);
    // Fascia and sign.
    g.r(0, 0, w, 22, '#6e5a7a'); g.r(0, 0, w, 1, OL);
    for (let x = 6; x < w - 6; x += 22) { g.sq(x, 4, 14, 14, OL); g.r(x + 1, 5, 12, 12, lit ? '#f6c66a' : '#3a4466'); g.r(x + 7, 5, 1, 12, OL); }
    g.o(4, 22, w - 8, 11, '#3b2a4a'); g.r(5, 23, w - 10, 1, '#5a4a6e');
    g.textC('MOON BAKERY', Math.floor(w / 2), 25, '#f2d16b');
    g.disc(10, 27, 2, '#f2d16b'); g.px(11, 26, '#3b2a4a');
    // Striped awning with scalloped edge.
    for (let x = 0; x < w; x += 8) { g.r(x, 33, 4, 6, '#f1e3c4'); g.r(x + 4, 33, 4, 6, '#8a5a3a'); }
    g.r(0, 33, w, 1, OL);
    for (let x = 0; x < w; x += 4) { g.r(x, 39, 3, 1, x % 8 ? '#8a5a3a' : '#f1e3c4'); g.px(x + 1, 40, x % 8 ? '#8a5a3a' : '#f1e3c4'); g.px(x + 3, 39, OL); }
    // Shop front body.
    g.r(0, 39, w, h - 39, '#d9c3a0'); g.r(0, 39, 2, h - 39, OL); g.r(w - 2, 39, 2, h - 39, OL);
    // Display window.
    g.sq(5, 43, 56, 30, '#6b4a33');
    g.r(6, 44, 54, 28, lit ? '#f8d9a0' : '#e8c48c');
    g.r(6, 44, 54, 6, lit ? '#f6c66a' : '#d9a86c');
    g.r(8, 58, 50, 2, '#8a5a3a'); g.r(8, 68, 50, 2, '#8a5a3a');
    const loaf = (x, y) => { g.o(x, y, 8, 4, '#c98a4a'); g.r(x + 1, y + 1, 6, 1, '#e0a868'); g.px(x + 2, y + 2, '#a8673a'); g.px(x + 5, y + 2, '#a8673a'); };
    loaf(10, 54); loaf(20, 54); g.disc(36, 55, 3, '#e6c4a0', OL); g.r(34, 53, 5, 1, '#f39bb6'); loaf(44, 54);
    g.o(12, 64, 9, 4, '#f3e6d0'); g.r(13, 63, 7, 1, '#f39bb6'); g.o(26, 63, 7, 5, '#a8673a'); g.r(27, 63, 5, 1, '#6b3f1f'); g.o(40, 64, 12, 4, '#e0a868');
    g.r(7, 45, 1, 26, 'rgba(255,255,255,0.4)'); g.line(14, 70, 26, 46, 'rgba(255,255,255,0.22)');
    // Door.
    g.sq(66, 42, 22, h - 44, '#6b4a33');
    g.r(67, 43, 20, h - 46, '#4a6f8a'); g.r(69, 45, 16, 16, lit ? '#f8d9a0' : '#9fc4e0');
    g.o(67, 49, 20, 8, '#fbf7f2'); g.px(76, 48, OL);
    microTextC(g, o.state.closed ? 'SHUT' : 'OPEN', 77, 51, o.state.closed ? '#c2453f' : '#5f8a5a');
    g.px(84, 62, '#e6c46a');
    // Stone base.
    g.r(0, h - 4, w, 4, c.sidewalkShade); g.r(0, h - 4, w, 1, c.sidewalkLight); g.r(0, h - 1, w, 1, OL);
  };
  T.bus_stop = (g, w, h, o, env) => {
    const frame = '#2b3144', frameL = '#4e5a7a', lit = dimmed(env);
    g.shadow(2, h - 2, w - 4);
    g.r(2, 4, 3, h - 4, OL); g.r(3, 4, 1, h - 5, frameL);
    g.r(w - 5, 4, 3, h - 4, OL); g.r(w - 4, 4, 1, h - 5, frameL);
    g.r(Math.floor(w / 2) - 1, 4, 2, h - 4, OL);
    g.r(5, 7, w - 10, h - 18, lit ? 'rgba(215,232,255,0.32)' : 'rgba(190,220,240,0.25)');
    g.line(8, h - 14, 22, 8, 'rgba(255,255,255,0.32)');
    g.line(36, h - 14, 50, 8, 'rgba(255,255,255,0.2)');

    // 1. Advert Billboard (Left Bay) - strictly fitted inside 20px card
    g.sq(6, 8, 22, 30, '#1c1f2e');
    g.r(7, 9, 20, 28, lit ? '#fff3dd' : '#f9ede0');
    g.r(7, 9, 20, 6, '#3d6148');
    g.textC('BLOOM', 17, 10, '#fbf7f2');
    g.disc(17, 20, 4, '#e8788a');
    g.disc(17, 20, 2, '#fff1a8');
    g.r(16, 24, 2, 4, '#4f7a4c');
    g.r(9, 30, 16, 1, '#6a5a4a');
    g.r(10, 32, 14, 1, '#8a7a68');
    g.r(11, 34, 12, 1, '#b8a898');

    // 2. Accurate Transit Timetable & Digital Display (Right Bay) - cleanly padded inside frames
    const nightMode = env.light.mode === 'night';
    g.sq(34, 7, 28, 9, '#14141c');
    g.r(35, 8, 26, 7, '#0b0b12');
    g.textC(nightMode ? 'N12:2M' : '12:4M', 48, 9, nightMode ? '#8fd3c4' : '#f2a65a');

    g.sq(34, 17, 28, 24, '#232838');
    g.r(35, 18, 26, 22, '#fdfcf9');
    g.r(36, 19, 11, 7, '#39609c'); g.textC(nightMode ? 'N12' : '12', 42, 20, '#ffffff');
    g.r(49, 19, 11, 7, '#c2453f'); g.textC('14', 55, 20, '#ffffff');
    g.r(36, 27, 24, 1, '#dce0ea');
    // Readable arrival times neatly aligned below badges
    g.r(36, 29, 2, 3, '#39609c'); g.text(nightMode ? '18:52' : '18:35', 40, 28, '#2a344a');
    g.r(36, 35, 2, 3, '#c2453f'); g.text(nightMode ? '19:08' : '18:48', 40, 34, '#5a6884');

    // Shelter Bench
    g.o(8, h - 14, w - 16, 4, '#8a5a38');
    g.r(9, h - 14, w - 18, 1, '#b0784e');
    g.r(12, h - 10, 2, 9, OL);
    g.r(Math.floor(w / 2) - 1, h - 10, 2, 9, OL);
    g.r(w - 14, h - 10, 2, 9, OL);

    // Roof & Transit Roundel (smaller BUS font centered horizontally and vertically inside circle)
    g.o(0, 0, w, 7, frame);
    g.r(1, 1, w - 2, 1, frameL);
    g.r(1, 5, w - 2, 1, '#151822');
    if (lit) g.r(6, 7, w - 12, 1, '#e8f2ff');
    const rcx = w - 9, rcy = -4;
    g.disc(rcx, rcy, 6, '#c2453f', OL);
    g.r(rcx - 7, rcy - 3, 15, 6, '#2a3b68');
    microText(g, 'BUS', rcx - Math.floor(microMeasure('BUS') / 2), rcy - 2, '#ffffff');
    g.r(rcx - 1, 2, 2, 1, OL);
  };
  T.bench = (g, w, h) => {
    const wood = '#9b6b46', woodL = '#b8875d', woodS = '#764e32', iron = '#2d3142';
    g.shadow(2, h - 2, w - 4);
    // Vertical iron backrest posts behind wooden slats (front-facing POV).
    g.r(4, 0, 2, 8, iron); g.r(Math.floor(w / 2) - 1, 0, 2, 8, iron); g.r(w - 6, 0, 2, 8, iron);
    g.o(2, 0, w - 4, 4, wood); g.r(3, 1, w - 6, 1, woodL);
    g.o(2, 4, w - 4, 3, wood); g.r(3, 5, w - 6, 1, woodL);
    // Forward-facing seat plank + overhanging lip + front legs.
    g.o(1, 8, w - 2, 4, wood); g.r(2, 9, w - 4, 1, woodL); g.r(2, 11, w - 4, 1, woodS);
    g.r(0, 6, 3, 4, iron); g.r(w - 3, 6, 3, 4, iron);
    for (const x of [3, w - 6]) { g.r(x, 11, 2, h - 11, iron); g.r(x - 1, h - 2, 4, 2, iron); }
  };
  T.flower_shop_front = (g, w, h, o, env) => {
    const green = '#4f7a4c', greenL = '#6a9764', greenD = '#3a5c38', cream = '#f4ecdc';
    const shopOff = !!o.state.lightsOff, lit = dimmed(env) && !shopOff, closed = !!o.state.closed;
    // Standalone sloped cottage florist roof (no building stacked on top).
    const roofCol = '#4c6652', roofLight = '#66846d', roofShade = '#334839';
    for (let y = 8; y < 27; y++) {
      const inset = Math.max(0, Math.round((25 - y) * 0.85));
      const rx = inset, rw = w - inset * 2;
      const col = y === 8 ? OL : (y % 4 === 0 ? roofShade : (y === 9 ? roofLight : roofCol));
      g.r(rx, y, rw, 1, col);
      g.px(rx, y, OL); g.px(rx + rw - 1, y, OL);
    }
    g.r(0, 24, w, 3, cream); g.r(0, 24, w, 1, OL); g.r(0, 26, w, 1, greenD);
    // Cute floral gable crest centered on roof eave.
    const mid = Math.floor(w / 2);
    g.o(mid - 9, 13, 18, 11, greenD); g.r(mid - 8, 14, 16, 9, cream);
    flower(g, mid, 18, 'sunflower'); leaf(g, mid - 5, 19, -1); leaf(g, mid + 4, 19, 1);
    // Sign board.
    g.o(4, 27, w - 8, 12, green); g.r(5, 28, w - 10, 1, greenL); g.r(5, 37, w - 10, 1, greenD);
    g.textC('BLOOMERY', Math.floor(w / 2), 31, cream);
    flower(g, 14, 33, 'peony'); flower(g, w - 15, 33, 'sunflower');
    // Scalloped awning.
    for (let x = 0; x < w; x += 10) { g.r(x, 39, 5, 7, green); g.r(x + 5, 39, 5, 7, cream); }
    g.r(0, 39, w, 1, OL);
    for (let x = 0; x < w; x += 5) { const col = (x % 10) < 5 ? green : cream; g.r(x, 46, 4, 1, col); g.r(x + 1, 47, 2, 1, col); g.px(x + 4, 46, OL); }
    // Front.
    g.r(0, 47, w, h - 47, greenD); g.r(0, 47, 2, h - 47, OL); g.r(w - 2, 47, 2, h - 47, OL);
    const winBg = shopOff ? '#1d2536' : (lit ? '#ffe6c0' : '#d8ecd8');
    const winTop = shopOff ? '#283348' : (lit ? '#f6c66a' : '#bcd8c0');
    const win = (x, ww) => {
      g.sq(x, 50, ww, 28, '#2a3a2a');
      g.r(x + 1, 51, ww - 2, 26, winBg);
      g.r(x + 1, 51, ww - 2, 5, winTop);
      g.r(x + 1, 70, ww - 2, 7, shopOff ? '#4a3222' : '#8a5a3a'); g.r(x + 1, 70, ww - 2, 1, shopOff ? '#5e422e' : '#a8754e');
      const kinds = ['sunflower', 'peony', 'tulip', 'daisy', 'tulipP', 'peony', 'tulipY', 'sunflower'];
      for (let k = 0; k < Math.floor((ww - 4) / 5); k++) {
        const fx = x + 3 + k * 5, fy = 61 + (k % 2) * 3;
        stem(g, fx, fy + 1, fx, 70);
        flower(g, fx, fy, kinds[(k + x) % kinds.length]);
      }
      g.r(x + 2, 52, 1, 24, shopOff ? 'rgba(180,200,235,0.16)' : 'rgba(255,255,255,0.45)');
      g.line(x + 6, 76, x + 16, 53, shopOff ? 'rgba(180,200,235,0.1)' : 'rgba(255,255,255,0.22)');
    };
    win(4, 37); win(w - 41, 37);
    // Door with bell & OPEN/CLOSED sign matching bakery style.
    const open = o.state.openAmt || 0;
    g.sq(42, 49, 26, h - 52, '#2a3a2a');
    g.r(43, 50, 24, h - 54, shopOff ? '#19202e' : (lit ? '#ffd9a8' : '#c8a878'));
    const dw = Math.round(24 * (1 - open * 0.8));
    g.r(43, 50, dw, h - 54, green); g.r(43, 50, dw, 1, greenL);
    if (dw > 8) {
      g.r(46, 53, dw - 6, 14, winBg);
      g.r(47, 54, 1, 12, shopOff ? 'rgba(180,200,235,0.18)' : 'rgba(255,255,255,0.5)');
      g.px(43 + dw - 3, 68, '#e6c46a');
    }
    if (dw > 20) {
      g.o(42, 57, 26, 8, closed ? '#b8b2a8' : '#fbf7f2');
      g.px(55, 56, OL);
      microTextC(g, closed ? 'CLOSED' : 'OPEN', 55, 59, closed ? '#c2453f' : '#5f8a5a');
    }
    const bell = Math.round(sin((o.state.bellT || 0) * 30) * Math.max(0, o.state.bellT || 0) * 6);
    g.r(54 + bell, 48, 3, 2, '#e6c46a'); g.px(55 + bell, 50, '#c9a24a');
    // Flower buckets on the pavement.
    for (const x of [6, 20, w - 34, w - 20]) {
      g.box(x, h - 8, 12, 8, P.shop.bucket, lighten(P.shop.bucket, 0.3), P.shop.bucketShade);
      for (let k = 0; k < 4; k++) { const fx = x + 2 + k * 3, fy = h - 12 - (k % 2) * 2; stem(g, fx, fy, fx, h - 8); flower(g, fx, fy, ['tulip', 'daisy', 'peony', 'tulipY'][(k + x) % 4]); }
    }
    g.r(0, h - 2, w, 2, P.street.sidewalkShade); g.r(0, h - 1, w, 1, OL);
  };
  T.tree = (g, w, h, o, env) => {
    const c = P.street, t = env.t, cx = Math.floor(w / 2);
    g.shadow(4, h - 2, w - 8);
    // Tree planter base
    g.o(cx - 9, h - 4, 18, 4, '#6b5a4a'); g.r(cx - 8, h - 3, 16, 1, '#8a7a68');
    // Strong trunk extending continuously up into the foliage canopy (y = 18 to h - 2)
    g.r(cx - 4, 18, 8, h - 20, OL);
    g.r(cx - 3, 18, 6, h - 21, c.trunk);
    g.r(cx - 3, 18, 2, h - 21, lighten(c.trunk, 0.2));
    // Branches supporting the canopy
    g.line(cx - 2, 32, cx - 9, 24, c.trunk);
    g.line(cx + 2, 30, cx + 9, 22, c.trunk);
    g.px(cx + 1, h - 18, darken(c.trunk, 0.4)); g.px(cx, h - 12, darken(c.trunk, 0.4));
    g.r(cx - 6, h - 5, 3, 2, c.trunk); g.r(cx + 3, h - 5, 3, 2, c.trunk);
    // Swaying foliage blobs anchored firmly over the trunk
    const sw = Math.round(sin(t * 0.9 + o.x * 0.01)), sw2 = Math.round(sin(t * 0.9 + o.x * 0.01 + 0.8) * 1.4);
    const blobs = [
      [cx - 10, 26, 11, 0], [cx + 10, 28, 11, 0], [cx, 20, 14, 1],
      [cx - 7, 12, 10, 2], [cx + 8, 13, 10, 2], [cx, 7, 9, 2],
      [cx, 33, 9, 0] // Lower anchor blob overlapping the trunk seamlessly
    ];
    for (const [x, y, r, lvl] of blobs) g.disc(x + (lvl === 2 ? sw2 : lvl ? sw : 0), y, r, c.treeLeafDark, OL);
    for (const [x, y, r, lvl] of blobs) g.disc(x + (lvl === 2 ? sw2 : lvl ? sw : 0) - 1, y - 1, r - 2, c.treeLeaf);
    for (const [x, y, r, lvl] of blobs) g.disc(x + (lvl === 2 ? sw2 : lvl ? sw : 0) - 2, y - 3, Math.max(1, r - 6), c.treeLeafLight);
    const R = A.rng(seedOf(o.id));
    for (let i = 0; i < 16; i++) g.px(3 + Math.floor(R() * (w - 6)) + sw, 3 + Math.floor(R() * 32), R() < 0.5 ? '#d98a3a' : '#c9b04a');
  };
  T.road_sign = (g, w, h) => {
    g.shadow(8, h - 2, 8);
    g.r(11, 8, 3, h - 8, OL); g.r(12, 8, 1, h - 9, '#9aa3ad');
    g.o(0, 0, w, 10, '#3f7a52'); g.r(1, 1, w - 2, 1, '#5fb070'); g.r(2, 2, w - 4, 6, null);
    g.textC('MAPLE', Math.floor(w / 2) + 1, 3, '#fbf7f2');
    g.o(3, 12, 18, 8, '#4a5e8c'); g.text('HOME', 5, 13, '#fbf7f2');
    g.px(1, 15, '#4a5e8c'); g.r(2, 14, 1, 3, '#4a5e8c');
  };
  T.hydrant = (g, w, h) => {
    g.shadow(0, h - 2, w);
    g.o(1, 3, 6, h - 3, '#c2453f'); g.r(2, 4, 1, h - 6, '#e06a5a');
    g.o(2, 0, 4, 4, '#c2453f'); g.r(0, 5, 8, 2, '#9e2b3d'); g.r(1, h - 2, 6, 2, '#9e2b3d');
  };
  T.planter = (g, w, h, o, env) => {
    const sw = Math.round(sin(env.t * 1.4 + o.x) * 0.6);
    for (let k = 0; k < 6; k++) { const fx = 3 + k * 3.6, fy = 2 + (k % 2) * 2; stem(g, fx, fy + 1, fx, 6); flower(g, fx + (k % 2 ? sw : 0), fy, ['tulip', 'daisy', 'tulipY', 'peony', 'tulipP', 'daisy'][k]); }
    g.box(0, 5, w, h - 5, '#a39c92', '#bdb6ac', '#86807a'); g.r(1, 6, w - 2, 1, '#5b3a26');
  };
  T.mailbox = (g, w, h) => {
    g.shadow(1, h - 2, w - 2);
    g.r(4, 10, 2, h - 10, OL);
    g.o(0, 2, w, 9, '#3f5f9e'); g.o(1, 0, w - 2, 4, '#3f5f9e'); g.r(1, 3, w - 2, 1, '#5a7ec0');
    g.r(2, 5, w - 4, 1, OL); g.r(w - 2, 3, 2, 3, '#c2453f');
  };
  T.trash_can = (g, w, h) => {
    g.shadow(0, h - 2, w);
    g.box(1, 3, w - 2, h - 3, '#4f7a4c', '#6a9764', '#3a5c38');
    g.r(1, 7, w - 2, 1, '#3a5c38'); g.r(1, 11, w - 2, 1, '#3a5c38');
    g.o(0, 1, w, 3, '#5f8a5a'); g.r(4, 0, 2, 1, OL);
  };

  // ================================================================= FLOWER SHOP
  T.shop_door = (g, w, h, o, env) => {
    const c = P.shop, green = '#5f8a5a', open = o.state.openAmt || 0;
    g.sq(0, 0, w, h, c.woodShade); g.r(1, 1, w - 2, 1, c.woodLight);
    g.r(3, 3, w - 6, h - 3, '#e2775f');
    g.r(3, 3, w - 6, 14, '#f6b26b'); g.r(3, h - 14, w - 6, 11, '#b9b2a8');
    const dw = Math.round((w - 6) * (1 - open * 0.85));
    g.box(3, 3, dw, h - 3, green, '#7aa874', '#486b44');
    if (dw > 10) {
      g.sq(6, 7, dw - 6, 26, '#3a5c38'); g.r(7, 8, dw - 8, 24, '#bfe0e8'); g.line(8, 30, 14, 9, 'rgba(255,255,255,0.6)');
      g.o(6, 36, dw - 6, 8, '#f4ecdc'); g.px(Math.floor(3 + dw / 2), 35, OL);
      if (dw > 22) microTextC(g, 'OPEN', 3 + Math.floor(dw / 2), 38, '#5f8a5a');
      g.o(6, 46, dw - 6, 14, null, '#486b44');
      g.r(3 + dw - 4, 40, 2, 3, '#e6c46a');
    }
    const bt = o.state.bellT || 0;
    const sw = Math.round(sin(bt * 30) * Math.min(1, bt) * 2);
    g.r(Math.floor(w / 2) - 1 + sw, 0, 3, 3, '#e6c46a'); g.px(Math.floor(w / 2) + sw, 3, '#c9a24a');
  };
  function bucketFlowers(g, x0, y0, n, kinds, t, spread, hgt) {
    for (let k = 0; k < n; k++) {
      const fx = x0 + k * spread + (k % 2), fy = y0 - hgt + (k * 7 % 5);
      const sw = Math.round(sin(t * 1.5 + k * 1.3) * 0.7);
      stem(g, fx, fy + 1, fx, y0);
      if (k % 3 === 0) leaf(g, fx, fy + 5, k % 2 ? 1 : -1);
      flower(g, fx + sw, fy, kinds[k % kinds.length]);
    }
  }
  T.flower_bucket = (g, w, h, o, env) => {
    const c = P.shop, tul = o.variant === 'tulip';
    g.shadow(4, h - 2, w - 8);
    const kinds = tul ? ['tulip', 'tulipP', 'tulipY', 'tulip', 'tulipP'] : ['daisy', 'daisy', 'baby', 'daisy'];
    bucketFlowers(g, 7, h - 10, 6, kinds, env.t, 3.2, 10);
    g.box(5, h - 11, w - 10, 11, c.bucket, lighten(c.bucket, 0.3), c.bucketShade);
    g.r(6, h - 7, w - 12, 1, c.bucketShade); g.o(4, h - 12, w - 8, 3, lighten(c.bucket, 0.2));
    g.r(5, h - 11, w - 10, 1, '#5a7fa0');
    g.o(Math.floor(w / 2) - 7, h - 8, 14, 8, '#fbf7f2');
    microTextC(g, tul ? '$8' : '$6', Math.floor(w / 2), h - 6, '#5f8a5a');
  };
  T.flower_display = (g, w, h, o, env) => {
    const c = P.shop, sun = o.variant === 'sunflower';
    g.shadow(2, h - 2, w - 4);
    // Three-tier stand.
    const tiers = [[4, h - 30, w - 8], [2, h - 19, w - 4], [0, h - 8, w]];
    tiers.forEach(([x, y, tw], i) => {
      const kinds = sun ? ['sunflower', 'sunflower', 'daisy'] : ['peony', 'peony', 'baby'];
      const n = Math.floor(tw / 9);
      for (let k = 0; k < n; k++) {
        const bx = x + 3 + k * 9;
        bucketFlowers(g, bx + 1, y, 3, i === 2 && !sun ? ['peony', 'baby'] : kinds, env.t + k, 2.4, sun ? 9 : 7);
        g.box(bx, y - 4, 7, 5, i % 2 ? c.bucket : '#c97a5c', null, i % 2 ? c.bucketShade : '#8a4a35');
      }
      g.box(x, y, tw, i === 2 ? 8 : 4, c.wood, c.woodLight, c.woodShade);
    });
    g.r(1, h - 1, 2, 1, OL); g.r(w - 3, h - 1, 2, 1, OL);
    g.o(w - 16, h - 8, 15, 8, '#fbf7f2');
    microTextC(g, sun ? '$12' : '$18', w - 8, h - 6, '#5f8a5a');
  };
  T.shop_counter = (g, w, h) => {
    const c = P.shop;
    g.shadow(1, h - 2, w - 2);
    g.box(0, 7, w, h - 7, c.wood, null, c.woodShade);
    for (let x = 6; x < w - 2; x += 8) { g.r(x, 10, 1, h - 13, c.woodShade); g.r(x + 1, 10, 1, h - 13, c.woodLight); }
    g.o(Math.floor(w / 2) - 16, 12, 32, 8, '#f4ecdc'); g.textC('BLOOMERY', Math.floor(w / 2), 13, '#5f8a5a');
    g.r(1, h - 4, w - 2, 2, c.woodShade);
    g.box(0, 0, w, 9, c.woodLight, lighten(c.woodLight, 0.25), c.wood);
    g.r(1, 8, w - 2, 1, OL);
  };
  T.cash_register = (g, w, h, o, env) => {
    g.o(3, 0, 9, 5, '#3a3540'); g.r(4, 1, 7, 2, '#1c2b2a'); g.text('8', 5, -1, 'rgba(0,0,0,0)');
    g.r(5, 1, 1, 2, '#7fd48a'); g.r(7, 1, 1, 2, '#7fd48a'); g.r(9, 1, 1, 2, '#7fd48a');
    g.box(0, 4, w, h - 4, '#c9a24a', '#e6c46a', '#8a6a2a');
    for (let y = 6; y < h - 3; y += 2) for (let x = 2; x < w - 2; x += 2) g.px(x, y, '#fbf7f2');
    g.r(1, h - 3, w - 2, 1, '#6a4a1a');
  };
  T.wrapping_table = (g, w, h) => {
    const c = P.shop, pr = P.props;
    g.r(2, 8, 2, h - 8, OL); g.r(w - 4, 8, 2, h - 8, OL);
    g.box(0, 5, w, 5, c.wood, c.woodLight, c.woodShade);
    // Kraft paper roll on a holder, ribbon spools, scissors.
    g.o(2, 0, 16, 6, pr.wrapKraft); g.r(3, 1, 14, 1, lighten(pr.wrapKraft, 0.3)); g.r(2, 2, 2, 2, pr.wrapKraftShade);
    g.r(14, 5, 10, 2, pr.wrapKraft);
    g.disc(28, 3, 2, pr.ribbon, OL); g.disc(34, 3, 2, pr.wrapPink, OL); g.px(28, 3, '#9e2b3d'); g.px(34, 3, '#d3678a');
    g.px(39, 4, '#9aa3ad'); g.px(40, 5, '#9aa3ad'); g.px(41, 4, '#9aa3ad'); g.px(42, 3, '#c2453f');
  };
  T.corner_plant = (g, w, h, o, env) => {
    const c = P.shop, t = env.t;
    // Bracket shelf.
    g.o(0, h - 6, w, 3, c.wood); g.line(3, h - 3, 6, h, c.woodShade); g.line(w - 4, h - 3, w - 7, h, c.woodShade);
    // Trailing pothos vines.
    for (let v = 0; v < 3; v++) {
      const x0 = 4 + v * 5;
      for (let k = 0; k < 6; k++) {
        const x = x0 + Math.round(sin(t * 1.1 + v + k * 0.6) * (k / 4)), y = h - 9 + k * 3;
        g.px(x, y, P.props.leafDark); if (k % 2 === 0) leaf(g, x, y + 1, v % 2 ? 1 : -1);
      }
    }
    for (let i = 0; i < 5; i++) { const x = 4 + i * 2.5 + Math.round(sin(t + i) * 0.5); g.o(Math.round(x), h - 22 + (i % 2) * 3, 5, 4, i % 2 ? P.props.leaf : P.props.leafDark); }
    g.box(4, h - 14, w - 8, 8, '#e8e2d4', '#fbf7f2', '#c9c3b6');
    g.r(5, h - 11, w - 10, 1, '#5f8a5a');
  };
  T.chalkboard = (g, w, h) => {
    const c = P.shop, cx = Math.floor(w / 2);
    g.shadow(1, h - 2, w - 2);
    g.line(2, h - 1, 5, 2, c.woodShade); g.line(w - 3, h - 1, w - 6, 2, c.woodShade);
    g.sq(2, 1, w - 4, h - 7, c.wood);
    g.r(3, 2, w - 6, h - 9, '#2f3b36');
    // Compact micro lettering and delicate minimalist floral motif
    microTextC(g, 'OPEN', cx, 4, '#fbf7f2');
    g.r(6, 9, w - 12, 1, '#9ab5a6');
    g.r(7, 11, w - 14, 1, '#d9e3dc');
    // Tiny balanced peony bud decoration
    g.px(cx, 13, '#fbd0dd');
    g.px(cx - 1, 14, '#f39bb6'); g.px(cx, 14, '#f8b0c4'); g.px(cx + 1, 14, '#f39bb6');
    g.px(cx - 2, 15, '#7eb075'); g.px(cx, 15, '#d3678a'); g.px(cx + 2, 15, '#7eb075');
    g.r(4, h - 9, w - 8, 1, c.woodShade);
  };
  T.pot_stack = (g, w, h) => {
    const pot = '#b0654a', potL = '#c97a5c', potD = '#8a4a35';
    g.shadow(1, h - 2, w - 2);
    g.box(1, h - 7, w - 2, 7, pot, potL, potD);
    g.box(3, h - 12, w - 6, 6, pot, potL, potD);
    g.box(5, h - 16, w - 10, 5, pot, potL, potD);
    g.o(0, h - 8, w, 2, potL);
  };
  T.shop_window = (g, w, h, o, env) => {
    const c = P.shop;
    g.sq(0, 0, w, h, c.trim); g.r(0, 0, w, 1, OL); g.r(0, 0, 1, h, OL); g.r(w - 1, 0, 1, h, OL);
    skyPane(g, 3, 3, w - 6, h - 10, env);
    // Street outside: building, tree tops and lamp.
    g.r(3, h - 20, 20, 13, '#a35a48'); g.r(5, h - 17, 5, 5, env.light.level < 0.8 ? '#f6c66a' : '#3a4466');
    g.disc(44, h - 14, 8, '#4f8a46'); g.disc(56, h - 12, 6, '#3a6a34');
    g.r(3, h - 9, w - 6, 2, '#b9b2a8');
    g.r(Math.floor(w / 2), 3, 2, h - 10, c.trim); g.r(3, Math.floor(h / 2) - 4, w - 6, 1, c.trim);
    g.r(5, 4, 1, h - 14, 'rgba(255,255,255,0.35)');
    // Sill with pots.
    g.o(-2, h - 7, w + 4, 4, c.wood);
    for (const [x, k] of [[8, 'tulip'], [24, 'daisy'], [50, 'peony'], [64, 'tulipY']]) {
      stem(g, x + 2, h - 11, x + 2, h - 9); flower(g, x + 2, h - 12, k);
      g.box(x, h - 10, 5, 4, '#c97a5c', null, '#8a4a35');
    }
  };
  T.wall_shelves = (g, w, h, o, env) => {
    const c = P.shop;
    for (const y of [9, h - 3]) {
      g.o(0, y, w, 3, c.wood); g.r(1, y, w - 2, 1, c.woodLight);
      g.line(6, y + 3, 9, y + 6, c.woodShade); g.line(w - 7, y + 3, w - 10, y + 6, c.woodShade);
    }
    // Top shelf: pots and jars.
    const items = [[4, 'pot'], [16, 'vase'], [26, 'jar'], [36, 'pot'], [50, 'can'], [66, 'vase'], [78, 'pot'], [92, 'jar']];
    for (const [x, kind] of items) {
      if (kind === 'pot') { g.box(x, 4, 7, 5, '#c97a5c', null, '#8a4a35'); g.o(x + 1, 0, 5, 4, P.props.leaf); }
      if (kind === 'vase') { g.o(x + 1, 2, 4, 7, '#8fd3c4'); flower(g, x + 3, 0, 'peony'); }
      if (kind === 'jar') { g.o(x, 4, 6, 5, '#e8f1f3'); g.r(x + 1, 6, 4, 2, '#d6455a'); }
      if (kind === 'can') { g.o(x, 3, 8, 6, '#5f8a5a'); g.line(x + 8, 4, x + 11, 2, '#5f8a5a'); g.r(x + 2, 2, 4, 1, OL); }
    }
    // Lower shelf: ribbon spools and wrapping paper rolls.
    for (let i = 0; i < 6; i++) { const x = 6 + i * 16; g.disc(x + 2, h - 7, 3, [P.props.ribbon, P.props.wrapPink, '#e6c46a', '#8fd3c4', '#fbf7f2', '#7a9bba'][i], OL); g.px(x + 2, h - 7, OL); }
    for (let i = 0; i < 3; i++) g.o(14 + i * 30, h - 8, 10, 5, i % 2 ? P.props.wrapKraft : '#f1b7c6');
  };
  T.hanging_sign = (g, w, h) => {
    const c = P.shop;
    g.r(6, 0, 1, 3, OL); g.r(w - 7, 0, 1, 3, OL);
    g.box(0, 3, w, h - 3, c.sign, '#fffaf0', '#d9cdb5');
    g.textC('BLOOMERY', Math.floor(w / 2), 6, c.signText);
    leaf(g, 6, 9, -1); flower(g, 8, 8, 'peony'); flower(g, w - 9, 8, 'tulip'); leaf(g, w - 8, 10, 1);
  };
  T.hanging_planter = (g, w, h, o, env) => {
    const t = env.t, sw = Math.round(sin(t * 0.8) * 1);
    g.line(8, 0, 4 + sw, 16, '#c9b38a'); g.line(8, 0, 12 + sw, 16, '#c9b38a');
    g.box(3 + sw, 15, 10, 7, '#e8e2d4', '#fbf7f2', '#c9c3b6');
    for (let v = 0; v < 3; v++) for (let k = 0; k < 4; k++) {
      const x = 4 + sw + v * 4 + Math.round(sin(t * 1.2 + v + k) * (k / 3)), y = 21 + k * 2;
      g.px(x, y, P.props.leafDark); if (k % 2) leaf(g, x, y, v % 2 ? 1 : -1);
    }
    g.o(4 + sw, 12, 4, 4, P.props.leaf); g.o(8 + sw, 11, 4, 4, P.props.leafDark);
  };
  T.mat = (g, w, h, o) => {
    const base = o.variant === 'vertical' ? '#7a4f6a' : '#a8754e', dark = darken(base, 0.25), light = lighten(base, 0.2);
    g.o(0, 0, w, h, base);
    g.o(2, 2, w - 4, h - 4, null, dark);
    if (o.variant === 'vertical') for (let y = 4; y < h - 4; y += 3) g.r(4, y, w - 8, 1, light);
    else for (let x = 4; x < w - 4; x += 3) g.r(x, 4, 1, h - 8, light);
  };
  T.bouquet_item = (g, w, h, o, env) => {
    const pr = P.props, type = o.state.bouquetType || 'mixed', cx = Math.floor(w / 2);
    bouquetHeads(g, cx, 3, type, env.t);
    g.r(cx - 5, 8, 11, 1, OL);
    for (let y = 8; y < h; y++) { const hw = Math.max(1, Math.round(5 - (y - 8) * 0.55)); g.r(cx - hw - 1, y, hw * 2 + 3, 1, OL); g.r(cx - hw, y, hw * 2 + 1, 1, y % 3 ? pr.wrapKraft : pr.wrapKraftShade); }
    g.r(cx - 2, 11, 5, 2, pr.ribbon); g.px(cx - 3, 13, pr.ribbon); g.px(cx + 3, 13, pr.ribbon);
  };

  // ================================================================= LIVING ROOM
  T.sofa = (g, w, h, o) => {
    const c = P.living;
    g.shadow(3, h - 2, w - 6);
    g.r(8, h - 4, 3, 4, c.woodShade); g.r(w - 11, h - 4, 3, 4, c.woodShade);
    g.box(4, 0, w - 8, 16, c.sofa, c.sofaLight, c.sofaShade);
    for (let x = 14; x < w - 10; x += 14) { g.px(x, 6, c.sofaShade); g.px(x + 7, 10, c.sofaShade); }
    g.box(6, 22, w - 12, 11, c.sofaShade, null, darken(c.sofaShade, 0.25));
    const half = Math.floor((w - 20) / 2);
    g.box(10, 13, half, 11, c.sofa, c.sofaLight, c.sofaShade);
    g.box(10 + half, 13, w - 20 - half, 11, c.sofa, c.sofaLight, c.sofaShade);
    for (const x of [0, w - 11]) { g.box(x, 8, 11, h - 11, c.sofa, c.sofaLight, c.sofaShade); g.r(x + 1, 10, 9, 1, lighten(c.sofaLight, 0.2)); }
    g.o(13, 7, 11, 9, '#e6b45a'); g.r(14, 8, 9, 1, '#f2d38a'); g.px(18, 11, '#b8863a');
  };
  T.coffee_table = (g, w, h, o, env) => {
    const c = P.living;
    g.shadow(2, h - 2, w - 4);
    g.r(3, 15, 3, h - 15, OL); g.r(4, 15, 1, h - 16, c.wood);
    g.r(w - 6, 15, 3, h - 15, OL); g.r(w - 5, 15, 1, h - 16, c.wood);
    g.box(0, 0, w, 17, c.wood, c.woodLight, c.woodShade);
    g.r(1, 15, w - 2, 2, c.woodShade);
    for (let i = 0; i < 4; i++) g.r(5 + i * 12, 4 + (i % 3) * 3, 8, 1, mix(c.wood, c.woodLight, 0.6));
    const al = o.state.album;
    if (al) {
      const pr = P.props, ax = Math.floor(w / 2);
      if (al === 'closed') {
        g.box(ax - 8, 3, 16, 11, pr.album, lighten(pr.album, 0.2), darken(pr.album, 0.3));
        g.o(ax - 4, 6, 8, 5, null, pr.albumGold); g.px(ax, 8, pr.albumGold);
      } else {
        g.o(ax - 14, 3, 28, 12, '#f3ead8'); g.r(ax - 1, 3, 2, 12, '#c9b49a');
        const slots = o.state.slots || [0, 0, 0, 0];
        [[ax - 12, 5], [ax - 6, 5], [ax + 2, 5], [ax + 8, 5]].forEach(([x, y], i) => {
          g.sq(x, y, 5, 4, slots[i] ? '#9fd6ff' : '#e0d2bc', '#b9a68a');
          g.sq(x, y + 5, 5, 4, (i === 1 && o.state.lastPhoto) ? '#f39bb6' : '#e0d2bc', '#b9a68a');
        });
        g.r(ax - 14, 14, 28, 1, darken(pr.album, 0.2));
      }
    }
  };
  T.piano = (g, w, h, o, env) => {
    const c = P.living, wood = '#4a2f24', woodL = '#6a4434', woodS = '#33201a';
    g.shadow(2, h - 2, w - 4);
    g.r(3, h - 6, 3, 6, woodS); g.r(w - 6, h - 6, 3, 6, woodS);
    g.box(0, 0, w, 14, wood, woodL, woodS);
    g.r(2, 3, w - 4, 1, mix(wood, woodL, 0.5));
    g.box(1, 13, w - 2, 8, wood, woodL, woodS);
    g.o(Math.floor(w / 2) - 8, 13, 16, 6, '#fbf7f2'); for (let y = 15; y < 18; y++) g.r(Math.floor(w / 2) - 6, y, 12, 1, y % 2 ? '#9aa3ad' : '#fbf7f2');
    g.r(0, 20, w, 5, OL);
    g.r(1, 21, w - 2, 3, '#fbf7f2');
    const pressed = o.state.playing ? Math.floor(env.t * 8) : -10;
    for (let x = 2; x < w - 2; x += 3) {
      g.px(x, 23, '#d3d0c8');
      if (Math.floor(x / 3) % 7 !== 2 && Math.floor(x / 3) % 7 !== 6) g.r(x + 2, 21, 1, 2, OL);
      if (o.state.playing && (Math.floor(x / 3) * 7 + pressed) % 11 === 0) g.r(x, 22, 2, 2, '#c9c3b6');
    }
    g.box(2, 24, w - 4, h - 29, wood, null, woodS);
    g.r(Math.floor(w / 2) - 4, h - 6, 2, 2, '#e6c46a'); g.r(Math.floor(w / 2) + 2, h - 6, 2, 2, '#e6c46a');
  };
  T.cactus = (g, w, h, o, env) => {
    g.box(2, h - 6, w - 4, 6, '#c97a5c', '#e09a7a', '#8a4a35'); g.o(1, h - 7, w - 2, 2, '#e09a7a');
    const green = '#5d9a4f', greenD = '#3f6f37';
    g.o(4, 2, 4, h - 8, green); g.r(5, 3, 1, h - 10, lighten(green, 0.25));
    g.o(1, 5, 3, 5, green); g.px(1, 9, greenD); g.o(8, 4, 3, 5, green);
    g.px(4, 5, '#fbf7f2'); g.px(7, 8, '#fbf7f2'); g.px(5, 1, '#f39bb6'); g.px(6, 0, '#f39bb6'); g.px(6, 1, '#fbd0dd');
    if (o.state.bloom) { g.px(9, 3, '#f39bb6'); g.px(10, 2, '#fbd0dd'); }
  };
  T.dresser = (g, w, h) => {
    const c = P.living;
    g.shadow(2, h - 2, w - 4);
    g.r(3, h - 3, 3, 3, c.woodShade); g.r(w - 6, h - 3, 3, 3, c.woodShade);
    g.box(1, 10, w - 2, h - 12, c.wood, null, c.woodShade);
    for (let i = 0; i < 2; i++) {
      const y = 12 + i * 8;
      g.o(3, y, Math.floor(w / 2) - 4, 7, c.wood); g.o(Math.floor(w / 2) + 1, y, Math.floor(w / 2) - 4, 7, c.wood);
      g.r(Math.floor(w / 4) - 1, y + 3, 3, 1, '#e6c46a'); g.r(Math.floor(w * 3 / 4) - 1, y + 3, 3, 1, '#e6c46a');
    }
    g.box(0, 0, w, 12, c.woodLight, lighten(c.woodLight, 0.2), c.wood);
    g.o(6, 3, 18, 6, '#f3ead8'); g.px(8, 8, '#e0d2bc'); g.px(12, 8, '#e0d2bc'); g.px(16, 8, '#e0d2bc');
  };
  T.hifi = (g, w, h, o, env) => {
    const play = o.state.playing;
    g.box(0, 3, w, h - 3, '#3a3540', '#55505e', '#26222c');
    for (const x of [1, w - 9]) {
      g.o(x, 3, 8, h - 3, '#2b2d3a');
      const pulse = play && Math.floor(env.t * 6) % 2 ? 1 : 0;
      g.disc(x + 4, 9, 2 + pulse, '#55505e'); g.px(x + 4, 9, '#1a1420');
    }
    g.sq(10, 5, 10, 4, '#1c2b2a');
    for (let i = 0; i < 4; i++) { const bh = play ? 1 + Math.floor((sin(env.t * 9 + i * 1.7) + 1) * 1.5) : 1; g.r(11 + i * 2, 9 - bh, 1, bh, '#8fd3c4'); }
    g.sq(10, 10, 10, 4, '#26222c'); g.r(12, 11, 2, 2, '#55505e'); g.r(16, 11, 2, 2, '#55505e');
    g.px(w - 11, 4, play ? '#7fd48a' : '#c2453f');
    g.line(w - 4, 3, w - 1, -4, OL);
  };
  T.crt_tv = (g, w, h, o, env) => {
    const c = P.living, on = o.state.on;
    g.shadow(2, h - 2, w - 4);
    if (o.variant === 'facing_up') {
      // TV placed directly across from the coffee table, facing north toward the table & sofa.
      g.box(2, 24, w - 4, h - 24, c.wood, c.woodLight, c.woodShade);
      g.r(4, 28, w - 8, h - 32, darken(c.woodShade, 0.2));
      g.r(4, h - 2, 3, 2, c.woodShade); g.r(w - 7, h - 2, 3, 2, c.woodShade);
      // Coiled power cord tucked at rear-right of cabinet
      g.line(w - 9, 24, w - 6, h - 1, '#26222c');
      // Antennae rising above the top bezel toward the room
      g.line(18, 2, 12, -6, OL); g.line(28, 2, 34, -7, OL); g.px(12, -6, '#c3cad2'); g.px(34, -7, '#c3cad2');
      // Rear CRT casing + tapered cathode-tube housing + cooling vents
      g.box(4, 1, w - 8, 24, '#5c5664', '#7a7382', '#3e3a44');
      if (on) g.r(7, 0, w - 14, 1, '#a8c8ff');
      g.o(11, 5, w - 22, 15, '#46414d');
      for (let y = 7; y <= 17; y += 2) g.r(13, y, w - 26, 1, '#2a2630');
      g.r(w - 10, 17, 2, 2, on ? '#7fd48a' : '#c2453f');
      return;
    }
    // Low cabinet with VCR.
    g.box(2, 26, w - 4, h - 26, c.wood, c.woodLight, c.woodShade);
    g.sq(8, 29, 22, 5, '#26222c'); g.r(10, 31, 10, 1, '#55505e'); g.r(24, 30, 3, 1, on ? '#7fd48a' : '#c2453f');
    g.r(4, h - 2, 3, 2, c.woodShade); g.r(w - 7, h - 2, 3, 2, c.woodShade);
    // TV.
    g.line(18, 2, 12, -6, OL); g.line(28, 2, 34, -7, OL); g.px(12, -6, '#c3cad2'); g.px(34, -7, '#c3cad2');
    g.box(4, 1, w - 8, 26, '#6a6470', '#857f8a', '#4a4550');
    g.o(7, 4, 28, 20, '#1a1420');
    if (on) {
      const ch = o.state.channel || 0, t = env.t;
      if (ch === 'static' || o.state.static) {
        const R = A.rng(Math.floor(t * 20));
        for (let y = 5; y < 23; y++) for (let x = 8; x < 34; x += 2) g.r(x, y, 2, 1, R() < 0.5 ? '#c9cff0' : '#4a4f6a');
      } else {
        g.r(8, 5, 26, 18, '#7a9bba'); g.r(8, 15, 26, 8, '#5f8f4e');
        g.disc(26, 11, 3, '#f9d27a');
        const bx = 10 + Math.floor((t * 6) % 22);
        g.r(bx, 13, 4, 3, '#e27b39'); g.px(bx + 3, 12, '#e27b39');
        for (let y = 5; y < 23; y += 2) g.r(8, y, 26, 1, 'rgba(0,0,0,0.12)');
      }
    } else { g.r(8, 5, 26, 18, '#2a3438'); g.line(10, 20, 16, 6, 'rgba(255,255,255,0.12)'); }
    g.r(37, 6, 3, 3, '#3a3540'); g.r(37, 11, 3, 3, '#3a3540'); g.px(38, 17, on ? '#7fd48a' : '#55505e');
  };
  T.bookshelf = (g, w, h, o) => {
    const c = P.living, tall = o.variant === 'tall';
    const wood = tall ? '#8a5a3c' : c.wood, woodL = tall ? '#ab7652' : c.woodLight, woodS = tall ? '#6b412a' : c.woodShade;
    g.shadow(1, h - 2, w - 2);
    g.box(0, 0, w, h, wood, woodL, woodS);
    g.r(3, 5, w - 6, h - 9, darken(woodS, 0.35));
    const boards = tall ? [4, 19, 34, 49, h - 4] : [4, 18, 34, 50, h - 4];
    const R = A.rng(seedOf(o.id));
    const cols = ['#c2453f', '#4a6fa5', '#e6c46a', '#5f8a5a', '#7a3e3e', '#e8e2d4', '#8c4f7a', '#3d5f8a', '#d98a3a'];
    for (let i = 0; i < boards.length - 1; i++) {
      const top = boards[i] + 2, bot = boards[i + 1];
      let x = 3;
      const gapStart = (!tall && i === 2) ? 3 : -1;
      if (gapStart >= 0) x = 15;
      while (x < w - 4) {
        const bw = 2 + Math.floor(R() * 3), bh = Math.min(bot - top, 8 + Math.floor(R() * (bot - top - 8)));
        if (R() < 0.12 && x < w - 10) { g.o(x, bot - 5, 7, 5, cols[Math.floor(R() * cols.length)]); x += 8; continue; }
        const col = cols[Math.floor(R() * cols.length)];
        g.r(x, bot - bh, bw, bh, col); g.r(x, bot - bh, 1, bh, lighten(col, 0.2)); g.px(x + bw - 1, bot - bh + 2, '#fbf7f2');
        x += bw + (R() < 0.15 ? 1 : 0);
      }
      g.r(1, bot, w - 2, 2, wood); g.r(1, bot, w - 2, 1, woodL);
    }
    g.r(0, 0, w, 1, OL);
  };
  T.rotary_phone = (g, w, h, o, env) => {
    const sh = o.state.ringing ? (Math.floor(env.t * 20) % 2) : 0;
    g.o(1 + sh, 4, w - 2, h - 4, '#c2453f'); g.r(2 + sh, 5, w - 4, 1, '#e06a5a');
    g.disc(6 + sh, 8, 2, '#fbf7f2', OL); g.px(6 + sh, 8, '#c2453f');
    if (!o.state.offHook) { g.o(sh, 1, w, 4, '#9e2b3d'); g.r(1 + sh, 2, 2, 1, '#c2453f'); g.r(w - 3 + sh, 2, 2, 1, '#c2453f'); }
  };
  T.table_lamp = (g, w, h, o, env) => {
    const c = P.living, on = lampOn(o, env);
    g.r(5, h - 2, 3, 2, c.woodShade); g.o(1, h - 8, w - 2, 3, c.wood); g.r(5, h - 6, 2, 4, c.woodShade);
    g.r(5, 8, 2, h - 16, '#c9a24a');
    g.o(4, h - 10, 4, 3, '#c9a24a');
    for (let y = 0; y < 8; y++) { const hw = 3 + Math.floor(y / 3); g.r(6 - hw - 1, y, hw * 2 + 2, 1, OL); g.r(6 - hw, y, hw * 2, 1, on ? (y > 5 ? '#fff3c4' : '#f8e3b0') : '#e8d9c3'); }
  };
  T.coat_rack = (g, w, h, o, env) => {
    const c = P.living;
    g.shadow(3, h - 2, w - 6);
    g.line(w / 2, h - 6, 3, h - 1, c.woodShade); g.line(w / 2, h - 6, w - 4, h - 1, c.woodShade); g.line(w / 2, h - 6, w / 2, h, c.woodShade);
    g.r(w / 2 - 1, 3, 3, h - 8, OL); g.r(w / 2, 3, 1, h - 9, c.woodLight);
    g.disc(w / 2, 2, 2, c.wood, OL);
    g.line(w / 2, 6, 3, 4, OL); g.line(w / 2, 6, w - 4, 4, OL);
    // Cream scarf always, blazer when Roni hangs it up, Kallita's jacket on the other hook.
    g.r(w - 6, 5, 3, 16, '#efe6d2'); g.r(w - 6, 20, 3, 2, '#d9cdb5'); g.px(w - 5, 8, '#d9cdb5');
    if (o.state.coat) {
      const of = P.outfits.roni_office;
      g.o(1, 5, 8, 18, of.top); g.r(2, 6, 1, 15, of.topLight); g.r(4, 6, 2, 6, of.shirt); g.r(4, 6, 1, 6, of.topShade);
    }
    if (o.state.bag) { g.o(2, 22, 8, 8, P.props.bag); g.r(4, 19, 4, 3, null); g.r(4, 20, 1, 2, P.props.bagStrap); g.r(7, 20, 1, 2, P.props.bagStrap); }
  };
  T.vase = (g, w, h, o, env) => {
    bouquetHeads(g, Math.floor(w / 2), -8, o.state.bouquetType || 'mixed', env.t);
    stem(g, 3, -2, 4, 3); stem(g, 6, -2, 5, 3); stem(g, 5, -6, 5, 3);
    g.o(1, 3, w - 2, h - 3, 'rgba(170,215,230,0.75)');
    g.o(2, 1, w - 4, 3, 'rgba(200,235,245,0.85)');
    g.r(2, 5, 1, h - 8, 'rgba(255,255,255,0.7)'); g.r(2, h - 5, w - 4, 3, 'rgba(120,170,200,0.6)');
    g.r(4, 4, 1, h - 6, P.props.leafDark); g.r(6, 4, 1, h - 7, P.props.leafDark);
  };
  T.cake = (g, w, h, o, env) => {
    const cut = o.state.cut, split = Math.max(0, Math.min(1, o.state.splitAmt || 0)), t = env.t;
    g.ellipse(Math.floor(w / 2), h - 2, Math.floor(w / 2) - 1, 1, '#fbf7f2');
    g.r(1, h - 1, w - 2, 1, '#c9c3b6');
    if (split > 0.02) {
      const sep = Math.round(split * 4), half = Math.floor((w - 4) / 2), topHalf = Math.floor((w - 12) / 2);
      // Left cake half
      g.box(2 - sep, 6, half, h - 8, '#f6e6d6', '#fff8f0', '#e0c8b4');
      for (let x = 3 - sep; x < 2 - sep + half - 1; x += 3) g.r(x, 7, 2, 1 + (x & 1), '#f39bb6');
      g.r(2 - sep + half - 2, 7, 2, h - 10, '#f8d8b8');
      g.r(2 - sep + half - 2, 9, 2, 1, '#d6455a');
      g.box(6 - sep, 2, topHalf, 6, '#f6e6d6', '#fff8f0', '#e0c8b4');
      // Right cake half
      g.box(2 + half + sep, 6, w - 4 - half, h - 8, '#f6e6d6', '#fff8f0', '#e0c8b4');
      for (let x = 3 + half + sep; x < w - 3 + sep; x += 3) g.r(x, 7, 2, 1 + (x & 1), '#f39bb6');
      g.r(2 + half + sep, 7, 2, h - 10, '#f8d8b8');
      g.r(2 + half + sep, 9, 2, 1, '#d6455a');
      g.box(6 + topHalf + sep, 2, w - 12 - topHalf, 6, '#f6e6d6', '#fff8f0', '#e0c8b4');
      return;
    }
    g.box(2, 6, w - 4, h - 8, '#f6e6d6', '#fff8f0', '#e0c8b4');
    for (let x = 3; x < w - 3; x += 3) g.r(x, 7, 2, 1 + (x % 2), '#f39bb6');
    g.box(6, 2, w - 12, 6, '#f6e6d6', '#fff8f0', '#e0c8b4');
    for (let x = 7; x < w - 7; x += 3) g.px(x, 4, '#d6455a');
    if (cut) {
      g.r(w - 9, 7, 6, h - 9, '#f8d8b8'); g.r(w - 9, 9, 6, 1, '#d6455a'); g.r(w - 9, 12, 6, 1, '#f6e6d6'); g.r(w - 9, 7, 1, h - 9, OL);
    }
    if (o.state.candles !== false) {
      for (const x of [9, w - 10]) {
        g.r(x, -2, 1, 4, '#8fd3c4');
        const f = Math.floor(t * 9 + x) % 3;
        g.px(x, -3 - (f === 0 ? 1 : 0), '#ffcf5a'); g.px(x, -3, '#fff3a8'); if (f === 2) g.px(x + 1, -4, '#ffcf5a');
      }
    } else {
      for (const x of [9, w - 10]) { g.r(x, -2, 1, 4, '#8fd3c4'); g.px(x + Math.round(sin(t * 2 + x)), -4 - Math.floor(t * 2 % 3), 'rgba(220,220,230,0.5)'); }
    }
  };
  T.cake_plate = (g, w, h, o) => {
    const cx = Math.floor(w / 2);
    g.ellipse(cx, h - 2, 5, 2, '#c9c3b6');
    g.ellipse(cx, h - 3, 5, 2, '#fbf7f2');
    g.ellipse(cx, h - 3, 3, 1, '#ebe4d8');
    if (o.state.mode === 'crumbs') {
      g.px(cx - 2, h - 3, '#d9b48a');
      g.px(cx + 1, h - 3, '#c99a6b');
      g.px(cx, h - 2, '#d6455a');
      g.px(cx + 2, h - 4, '#f39bb6');
    } else if (o.state.mode === 'slice') {
      g.r(cx - 3, h - 6, 6, 3, '#f6e6d6');
      g.r(cx - 3, h - 7, 6, 1, '#f39bb6');
      g.r(cx - 2, h - 5, 4, 1, '#d6455a');
      g.px(cx, h - 8, '#d6455a');
    }
  };
  T.tripod_folded = (g, w, h) => {
    g.shadow(2, h - 2, w - 4);
    g.line(4, 7, 3, h - 1, '#5a483a');
    g.line(5, 7, 5, h - 1, '#7a6452');
    g.line(6, 7, 7, h - 1, '#5a483a');
    g.box(2, 2, 6, 5, '#2a2624', '#4a4440', '#181615');
    g.r(4, 0, 2, 2, '#486884');
    g.px(5, 3, '#c3cad2');
  };
  T.pizza_box = (g, w, h, o) => {
    const box = '#e9dcc0', boxS = '#cdbb98';
    if (o.state.open) {
      g.box(0, -8, w, 10, box, '#f6eedc', boxS);
      g.disc(Math.floor(w / 2), -3, 3, '#d6455a'); g.r(4, -6, 6, 1, boxS);
      g.box(0, 2, w, h - 2, boxS, null, darken(boxS, 0.2));
      const cx = Math.floor(w / 2), cy = 6, rx = Math.floor(w / 2) - 3, ry = 3;
      const eaten = Math.max(0, Math.min(6, o.state.slices || 0));
      // Wax parchment sheet inside the box
      g.ellipse(cx, cy, rx, ry, '#dfd0b4');
      // 6 distinct triangular pizza slices removed one by one
      const sliceOrder = [1, 4, 0, 3, 2, 5];
      for (let dy = -ry; dy <= ry; dy++) {
        for (let dx = -rx; dx <= rx; dx++) {
          const rNorm = (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry + 0.1);
          if (rNorm > 1) continue;
          let deg = Math.atan2(dy / (ry + 0.2), dx / rx) * 180 / Math.PI;
          if (deg < 0) deg += 360;
          const sIdx = Math.floor(deg / 60) % 6;
          if (sliceOrder.indexOf(sIdx) < eaten) continue;
          const onCut = (deg % 60) < 7 || (deg % 60) > 53;
          let col = '#f4c430';
          if (rNorm > 0.66) col = '#e0a868';
          else if (rNorm > 0.56) col = '#e8574a';
          else if (onCut) col = '#d99848';
          g.px(cx + dx, cy + dy, col);
        }
      }
      // Pepperoni & melted mozzarella highlights per remaining slice
      const peps = [
        [0, cx + 4, cy + 1], [1, cx, cy + 2], [2, cx - 4, cy + 1],
        [3, cx - 4, cy - 1], [4, cx, cy - 2], [5, cx + 4, cy - 1]
      ];
      for (const [idx, px, py] of peps) {
        if (sliceOrder.indexOf(idx) >= eaten) {
          g.px(px, py, '#9e2b3d');
          g.px(px - (px > cx ? 1 : -1), py, '#f8e6a8');
        }
      }
    } else {
      g.box(0, 2, w, h - 2, box, '#f6eedc', boxS);
      g.r(1, h - 3, w - 2, 1, boxS);
      // Red pizza slice emblem on the left and clean non-overlapping PIZZA lettering on the right.
      g.r(2, 4, 3, 1, '#c98a4a');
      g.r(2, 5, 3, 1, '#d6455a');
      g.px(3, 6, '#d6455a');
      g.px(3, 5, '#f4c430');
      microText(g, 'PIZZA', 6, 4, '#c2453f');
    }
  };
  T.present = (g, w, h, o) => {
    const red = o.variant === 'red';
    const col = red ? '#c2453f' : '#4a6fa5', li = red ? '#e06a5a' : '#6a8fc5', sh = red ? '#9e2b3d' : '#35507a', rib = red ? '#e6c46a' : '#fbf7f2';
    g.shadow(1, h - 2, w - 2);
    // Kallita's Indomie-style noodle gift box for Roni
    if (o.state.stage === 'noodle_box') {
      g.box(1, 4, w - 2, h - 4, '#fbf7f2', '#ffffff', '#dcd6c6');
      g.r(2, 5, w - 4, 3, '#d6455a');
      g.r(2, 9, w - 4, 2, '#4f8a46');
      g.r(5, 6, 8, 1, '#f4c430');
      g.r(6, 12, 6, 1, '#c2453f');
      g.o(0, 3, w, 3, '#d6455a');
      return;
    }
    // Opened noodle box revealing a big chubby hamster plushie inside
    if (o.state.stage === 'hamster_plushie' || (!red && o.state.opened)) {
      g.box(2, 8, w - 4, h - 8, '#fbf7f2', '#ffffff', '#dcd6c6');
      g.r(3, 9, w - 6, 2, '#d6455a');
      g.r(3, 12, w - 6, 1, '#4f8a46');
      // Big chubby golden-cream & white hamster plushie popping out
      g.disc(9, 4, 6, '#e2a858', OL);
      g.disc(9, 5, 4, '#fbf7f2');
      g.disc(5, -1, 2, '#e2a858', OL); g.disc(13, -1, 2, '#e2a858', OL);
      g.px(5, -1, '#f39bb6'); g.px(13, -1, '#f39bb6');
      g.r(6, 0, 6, 2, '#e2a858');
      g.px(7, 2, '#1a1922'); g.px(11, 2, '#1a1922');
      g.px(6, 3, '#f39bb6'); g.px(12, 3, '#f39bb6');
      g.px(9, 3, '#d66f84');
      return;
    }
    // Opened red box with big chubby seal plushie + two Litten Pokemon figurines (including curled Litten with cream yarn ball)
    if (o.state.opened && red) {
      // Opened red gift box on left
      g.box(0, 9, 10, h - 9, col, li, sh);
      g.r(4, 9, 2, h - 9, rib);
      g.r(0, 7, 10, 2, li); g.r(4, 7, 2, 2, rib);
      // Chubby white/silver-gray seal plushie neatly tucked in/above left side of the box
      g.disc(4, 5, 4, '#dde4ec', OL);
      g.disc(4, 6, 3, '#f5f8fc');
      g.px(3, 4, '#1a1922'); g.px(6, 4, '#1a1922');
      g.px(4, 5, '#3a3c48');
      g.px(2, 6, '#f39bb6'); g.px(7, 6, '#f39bb6');
      // Matching sitting Litten figurine behind center
      g.o(8, 2, 5, 6, '#26242b', OL);
      g.px(8, 1, '#26242b'); g.px(12, 1, '#26242b');
      g.r(9, 3, 3, 1, '#d6453a');
      g.px(9, 4, '#f2c94c'); g.px(11, 4, '#f2c94c');
      g.r(9, 5, 3, 1, '#d6453a');
      // Hero Litten Pokemon figurine curled up hugging a pale cream ball of yarn (reference design)
      // Black curved tail sweeping right
      g.px(25, 10, '#26242b'); g.px(26, 9, '#26242b'); g.px(26, 8, '#1a1922'); g.px(25, 8, '#26242b');
      // Pale butter-cream woven yarn ball + dangling yarn tail
      g.disc(21, 11, 4, '#f2ebbd', OL);
      g.r(20, 8, 3, 1, '#fbf7f2');
      g.r(18, 11, 7, 1, '#c9be82');
      g.px(19, 9, '#ded59e'); g.px(21, 10, '#ded59e'); g.px(23, 9, '#ded59e');
      g.px(19, 13, '#ded59e'); g.px(22, 12, '#ded59e'); g.px(23, 13, '#ded59e');
      g.px(20, 15, '#f2ebbd'); g.px(20, 16, '#ded59e'); g.px(19, 16, '#f2ebbd');
      // Black & red-striped paws hugging the yarn ball
      g.r(20, 7, 3, 2, '#26242b'); g.px(21, 7, '#d6453a');
      g.r(22, 14, 3, 2, '#26242b'); g.px(23, 14, '#d6453a');
      // Litten head: black ears with white inner triangles + center tuft
      g.o(11, 6, 8, 8, '#26242b', OL);
      g.r(11, 5, 3, 2, '#26242b'); g.px(12, 6, '#fbf7f2');
      g.r(16, 5, 3, 2, '#26242b'); g.px(17, 6, '#fbf7f2');
      g.r(14, 5, 2, 1, '#26242b');
      // Bold red forehead cross-mark
      g.r(14, 6, 2, 4, '#d6453a');
      g.r(13, 7, 4, 1, '#d6453a');
      g.r(13, 9, 4, 1, '#d6453a');
      // Golden-yellow almond eyes with dark slit pupils
      g.r(12, 9, 2, 2, '#f2c94c'); g.px(13, 10, '#1a1922');
      g.r(16, 9, 2, 2, '#f2c94c'); g.px(16, 10, '#1a1922');
      // Red lower muzzle & spiky cheek tufts
      g.r(12, 11, 6, 3, '#d6453a');
      g.px(10, 11, '#d6453a'); g.px(11, 12, '#d6453a'); g.px(10, 13, '#d6453a');
      g.px(19, 11, '#d6453a'); g.px(18, 12, '#d6453a');
      g.px(14, 12, '#1a1922'); g.px(15, 13, '#f39bb6');
      return;
    }
    if (o.state.opened) {
      g.box(1, 7, w - 2, h - 7, col, li, sh);
      g.r(Math.floor(w / 2) - 1, 7, 2, h - 7, rib);
      g.r(3, 4, 5, 4, '#fbf7f2'); g.r(w - 8, 3, 4, 5, '#f1e3c4'); g.px(6, 3, '#fbf7f2');
      g.o(w - 4, h - 8, 6, 4, li);
      return;
    }
    g.box(1, 6, w - 2, h - 6, col, li, sh);
    g.o(0, 5, w, 4, li);
    g.r(Math.floor(w / 2) - 1, 5, 2, h - 5, rib); g.r(0, 10, w, 2, rib);
    g.o(Math.floor(w / 2) - 6, 1, 6, 5, rib); g.o(Math.floor(w / 2), 1, 6, 5, rib);
    g.px(Math.floor(w / 2) - 4, 3, col); g.px(Math.floor(w / 2) + 3, 3, col);
  };
  T.balloons = (g, w, h, o, env) => {
    const t = env.t;
    const list = [[5, 6, '#f39bb6'], [13, 2, '#8fd3c4'], [20, 7, '#f2d16b']];
    g.o(10, h - 4, 6, 4, '#9aa3ad');
    list.forEach(([x, y, col], i) => {
      const bx = x + Math.round(sin(t * 0.9 + i * 2) * 1), by = y + Math.round(sin(t * 1.3 + i) * 1);
      g.line(bx, by + 9, 13, h - 4, '#c3cad2');
      g.o(bx - 4, by, 9, 10, col); g.r(bx - 3, by + 1, 7, 1, null);
      g.px(bx - 2, by + 2, '#fbf7f2'); g.px(bx - 2, by + 3, lighten(col, 0.5));
      g.px(bx, by + 10, darken(col, 0.3));
    });
  };
  T.shoe_rack = (g, w, h) => {
    const c = P.living;
    g.o(0, 4, w, 3, c.wood); g.r(1, h - 1, 2, 1, OL); g.r(w - 3, h - 1, 2, 1, OL); g.o(0, h - 3, w, 2, c.woodShade);
    g.o(2, 0, 5, 4, '#2a2430'); g.o(7, 1, 4, 3, '#2a2430');
    g.o(13, 0, 5, 4, '#f1efe8'); g.r(14, 2, 3, 1, '#e8574a'); g.o(18, 1, 5, 3, '#f1efe8');
  };
  T.rug = (g, w, h, o) => {
    const c = P.living;
    if (o.variant === 'stripe') {
      g.o(0, 0, w, h, '#3d5f8a');
      for (let x = 4; x < w - 4; x += 8) g.r(x, 1, 4, h - 2, '#e8e2d4');
      g.r(1, 2, w - 2, 1, '#e6b45a'); g.r(1, h - 3, w - 2, 1, '#e6b45a');
      return;
    }
    if (o.variant === 'round') {
      const b = P.bedroom;
      g.ellipse(Math.floor(w / 2), Math.floor(h / 2), Math.floor(w / 2), Math.floor(h / 2) - 1, OL);
      g.ellipse(Math.floor(w / 2), Math.floor(h / 2), Math.floor(w / 2) - 2, Math.floor(h / 2) - 2, b.rug);
      g.ellipse(Math.floor(w / 2), Math.floor(h / 2), Math.floor(w / 2) - 10, Math.floor(h / 2) - 7, b.rugShade);
      g.ellipse(Math.floor(w / 2), Math.floor(h / 2), Math.floor(w / 2) - 14, Math.floor(h / 2) - 10, b.rug);
      for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; g.px(Math.round(w / 2 + Math.cos(a) * (w / 2 - 6)), Math.round(h / 2 + Math.sin(a) * (h / 2 - 4)), b.rugPattern); }
      return;
    }
    for (let x = 2; x < w - 2; x += 2) { g.px(x, 0, '#e6d6b0'); g.px(x, h - 1, '#e6d6b0'); }
    g.o(0, 1, w, h - 2, c.rug);
    g.o(3, 4, w - 6, h - 8, null, c.rugPattern);
    g.o(6, 7, w - 12, h - 14, c.rugShade);
    g.o(10, 10, w - 20, h - 20, c.rug);
    for (let x = 14; x < w - 14; x += 10) { g.px(x, 8, c.rugPattern); g.px(x, h - 9, c.rugPattern); }
    const cx = Math.floor(w / 2), cy = Math.floor(h / 2);
    for (let i = -6; i <= 6; i++) { g.px(cx + i * 3, cy - (6 - Math.abs(i)) % 3, c.rugPattern); g.px(cx + i * 3, cy + (6 - Math.abs(i)) % 3, c.rugPattern); }
  };
  T.photo_collage = (g, w, h, o, env) => {
    const missing = o.state.missing || [];
    // Neatly aligned, evenly spaced rectangular framed wall photos (2 balanced rows)
    const pics = [
      [0, 2], [12, 2], [24, 2], [36, 2], [48, 2], [60, 2],
      [6, 19], [18, 19], [30, 19], [42, 19], [54, 19]
    ];
    const scenes = ['#f6b26b', '#8fc4e8', '#f39bb6', '#7fd48a', '#e6c46a', '#c9bfdc', '#8fd3c4', '#f1b7c6', '#9fd6ff', '#e27b39', '#bdb7c9'];
    pics.forEach(([x, y], i) => {
      const frameCol = i % 2 === 0 ? '#6b4a33' : '#8a5a3c';
      g.r(x + 1, y + 1, 10, 13, 'rgba(40,20,30,0.22)');
      g.sq(x, y, 10, 13, '#f4ecdc', frameCol);
      g.px(x + 4, y - 1, '#c9a24a');
      if (missing.includes(i)) {
        g.r(x + 2, y + 2, 6, 9, '#e4d8c8');
      } else {
        g.r(x + 2, y + 2, 6, 9, scenes[i]);
        g.r(x + 2, y + 7, 6, 4, darken(scenes[i], 0.25));
        g.px(x + 3, y + 6, '#bdb7c9'); g.px(x + 3, y + 5, '#bdb7c9');
        g.px(x + 6, y + 6, '#e27b39'); g.px(x + 6, y + 5, '#e27b39');
      }
    });
  };
  T.banner = (g, w, h) => {
    // Festive anniversary ribbon & pennants slung cleanly underneath the coffee table
    g.r(0, 0, w, 1, '#5c3a24');
    const cols = ['#f0a6b8', '#8fd3c4', '#f2d16b'];
    const n = 9, step = Math.floor((w - 6) / n);
    for (let i = 0; i < n; i++) {
      const px = 4 + i * step, col = cols[i % 3];
      g.r(px, 1, 5, 2, OL);
      g.r(px + 1, 1, 3, 2, col);
      g.r(px + 1, 3, 3, 1, col);
      g.px(px + 2, 4, col);
    }
    // Crisp central ribbon plaque
    const pw = 38, px0 = Math.floor((w - pw) / 2);
    g.sq(px0, 2, pw, 7, '#f4ecdc', OL);
    g.r(px0 + 1, 3, pw - 2, 5, '#fbf7f2');
    microTextC(g, 'HAPPY 1ST', Math.floor(w / 2), 4, '#9e2b3d');
  };
  T.fairy_lights = (g, w, h, o, env) => {
    const t = env.t, cols = ['#ffd28a', '#f0a6b8', '#8fd3c4', '#fff3a8'];
    const sag = x => Math.round(Math.abs(Math.sin(x / w * Math.PI * 3)) * 5);
    for (let x = 0; x < w; x++) g.px(x, sag(x), '#4a3a4e');
    for (let x = 3, i = 0; x < w - 2; x += 6, i++) {
      const on = !o.state.off && sin(t * 2.2 + i * 1.7) > -0.6;
      const y = sag(x) + 1;
      g.px(x, y, '#4a3a4e');
      g.r(x - 1, y + 1, 2, 2, on ? cols[i % 4] : darken(cols[i % 4], 0.45));
      if (on) g.px(x - 1, y + 1, '#fffbe6');
    }
  };
  T.curtain_window = (g, w, h, o, env) => {
    const room = env.room, t = env.t;
    const cur = room === 'kitchen' ? ['#e6b45a', '#c99a40', '#f2d38a'] : room === 'bedroom' ? ['#7f9fc4', '#6383a8', '#a2bcdc'] : ['#b84e4e', '#943d3d', '#d06a6a'];
    const frame = room === 'bedroom' ? '#f1ece2' : '#f4ecdc';
    g.sq(2, 2, w - 4, h - 6, frame);
    skyPane(g, 4, 4, w - 8, h - 10, env);
    if (room === 'living' || room === 'kitchen') { g.disc(Math.floor(w * 0.7), h - 6, 5, '#4f8a46'); g.r(4, h - 8, w - 8, 2, '#5f8f4e'); }
    g.r(Math.floor(w / 2) - 1, 4, 2, h - 10, frame); g.r(4, Math.floor(h / 2) - 2, w - 8, 1, frame);
    g.r(5, 5, 1, h - 14, 'rgba(255,255,255,0.35)');
    g.r(0, h - 5, w, 3, frame); g.r(0, h - 2, w, 1, OL);
    const cw = Math.max(5, Math.floor(w / 4));
    for (const side of [0, 1]) {
      const sw = Math.round(sin(t * 1.1 + side * 2.1) * 1.2 + sin(t * 2.7 + side) * 0.5);
      for (let y = 1; y < h - 3; y++) {
        const k = y / (h - 3);
        const ww = cw + Math.round(k * k * 2) + (y > h * 0.5 ? Math.round(sw * k) : 0);
        const x0 = side ? w - ww : 0;
        g.r(x0, y, ww, 1, cur[0]);
        g.px(side ? x0 : x0 + ww - 1, y, OL);
        g.px(x0 + Math.floor(ww / 2), y, cur[1]);
        g.px(side ? x0 + ww - 2 : x0 + 1, y, cur[2]);
      }
      g.r(side ? w - cw - 1 : 0, Math.floor(h * 0.55), cw + 1, 2, '#e6c46a');
    }
    g.r(-2, 0, w + 4, 2, '#8a5a3c'); g.px(-3, 0, '#e6c46a'); g.px(w + 2, 0, '#e6c46a');
  };
  // Front door seen edge-on in the west wall; state.openAmt 0..1 swings it into the room.
  T.side_door = (g, w, h, o, env) => {
    const c = P.living, open = o.state.openAmt || 0;
    g.r(0, 0, w, h, '#1f1822');
    if (open < 0.05) {
      g.sq(1, 0, w - 2, h, c.trim);
      g.r(3, 2, w - 6, h - 4, c.wood); g.r(3, 2, 1, h - 4, c.woodLight);
      g.r(4, 5, w - 8, 10, c.woodShade); g.r(4, h - 16, w - 8, 12, c.woodShade);
      g.px(w - 3, Math.floor(h / 2), '#e6c46a'); g.px(w - 3, Math.floor(h / 2) + 1, '#c9a24a');
    } else {
      const sky = skyColors(env);
      g.r(2, 1, w - 4, h - 2, sky[1]); g.r(2, h - 10, w - 4, 9, '#5f8f4e');
      const dw = Math.round(2 + open * 18);
      g.sq(w - 1, 0, dw, 4, c.trim); g.r(w, 1, dw - 2, 2, c.wood);
      g.r(w - 1, 0, 1, h, c.trim);
    }
  };
  T.porch_lantern = (g, w, h, o) => {
    const on = !o.state.off;
    g.r(2, 0, 4, 2, '#2b2d3a');
    g.o(1, 2, w - 2, h - 4, on ? '#ffcf80' : '#4a4f5a');
    if (on) g.r(3, 4, 2, h - 8, '#fffbe6');
    g.r(2, h - 2, 4, 2, '#2b2d3a');
  };
  T.house_front_door = (g, w, h, o) => {
    const c = P.living, open = Math.max(0, Math.min(1, o.state.openAmt || 0));
    g.sq(0, 0, w, h, '#f4ecdc');
    g.r(3, 3, w - 6, h - 4, '#1b141c');
    // Interior foyer threshold revealed clearly as the front door swings open inward
    if (open > 0.04) {
      g.r(3, 3, w - 6, h - 4, '#2d212c');
      g.r(5, 5, w - 10, h - 16, '#483446');
      g.r(3, h - 12, w - 6, 11, c.floorShade);
      g.r(3, h - 12, w - 6, 3, c.floor);
      g.r(7, h - 11, w - 14, 1, c.floorLight);
    }
    const dw = Math.max(2, Math.round((w - 6) * (1 - open * 0.88)));
    g.box(3, 3, dw, h - 4, '#7a4f33', '#99674a', '#5c3a24');
    if (dw > 10) {
      g.sq(6, 7, dw - 6, 14, '#f4ecdc');
      g.r(7, 8, dw - 8, 12, '#ffe0a8');
      g.r(Math.floor(3 + dw / 2), 8, 1, 12, '#f4ecdc');
      g.o(6, 25, dw - 6, 18, null, '#5c3a24');
      // Brass doorknob & lock cylinder
      g.r(3 + dw - 5, 25, 2, 5, o.state.unlocked ? '#8fd48a' : '#e6c46a');
      g.px(3 + dw - 4, 26, '#2a1e2e');
    } else if (open > 0.04) {
      g.px(3 + dw - 1, 26, '#e6c46a');
    }
  };

  A.kit = { flower, stem, leaf, bouquetHeads, potPlant, clockFace, minutesNow, skyColors, skyPane, lampOn, dimmed, seedOf };
})();

