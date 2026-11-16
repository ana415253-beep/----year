// World: room loading, object normalisation, depth-sorted rendering, collision, path-finding,
// interaction detection, lighting and ambient particles. Art lives in world_art.js (WorldArt).
(function () {
  const CELL = 4;

  function rectsOverlap(a, b) {
    return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
  }
  function pointIn(r, x, y) { return x >= r.x && x <= r.x + r.width && y >= r.y && y <= r.y + r.height; }

  // Bounding box (top-left) of an object from its anchor.
  function bboxOf(o) {
    const a = o.anchor || 'bottom-center';
    if (a === 'top-left') return { x: o.x, y: o.y, width: o.width, height: o.height };
    if (a === 'top-center') return { x: Math.round(o.x - o.width / 2), y: o.y, width: o.width, height: o.height };
    return { x: Math.round(o.x - o.width / 2), y: o.y - o.height, width: o.width, height: o.height };
  }

  const World = {
    roomId: null, layout: null, objects: [], byId: {}, chars: [], solids: [],
    t: 0, particles: [], light: { mode: 'day', level: 1, target: 1 },
    objState: {}, nav: null, promptTarget: null, extraLights: [], cars: [],
    light_canvas: null,

    // ---------------------------------------------------------------- Loading
    load(roomId, opts) {
      const L = WORLD_LAYOUTS[roomId];
      if (!L) throw new Error('Unknown room ' + roomId);
      this.roomId = roomId;
      this.layout = L;
      this.objects = [];
      this.byId = {};
      const groups = [['furniture', 'furniture'], ['decorations', null], ['interactables', 'zone']];
      for (const [key, defLayer] of groups) {
        for (const src of (L[key] || [])) {
          const o = this.normalize(src, defLayer, key);
          this.objects.push(o);
          this.byId[o.id] = o;
        }
      }
      // Children resting on parents sort right after them.
      const childCount = {};
      for (const o of this.objects) {
        if (o.on && this.byId[o.on]) {
          childCount[o.on] = (childCount[o.on] || 0) + 1;
          const p = this.byId[o.on];
          o.sortY = p.sortY + 0.001 * childCount[o.on];
        }
      }
      this.chars = [];
      this.particles = [];
      this.cars = [];
      this.extraLights = [];
      Camera.setBounds(L.cameraBounds);
      this.rebuildSolids();
      this.buildNav();
      this.setLighting((opts && opts.lighting) || this.defaultLighting(roomId), true);
      for (let i = 0; i < 22; i++) this.spawnParticle(true);
      return L;
    },

    normalize(src, defLayer, group) {
      const o = Object.assign({}, src);
      o.group = group;
      o.layer = o.layer || (o.type === 'zone' ? 'zone' : defLayer || ((o.anchor === 'top-left' || o.anchor === 'top-center') ? 'wall' : 'furniture'));
      o.bbox = bboxOf(o);
      const bottomY = o.bbox.y + o.bbox.height;
      o.sortY = bottomY + (o.sortOffset || WorldArt.sortOffset(o.type) || 0);
      if (o.solid && !o.collision) {
        const d = Math.max(4, Math.round(o.height * 0.4));
        o.collision = { x: o.bbox.x, y: bottomY - d, width: o.width, height: d };
      }
      if (!o.interactionRadius && o.interactive) o.interactionRadius = 16;
      const st = this.objState[o.id];
      o.state = st || {};
      this.objState[o.id] = o.state;
      if (o.state.hidden == null) o.state.hidden = !!o.hidden;
      return o;
    },

    get(id) { return this.byId[id]; },
    setHidden(id, h) { const o = this.byId[id]; if (o) o.state.hidden = h; else (this.objState[id] = this.objState[id] || {}).hidden = h; this.rebuildSolids(); },
    setObjState(id, key, val) {
      const st = this.objState[id] = this.objState[id] || {};
      st[key] = val;
      if (this.byId[id]) this.byId[id].state = st;
    },
    objStateOf(id) { return this.objState[id] || {}; },

    defaultLighting(roomId) {
      if (roomId === 'office') return 'sunset';
      if (roomId === 'street') return 'sunset';
      return 'day';
    },
    setLighting(mode, instant) {
      const levels = { day: 1, sunset: 1, night: 0, dark: 0, evening: 0.55 };
      this.light.mode = mode;
      this.light.target = levels[mode] != null ? levels[mode] : 1;
      if (instant) this.light.level = this.light.target;
    },
    fadeLighting(mode, dur) {
      this.light.mode = mode;
      const levels = { day: 1, sunset: 1, night: 0, dark: 0, evening: 0.55 };
      return Engine.tween(this.light, { level: levels[mode] != null ? levels[mode] : 1 }, dur || 1, Engine.Ease.inOut);
    },

    // ---------------------------------------------------------------- Characters
    addChar(ch) { if (!this.chars.includes(ch)) this.chars.push(ch); return ch; },
    removeChar(ch) { this.chars = this.chars.filter(c => c !== ch); },

    // ---------------------------------------------------------------- Collision
    rebuildSolids() {
      const L = this.layout;
      this.solids = [];
      for (const o of this.objects) if (o.solid && o.collision && !o.state.hidden) this.solids.push({ id: o.id, rect: o.collision });
      for (const c of (L.collision || [])) this.solids.push({ id: c.id || 'wall', rect: c });
    },
    inWalkable(x, y) {
      for (const r of this.layout.walkable) if (x >= r.x && x <= r.x + r.width && y >= r.y && y <= r.y + r.height) return true;
      return false;
    },
    rectWalkable(rect) {
      return this.inWalkable(rect.x, rect.y) && this.inWalkable(rect.x + rect.width, rect.y) &&
        this.inWalkable(rect.x, rect.y + rect.height) && this.inWalkable(rect.x + rect.width, rect.y + rect.height);
    },
    // Is a character foot position valid? `who` is excluded from character collisions.
    canStand(x, y, who, ignoreChars) {
      const fr = who ? who.footRect(x, y) : { x: x - 5, y: y - 4, width: 10, height: 4 };
      if (!this.rectWalkable(fr)) return false;
      for (const s of this.solids) if (rectsOverlap(fr, s.rect)) return false;
      if (!ignoreChars) {
        for (const c of this.chars) {
          if (c === who || !c.visible || c.ghost) continue;
          if (rectsOverlap(fr, c.footRect())) return false;
        }
      }
      return true;
    },
    // Axis-separated movement with sliding.
    tryMove(ch, dx, dy) {
      let moved = 0;
      if (dx) {
        if (this.canStand(ch.x + dx, ch.y, ch)) { ch.x += dx; moved += Math.abs(dx); }
        else if (!dy) {
          for (const s of [1, -1]) if (this.canStand(ch.x + dx, ch.y + s * 0.7, ch)) { ch.x += dx; ch.y += s * 0.7; moved += Math.abs(dx); break; }
        }
      }
      if (dy) {
        if (this.canStand(ch.x, ch.y + dy, ch)) { ch.y += dy; moved += Math.abs(dy); }
        else if (!dx) {
          for (const s of [1, -1]) if (this.canStand(ch.x + s * 0.7, ch.y + dy, ch)) { ch.y += dy; ch.x += s * 0.7; moved += Math.abs(dy); break; }
        }
      }
      return moved;
    },

    // ---------------------------------------------------------------- Navigation (A* on a 4px grid)
    buildNav() {
      const L = this.layout;
      const cols = Math.ceil(L.width / CELL), rows = Math.ceil(L.height / CELL);
      const grid = new Uint8Array(cols * rows);
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        const x = c * CELL + CELL / 2, y = r * CELL + CELL / 2;
        grid[r * cols + c] = this.canStand(x, y, null, true) ? 1 : 0;
      }
      this.nav = { cols, rows, grid };
    },
    navFree(c, r) { const n = this.nav; return c >= 0 && r >= 0 && c < n.cols && r < n.rows && n.grid[r * n.cols + c] === 1; },
    nearestFreeCell(x, y) {
      const c0 = Math.floor(x / CELL), r0 = Math.floor(y / CELL);
      if (this.navFree(c0, r0)) return [c0, r0];
      for (let rad = 1; rad < 40; rad++) {
        let best = null, bd = 1e9;
        for (let dr = -rad; dr <= rad; dr++) for (let dc = -rad; dc <= rad; dc++) {
          if (Math.max(Math.abs(dr), Math.abs(dc)) !== rad) continue;
          if (this.navFree(c0 + dc, r0 + dr)) { const d = dr * dr + dc * dc; if (d < bd) { bd = d; best = [c0 + dc, r0 + dr]; } }
        }
        if (best) return best;
      }
      return null;
    },
    segmentClear(x0, y0, x1, y1, who) {
      const d = Math.hypot(x1 - x0, y1 - y0), n = Math.max(1, Math.ceil(d / 2));
      for (let i = 1; i <= n; i++) {
        const k = i / n;
        if (!this.canStand(x0 + (x1 - x0) * k, y0 + (y1 - y0) * k, who, true)) return false;
      }
      return true;
    },
    findPath(x0, y0, x1, y1, who) {
      if (!this.nav) return [{ x: x1, y: y1 }];
      if (this.segmentClear(x0, y0, x1, y1, who)) return [{ x: x1, y: y1 }];
      const s = this.nearestFreeCell(x0, y0), g = this.nearestFreeCell(x1, y1);
      if (!s || !g) return [{ x: x1, y: y1 }];
      const { cols } = this.nav;
      const key = (c, r) => r * cols + c;
      const open = [[s[0], s[1]]], came = new Map(), gs = new Map([[key(s[0], s[1]), 0]]);
      const h = (c, r) => Math.hypot(c - g[0], r - g[1]);
      const fs = new Map([[key(s[0], s[1]), h(s[0], s[1])]]);
      const closed = new Set();
      let found = false, iter = 0;
      while (open.length && iter++ < 20000) {
        let bi = 0;
        for (let i = 1; i < open.length; i++) if (fs.get(key(...open[i])) < fs.get(key(...open[bi]))) bi = i;
        const [c, r] = open.splice(bi, 1)[0];
        const k = key(c, r);
        if (c === g[0] && r === g[1]) { found = true; break; }
        closed.add(k);
        for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
          const nc = c + dc, nr = r + dr;
          if (!this.navFree(nc, nr)) continue;
          if (dc && dr && (!this.navFree(c + dc, r) || !this.navFree(c, r + dr))) continue;
          const nk = key(nc, nr);
          if (closed.has(nk)) continue;
          const ng = gs.get(k) + (dc && dr ? 1.414 : 1);
          if (!gs.has(nk) || ng < gs.get(nk)) {
            came.set(nk, k); gs.set(nk, ng); fs.set(nk, ng + h(nc, nr));
            if (!open.some(([oc, or]) => oc === nc && or === nr)) open.push([nc, nr]);
          }
        }
      }
      if (!found) return [{ x: x1, y: y1 }];
      const cells = [];
      let k = key(g[0], g[1]);
      while (k !== undefined) { cells.unshift([k % cols, Math.floor(k / cols)]); k = came.get(k); }
      const pts = cells.map(([c, r]) => ({ x: c * CELL + CELL / 2, y: r * CELL + CELL / 2 }));
      pts.push({ x: x1, y: y1 });
      // String-pulling to remove grid zig-zags.
      const out = [];
      let cx = x0, cy = y0, i = 0;
      while (i < pts.length) {
        let j = pts.length - 1;
        while (j > i && !this.segmentClear(cx, cy, pts[j].x, pts[j].y, who)) j--;
        out.push(pts[j]); cx = pts[j].x; cy = pts[j].y; i = j + 1;
      }
      return out;
    },

    // ---------------------------------------------------------------- Interaction
    isEnabled(o) {
      if (!o.interactive || o.state.hidden) return false;
      return !window.Scenes || Scenes.isInteractable(o);
    },
    promptFor(o) { return (window.Scenes && Scenes.promptFor(o)) || o.prompt || 'Examine'; },
    nearestInteractable(ch) {
      let best = null, bd = 1e9;
      for (const o of this.objects) {
        if (!this.isEnabled(o) || !o.interactionPoint) continue;
        const p = o.interactionPoint;
        const d = Math.hypot(ch.x - p.x, ch.y - p.y);
        if (d > o.interactionRadius) continue;
        if (!this.segmentClear(ch.x, ch.y, p.x, p.y, ch) && !this.lineOpen(ch.x, ch.y, p.x, p.y)) continue;
        if (d < bd) { bd = d; best = o; }
      }
      return best;
    },
    // Weaker line-of-sight test: only walls (walkable bounds) block, not furniture footprints.
    lineOpen(x0, y0, x1, y1) {
      const d = Math.hypot(x1 - x0, y1 - y0), n = Math.max(1, Math.ceil(d / 2));
      for (let i = 0; i <= n; i++) { const k = i / n; if (!this.inWalkable(x0 + (x1 - x0) * k, y0 + (y1 - y0) * k)) return false; }
      return true;
    },
    // Nearest accessible point to `p` for `who` (used when an interaction point is occupied or blocked).
    accessiblePoint(p, who) {
      if (this.canStand(p.x, p.y, who)) return { x: p.x, y: p.y };
      for (let rad = 2; rad <= 30; rad += 2) {
        for (let a = 0; a < 16; a++) {
          const x = p.x + Math.cos(a / 16 * Math.PI * 2) * rad, y = p.y + Math.sin(a / 16 * Math.PI * 2) * rad;
          if (this.canStand(x, y, who)) return { x, y };
        }
      }
      return { x: p.x, y: p.y };
    },
    // Walk the character to an object's interaction point and face it.
    async approach(ch, o) {
      if (ch.state === 'sitting') await ch.stand();
      const p = this.accessiblePoint(o.interactionPoint, ch);
      if (Math.hypot(ch.x - p.x, ch.y - p.y) > 1.5) await ch.walkTo(p.x, p.y);
      const face = o.facing || Characters.dirToward(ch.x, ch.y, o.x, o.y - o.height / 2);
      await ch.face(face);
    },
    exitAt(x, y) {
      for (const e of (this.layout.exits || [])) if (pointIn(e, x, y)) return e;
      return null;
    },

    // ---------------------------------------------------------------- Update
    update(dt) {
      this.t += dt;
      for (const ch of this.chars) ch.update(dt);
      // Lighting transitions toward their target when not tweened explicitly.
      // Ambient particles.
      for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];
        p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.ph += dt;
        if (p.kind === 'dust') p.x += Math.sin(p.ph * 0.9) * 0.05;
        if (p.kind === 'leaf' || p.kind === 'petal') p.x += Math.sin(p.ph * 2) * 0.3;
        if (p.life <= 0) this.particles.splice(i, 1);
      }
      const want = this.roomId === 'street' ? 26 : 22;
      if (this.particles.filter(p => p.ambient).length < want && Math.random() < dt * 6) this.spawnParticle(false);
      if (this.roomId === 'street') this.updateCars(dt);
    },
    spawnParticle(anywhere) {
      const L = this.layout, cb = Camera;
      const vx0 = cb.x - 10, vy0 = cb.y - 10, vw = Camera.viewW() + 20, vh = Camera.viewH() + 20;
      const x = anywhere ? Math.random() * L.width : vx0 + Math.random() * vw;
      let p;
      if (this.roomId === 'street') {
        if (this.light.mode === 'night') p = { kind: 'firefly', x, y: 130 + Math.random() * 90, vx: (Math.random() - 0.5) * 6, vy: (Math.random() - 0.5) * 4, life: 4 + Math.random() * 4 };
        else p = { kind: 'leaf', x, y: anywhere ? 60 + Math.random() * 160 : vy0, vx: 4 + Math.random() * 6, vy: 6 + Math.random() * 6, life: 12, col: Math.random() < 0.5 ? '#d98a3a' : '#c9b04a' };
      } else if (this.roomId === 'shop' && Math.random() < 0.3) {
        p = { kind: 'petal', x, y: anywhere ? Math.random() * L.height : 0, vx: 1 + Math.random() * 3, vy: 5 + Math.random() * 4, life: 14, col: Math.random() < 0.5 ? '#f39bb6' : '#fbd0dd' };
      } else {
        p = { kind: 'dust', x, y: anywhere ? Math.random() * L.height : vy0 + Math.random() * vh, vx: (Math.random() - 0.5) * 2, vy: -0.4 - Math.random() * 1.2, life: 6 + Math.random() * 6 };
      }
      p.ph = Math.random() * 10; p.ambient = true;
      this.particles.push(p);
    },
    burst(kind, x, y, n, opts) {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2, s = (opts && opts.speed || 20) * (0.4 + Math.random() * 0.8);
        this.particles.push({ kind, x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - (opts && opts.up || 10), life: (opts && opts.life) || 0.9, ph: 0, col: opts && opts.colors ? opts.colors[i % opts.colors.length] : '#fff3a8', grav: opts && opts.grav });
      }
    },
    updateCars(dt) {
      const busActive = this.cars.some(c => c.kind === 'bus');
      if (Math.random() < dt * 0.12 && this.cars.length < 2) {
        const dir = busActive ? 1 : (Math.random() < 0.5 ? 1 : -1);
        const y = dir > 0 ? 256 : 244;
        const laneBusy = this.cars.some(c => Math.abs(c.y - y) < 6);
        if (!laneBusy) {
          this.cars.push({ x: dir > 0 ? Camera.x - 60 : Camera.x + Camera.viewW() + 60, y, dir, speed: 70 + Math.random() * 40, col: ['#c2453f', '#4a6fa5', '#e9c33f', '#5f8a5a', '#e8e2d4'][Math.floor(Math.random() * 5)] });
        }
      }
      for (let i = this.cars.length - 1; i >= 0; i--) {
        const c = this.cars[i];
        if (c.scripted) continue;
        c.x += c.dir * c.speed * dt;
        if (Math.abs(c.x - (Camera.x + Camera.viewW() / 2)) > 420) this.cars.splice(i, 1);
      }
    },

    // ---------------------------------------------------------------- Rendering
    // Order: wall/scenery -> wall decor -> floor -> floor decor -> background furniture -> Y-sorted furniture
    // and characters -> foreground -> particles -> lighting. UI is drawn by the caller on the HUD layer.
    render(ctx) {
      const L = this.layout;
      const z = Camera.zoom;
      const camX = Math.round((Camera.x + Camera.offX) * z) / z, camY = Math.round((Camera.y + Camera.offY) * z) / z;
      ctx.save();
      ctx.scale(z, z);
      ctx.translate(-camX, -camY);
      const env = { t: this.t, light: this.light, room: this.roomId, layout: L, state: this.objState };
      WorldArt.drawWalls(ctx, this.roomId, L, env);
      for (const o of this.objects) if (o.layer === 'wall' && !o.state.hidden) WorldArt.drawObject(ctx, o, env);
      WorldArt.drawFloor(ctx, this.roomId, L, env);
      for (const o of this.objects) if (o.layer === 'floor' && !o.state.hidden) WorldArt.drawObject(ctx, o, env);
      for (const o of this.objects) if (o.layer === 'background' && !o.state.hidden) WorldArt.drawObject(ctx, o, env);
      const list = [];
      for (const o of this.objects) if (o.layer === 'furniture' && !o.state.hidden) list.push({ k: o.sortY + (o.state.sortShift || 0), o });
      for (const c of this.chars) if (c.visible) list.push({ k: c.y + (c.sortBias || 0) + 0.01, c });
      list.sort((a, b) => a.k - b.k);
      for (const it of list) {
        if (it.o) WorldArt.drawObject(ctx, it.o, env);
        else it.c.draw(ctx);
      }
      for (const o of this.objects) if (o.layer === 'foreground' && !o.state.hidden) WorldArt.drawObject(ctx, o, env);
      if (this.roomId === 'street') WorldArt.drawCars(ctx, this.cars, env);
      WorldArt.drawForeground(ctx, this.roomId, L, env);
      this.renderParticles(ctx);
      ctx.restore();
      this.renderLighting(ctx, camX, camY, env);
    },
    renderParticles(ctx) {
      for (const p of this.particles) {
        if (p.kind === 'dust') {
          const a = Math.min(1, p.life / 2) * 0.55;
          ctx.fillStyle = `rgba(255,246,220,${a.toFixed(2)})`;
          ctx.fillRect(Math.round(p.x), Math.round(p.y), 1, 1);
        } else if (p.kind === 'firefly') {
          const on = Math.sin(p.ph * 3) > 0;
          ctx.fillStyle = on ? '#fff3a8' : 'rgba(255,243,168,0.35)';
          ctx.fillRect(Math.round(p.x), Math.round(p.y), 1, 1);
        } else if (p.kind === 'leaf' || p.kind === 'petal') {
          ctx.fillStyle = p.col;
          ctx.fillRect(Math.round(p.x), Math.round(p.y), 2, 1);
          if (Math.sin(p.ph * 3) > 0) ctx.fillRect(Math.round(p.x) + 1, Math.round(p.y) + 1, 1, 1);
        } else {
          if (p.grav) p.vy += p.grav * 0.016;
          ctx.fillStyle = p.col;
          const s = p.life > 0.4 ? 2 : 1;
          ctx.fillRect(Math.round(p.x), Math.round(p.y), s, s);
        }
      }
    },
    renderLighting(ctx, camX, camY, env) {
      const lv = this.light.level;
      const W = Engine.W, H = Engine.H;
      if (lv >= 0.99) {
        if (this.light.mode === 'sunset') {
          ctx.fillStyle = 'rgba(255,150,80,0.10)';
          ctx.fillRect(0, 0, W, H);
        }
        const lights = WorldArt.lightsFor(this.objects, env).concat(this.extraLights);
        if (lights.length) {
          const z = Camera.zoom;
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          for (const s of lights) {
            if (!s.color) continue;
            const x = Math.round((s.x - camX) * z), y = Math.round((s.y - camY) * z);
            ctx.fillStyle = s.color;
            ctx.globalAlpha = 0.14 * (s.strength || 1);
            ctx.beginPath();
            if (s.ry) ctx.ellipse(x, y, s.r * 0.65 * z, s.ry * 0.65 * z, 0, 0, Math.PI * 2);
            else ctx.arc(x, y, s.r * 0.65 * z, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
        }
        return;
      }
      if (!this.light_canvas) { this.light_canvas = document.createElement('canvas'); this.light_canvas.width = W; this.light_canvas.height = H; }
      const lc = this.light_canvas, l = lc.getContext('2d');
      l.globalCompositeOperation = 'source-over';
      l.clearRect(0, 0, W, H);
      const night = this.roomId === 'street' ? 'rgba(14,18,48,' : 'rgba(18,14,40,';
      l.fillStyle = night + (0.78 * (1 - lv)).toFixed(3) + ')';
      l.fillRect(0, 0, W, H);
      l.globalCompositeOperation = 'destination-out';
      const lights = WorldArt.lightsFor(this.objects, env).concat(this.extraLights);
      const z = Camera.zoom;
      for (const s0 of lights) {
        const s = Object.assign({}, s0, { r: s0.r * z, ry: s0.ry ? s0.ry * z : 0 });
        const x = Math.round((s.x - camX) * z), y = Math.round((s.y - camY) * z);
        if (x < -s.r || y < -s.r || x > W + s.r || y > H + s.r) continue;
        const f = s.flicker ? (0.85 + 0.15 * Math.sin(this.t * 23 + s.x) * Math.sin(this.t * 7.3)) : 1;
        const bands = [[1, 0.35], [0.7, 0.35], [0.45, 0.4]];
        for (const [rk, a] of bands) {
          l.fillStyle = `rgba(0,0,0,${(a * f * (s.strength || 1)).toFixed(3)})`;
          l.beginPath();
          if (s.ry) l.ellipse(x, y, s.r * rk, s.ry * rk, 0, 0, Math.PI * 2); else l.arc(x, y, s.r * rk, 0, Math.PI * 2);
          l.fill();
        }
      }
      ctx.drawImage(lc, 0, 0);
      if (this.roomId === 'bedroom') {
        const z = Camera.zoom;
        const x0 = Math.round((0 - camX) * z), x1 = Math.round((this.layout.width - camX) * z);
        const grad = ctx.createLinearGradient(x0, 0, x1, 0);
        grad.addColorStop(0.0, 'rgba(255,212,120,0.09)');
        grad.addColorStop(0.38, 'rgba(255,220,150,0.06)');
        grad.addColorStop(0.56, 'rgba(200,210,235,0.02)');
        grad.addColorStop(0.75, 'rgba(110,175,255,0.11)');
        grad.addColorStop(1.0, 'rgba(95,165,255,0.14)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);
      }
      // Warm/cool glow pass on light sources.
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (const s of lights) {
        if (!s.color) continue;
        const x = Math.round((s.x - camX) * z), y = Math.round((s.y - camY) * z);
        ctx.fillStyle = s.color;
        ctx.globalAlpha = (s.glowAlpha != null ? s.glowAlpha : 0.10) * (1 - lv) * (s.strength || 1);
        ctx.beginPath();
        if (s.ry) ctx.ellipse(x, y, s.r * 0.55 * z, s.ry * 0.55 * z, 0, 0, Math.PI * 2);
        else ctx.arc(x, y, s.r * 0.55 * z, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    },

    // Screen position (HUD coordinates) of a world point.
    toScreen(wx, wy) {
      return { x: (wx - Camera.x - Camera.offX) * Camera.zoom, y: (wy - Camera.y - Camera.offY) * Camera.zoom };
    },

    rectsOverlap, pointIn, bboxOf, CELL
  };

  window.World = World;
})();
