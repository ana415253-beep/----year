// Developer tools: F3 overlay (bounding boxes, collisions, interaction points, walkable areas, exits, spawns,
// camera bounds, IDs), a layout editor (mouse drag, arrow nudges, delete, export) and the layout validator.
(function () {
  const ROOMS = ['office', 'porch', 'street', 'shop', 'living', 'hallway', 'kitchen', 'bedroom'];
  const PARTS = ['object', 'collision', 'point'];
  const tiny = (ctx, t, x, y, c) => PixelFont.draw(ctx, t, x, y, c || '#fff');

  const Debug = {
    enabled: new URLSearchParams(window.location.search).get('dev') === '1',
    on: false, showNav: false, showIssues: false, sel: null, part: 0, dragging: false, dragFrom: null,
    issues: [], fps: 60, lastRealT: 0, orig: null,
    get editing() { return this.on && !!this.sel; },

    init() {
      Input.onKey(e => this.onKey(e));
      try { this.issues = this.validate(); }
      catch (err) { console.error('[Validator] failed', err); this.issues = [{ room: '-', id: '-', x: 0, y: 0, reason: 'Validator crashed: ' + err.message }]; }
      if (this.issues.length) {
        console.warn('[Validator] ' + this.issues.length + ' layout issue(s):');
        console.table(this.issues);
      } else console.info('[Validator] all layouts passed.');
    },

    onKey(e) {
      if (!this.enabled) return;
      if (e.code === 'F3') { this.on = !this.on; if (!this.on) this.deselect(true); return; }
      if (!this.on) return;
      const step = e.shiftKey ? 5 : 1;
      if (this.sel) {
        const mv = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.code];
        if (mv) { e.preventDefault(); this.moveSel(mv[0], mv[1]); return; }
        if (e.code === 'Enter') { this.commit(); return; }
        if (e.code === 'Escape') { this.deselect(true); return; }
        if (e.code === 'Delete' || e.code === 'Backspace') { this.removeSel(); return; }
        if (e.code === 'Tab') { e.preventDefault(); this.part = (this.part + 1) % PARTS.length; return; }
      }
      const n = parseInt(e.key, 10);
      if (n >= 1 && n <= ROOMS.length && !Engine.inScript) { Game.mode = 'play'; Game.player.controllable = true; Engine.runScript(() => Game.changeRoom(ROOMS[n - 1], 'default')); return; }
      if (e.code === 'KeyG') this.showNav = !this.showNav;
      if (e.code === 'KeyV') { this.issues = this.validate(); this.showIssues = !this.showIssues; console.table(this.issues); }
      if (e.code === 'KeyX') this.exportLayouts();
      if (e.code === 'KeyL') {
        const modes = ['day', 'sunset', 'evening', 'night'];
        World.setLighting(modes[(modes.indexOf(World.light.mode) + 1) % modes.length], true);
        UI.toast('Lighting: ' + World.light.mode);
      }
    },

    // ---------------------------------------------------------------- Editor
    srcOf(o) {
      const L = World.layout;
      for (const k of ['furniture', 'decorations', 'interactables']) {
        const arr = L[k] || [];
        const i = arr.findIndex(s => s.id === o.id);
        if (i >= 0) return { arr, i, src: arr[i] };
      }
      return null;
    },
    pick(wx, wy) {
      // Entries first (small crosses), then objects topmost-first.
      const L = World.layout;
      for (const name in L.entries) {
        const e = L.entries[name];
        if (Math.abs(e.x - wx) <= 3 && Math.abs(e.y - wy) <= 3) return { kind: 'entry', name, ref: e };
      }
      const list = World.objects.filter(o => !o.state.hidden && World.pointIn(o.bbox, wx, wy) && o.layer !== 'floor');
      list.sort((a, b) => b.sortY - a.sortY);
      const floor = World.objects.filter(o => o.layer === 'floor' && World.pointIn(o.bbox, wx, wy));
      const o = list[0] || floor[0];
      return o ? { kind: 'object', o } : null;
    },
    select(s) {
      this.sel = s;
      this.part = 0;
      this.orig = s.kind === 'entry' ? { x: s.ref.x, y: s.ref.y } : this.snapshot(s.o);
    },
    snapshot(o) {
      return { x: o.x, y: o.y, c: o.collision ? { ...o.collision } : null, p: o.interactionPoint ? { ...o.interactionPoint } : null,
        kids: World.objects.filter(k => k.on === o.id).map(k => ({ k, x: k.x, y: k.y })) };
    },
    moveSel(dx, dy) {
      const s = this.sel;
      if (!s || (!dx && !dy)) return;
      if (s.kind === 'entry') { s.ref.x += dx; s.ref.y += dy; return; }
      const o = s.o, part = PARTS[this.part];
      if (part === 'collision') { if (o.collision) { o.collision.x += dx; o.collision.y += dy; } }
      else if (part === 'point') { if (o.interactionPoint) { o.interactionPoint.x += dx; o.interactionPoint.y += dy; } }
      else {
        this.shiftObject(o, dx, dy);
        for (const k of World.objects) if (k.on === o.id) this.shiftObject(k, dx, dy);
      }
      this.refresh();
    },
    shiftObject(o, dx, dy) {
      const ref = this.srcOf(o);
      o.x += dx; o.y += dy;
      if (ref) { ref.src.x = o.x; ref.src.y = o.y; }
      // collision and interactionPoint objects are shared with the layout source.
      if (o.collision) { o.collision.x += dx; o.collision.y += dy; }
      if (o.interactionPoint) { o.interactionPoint.x += dx; o.interactionPoint.y += dy; }
      if (ref && ref.src.collision && ref.src.collision !== o.collision) ref.src.collision = { ...o.collision };
      o.bbox = World.bboxOf(o);
      const parent = o.on && World.byId[o.on];
      o.sortY = parent ? parent.y + (parent.sortOffset || 0) + 0.001 : o.y + (o.sortOffset || WorldArt.sortOffset(o.type) || 0);
    },
    refresh() { World.rebuildSolids(); World.buildNav(); },
    commit() {
      if (!this.sel) return;
      const s = this.sel;
      const label = s.kind === 'entry' ? 'entry ' + s.name : s.o.id;
      const pos = s.kind === 'entry' ? s.ref : s.o;
      UI.toast('Saved ' + label + ' at ' + Math.round(pos.x) + ', ' + Math.round(pos.y) + ' (X exports)');
      this.sel = null;
      this.issues = this.validate();
    },
    deselect(revert) {
      const s = this.sel;
      if (s && revert && this.orig) {
        if (s.kind === 'entry') { s.ref.x = this.orig.x; s.ref.y = this.orig.y; }
        else {
          const o = s.o, d = this.orig;
          this.shiftObject(o, d.x - o.x, d.y - o.y);
          if (d.c) Object.assign(o.collision, d.c);
          if (d.p) Object.assign(o.interactionPoint, d.p);
          for (const k of d.kids) this.shiftObject(k.k, k.x - k.k.x, k.y - k.k.y);
          this.refresh();
        }
      }
      this.sel = null; this.dragging = false;
    },
    removeSel() {
      const s = this.sel;
      if (!s || s.kind !== 'object') return;
      const ref = this.srcOf(s.o);
      if (ref) ref.arr.splice(ref.i, 1);
      World.objects = World.objects.filter(o => o !== s.o);
      delete World.byId[s.o.id];
      this.refresh();
      UI.toast('Removed ' + s.o.id);
      this.sel = null;
      this.issues = this.validate();
    },
    exportLayouts() {
      const body = '// Exported from the in-game layout editor (F3). Comments from the hand-written file are not preserved;\n' +
        '// per-object `note` fields are.\n(function () {\n  const WORLD_LAYOUTS = ' + JSON.stringify(WORLD_LAYOUTS, null, 2).replace(/\n/g, '\n  ') +
        ';\n\n  const SCENE_LAYOUTS = ' + JSON.stringify(SCENE_LAYOUTS, null, 2).replace(/\n/g, '\n  ') +
        ';\n\n  window.WORLD_LAYOUTS = WORLD_LAYOUTS;\n  window.SCENE_LAYOUTS = SCENE_LAYOUTS;\n})();\n';
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([body], { type: 'text/javascript' }));
      a.download = 'layouts.js';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      UI.toast('Exported layouts.js');
    },

    update(realDt) {
      if (realDt > 0) this.fps += ((1 / realDt) - this.fps) * 0.05;
      if (!this.on || !World.layout) return;
      const m = Input.mouse;
      const w = Camera.toWorld(m.x, m.y);
      if (m.clicked && m.inside && !UI.busy) {
        const hit = this.pick(w.x, w.y);
        if (this.sel && hit && hit.kind === 'object' && this.sel.kind === 'object' && hit.o === this.sel.o) { /* keep */ }
        else if (hit) { if (this.sel) this.commit(); this.select(hit); }
        else if (this.sel) this.commit();
        if (this.sel) { this.dragging = true; this.dragFrom = { x: Math.round(w.x), y: Math.round(w.y) }; }
      }
      if (this.dragging && m.down && this.sel) {
        const nx = Math.round(w.x), ny = Math.round(w.y);
        this.moveSel(nx - this.dragFrom.x, ny - this.dragFrom.y);
        this.dragFrom = { x: nx, y: ny };
      }
      if (!m.down) this.dragging = false;
    },

    // ---------------------------------------------------------------- Rendering
    renderWorld(ctx) {
      if (!this.on || !World.layout) return;
      const L = World.layout, z = Camera.zoom;
      ctx.save();
      ctx.scale(z, z);
      ctx.translate(-Math.round(Camera.x), -Math.round(Camera.y));
      ctx.lineWidth = 1;
      const rect = (r, c, fill) => {
        if (fill) { ctx.fillStyle = fill; ctx.fillRect(r.x, r.y, r.width, r.height); }
        ctx.strokeStyle = c; ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.width - 1, r.height - 1);
      };
      for (const r of L.walkable) rect(r, 'rgba(80,255,120,0.6)', 'rgba(80,255,120,0.08)');
      if (this.showNav && World.nav) {
        const n = World.nav;
        ctx.fillStyle = 'rgba(255,60,60,0.25)';
        for (let r = 0; r < n.rows; r++) for (let c = 0; c < n.cols; c++) if (!n.grid[r * n.cols + c]) ctx.fillRect(c * 4, r * 4, 4, 4);
      }
      rect(L.cameraBounds, 'rgba(255,255,255,0.35)');
      for (const e of (L.exits || [])) { rect(e, '#ff4fd8', 'rgba(255,79,216,0.15)'); tiny(ctx, e.id, e.x + 1, e.y + 1, '#ff9fe8'); }
      for (const o of World.objects) {
        if (o.state.hidden) continue;
        const sel = this.sel && this.sel.o === o;
        rect(o.bbox, sel ? '#ffffff' : 'rgba(90,200,255,0.75)');
        if (o.collision && o.solid) rect(o.collision, sel && PARTS[this.part] === 'collision' ? '#fff' : '#ff4040', 'rgba(255,64,64,0.18)');
        if (o.interactionPoint) {
          const p = o.interactionPoint;
          ctx.strokeStyle = 'rgba(255,220,60,0.55)';
          ctx.beginPath(); ctx.arc(p.x, p.y, o.interactionRadius || 16, 0, Math.PI * 2); ctx.stroke();
          ctx.fillStyle = sel && PARTS[this.part] === 'point' ? '#fff' : '#ffd23c';
          ctx.fillRect(p.x - 1, p.y - 1, 3, 3);
        }
        // Anchor marker.
        ctx.fillStyle = '#5ac8ff'; ctx.fillRect(Math.round(o.x) - 1, Math.round(o.y), 3, 1);
        tiny(ctx, o.id.replace(/^[a-z]+_/, ''), o.bbox.x + 1, o.bbox.y + 1, sel ? '#fff' : '#bfe9ff');
      }
      for (const name in L.entries) {
        const e = L.entries[name];
        const sel = this.sel && this.sel.ref === e;
        ctx.fillStyle = sel ? '#ffd23c' : '#fff';
        ctx.fillRect(e.x - 3, e.y, 7, 1); ctx.fillRect(e.x, e.y - 3, 1, 7);
        tiny(ctx, name, e.x + 3, e.y + 2, '#fff');
      }
      for (const c of World.chars) if (c.visible) rect(c.footRect(), '#ffffff');
      const sc = window.Scenes && Scenes.current && SCENE_LAYOUTS[Scenes.current];
      if (sc && sc.room === World.roomId) for (const k in sc.marks) {
        const m = sc.marks[k];
        if (m.width) rect(m, '#ffa040');
        else { ctx.fillStyle = '#ffa040'; ctx.fillRect(m.x - 1, m.y - 1, 3, 3); tiny(ctx, k, m.x + 3, m.y - 6, '#ffc890'); }
      }
      ctx.restore();
    },
    renderHUD(ctx) {
      if (!this.on) return;
      const p = Game.player, m = Input.mouse, w = Camera.toWorld(m.x, m.y);
      const lines = [
        'ROOM ' + World.roomId + '  FPS ' + Math.round(this.fps) + '  LIGHT ' + World.light.mode,
        'RONI ' + Math.round(p.x) + ',' + Math.round(p.y) + ' ' + p.dir + '  MOUSE ' + Math.round(w.x) + ',' + Math.round(w.y),
        'ISSUES ' + this.issues.length + '  ERRORS ' + Engine.errors.length + (window.Scenes && Scenes.current ? '  SCENE ' + Scenes.current : '')
      ];
      if (this.sel) {
        const s = this.sel;
        if (s.kind === 'entry') lines.push('EDIT ENTRY ' + s.name + ' ' + s.ref.x + ',' + s.ref.y);
        else lines.push('EDIT ' + s.o.id + ' [' + PARTS[this.part] + '] ' + s.o.x + ',' + s.o.y);
        lines.push('ARROWS/DRAG MOVE  SHIFT X5  TAB PART  ENTER OK  ESC UNDO  DEL REMOVE');
      } else lines.push('CLICK SELECT  1-7 ROOM  G NAV  V ISSUES  L LIGHT  X EXPORT  F3 CLOSE');
      ctx.fillStyle = 'rgba(0,0,0,0.65)';
      ctx.fillRect(0, Engine.H - lines.length * 7 - 3, Engine.W, lines.length * 7 + 3);
      lines.forEach((l, i) => tiny(ctx, l, 2, Engine.H - lines.length * 7 - 1 + i * 7, i === lines.length - 1 ? '#ffd23c' : '#e8f6ff'));
      if (this.showIssues) {
        const list = this.issues.slice(0, 16);
        ctx.fillStyle = 'rgba(10,0,20,0.85)';
        ctx.fillRect(4, 4, Engine.W - 8, 10 + list.length * 7);
        tiny(ctx, 'LAYOUT VALIDATOR: ' + this.issues.length + ' ISSUE(S)' + (this.issues.length ? '' : ' - ALL CHECKS PASSED'), 7, 6, '#8fd3c4');
        list.forEach((it, i) => tiny(ctx, (it.room + ' ' + it.id + ' ' + it.x + ',' + it.y + ' ' + it.reason).slice(0, 78), 7, 14 + i * 7, '#ffb0b0'));
      }
    },

    // ---------------------------------------------------------------- Validator (Section 24.14)
    validate() {
      const issues = [];
      const add = (room, id, x, y, reason) => issues.push({ room, id, x: Math.round(x), y: Math.round(y), reason });
      const snap = this.snapshotWorld();
      const ids = {};
      try {
        for (const roomId of ROOMS) {
          const L = WORLD_LAYOUTS[roomId];
          if (!L) { add(roomId, '-', 0, 0, 'room missing from WORLD_LAYOUTS'); continue; }
          World.load(roomId, { lighting: 'day' });
          const objs = World.objects;
          for (const o of objs) {
            if (ids[o.id]) add(roomId, o.id, o.x, o.y, 'duplicate id (also in ' + ids[o.id] + ')');
            ids[o.id] = roomId;
            if (!WorldArt.hasArt(o.type)) add(roomId, o.id, o.x, o.y, 'no art for type ' + o.type);
            if (o.on && !World.byId[o.on]) add(roomId, o.id, o.x, o.y, 'parent ' + o.on + ' not found');
            const b = o.bbox;
            if (b.x < 0 || b.y < 0 || b.x + b.width > L.width || b.y + b.height > L.height) add(roomId, o.id, o.x, o.y, 'outside room bounds');
            if (o.interactive && !o.interactionPoint) add(roomId, o.id, o.x, o.y, 'interactive without interactionPoint');
          }
          // Solid footprints must not overlap unless declared.
          const solids = objs.filter(o => o.solid && o.collision);
          for (let i = 0; i < solids.length; i++) for (let j = i + 1; j < solids.length; j++) {
            const a = solids[i], c = solids[j];
            if (!World.rectsOverlap(a.collision, c.collision)) continue;
            if ((a.overlapOK || []).includes(c.id) || (c.overlapOK || []).includes(a.id)) continue;
            add(roomId, a.id, a.collision.x, a.collision.y, 'collision overlaps ' + c.id);
          }
          // Essential objects must not visually overlap each other.
          const ess = objs.filter(o => o.essential);
          for (let i = 0; i < ess.length; i++) for (let j = i + 1; j < ess.length; j++) {
            if (World.rectsOverlap(ess[i].bbox, ess[j].bbox)) add(roomId, ess[i].id, ess[i].x, ess[i].y, 'essential object overlaps ' + ess[j].id);
          }
          // Entries must be standable; interaction points must be reachable from the default entry.
          const reach = this.reachable(L.entries.default || L.playerSpawn);
          for (const name in L.entries) {
            const e = L.entries[name];
            if (!World.canStand(e.x, e.y, null, true)) add(roomId, 'entry:' + name, e.x, e.y, 'spawn blocked (outside walkable or inside furniture)');
          }
          for (const o of objs) {
            if (!o.interactive || !o.interactionPoint) continue;
            const p = o.interactionPoint;
            if (!World.inWalkable(p.x, p.y)) { add(roomId, o.id, p.x, p.y, 'interaction point outside walkable area'); continue; }
            const ap = World.accessiblePoint(p, null);
            if (Math.hypot(ap.x - p.x, ap.y - p.y) > (o.interactionRadius || 16)) add(roomId, o.id, p.x, p.y, 'interaction point blocked by furniture');
            else if (!reach(ap.x, ap.y)) add(roomId, o.id, p.x, p.y, 'interaction point unreachable from entry');
          }
          for (const e of (L.exits || [])) {
            if (e.to && !WORLD_LAYOUTS[e.to]) add(roomId, e.id, e.x, e.y, 'exit to unknown room ' + e.to);
            else if (e.to && e.entry && !WORLD_LAYOUTS[e.to].entries[e.entry]) add(roomId, e.id, e.x, e.y, 'exit entry ' + e.entry + ' missing in ' + e.to);
          }
          for (const o of objs) {
            if (o.to && !WORLD_LAYOUTS[o.to]) add(roomId, o.id, o.x, o.y, 'door to unknown room ' + o.to);
            else if (o.to && o.entry && !WORLD_LAYOUTS[o.to].entries[o.entry]) add(roomId, o.id, o.x, o.y, 'door entry ' + o.entry + ' missing in ' + o.to);
          }
        }
        // Scene spawns and marks.
        for (const sid in SCENE_LAYOUTS) {
          const S = SCENE_LAYOUTS[sid];
          if (!WORLD_LAYOUTS[S.room]) { add(sid, '-', 0, 0, 'unknown room ' + S.room); continue; }
          World.load(S.room, { lighting: 'day' });
          if (window.Scenes && Scenes.prepareValidation) Scenes.prepareValidation(sid);
          const placed = [];
          const checkChars = (chars, tag) => {
            for (const cid in chars) {
              const c = chars[cid];
              if (c.state === 'hidden' || c.visible === false) continue;
              const sitting = c.state === 'sitting';
              if (!World.inWalkable(c.x, c.y)) add(tag, cid, c.x, c.y, 'character outside walkable area');
              else if (!sitting && !World.canStand(c.x, c.y, null, true)) add(tag, cid, c.x, c.y, 'character spawns inside furniture');
              for (const q of placed) if (Math.abs(q.x - c.x) < 10 && Math.abs(q.y - c.y) < 4) add(tag, cid, c.x, c.y, 'character overlaps ' + q.id);
              placed.push({ id: cid, x: c.x, y: c.y });
            }
          };
          checkChars(S.characters, sid);
          for (const m in (S.marks || {})) {
            const k = S.marks[m];
            if (k.width) continue;
            if (!World.inWalkable(k.x, k.y) && !/desk|focus|counter|wrap|bouquet|ring|seat|kneel|inside/.test(m)) add(sid, 'mark:' + m, k.x, k.y, 'mark outside walkable area');
          }
          for (const other in (S.others || {})) {
            World.load(other, { lighting: 'day' });
            placed.length = 0;
            checkChars(S.others[other], sid + '/' + other);
          }
        }
      } finally { this.restoreWorld(snap); }
      return issues;
    },
    // Flood fill on the navigation grid from a start point; returns a membership test.
    reachable(start) {
      const n = World.nav, seen = new Uint8Array(n.cols * n.rows);
      const s = World.nearestFreeCell(start.x, start.y);
      if (!s) return () => false;
      const q = [s];
      seen[s[1] * n.cols + s[0]] = 1;
      while (q.length) {
        const [c, r] = q.pop();
        for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nc = c + dc, nr = r + dr;
          if (World.navFree(nc, nr) && !seen[nr * n.cols + nc]) { seen[nr * n.cols + nc] = 1; q.push([nc, nr]); }
        }
      }
      return (x, y) => { const cell = World.nearestFreeCell(x, y); return !!cell && !!seen[cell[1] * n.cols + cell[0]]; };
    },
    snapshotWorld() {
      const keys = ['roomId', 'layout', 'objects', 'byId', 'chars', 'solids', 'particles', 'cars', 'extraLights', 'nav'];
      const s = {};
      for (const k of keys) s[k] = World[k];
      s.light = { ...World.light };
      s.bounds = { ...Camera.bounds };
      s.hidden = {};
      for (const id in World.objState) s.hidden[id] = World.objState[id].hidden;
      return s;
    },
    restoreWorld(s) {
      for (const k in s) if (!['light', 'bounds', 'hidden'].includes(k)) World[k] = s[k];
      World.light = s.light;
      Camera.bounds = s.bounds;
      for (const id in World.objState) if (id in s.hidden) World.objState[id].hidden = s.hidden[id]; else if (World.objState[id].hidden != null && Object.keys(World.objState[id]).length === 1) delete World.objState[id];
    }
  };

  window.Debug = Debug;
})();

