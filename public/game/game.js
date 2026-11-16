// Game controller: boot, player control, interaction dispatch, room transitions and the frame pipeline.
(function () {
  const DOOR_TYPES = { room_door: 1, side_door: 1, elevator: 1, flower_shop_front: 1, shop_door: 1, house_front_door: 1 };

  const Game = {
    mode: 'boot', player: null, kallita: null, transitioning: false, sandbox: false, lastExit: null,
    lookRange: 1.7, saveClock: 0, _initialized: false,

    init() {
      if (this._initialized) return;
      this._initialized = true;
      const canvas = document.getElementById('game');
      Engine.init(canvas, { update: (dt, real) => this.update(dt, real), render: ctx => this.render(ctx) });
      UI.init();
      Characters.createAll();
      this.player = Characters.get('roni');
      this.kallita = Characters.get('kallita');
      Characters.onStep = ch => {
        if (!window.Sound || !Sound.step) return;
        const vis = Camera.toScreen(ch.x, ch.y);
        if (vis.x < -20 || vis.x > Engine.W + 20) return;
        Sound.step(World.layout ? World.layout.surface : 'wood', ch === this.player ? 1 : 0.55, ch.running);
      };
      window.Debug && Debug.init();
      Engine.start();
      if (window.Menus) Menus.title();
      else this.startSandbox('living');
    },

    // Free roam in any room, used by the developer tools and before the story layer is loaded.
    async startSandbox(roomId) {
      this.sandbox = true;
      this.mode = 'play';
      this.player.configure({ outfit: 'roni_casual', state: 'idle', expression: 'neutral', carrying: [], visible: true, controllable: true });
      await this.changeRoom(roomId || 'living', 'default', { instant: true });
    },

    // ---------------------------------------------------------------- Rooms
    async changeRoom(roomId, entry, opts) {
      opts = opts || {};
      this.transitioning = true;
      UI.clearPrompt();
      if (!opts.instant) await Engine.fade(1, opts.fadeOut == null ? 0.4 : opts.fadeOut);
      const lighting = opts.lighting || (window.Scenes && Scenes.lightingFor && Scenes.lightingFor(roomId)) || null;
      World.load(roomId, { lighting });
      const L = World.layout;
      const e = (entry && typeof entry === 'object') ? entry : (L.entries[entry] || L.entries.default || L.playerSpawn);
      const p = this.player;
      p.path = null; p.moving = false; p.running = false; p.lookTarget = null;
      if (p.state === 'sitting') { p.state = 'idle'; p.sitAmt = 0; }
      p.setPos(e.x, e.y, e.direction);
      World.addChar(p);
      if (window.Scenes && Scenes.onRoomEnter) Scenes.onRoomEnter(roomId, entry);
      Camera.follow(p);
      Camera.focusPt = null; Camera.zoom = 1;
      Camera.snap();
      this.lastExit = World.exitAt(p.x, p.y);
      if (!opts.silentLabel) UI.showRoom(L.name);
      window.Sound && Sound.ambience && Sound.ambience(roomId, World.light.mode);
      if (!opts.instant) await Engine.fade(0, opts.fadeIn == null ? 0.45 : opts.fadeIn);
      else Engine.fadeAlpha = 0;
      this.transitioning = false;
      return L;
    },
    async goThroughDoor(o) {
      if (DOOR_TYPES[o.type]) {
        window.Sound && Sound.sfx('door_open');
        o.state.openAmt = o.state.openAmt || 0;
        await Engine.tween(o.state, { openAmt: 1 }, 0.4, Engine.Ease.out);
      }
      const step = { up: [0, -6], down: [0, 6], left: [-8, 0], right: [8, 0] }[o.facing || 'up'] || [0, -6];
      await this.player.walkTo(o.interactionPoint.x + step[0], o.interactionPoint.y + step[1], { direct: true });
      await this.changeRoom(o.to, o.entry);
      if (o.state) o.state.openAmt = 0;
    },

    // ---------------------------------------------------------------- Interaction
    interact(o) {
      UI.clearPrompt();
      return Engine.runScript(async () => {
        await World.approach(this.player, o);
        if (window.Scenes && await Scenes.interact(o)) return;
        await this.defaultInteract(o);
      });
    },
    async defaultInteract(o) {
      if (o.to) { await this.goThroughDoor(o); return; }
      await this.player.play('inspect');
      UI.toast(o.prompt || 'Nothing unusual.');
    },
    handleExit(ex) {
      if (window.Scenes && Scenes.onExit && Scenes.onExit(ex)) return;
      if (ex.to) {
        Engine.runScript(() => this.changeRoom(ex.to, ex.entry));
      } else if (ex.blocked) {
        UI.toast(ex.blocked);
        const p = this.player, cx = ex.x + ex.width / 2;
        Engine.runScript(() => p.walkTo(p.x + (cx < World.layout.width / 2 ? 14 : -14), p.y, { direct: true }));
      }
    },

    canControl() {
      return this.mode === 'play' && !this.transitioning && !Engine.inScript && !UI.busy && this.player.controllable &&
        !(window.Debug && Debug.editing) && !(window.Menus && Menus.blocking) &&
        !(window.Investigation && Investigation.active) && !(window.Album && Album.active);
    },

    clickableAt(wx, wy) {
      if (!World.layout) return null;
      const hits = [];
      for (const o of World.objects) {
        if (!World.isEnabled(o) || !o.interactionPoint) continue;
        const b = o.bbox;
        const pad = o.layer === 'zone' ? 6 : 3;
        if (b && wx >= b.x - pad && wx <= b.x + b.width + pad && wy >= b.y - pad && wy <= b.y + b.height + pad) {
          hits.push(o);
        } else if (Math.hypot(wx - o.interactionPoint.x, wy - o.interactionPoint.y) <= 10) {
          hits.push(o);
        }
      }
      if (hits.length) {
        hits.sort((a, b) => (b.sortY || 0) - (a.sortY || 0));
        return hits[0];
      }
      for (const ch of World.chars) {
        if (!ch.visible || ch === this.player) continue;
        if (Math.abs(wx - ch.x) <= 10 && wy >= ch.y - 34 && wy <= ch.y + 3) {
          const talk = World.objects.find(o => World.isEnabled(o) && o.interactionPoint &&
            Math.hypot(o.interactionPoint.x - ch.x, o.interactionPoint.y - ch.y) <= 28 &&
            (o.id.includes('talk') || o.id.includes(ch.id)));
          if (talk) return talk;
        }
      }
      return null;
    },
    updateCursor() {
      if (!Engine.canvas) return;
      if (UI.busy) {
        Engine.canvas.style.cursor = 'pointer';
        return;
      }
      if (!this.canControl() || !Input.mouse.inside || (window.Debug && Debug.on)) {
        Engine.canvas.style.cursor = 'default';
        return;
      }
      const m = Input.mouse;
      if (UI.prompt && UI.promptObj && m.y >= 154 && m.y <= 178 && m.x >= 40 && m.x <= 280) {
        Engine.canvas.style.cursor = 'pointer';
        return;
      }
      const w = Camera.toWorld(m.x, m.y);
      Engine.canvas.style.cursor = this.clickableAt(w.x, w.y) ? 'pointer' : 'default';
    },

    // ---------------------------------------------------------------- Frame
    update(dt, realDt) {
      if (this.mode === 'play' || this.mode === 'cutscene') {
        if (this.canControl()) this.updatePlayer(dt);
        else if (!Engine.inScript && this.player.path == null) this.player.moving = false;
        if (!this.canControl()) UI.clearPrompt();
        World.update(dt);
        Camera.update(dt);
        if (window.Scenes && Scenes.update) Scenes.update(dt);
      }
      UI.update(dt);
      this.updateCursor();
      if (this.canControl()) {
        this.saveClock += dt;
        if (this.saveClock >= 10) { this.saveClock = 0; window.Save && Save.write(); }
      }
      window.Investigation && Investigation.update && Investigation.update(realDt);
      window.Menus && Menus.update && Menus.update(realDt);
      window.Debug && Debug.update(realDt);
    },
    updatePlayer(dt) {
      const p = this.player;
      const ax = Input.axis();
      p.running = Input.down('run');
      if (ax.x || ax.y) {
        if (p.state === 'sitting') { Engine.runScript(() => p.stand()); return; }
        if (p.path) { p.path = null; p.pathResolve = null; }
        const len = Math.hypot(ax.x, ax.y);
        const sp = (p.running ? p.runSpeed : p.walkSpeed) * dt;
        p.turnTo(Characters.dominantDir(ax.x, ax.y, p.dir));
        const moved = World.tryMove(p, ax.x / len * sp, ax.y / len * sp);
        p.moving = moved > 0.01;
        if (p.moving) p.advancePhase(moved);
      } else if (!p.path || !p.path.length) {
        p.moving = false;
      }

      const ex = World.exitAt(p.x, p.y);
      if (ex && ex !== this.lastExit) { this.lastExit = ex; this.handleExit(ex); return; }
      if (!ex) this.lastExit = null;

      const o = World.nearestInteractable(p);
      if (o) UI.setPrompt(World.promptFor(o), o); else UI.clearPrompt();
      // Head turns toward nearby points of interest.
      const near = o || this.nearbyInterest(p);
      p.lookTarget = near ? { x: near.layer === 'zone' ? near.interactionPoint.x : near.x, y: near.bbox.y + Math.min(near.bbox.height / 2, 12) } : null;
      if (o && Input.pressed('interact')) { Input.consume('interact'); Input.consume('confirm'); this.interact(o); return; }

      if (Input.mouse.clicked && Input.mouse.inside && !(window.Debug && Debug.on)) {
        Input.mouse.clicked = false;
        if (o && Input.mouse.y >= 154 && Input.mouse.y <= 178 && Input.mouse.x >= 40 && Input.mouse.x <= 280) {
          this.interact(o);
          return;
        }
        const w = Camera.toWorld(Input.mouse.x, Input.mouse.y);
        const clickedObj = this.clickableAt(w.x, w.y);
        if (clickedObj) {
          this.interact(clickedObj);
          return;
        }
        const clickedExit = World.exitAt(w.x, w.y);
        const dest = clickedExit
          ? World.accessiblePoint({ x: clickedExit.x + clickedExit.width / 2, y: clickedExit.y + clickedExit.height / 2 }, p)
          : World.accessiblePoint(w, p);
        if (World.canStand(dest.x, dest.y, p)) {
          if (p.state === 'sitting') {
            Engine.runScript(async () => { await p.stand(); await p.walkTo(dest.x, dest.y); });
          } else {
            p.path = World.findPath(p.x, p.y, dest.x, dest.y, p);
            p.pathOpts = {};
            p.running = Input.down('run');
          }
        }
      }
    },
    nearbyInterest(p) {
      let best = null, bd = 1e9;
      for (const o of World.objects) {
        if (!o.lookAt && !(o.interactive && World.isEnabled(o))) continue;
        if (!o.interactionPoint) continue;
        const d = Math.hypot(p.x - o.interactionPoint.x, p.y - o.interactionPoint.y);
        if (d < o.interactionRadius * this.lookRange + 6 && d < bd && World.lineOpen(p.x, p.y, o.interactionPoint.x, o.interactionPoint.y)) { bd = d; best = o; }
      }
      return best;
    },

    render(ctx) {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, Engine.W, Engine.H);
      if (World.layout) World.render(ctx);
      window.Scenes && Scenes.renderWorldOverlay && Scenes.renderWorldOverlay(ctx);
      window.Debug && Debug.renderWorld(ctx);
      if (Engine.fadeAlpha > 0) {
        ctx.globalAlpha = Math.min(1, Engine.fadeAlpha);
        ctx.fillStyle = Engine.fadeColor;
        ctx.fillRect(0, 0, Engine.W, Engine.H);
        ctx.globalAlpha = 1;
      }
      UI.render(ctx);
      window.Menus && Menus.render && Menus.render(ctx);
      window.Debug && Debug.renderHUD(ctx);
    }
  };

  window.Game = Game;
  window.addEventListener('load', () => Game.init());
})();

