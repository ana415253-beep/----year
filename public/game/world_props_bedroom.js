// Prop art for the bedroom and studio (same conventions as world_props.js).
(function () {
  const P = PALETTE, OL = P.outline, A = WorldArt, T = A.types, K = A.kit;
  const mix = A.mix, darken = A.darken, lighten = A.lighten, sin = Math.sin;
  const B = P.bedroom;
  const BEIGE = '#d9d0b8', BEIGE_L = '#ece5d0', BEIGE_S = '#b9ae93';

  // state.made: false shows a rumpled blanket until Roni straightens it.
  // Sized cleanly for a shared 70x70 double bed with two pillows at the headboard.
  T.bed = (g, w, h, o, env) => {
    const wood = '#8a5a3c', woodL = '#ab7652', woodS = '#6b412a';
    g.shadow(2, h - 2, w - 4);
    g.r(3, h - 5, 4, 5, woodS); g.r(w - 7, h - 5, 4, 5, woodS);
    g.box(0, 2, w, 18, wood, woodL, woodS);
    g.r(2, 0, w - 4, 3, OL); g.r(3, 1, w - 6, 2, woodL);
    const panelW = Math.max(10, Math.floor((w - 16) / 3));
    for (let x = 6; x < w - 10; x += panelW + 3) g.sq(x, 5, panelW, 10, wood, woodS);
    const sheetY = 15, sheetH = Math.max(28, h - 21);
    g.box(2, sheetY, w - 4, sheetH, B.bedSheet, '#ffffff', B.bedSheetShade);
    const made = o.state.made !== false;
    const blankY = sheetY + 13, blankH = sheetH - 13;
    if (made) {
      g.box(2, blankY, w - 4, blankH, B.blanket, lighten(B.blanket, 0.2), B.blanketShade);
      g.r(3, blankY, w - 6, 3, '#fbf7f2'); g.r(3, blankY + 3, w - 6, 1, B.bedSheetShade);
      g.r(Math.floor(w / 2), blankY + 5, 1, blankH - 7, mix(B.blanket, B.blanketShade, 0.45));
      for (let y = blankY + 7; y < blankY + blankH - 3; y += 6) {
        for (let x = 7; x < w - 6; x += 11) {
          g.px(x, y, B.blanketShade); g.px(x + 5, y + 2, lighten(B.blanket, 0.15));
        }
      }
    } else {
      for (let y = blankY - 2; y < blankY + blankH; y++) {
        const wob = Math.round(sin(y * 0.9) * 2);
        const x0 = 2 + (y < blankY + 7 ? 8 + wob : wob);
        const x1 = w - 2 - (y < blankY + 4 ? 14 : 0);
        g.r(x0, y, Math.max(4, x1 - x0), 1, (y + Math.floor(x0 / 3)) % 5 ? B.blanket : B.blanketShade);
        g.px(x0, y, OL);
      }
      g.line(12, blankY + 2, 34, blankY + 12, B.blanketShade);
      g.line(40, blankY + 1, w - 10, blankY + 10, B.blanketShade);
      g.o(w - 14, blankY + blankH - 8, 12, 8, B.blanket);
    }
    g.box(1, h - 7, w - 2, 5, wood, woodL, woodS);
  };
  T.pillow = (g, w, h, o, env) => {
    g.o(0, 2, w, h - 2, B.bedSheet); g.r(1, 3, w - 2, 2, '#ffffff');
    g.r(2, h - 3, w - 4, 1, B.bedSheetShade); g.px(Math.floor(w / 2), Math.floor(h / 2) + 1, B.bedSheetShade);
    g.px(0, 2, B.bedSheet); g.px(w - 1, 2, B.bedSheet);
  };
  // state.hugT (env time of the last hug) squishes the teddy.
  T.teddy = (g, w, h, o, env) => {
    const fur = '#a8754e', furS = '#8a5a3a', furL = '#c99a70';
    const dt = o.state.hugT != null ? env.t - o.state.hugT : 9;
    const sq = dt < 0.6 ? Math.round((1 - dt / 0.6) * 2) : 0;
    const cx = Math.floor(w / 2);
    g.shadow(2, h - 2, w - 4);
    g.ellipse(cx, 13 + sq, 5 + sq, 4 - Math.min(sq, 1), OL); g.ellipse(cx, 13 + sq, 4 + sq, 3 - Math.min(sq, 1), fur);
    g.ellipse(cx, 14 + sq, 2, 2, furL);
    g.o(1, h - 4, 5, 4, fur); g.o(w - 6, h - 4, 5, 4, fur); g.px(3, h - 2, furL); g.px(w - 4, h - 2, furL);
    g.disc(cx, 6 + sq, 4, fur, OL);
    g.disc(cx - 4, 2 + sq, 1, fur, OL); g.disc(cx + 4, 2 + sq, 1, fur, OL); g.px(cx - 4, 2 + sq, furS); g.px(cx + 4, 2 + sq, furS);
    g.ellipse(cx, 8 + sq, 2, 1, furL); g.px(cx, 7 + sq, OL);
    g.px(cx - 2, 5 + sq, OL); g.px(cx + 2, 5 + sq, OL);
    g.r(cx - 2, 10 + sq, 5, 1, '#d6455a'); g.px(cx, 11 + sq, '#d6455a');
    if (dt < 1.2) { const ph = dt / 1.2; g.px(w - 2, Math.round(2 - ph * 6), '#f39bb6'); g.px(w - 1, Math.round(1 - ph * 6), '#f39bb6'); }
  };
  T.bedside_table = (g, w, h, o, env) => {
    const wood = '#8a5a3c', woodL = '#ab7652', woodS = '#6b412a';
    g.shadow(2, h - 2, w - 4);
    g.r(3, h - 4, 3, 4, OL); g.r(w - 6, h - 4, 3, 4, OL);
    g.box(1, 7, w - 2, h - 10, wood, null, woodS);
    g.sq(4, 10, w - 8, 7, wood, woodS); g.r(Math.floor(w / 2) - 2, 13, 4, 1, '#e6c46a');
    g.r(4, 19, w - 8, 1, woodS);
    g.box(0, 0, w, 8, woodL, lighten(woodL, 0.2), wood);
    g.o(w - 10, 1, 8, 5, '#3a3540'); g.r(w - 9, 2, 6, 3, '#1a1420');
    const blink = Math.floor(env.t * 2) % 2;
    g.r(w - 8, 3, 2, 1, '#e8574a'); g.px(w - 6, 3, blink ? '#e8574a' : '#1a1420'); g.r(w - 5, 3, 2, 1, '#e8574a');
    g.o(2, 2, 8, 4, '#4a6fa5'); g.r(3, 3, 6, 1, '#fbf7f2');
  };
  T.bedside_lamp = (g, w, h, o, env) => {
    const on = K.lampOn(o, env);
    g.o(1, h - 4, w - 2, 4, '#8fb0a8'); g.r(2, h - 3, w - 4, 1, '#b5d0c9');
    g.r(4, 7, 2, h - 10, '#c9a24a');
    for (let y = 0; y < 8; y++) { const hw = 2 + Math.floor(y / 3); g.r(5 - hw - 1, y, hw * 2 + 2, 1, OL); g.r(5 - hw, y, hw * 2, 1, on ? (y > 5 ? '#fff3c4' : '#f8e3b0') : '#d9cdb5'); }
    g.line(7, 9, 8, 12, '#4a3a4e'); g.px(8, 13, '#c9a24a');
  };
  // state.open shows the clothes inside (fits compact 42x28 footprint cleanly above the bed).
  T.wardrobe = (g, w, h, o, env) => {
    const wood = '#7a4f33', woodL = '#99674a', woodS = '#5c3a24';
    g.shadow(1, h - 2, w - 2);
    g.r(3, h - 3, 4, 3, OL); g.r(w - 7, h - 3, 4, 3, OL);
    g.box(0, 3, w, h - 5, wood, woodL, woodS);
    g.r(0, 0, w, 4, OL); g.r(1, 1, w - 2, 2, woodL);
    const hw = Math.floor((w - 4) / 2);
    const innerH = Math.max(8, h - 10);
    if (o.state.open) {
      g.r(2, 5, w - 4, innerH, '#2a2030');
      g.r(3, 7, w - 6, 1, '#9aa3ad');
      const clothes = [[5, '#33456e', innerH - 5], [11, '#4f7a4c', innerH - 6], [17, '#ece0c6', innerH - 4], [23, '#4f7a4c', innerH - 6], [29, '#d6455a', innerH - 4]];
      clothes.forEach(([x, col, len]) => {
        if (x + 5 >= w - 2) return;
        const sw = Math.round(sin(env.t * 1.2 + x) * 0.4);
        g.px(x + 2, 7, '#c3cad2');
        g.o(x + sw, 8, 5, Math.max(4, len), col); g.r(x + 1 + sw, 9, 1, Math.max(2, len - 2), lighten(col, 0.2));
      });
      g.box(0, 4, 5, h - 7, wood, woodL, woodS); g.box(w - 5, 4, 5, h - 7, wood, woodL, woodS);
      g.px(2, Math.floor(h / 2), '#e6c46a'); g.px(w - 3, Math.floor(h / 2), '#e6c46a');
    } else {
      for (const x of [2, 2 + hw]) {
        g.sq(x, 5, hw, innerH, wood, woodS);
        g.sq(x + 3, 7, hw - 6, Math.max(5, innerH - 4), wood, woodS);
        g.r(x + 4, 8, hw - 8, 1, woodL);
      }
      const mid = Math.floor(w / 2);
      g.r(mid - 3, Math.floor(h / 2) - 1, 2, 3, '#e6c46a');
      g.r(mid + 1, Math.floor(h / 2) - 1, 2, 3, '#e6c46a');
    }
  };
  // state.covered drapes a cloth over the canvas (42x42 grid footprint).
  T.easel = (g, w, h, o, env) => {
    const wood = '#ab7652', woodS = '#8a5a3c';
    const cx = Math.floor(w / 2);
    g.shadow(2, h - 2, w - 4);
    g.line(cx, 10, cx, h - 3, woodS);
    g.line(cx, 0, 5, h - 1, OL); g.line(cx + 1, 0, 6, h - 1, wood);
    g.line(cx, 0, w - 6, h - 1, OL); g.line(cx - 1, 0, w - 7, h - 1, wood);
    const x0 = 5, y0 = 4, cw = w - 10, ch = Math.max(18, h - 18);
    if (o.state.covered) {
      for (let y = y0 - 1; y < y0 + ch + 5; y++) {
        const ww = cw + 2 + Math.round((y - y0) / 7) * 2 + (y > y0 + ch ? Math.round(sin(y + env.t * 0.8) * 1) : 0);
        g.r(cx - Math.floor(ww / 2), y, ww, 1, (y % 4) ? '#e8e2d4' : '#d3cbbb');
      }
      g.px(cx, y0 - 1, OL);
    } else {
      g.sq(x0, y0, cw, ch, '#fbf7f2');
      for (let y = 1; y < ch - 1; y++) {
        const k = y / ch, col = k < 0.3 ? '#8c4f7a' : k < 0.5 ? '#e2775f' : k < 0.62 ? '#f6b26b' : '#5f8f4e';
        g.r(x0 + 1, y0 + y, cw - 2, 1, col);
      }
      g.disc(x0 + cw - 8, y0 + Math.floor(ch * 0.54), 3, '#f9d27a');
      const fy = y0 + ch - 7;
      g.r(x0 + 9, fy, 3, 5, '#bdb7c9'); g.disc(x0 + 10, fy - 1, 2, '#bdb7c9'); g.px(x0 + 9, fy - 4, '#bdb7c9'); g.px(x0 + 11, fy - 4, '#bdb7c9');
      g.px(x0 + 10, fy - 3, '#d6455a');
      g.r(x0 + 15, fy, 3, 5, '#e27b39'); g.disc(x0 + 16, fy - 1, 2, '#e27b39'); g.px(x0 + 15, fy - 4, '#e27b39'); g.px(x0 + 17, fy - 4, '#e27b39');
      g.line(x0 + 18, fy + 4, x0 + 21, fy + 2, '#e27b39');
      g.px(x0 + 13, fy - 3, '#f39bb6'); g.px(x0 + 12, fy - 4, '#f39bb6'); g.px(x0 + 14, fy - 4, '#f39bb6');
      g.r(x0 + 1, y0 + 1, 6, 7, '#fbf7f2'); g.line(x0 + 2, y0 + 3, x0 + 5, y0 + 2, '#bdb7c9');
    }
    g.r(3, y0 + ch, w - 6, 3, OL); g.r(4, y0 + ch + 1, w - 8, 1, wood);
    g.r(cx - 3, y0 - 3, 6, 3, OL); g.r(cx - 2, y0 - 2, 4, 1, wood);
  };
  T.art_table = (g, w, h, o, env) => {
    const wood = '#c99a70', woodL = '#dbb48a', woodS = '#a8754e';
    g.shadow(3, h - 2, w - 6);
    for (const x of [3, w - 6]) { g.r(x, 14, 3, h - 14, OL); g.r(x + 1, 15, 1, h - 16, woodS); }
    g.r(6, h - 7, w - 12, 1, OL);
    g.box(0, 0, w, 18, wood, woodL, woodS);
    g.r(1, 14, w - 2, 3, woodS);
    for (const [x, y, c] of [[8, 4, '#d6455a'], [12, 10, '#4a6fa5'], [44, 5, '#f2c94c'], [58, 11, '#7fd48a'], [26, 12, '#f39bb6']]) { g.px(x, y, c); g.px(x + 1, y + 1, c); }
    g.o(46, 2, 18, 11, '#fbf7f2'); g.line(48, 5, 60, 4, '#bdb7c9'); g.line(48, 8, 56, 9, '#bdb7c9'); g.disc(58, 9, 2, '#f39bb6');
    g.o(4, 2, 12, 9, '#7a3e3e'); g.r(5, 3, 1, 7, '#e6c46a');
  };
  T.paint_supplies = (g, w, h, o, env) => {
    g.ellipse(9, 9, 8, 4, OL); g.ellipse(9, 9, 7, 3, '#d8bc95'); g.px(13, 9, '#a8754e');
    for (const [x, y, c] of [[4, 8, '#d6455a'], [7, 7, '#f2c94c'], [10, 7, '#4a6fa5'], [5, 11, '#7fd48a'], [9, 11, '#fbf7f2']]) { g.px(x, y, c); g.px(x + 1, y, c); }
    g.o(19, 3, 6, h - 4, 'rgba(170,215,230,0.85)'); g.r(20, h - 4, 4, 2, 'rgba(120,170,200,0.7)');
    g.line(21, 4, 20, -2, '#8a5a3c'); g.line(23, 4, 24, -3, '#c2453f'); g.line(22, 4, 22, -1, '#e6c46a');
    g.px(20, -3, '#2a2430'); g.px(24, -4, '#2a2430'); g.px(22, -2, '#f39bb6');
    g.r(25, h - 4, 3, 2, '#c3cad2'); g.px(27, h - 4, '#4a6fa5');
  };

  // ================================================================= KALLITA'S MUSIC & VINYL ZONE
  T.vinyl_shelf = (g, w, h, o, env) => {
    const wood = '#7a4f33', woodL = '#99674a', woodS = '#5c3a24';
    g.shadow(1, h - 2, w - 2);
    // Turntable on top
    g.box(2, 2, w - 4, 10, '#3a3540', '#55505e', '#26222c');
    g.ellipse(11, 6, 6, 3, '#1a1420'); g.ellipse(11, 6, 2, 1, '#d6455a'); g.px(11, 6, '#e6c46a');
    g.line(21, 3, 15, 6, '#c3cad2'); g.px(21, 3, '#e6c46a');
    // Main wooden cabinet body with 2 cubbies of colorful vinyl LPs
    g.box(0, 11, w, h - 13, wood, woodL, woodS);
    g.r(2, h - 3, 3, 3, OL); g.r(w - 5, h - 3, 3, 3, OL);
    const cols = ['#d6455a', '#4a6fa5', '#e6c46a', '#5f8a5a', '#8c4f7a', '#f39bb6', '#d98a3a', '#8fd3c4'];
    const R = A.rng(K.seedOf(o.id));
    for (const sy of [14, 26]) {
      g.r(2, sy, w - 4, 10, '#2a2030');
      for (let x = 3; x < w - 4; x += 2) {
        if (x > w - 8 && sy === 26) continue;
        const c = cols[Math.floor(R() * cols.length)];
        g.r(x, sy + 1, 2, 9, c); g.px(x, sy + 2, lighten(c, 0.25));
      }
      g.r(1, sy + 10, w - 2, 2, woodL);
    }
    // Leaning sleeve on bottom cubby
    g.o(w - 9, 27, 6, 8, '#f2c94c'); g.px(w - 7, 30, '#2a2430');
  };

  T.guitar = (g, w, h) => {
    const body = '#c96a38', bodyL = '#e89c54', bodyS = '#8f3f1d';
    g.shadow(4, h - 2, w - 8);
    // Floor A-stand
    g.line(9, 13, 6, h - 2, '#3a3540'); g.line(18, 13, 21, h - 2, '#3a3540');
    g.r(7, h - 3, 14, 2, '#2a2430');
    // Neck & headstock
    g.line(17, 11, 22, 2, OL); g.line(18, 11, 23, 2, '#8a5a3c');
    g.r(21, 0, 4, 3, '#5c3a24'); g.px(20, 1, '#c3cad2'); g.px(25, 1, '#c3cad2');
    // Acoustic body
    g.ellipse(13, 19, 7, 6, OL); g.ellipse(13, 19, 6, 5, body);
    g.ellipse(15, 13, 5, 4, OL); g.ellipse(15, 13, 4, 3, bodyL);
    g.ellipse(13, 19, 4, 3, bodyL); g.r(10, 21, 6, 2, bodyS);
    // Soundhole, bridge & strings
    g.disc(14, 15, 2, '#2a1e2e'); g.r(10, 20, 5, 1, '#3a241a');
    g.line(12, 19, 21, 3, '#e8e2d4');
  };

  T.electric_guitar = (g, w, h) => {
    const pal = {
      T: '#c3a06e', // headstock wood
      W: '#ffffff', // tuning edge / pickguard
      D: '#444643', // dark fret / pickup
      L: '#aeaaa7', // light fret / neck highlight
      O: '#457196', // dark slate-blue rim
      B: '#74a1c9', // sky-blue body
    };
    const grid = [
      '......TT....',
      '....TTTW....',
      '.....TTW....',
      '.....TTWW...',
      '....TTT.....',
      '....TTW.....',
      '.....TWW....',
      '.....DD.....',
      '.....LL.....',
      '.....DD.....',
      '.....LL.....',
      '.....DD.....',
      '.....LL.....',
      '.OO..DD...O.',
      '.OBO.LL.OOBO',
      '.OBBODDOWWBO',
      '.OBBWLLWWWBO',
      '.OBBWDDWWWO.',
      '..OBWLLWWB..',
      '..OWDDDDWWO.',
      '.OBWWLLWWWO.',
      '.OBWDDDDWWWO',
      'OBBBWLLWWWWO',
      'OBBBDDDDBBWO',
      'OBBBBBBBBBBO',
      '.OBBBBBBBBO.',
      '..OOOOOOOO..',
    ];
    const ox = Math.floor((w - 12) / 2);
    const oy = Math.max(0, h - 28);
    g.shadow(ox + 1, h - 2, 10);
    for (let r = 0; r < grid.length; r++) {
      const row = grid[r];
      for (let c = 0; c < row.length; c++) {
        const ch = row[c];
        if (ch !== '.') g.px(ox + c, oy + r, pal[ch]);
      }
    }
  };

  T.music_keyboard = (g, w, h, o, env) => {
    g.shadow(4, h - 2, w - 8);
    // X-frame stand legs
    g.line(10, 13, w - 12, h - 2, '#3a3540'); g.line(w - 11, 13, 11, h - 2, '#3a3540');
    g.line(11, 13, w - 11, h - 2, '#55505e'); g.line(w - 10, 13, 12, h - 2, '#55505e');
    g.r(9, h - 2, 6, 2, '#26222c'); g.r(w - 15, h - 2, 6, 2, '#26222c');
    // Synth chassis
    g.box(2, 4, w - 4, 13, '#2d3142', '#454a60', '#1f2230');
    // Control strip + glowing LCD + wheels
    g.r(6, 5, 10, 3, '#1a2a2c');
    g.r(7, 6, 8, 1, Math.floor(env.t * 2) % 2 ? '#8fd3c4' : '#7fd48a');
    for (let x = 20; x < w - 10; x += 4) g.px(x, 6, x % 8 === 0 ? '#f0a6b8' : '#f2c94c');
    g.r(4, 9, 3, 5, '#4a4f5a');
    // White & black piano keys
    const kx = 9, kw = w - 13;
    g.r(kx, 9, kw, 6, '#fbf7f2');
    for (let x = kx + 2; x < kx + kw; x += 3) g.r(x, 9, 1, 6, '#d9d0c0');
    for (let x = kx + 1, i = 0; x < kx + kw - 1; x += 3, i++) {
      if (i % 7 !== 2 && i % 7 !== 6) g.r(x, 9, 2, 3, '#1f1c24');
    }
  };

  T.amplifier = (g, w, h, o, env) => {
    g.shadow(2, h - 2, w - 4);
    g.r(4, h - 2, 3, 2, OL); g.r(w - 7, h - 2, 3, 2, OL);
    g.box(2, 3, w - 4, h - 5, '#3a3540', '#55505e', '#26222c');
    // Top carry handle & gold control plate
    g.r(Math.floor(w / 2) - 4, 1, 8, 2, '#1f1c24');
    g.r(4, 5, w - 8, 4, '#c9a24a');
    for (let x = 6; x < w - 10; x += 4) g.px(x, 7, '#2a2430');
    g.px(w - 7, 7, Math.floor(env.t * 3) % 2 ? '#e8574a' : '#ff8a7a');
    // Woven speaker grille mesh
    g.sq(4, 10, w - 8, h - 14, '#5a5360', '#26222c');
    for (let y = 11; y < h - 5; y += 2) {
      for (let x = 5 + (y % 4 === 1 ? 1 : 0); x < w - 5; x += 2) g.px(x, y, '#7c7484');
    }
    g.r(Math.floor(w / 2) - 3, 14, 6, 1, '#e6c46a');
  };

  // ================================================================= STUDIO (RONI'S TECH ZONE)
  T.server_rack = (g, w, h, o, env) => {
    g.shadow(2, h - 2, w - 4);
    // Steel frame cabinet (42x42)
    g.box(2, 1, w - 4, h - 3, '#2b3040', '#454d66', '#1c1f2b');
    g.r(4, h - 3, 4, 3, '#181a24'); g.r(w - 8, h - 3, 4, 3, '#181a24');
    g.r(4, 3, w - 8, h - 7, '#161924');
    // 4U rack shelves + blinking blue/cyan telemetry LEDs
    const t = env.t;
    for (let u = 0; u < 4; u++) {
      const uy = 5 + u * 8;
      g.box(5, uy, w - 10, 6, '#2f3648', '#454d66', '#212636');
      g.r(7, uy + 2, 10, 2, '#1a1e2b');
      for (let vx = 8; vx < 17; vx += 2) g.px(vx, uy + 2, '#3a4258');
      const blink1 = Math.floor(t * (3 + u) + u) % 2;
      const blink2 = Math.floor(t * (5 - u) + u * 2) % 3 === 0;
      g.px(w - 13, uy + 2, '#78b8ff');
      g.px(w - 10, uy + 2, blink1 ? '#7cf2c4' : '#2a4a44');
      g.px(w - 8, uy + 2, blink2 ? '#8fd3ff' : '#29405c');
    }
    // Subtle front glass sheen
    g.line(7, 4, 15, h - 6, 'rgba(143,211,255,0.14)');
  };

  T.printer = (g, w, h, o, env) => {
    const wood = '#c8b394', woodL = '#dfd0b8', woodS = '#9e8b6f';
    g.shadow(2, h - 2, w - 4);
    // Compact equipment stand below printer (y: 20..42)
    g.box(3, 21, w - 6, h - 23, wood, woodL, woodS);
    g.r(5, 25, w - 10, 12, '#5c4e44');
    // Stack of fresh printer paper on lower shelf
    g.o(8, 29, 14, 6, '#fbf7f2'); g.r(9, 31, 12, 1, '#d9d0c0');
    g.o(24, 27, 10, 8, '#3d5f8a');
    // Printer body on top of stand (y: 3..21)
    g.o(11, 2, 18, 5, '#fbf7f2'); g.r(13, 3, 14, 1, '#d9d0c0');
    g.box(4, 6, w - 8, 15, BEIGE, BEIGE_L, BEIGE_S);
    g.r(5, 7, w - 10, 2, '#727b86');
    // Paper output tray + cyan status LED
    g.r(9, 13, w - 20, 6, '#4a4550');
    g.r(11, 14, 16, 4, '#f4efe6');
    g.px(w - 8, 10, Math.floor(env.t * 2) % 2 ? '#8fd3ff' : '#7fd48a');
  };

  T.long_desk = (g, w, h, o, env) => {
    const wood = '#d8bc95', woodL = '#e9d3b2', woodS = '#b89a72';
    g.shadow(2, h - 2, w - 4);
    for (const x of [2, w - 6]) g.r(x, 19, 4, h - 19, OL);
    g.r(18, 21, w - 36, Math.max(2, h - 24), darken(woodS, 0.3));
    g.box(0, 0, w, 22, wood, woodL, woodS);
    g.r(1, 19, w - 2, 2, woodS); g.r(1, 18, w - 2, 1, mix(wood, woodS, 0.5));
    // Coffee mug on left, desk mat & mouse under monitors, sticky notes on right
    g.o(5, 6, 6, 5, '#fbf7f2'); g.r(6, 7, 4, 1, '#7a3e3e'); g.px(11, 8, '#fbf7f2');
    if (env.light.level < 0.99) g.px(7, 4 - Math.floor(env.t * 2) % 3, 'rgba(255,255,255,0.4)');
    g.o(64, 12, 14, 6, '#3d5f8a'); g.o(71, 13, 4, 4, BEIGE);
    g.r(82, 4, 6, 5, '#f2d16b'); g.r(89, 7, 6, 5, '#f39bb6');
    g.o(2, 12, 9, 5, '#2b2d3a'); g.r(3, 13, 7, 1, '#4a4650');
    if (o.state.roniDying) {
      // Dark crimson blood stains pooling onto the desk wood and dripping over the front lip
      const bDark = '#4a090f', bMid = '#78111a', bLight = '#991b24';
      g.r(40, 12, 14, 6, bMid); g.r(43, 14, 9, 4, bDark); g.px(54, 15, bLight);
      g.r(56, 15, 11, 4, bMid); g.r(58, 16, 7, 2, bDark);
      g.r(46, 19, 5, 2, bDark); g.r(47, 21, 3, 2, bMid);
    }
  };
  // state.on + state.screen: 'boot' | 'desktop' | 'archive' | 'memory'. state.bootT = env time when switched on.
  T.beige_crt = (g, w, h, o, env) => {
    const on = o.state.on, scr = o.state.screen || 'desktop', t = env.t;
    g.box(Math.floor(w * 0.3), h - 5, Math.floor(w * 0.4), 5, BEIGE, BEIGE_L, BEIGE_S);
    g.box(2, 2, w - 4, h - 6, BEIGE_S, null, darken(BEIGE_S, 0.2));
    g.box(0, 0, w, h - 7, BEIGE, BEIGE_L, BEIGE_S);
    const sx = 4, sy = 3, sw = w - 8, sh = h - 13;
    g.o(sx - 1, sy - 1, sw + 2, sh + 2, '#4a4550');
    if (!on) {
      g.r(sx, sy, sw, sh, '#1e2c38'); g.line(sx + 3, sy + sh - 3, sx + 9, sy + 2, 'rgba(143,211,255,0.18)');
    } else if (scr === 'boot') {
      g.r(sx, sy, sw, sh, '#0d151a');
      const n = Math.min(5, Math.floor((t - (o.state.bootT || 0)) * 4));
      for (let i = 0; i < n; i++) g.r(sx + 2, sy + 2 + i * 3, 6 + ((i * 7) % 14), 1, '#8fd3ff');
      if (Math.floor(t * 3) % 2) g.r(sx + 2, sy + 2 + n * 3, 2, 1, '#8fd3ff');
    } else if (scr === 'archive') {
      g.r(sx, sy, sw, sh, '#24323a'); g.r(sx, sy, sw, 3, '#3d5f8a'); g.px(sx + sw - 2, sy + 1, '#e8574a');
      const cols = ['#f6b26b', '#8fc4e8', '#f39bb6', '#7fd48a', '#e6c46a', '#c9bfdc'];
      for (let i = 0; i < 12; i++) {
        const x = sx + 2 + (i % 6) * 4, y = sy + 5 + Math.floor(i / 6) * 6;
        g.r(x, y, 3, 4, (o.state.solved || []).includes(i) ? '#7fd48a' : cols[i % 6]);
      }
      g.r(sx + 2, sy + sh - 2, Math.round((sw - 4) * ((o.state.solved || []).length / 12)), 1, B.crtGlow);
    } else if (scr === 'memory') {
      g.r(sx, sy, sw, sh, '#3a2436');
      const p = 1 + Math.round(sin(t * 4) * 0.6);
      const cx = sx + Math.floor(sw / 2), cy = sy + Math.floor(sh / 2);
      g.disc(cx - 2, cy - 1, 1 + p, '#f39bb6'); g.disc(cx + 2, cy - 1, 1 + p, '#f39bb6');
      for (let k = 0; k < 4 + p; k++) g.r(cx - 3 - p + k, cy + k, 7 + 2 * p - 2 * k, 1, '#f39bb6');
    } else {
      g.r(sx, sy, sw, sh, '#2b6a84'); g.r(sx, sy + sh - 3, sw, 3, '#c9c3b6'); g.r(sx + 1, sy + sh - 2, 5, 1, '#7fd48a');
      g.r(sx + 3, sy + 3, 6, 4, '#f2d16b'); g.r(sx + 3, sy + 2, 3, 1, '#f2d16b');
      g.r(sx + 3, sy + 9, 5, 4, '#fbf7f2'); g.r(sx + 4, sy + 10, 3, 1, '#4a6fa5');
      if (Math.floor(t * 1.5) % 2) g.o(sx + 2, sy + 1, 8, 7, null, '#fbf7f2');
    }
    if (on) for (let y = sy; y < sy + sh; y += 2) g.r(sx, y, sw, 1, 'rgba(0,0,0,0.16)');
    g.r(w - 9, h - 9, 4, 1, BEIGE_S); g.px(w - 4, h - 9, on ? '#7fd48a' : '#68b0ff');
    g.text('K95', 4, h - 10, BEIGE_S);
  };
  T.computer_tower = (g, w, h, o, env) => {
    const on = o.state.on;
    g.shadow(1, h - 2, w - 2);
    g.box(0, 0, w, h, BEIGE, BEIGE_L, BEIGE_S);
    g.sq(2, 3, w - 4, 4, BEIGE_S, '#8a7f68'); g.r(3, 5, w - 6, 1, '#4a4550');
    g.sq(2, 9, w - 4, 4, BEIGE_S, '#8a7f68'); g.r(4, 11, Math.max(3, w - 8), 1, '#4a4550');
    g.disc(Math.floor(w / 2), 16, 2, BEIGE_S, '#8a7f68');
    g.px(4, 20, on ? '#7fd48a' : '#68b0ff');
    g.px(7, 20, on && Math.floor(env.t * 7) % 3 === 0 ? '#f2a33a' : '#55505e');
    for (let y = 22; y < h - 2; y += 2) g.r(3, y, w - 6, 1, BEIGE_S);
  };
  T.drawers = (g, w, h, o, env) => {
    const wood = '#dfd4bc', woodL = '#f2ead9', woodS = '#bcae95';
    g.shadow(1, h - 2, w - 2);
    g.box(0, 10, w, h - 10, wood, null, woodS);
    for (let i = 0; i < 2; i++) { const y = 13 + i * 7; g.sq(2, y, w - 4, 6, wood, woodS); g.r(Math.floor(w / 2) - 2, y + 2, 4, 1, '#727b86'); }
    g.box(0, 0, w, 12, woodL, lighten(woodL, 0.2), wood);
    g.o(2, 3, 8, 5, '#c9bfdc'); g.r(3, 4, 6, 1, '#e4e0ec');
  };
  T.desk_chair = (g, w, h, o, env) => {
    const fab = '#3d4a66', fabL = '#55658a', fabS = '#2b354a';
    const cx = Math.floor(w / 2);
    g.line(cx, h - 4, 2, h - 2, OL); g.line(cx, h - 4, w - 3, h - 2, OL); g.line(cx, h - 4, cx - 6, h - 1, OL); g.line(cx, h - 4, cx + 6, h - 1, OL);
    for (const x of [1, w - 4, cx - 7, cx + 5]) g.r(x, h - 2, 3, 2, '#2a2430');
    g.r(cx - 1, 17, 3, h - 20, '#727b86'); g.r(cx - 1, 17, 1, h - 20, '#9aa3ad');
    if (o.state.roniDying) {
      const bDark = '#4a090f', bMid = '#78111a', bLight = '#991b24';
      const furPale = '#837d8c', furDark = '#5d5866', earPink = '#9c7883';
      const coat = '#ab833c', coatS = '#826128', pants = '#5e5045';
      // Chair seat cushion & armrests
      g.o(4, 10, w - 8, 7, fab); g.r(5, 11, w - 10, 1, fabL);
      g.r(2, 10, 3, 6, OL); g.r(w - 5, 10, 3, 6, OL);
      // Small crimson drop on the floorboards by the right chair caster
      g.r(w - 9, h - 4, 5, 2, bMid); g.r(w - 7, h - 3, 4, 2, bDark);
      // Sitting legs, shoes & pale limp mouse tail hanging over chair edge
      g.o(7, 11, 6, 9, pants); g.o(15, 11, 6, 9, pants);
      g.o(7, 19, 5, 4, '#24222c'); g.o(16, 19, 5, 4, '#24222c');
      g.r(3, 15, 4, 1, '#9c7d88'); g.r(2, 16, 2, 3, '#846873'); g.r(1, 19, 2, 3, '#846873');
      // Low chair backrest frame behind Roni's lower waist/hips (she is leaning forward over it)
      g.box(5, 10, w - 10, 7, fabS, fab, '#1d2433');
      // Roni's torso slumped forward from chair seat across desk edge (local y = -20..12)
      g.o(6, -8, 16, 20, coat);
      g.r(8, -6, 12, 15, coat);
      g.r(7, 4, 14, 7, coatS);
      // Shirt collar & upper hunched back reaching onto desk surface
      g.o(7, -19, 14, 13, coat);
      g.r(9, -18, 10, 4, '#cfc9c4');
      // Crimson stains soaking her coat back/shoulder & sleeve
      g.r(11, -13, 6, 4, bMid); g.r(12, -12, 4, 2, bDark);
      g.r(17, -17, 4, 5, bMid); g.px(20, -14, bLight);
      // Limp arms draped forward onto the desk surface beside/over the keyboard
      g.o(2, -25, 6, 11, coat); g.o(2, -28, 4, 4, furPale); g.px(4, -26, bMid);
      g.o(20, -23, 6, 10, coat); g.o(21, -26, 4, 4, furPale);
      // Crimson stain pooling onto the desk wood beside her slumped head and left hand
      g.r(4, -29, 6, 4, bMid); g.r(6, -28, 3, 2, bDark);
      g.r(18, -26, 5, 3, bMid);
      // Pale mouse ears & slumped head resting sideways/face-down directly on the desk
      g.o(6, -32, 5, 5, furDark); g.r(7, -31, 3, 3, earPink);
      g.o(17, -31, 5, 5, furDark); g.r(18, -30, 3, 3, earPink);
      g.o(8, -29, 12, 11, furPale);
      g.r(10, -28, 7, 2, '#9a94a3');
      // Gaunt pale cheek, closed sunken eye & limp muzzle resting against the desk
      g.r(11, -22, 8, 3, '#c8c1be'); g.px(18, -21, '#9c7883');
      g.r(12, -24, 2, 1, OL); g.r(12, -23, 2, 1, '#4c4654');
      g.r(16, -24, 2, 1, OL); g.r(16, -23, 2, 1, '#4c4654');
    } else if (o.variant === 'up') {
      // Back-facing ergonomic office chair facing UP toward the computer desk
      g.o(4, 10, w - 8, 6, fab); g.r(5, 11, w - 10, 1, fabL);
      g.box(5, 6, w - 10, 15, fabS, fab, '#1d2433');
      g.r(7, 8, w - 14, 1, fabL);
      g.r(cx - 3, 14, 6, 2, '#2a2430');
      g.r(2, 10, 3, 6, OL); g.r(w - 5, 10, 3, 6, OL);
    } else {
      g.o(3, 13, w - 6, 5, fabS);
      g.box(5, 0, w - 10, 16, fab, fabL, fabS);
      g.r(7, 3, w - 14, 1, fabL); g.r(cx - 3, 8, 6, 1, fabS);
      g.r(2, 9, 3, 6, OL); g.r(w - 5, 9, 3, 6, OL);
    }
  };
  // state.pulled removes the binder Roni takes down.
  T.archive_folders = (g, w, h, o, env) => {
    const cols = ['#3d5f8a', '#c2453f', '#5f8a5a', '#e6c46a', '#8c4f7a'];
    const bw = Math.max(3, Math.floor(w / cols.length));
    let x = 0;
    cols.forEach((c, i) => {
      const bh = h - (i % 3 === 1 ? 2 : 0);
      if (!(o.state.pulled && i === 3)) {
        g.sq(x, h - bh, bw, bh, c);
        g.r(x + 1, h - bh + 2, Math.max(1, bw - 2), 3, '#fbf7f2');
        g.r(x + 1, h - 3, Math.max(1, bw - 2), 1, darken(c, 0.3));
      }
      x += bw;
    });
  };
  // state.gaps: indices of pinned photos that have been taken down.
  T.corkboard = (g, w, h, o, env) => {
    const gaps = o.state.gaps || [];
    g.r(1, 1, w, h, 'rgba(40,20,30,0.2)');
    g.sq(0, 0, w, h, '#c9a36a', '#8a5a3c'); g.r(1, 1, w - 2, 1, '#ab7652');
    const R = A.rng(K.seedOf(o.id));
    for (let i = 0; i < 48; i++) g.px(2 + Math.floor(R() * (w - 4)), 2 + Math.floor(R() * (h - 4)), R() < 0.5 ? '#b08a52' : '#dcb985');
    const pins = [[5, 5], [19, 4], [34, 6], [10, 22], [39, 21]];
    const tints = ['#f6b26b', '#8fc4e8', '#f39bb6', '#7fd48a', '#c9bfdc'];
    g.line(8, 6, 22, 5, '#d6455a'); g.line(22, 5, 37, 7, '#d6455a'); g.line(37, 7, 42, 22, '#d6455a'); g.line(22, 5, 13, 23, '#d6455a');
    pins.forEach(([x, y], i) => {
      if (gaps.includes(i)) { g.px(x + 3, y, '#e8574a'); g.r(x, y + 1, 8, 9, '#b89260'); return; }
      g.sq(x, y + 1, 8, 9, '#fbf7f2', '#d9d0c0'); g.r(x + 1, y + 2, 6, 5, tints[i]);
      g.px(x + 3, y, '#e8574a');
    });
    g.r(23, 25, 11, 9, '#f2d16b'); g.r(24, 27, 8, 1, '#c9a12e'); g.r(24, 29, 6, 1, '#c9a12e'); g.px(28, 24, '#4a6fa5');
  };
  T.poster = (g, w, h) => {
    g.r(1, 1, w, h, 'rgba(40,20,30,0.2)');
    g.sq(0, 0, w, h, '#1f2a55');
    for (let y = 1; y < h - 1; y++) if (y > h * 0.55) g.r(1, y, w - 2, 1, mix('#1f2a55', '#8c4f7a', (y - h * 0.55) / (h * 0.45)));
    g.disc(Math.floor(w / 2), 11, 5, '#f3efd8'); g.disc(Math.floor(w / 2) + 2, 10, 4, '#1f2a55');
    g.px(4, 4, '#f3efd8'); g.px(w - 5, 6, '#f3efd8'); g.px(6, 15, '#c9cff0');
    g.r(6, h - 13, 3, 5, '#e27b39'); g.px(6, h - 14, '#e27b39'); g.px(8, h - 14, '#e27b39');
    g.r(w - 9, h - 13, 3, 5, '#bdb7c9'); g.px(w - 9, h - 14, '#bdb7c9'); g.px(w - 7, h - 14, '#bdb7c9');
    g.textC('FOX', Math.floor(w / 2), 19, '#f2d16b');
    g.textC('LIVE', Math.floor(w / 2), h - 7, '#f39bb6');
  };
})();
