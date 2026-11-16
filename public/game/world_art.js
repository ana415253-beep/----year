// WorldArt: procedural room art (walls, floors, sky, street scenery, foreground wall caps), light sources
// for the lighting pass, and the prop dispatcher. Individual prop drawers live in world_props.js.
(function () {
  const P = PALETTE, OL = P.outline;

  // ---------------------------------------------------------------- Colour helpers
  function hexToRgb(h) {
    h = h.replace('#', '');
    if (h.length === 3) h = h.split('').map(c => c + c).join('');
    const n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
  }
  const mixCache = new Map();
  function mix(a, b, t) {
    t = Math.max(0, Math.min(1, t));
    const k = a + b + (Math.round(t * 32) / 32);
    if (mixCache.has(k)) return mixCache.get(k);
    const A = hexToRgb(a), B = hexToRgb(b), q = Math.round(t * 32) / 32;
    const out = rgbToHex(A[0] + (B[0] - A[0]) * q, A[1] + (B[1] - A[1]) * q, A[2] + (B[2] - A[2]) * q);
    mixCache.set(k, out);
    return out;
  }
  const darken = (c, t) => mix(c, '#140c18', t);
  const lighten = (c, t) => mix(c, '#ffffff', t);

  // Deterministic RNG so procedural scenery is identical every frame and every visit.
  function rng(seed) {
    let s = seed >>> 0;
    return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  }

  // ---------------------------------------------------------------- Painter (local coordinates, optional mirror)
  function painter(ctx, flip, W) {
    return {
      ctx, flip, W,
      r(x, y, w, h, c) {
        if (!c || w <= 0 || h <= 0) return;
        ctx.fillStyle = c;
        ctx.fillRect(flip ? W - x - w : x, y, w, h);
      },
      px(x, y, c) { this.r(x, y, 1, 1, c); },
      // Outlined box with clipped corners.
      o(x, y, w, h, fill, ol) {
        ol = ol || OL;
        if (w <= 2 || h <= 2) { this.r(x, y, w, h, ol); return; }
        this.r(x + 1, y, w - 2, 1, ol); this.r(x + 1, y + h - 1, w - 2, 1, ol);
        this.r(x, y + 1, 1, h - 2, ol); this.r(x + w - 1, y + 1, 1, h - 2, ol);
        if (fill) this.r(x + 1, y + 1, w - 2, h - 2, fill);
      },
      // Square-cornered outlined box.
      sq(x, y, w, h, fill, ol) {
        this.r(x, y, w, h, ol || OL);
        if (fill && w > 2 && h > 2) this.r(x + 1, y + 1, w - 2, h - 2, fill);
      },
      // Outlined box with a light top edge and a shaded bottom edge.
      box(x, y, w, h, fill, light, shade, ol) {
        this.o(x, y, w, h, fill, ol);
        if (w > 2 && h > 3) {
          if (light) this.r(x + 1, y + 1, w - 2, 1, light);
          if (shade) this.r(x + 1, y + h - 2, w - 2, 1, shade);
        }
      },
      line(x0, y0, x1, y1, c) {
        x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
        const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
        let err = dx + dy, n = 0;
        while (n++ < 400) {
          this.px(x0, y0, c);
          if (x0 === x1 && y0 === y1) break;
          const e2 = 2 * err;
          if (e2 >= dy) { err += dy; x0 += sx; }
          if (e2 <= dx) { err += dx; y0 += sy; }
        }
      },
      // Filled pixel disc with optional outline.
      disc(cx, cy, rad, fill, ol) {
        for (let y = -rad - (ol ? 1 : 0); y <= rad + (ol ? 1 : 0); y++) {
          const ro = ol ? Math.floor(Math.sqrt((rad + 1) * (rad + 1) - y * y + 0.5)) : 0;
          const ri = Math.abs(y) <= rad ? Math.floor(Math.sqrt(rad * rad - y * y + 0.5)) : -1;
          if (ol && ro >= 0 && !isNaN(ro)) this.r(cx - ro, cy + y, ro * 2 + 1, 1, ol);
          if (ri >= 0) this.r(cx - ri, cy + y, ri * 2 + 1, 1, fill);
        }
      },
      ellipse(cx, cy, rx, ry, fill) {
        for (let y = -ry; y <= ry; y++) {
          const w = Math.round(rx * Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry + 0.01))));
          this.r(cx - w, cy + y, w * 2 + 1, 1, fill);
        }
      },
      text(s, x, y, c, scale) {
        const tx = flip ? W - x - PixelFont.measure(s, scale) : x;
        PixelFont.draw(ctx, s, tx, y, c, scale);
      },
      textC(s, cx, y, c, scale) { this.text(s, Math.round(cx - PixelFont.measure(s, scale) / 2), y, c, scale); },
      // Small floor shadow under a prop.
      shadow(x, y, w) {
        ctx.fillStyle = P.shadow;
        ctx.fillRect(flip ? W - x - w : x, y, w, 2);
      }
    };
  }

  // Cached static layers (walls and floors never change for a given room + variant).
  const cache = {};
  function cached(key, w, h, fn) {
    if (!cache[key]) {
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      const cx = c.getContext('2d');
      cx.imageSmoothingEnabled = false;
      fn(cx, painter(cx, false, w));
      cache[key] = c;
    }
    return cache[key];
  }

  const CAP = '#35283a', CAP_EDGE = '#55445a';
  function capRect(g, x, y, w, h) {
    g.r(x, y, w, h, CAP);
  }
  // Wall-top cap with inner bevel facing the room.
  function capLine(g, x, y, w, h, side) {
    g.r(x, y, w, h, CAP);
    if (side === 'bottom') g.r(x, y + h - 1, w, 1, CAP_EDGE);
    if (side === 'top') g.r(x, y, w, 1, CAP_EDGE);
    if (side === 'right') g.r(x + w - 1, y, 1, h, CAP_EDGE);
    if (side === 'left') g.r(x, y, 1, h, CAP_EDGE);
  }

  function planks(g, x0, y0, w, h, c, rowH, seed) {
    const R = rng(seed || 7);
    g.r(x0, y0, w, h, c.floor);
    for (let y = y0; y < y0 + h; y += rowH) {
      g.r(x0, y, w, 1, c.floorGap || c.floorShade);
      g.r(x0, y + 1, w, 1, c.floorLight);
      let x = x0 - Math.floor(R() * 40);
      while (x < x0 + w) {
        const len = 28 + Math.floor(R() * 34);
        x += len;
        if (x > x0 && x < x0 + w) g.r(x, y + 1, 1, rowH - 1, c.floorGap || c.floorShade);
        if (R() < 0.5) g.r(Math.max(x0, x - len + 6 + Math.floor(R() * 12)), y + 2 + Math.floor(R() * (rowH - 3)), 3 + Math.floor(R() * 4), 1, c.floorShade);
      }
    }
  }

  function skirting(g, x, y, w, col, light) {
    g.r(x, y, w, 4, col);
    g.r(x, y, w, 1, light);
    g.r(x, y + 4, w, 1, OL);
  }

  // ---------------------------------------------------------------- Room definitions
  const ROOMS = {};

  // OFFICE ------------------------------------------------------------
  ROOMS.office = {
    walls(ctx, L) {
      const c = P.office, base = L.wall.base, br = L.wall.blockRight;
      ctx.drawImage(cached('office_walls', L.width, L.height, (cx, g) => {
        g.r(0, 0, L.width, base, c.wall);
        // Wall panel seams and a subtle top shadow from the ceiling.
        g.r(0, 0, L.width, 3, c.wallShade);
        g.r(0, 3, L.width, 1, mix(c.wall, c.wallShade, 0.5));
        for (let x = 8; x < L.width; x += 48) g.r(x, 4, 1, base - 22, mix(c.wall, c.wallShade, 0.6));
        // Wainscot band and skirting.
        g.r(0, base - 18, L.width, 1, c.trim);
        g.r(0, base - 17, L.width, 13, c.wallShade);
        for (let x = 4; x < L.width; x += 24) g.r(x, base - 15, 1, 10, mix(c.wallShade, c.trim, 0.4));
        skirting(g, 0, base - 4, L.width, c.trim, c.metalLight);
        // Elevator lobby wall section that comes forward on the right.
        g.r(br.x, br.y, br.width, br.height, mix(c.wall, c.wallShade, 0.35));
        g.r(br.x, br.y, 1, br.height, OL);
        g.r(br.x + 1, br.y, 2, br.height, c.wallShade);
        g.r(br.x + 3, 0, br.width - 3, 3, c.wallShade);
        skirting(g, br.x + 1, br.y + br.height - 4, br.width - 1, c.trim, c.metalLight);
      }), 0, 0);
    },
    floor(ctx, L) {
      const c = P.office, base = L.wall.base, br = L.wall.blockRight;
      ctx.drawImage(cached('office_floor', L.width, L.height, (cx, g) => {
        g.r(0, base, L.width, L.height - base, c.carpet);
        // Carpet tiles with a woven dot pattern.
        for (let y = base; y < L.height; y += 3) for (let x = ((y / 3) % 2) * 3; x < L.width; x += 6) g.px(x, y + 1, c.carpetDark);
        for (let x = 0; x < L.width; x += 40) g.r(x, base, 1, L.height - base, c.carpetLight);
        for (let y = base + 30; y < L.height; y += 40) g.r(0, y, L.width, 1, c.carpetLight);
        // Shadow along the wall.
        g.r(0, base + 1, L.width, 2, c.carpetDark);
        g.r(br.x - 2, base, 2, br.height - base + 2, c.carpetDark);
        // Elevator landing plate.
        g.r(br.x + 2, br.y + br.height, 36, 4, c.metalShade);
        g.r(br.x + 2, br.y + br.height, 36, 1, c.metalLight);
        cx.clearRect(br.x, base, br.width, br.y + br.height - base);
      }), 0, 0);
    },
    foreground(ctx, L) {
      const elev = World.get && World.get('office_elevator');
      const roni = window.Game && Game.player;
      if (!elev || !roni || !roni.visible) return;
      const open = Math.max(0, Math.min(1, elev.state.openAmt || 0));
      if (roni.x > 442 && roni.y < 149 && open < 0.99) {
        const c = P.office, dx = elev.bbox.x + 4, dy = elev.bbox.y + 11, dw = 22, dh = elev.height - 12;
        const half = Math.round(dw / 2 * (1 - open));
        const g = painter(ctx, false, 0);
        ctx.save();
        ctx.beginPath();
        ctx.rect(dx, dy, dw, dh);
        ctx.clip();
        if (half > 0) {
          g.r(dx, dy, half, dh, c.metal);
          g.r(dx, dy, Math.max(0, half - 1), 2, c.metalLight);
          g.r(dx + half - 1, dy, 1, dh, OL);
          if (half > 3) g.o(dx + 2, dy + 4, Math.max(3, half - 4), dh - 8, c.metalLight, c.metalShade);

          g.r(dx + dw - half, dy, half, dh, c.metal);
          g.r(dx + dw - half + 1, dy, Math.max(0, half - 1), 2, c.metalLight);
          g.r(dx + dw - half, dy, 1, dh, OL);
          if (half > 3) g.o(dx + dw - half + 2, dy + 4, Math.max(3, half - 4), dh - 8, c.metalLight, c.metalShade);
        }
        ctx.restore();
        g.sq(dx - 1, dy - 1, dw + 2, dh + 2, null, OL);
      }
    }
  };

  // STREET ------------------------------------------------------------
  const STREET = { horizon: 122, verge: 168, curb: 226, road: 230 };
  function streetFacades() {
    // Grounded architectural lots that frame Moon Bakery (173..268) and Bloomery (675..785)
    // without slicing windows or sitting on top of the shops.
    return [
      { x: -6, w: 86, roof: 58, mat: 'brick', pitch: 'flat', seed: 101 },
      { x: 82, w: 84, roof: 64, mat: 'plaster', pitch: 'gable', seed: 202 },
      // Gap 166..274 occupied by Moon Bakery storefront (173..268)
      { x: 276, w: 92, roof: 54, mat: 'plaster', pitch: 'flat', seed: 303 },
      { x: 370, w: 96, roof: 60, mat: 'brick', pitch: 'gable', seed: 404 },
      { x: 468, w: 86, roof: 68, mat: 'plaster', pitch: 'flat', seed: 505 },
      { x: 556, w: 104, roof: 52, mat: 'brick', pitch: 'gable', seed: 606 },
      // Open courtyard/alley gap 660..800 around Bloomery (675..785) so nothing sits above or behind it
      { x: 802, w: 82, roof: 58, mat: 'plaster', pitch: 'gable', seed: 707 },
      { x: 886, w: 84, roof: 64, mat: 'brick', pitch: 'flat', seed: 808 }
    ];
  }
  let facadeList = null, windowList = null;
  function buildFacades(g, width) {
    const c = P.street;
    facadeList = streetFacades();
    windowList = [];
    const bottom = STREET.horizon;
    // Low garden wall/hedges in the courtyard gaps flanking Bloomery
    for (const [ax, aw] of [[660, 16], [784, 18]]) {
      g.r(ax, bottom - 12, aw, 12, '#7d7368');
      g.r(ax, bottom - 13, aw, 2, '#9e978d');
      g.r(ax, bottom - 14, aw, 1, OL);
      g.o(ax + 2, bottom - 16, aw - 4, 5, c.treeLeafDark);
      g.r(ax + 4, bottom - 15, aw - 8, 2, c.treeLeaf);
    }
    for (const b of facadeList) {
      const R = rng(b.seed);
      const body = b.mat === 'brick' ? c.brick : c.plaster;
      const shade = b.mat === 'brick' ? c.brickShade : c.plasterShade;
      const light = b.mat === 'brick' ? c.brickLight : lighten(c.plaster, 0.28);
      const roofCol = b.mat === 'brick' ? '#4a3240' : '#4a5568';
      const top = b.roof;

      // Building body with crisp side edges so adjacent buildings never merge awkwardly.
      g.r(b.x, top, b.w, bottom - top, body);
      g.r(b.x, top, 1, bottom - top, OL);
      g.r(b.x + b.w - 1, top, 1, bottom - top, OL);
      g.r(b.x + 1, top, 1, bottom - top, light);
      g.r(b.x + b.w - 2, top, 1, bottom - top, shade);

      if (b.mat === 'brick') {
        for (let y = top + 6; y < bottom - 2; y += 4) {
          g.r(b.x + 2, y, b.w - 4, 1, mix(body, shade, 0.55));
          for (let x = b.x + 3 + ((y / 4) % 2 ? 3 : 0); x < b.x + b.w - 3; x += 8) g.px(x, y - 1, shade);
        }
      } else {
        for (let y = top + 14; y < bottom - 26; y += 22) g.r(b.x + 2, y, b.w - 4, 1, shade);
        for (let i = 0; i < 5; i++) g.r(b.x + 4 + Math.floor(R() * (b.w - 10)), top + 8 + Math.floor(R() * (bottom - top - 16)), 3, 1, shade);
      }

      // Roof: either a sloped slate roof or a clean stone cornice parapet.
      if (b.pitch === 'gable') {
        const rh = 11;
        for (let i = 0; i < rh; i++) {
          const inset = Math.round((rh - 1 - i) * 0.7);
          const rx = b.x - 1 + inset, rw = b.w + 2 - inset * 2;
          g.r(rx, top - rh + i, rw, 1, i % 3 === 0 ? darken(roofCol, 0.22) : roofCol);
          g.px(rx, top - rh + i, OL); g.px(rx + rw - 1, top - rh + i, OL);
        }
        g.r(b.x - 1 + Math.round((rh - 1) * 0.7), top - rh - 1, b.w + 2 - Math.round((rh - 1) * 0.7) * 2, 1, OL);
        g.r(b.x - 1, top, b.w + 2, 2, darken(body, 0.35));
        g.r(b.x - 1, top - 1, b.w + 2, 1, light);
        const cxp = b.x + 12;
        g.sq(cxp, top - rh - 5, 7, 7, darken(body, 0.18));
        g.r(cxp - 1, top - rh - 6, 9, 2, OL);
      } else {
        g.r(b.x - 1, top - 3, b.w + 2, 2, OL);
        g.r(b.x - 1, top - 1, b.w + 2, 3, darken(body, 0.32));
        g.r(b.x - 1, top - 1, b.w + 2, 1, light);
        g.r(b.x + 1, top + 2, b.w - 2, 1, darken(body, 0.5));
      }

      // Symmetrical upper floor windows with clean padding from walls.
      const innerW = b.w - 14;
      const cols = Math.max(2, Math.min(4, Math.floor(innerW / 20)));
      const span = innerW / cols;
      const wStart = b.x + 7;
      for (let row = 0; top + 9 + row * 21 < bottom - 34; row++) {
        for (let i = 0; i < cols; i++) {
          const wx = Math.round(wStart + i * span + (span - 10) / 2);
          const wy = top + 9 + row * 21;
          g.sq(wx - 1, wy - 1, 12, 14, OL);
          g.r(wx, wy, 10, 12, '#3a4466');
          g.r(wx, wy, 10, 2, '#59628a');
          g.r(wx + 4, wy, 1, 12, OL);
          g.r(wx, wy + 5, 10, 1, OL);
          g.r(wx - 2, wy + 12, 14, 2, lighten(body, 0.22));
          g.r(wx - 2, wy + 14, 14, 1, OL);
          if (R() < 0.35) { g.r(wx, wy, 3, 12, '#c9b6a0'); g.r(wx + 7, wy, 3, 12, '#c9b6a0'); }
          if (R() < 0.22) { g.r(wx - 1, wy + 9, 12, 3, '#6a4b33'); g.px(wx + 1, wy + 8, '#e8574a'); g.px(wx + 5, wy + 8, '#f4c430'); g.px(wx + 8, wy + 8, '#f39bb6'); }
          windowList.push({ x: wx, y: wy, lit: R() < 0.55, warm: R() < 0.72 });
        }
      }

      // Ground-floor cornice, tidy stoop door, and ground-floor windows.
      const gy = bottom - 30;
      g.r(b.x + 1, gy - 2, b.w - 2, 2, darken(body, 0.28));
      const doorX = Math.round(b.x + 14);
      g.sq(doorX - 1, gy + 4, 14, 26, OL);
      g.r(doorX, gy + 5, 12, 25, b.mat === 'brick' ? '#3d5870' : '#7a3e3e');
      g.r(doorX + 2, gy + 8, 8, 8, '#2d3550');
      g.px(doorX + 9, gy + 19, '#e6c46a');
      g.r(doorX - 2, bottom - 2, 16, 2, c.sidewalkShade);
      windowList.push({ x: doorX + 2, y: gy + 8, w: 8, h: 8, lit: R() < 0.45, warm: true });
      // Ground-floor window right of the door if space permits.
      if (b.w >= 76) {
        const gwx = b.x + b.w - 28;
        g.sq(gwx - 1, gy + 7, 14, 15, OL);
        g.r(gwx, gy + 8, 12, 13, '#3a4466');
        g.r(gwx + 5, gy + 8, 1, 13, OL);
        g.r(gwx, gy + 14, 12, 1, OL);
        g.r(gwx - 2, gy + 21, 16, 2, lighten(body, 0.22));
        windowList.push({ x: gwx, y: gy + 8, w: 12, h: 13, lit: R() < 0.55, warm: true });
      }
      // Subtle downspout on the right corner.
      g.r(b.x + b.w - 4, top + 2, 2, bottom - top - 2, darken(body, 0.52));
    }
  }

  ROOMS.street = {
    walls(ctx, L, env) {
      const lv = env.light.level, cx = Math.round(Camera.x), c = P.street;
      // Sky bands (dynamic: blends sunset -> night with the light level).
      const bands = 16, skyH = 130;
      for (let i = 0; i < bands; i++) {
        const k = i / (bands - 1) * 3, i0 = Math.min(2, Math.floor(k)), t = k - i0;
        const sunset = mix(c.skySunset[i0], c.skySunset[i0 + 1], t), night = mix(c.skyNight[i0], c.skyNight[i0 + 1], t);
        ctx.fillStyle = mix(night, sunset, lv);
        ctx.fillRect(cx - 2, Math.floor(i * skyH / bands), Engine.W / Camera.zoom + 4, Math.ceil(skyH / bands) + 1);
      }
      // Sun (sunset) or moon and stars (night), slightly parallaxed.
      if (lv > 0.05) {
        ctx.globalAlpha = lv;
        const sx = Math.round(cx * 0.9 + 230), sy = 84;
        const g = painter(ctx, false, 0);
        g.disc(sx, sy, 11, '#f9d27a');
        g.disc(sx, sy, 8, '#fde7a6');
        ctx.globalAlpha = 1;
      }
      if (lv < 0.95) {
        const R = rng(9), a = 1 - lv;
        for (let i = 0; i < 90; i++) {
          const x = Math.floor(R() * 1400), y = Math.floor(R() * 100), tw = Math.sin(env.t * (1 + R() * 2) + i) > -0.3;
          const sx = cx + ((x - cx * 0.95) % 1400 + 1400) % 1400 - 400;
          if (!tw) continue;
          ctx.fillStyle = `rgba(255,248,220,${(a * (0.4 + R() * 0.6)).toFixed(2)})`;
          ctx.fillRect(sx, y, 1, 1);
        }
        ctx.globalAlpha = a;
        const g = painter(ctx, false, 0), mx = Math.round(cx * 0.92 + 70);
        g.disc(mx, 74, 6, '#f3efd8'); g.disc(mx + 3, 72, 5, mix(c.skyNight[1], c.skyNight[2], 0.4));
        ctx.globalAlpha = 1;
      }
      // Far skyline (parallax).
      const far = cached('street_far', 1100, 140, (fx, g) => {
        const R = rng(3);
        let x = 0;
        while (x < 1100) {
          const w = 18 + Math.floor(R() * 40), h = 24 + Math.floor(R() * 60);
          g.r(x, 140 - h, w, h, '#ffffff');
          if (R() < 0.3) g.r(x + Math.floor(w / 2) - 1, 140 - h - 8, 2, 8, '#ffffff');
          x += w + (R() < 0.3 ? 4 : 0);
        }
      });
      const farX = Math.round(cx * 0.55);
      ctx.save();
      ctx.globalAlpha = 1;
      ctx.drawImage(tint(far, mix(c.buildingFarNight, c.buildingFar, lv), 'far' + Math.round(lv * 16)), farX - 40, 0);
      ctx.restore();
      // Near facades (static, cached) with dynamic window lights.
      ctx.drawImage(cached('street_facades', L.width, 130, (fx, g) => buildFacades(g, L.width)), 0, 0);
      const dim = 1 - lv;
      if (dim > 0.02 && windowList) {
        for (const w of windowList) {
          if (!w.lit) continue;
          ctx.globalAlpha = Math.min(1, dim * 1.4);
          ctx.fillStyle = w.warm ? '#f6c66a' : '#9fc4e8';
          ctx.fillRect(w.x, w.y, w.w || 4, w.h || 6);
          if (!w.w) { ctx.fillRect(w.x + 5, w.y, 5, 6); ctx.fillRect(w.x, w.y + 7, 4, 6); ctx.fillRect(w.x + 5, w.y + 7, 5, 6); }
        }
        ctx.globalAlpha = 1;
      }
    },
    floor(ctx, L) {
      const c = P.street;
      ctx.drawImage(cached('street_floor', L.width, L.height, (fx, g) => {
        const H = STREET.horizon, V = STREET.verge, CU = STREET.curb, RD = STREET.road;
        // Building foundation strip.
        g.r(0, H - 2, L.width, 4, c.sidewalkShade);
        g.r(0, H - 2, L.width, 1, OL);
        // Grass verge with tufts and small flowers.
        g.r(0, H + 2, L.width, V - H - 2, c.grass);
        const R = rng(11);
        for (let i = 0; i < 520; i++) {
          const x = Math.floor(R() * L.width), y = H + 3 + Math.floor(R() * (V - H - 5));
          g.r(x, y, 1, 2, R() < 0.5 ? c.grassDark : lighten(c.grass, 0.2));
          if (R() < 0.06) g.px(x + 1, y, ['#f4c430', '#f39bb6', '#fbf7f2', '#e8574a'][Math.floor(R() * 4)]);
        }
        g.r(0, H + 2, L.width, 2, c.grassDark);
        // Low hedge segments along the buildings.
        for (let x = 0; x < L.width; x += 60) {
          if (Math.abs(x + 30 - 220) < 70 || Math.abs(x + 30 - 730) < 60 || Math.abs(x + 30 - 500) < 50) continue;
          g.o(x + 4, H + 2, 46, 8, c.treeLeafDark);
          for (let k = 0; k < 9; k++) g.px(x + 7 + k * 5, H + 3 + (k % 2), c.treeLeaf);
        }
        // Paved paths to doors and the bus stop pad.
        const path = (x0, w, y0) => {
          g.r(x0, y0, w, V - y0 + 1, c.sidewalk);
          for (let y = y0 + 4; y < V; y += 5) g.r(x0, y, w, 1, c.sidewalkShade);
          g.r(x0 - 1, y0, 1, V - y0, c.grassDark); g.r(x0 + w, y0, 1, V - y0, c.grassDark);
        };
        path(242, 20, H + 1);
        // Walkway aligned with Bloomery flower shop entrance door at x = 730
        path(716, 28, H + 1);
        g.r(462, H + 6, 76, 22, c.sidewalk);
        for (let x = 462; x < 538; x += 8) g.r(x, H + 6, 1, 22, c.sidewalkShade);
        path(496, 18, H + 27);
        g.r(544, V - 14, 44, 14, c.sidewalk);
        g.r(544, V - 14, 44, 1, c.sidewalkShade);
        // Sidewalk slabs.
        g.r(0, V, L.width, CU - V, c.sidewalk);
        for (let y = V; y < CU; y += 14) g.r(0, y, L.width, 1, c.sidewalkShade);
        for (let y = V, row = 0; y < CU; y += 14, row++) for (let x = (row % 2) * 12; x < L.width; x += 24) g.r(x, y, 1, 14, c.sidewalkShade);
        for (let i = 0; i < 260; i++) g.px(Math.floor(R() * L.width), V + Math.floor(R() * (CU - V)), R() < 0.5 ? c.sidewalkLight : c.sidewalkShade);
        g.r(0, V, L.width, 1, c.sidewalkLight);
        // Curb and road.
        g.r(0, CU, L.width, RD - CU, c.curb);
        g.r(0, CU, L.width, 1, c.sidewalkLight);
        g.r(0, RD - 1, L.width, 1, OL);
        g.r(0, RD, L.width, L.height - RD, c.road);
        for (let i = 0; i < 300; i++) g.px(Math.floor(R() * L.width), RD + Math.floor(R() * (L.height - RD)), c.roadShade);
        g.r(0, RD, L.width, 2, c.roadShade);
        for (let x = 6; x < L.width; x += 32) g.r(x, 250, 16, 2, c.roadLine);
        // Drain grates.
        for (const x of [160, 420, 760]) { g.sq(x, RD + 1, 10, 4, '#2a2632'); g.r(x + 2, RD + 2, 1, 2, '#55505e'); g.r(x + 5, RD + 2, 1, 2, '#55505e'); }
      }), 0, 0);
    },
    foreground() {}
  };

  // Tinted copy of a white silhouette canvas (cached per colour step).
  const tintCache = {};
  function tint(src, col, key) {
    const k = key + col;
    if (tintCache[k]) return tintCache[k];
    const c = document.createElement('canvas');
    c.width = src.width; c.height = src.height;
    const cx = c.getContext('2d');
    cx.drawImage(src, 0, 0);
    cx.globalCompositeOperation = 'source-in';
    cx.fillStyle = col;
    cx.fillRect(0, 0, c.width, c.height);
    tintCache[k] = c;
    return c;
  }

  // SHOP --------------------------------------------------------------
  ROOMS.shop = {
    walls(ctx, L) {
      const c = P.shop, base = L.wall.base, v = L.wall.vestibule;
      ctx.drawImage(cached('shop_walls', L.width, L.height, (cx, g) => {
        g.r(0, 0, L.width, base, c.wall);
        for (let x = 0; x < L.width; x += 10) g.r(x, 0, 4, base - 24, c.wallStripe);
        g.r(0, 0, L.width, 4, c.wallShade);
        // Wooden wainscot.
        g.r(0, base - 24, L.width, 2, c.trim);
        g.r(0, base - 22, L.width, 18, c.wood);
        for (let x = 0; x < L.width; x += 14) { g.r(x, base - 22, 1, 18, c.woodShade); g.r(x + 1, base - 22, 1, 18, c.woodLight); }
        skirting(g, 0, base - 4, L.width, c.woodShade, c.wood);
        // Entrance vestibule projecting into the room.
        g.r(v.x, v.y, v.width, v.height, c.wallShade);
        for (let x = 2; x < v.width - 2; x += 10) g.r(x, 0, 4, v.height - 26, mix(c.wallShade, c.wallStripe, 0.5));
        g.r(v.x, v.height - 26, v.width, 2, c.trim);
        g.r(v.x, v.height - 24, v.width, 20, darken(c.wood, 0.1));
        skirting(g, v.x, v.height - 4, v.width, c.woodShade, c.wood);
        g.r(v.width - 1, 0, 1, v.height, OL);
        g.r(v.width, base, 2, v.height - base, c.floorShade);
      }), 0, 0);
    },
    floor(ctx, L) {
      const c = P.shop, base = L.wall.base, v = L.wall.vestibule;
      ctx.drawImage(cached('shop_floor', L.width, L.height, (cx, g) => {
        planks(g, 0, base, L.width, L.height - base, c, 7, 21);
        g.r(0, base, L.width, 2, c.floorShade);
        g.r(v.width, v.height, 2, 3, c.floorShade);
        g.r(0, v.height, v.width, 2, c.floorShade);
        cx.clearRect(v.x, base, v.width, v.height - base);
      }), 0, 0);
    }
  };

  // Generic interior with wall caps (living room, hallway, kitchen, bedroom).
  function interiorWalls(key, L, drawWall) {
    const w = L.wall;
    return cached(key + '_walls', L.width, L.height, (cx, g) => {
      drawWall(g);
      if (w.top > 0) capLine(g, 0, 0, L.width, w.top, 'bottom');
      if (w.west) {
        if (w.westDoor) { capLine(g, 0, 0, w.west, w.westDoor.y0, 'right'); capLine(g, 0, w.westDoor.y1, w.west, L.height - w.westDoor.y1, 'right'); }
        else capLine(g, 0, 0, w.west, L.height, 'right');
      }
      if (w.east) {
        if (w.eastDoor) { capLine(g, w.east, 0, L.width - w.east, w.eastDoor.y0, 'left'); capLine(g, w.east, w.eastDoor.y1, L.width - w.east, L.height - w.eastDoor.y1, 'left'); }
        else capLine(g, w.east, 0, L.width - w.east, L.height, 'left');
      }
    });
  }
  function interiorFloor(key, L, drawFloor, opts) {
    const w = L.wall, westOpen = w.westDoor && !(opts && opts.westClosed);
    return cached(key + '_floor', L.width, L.height, (cx, g) => {
      cx.save();
      cx.beginPath();
      cx.rect(w.west || 0, w.base, (w.east || L.width) - (w.west || 0), (w.south || L.height) - w.base);
      if (westOpen) cx.rect(0, w.westDoor.y0, w.west, w.westDoor.y1 - w.westDoor.y0);
      if (w.eastDoor) cx.rect(w.east, w.eastDoor.y0, L.width - w.east, w.eastDoor.y1 - w.eastDoor.y0);
      if (w.southDoor) cx.rect(w.southDoor.x0, w.south, w.southDoor.x1 - w.southDoor.x0, L.height - w.south);
      cx.clip();
      drawFloor(g);
      // Contact shadow along the back wall.
      g.r(0, w.base, L.width, 2, 'rgba(40,20,30,0.22)');
      if (w.west) g.r(w.west, w.base, 2, (w.south || L.height) - w.base, 'rgba(40,20,30,0.16)');
      // Door openings get a darker threshold.
      if (w.eastDoor) { g.r(w.east, w.eastDoor.y0, L.width - w.east, w.eastDoor.y1 - w.eastDoor.y0, 'rgba(30,18,30,0.28)'); g.r(w.east, w.eastDoor.y0, 2, w.eastDoor.y1 - w.eastDoor.y0, 'rgba(255,240,220,0.15)'); }
      if (westOpen) g.r(0, w.westDoor.y0, w.west, w.westDoor.y1 - w.westDoor.y0, 'rgba(30,18,30,0.25)');
      if (w.southDoor) g.r(w.southDoor.x0, w.south, w.southDoor.x1 - w.southDoor.x0, L.height - w.south, 'rgba(30,18,30,0.3)');
      cx.restore();
    });
  }
  function southCap(ctx, L) {
    const w = L.wall;
    if (!w.south) return;
    const g = painter(ctx, false, 0);
    if (w.southDoor) {
      capLine(g, 0, w.south, w.southDoor.x0, L.height - w.south, 'top');
      capLine(g, w.southDoor.x1, w.south, L.width - w.southDoor.x1, L.height - w.south, 'top');
      g.r(w.southDoor.x0 - 2, w.south, 2, L.height - w.south, CAP_EDGE);
      g.r(w.southDoor.x1, w.south, 2, L.height - w.south, CAP_EDGE);
    } else capLine(g, 0, w.south, L.width, L.height - w.south, 'top');
    if (w.west) capRect(g, 0, w.south, w.west, L.height - w.south);
  }

  // LIVING ROOM -------------------------------------------------------
  ROOMS.living = {
    walls(ctx, L) {
      const c = P.living, w = L.wall;
      ctx.drawImage(interiorWalls('living', L, g => {
        g.r(0, w.top, L.width, w.base - w.top, c.wall);
        // Damask-style wallpaper diamonds.
        for (let y = w.top + 4; y < w.base - 16; y += 10) for (let x = ((y - w.top) / 10 % 2) * 8; x < L.width; x += 16) {
          g.px(x, y, c.wallPattern); g.r(x - 1, y + 1, 3, 1, c.wallPattern); g.px(x, y + 2, c.wallPattern);
        }
        g.r(0, w.top, L.width, 2, c.wallShade);
        // Dado rail and lower panel.
        g.r(0, w.base - 16, L.width, 2, c.trimLight);
        g.r(0, w.base - 14, L.width, 10, c.wallShade);
        for (let x = 6; x < L.width; x += 30) g.o(x, w.base - 13, 24, 8, null, mix(c.wallShade, c.trim, 0.45));
        skirting(g, 0, w.base - 4, L.width, c.trim, c.trimLight);
      }), 0, 0);
    },
    floor(ctx, L) {
      ctx.drawImage(interiorFloor('living', L, g => planks(g, 0, L.wall.base, L.width, L.height - L.wall.base, P.living, 6, 5), { westClosed: true }), 0, 0);
    },
    foreground(ctx, L) { southCap(ctx, L); }
  };

  // HALLWAY -----------------------------------------------------------
  ROOMS.hallway = {
    walls(ctx, L) {
      const c = P.hallway, w = L.wall;
      ctx.drawImage(interiorWalls('hallway', L, g => {
        g.r(0, w.top, L.width, w.base - w.top, c.wall);
        for (let x = 0; x < L.width; x += 6) g.r(x, w.top + 2, 1, w.base - w.top - 28, mix(c.wall, c.wallShade, 0.35));
        g.r(0, w.top, L.width, 2, c.wallShade);
        g.r(0, w.base - 26, L.width, 2, c.wainscotLight);
        g.r(0, w.base - 24, L.width, 20, c.wainscot);
        for (let x = 4; x < L.width; x += 26) { g.o(x, w.base - 21, 20, 14, null, darken(c.wainscot, 0.3)); g.r(x + 1, w.base - 20, 18, 1, c.wainscotLight); }
        skirting(g, 0, w.base - 4, L.width, darken(c.wainscot, 0.2), c.wainscotLight);
      }), 0, 0);
    },
    floor(ctx, L) {
      ctx.drawImage(interiorFloor('hallway', L, g => planks(g, 0, L.wall.base, L.width, L.height - L.wall.base, Object.assign({ floorGap: darken(P.hallway.floorShade, 0.2) }, P.hallway), 6, 13)), 0, 0);
    },
    foreground(ctx, L) { southCap(ctx, L); }
  };

  // KITCHEN -----------------------------------------------------------
  ROOMS.kitchen = {
    walls(ctx, L) {
      const c = P.kitchen, w = L.wall;
      ctx.drawImage(interiorWalls('kitchen', L, g => {
        g.r(0, w.top, L.width, w.base - w.top, c.wall);
        g.r(0, w.top, L.width, 2, c.wallShade);
        // Tiled backsplash band.
        const ty = w.base - 24;
        g.r(0, ty, L.width, 20, c.tile);
        for (let y = ty; y < ty + 20; y += 5) g.r(0, y, L.width, 1, c.tileShade);
        for (let y = ty, row = 0; y < ty + 20; y += 5, row++) for (let x = (row % 2) * 4; x < L.width; x += 8) g.r(x, y, 1, 5, c.tileShade);
        g.r(0, ty - 1, L.width, 1, c.wallShade);
        skirting(g, 0, w.base - 4, L.width, c.cabinetShade, c.cabinet);
      }), 0, 0);
    },
    floor(ctx, L) {
      const c = P.kitchen, w = L.wall;
      ctx.drawImage(interiorFloor('kitchen', L, g => {
        for (let y = w.base; y < L.height; y += 10) for (let x = 0; x < L.width; x += 10) {
          const on = ((x / 10) + (y - w.base) / 10) % 2 === 0;
          g.r(x, y, 10, 10, on ? c.floorA : c.floorB);
          g.r(x, y + 9, 10, 1, c.floorShade);
        }
      }), 0, 0);
    },
    foreground(ctx, L) { southCap(ctx, L); }
  };

  // BEDROOM + STUDIO --------------------------------------------------
  ROOMS.bedroom = {
    walls(ctx, L) {
      const c = P.bedroom, w = L.wall, sx = w.studioX;
      ctx.drawImage(interiorWalls('bedroom', L, g => {
        g.r(0, 0, sx, w.base, c.wall);
        for (let y = 6; y < w.base - 10; y += 12) for (let x = ((y / 12) % 2) * 9; x < sx; x += 18) {
          g.px(x, y, c.wallPattern); g.px(x - 1, y + 1, c.wallPattern); g.px(x + 1, y + 1, c.wallPattern); g.px(x, y + 2, c.wallPattern);
        }
        g.r(sx, 0, L.width - sx, w.base, c.studioWall);
        for (let y = 4; y < w.base - 6; y += 8) g.r(sx, y, L.width - sx, 1, mix(c.studioWall, c.studioWallShade, 0.4));
        for (let i = -8; i < 8; i++) g.r(sx + i, 0, 1, w.base, mix(c.wall, c.studioWall, (i + 8) / 16));
        g.r(0, 0, L.width, 3, c.wallShade);
        skirting(g, 0, w.base - 4, sx, c.wallShade, c.wall);
        skirting(g, sx, w.base - 4, L.width - sx, c.studioWallShade, c.studioWall);
      }), 0, 0);
    },
    floor(ctx, L) {
      ctx.drawImage(interiorFloor('bedroom', L, g => planks(g, 0, L.wall.base, L.width, L.height - L.wall.base, P.bedroom, 6, 31)), 0, 0);
    },
    foreground(ctx, L) { southCap(ctx, L); }
  };

  // PORCH (SCENE 05 HOUSE EXTERIOR) ----------------------------------
  ROOMS.porch = {
    walls(ctx, L, env) {
      const c = P.street;
      ctx.drawImage(cached('porch_walls', L.width, L.height, (cx, g) => {
        // Night sky band + stars + moon
        for (let i = 0; i < 6; i++) g.r(0, i * 10, L.width, 10, mix(c.skyNight[0], c.skyNight[2], i / 5));
        const R = rng(55);
        for (let i = 0; i < 45; i++) g.px(Math.floor(R() * L.width), Math.floor(R() * 46), R() < 0.3 ? '#fff3c4' : '#c9cff0');
        g.disc(42, 24, 6, '#f3efd8'); g.disc(45, 22, 5, c.skyNight[1]);
        // Distant silhouettes
        g.r(0, 48, 36, 84, '#1b203a'); g.r(282, 42, 38, 90, '#1b203a');
        // House roof (shingles) + chimney
        g.sq(224, 18, 14, 24, '#7f4436'); g.r(222, 16, 18, 3, '#5c3a24');
        for (let y = 0; y < 32; y += 2) {
          const rx = Math.max(46, 80 - Math.round(y * 1.1));
          g.r(rx, 28 + y, L.width - rx * 2, 2, y % 4 === 0 ? '#5c3a24' : '#4a2f24');
        }
        g.r(44, 59, L.width - 88, 3, '#33201a');
        // House warm siding
        g.sq(54, 62, L.width - 108, 70, '#d9c3a0');
        for (let y = 66; y < 130; y += 5) g.r(55, y, L.width - 110, 1, '#c8b394');
        // Porch awning & pillars
        g.r(128, 74, 64, 6, '#5c3a24'); g.r(128, 74, 64, 1, '#8a5a3c');
        g.r(131, 80, 4, 52, '#f4ecdc'); g.r(185, 80, 4, 52, '#f4ecdc');
        // Left dark window & Right glowing living room window
        const win = (wx, lit) => {
          g.sq(wx, 82, 32, 28, '#f4ecdc');
          g.r(wx + 2, 84, 28, 24, lit ? '#ffd28a' : '#26304d');
          g.r(wx + 2, 84, 7, 24, lit ? '#b84e4e' : '#3a4466');
          g.r(wx + 23, 84, 7, 24, lit ? '#b84e4e' : '#3a4466');
          g.r(wx + 15, 84, 2, 24, '#f4ecdc'); g.r(wx + 2, 95, 28, 2, '#f4ecdc');
          g.r(wx - 2, 110, 36, 3, '#8a5a3c');
        };
        win(76, false);
        win(212, true);
        // Bushes & steps at base
        g.o(56, 122, 46, 12, '#3a6a34'); g.o(218, 122, 46, 12, '#3a6a34');
        g.r(136, 132, 48, 4, '#b9b2a8'); g.r(136, 135, 48, 1, OL);
      }), 0, 0);
    },
    floor(ctx, L) {
      const c = P.street;
      ctx.drawImage(cached('porch_floor', L.width, L.height, (cx, g) => {
        g.r(0, 132, L.width, L.height - 132, c.grassDark);
        g.r(24, 136, L.width - 48, L.height - 140, c.grass);
        const R = rng(58);
        for (let i = 0; i < 200; i++) {
          const x = Math.floor(R() * L.width), y = 134 + Math.floor(R() * (L.height - 138));
          g.px(x, y, R() < 0.5 ? c.grassDark : lighten(c.grass, 0.2));
        }
        // Stone path leading straight to the porch step
        g.r(136, 136, 48, L.height - 136, c.sidewalk);
        for (let y = 140; y < L.height; y += 8) {
          g.r(136, y, 48, 1, c.sidewalkShade);
          g.r(136 + ((y / 8) % 2) * 24, y, 1, 8, c.sidewalkShade);
        }
        g.r(135, 136, 1, L.height - 136, c.grassDark);
        g.r(184, 136, 1, L.height - 136, c.grassDark);
      }), 0, 0);
    },
    foreground() {}
  };

  // ---------------------------------------------------------------- Lights
  function dim(env) { return env.light.level < 0.99; }
  function lampOn(o, env) {
    if (o.state.off) return false;
    if (o.type === 'desk_lamp' || o.type === 'table_lamp' || o.type === 'bedside_lamp') return true;
    return o.state.on || dim(env);
  }
  const LIGHTS = {
    streetlamp: (o, env) => lampOn(o, env) ? [
      { x: o.x, y: o.y - 82, r: 20, flicker: o.variant === 'flicker' || o.state.flicker, color: '#ffe3a1' },
      { x: o.x, y: o.y + 74, r: 56, ry: 30, flicker: o.variant === 'flicker' || o.state.flicker, strength: 0.9, color: '#ffd98a' }
    ] : [],
    storefront: (o, env) => dim(env) ? [{ x: o.x - 8, y: o.y - 22, r: 34, ry: 24, color: '#f6c66a', strength: 0.8 }, { x: o.x - 8, y: o.y + 40, r: 40, ry: 18, strength: 0.5 }] : [],
    flower_shop_front: (o, env) => (dim(env) && !o.state.lightsOff) ? [{ x: o.x, y: o.y - 26, r: 48, ry: 30, color: '#ffd9a8', strength: 0.9 }, { x: o.x, y: o.y + 44, r: 50, ry: 20, strength: 0.55 }] : [],
    bus_stop: (o, env) => dim(env) ? [{ x: o.x, y: o.y - 32, r: 30, ry: 26, color: '#cfe6ff', strength: 0.7 }] : [],
    desk_lamp: (o, env) => {
      if (!lampOn(o, env)) return [];
      const cx = o.bbox.x + o.width / 2, cy = o.bbox.y + o.height / 2;
      if (o.variant === 'studio') {
        return [
          { x: cx - 4, y: cy - 2, r: 42, ry: 30, color: '#cfe6ff', strength: 0.65 },
          { x: cx - 4, y: cy + 4, r: 64, ry: 42, color: '#9fd0ff', strength: 0.30 }
        ];
      }
      return [
        { x: o.x - 4, y: o.y - 6, r: 44, ry: 32, color: '#fff1c7', strength: 0.8 },
        { x: o.x - 4, y: o.y + 2, r: 72, ry: 48, color: '#ffdf9e', strength: 0.38 }
      ];
    },
    table_lamp: (o, env) => lampOn(o, env) ? [{ x: o.x, y: o.y - 14, r: 58, ry: 44, color: '#ffd28a' }] : [],
    bedside_lamp: (o, env) => {
      if (!lampOn(o, env)) return [];
      const cx = o.bbox ? o.bbox.x + o.width / 2 : o.x, cy = o.bbox ? o.bbox.y + o.height / 2 : o.y - 12;
      return [{ x: cx, y: cy, r: 58, ry: 46, color: '#ffd98a', strength: 0.9 }];
    },
    sconce: (o, env) => lampOn(o, env) ? [{ x: o.x + 4, y: o.y + 6, r: 40, ry: 46, color: '#ffd28a' }] : [],
    office_monitor: (o, env) => {
      const cx = o.bbox ? o.bbox.x + o.width / 2 : o.x, cy = o.bbox ? o.bbox.y + o.height / 2 : o.y - 9;
      if (env.room === 'bedroom') return [{ x: cx, y: cy, r: 34, ry: 26, color: '#78b8ff', strength: o.state.off ? 0.34 : 0.72, glowAlpha: 0.14 }];
      return !o.state.off ? [{ x: cx, y: cy, r: 20, color: '#8fd3ff', strength: 0.6 }] : [];
    },
    beige_crt: (o, env) => {
      const cx = o.bbox ? o.bbox.x + o.width / 2 : o.x, cy = o.bbox ? o.bbox.y + o.height / 2 : o.y - 14;
      if (o.state.on) return [{ x: cx, y: cy, r: 50, ry: 38, color: '#82d8ff', strength: 0.92, flicker: true, glowAlpha: 0.16 }];
      if (env.room === 'bedroom') return [{ x: cx, y: cy, r: 30, ry: 24, color: '#68b0ff', strength: 0.32, glowAlpha: 0.12 }];
      return [];
    },
    server_rack: (o) => {
      const cx = o.bbox ? o.bbox.x + o.width / 2 : o.x, cy = o.bbox ? o.bbox.y + o.height / 2 : o.y;
      return [{ x: cx, y: cy, r: 36, ry: 28, color: '#6ab4ff', strength: 0.48, flicker: true, glowAlpha: 0.12 }];
    },
    printer: (o) => {
      const cx = o.bbox ? o.bbox.x + o.width / 2 : o.x, cy = o.bbox ? o.bbox.y + o.height / 2 : o.y;
      return [{ x: cx, y: cy, r: 22, ry: 18, color: '#8fd3ff', strength: 0.25 }];
    },
    crt_tv: (o, env) => o.state.on ? [{ x: o.x, y: o.variant === 'facing_up' ? o.y - 36 : o.y - 20, r: 44, ry: 34, color: '#a8c8ff', strength: 0.85, flicker: true }] : [],
    exit_sign: (o) => [{ x: o.x + o.width / 2, y: o.y + 5, r: 14, color: '#7fd48a', strength: 0.6 }],
    elevator: () => [],
    fairy_lights: (o, env) => {
      if (o.state.off) return [];
      const out = [];
      for (let i = 0; i < 7; i++) out.push({ x: o.bbox.x + 8 + i * (o.width - 16) / 6, y: o.y + 6, r: 12, strength: 0.6, flicker: true, color: ['#ffd28a', '#f0a6b8', '#8fd3c4'][i % 3] });
      return out;
    },
    curtain_window: (o, env) => env.light.mode === 'evening' ? [{ x: o.bbox.x + o.width / 2, y: o.bbox.y + o.height + 24, r: 36, ry: 42, color: '#ffe49e', strength: 0.45 }] : [],
    office_window: (o, env) => [],
    hifi: (o) => o.state.playing ? [{ x: o.x, y: o.y - 8, r: 12, color: '#8fd3c4', strength: 0.5 }] : [],
    computer_tower: (o) => {
      const cx = o.bbox ? o.bbox.x + o.width / 2 : o.x, cy = o.bbox ? o.bbox.y + o.height / 2 : o.y;
      return o.state.on ? [{ x: cx, y: cy, r: 14, color: '#7fd48a', strength: 0.5 }] : [{ x: cx, y: cy, r: 10, color: '#68b0ff', strength: 0.22 }];
    },
    cake: (o) => o.state.candles !== false ? [{ x: o.x, y: o.y - 16, r: 22, color: '#ffcf80', strength: 0.7, flicker: true }] : [],
    refrigerator: (o) => o.state.open ? [{ x: o.x, y: o.y - 30, r: 30, color: '#e8f4ff', strength: 0.7 }] : [],
    porch_lantern: (o) => !o.state.off ? [{ x: o.x + 4, y: o.y + 8, r: 58, ry: 42, color: '#ffd98a', strength: 0.9, flicker: true }] : [],
    house_front_door: (o) => (o.state.openAmt || 0) > 0.05 ? [{ x: o.x, y: o.y - 10, r: 48, ry: 34, color: '#ffe3a8', strength: o.state.openAmt * 0.95 }] : []
  };

  // ---------------------------------------------------------------- Public API
  const SORT = {};
  const WorldArt = {
    types: {}, painter, mix, darken, lighten, rng, STREET,
    sortOffset(type) { return SORT[type] || 0; },
    setSortOffset(type, v) { SORT[type] = v; },
    hasArt(type) { return type === 'zone' || !!this.types[type]; },
    drawWalls(ctx, room, L, env) { ROOMS[room] && ROOMS[room].walls(ctx, L, env); },
    drawFloor(ctx, room, L, env) { ROOMS[room] && ROOMS[room].floor(ctx, L, env); },
    drawForeground(ctx, room, L, env) { ROOMS[room] && ROOMS[room].foreground && ROOMS[room].foreground(ctx, L, env); },
    drawObject(ctx, o, env) {
      if (o.type === 'zone') return;
      const fn = this.types[o.type];
      const b = o.bbox;
      ctx.save();
      ctx.translate(b.x + Math.round(o.state.offsetX || 0), b.y + Math.round(o.state.offsetY || 0));
      const g = painter(ctx, !!o.mirror, o.width);
      if (fn) fn(g, o.width, o.height, o, env, ctx);
      else { g.sq(0, 0, o.width, o.height, null, '#ff00ff'); g.text(o.type, 1, 1, '#ff00ff'); }
      ctx.restore();
    },
    drawCars(ctx, cars, env) {
      const night = env.light.level < 0.6;
      for (const car of cars) {
        const x = Math.round(car.x), y = Math.round(car.y);
        if (car.kind === 'bus') {
          const bw = 92, bh = 28;
          ctx.save();
          ctx.translate(x - Math.floor(bw / 2), y - bh + 2);
          const g = painter(ctx, car.dir < 0, bw);
          g.r(4, bh - 2, bw - 8, 2, 'rgba(10,8,16,0.4)');
          g.o(1, 2, bw - 2, bh - 5, car.col || '#39609c');
          g.r(2, 3, bw - 4, 1, lighten(car.col || '#39609c', 0.35));
          g.r(2, 16, bw - 4, 2, '#f2d16b');
          g.r(2, 18, bw - 4, 4, darken(car.col || '#39609c', 0.25));
          // Illuminated passenger windows along upper half
          const winCol = night ? '#ffe3a8' : '#9fc4e0';
          for (let wx = 7; wx <= bw - 30; wx += 14) {
            g.sq(wx, 5, 11, 9, '#1f2638');
            g.r(wx + 1, 6, 9, 7, winCol);
            if (night && (wx === 21 || wx === 49)) {
              g.r(wx + 3, 9, 5, 4, '#2d3142');
            }
          }
          // Passenger door near the front-middle
          const doorX = bw - 28, doorOpen = Math.max(0, Math.min(1, car.doorAmt || 0));
          g.sq(doorX, 6, 12, 17, '#1b1e28');
          g.r(doorX + 1, 7, 10, 15, night ? '#ffd996' : '#3a4659');
          const panW = Math.max(1, Math.round(5 * (1 - doorOpen)));
          if (doorOpen < 0.92) {
            g.r(doorX + 1, 7, panW, 15, '#4e6894');
            g.r(doorX + 11 - panW, 7, panW, 15, '#4e6894');
            g.r(doorX + 1 + Math.max(0, panW - 2), 9, 1, 5, '#cde4f5');
          }
          // Windshield and route sign
          g.sq(bw - 13, 5, 10, 10, '#1f2638');
          g.r(bw - 12, 6, 8, 8, night ? '#c6ddf2' : '#8fb8d8');
          g.r(bw - 14, 2, 10, 3, '#141620');
          g.r(bw - 12, 3, 6, 1, '#f2a65a');
          // Wheels
          g.disc(18, bh - 4, 4, '#1f1c24', OL); g.disc(bw - 18, bh - 4, 4, '#1f1c24', OL);
          g.px(18, bh - 4, '#8a8494'); g.px(bw - 18, bh - 4, '#8a8494');
          // Headlights & taillights
          g.r(bw - 3, 18, 2, 3, night ? '#fff3c4' : '#f2e6c0');
          g.r(1, 18, 2, 3, '#d6455a');
          ctx.restore();
          if (night) {
            ctx.fillStyle = 'rgba(255,240,190,0.22)';
            const hx = car.dir > 0 ? x + 44 : x - 92;
            ctx.fillRect(hx, y - 10, 48, 5);
          }
          continue;
        }
        ctx.save();
        ctx.translate(x - 26, y - 17);
        const g = painter(ctx, car.dir < 0, 52);
        g.r(4, 15, 44, 2, 'rgba(10,8,16,0.35)');
        g.o(1, 6, 50, 9, car.col);
        g.r(2, 7, 48, 1, lighten(car.col, 0.35));
        g.o(11, 0, 28, 8, car.col);
        g.r(13, 1, 11, 5, '#8fb8d8'); g.r(26, 1, 11, 5, '#8fb8d8');
        g.r(24, 1, 2, 6, darken(car.col, 0.3));
        g.r(2, 10, 48, 1, darken(car.col, 0.3));
        g.disc(12, 14, 3, '#1f1c24', OL); g.disc(40, 14, 3, '#1f1c24', OL);
        g.px(12, 14, '#8a8494'); g.px(40, 14, '#8a8494');
        g.r(48, 8, 2, 2, night ? '#fff3c4' : '#f2e6c0');
        g.r(1, 8, 2, 2, '#d6455a');
        ctx.restore();
        if (night) {
          ctx.fillStyle = 'rgba(255,240,190,0.18)';
          const hx = car.dir > 0 ? x + 24 : x - 64;
          ctx.fillRect(hx, y - 10, 40, 4);
        }
      }
    },
    lightsFor(objects, env) {
      const out = [];
      for (const o of objects) {
        if (o.state.hidden) continue;
        const f = LIGHTS[o.type];
        if (f) for (const l of f(o, env)) out.push(l);
      }
      if (env && env.room === 'bedroom') {
        // Warm yellow zone lighting for Sleeping Area (middle-left) & Kallita's Creative Zone (bottom-left); cool blue for Roni's Tech Workspace
        out.push(
          { x: 106, y: 140, r: 124, ry: 78, color: '#ffd478', strength: 0.68, glowAlpha: 0.11 },
          { x: 112, y: 252, r: 130, ry: 88, color: '#ffe28a', strength: 0.65, glowAlpha: 0.11 },
          { x: 268, y: 186, r: 96, ry: 78, color: '#efe0c8', strength: 0.34, glowAlpha: 0.05 },
          { x: 446, y: 84, r: 126, ry: 88, color: '#78b8ff', strength: 0.72, glowAlpha: 0.13 },
          { x: 462, y: 158, r: 105, ry: 76, color: '#64a8ff', strength: 0.42, glowAlpha: 0.08 }
        );
      }
      return out;
    }
  };

  window.WorldArt = WorldArt;
})();

