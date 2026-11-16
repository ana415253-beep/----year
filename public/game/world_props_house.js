// Prop art for the hallway and kitchen (same conventions as world_props.js).
(function () {
  const P = PALETTE, OL = P.outline, A = WorldArt, T = A.types, K = A.kit;
  const mix = A.mix, darken = A.darken, lighten = A.lighten, sin = Math.sin;

  // ================================================================= HALLWAY
  // state.openAmt 0..1 opens the door leaf (hinge on the left).
  T.room_door = (g, w, h, o, env) => {
    const c = P.hallway, open = o.state.openAmt || 0;
    const wood = '#b07f58', woodL = '#c99a70', woodS = '#8a603f';
    g.sq(0, 0, w, h, c.wainscot); g.r(1, 1, w - 2, 1, c.wainscotLight);
    const dx = 3, dy = 3, dw = w - 6, dh = h - 3;
    const inside = o.variant === 'kitchen' ? P.kitchen.floorB : P.bedroom.floor;
    g.r(dx, dy, dw, dh, '#2a2030');
    g.r(dx, dy + dh - 9, dw, 9, darken(inside, 0.45));
    g.r(dx, dy + dh - 9, dw, 1, darken(inside, 0.2));
    const lw = Math.round(dw * (1 - open * 0.82));
    if (lw > 0) {
      g.r(dx, dy, lw, dh, wood); g.r(dx, dy, 1, dh, woodL); g.r(dx + lw - 1, dy, 1, dh, woodS);
      if (lw > 9) { g.sq(dx + 3, dy + 4, lw - 6, 14, wood, woodS); g.r(dx + 4, dy + 5, lw - 8, 1, woodL); g.sq(dx + 3, dy + 22, lw - 6, dh - 26, wood, woodS); g.r(dx + 4, dy + 23, lw - 8, 1, woodL); }
      g.px(dx + lw - 3, dy + 21, '#e6c46a'); g.px(dx + lw - 3, dy + 22, '#c9a24a');
    }
    g.r(dx - 1, dy + dh - 1, dw + 2, 1, OL);
    // Little name plaque above the door.
    const cx = Math.floor(w / 2);
    g.o(cx - 5, -7, 11, 7, '#f4ecdc');
    if (o.variant === 'kitchen') {
      g.r(cx - 2, -4, 4, 2, '#c2453f'); g.px(cx + 2, -4, '#c2453f'); g.px(cx - 1, -6, '#9aa3ad'); g.px(cx + 1, -6, '#9aa3ad');
    } else {
      g.r(cx - 3, -5, 2, 3, '#e6c46a'); g.px(cx - 1, -6, '#e6c46a'); g.px(cx - 1, -2, '#e6c46a'); g.px(cx + 2, -5, '#e6c46a'); g.px(cx + 3, -3, '#f4d88a');
    }
  };
  // state.photoDown lays the framed photo face down.
  T.console_table = (g, w, h, o, env) => {
    const c = P.hallway, wood = '#7a4f33', woodL = '#99674a', woodS = '#5c3a24';
    g.shadow(2, h - 2, w - 4);
    g.r(3, 12, 2, h - 12, OL); g.r(w - 5, 12, 2, h - 12, OL);
    g.r(5, h - 6, w - 10, 1, OL);
    g.box(0, 7, w, 6, wood, woodL, woodS);
    g.r(2, 11, w - 4, 1, woodS);
    if (o.state.photoDown) { g.o(5, 5, 11, 3, '#c9a24a'); }
    else {
      g.sq(6, -2, 9, 9, '#c9a24a'); g.r(7, -1, 7, 7, '#f6b26b'); g.r(7, 3, 7, 3, '#e2775f');
      g.px(9, 2, '#bdb7c9'); g.px(9, 1, '#bdb7c9'); g.px(12, 2, '#e27b39'); g.px(12, 1, '#e27b39');
      g.px(15, 6, '#8a603f');
    }
    g.o(20, 4, 9, 4, '#8fb0a8'); g.r(21, 4, 7, 1, '#b5d0c9');
    g.px(23, 3, '#e6c46a'); g.px(24, 3, '#c9a24a'); g.px(25, 2, '#e6c46a');
    g.box(31, 2, 6, 6, '#c97a5c', '#e09a7a', '#8a4a35');
    const sw = Math.round(sin(env.t * 1.4) * 0.6);
    g.px(33 + sw, 0, P.props.leaf); g.px(34, -1, P.props.leaf); g.px(32, -1 + sw, P.props.leafDark); g.px(35 + sw, 1, P.props.leaf);
  };
  T.umbrella_stand = (g, w, h, o, env) => {
    g.shadow(1, h - 2, w - 2);
    g.line(4, 6, 2, -4, '#3d5f8a'); g.r(1, -6, 2, 2, OL); g.px(3, -6, OL); g.px(3, -5, OL);
    g.line(8, 6, 9, -2, '#c2453f'); g.r(8, -4, 3, 2, '#2a2430');
    g.box(1, 5, w - 2, h - 5, '#5f7f9e', '#7a9bba', '#486684');
    g.o(0, 4, w, 3, '#7a9bba');
    for (let y = 9; y < h - 3; y += 4) g.r(2, y, w - 4, 1, '#486684');
  };
  T.radiator = (g, w, h, o, env) => {
    g.r(2, h - 2, 2, 2, OL); g.r(w - 4, h - 2, 2, 2, OL);
    g.o(0, 1, w, h - 2, '#e8e4dc');
    for (let x = 2; x < w - 2; x += 3) { g.r(x, 2, 2, h - 5, '#f6f3ee'); g.r(x + 2, 2, 1, h - 5, '#bdb8ae'); }
    g.r(1, h - 4, w - 2, 1, '#bdb8ae');
    g.r(w - 2, h - 6, 3, 2, '#c9a24a');
    if (env.light.level < 0.99) for (let i = 0; i < 3; i++) {
      const ph = (env.t * 0.7 + i * 0.33) % 1;
      g.px(6 + i * 9 + Math.round(sin(env.t * 3 + i) * 1), Math.round(-1 - ph * 6), 'rgba(255,255,255,0.18)');
    }
  };
  T.runner_rug = (g, w, h, o) => {
    const c = P.hallway;
    for (let y = 2; y < h - 2; y += 2) { g.px(0, y, '#e6d6b0'); g.px(w - 1, y, '#e6d6b0'); }
    g.o(1, 0, w - 2, h, c.runner);
    g.o(3, 2, w - 6, h - 4, null, c.runnerPattern);
    for (let x = 8; x < w - 8; x += 12) {
      const cy = Math.floor(h / 2);
      g.px(x, cy, c.runnerPattern); g.px(x - 1, cy - 1, c.runnerPattern); g.px(x + 1, cy - 1, c.runnerPattern);
      g.px(x - 1, cy + 1, c.runnerPattern); g.px(x + 1, cy + 1, c.runnerPattern);
      g.px(x + 6, cy - 5, darken(c.runner, 0.25)); g.px(x + 6, cy + 5, darken(c.runner, 0.25));
    }
  };
  T.picture_frame = (g, w, h, o) => {
    const R = A.rng(K.seedOf(o.id)), tilt = o.variant === 'tilt';
    const frame = o.variant === 'small' ? '#e6c46a' : '#6b412a';
    const skies = ['#8fc4e8', '#f6b26b', '#c9bfdc', '#9fd6ff'];
    g.r(1, 1, w, h, 'rgba(40,20,30,0.25)');
    for (let y = 0; y < h; y++) {
      const off = tilt ? Math.round((y - h / 2) * -0.15) : 0;
      g.r(off, y, w, 1, frame);
    }
    const sky = skies[Math.floor(R() * skies.length)];
    for (let y = 2; y < h - 2; y++) {
      const off = tilt ? Math.round((y - h / 2) * -0.15) : 0;
      g.r(off + 2, y, w - 4, 1, y > h * 0.6 ? '#5f8f4e' : sky);
    }
    if (w > 12) { g.px(Math.floor(w / 2) - 1, Math.floor(h * 0.6) - 1, '#bdb7c9'); g.px(Math.floor(w / 2) + 2, Math.floor(h * 0.6) - 1, '#e27b39'); }
    else g.px(Math.floor(w / 2), Math.floor(h / 2), '#f39bb6');
  };
  T.sconce = (g, w, h, o, env) => {
    const on = K.lampOn(o, env);
    g.r(3, 4, 2, h - 4, '#c9a24a'); g.o(2, h - 3, 4, 3, '#c9a24a');
    for (let y = 0; y < 6; y++) { const hw = 2 + Math.floor(y / 2); g.r(4 - hw - 1, y, hw * 2 + 2, 1, OL); g.r(4 - hw, y, hw * 2, 1, on ? (y > 3 ? '#fff3c4' : '#f8e3b0') : '#e8d9c3'); }
  };

  // ================================================================= KITCHEN
  // state.open swings the lower door open and lights the inside.
  T.refrigerator = (g, w, h, o, env) => {
    const c = P.kitchen, open = o.state.open;
    g.shadow(1, h - 2, w - 2);
    g.box(0, 0, w, h, c.fridge, '#ffffff', c.fridgeShade);
    g.r(1, 19, w - 2, 1, OL);
    g.r(w - 5, 6, 2, 9, '#9aa3ad'); g.px(w - 5, 6, '#c3cad2');
    g.r(2, h - 4, w - 4, 2, c.fridgeShade);
    if (open) {
      g.r(2, 21, w - 4, h - 26, '#fff8e6');
      for (const y of [31, 42]) g.r(2, y, w - 4, 1, '#c9d8dc');
      g.o(4, 23, 6, 8, '#f6f3ee'); g.r(5, 24, 4, 2, '#4a6fa5');
      g.disc(16, 28, 2, '#e8574a'); g.px(16, 25, P.props.leaf); g.disc(21, 29, 1, '#e8574a');
      g.o(25, 34, 7, 8, '#f39bb6'); g.r(26, 37, 5, 1, '#fbd0dd');
      g.o(5, 35, 9, 7, '#e9dcc0'); g.r(6, 38, 7, 1, '#c2453f');
      g.r(5, h - 9, 10, 4, '#7fd48a'); g.r(18, h - 9, 10, 4, '#f2c94c');
      g.box(w - 1, 18, 9, h - 21, c.fridge, '#ffffff', c.fridgeShade);
      g.r(w, 26, 7, 1, '#c9d8dc'); g.r(w, 36, 7, 1, '#c9d8dc');
      g.r(w + 1, 23, 2, 3, '#4a6fa5'); g.r(w + 4, 33, 2, 3, '#e6c46a');
    } else {
      g.r(w - 5, 24, 2, 14, '#9aa3ad'); g.px(w - 5, 24, '#c3cad2');
      g.r(6, 25, 9, 11, '#fbf7f2'); g.r(7, 26, 7, 1, '#bdb7c9'); g.r(7, 28, 6, 1, '#bdb7c9'); g.r(7, 30, 7, 1, '#bdb7c9');
      g.px(10, 24, '#d6455a');
      g.sq(17, 27, 8, 10, '#ffffff', '#c9c3b6'); g.r(18, 28, 6, 5, '#f6b26b'); g.px(19, 31, '#bdb7c9'); g.px(22, 31, '#e27b39');
      g.px(21, 26, '#4a6fa5');
      g.disc(8, 44, 1, '#7fd48a'); g.disc(13, 47, 1, '#f39bb6'); g.r(19, 44, 3, 3, '#f2c94c');
      g.text('HI', 5, 9, '#8fb0a8');
    }
  };
  T.kitchen_counter = (g, w, h, o, env) => {
    const c = P.kitchen, oven = o.variant === 'oven';
    g.shadow(1, h - 2, w - 2);
    g.box(0, 9, w, h - 9, c.cabinet, lighten(c.cabinet, 0.2), c.cabinetShade);
    g.r(1, h - 3, w - 2, 2, darken(c.cabinetShade, 0.3));
    if (oven) {
      const hot = o.state.ovenOn;
      g.r(2, 11, w - 4, 2, '#3a3540');
      for (let i = 0; i < 4; i++) g.px(5 + i * 7, 11, hot && i === 1 ? '#e8574a' : '#c3cad2');
      g.sq(3, 14, w - 6, h - 17, '#3a3540', OL);
      g.r(6, 17, w - 12, 4, hot ? '#e2775f' : '#1c1820');
      g.r(6, 17, w - 12, 1, hot ? '#f6b26b' : '#2b2d3a');
      g.r(5, 15, w - 10, 1, '#c3cad2');
    } else {
      const doors = Math.max(2, Math.round(w / 22)), dw = Math.floor((w - 4) / doors);
      for (let i = 0; i < doors; i++) {
        const x = 2 + i * dw;
        g.sq(x, 12, dw - 1, h - 15, c.cabinet, c.cabinetShade);
        g.r(x + 1, 13, dw - 3, 1, lighten(c.cabinet, 0.15));
        g.r(i % 2 ? x + 2 : x + dw - 5, 16, 2, 1, '#e8e4dc');
      }
    }
    g.box(0, 0, w, 11, c.counterTop, lighten(c.counterTop, 0.25), darken(c.counterTop, 0.25));
    g.r(1, 8, w - 2, 1, darken(c.counterTop, 0.15));
    if (!oven) {
      g.o(w - 26, 1, 12, 6, '#c2a27a'); g.r(w - 25, 2, 10, 1, '#d8bc95');
      g.o(w - 12, -2, 5, 7, '#efe6d2'); g.px(w - 11, -3, P.props.leaf);
      g.o(w - 7, 0, 4, 5, '#c97a5c');
    }
  };
  // state.running turns on the tap.
  T.sink = (g, w, h, o, env) => {
    g.o(0, 4, w, h - 4, '#c3cad2'); g.o(2, 5, w - 4, h - 7, '#8a939d'); g.r(3, 6, w - 6, 1, '#727b86');
    g.r(Math.floor(w / 2) - 1, -2, 2, 6, '#9aa3ad'); g.r(Math.floor(w / 2) - 1, -2, 5, 2, '#9aa3ad'); g.px(Math.floor(w / 2) + 3, 0, '#c3cad2');
    g.px(Math.floor(w / 2) - 4, 2, '#c2453f'); g.px(Math.floor(w / 2) + 5, 2, '#4a6fa5');
    if (o.state.running) {
      const x = Math.floor(w / 2) + 3;
      for (let y = 1; y < h - 3; y++) g.px(x, y, (Math.floor(env.t * 20) + y) % 3 ? '#9fd6ff' : '#e8f6ff');
      g.px(x - 1 + Math.floor(env.t * 13) % 3, h - 4, '#e8f6ff');
    } else {
      g.r(3, 7, 5, 2, '#fbf7f2'); g.px(4, 6, '#bdb7c9');
    }
  };
  // state.kettle: 'cold' | 'boiling'; state.on lights the burner under it.
  T.stove = (g, w, h, o, env) => {
    const on = o.state.on || o.state.kettle === 'boiling';
    g.o(0, 7, w, h - 7, '#3a3540'); g.r(1, 8, w - 2, 1, '#55505e');
    for (const [x, y] of [[7, 10], [w - 8, 10], [7, 13], [w - 8, 13]]) { g.r(x - 2, y, 5, 1, '#1c1820'); g.px(x, y, '#727b86'); }
    if (on) { g.r(w - 10, 13, 5, 1, Math.floor(env.t * 10) % 2 ? '#e8574a' : '#f2a33a'); g.px(w - 8, 12, '#f2a33a'); }
    const kx = w - 14;
    g.o(kx, 3, 12, 9, '#e8574a'); g.r(kx + 1, 4, 10, 1, '#f39b8a'); g.r(kx + 1, 10, 10, 1, '#b8392f');
    g.r(kx + 3, 1, 6, 1, OL); g.px(kx + 2, 2, OL); g.px(kx + 9, 2, OL);
    g.r(kx + 5, 2, 2, 1, '#2a2430');
    g.line(kx - 1, 7, kx - 3, 4, '#b8392f'); g.px(kx - 3, 3, '#b8392f');
    if (o.state.kettle === 'boiling') {
      for (let i = 0; i < 4; i++) {
        const ph = (env.t * 0.9 + i * 0.25) % 1;
        g.px(kx - 3 + Math.round(sin(env.t * 4 + i * 2) * 1.5) - Math.round(ph * 2), 2 - Math.round(ph * 10), `rgba(255,255,255,${(0.75 * (1 - ph)).toFixed(2)})`);
      }
    }
    g.o(2, 3, 9, 5, '#727b86'); g.r(3, 4, 7, 1, '#9aa3ad'); g.r(-2, 4, 4, 1, '#3a3540');
  };
  // state.runnerLifted flips the runner corner to reveal a folded note.
  T.dining_table = (g, w, h, o, env) => {
    const c = P.living, wood = '#a8714a', woodL = '#bd855b', woodS = '#8c5b3a';
    g.shadow(3, h - 2, w - 6);
    for (const x of [4, w - 7]) { g.r(x, 22, 3, h - 22, OL); g.r(x + 1, 22, 1, h - 23, woodL); }
    g.box(0, 0, w, 26, wood, woodL, woodS);
    g.r(1, 22, w - 2, 3, woodS); g.r(1, 22, w - 2, 1, mix(woodS, wood, 0.5));
    for (let i = 0; i < 5; i++) g.r(4 + i * 18, 4 + (i % 2) * 8, 10, 1, mix(wood, woodL, 0.6));
    const kc = P.kitchen;
    const rx = 8, rw = w - 16, ry = 8, rh = 9;
    g.r(rx, ry, rw, rh, kc.runner); g.r(rx, ry, rw, 1, lighten(kc.runner, 0.2));
    for (let x = rx + 3; x < rx + rw - 2; x += 5) { g.px(x, ry + 3, kc.runnerDot); g.px(x + 2, ry + 6, kc.runnerDot); }
    for (let x = rx; x < rx + rw; x += 2) { g.px(x, ry - 1, '#e8e2d4'); g.px(x, ry + rh, '#e8e2d4'); }
    if (o.state.runnerLifted) {
      g.r(rx + rw - 12, ry, 12, rh, wood);
      g.r(rx + rw - 18, ry - 4, 8, 6, kc.runner); g.px(rx + rw - 17, ry - 3, kc.runnerDot);
      g.o(rx + rw - 9, ry + 2, 8, 6, '#fbf7f2'); g.r(rx + rw - 8, ry + 4, 5, 1, '#bdb7c9'); g.px(rx + rw - 4, ry + 3, '#d6455a');
    }
    g.ellipse(Math.floor(w / 2), 10, 7, 3, '#efe6d2'); g.r(Math.floor(w / 2) - 7, 10, 15, 2, '#c9c3b6');
    g.disc(Math.floor(w / 2) - 3, 8, 2, '#e8574a'); g.disc(Math.floor(w / 2) + 2, 8, 2, '#f2c94c'); g.disc(Math.floor(w / 2), 6, 2, '#7fd48a');
    for (const x of [16, w - 26]) { g.ellipse(x + 5, 19, 6, 2, '#f6f3ee'); g.ellipse(x + 5, 19, 3, 1, '#e8e4dc'); }
  };
  function sideChair(g, w, h, flip) {
    const X = (x, ww) => flip ? w - x - (ww || 1) : x;
    const wood = '#8c5a3c', woodL = '#ab7652', woodS = '#6b412a';
    g.shadow(2, h - 2, w - 4);
    g.r(X(3, 2), 2, 2, h - 2, OL); g.r(X(4, 1), 3, 1, h - 10, woodL);
    g.r(X(3, 4), 0, 4, 2, OL);
    for (let y = 4; y < 11; y += 3) g.r(X(5, 3), y, 3, 1, woodS);
    g.r(X(3, 15), 12, 15, 4, OL); g.r(X(4, 13), 13, 13, 2, wood); g.r(X(4, 13), 13, 13, 1, woodL);
    g.r(X(15, 2), 16, 2, h - 16, OL);
    g.r(X(4, 13), 13, 6, 1, '#e8c9a8');
  }
  T.dining_chair = (g, w, h, o, env) => {
    const v = o.variant || 'down';
    const wood = '#8c5a3c', woodL = '#ab7652', woodS = '#6b412a';
    if (v === 'right' || v === 'left') { sideChair(g, w, h, v === 'left'); return; }
    g.shadow(2, h - 2, w - 4);
    if (v === 'down') {
      g.r(3, 0, 2, h - 6, OL); g.r(w - 5, 0, 2, h - 6, OL);
      g.o(3, 0, w - 6, 4, wood); g.r(4, 1, w - 8, 1, woodL);
      for (let x = 7; x < w - 6; x += 3) g.r(x, 4, 1, 6, woodS);
      g.box(2, 10, w - 4, 5, wood, woodL, woodS);
      g.r(3, 15, 2, h - 15, OL); g.r(w - 5, 15, 2, h - 15, OL);
    } else {
      g.r(3, 8, 2, h - 8, OL); g.r(w - 5, 8, 2, h - 8, OL);
      g.box(2, 7, w - 4, 4, wood, woodL, woodS);
      g.r(3, 0, 2, 9, OL); g.r(w - 5, 0, 2, 9, OL);
      g.o(3, 0, w - 6, 4, wood); g.r(4, 1, w - 8, 1, woodL);
      for (let x = 7; x < w - 6; x += 3) g.r(x, 4, 1, 4, woodS);
      g.r(5, h - 6, w - 10, 1, woodS);
    }
  };
  T.wall_cabinets = (g, w, h, o, env) => {
    const c = P.kitchen;
    g.r(1, h, w - 2, 2, 'rgba(40,20,30,0.18)');
    g.box(0, 0, w, h, c.cabinet, lighten(c.cabinet, 0.2), c.cabinetShade);
    const n = 4, dw = Math.floor((w - 4) / n);
    for (let i = 0; i < n; i++) {
      const x = 2 + i * dw, glass = i === 1 || i === 2;
      g.sq(x, 2, dw - 1, h - 5, glass ? '#d8eef2' : c.cabinet, c.cabinetShade);
      if (glass) {
        for (let k = 0; k < 3; k++) g.disc(x + 5 + k * 5, h - 9, 2, '#fbf7f2', '#c9d8dc');
        g.r(x + 1, Math.floor(h / 2) - 1, dw - 3, 1, c.cabinetShade);
        g.r(x + 3, 4, 3, 4, '#f39bb6'); g.r(x + 8, 5, 3, 3, '#e6c46a');
        g.line(x + 2, 3, x + 5, h - 6, 'rgba(255,255,255,0.5)');
      } else g.r(x + 2, 4, dw - 5, 1, lighten(c.cabinet, 0.15));
      g.r(i < 2 ? x + dw - 4 : x + 2, h - 6, 1, 2, '#e8e4dc');
    }
    g.r(3, h - 2, w - 6, 1, '#fff3c4');
  };
  T.hanging_pans = (g, w, h, o, env) => {
    g.r(0, 0, w, 2, '#727b86'); g.px(0, 0, OL); g.px(w - 1, 0, OL);
    const pans = [[5, 3, '#3a3540'], [15, 4, '#b0654a'], [25, 3, '#3a3540']];
    pans.forEach(([x, r, col], i) => {
      const sw = Math.round(sin(env.t * 0.8 + i * 1.9) * 0.5);
      g.line(x, 2, x + sw, 6, '#9aa3ad');
      g.r(x - 1 + sw, 6, 2, 4, '#5c3a24');
      g.disc(x + sw, 10 + r, r, col, OL);
      g.px(x + sw - r + 1, 10 + r - 1, lighten(col, 0.35));
    });
  };
})();

