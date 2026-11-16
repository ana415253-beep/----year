// Characters: procedural pixel-art rendering (4 directions + turning), expressions, poses, props, movement and animation.
(function () {
  const P = PALETTE;
  const OL = P.outline;
  const DIRS = ['down', 'right', 'up', 'left'];
  const TURN_STEP = 0.065;

  const SPECIES = {
    mouse: { kind: 'mammal', legLen: 6, ear: 'mouse', tail: 'mouse', c: P.roni, ribbon: true },
    cat: { kind: 'mammal', legLen: 8, ear: 'cat', tail: 'cat', c: P.kallita, hood: true },
    seal: { kind: 'mammal', legLen: 6, ear: 'seal', tail: 'seal', c: P.seal },
    rabbit: { kind: 'mammal', legLen: 7, ear: 'rabbit', tail: 'puff', c: P.rabbit },
    bear: { kind: 'mammal', legLen: 6, ear: 'round', tail: 'none', c: P.bear },
    fox: { kind: 'mammal', legLen: 7, ear: 'fox', tail: 'fox', c: P.fox },
    dog: { kind: 'mammal', legLen: 6, ear: 'dog', tail: 'dog', c: P.dog },
    frog: { kind: 'mammal', legLen: 5, ear: 'frog', tail: 'none', c: P.frog },
    deer: { kind: 'mammal', legLen: 8, ear: 'deer', tail: 'puff', c: P.deer },
    raccoon: { kind: 'mammal', legLen: 6, ear: 'raccoon', tail: 'raccoon', c: P.raccoon },
    squirrel: { kind: 'mammal', legLen: 6, ear: 'squirrel', tail: 'squirrel', c: P.squirrel },
    hedgehog: { kind: 'mammal', legLen: 5, ear: 'round', tail: 'none', c: P.hedgehog },
    otter: { kind: 'mammal', legLen: 6, ear: 'round', tail: 'otter', c: P.otter },
    koala: { kind: 'mammal', legLen: 6, ear: 'koala', tail: 'none', c: P.koala },
    redpanda: { kind: 'mammal', legLen: 6, ear: 'cat', tail: 'redpanda', c: P.redpanda },
    badger: { kind: 'mammal', legLen: 6, ear: 'round', tail: 'puff', c: P.badger },
    panda: { kind: 'mammal', legLen: 6, ear: 'round', tail: 'puff', c: P.panda },
    lamb: { kind: 'mammal', legLen: 6, ear: 'lamb', tail: 'puff', c: P.lamb },
    capybara: { kind: 'mammal', legLen: 5, ear: 'round', tail: 'none', c: P.capybara },
    quokka: { kind: 'mammal', legLen: 6, ear: 'round', tail: 'otter', c: P.quokka },
    penguin: { kind: 'penguin', c: P.penguin },
    owl: { kind: 'owl', c: P.owl }
  };

  // Expression -> eye style, mouth style, blush, brow.
  const EXPR = {
    neutral: { eye: 'open', mouth: 'neutral' },
    happy: { eye: 'open', mouth: 'smile', blush: true },
    sleepy: { eye: 'half', mouth: 'flat' },
    curious: { eye: 'open', mouth: 'o', brow: 'up' },
    surprised: { eye: 'wide', mouth: 'bigO', ears: 'up' },
    excited: { eye: 'sparkle', mouth: 'open', blush: true },
    sad: { eye: 'open', mouth: 'frown', brow: 'sad' },
    crying: { eye: 'teary', mouth: 'frown', brow: 'sad' },
    worried: { eye: 'open', mouth: 'wavy', brow: 'sad' },
    determined: { eye: 'open', mouth: 'flat', brow: 'angry' },
    shy: { eye: 'down', mouth: 'smile', blush: true },
    tender: { eye: 'half', mouth: 'smile', blush: true },
    laughing: { eye: 'open', mouth: 'open', blush: true },
    confused: { eye: 'open', mouth: 'wavy', brow: 'up' },
    lookdown: { eye: 'down', mouth: 'neutral' },
    annoyed: { eye: 'half', mouth: 'flat', brow: 'angry' },
    embarrassed: { eye: 'down', mouth: 'smile', blush: true },
    asleep: { eye: 'closed', mouth: 'flat' },
    impatient: { eye: 'half', mouth: 'flat', brow: 'lowered' },
    shocked: { eye: 'shocked', mouth: 'o', brow: 'up', ears: 'up' },
    panicked: { eye: 'shocked', mouth: 'bigO', brow: 'sad', ears: 'up' },
    frightened: { eye: 'wide', mouth: 'wavy', brow: 'sad' },
    weak: { eye: 'half', mouth: 'frown', brow: 'sad' }
  };

  function painter(ctx, ox, oy, flip) {
    return {
      flip,
      r(x, y, w, h, c) {
        if (!c || w <= 0 || h <= 0) return;
        ctx.fillStyle = c;
        ctx.fillRect(ox + (flip ? -x - w : x), oy + y, w, h);
      },
      px(x, y, c) { this.r(x, y, 1, 1, c); },
      o(x, y, w, h, fill, ol) {
        ol = ol || OL;
        if (w <= 2 || h <= 2) { this.r(x, y, w, h, ol); return; }
        this.r(x + 1, y, w - 2, 1, ol); this.r(x + 1, y + h - 1, w - 2, 1, ol);
        this.r(x, y + 1, 1, h - 2, ol); this.r(x + w - 1, y + 1, 1, h - 2, ol);
        if (fill) this.r(x + 1, y + 1, w - 2, h - 2, fill);
      },
      // Rows of [x, w] drawn as outline with filled interior.
      rows(list, y0, fill, ol) {
        list.forEach(([x, w], i) => {
          this.r(x, y0 + i, w, 1, ol || OL);
          if (w > 2) this.r(x + 1, y0 + i, w - 2, 1, fill);
        });
      },
      // Thick polyline made of 2x2 blocks with a 1px outline.
      chain(pts, fill, ol, size) {
        const s = size || 2;
        for (const [x, y] of pts) this.r(x - 1, y - 1, s + 2, s + 2, ol || OL);
        for (const [x, y] of pts) this.r(x, y, s, s, fill);
      }
    };
  }

  // ---------------------------------------------------------------- Character
  class Character {
    constructor(id, opts) {
      this.id = id;
      this.name = opts.name || id;
      this.species = opts.species;
      this.sp = SPECIES[opts.species];
      this.child = !!opts.child;
      this.outfit = opts.outfit || null;
      this.voice = opts.voice || { base: 440, wave: 'square' };
      this.x = 0; this.y = 0;
      this.dir = 'down'; this.visDir = 'down'; this.turnQueue = []; this.turnT = 0; this.turnSquash = 0;
      this.headDir = null;
      this.state = 'idle';
      this.expression = 'neutral';
      this.carrying = [];
      this.bouquetType = 'mixed';
      this.visible = true;
      this.controllable = false;
      this.walkSpeed = opts.walkSpeed || 46;
      this.runSpeed = opts.runSpeed || 86;
      this.moving = false; this.running = false; this.phase = 0; this.lastFrame = 0;
      this.anim = null;
      this.emoteObj = null;
      this.blinkT = 1.5 + Math.random() * 3; this.blinkDur = 0;
      this.earTwitch = 0; this.earTwitchT = 3 + Math.random() * 4;
      this.t = Math.random() * 10;
      this.lookTarget = null; this.lookDX = 0; this.lookDY = 0;
      this.path = null; this.pathResolve = null; this.pathOpts = null;
      this._wanderHistory = []; this._wanderBlockedT = 0;
      this.hopY = 0; this.offX = 0; this.offY = 0;
      this.sitAmt = 0;
      this.talking = false;
      this.idleTime = 0;
      this.listening = null;
      this.foot = { w: 10, h: 4 };
      this.bagAdjustT = 3 + Math.random() * 3;
    }

    height() {
      if (this.sp.kind !== 'mammal') return 30;
      const leg = this.child ? Math.max(3, this.sp.legLen - 2) : this.sp.legLen;
      const torso = this.child ? 7 : 10;
      return leg + torso + 13 + (this.sp.ear === 'rabbit' ? 9 : this.sp.ear === 'fox' ? 5 : 4);
    }
    footRect(x, y) {
      x = x == null ? this.x : x; y = y == null ? this.y : y;
      return { x: x - this.foot.w / 2, y: y - this.foot.h, width: this.foot.w, height: this.foot.h };
    }

    setPos(x, y, dir) {
      this.x = x; this.y = y;
      if (dir) this.turnTo(dir, true);
      this.stopPath(false);
    }
    configure(spawn) {
      if (!spawn) return this;
      if (spawn.x != null) this.setPos(spawn.x, spawn.y, spawn.direction || spawn.dir);
      if (spawn.expression) this.expression = spawn.expression;
      if (spawn.state) this.state = spawn.state === 'walking' ? 'idle' : spawn.state;
      if (spawn.animation) this.state = spawn.animation === 'walking' ? 'idle' : spawn.animation;
      if (spawn.outfit) this.outfit = spawn.outfit;
      if (spawn.carrying) this.carrying = Array.isArray(spawn.carrying) ? spawn.carrying.slice() : [spawn.carrying];
      if (spawn.visible != null) this.visible = spawn.visible;
      if (spawn.controllable != null) this.controllable = spawn.controllable;
      this.sitAmt = (this.state === 'sitting' || this.state === 'typing') ? 1 : 0;
      const onSofa = window.World && World.roomId === 'living' && this.state === 'sitting' && this.y <= 148 && this.x >= 126 && this.x <= 214;
      this.sortBias = onSofa ? 12 : 0;
      this.onElevatedSeat = onSofa;
      this.visible = this.state === 'hidden' ? false : this.visible;
      this._wanderHistory = []; this._wanderBlockedT = 0;
      this.anim = null; this.emoteObj = null; this.headDir = null; this.lookTarget = null; this.offX = this.offY = this.hopY = 0;
      return this;
    }

    turnTo(d, instant) {
      if (!d) return;
      if (instant) { this.dir = d; this.visDir = d; this.turnQueue = []; return; }
      if (d === this.dir && this.turnQueue.length === 0 && this.visDir === d) return;
      this.dir = d;
      const i = DIRS.indexOf(this.visDir), j = DIRS.indexOf(d);
      const diff = (j - i + 4) % 4;
      if (diff === 0) { this.turnQueue = []; return; }
      if (diff === 2) {
        const mid = (this.visDir === 'down' || this.visDir === 'up') ? (Math.random() < 0.5 ? 'left' : 'right') : 'down';
        this.turnQueue = [mid, d];
      } else this.turnQueue = [d];
      if (this.turnT <= 0) this.turnT = TURN_STEP;
    }
    face(target) {
      let d = target;
      if (typeof target === 'object') d = dirToward(this.x, this.y, target.x, target.y);
      this.turnTo(d);
      return Engine.waitUntil(() => this.turnQueue.length === 0);
    }

    stopPath(result = false) {
      this.path = null;
      this.moving = false;
      this.running = false;
      this.pathOpts = null;
      this._wanderBlockedT = 0;
      const r = this.pathResolve;
      this.pathResolve = null;
      if (r) r(result);
    }
    walkTo(x, y, opts) {
      opts = opts || {};
      const path = opts.direct ? [{ x, y }] : World.findPath(this.x, this.y, x, y, this);
      if (this.pathResolve) this.pathResolve(false);
      this.path = path;
      this.pathOpts = opts;
      this.running = !!opts.run;
      this._wanderBlockedT = 0;
      return new Promise(res => {
        this.pathResolve = res;
      });
    }
    async walkPath(points, opts) {
      for (const pt of points) await this.walkTo(pt.x, pt.y, Object.assign({ direct: true }, opts));
    }
    pickWanderPoint(bounds, opts) {
      if (!bounds || !window.World || !World.layout) return null;
      opts = opts || {};
      const rects = Array.isArray(bounds) ? bounds : [bounds];
      const validRects = rects.filter(r => r && r.width > 0 && r.height > 0);
      if (!validRects.length) return null;

      const minDist = opts.minDist != null ? opts.minDist : 28;
      const maxDist = opts.maxDist != null ? opts.maxDist : 1e6;
      const avoidHistoryDist = opts.avoidHistoryDist != null ? opts.avoidHistoryDist : 26;
      const avoidPlayerDist = opts.avoidPlayerDist != null ? opts.avoidPlayerDist : 26;
      const margin = opts.margin != null ? opts.margin : 2;
      const player = window.Game && Game.player;
      const checkPlayer = player && player !== this && player.visible && World.chars.includes(player);
      const totalArea = validRects.reduce((acc, r) => acc + r.width * r.height, 0);

      const sampleFromRect = () => {
        let pick = validRects[0];
        if (validRects.length > 1) {
          let roll = Math.random() * totalArea;
          for (const r of validRects) {
            roll -= r.width * r.height;
            if (roll <= 0) { pick = r; break; }
          }
        }
        const pw = Math.max(0, pick.width - margin * 2);
        const ph = Math.max(0, pick.height - margin * 2);
        return {
          x: pw > 0 ? Math.round(pick.x + margin + Math.random() * pw) : Math.floor(pick.x + pick.width / 2),
          y: ph > 0 ? Math.round(pick.y + margin + Math.random() * ph) : Math.floor(pick.y + pick.height / 2)
        };
      };

      const prevDir = (() => {
        const h = this._wanderHistory;
        if (h.length < 2) return null;
        const a = h[h.length - 2], b = h[h.length - 1];
        const l = Math.hypot(b.x - a.x, b.y - a.y);
        return l > 1 ? { x: (b.x - a.x) / l, y: (b.y - a.y) / l } : null;
      })();

      const attempt = (allowHistory, reqMinDist) => {
        for (let i = 0; i < 24; i++) {
          const pt = sampleFromRect();
          const dx = pt.x - this.x, dy = pt.y - this.y;
          const dist = Math.hypot(dx, dy);
          if (dist < reqMinDist || dist > maxDist) continue;
          if (checkPlayer && Math.hypot(pt.x - player.x, pt.y - player.y) < avoidPlayerDist) continue;
          if (!World.canStand(pt.x, pt.y, this, false)) continue;
          if (!allowHistory && this._wanderHistory.length) {
            if (this._wanderHistory.some(p => Math.hypot(p.x - pt.x, p.y - pt.y) < avoidHistoryDist)) continue;
            if (prevDir && dist > 1 && (dx / dist * prevDir.x + dy / dist * prevDir.y) < -0.78) continue;
          }
          if (opts.direct) {
            if (!World.segmentClear(this.x, this.y, pt.x, pt.y, this)) continue;
            return { x: pt.x, y: pt.y, path: [{ x: pt.x, y: pt.y }] };
          }
          const path = World.findPath(this.x, this.y, pt.x, pt.y, this);
          if (!path || !path.length) continue;
          const end = path[path.length - 1];
          if (Math.hypot(end.x - pt.x, end.y - pt.y) > 10) continue;
          return { x: pt.x, y: pt.y, path };
        }
        return null;
      };

      return attempt(false, minDist) || attempt(true, minDist) || attempt(true, Math.min(10, minDist * 0.4));
    }
    wander(bounds, opts) {
      const pick = this.pickWanderPoint(bounds, opts);
      if (!pick) return Promise.resolve(false);
      this._wanderHistory.push({ x: pick.x, y: pick.y });
      if (this._wanderHistory.length > 4) this._wanderHistory.shift();
      if (this.pathResolve) this.pathResolve(false);
      this.path = pick.path;
      this.pathOpts = Object.assign({ wander: true }, opts || {});
      this.running = !!(opts && opts.run);
      this._wanderBlockedT = 0;
      return new Promise(res => {
        this.pathResolve = res;
      });
    }

    play(name, dur) {
      return new Promise(res => {
        if (this.anim && this.anim.resolve) this.anim.resolve();
        this.anim = { name, t: 0, dur: dur || ANIM_DUR[name] || 0.6, resolve: res };
      });
    }
    emote(kind, dur) { this.emoteObj = { kind, t: 0, dur: dur || 1.4 }; window.Sound && Sound.emote && Sound.emote(kind); }

    async sit(dir) {
      if (dir) await this.face(dir);
      this.state = 'sitting';
      const onSofa = window.World && World.roomId === 'living' && this.y <= 148 && this.x >= 126 && this.x <= 214;
      if (onSofa) { this.sortBias = 12; this.onElevatedSeat = true; }
      await Engine.tween(this, { sitAmt: 1 }, 0.48, Engine.Ease.out);
      window.Sound && Sound.sfx('sit');
    }
    async stand() {
      this.lookTarget = null;
      await Engine.tween(this, { sitAmt: 0 }, 0.32, Engine.Ease.out);
      this.state = 'idle';
      this.onElevatedSeat = false;
      if (World.layout && !World.canStand(this.x, this.y, this, true)) {
        const point = World.accessiblePoint({ x: this.x, y: this.y }, this);
        await this.walkTo(point.x, point.y, { direct: true });
      }
      this.sortBias = 0;
    }

    update(dt) {
      this.t += dt;
      // Turning animation through intermediate directions.
      if (this.turnQueue.length) {
        this.turnT -= dt;
        this.turnSquash = 1;
        if (this.turnT <= 0) {
          this.visDir = this.turnQueue.shift();
          this.turnT = this.turnQueue.length ? TURN_STEP : 0;
        }
      } else this.turnSquash = 0;

      // Scripted & autonomous wander path movement.
      if (this.path && this.path.length) {
        const tgt = this.path[0];
        const dx = tgt.x - this.x, dy = tgt.y - this.y;
        const dist = Math.hypot(dx, dy);
        const speed = (this.pathOpts && this.pathOpts.speed) || (this.running ? this.runSpeed : this.walkSpeed);
        const step = speed * dt;
        const nx = dist <= step ? tgt.x : this.x + dx / dist * step;
        const ny = dist <= step ? tgt.y : this.y + dy / dist * step;

        if (this.pathOpts && this.pathOpts.wander && window.World && World.layout && !World.canStand(nx, ny, this, false)) {
          this.moving = false;
          this._wanderBlockedT += dt;
          if (this._wanderBlockedT > 0.4) this.stopPath(false);
        } else {
          this._wanderBlockedT = 0;
          if (dist > 0.01) this.turnTo(dominantDir(dx, dy, this.dir));
          if (dist <= step) { this.x = tgt.x; this.y = tgt.y; this.path.shift(); this.advancePhase(dist); }
          else { this.x = nx; this.y = ny; this.advancePhase(step); }
          this.moving = true;
          if (!this.path.length) {
            const opts = this.pathOpts || {};
            this.path = null; this.moving = false; this.running = false; this.pathOpts = null;
            if (opts.face) this.turnTo(opts.face);
            const r = this.pathResolve; this.pathResolve = null; r && r(true);
          }
        }
      }

      // Blinking and ear twitches.
      this.blinkT -= dt;
      if (this.blinkT <= 0) { this.blinkDur = 0.12; this.blinkT = 2.2 + Math.random() * 3.5; }
      if (this.blinkDur > 0) this.blinkDur -= dt;
      this.earTwitchT -= dt;
      if (this.earTwitchT <= 0) { this.earTwitch = 0.15; this.earTwitchT = 3 + Math.random() * 5; }
      if (this.earTwitch > 0) this.earTwitch -= dt;

      // One-shot animation.
      if (this.anim) {
        this.anim.t += dt;
        const a = this.anim;
        if (a.name === 'hop' || a.name === 'surprised' || a.name === 'jump') {
          const k = Math.min(1, a.t / a.dur);
          this.hopY = -Math.round(Math.sin(k * Math.PI) * (a.name === 'jump' ? 6 : a.name === 'hop' ? 4 : 3));
        }
        if (a.t >= a.dur) { this.hopY = 0; const r = a.resolve; this.anim = null; r && r(); }
      }
      if (this.emoteObj) { this.emoteObj.t += dt; if (this.emoteObj.t >= this.emoteObj.dur) this.emoteObj = null; }

      // Bag adjustment while walking.
      if (this.moving && this.carrying.includes('work_bag') && !this.anim) {
        this.bagAdjustT -= dt;
        if (this.bagAdjustT <= 0) { this.bagAdjustT = 4 + Math.random() * 4; this.play('adjustBag', 0.55); }
      }

      // Look target -> head direction and pupils (head never turns more than 90 degrees from the body).
      this.headDir = null; this.lookDX = 0; this.lookDY = 0;
      if (this.lookTarget && this.state !== 'typing') {
        const hx = this.x, hy = this.y - 24;
        const dx = this.lookTarget.x - hx, dy = this.lookTarget.y - hy;
        const want = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
        const bi = DIRS.indexOf(this.visDir), wi = DIRS.indexOf(want);
        if ((wi - bi + 4) % 4 !== 2) this.headDir = want;
        this.lookDX = Math.abs(dx) > 6 ? Math.sign(dx) : 0;
        this.lookDY = dy < -30 ? -1 : dy > 20 ? 1 : 0;
      }
      if (this.moving || this.anim || this.state !== 'idle') this.idleTime = 0; else this.idleTime += dt;
    }

    advancePhase(dist) {
      const stride = this.running ? 5.5 : 4.2;
      this.phase += dist / stride;
      const f = Math.floor(this.phase) % 4;
      if (f !== this.lastFrame) {
        this.lastFrame = f;
        if ((f === 0 || f === 2) && this.visible && Characters.onStep) Characters.onStep(this);
      }
    }
    frame() { return this.moving ? Math.floor(this.phase) % 4 : 0; }

    draw(ctx) {
      if (!this.visible) return;
      const x = Math.round(this.x + this.offX), y = Math.round(this.y + this.offY);
      // Ground shadow (skip floor shadow when perched on elevated sofa cushions).
      if (!this.onElevatedSeat) {
        ctx.fillStyle = P.shadow;
        const sw = this.sp.kind === 'mammal' ? 12 : 14;
        ctx.fillRect(x - sw / 2 + 1, y - 1, sw - 2, 2);
        ctx.fillRect(x - sw / 2 + 3, y, sw - 6, 1);
      }
      drawCharacter(ctx, this, x, y + this.hopY);
      if (this.emoteObj) drawEmote(ctx, this, x, y + this.hopY - this.height() - 2);
    }
  }

  const ANIM_DUR = { reach: 0.55, hop: 0.4, surprised: 0.45, jump: 0.5, adjustBag: 0.55, nod: 0.6, cut: 1.4, wave: 1.2, clap: 1.0, stretch: 1.4, lookAround: 1.6, inspect: 0.9, shake: 0.7, bow: 0.8, give: 0.7, shiver: 0.8, flash: 0.4, eat: 1.6, eat_cake: 0.9, laugh: 1.1, unlock: 0.7, toast: 0.8, type: 1.4, hug: 1.15, kiss: 0.95 };

  function dominantDir(dx, dy, cur) {
    const ax = Math.abs(dx), ay = Math.abs(dy);
    if (ax > ay * 1.15) return dx > 0 ? 'right' : 'left';
    if (ay > ax * 1.15) return dy > 0 ? 'down' : 'up';
    const h = dx > 0 ? 'right' : 'left', v = dy > 0 ? 'down' : 'up';
    return (cur === h || cur === v) ? cur : (ax >= ay ? h : v);
  }
  function dirToward(x0, y0, x1, y1) {
    const dx = x1 - x0, dy = y1 - y0;
    return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
  }

  // ---------------------------------------------------------------- Rendering helpers
  function viewOf(dir) { return dir === 'down' ? 'front' : dir === 'up' ? 'back' : 'side'; }

  function armPose(ch) {
    const a = ch.anim ? ch.anim.name : null;
    const k = ch.anim ? ch.anim.t / ch.anim.dur : 0;
    if (a === 'hug') return 'hug';
    if (a === 'kiss') return 'chest';
    if (a === 'reach' || a === 'give' || a === 'unlock') return 'forward';
    if (a === 'wave') return 'wave';
    if (a === 'stretch') return 'up';
    if (a === 'clap') return 'clap';
    if (a === 'cut') return 'cut';
    if (a === 'eat') return 'eat';
    if (a === 'eat_cake') return 'eat_cake';
    if (a === 'type') return 'type';
    if (a === 'adjustBag') return 'strap';
    if (a === 'inspect') return k < 0.8 ? 'forward' : 'down';
    if (ch.state === 'posing') return ch.carrying.includes('camera') ? 'camera' : 'peace';
    if (ch.state === 'typing') return 'type';
    if (ch.state === 'phone' || ch.carrying.includes('phone')) return 'phone';
    if (ch.carrying.includes('bouquet') || ch.carrying.includes('album') || ch.carrying.includes('gift') || ch.carrying.includes('vase') || ch.carrying.includes('cake_plate') || ch.carrying.includes('tripod') || ch.carrying.includes('papers')) return 'chest';
    return 'down';
  }

  function faceFor(ch) {
    let e = EXPR[ch.expression] || EXPR.neutral;
    let eye = e.eye, mouth = e.mouth, blush = e.blush;
    if (ch.state === 'phone' || ch.carrying.includes('phone')) eye = eye === 'open' ? 'down' : eye;
    if (ch.anim && (ch.anim.name === 'eat' || ch.anim.name === 'eat_cake')) mouth = Math.floor(ch.t * 5) % 2 ? 'open' : 'smile';
    if (ch.anim && ch.anim.name === 'laugh') { eye = 'happy'; mouth = Math.floor(ch.t * 8) % 2 ? 'open' : 'smile'; }
    if (ch.anim && ch.anim.name === 'hug') { eye = 'happy'; mouth = 'smile'; blush = true; }
    if (ch.anim && ch.anim.name === 'kiss') { eye = 'closed'; mouth = 'o'; blush = true; }
    if (ch.blinkDur > 0 && (eye === 'open' || eye === 'wide' || eye === 'sparkle' || eye === 'teary' || eye === 'down')) eye = 'closed';
    if (ch.talking && Math.floor(ch.t * 9) % 2 === 0) mouth = (mouth === 'open' || mouth === 'bigO') ? 'o' : 'open';
    return { eye, mouth, blush, brow: e.brow, ears: e.ears };
  }

  function drawCharacter(ctx, ch, x, y) {
    if (ch.sp.kind === 'penguin') return drawPenguin(ctx, ch, x, y);
    if (ch.sp.kind === 'owl') return drawOwl(ctx, ch, x, y);
    drawMammal(ctx, ch, x, y);
  }

  // ---------------------------------------------------------------- Mammal (cat, fox, rabbit, bear)
  function drawMammal(ctx, ch, x, y) {
    const sp = ch.sp, c = sp.c;
    const of = P.outfits[ch.outfit] || P.outfits.roni_casual;
    const view = viewOf(ch.visDir);
    const flip = ch.visDir === 'left';
    const p = painter(ctx, x, y, flip);
    const f = ch.frame();
    const L = ch.child ? Math.max(3, sp.legLen - 2) : sp.legLen;
    const sit = ch.sitAmt;
    const hipY = -Math.round(L - sit * 2);
    const B = hipY - (ch.child ? 7 : 10);
    const idle = !ch.moving && !ch.anim;
    let bob = ch.moving ? (f % 2 === 1 ? -1 : 0) : 0;
    const breath = idle && Math.sin(ch.t * 2.4 + 1) > 0.55 ? 1 : 0;
    if (ch.anim && ch.anim.name === 'adjustBag') bob = ch.anim.t < 0.25 ? -1 : 0;
    let headBob = bob + breath;
    const a = ch.anim ? ch.anim.name : null, ak = ch.anim ? ch.anim.t / ch.anim.dur : 0;
    if (a === 'nod') headBob += Math.floor(ak * 4) % 2;
    if (a === 'laugh') headBob += Math.round(Math.sin(ak * Math.PI * 6));
    if (a === 'bow') headBob += ak < 0.7 ? 2 : 0;
    if (a === 'hug') headBob += 1;
    if (ch.state === 'lean') headBob += 1;
    if (ch.expression === 'sleepy' && ch.state === 'sitting') headBob += Math.sin(ch.t * 1.4) > 0.3 ? 1 : 0;
    let headX = 0;
    if (a === 'shake') headX = Math.round(Math.sin(ak * Math.PI * 6));
    if (a === 'shiver') headX = Math.round(Math.sin(ak * Math.PI * 16) * 0.6);
    if (a === 'kiss') headX += (ak > 0.15 && ak < 0.85) ? 2 : 1;
    if (a === 'hug') headX += (ak > 0.15 && ak < 0.85) ? 1 : 0;
    if (ch.state === 'lean' && view === 'side') headX += 1;
    if (ch.running && view === 'side') headX += 1;
    const squash = ch.turnSquash ? 1 : 0;
    const HT = B - 12 + headBob + squash;
    const pose = armPose(ch);
    const fc = faceFor(ch);
    let headDir = ch.headDir || ch.visDir;
    if (a === 'lookAround') headDir = ak < 0.3 ? 'left' : ak < 0.6 ? 'right' : ch.visDir;
    if (a === 'lookAround' && viewOf(headDir) === 'back') headDir = ch.visDir;
    const headView = viewOf(headDir);
    const ph = painter(ctx, x + (flip ? -headX : headX), y, headDir === 'left');
    const tailSway = Math.sin(ch.t * (ch.expression === 'excited' || ch.expression === 'happy' ? 5 : 2.2) + 0.7);

    const legColor = ch.outfit === 'roni_office' ? '#3d3848' : of.bottom;
    const legShade = ch.outfit === 'roni_office' ? '#2f2b38' : of.bottomShade;

    if (view === 'front') {
      drawTail(p, ch, 'front', B, tailSway);
      drawLegsFront(p, ch, f, hipY, sit, legColor, of.shoe);
      drawTorsoFront(p, ch, of, B, hipY, bob);
      drawPropsBehind(p, ch, 'front', B + bob);
      drawArmsFront(p, ch, of, c, B + bob, pose, f);
      drawHead(ph, ch, headView, HT, fc);
      drawPropsFront(p, ch, 'front', B + bob, pose);
    } else if (view === 'back') {
      drawPropsFront(p, ch, 'back', B + bob, pose);
      drawLegsFront(p, ch, f, hipY, sit, legColor, of.shoe, true);
      drawTorsoBack(p, ch, of, B + bob, hipY);
      drawArmsFront(p, ch, of, c, B + bob, pose, f, true);
      drawPropsBehind(p, ch, 'back', B + bob);
      drawTail(p, ch, 'back', B + bob, tailSway);
      drawHead(ph, ch, headView, HT, fc);
    } else {
      const swing = ch.moving ? [0, 2, 0, -2][f] * (ch.running ? 1.5 : 1) : 0;
      drawArmSide(p, ch, of, c, B + bob, pose, -Math.round(swing), true);
      drawTail(p, ch, 'side', B + bob, tailSway);
      drawLegsSide(p, ch, f, hipY, sit, legColor, legShade, of.shoe);
      drawTorsoSide(p, ch, of, B + bob, hipY);
      drawPropsBehind(p, ch, 'side', B + bob);
      drawHead(ph, ch, headView, HT, fc);
      drawArmSide(p, ch, of, c, B + bob, pose, Math.round(swing), false);
      drawPropsFront(p, ch, 'side', B + bob, pose);
    }
    if (ch.changing) {
      const lift = Math.round(Math.sin(ch.changeAmt * Math.PI) * 9);
      p.o(-7, B - lift, 14, 12, '#fff0dc');
      p.r(-5, B - lift + 3, 10, 6, '#d6a64d');
      p.o(-8, B - lift + 5, 3, 3, c.fur); p.o(5, B - lift + 5, 3, 3, c.fur);
    }
  }

  function drawTail(p, ch, view, B, sway) {
    const sp = ch.sp, c = sp.c;
    if (sp.tail === 'none') return;
    const s = Math.round(sway);
    if (sp.tail === 'puff') {
      if (view === 'back') p.o(-2, B + 7, 4, 4, '#fbf4ea');
      else if (view === 'side') p.o(-7, B + 6, 4, 4, '#fbf4ea');
      return;
    }
    if (sp.tail === 'seal') {
      if (view === 'back') {
        p.o(-3, B + 7, 6, 4, c.fur);
        p.r(-3, B + 10, 2, 1, c.furShade); p.r(1, B + 10, 2, 1, c.furShade);
      } else if (view === 'side') {
        p.o(-8, B + 7, 5, 3, c.fur);
        p.r(-9, B + 6, 2, 4, c.furShade);
      }
      return;
    }
    if (sp.tail === 'raccoon' || sp.tail === 'redpanda') {
      const pts = view === 'front'
        ? [[5, B + 8], [6, B + 6], [7 + s, B + 4], [7 + s, B + 2]]
        : view === 'back'
          ? [[0, B + 8], [1, B + 9], [2 + s, B + 8], [3 + s, B + 6], [3 + s, B + 4]]
          : [[-5, B + 8], [-7, B + 7], [-8, B + 5], [-8 + s, B + 3], [-7 + s, B + 1]];
      p.chain(pts, c.fur, OL, 3);
      for (let i = 1; i < pts.length; i += 2) p.r(pts[i][0], pts[i][1], 3, 2, c.tailTip);
      return;
    }
    if (sp.tail === 'otter') {
      const pts = view === 'front'
        ? [[4, B + 8], [6, B + 7], [7 + s, B + 5]]
        : view === 'back'
          ? [[-1, B + 8], [0, B + 10], [1 + s, B + 10], [2 + s, B + 9]]
          : [[-4, B + 8], [-7, B + 8], [-9 + s, B + 7], [-10 + s, B + 5]];
      p.chain(pts, c.fur, OL, 2);
      const t = pts[pts.length - 1];
      p.r(t[0], t[1], 2, 2, c.tailTip);
      return;
    }
    if (sp.tail === 'squirrel') {
      const pts = view === 'front'
        ? [[5, B + 8], [7, B + 5], [7 + s, B + 1], [6 + s, B - 2], [5 + s, B - 4]]
        : view === 'back'
          ? [[0, B + 8], [2, B + 6], [3 + s, B + 2], [3 + s, B - 2], [2 + s, B - 5]]
          : [[-5, B + 8], [-8, B + 6], [-9, B + 2], [-9 + s, B - 2], [-7 + s, B - 4]];
      p.chain(pts, c.fur, OL, 3);
      p.r(pts[pts.length - 1][0], pts[pts.length - 1][1], 3, 2, c.tailTip);
      return;
    }
    if (sp.tail === 'dog') {
      const pts = view === 'front'
        ? [[5, B + 8], [6, B + 6], [6 + s, B + 4]]
        : view === 'back'
          ? [[0, B + 8], [1 + s, B + 6], [2 + s, B + 5]]
          : [[-5, B + 8], [-7, B + 6], [-7 + s, B + 4]];
      p.chain(pts, c.fur, OL, 2);
      const t = pts[pts.length - 1];
      p.r(t[0], t[1], 2, 2, c.tailTip);
      return;
    }
    const fox = sp.tail === 'fox';
    const col = sp.tail === 'mouse' ? c.tail : c.fur, tip = sp.tail === 'mouse' ? c.tail : fox ? c.tailTip : c.furShade;
    if (view === 'front') {
      const pts = fox
        ? [[5, B + 9], [6, B + 7], [7, B + 5], [7 + s, B + 3], [7 + s, B + 1]]
        : [[5, B + 8], [6, B + 6], [6 + s, B + 4], [6 + s, B + 2]];
      p.chain(pts, col, OL, fox ? 3 : 2);
      const t = pts[pts.length - 1];
      p.r(t[0], t[1], fox ? 3 : 2, 2, tip);
    } else if (view === 'back') {
      const pts = fox
        ? [[-1, B + 8], [0, B + 10], [1 + s, B + 11], [3 + s, B + 10], [4 + s, B + 8], [4 + s, B + 6]]
        : [[0, B + 8], [1, B + 10], [2 + s, B + 10], [3 + s, B + 8], [3 + s, B + 6]];
      p.chain(pts, col, OL, fox ? 3 : 2);
      const t = pts[pts.length - 1];
      p.r(t[0], t[1], fox ? 3 : 2, 2, tip);
    } else {
      const pts = fox
        ? [[-5, B + 8], [-7, B + 7], [-9, B + 6], [-10 + s, B + 4], [-10 + s, B + 2]]
        : [[-5, B + 8], [-7, B + 7], [-8, B + 5], [-8 + s, B + 3], [-7 + s, B + 1]];
      p.chain(pts, col, OL, fox ? 3 : 2);
      const t = pts[pts.length - 1];
      p.r(t[0], t[1], fox ? 3 : 2, 2, tip);
    }
  }

  function drawLegsFront(p, ch, f, hipY, sit, col, shoe, back) {
    if (sit > 0.5) {
      // Seated: short bent legs, feet slightly apart.
      if (back) return;
      p.r(-4, hipY, 3, -hipY, OL); p.r(-3, hipY, 1, -hipY - 1, col);
      p.r(1, hipY, 3, -hipY, OL); p.r(2, hipY, 1, -hipY - 1, col);
      p.r(-5, -2, 4, 2, shoe); p.r(-5, -1, 4, 1, OL);
      p.r(1, -2, 4, 2, shoe); p.r(1, -1, 4, 1, OL);
      return;
    }
    const liftL = ch.moving && f === 1 ? (ch.running ? 2 : 1) : 0;
    const liftR = ch.moving && f === 3 ? (ch.running ? 2 : 1) : 0;
    const leg = (x, lift) => {
      const h = -hipY - lift;
      p.r(x, hipY, 3, h, OL);
      p.r(x + 1, hipY, 1, h - 1, col);
      p.r(x, -lift - 2, 3, 2, shoe);
      p.r(x, -lift - 1, 3, 1, OL);
    };
    leg(-4, liftL); leg(1, liftR);
  }

  function drawLegsSide(p, ch, f, hipY, sit, col, shade, shoe) {
    if (sit > 0.5) {
      // Thighs forward, shins down.
      p.o(-3, hipY - 2, 9, 4, col);
      p.r(-2, hipY + 1, 7, 1, shade);
      p.r(4, hipY + 1, 3, -hipY - 1, OL); p.r(5, hipY + 1, 1, -hipY - 2, col);
      p.r(4, -2, 5, 2, shoe); p.r(4, -1, 5, 1, OL);
      return;
    }
    const k = ch.running ? 3 : 2;
    const offA = ch.moving ? [-k, 0, k, 0][f] : 0;
    const offB = -offA;
    const liftA = ch.moving && f === 1 ? 1 : 0, liftB = ch.moving && f === 3 ? 1 : 0;
    const leg = (dx, lift, c) => {
      const h = -hipY - lift;
      p.r(-2 + dx, hipY, 3, h, OL);
      p.r(-1 + dx, hipY, 1, h - 1, c);
      p.r(-2 + dx, -lift - 2, 4, 2, shoe);
      p.r(-2 + dx, -lift - 1, 4, 1, OL);
    };
    leg(offB, liftB, shade);
    leg(offA, liftA, col);
  }

  function drawTorsoFront(p, ch, of, B, hipY, bob) {
    const top = B + bob;
    p.o(-5, top, 10, hipY - top + 1, of.top);
    p.r(-4, top + 1, 8, 1, of.topLight);
    if (of.formal) {
      p.r(-2, top + 1, 4, 5, of.shirt);
      p.r(Math.round(Math.sin(ch.phase) * (ch.moving ? 1 : 0)), top + 2, 1, 4, of.tie);
      p.px(-2, top + 1, of.topLight); p.px(1, top + 1, of.topLight);
      p.px(-4, top + 4, ch.id === 'roni' ? '#d7c27a' : '#e8e4dc');
      p.r(-4, hipY - 3, 8, 3, of.bottom);
      p.r(-4, hipY - 3, 8, 1, of.bottomShade);
    } else if (ch.outfit === 'roni_casual') {
      p.r(-2, top + 1, 4, 5, of.shirt);
      p.r(0, top + 3, 1, 5, of.topShade); p.px(1, top + 4, '#fff0dc');
      p.r(-4, hipY - 3, 8, 1, of.bottomShade);
      p.r(-4, hipY - 2, 8, 2, of.bottom);
      p.px(-1, hipY - 2, '#d6a64d');
    } else if (ch.outfit === 'kallita_casual' || ch.outfit === 'kei_casual') {
      p.r(-4, top + 1, 8, 1, of.topShade); p.r(-1, top + 1, 2, 2, of.shirt);
      p.px(-2, top + 2, of.string); p.px(-2, top + 3, of.string);
      p.px(1, top + 2, of.string); p.px(1, top + 3, of.string);
      p.r(-3, top + 6, 6, 2, of.topShade);
      p.r(-4, hipY - 1, 8, 1, of.bottom);
    } else {
      p.r(-4, hipY - 2, 8, 2, of.bottom);
      if (of.scarf) { p.r(-4, top + 1, 8, 2, of.scarf); p.r(1, top + 3, 2, 3, of.scarf); }
      else { p.px(-1, top + 3, of.topShade); p.px(-1, top + 6, of.topShade); }
    }
  }

  function drawTorsoBack(p, ch, of, B, hipY) {
    p.o(-5, B, 10, hipY - B + 1, of.top);
    p.r(-4, B + 1, 8, 1, of.topShade);
    if (ch.sp.hood) { p.o(-4, B - 1, 8, 4, of.topShade); p.r(-3, B, 6, 1, of.top); }
    if (of.formal) { p.r(-4, hipY - 3, 8, 3, of.bottom); p.r(0, B + 2, 1, 5, of.topShade); }
    else if (ch.outfit === 'roni_casual') { p.r(-4, hipY - 3, 8, 1, of.topShade); p.r(-4, hipY - 2, 8, 2, of.bottom); }
    else p.r(-4, hipY - 1, 8, 1, of.bottom);
    if (of.scarf) p.r(-4, B + 1, 8, 2, of.scarf);
  }

  function drawTorsoSide(p, ch, of, B, hipY) {
    p.o(-4, B, 8, hipY - B + 1, of.top);
    p.r(-3, B + 1, 6, 1, of.topLight);
    if (of.formal) {
      p.r(1, B + 1, 2, 3, of.shirt);
      p.r(-3, hipY - 3, 7, 3, of.bottom); p.r(-4, hipY - 1, 1, 1, OL);
    } else if (ch.outfit === 'roni_casual') {
      p.r(1, B + 1, 2, 5, of.shirt); p.px(2, B + 6, of.topLight);
      p.r(-3, hipY - 3, 6, 1, of.bottomShade); p.r(-3, hipY - 2, 6, 2, of.bottom);
    } else if (ch.outfit === 'kallita_casual' || ch.outfit === 'kei_casual') {
      if (ch.sp.hood) p.o(-5, B - 1, 4, 4, of.topShade);
      p.px(2, B + 2, of.string); p.px(2, B + 3, of.string);
      p.r(0, B + 6, 3, 2, of.topShade); p.r(-3, hipY - 1, 6, 1, of.bottom);
    } else {
      p.r(-3, hipY - 2, 6, 2, of.bottom);
      if (of.scarf) { p.r(-3, B + 1, 7, 2, of.scarf); p.r(-5, B + 2, 2, 4, of.scarf); }
    }
  }

  function drawArmsFront(p, ch, of, c, B, pose, f, back) {
    const swing = ch.moving ? [0, 1, 0, -1][f] : 0;
    const ak = ch.anim ? ch.anim.t / ch.anim.dur : 0;
    const arm = (side, mode) => {
      const s = side; // -1 left, +1 right (viewer)
      const ax = s < 0 ? -7 : 5;
      const paw = c.fur;
      if (mode === 'down') {
        const dy = s < 0 ? swing : -swing;
        p.o(ax, B + 1 + dy, 3, 7, of.top);
        p.o(ax, B + 7 + dy, 3, 3, paw);
      } else if (mode === 'up') {
        p.o(ax + s, B - 6, 3, 8, of.top);
        p.o(ax + s, B - 8, 3, 3, paw);
      } else if (mode === 'wave') {
        const wx = Math.round(Math.sin(ak * Math.PI * 6)) * s;
        p.o(ax + s + wx, B - 5, 3, 7, of.top);
        p.o(ax + s + wx, B - 7, 3, 3, paw);
      } else if (mode === 'forward') {
        p.o(ax - s, B + 1, 3, 5, of.top);
        if (!back) p.o(s < 0 ? -5 : 2, B + 5, 3, 3, paw);
      } else if (mode === 'chest' || mode === 'phone' || mode === 'clap' || mode === 'strap') {
        const cl = mode === 'clap' ? Math.round(Math.abs(Math.sin(ak * Math.PI * 5))) * s : 0;
        p.o(ax, B + 1, 3, 5, of.top);
        p.r(s < 0 ? -5 : 2, B + 5, 3, 2, of.top);
        if (!back) p.o((s < 0 ? -3 : 0) + cl, B + 4, 3, 3, paw);
      } else if (mode === 'type') {
        const ty = Math.floor(ch.t * 8 + (s > 0 ? 1 : 0)) % 2;
        p.o(ax - s, B + 1, 3, 5, of.top);
        p.o(ax - s, B + 5 - ty, 3, 3, paw);
      } else if (mode === 'peace' || mode === 'camera') {
        p.o(ax + s, B - 5, 3, 7, of.top);
        p.o(ax + s, B - 7, 3, 3, paw);
        if (mode === 'peace') { p.px(ax + s, B - 9, OL); p.px(ax + s + 2, B - 9, OL); }
      } else if (mode === 'cut') {
        const up = Math.floor(ak * 6) % 2;
        p.o(ax - s, B + 1 - up * 3, 3, 6, of.top);
        p.o(s < 0 ? -5 : 2, B + 5 - up * 3, 3, 3, paw);
        if (s > 0) { p.r(3, B + 1 - up * 3, 1, 5, P.props.knife); p.px(3, B + 6 - up * 3, '#5b3a26'); }
      } else if (mode === 'hug') {
        p.o(ax - s, B + 2, 4, 4, of.top);
        if (!back) p.o(s < 0 ? -4 : 1, B + 3, 3, 3, paw);
      } else if (mode === 'eat' || mode === 'eat_cake') {
        const bite = Math.floor(ak * 4) % 2;
        p.o(ax, B + 1, 3, 5, of.top);
        p.o(s < 0 ? -5 : 2, B + 1 - bite * 2, 3, 3, paw);
        if (s > 0 && !back) {
          if (mode === 'eat') {
            p.r(1, B - 2 - bite * 2, 3, 1, P.props.pizzaCrust);
            p.r(1, B - 1 - bite * 2, 3, 2, P.props.pizzaCheese);
            p.px(2, B - 1 - bite * 2, P.props.pizzaSauce);
          } else {
            p.r(2, B - 1 - bite * 2, 2, 2, '#f6e6d6');
            p.px(2, B - 1 - bite * 2, '#f39bb6');
          }
        }
      }
    };
    let left = 'down', right = 'down';
    if (pose === 'forward' || pose === 'hug') { left = right = pose; }
    else if (pose === 'up') { left = right = 'up'; }
    else if (pose === 'wave') { right = 'wave'; }
    else if (pose === 'chest' || pose === 'phone' || pose === 'clap') { left = right = pose; }
    else if (pose === 'strap') { right = 'strap'; }
    else if (pose === 'type') { left = right = 'type'; }
    else if (pose === 'peace') { right = 'peace'; }
    else if (pose === 'camera') { right = 'camera'; }
    else if (pose === 'cut') { right = 'cut'; }
    else if (pose === 'eat' || pose === 'eat_cake') { right = pose; }
    if (back) { const t = left; left = right; right = t; }
    arm(-1, left); arm(1, right);
  }

  function drawArmSide(p, ch, of, c, B, pose, swing, far) {
    const top = far ? of.topShade : of.top;
    const paw = far ? c.furShade : c.fur;
    const ak = ch.anim ? ch.anim.t / ch.anim.dur : 0;
    if (far) {
      if (pose === 'down' || pose === 'strap' || pose === 'wave') {
        p.o(-1 + swing, B + 1, 3, 7, top); p.o(-1 + swing, B + 7, 3, 3, paw);
      } else if (pose === 'hug') {
        p.o(1, B + 1, 7, 3, top); p.o(7, B + 1, 3, 3, paw);
      } else if (pose === 'chest' || pose === 'phone' || pose === 'type' || pose === 'clap') {
        p.o(1, B + 3, 4, 3, top); p.o(4, B + 3, 3, 3, paw);
      }
      return;
    }
    switch (pose) {
      case 'hug': p.o(0, B + 1, 7, 3, top); p.o(6, B + 1, 3, 3, paw); break;
      case 'forward': p.o(0, B + 2, 7, 3, top); p.o(6, B + 2, 3, 3, paw); break;
      case 'up': p.o(1, B - 5, 3, 8, top); p.o(1, B - 7, 3, 3, paw); break;
      case 'camera': p.o(2, B - 2, 6, 3, top); p.o(7, B - 4, 3, 3, paw); break;
      case 'peace': p.o(2, B - 3, 3, 6, top); p.o(2, B - 5, 3, 3, paw); p.px(2, B - 7, OL); p.px(4, B - 7, OL); break;
      case 'wave': { const wx = Math.round(Math.sin(ak * Math.PI * 6)); p.o(1 + wx, B - 5, 3, 8, top); p.o(1 + wx, B - 7, 3, 3, paw); break; }
      case 'chest': case 'phone': case 'clap': p.o(0, B + 3, 5, 3, top); p.o(4, B + 3, 3, 3, paw); break;
      case 'strap': p.o(0, B, 3, 5, top); p.o(1, B, 3, 3, paw); break;
      case 'type': { const ty = Math.floor(ch.t * 8) % 2; p.o(0, B + 4, 5, 3, top); p.o(4, B + 4 - ty, 3, 3, paw); break; }
      case 'cut': { const up = Math.floor(ak * 6) % 2; p.o(0, B + 2 - up * 3, 5, 3, top); p.o(4, B + 2 - up * 3, 3, 3, paw); p.r(6, B - 2 - up * 3, 1, 5, P.props.knife); break; }
      case 'eat': {
        const bite = Math.floor(ak * 4) % 2;
        p.o(0, B + 2 - bite * 2, 5, 3, top);
        p.o(4, B + 1 - bite * 2, 3, 3, paw);
        p.r(5, B - 1 - bite * 2, 3, 1, P.props.pizzaCrust);
        p.r(5, B - bite * 2, 3, 2, P.props.pizzaCheese);
        p.px(6, B - bite * 2, P.props.pizzaSauce);
        break;
      }
      case 'eat_cake': {
        const bite = Math.floor(ak * 4) % 2;
        p.o(0, B + 2 - bite * 2, 5, 3, top);
        p.o(4, B + 1 - bite * 2, 3, 3, paw);
        p.r(5, B - bite * 2, 2, 2, '#f6e6d6');
        p.px(5, B - bite * 2, '#f39bb6');
        break;
      }
      default: p.o(-1 + swing, B + 1, 3, 7, top); p.o(-1 + swing, B + 7, 3, 3, paw);
    }
  }

  function drawEars(p, ch, view, HT, fc) {
    const sp = ch.sp, c = sp.c;
    const up = fc.ears === 'up' ? -1 : 0;
    const tw = ch.earTwitch > 0 ? 1 : 0;
    const inner = view === 'back' ? c.furShade : c.earInner;
    if (sp.ear === 'cat') {
      const ear = (pp, dy) => {
        pp.rows([[-6, 1], [-7, 3], [-7, 4], [-7, 5]], HT - 4 + dy, c.fur);
        pp.px(-6, HT - 2 + dy, inner); pp.r(-6, HT - 1 + dy, 2, 1, inner);
      };
      if (view === 'side') {
        p.rows([[-4, 1], [-5, 3], [-5, 4], [-5, 5]], HT - 4 + up, c.furShade);
        p.rows([[0, 1], [-1, 3], [-1, 4], [-1, 5]], HT - 4 + up + tw, c.fur);
        p.px(0, HT - 2 + up + tw, c.earInner);
      } else {
        ear(p, up + tw);
        ear(mirrorOf(p), up);
      }
    } else if (sp.ear === 'fox') {
      const ear = (pp, dy) => {
        pp.rows([[-7, 1], [-7, 2], [-8, 3], [-8, 4], [-8, 5]], HT - 5 + dy, c.fur);
        pp.r(-7, HT - 5 + dy, 1, 2, c.earTip);
        pp.px(-7, HT - 2 + dy, inner); pp.r(-7, HT - 1 + dy, 2, 1, inner);
      };
      if (view === 'side') {
        p.rows([[-4, 1], [-4, 2], [-5, 3], [-5, 4], [-5, 5]], HT - 5 + up, c.furShade);
        p.rows([[0, 1], [0, 2], [-1, 3], [-1, 4], [-1, 5]], HT - 5 + up + tw, c.fur);
        p.r(0, HT - 5 + up + tw, 1, 2, c.earTip);
        p.px(0, HT - 2 + up + tw, c.earInner);
      } else {
        ear(p, up + tw);
        ear(mirrorOf(p), up);
      }
    } else if (sp.ear === 'rabbit') {
      const ear = (pp, dy) => { pp.o(-5, HT - 9 + dy, 4, 10, c.fur); pp.r(-4, HT - 8 + dy, 2, 7, inner); };
      if (view === 'side') { p.o(-3, HT - 9 + up, 4, 10, c.fur); p.r(-2, HT - 8 + up, 2, 7, c.earInner); }
      else { ear(p, up + tw); ear(mirrorOf(p), up); }
    } else if (sp.ear === 'mouse') {
      const ear = (pp, dy) => {
        pp.rows([[-7, 3], [-8, 5], [-8, 5], [-8, 5], [-7, 3]], HT - 3 + dy, c.fur);
        pp.r(-7, HT - 1 + dy, 3, 2, inner);
      };
      if (view === 'side') { p.o(-5, HT - 3 + tw, 6, 6, c.fur); p.r(-4, HT - 1 + tw, 3, 3, inner); }
      else { ear(p, up + tw); ear(mirrorOf(p), up); }
    } else if (sp.ear === 'round') {
      const earCol = ch.species === 'panda' ? c.mask : c.fur;
      if (view === 'side') p.o(-3, HT - 2, 4, 4, earCol);
      else { p.o(-7, HT - 2, 4, 4, earCol); p.px(-6, HT - 1, inner); const m = mirrorOf(p); m.o(-7, HT - 2, 4, 4, earCol); m.px(-6, HT - 1, inner); }
    } else if (sp.ear === 'lamb') {
      if (view === 'side') {
        p.o(-3, HT + 2 + up, 5, 6, c.muzzle); p.r(-2, HT + 3 + up, 3, 4, inner);
      } else {
        p.o(-9, HT + 2 + up + tw, 4, 6, c.muzzle); p.r(-8, HT + 3 + up + tw, 2, 4, inner);
        p.o(5, HT + 2 + up, 4, 6, c.muzzle); p.r(6, HT + 3 + up, 2, 4, inner);
      }
    } else if (sp.ear === 'seal') {
      if (view === 'side') p.px(-2, HT + 5, c.furShade);
      else { p.px(-7, HT + 5, c.furShade); p.px(6, HT + 5, c.furShade); }
    } else if (sp.ear === 'dog') {
      if (view === 'side') {
        p.o(-3, HT + 2 + up, 5, 7, c.furShade); p.r(-2, HT + 3 + up, 3, 5, c.fur);
      } else {
        p.o(-9, HT + 2 + up + tw, 4, 7, c.furShade); p.r(-8, HT + 3 + up + tw, 2, 5, c.fur);
        p.o(5, HT + 2 + up, 4, 7, c.furShade); p.r(6, HT + 3 + up, 2, 5, c.fur);
      }
    } else if (sp.ear === 'frog') {
      if (view === 'side') { p.o(0, HT - 3 + up, 4, 4, c.fur); p.r(1, HT - 2 + up, 2, 2, c.furLight); }
      else { p.o(-5, HT - 3 + up, 4, 4, c.fur); p.o(1, HT - 3 + up, 4, 4, c.fur); }
    } else if (sp.ear === 'deer') {
      const ear = (pp, dy) => {
        pp.o(-8, HT - 4 + dy, 5, 4, c.fur);
        pp.r(-7, HT - 3 + dy, 3, 2, inner);
      };
      if (view === 'side') {
        p.o(-5, HT - 4 + up, 5, 4, c.furShade);
        p.o(0, HT - 5 + up + tw, 5, 4, c.fur);
        p.r(1, HT - 4 + up + tw, 2, 2, c.earInner);
      } else { ear(p, up + tw); ear(mirrorOf(p), up); }
    } else if (sp.ear === 'koala') {
      const ear = (pp, dy) => {
        pp.rows([[-8, 4], [-9, 5], [-9, 5], [-9, 5], [-8, 4]], HT + dy, c.fur);
        pp.r(-8, HT + 1 + dy, 3, 3, inner);
      };
      if (view === 'side') {
        p.o(-5, HT + up, 5, 5, c.fur);
        p.r(-4, HT + 1 + up, 3, 3, c.earInner);
      } else { ear(p, up + tw); ear(mirrorOf(p), up); }
    } else if (sp.ear === 'raccoon' || sp.ear === 'squirrel') {
      const tall = sp.ear === 'squirrel';
      const ear = (pp, dy) => {
        if (tall) {
          // Tall tufted squirrel ears cleanly anchored to head contour at HT..HT+1
          pp.rows([[-6, 2], [-7, 3], [-7, 4], [-7, 4], [-6, 4]], HT - 4 + dy, c.fur);
          pp.r(-6, HT - 2 + dy, 2, 2, inner);
          pp.r(-6, HT - 5 + dy, 2, 1, c.furShade);
        } else {
          pp.rows([[-6, 2], [-7, 3], [-7, 4], [-7, 4]], HT - 3 + dy, c.fur);
          pp.r(-6, HT - 1 + dy, 2, 2, inner);
        }
      };
      if (view === 'side') {
        if (tall) {
          p.rows([[-3, 2], [-4, 3], [-4, 4], [-4, 4], [-3, 4]], HT - 4 + up, c.furShade);
          p.r(-3, HT - 5 + up, 2, 1, c.furShade);
          p.rows([[0, 2], [-1, 3], [-1, 4], [-1, 4], [-1, 4]], HT - 4 + up + tw, c.fur);
          p.r(0, HT - 2 + up + tw, 1, 2, c.earInner);
          p.r(0, HT - 5 + up + tw, 2, 1, c.furShade);
        } else {
          p.rows([[-3, 2], [-4, 3], [-4, 4], [-4, 4]], HT - 3 + up, c.furShade);
          p.rows([[0, 2], [-1, 3], [-1, 4], [-1, 4]], HT - 3 + up + tw, c.fur);
          p.r(0, HT - 1 + up + tw, 1, 2, c.earInner);
        }
      } else { ear(p, up + tw); ear(mirrorOf(p), up); }
    }
  }

  // Painter mirrored around the same centre (for symmetric parts).
  function mirrorOf(p) {
    return {
      r(x, y, w, h, c) { p.r(-x - w, y, w, h, c); },
      px(x, y, c) { p.r(-x - 1, y, 1, 1, c); },
      o(x, y, w, h, f, ol) { p.o(-x - w, y, w, h, f, ol); },
      rows(list, y0, fill, ol) { p.rows(list.map(([x, w]) => [-x - w, w]), y0, fill, ol); }
    };
  }

  function headShape(p, x0, HT, w, fill) {
    const rows = [[x0 + 2, w - 4], [x0 + 1, w - 2]];
    for (let i = 0; i < 9; i++) rows.push([x0, w]);
    rows.push([x0 + 1, w - 2], [x0 + 2, w - 4]);
    p.rows(rows, HT, fill);
  }

  function drawHead(p, ch, view, HT, fc) {
    const sp = ch.sp, c = sp.c;
    drawEars(p, ch, view, HT, fc);
    if (view === 'front') {
      headShape(p, -7, HT, 14, c.fur);
      p.r(-4, HT + 1, 7, 1, c.furLight || c.fur);
      p.r(-6, HT + 10, 2, 1, c.furShade); p.r(4, HT + 10, 2, 1, c.furShade);
      p.px(-5, HT + 11, c.furShade); p.px(4, HT + 11, c.furShade);
      // Muzzle.
      p.r(-3, HT + 7, 6, 5, c.muzzle); p.r(-2, HT + 12 - 1, 4, 1, c.muzzle);
      if (ch.species === 'fox') { p.r(-6, HT + 8, 3, 3, c.muzzle); p.r(3, HT + 8, 3, 3, c.muzzle); }
      if (sp.bangs) { p.r(-2, HT + 1, 1, 2, c.hair); p.r(0, HT + 1, 1, 3, c.hair); p.r(2, HT + 1, 1, 2, c.hair); }
      if (ch.species === 'fox') { p.r(-1, HT + 1, 2, 2, c.furShade); }
      if (ch.species === 'deer') { p.px(-4, HT + 2, c.muzzle); p.px(3, HT + 2, c.muzzle); p.px(0, HT + 1, c.muzzle); }
      if (ch.species === 'raccoon' || ch.species === 'redpanda') { p.r(-6, HT + 4, 5, 3, c.mask); p.r(1, HT + 4, 5, 3, c.mask); }
      if (ch.species === 'panda') { p.r(-5, HT + 4, 4, 3, c.mask); p.r(1, HT + 4, 4, 3, c.mask); }
      if (ch.species === 'badger') {
        p.r(-5, HT + 1, 2, 8, c.stripe); p.r(3, HT + 1, 2, 8, c.stripe);
        p.r(-6, HT + 4, 3, 3, c.mask); p.r(3, HT + 4, 3, 3, c.mask);
      }
      if (ch.species === 'hedgehog') {
        p.r(-6, HT - 1, 12, 2, c.quills); p.px(-4, HT - 2, c.quills); p.px(0, HT - 2, c.quills); p.px(3, HT - 2, c.quills);
        p.px(-3, HT - 1, c.quillTip); p.px(2, HT - 1, c.quillTip);
      }
      drawEyesFront(p, ch, HT, fc);
      p.r(-1, HT + 8, 2, 1, c.nose);
      if (ch.species === 'koala') p.r(-1, HT + 7, 2, 2, c.nose);
      drawMouthFront(p, HT, fc.mouth);
      if (ch.species === 'mouse') {
        p.r(-1, HT + 10, 2, 1, '#fff0dc');
        p.r(-7, HT + 8, 3, 1, '#aaa1ab'); p.r(4, HT + 8, 3, 1, '#aaa1ab');
      } else if (ch.species === 'seal') {
        p.r(-4, HT + 8, 1, 2, c.muzzle); p.r(3, HT + 8, 1, 2, c.muzzle);
        p.r(-7, HT + 8, 3, 1, '#6a7482'); p.r(4, HT + 8, 3, 1, '#6a7482');
        p.r(-7, HT + 10, 2, 1, '#6a7482'); p.r(5, HT + 10, 2, 1, '#6a7482');
      }
      if (fc.blush || ch.species === 'frog') { p.r(-6, HT + 8, 2, 1, '#f09aac'); p.r(4, HT + 8, 2, 1, '#f09aac'); }
      if (sp.ribbon) drawRibbon(p, 3, HT - 2);
      if (sp.earring) p.px(6, HT + 1, c.earring);
    } else if (view === 'back') {
      headShape(p, -7, HT, 14, c.fur);
      p.r(-4, HT + 1, 7, 2, c.furLight || c.fur);
      p.r(-6, HT + 9, 12, 2, c.furShade); p.r(-5, HT + 11, 10, 1, c.furShade);
      if (ch.species === 'hedgehog') {
        p.r(-7, HT, 14, 9, c.quills);
        for (const [qx, qy] of [[-4, 2], [0, 1], [3, 3], [-2, 6], [2, 7]]) p.px(qx, HT + qy, c.quillTip);
      }
      if (sp.bangs) p.r(-3, HT + 8, 6, 2, c.hair);
      if (sp.ribbon) drawRibbon(p, -7, HT - 2);
      if (sp.earring) p.px(-7, HT + 2, c.earring);
    } else {
      headShape(p, -6, HT, 13, c.fur);
      p.r(-3, HT + 1, 7, 1, c.furLight || c.fur);
      p.r(-5, HT + 10, 3, 1, c.furShade);
      if (ch.species === 'hedgehog') {
        p.r(-6, HT, 6, 9, c.quills);
        p.px(-4, HT + 2, c.quillTip); p.px(-3, HT + 5, c.quillTip); p.px(-5, HT + 7, c.quillTip);
      }
      if (ch.species === 'raccoon' || ch.species === 'redpanda') p.r(0, HT + 4, 5, 3, c.mask);
      if (ch.species === 'panda') p.r(0, HT + 4, 4, 3, c.mask);
      if (ch.species === 'badger') { p.r(-1, HT + 1, 2, 6, c.stripe); p.r(1, HT + 4, 4, 3, c.mask); }
      // Snout protruding to the facing side.
      p.o(3, HT + 6, 5, 6, c.muzzle);
      p.r(3, HT + 7, 1, 4, c.muzzle);
      p.px(7, HT + 7, c.nose); p.px(6, HT + 7, c.nose);
      if (ch.species === 'koala') p.r(6, HT + 6, 2, 2, c.nose);
      if (ch.species === 'seal') { p.r(5, HT + 9, 2, 1, '#6a7482'); }
      if (sp.bangs) { p.r(2, HT + 1, 2, 2, c.hair); p.px(4, HT + 1, c.hair); }
      drawEyeSide(p, ch, HT, fc);
      drawMouthSide(p, HT, fc.mouth);
      if (fc.blush || ch.species === 'frog') p.r(0, HT + 8, 2, 1, '#f09aac');
      if (sp.ribbon) drawRibbon(p, -4, HT - 3);
      if (sp.earring) p.px(-2, HT + 1, c.earring);
    }
  }

  function drawRibbon(p, x, y) {
    const r = P.roni.ribbon, d = P.roni.ribbonDark, l = '#f07a8a';
    p.r(x, y, 2, 1, l); p.r(x + 3, y, 2, 1, l);
    p.r(x, y + 1, 5, 1, r);
    p.r(x, y + 2, 2, 1, d); p.r(x + 3, y + 2, 2, 1, d);
    p.px(x + 2, y + 1, OL);
  }

  function eyeAt(p, ex, ey, kind, eyeCol, inner, t) {
    // inner: +1 if the inner (nose-side) edge is to the right of the eye.
    switch (kind) {
      case 'open': p.r(ex, ey, 2, 2, OL); p.px(ex, ey, '#ffffff'); p.px(ex + 1, ey + 1, eyeCol); break;
      case 'wide': p.r(ex, ey - 1, 2, 3, OL); p.px(ex, ey - 1, '#ffffff'); p.px(ex + 1, ey + 1, eyeCol); break;
      case 'shocked': {
        p.r(ex - 1, ey - 1, 4, 3, OL);
        p.r(ex, ey - 1, 2, 3, '#ffffff');
        const px = ex + (inner > 0 ? 1 : 0);
        p.px(px, ey, OL);
        p.px(px, ey + 1, eyeCol);
        break;
      }
      case 'happy': p.px(ex - (inner > 0 ? 1 : 0), ey + 1, OL); p.r(ex, ey, 2, 1, OL); p.px(ex + (inner > 0 ? 2 : 1), ey + 1, OL); break;
      case 'closed': p.r(ex, ey + 1, 2, 1, OL); break;
      case 'half': p.r(ex, ey, 2, 1, PALETTE.outlineSoft); p.r(ex, ey + 1, 2, 1, OL); break;
      case 'down': p.r(ex, ey + 1, 2, 1, OL); p.px(ex, ey, PALETTE.outlineSoft); break;
      case 'sparkle': p.r(ex, ey, 2, 2, OL); p.px(ex, ey, '#ffffff'); p.px(ex + 1, ey + 1, '#fff3a8'); break;
      case 'teary': {
        p.r(ex, ey, 2, 2, OL); p.px(ex, ey, '#ffffff');
        const dy = Math.floor((t * 3) % 3);
        p.px(ex + (inner > 0 ? 0 : 1), ey + 2 + dy, '#8fd0ff');
        break;
      }
    }
  }

  function drawEyesFront(p, ch, HT, fc) {
    const ec = ch.sp.c.eye;
    const lx = ch.lookDX, ly = ch.lookDY > 0 ? 1 : 0;
    const ey = HT + 5 + ly;
    eyeAt(p, -4 + lx, ey, fc.eye, ec, 1, ch.t);
    eyeAt(p, 2 + lx, ey, fc.eye, ec, -1, ch.t);
    const sh = ch.sp.c.furShade;
    const br = ch.sp.c.furLight || sh;
    if (fc.brow === 'sad') { p.px(-4, ey - 1, sh); p.px(-3, ey - 2, sh); p.px(3, ey - 1, sh); p.px(2, ey - 2, sh); }
    if (fc.brow === 'angry') { p.px(-4, ey - 2, sh); p.px(-3, ey - 1, sh); p.px(3, ey - 2, sh); p.px(2, ey - 1, sh); }
    if (fc.brow === 'up') { p.r(-4, ey - 2, 2, 1, br); p.r(2, ey - 2, 2, 1, br); }
    if (fc.brow === 'lowered') { p.r(-4, ey - 1, 2, 1, sh); p.r(2, ey - 1, 2, 1, sh); }
  }
  function drawEyeSide(p, ch, HT, fc) {
    const ey = HT + 5 + (ch.lookDY < 0 ? -1 : ch.lookDY > 0 ? 1 : 0);
    eyeAt(p, 2, ey, fc.eye, ch.sp.c.eye, 1, ch.t);
    const sh = ch.sp.c.furShade;
    const br = ch.sp.c.furLight || sh;
    if (fc.brow === 'sad') { p.px(2, ey - 1, sh); p.px(3, ey - 2, sh); }
    if (fc.brow === 'angry') { p.px(2, ey - 2, sh); p.px(3, ey - 1, sh); }
    if (fc.brow === 'up') p.r(2, ey - 2, 2, 1, br);
    if (fc.brow === 'lowered') p.r(2, ey - 1, 2, 1, sh);
  }
  function drawMouthFront(p, HT, m) {
    const y = HT + 9;
    switch (m) {
      case 'smile': p.px(-2, y, OL); p.r(-1, y + 1, 2, 1, OL); p.px(1, y, OL); break;
      case 'open': p.r(-2, y, 4, 1, OL); p.r(-2, y + 1, 4, 1, '#7a2e3e'); p.px(0, y + 1, '#e8798f'); p.r(-1, y + 2, 2, 1, OL); break;
      case 'o': p.r(-1, y, 2, 2, OL); break;
      case 'bigO': p.r(-1, y, 2, 3, OL); p.px(-1, y + 1, '#7a2e3e'); break;
      case 'frown': p.r(-1, y, 2, 1, OL); p.px(-2, y + 1, OL); p.px(1, y + 1, OL); break;
      case 'wavy': p.px(-2, y + 1, OL); p.px(-1, y, OL); p.px(0, y + 1, OL); p.px(1, y, OL); break;
      case 'flat': p.r(-2, y + 1, 4, 1, OL); break;
      default: p.r(-1, y + 1, 2, 1, OL);
    }
  }
  function drawMouthSide(p, HT, m) {
    const y = HT + 9;
    switch (m) {
      case 'smile': p.px(4, y, OL); p.r(5, y + 1, 2, 1, OL); break;
      case 'open': p.r(4, y, 3, 2, '#7a2e3e'); p.r(4, y, 3, 1, OL); break;
      case 'o': p.r(5, y, 2, 2, OL); break;
      case 'bigO': p.r(5, y, 2, 3, OL); break;
      case 'frown': p.r(5, y, 2, 1, OL); p.px(4, y + 1, OL); break;
      case 'wavy': p.px(4, y + 1, OL); p.px(5, y, OL); p.px(6, y + 1, OL); break;
      case 'flat': p.r(4, y + 1, 3, 1, OL); break;
      default: p.r(5, y + 1, 2, 1, OL);
    }
  }

  // ---------------------------------------------------------------- Props
  function bouquetColors(type) {
    const pr = P.props;
    if (type === 'sunflower') return [pr.sunflower, pr.sunflower, pr.sunflowerDark, pr.sunCenter];
    if (type === 'peony') return [pr.peony, pr.peonyLight, pr.peonyDark, pr.peony];
    return [pr.sunflower, pr.peony, pr.tulip, pr.peonyLight];
  }
  function drawBouquet(p, cx, top, type) {
    const pr = P.props;
    const cols = bouquetColors(type);
    // Wrapped cone.
    p.rows([[-3, 7], [-3, 7], [-2, 5], [-2, 5], [-1, 3], [-1, 3]].map(([x, w]) => [x + cx, w]), top + 4, pr.wrapKraft);
    p.r(cx - 1, top + 6, 3, 1, pr.ribbon);
    // Leaves and blooms.
    p.r(cx - 4, top + 2, 2, 2, pr.leafDark); p.r(cx + 3, top + 2, 2, 2, pr.leaf);
    const bloom = (bx, by, col, centre) => { p.o(bx - 1, by - 1, 4, 4, col); if (centre) p.px(bx, by, centre); };
    bloom(cx - 3, top + 1, cols[0], type === 'sunflower' ? pr.sunCenter : null);
    bloom(cx, top - 1, cols[1], type === 'sunflower' ? pr.sunCenter : null);
    bloom(cx + 2, top + 2, cols[2], null);
    p.px(cx - 1, top + 3, cols[3]);
  }

  function drawPropsBehind(p, ch, view, B) {
    if (!ch.carrying.includes('work_bag')) return;
    const pr = P.props;
    const adj = ch.anim && ch.anim.name === 'adjustBag' && ch.anim.t < 0.3 ? -1 : 0;
    if (view === 'front') {
      for (let i = 0; i < 8; i++) p.px(3 - i, B + i, pr.bagStrap);
      p.o(-10, B + 6 + adj, 5, 6, pr.bag); p.r(-9, B + 7 + adj, 3, 1, pr.bagShade); p.px(-8, B + 8 + adj, '#d7c27a');
    } else if (view === 'back') {
      for (let i = 0; i < 8; i++) p.px(-4 + i, B + i, pr.bagStrap);
      p.o(5, B + 6 + adj, 5, 6, pr.bag); p.r(6, B + 7 + adj, 3, 1, pr.bagShade);
    } else {
      for (let i = 0; i < 6; i++) p.px(1 - i, B + i, pr.bagStrap);
      p.o(-8, B + 6 + adj, 5, 6, pr.bag); p.r(-7, B + 7 + adj, 3, 1, pr.bagShade);
    }
  }

  function drawPropsFront(p, ch, view, B, pose) {
    const pr = P.props;
    const has = k => ch.carrying.includes(k);
    if (has('bouquet')) {
      if (view === 'front') drawBouquet(p, 0, B - 1, ch.bouquetType);
      else if (view === 'side') drawBouquet(p, 6, B - 1, ch.bouquetType);
      else { const cols = bouquetColors(ch.bouquetType); p.o(3, B - 3, 4, 4, cols[0]); p.o(5, B - 2, 4, 4, cols[1]); }
    }
    if (has('album')) {
      if (view === 'front') { p.o(-4, B + 3, 8, 6, pr.album); p.r(-1, B + 5, 2, 1, pr.albumGold); }
      else if (view === 'side') { p.o(3, B + 2, 4, 7, pr.album); p.px(5, B + 4, pr.albumGold); }
    }
    if (has('gift') && view !== 'back') {
      const gx = view === 'front' ? -3 : 3;
      p.o(gx, B + 3, 6, 5, '#e05a6a'); p.r(gx + 2, B + 3, 2, 5, '#f4d35e');
    }
    if (has('papers') && view !== 'back') {
      const px = view === 'front' ? -4 : 2;
      p.o(px, B + 2, 8, 6, '#fbf7f2');
      p.r(px + 1, B + 3, 5, 1, '#9aa3ad');
      p.r(px + 2, B + 5, 4, 1, '#c3cad2');
    }
    if (has('cake_plate') && view !== 'back') {
      const px = view === 'front' ? -3 : 4;
      p.o(px, B + 3, 8, 4, '#fbf7f2');
      p.r(px + 2, B + 2, 4, 3, '#f6e6d6');
      p.r(px + 2, B + 2, 4, 1, '#f39bb6');
      p.px(px + 4, B + 1, '#d6455a');
    }
    if (has('tripod')) {
      const tx = view === 'front' ? -2 : view === 'back' ? 2 : 4;
      p.r(tx, B - 2, 3, 12, '#3a3532');
      p.r(tx + 1, B - 2, 1, 12, '#6a5848');
      p.o(tx - 1, B - 5, 5, 4, '#2a2624');
      p.px(tx + 1, B - 4, '#8ec0e4');
    }
    if (pose === 'phone' && view !== 'back') {
      const px = view === 'front' ? -1 : 5;
      p.r(px, B + 3, 3, 4, pr.phone); p.r(px + 1, B + 4, 1, 2, pr.phoneScreen);
    }
    if (has('camera') && ch.state === 'posing') {
      if (view === 'side') { p.o(8, B - 8, 6, 5, pr.camera); p.r(9, B - 7, 2, 2, pr.cameraDark); p.px(12, B - 7, '#f25a5a'); }
      else if (view === 'front') { p.o(7, B - 11, 7, 5, pr.camera); p.r(9, B - 10, 2, 2, pr.cameraDark); p.px(12, B - 10, '#f25a5a'); }
    }
  }

  // ---------------------------------------------------------------- Penguin
  function drawPenguin(ctx, ch, x, y) {
    const c = P.penguin;
    const view = viewOf(ch.visDir);
    const f = ch.frame();
    const wad = ch.moving ? (f === 1 ? 1 : f === 3 ? -1 : 0) : 0;
    const p = painter(ctx, x + wad, y, ch.visDir === 'left');
    const breath = !ch.moving && Math.sin(ch.t * 2.2) > 0.6 ? 1 : 0;
    const fc = faceFor(ch);
    const T = -27 + breath;
    const ak = ch.anim ? ch.anim.t / ch.anim.dur : 0;
    const flap = ch.anim && (ch.anim.name === 'wave' || ch.anim.name === 'clap') ? Math.round(Math.sin(ak * Math.PI * 6)) : 0;
    const liftL = ch.moving && f === 1 ? 1 : 0, liftR = ch.moving && f === 3 ? 1 : 0;
    if (view === 'front' || view === 'back') {
      p.r(-5, -2 - liftL, 4, 2, c.feet); p.r(1, -2 - liftR, 4, 2, c.feet);
      p.o(-9, T + 9 - flap, 3, 10, c.bodyShade); mirrorOf(p).o(-9, T + 9 + (ch.anim && ch.anim.name === 'wave' ? -flap * 2 : -flap), 3, 10, c.bodyShade);
      p.o(-7, T, 14, 26, c.body);
      if (view === 'front') {
        p.o(-5, T + 6, 10, 19, c.belly); p.r(-4, T + 22, 8, 2, c.bellyShade);
        // Tailored suit jacket lapels & crisp collar framing the tie
        p.r(-5, T + 11, 2, 13, c.body); p.r(3, T + 11, 2, 13, c.body);
        p.r(-3, T + 12, 1, 6, c.bodyShade); p.r(2, T + 12, 1, 6, c.bodyShade);
        p.px(-4, T + 16, '#e6c46a');
        const ey = T + 4;
        eyeAt(p, -4, ey, fc.eye === 'down' ? 'down' : fc.eye, '#2a2a3a', 1, ch.t);
        eyeAt(p, 2, ey, fc.eye === 'down' ? 'down' : fc.eye, '#2a2a3a', -1, ch.t);
        p.o(-6, ey - 2, 5, 5, null, c.glasses); p.o(1, ey - 2, 5, 5, null, c.glasses); p.r(-1, ey, 2, 1, c.glasses);
        const open = fc.mouth === 'open' || fc.mouth === 'bigO';
        p.r(-1, T + 8, 2, open ? 3 : 2, c.beak); if (open) p.px(-1, T + 9, '#7a2e3e');
        p.r(-1, T + 11, 2, 1, '#8f2f2b'); p.r(-1, T + 12, 2, 5, c.tie); p.px(-1, T + 16, '#8f2f2b');
        if (fc.blush) { p.px(-6, T + 7, '#f09aac'); p.px(5, T + 7, '#f09aac'); }
      }
    } else {
      p.r(-1, -2 - liftL, 5, 2, c.feet);
      p.o(-6, T, 12, 26, c.body);
      p.o(0, T + 6, 5, 19, c.belly);
      p.r(0, T + 11, 2, 13, c.body);
      p.r(2, T + 12, 2, 5, c.tie);
      eyeAt(p, 2, T + 4, fc.eye, '#2a2a3a', 1, ch.t);
      p.o(1, T + 2, 5, 5, null, c.glasses);
      p.r(6, T + 7, 3, 2, c.beak);
      const swing = ch.moving ? [0, 1, 0, -1][f] : 0;
      p.o(-3 + swing, T + 9 - (ch.anim && ch.anim.name === 'wave' ? 4 : 0), 3, 10, c.bodyShade);
    }
  }

  // ---------------------------------------------------------------- Owl
  function drawOwl(ctx, ch, x, y) {
    const c = P.owl;
    const view = viewOf(ch.visDir);
    const p = painter(ctx, x, y, ch.visDir === 'left');
    const breath = !ch.moving && Math.sin(ch.t * 2) > 0.6 ? 1 : 0;
    const fc = faceFor(ch);
    const T = -27 + breath;
    const ak = ch.anim ? ch.anim.t / ch.anim.dur : 0;
    const unlocking = ch.anim && ch.anim.name === 'unlock';
    const wing = ch.anim && (ch.anim.name === 'wave' || ch.anim.name === 'cut' || ch.anim.name === 'reach') ? Math.round(Math.abs(Math.sin(ak * Math.PI * 5)) * 3) : 0;
    const keyTurn = unlocking ? Math.round(Math.sin(ak * Math.PI * 6)) : 0;
    p.r(-4, -2, 3, 2, c.beak); p.r(1, -2, 3, 2, c.beak);
    if (view !== 'side') {
      p.o(-10, T + 9 - wing, 4, 13, c.bodyShade);
      mirrorOf(p).o(-10, T + 9 - (unlocking ? 5 : wing), 4, 13, c.bodyShade);
      p.rows([[-7, 2], [-8, 3]], T - 2, c.bodyShade); mirrorOf(p).rows([[-7, 2], [-8, 3]], T - 2, c.bodyShade);
      p.o(-8, T, 16, 26, c.body);
      if (view === 'front') {
        p.o(-5, T + 10, 10, 14, c.belly);
        for (let i = 0; i < 3; i++) { p.px(-3 + i * 2, T + 13, c.bellyShade); p.px(-2 + i * 2, T + 16, c.bellyShade); }
        const eye = (ex) => {
          p.o(ex, T + 2, 6, 6, '#fbf7f2', c.eyeRing);
          if (fc.eye === 'closed' || fc.eye === 'happy' || fc.eye === 'half') p.r(ex + 1, T + 5, 4, 1, OL);
          else p.r(ex + 2 + ch.lookDX, T + 4, 2, 2, OL);
        };
        eye(-7); eye(1);
        p.r(-1, T + 8, 2, 2, c.beak);
        if (fc.mouth === 'open' || fc.mouth === 'bigO') p.px(-1, T + 10, '#7a2e3e');
        p.o(-6, T + 15, 12, 11, c.apron); p.r(-5, T + 18, 10, 1, c.apronShade);
        p.r(-3, T + 20, 6, 3, c.apronShade);
        p.r(-7, T + 11, 14, 2, '#b1a1c4'); p.r(-6, T + 13, 2, 4, '#8e7caa');
        p.px(-3, T + 17, '#f1b7c6'); p.px(2, T + 23, '#f1b7c6');
        p.px(6, T - 1, '#f39bb6'); p.px(7, T, '#f39bb6'); p.px(6, T, '#fbd0dd');
        if (fc.blush) { p.px(-7, T + 9, '#f09aac'); p.px(6, T + 9, '#f09aac'); }
      } else {
        p.r(-1, T + 15, 2, 8, c.apron);
      }
      if (unlocking) {
        // Golden key extended upward/outward while locking the shop door
        p.o(5, T + 1 + keyTurn, 3, 3, '#f4d35e');
        p.r(6, T - 3 + keyTurn, 1, 4, '#e6c46a');
        p.px(7, T - 3 + keyTurn, '#f4d35e');
      }
    } else {
      p.o(-7, T, 14, 26, c.body);
      p.o(1, T + 2, 6, 6, '#fbf7f2', c.eyeRing);
      if (fc.eye === 'closed' || fc.eye === 'happy') p.r(2, T + 5, 4, 1, OL); else p.r(4, T + 4, 2, 2, OL);
      p.r(7, T + 8, 2, 2, c.beak);
      p.o(-5, T + 9 - (unlocking ? 4 : wing), 7, 13, c.bodyShade);
      p.r(3, T + 15, 4, 10, c.apron);
      if (unlocking) {
        p.o(5, T + 6 + keyTurn, 3, 3, '#f4d35e');
        p.r(8, T + 7 + keyTurn, 4, 1, '#e6c46a');
        p.px(11, T + 8 + keyTurn, '#f4d35e');
      }
    }
  }

  // ---------------------------------------------------------------- Emotes
  function drawEmote(ctx, ch, x, topY) {
    const e = ch.emoteObj;
    const p = painter(ctx, x, Math.round(topY), false);
    const rise = Math.min(1, e.t / 0.15);
    const y0 = -9 - Math.round(rise * 2);
    if (e.kind === 'zzz') {
      const k = (e.t % 1.2) / 1.2;
      const zx = 4 + Math.round(k * 4), zy = -4 - Math.round(k * 8);
      p.r(zx, zy, 3, 1, OL); p.px(zx + 1, zy + 1, OL); p.r(zx, zy + 2, 3, 1, OL);
      return;
    }
    if (e.kind === 'sweat') { p.r(7, -14, 2, 3, '#8fd0ff'); p.px(7, -15, '#8fd0ff'); return; }
    p.o(-5, y0, 11, 9, '#fbf7f2');
    p.px(0, y0 + 9, OL); p.px(-1, y0 + 8, '#fbf7f2');
    const k = e.kind;
    if (k === '!') { p.r(0, y0 + 2, 1, 3, '#d6455a'); p.px(0, y0 + 6, '#d6455a'); }
    else if (k === '?') { p.r(-1, y0 + 2, 2, 1, '#4a6fa5'); p.px(1, y0 + 3, '#4a6fa5'); p.px(0, y0 + 4, '#4a6fa5'); p.px(0, y0 + 6, '#4a6fa5'); }
    else if (k === 'heart') { p.r(-2, y0 + 3, 2, 2, '#e0506a'); p.r(1, y0 + 3, 2, 2, '#e0506a'); p.r(-2, y0 + 4, 5, 1, '#e0506a'); p.r(-1, y0 + 5, 3, 1, '#e0506a'); p.px(0, y0 + 6, '#e0506a'); p.px(-1, y0 + 3, '#ff9fb0'); }
    else if (k === '...') { const n = 1 + Math.floor(e.t * 3) % 3; for (let i = 0; i < n; i++) p.px(-2 + i * 2, y0 + 5, OL); }
    else if (k === 'note') { p.r(1, y0 + 2, 1, 4, '#5f7f9e'); p.r(-1, y0 + 5, 2, 2, '#5f7f9e'); p.px(2, y0 + 2, '#5f7f9e'); }
    else if (k === 'sparkle') { p.px(0, y0 + 2, '#e8b830'); p.r(-1, y0 + 3, 3, 3, '#f4d35e'); p.px(0, y0 + 6, '#e8b830'); p.px(-2, y0 + 4, '#e8b830'); p.px(2, y0 + 4, '#e8b830'); }
  }

  // ---------------------------------------------------------------- Registry + portraits
  const DEFS = {
    roni: { name: 'Roni', species: 'mouse', outfit: 'roni_office', voice: { base: 620, wave: 'triangle' } },
    kallita: { name: 'Kallita', species: 'cat', outfit: 'kallita_casual', voice: { base: 380, wave: 'square' } },
    penguin: { name: 'Mr. Pemberton', species: 'penguin', voice: { base: 240, wave: 'sawtooth' }, walkSpeed: 34 },
    owl: { name: 'Odette', species: 'owl', voice: { base: 520, wave: 'sine' } },
    rabbit: { name: 'Neighbour', species: 'rabbit', outfit: 'rabbit_coat', voice: { base: 700, wave: 'triangle' }, walkSpeed: 30 },
    bear: { name: 'Passer-by', species: 'bear', outfit: 'bear_scarf', voice: { base: 200, wave: 'square' }, walkSpeed: 26 },
    clara: { name: 'Clara', species: 'rabbit', outfit: 'office_charcoal', voice: { base: 660, wave: 'triangle' }, walkSpeed: 32 },
    barnaby: { name: 'Barnaby', species: 'bear', outfit: 'office_navy', voice: { base: 220, wave: 'square' }, walkSpeed: 28 },
    miles: { name: 'Miles', species: 'seal', outfit: 'office_slate', voice: { base: 460, wave: 'sine' }, walkSpeed: 30 },
    felix: { name: 'Felix', species: 'fox', outfit: 'city_emerald', voice: { base: 510, wave: 'triangle' }, walkSpeed: 34 },
    maple: { name: 'Maple', species: 'dog', outfit: 'city_burgundy', voice: { base: 430, wave: 'triangle' }, walkSpeed: 32 },
    pip: { name: 'Pip', species: 'frog', outfit: 'city_ochre', voice: { base: 590, wave: 'sine' }, walkSpeed: 30 },
    clover: { name: 'Clover', species: 'deer', outfit: 'city_plum', voice: { base: 640, wave: 'triangle' }, walkSpeed: 31 },
    otto: { name: 'Otto', species: 'raccoon', outfit: 'night_teal', voice: { base: 360, wave: 'triangle' }, walkSpeed: 30 },
    willow: { name: 'Willow', species: 'squirrel', outfit: 'night_rust', voice: { base: 620, wave: 'triangle' }, walkSpeed: 34 },
    bramble: { name: 'Bramble', species: 'hedgehog', outfit: 'night_indigo', voice: { base: 310, wave: 'sine' }, walkSpeed: 28 },
    hazel: { name: 'Hazel', species: 'koala', outfit: 'city_emerald', voice: { base: 470, wave: 'sine' }, walkSpeed: 29 },
    pippin: { name: 'Pippin', species: 'koala', outfit: 'city_ochre', child: true, voice: { base: 740, wave: 'triangle' }, walkSpeed: 33 },
    bruno: { name: 'Bruno', species: 'capybara', outfit: 'city_ochre', voice: { base: 340, wave: 'sine' }, walkSpeed: 28 },
    pippa: { name: 'Pippa', species: 'capybara', outfit: 'city_emerald', child: true, voice: { base: 730, wave: 'triangle' }, walkSpeed: 33 },
    jun: { name: 'Jun', species: 'panda', outfit: 'city_emerald', voice: { base: 420, wave: 'triangle' }, walkSpeed: 30 },
    mina: { name: 'Mina', species: 'lamb', outfit: 'city_plum', voice: { base: 650, wave: 'sine' }, walkSpeed: 30 },
    theo: { name: 'Theo', species: 'quokka', outfit: 'city_burgundy', voice: { base: 490, wave: 'triangle' }, walkSpeed: 30 },
    rosie: { name: 'Rosie', species: 'quokka', outfit: 'city_ochre', voice: { base: 600, wave: 'sine' }, walkSpeed: 30 },
    milo: { name: 'Milo', species: 'badger', outfit: 'night_teal', voice: { base: 290, wave: 'triangle' }, walkSpeed: 29 },
    koda: { name: 'Koda', species: 'redpanda', outfit: 'night_rust', voice: { base: 450, wave: 'triangle' }, walkSpeed: 31 },
    lumi: { name: 'Lumi', species: 'otter', outfit: 'night_indigo', voice: { base: 560, wave: 'sine' }, walkSpeed: 31 },
    sage: { name: 'Sage', species: 'otter', outfit: 'night_teal', voice: { base: 490, wave: 'triangle' }, walkSpeed: 30 },
    pebble: { name: 'Pebble', species: 'redpanda', outfit: 'night_indigo', child: true, voice: { base: 720, wave: 'triangle' }, walkSpeed: 34 }
  };

  const Characters = {
    SPECIES, EXPR, DIRS, Character, dominantDir, dirToward,
    all: {},
    onStep: null,
    get(id) { return this.all[id]; },
    create(id, opts) {
      const def = Object.assign({}, DEFS[id] || {}, opts || {});
      const ch = new Character(id, def);
      this.all[id] = ch;
      return ch;
    },
    createAll() { for (const id in DEFS) this.create(id); return this.all; },
    def(id) { return DEFS[id]; },
    // Bust portrait for dialogue boxes, drawn with the same renderer as the in-world sprite.
    drawPortrait(ctx, id, expression, t, opts) {
      const src = this.all[id];
      const tmp = new Character(id, Object.assign({}, DEFS[id], { outfit: src ? src.outfit : DEFS[id].outfit }));
      tmp.expression = (src ? src.expression : null) || expression || 'neutral';
      if (expression) tmp.expression = expression;
      tmp.t = src ? src.t : (t || 0);
      tmp.talking = !!(opts && opts.talking);
      tmp.blinkDur = src ? src.blinkDur : 0;
      tmp.earTwitch = src ? src.earTwitch : 0;
      tmp.lookDX = src ? src.lookDX : 0;
      tmp.lookDY = src ? src.lookDY : 0;
      tmp.state = (src && src.state === 'phone') ? 'phone' : 'idle';
      tmp.carrying = [];
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      const h = tmp.height();
      drawCharacter(ctx, tmp, Math.floor(ctx.canvas.width / 2), ctx.canvas.height + h - 26);
    }
  };

  window.Characters = Characters;
})();

