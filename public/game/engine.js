// Core engine: game loop, input, camera, timers, tweens, fades and the async script runner.
(function () {
  const W = 320, H = 180;

  const Ease = {
    linear: t => t,
    inOut: t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2,
    out: t => 1 - Math.pow(1 - t, 3),
    in: t => t * t * t,
    outBack: t => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); }
  };

  // ---------------------------------------------------------------- Input
  const ACTIONS = {
    up: ['ArrowUp', 'KeyW'], down: ['ArrowDown', 'KeyS'], left: ['ArrowLeft', 'KeyA'], right: ['ArrowRight', 'KeyD'],
    run: ['ShiftLeft', 'ShiftRight'], interact: ['KeyE'], confirm: ['Enter', 'Space', 'KeyE'],
    cancel: ['Escape'], debug: ['F3']
  };
  const Input = {
    keys: new Set(), pressedCodes: new Set(), blocked: false, listeners: [],
    mouse: { x: 0, y: 0, down: false, clicked: false, released: false, inside: false },
    init(canvas) {
      window.addEventListener('keydown', e => {
        const tag = (e.target && e.target.tagName) || '';
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'F3'].includes(e.code)) e.preventDefault();
        if (!this.keys.has(e.code)) this.pressedCodes.add(e.code);
        this.keys.add(e.code);
        for (const l of this.listeners) l(e);
      });
      window.addEventListener('keyup', e => { this.keys.delete(e.code); });
      window.addEventListener('blur', () => { this.keys.clear(); });
      const toLogical = e => {
        const r = canvas.getBoundingClientRect();
        if (!r.width || !r.height) return;
        this.mouse.x = (e.clientX - r.left) / r.width * W;
        this.mouse.y = (e.clientY - r.top) / r.height * H;
        this.mouse.inside = this.mouse.x >= 0 && this.mouse.y >= 0 && this.mouse.x < W && this.mouse.y < H;
      };
      canvas.addEventListener('pointermove', toLogical);
      canvas.addEventListener('pointerdown', e => {
        if (e.button && e.button !== 0) return;
        toLogical(e);
        this.mouse.down = true;
        this.mouse.clicked = true;
        if (canvas.focus) canvas.focus({ preventScroll: true });
      });
      window.addEventListener('pointerup', () => {
        if (this.mouse.down) this.mouse.released = true;
        this.mouse.down = false;
      });
    },
    onKey(fn) { this.listeners.push(fn); },
    down(action) { if (this.blocked) return false; return ACTIONS[action].some(c => this.keys.has(c)); },
    pressed(action) { if (this.blocked) return false; return ACTIONS[action].some(c => this.pressedCodes.has(c)); },
    codePressed(code) { return this.pressedCodes.has(code); },
    codeDown(code) { return this.keys.has(code); },
    axis() {
      let x = 0, y = 0;
      if (this.down('left')) x -= 1;
      if (this.down('right')) x += 1;
      if (this.down('up')) y -= 1;
      if (this.down('down')) y += 1;
      return { x, y };
    },
    consume(action) { for (const c of ACTIONS[action]) this.pressedCodes.delete(c); },
    endFrame() { this.pressedCodes.clear(); this.mouse.clicked = false; this.mouse.released = false; }
  };

  // ---------------------------------------------------------------- Camera
  const Camera = {
    x: 0, y: 0, zoom: 1, target: null, focusPt: null, bounds: { x: 0, y: 0, width: W, height: H },
    shakeMag: 0, shakeT: 0, offX: 0, offY: 0, lead: 0, smooth: 5,
    viewW() { return W / this.zoom; }, viewH() { return H / this.zoom; },
    setBounds(b) { this.bounds = { x: b.x, y: b.y, width: b.width, height: b.height }; },
    follow(ch) { this.target = ch; this.focusPt = null; },
    desired() {
      let cx, cy;
      if (this.focusPt) { cx = this.focusPt.x; cy = this.focusPt.y; }
      else if (this.target) {
        cx = this.target.x + (this.target.dir === 'right' ? this.lead : this.target.dir === 'left' ? -this.lead : 0);
        cy = this.target.y - 16;
      } else { cx = this.x + this.viewW() / 2; cy = this.y + this.viewH() / 2; }
      return this.clamp(cx - this.viewW() / 2, cy - this.viewH() / 2);
    },
    clamp(x, y) {
      const b = this.bounds, vw = this.viewW(), vh = this.viewH();
      x = b.width <= vw ? b.x + (b.width - vw) / 2 : Math.max(b.x, Math.min(b.x + b.width - vw, x));
      y = b.height <= vh ? b.y + (b.height - vh) / 2 : Math.max(b.y, Math.min(b.y + b.height - vh, y));
      return { x, y };
    },
    snap() { const d = this.desired(); this.x = d.x; this.y = d.y; },
    update(dt) {
      const d = this.desired();
      const k = Math.min(1, dt * this.smooth);
      this.x += (d.x - this.x) * k;
      this.y += (d.y - this.y) * k;
      if (this.shakeT > 0) {
        this.shakeT -= dt;
        this.offX = (Math.random() * 2 - 1) * this.shakeMag;
        this.offY = (Math.random() * 2 - 1) * this.shakeMag;
      } else { this.offX = this.offY = 0; }
    },
    // Smoothly frame a world point at a zoom level. Resolves when the tween finishes.
    focus(x, y, zoom, dur) {
      const start = this.focusPt ? { ...this.focusPt } : { x: this.x + this.viewW() / 2, y: this.y + this.viewH() / 2 };
      this.focusPt = start;
      return Promise.all([
        Engine.tween(this.focusPt, { x, y }, dur || 1, Ease.inOut),
        Engine.tween(this, { zoom: zoom || 1 }, dur || 1, Ease.inOut)
      ]);
    },
    async release(dur) {
      if (this.focusPt && this.target) {
        await Promise.all([
          Engine.tween(this.focusPt, { x: this.target.x, y: this.target.y - 16 }, dur || 0.8, Ease.inOut),
          Engine.tween(this, { zoom: 1 }, dur || 0.8, Ease.inOut)
        ]);
      }
      this.focusPt = null; this.zoom = 1;
    },
    shake(mag, dur) { if (window.Save && !Save.settings.shake) return; this.shakeMag = mag; this.shakeT = dur; },
    toScreen(wx, wy) { return { x: (wx - this.x) * this.zoom, y: (wy - this.y) * this.zoom }; },
    toWorld(sx, sy) { return { x: sx / this.zoom + this.x, y: sy / this.zoom + this.y }; }
  };

  // ---------------------------------------------------------------- Engine
  const Engine = {
    W, H, Ease, canvas: null, ctx: null, scale: 1, time: 0, realTime: 0, paused: false,
    timers: [], tweens: [], waiters: [], scriptDepth: 0, fadeAlpha: 0, fadeColor: '#000',
    hooks: { update: null, render: null }, last: 0, errors: [],

    init(canvas, hooks) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.ctx.imageSmoothingEnabled = false;
      this.hooks = hooks;
      Input.init(canvas);
      window.addEventListener('resize', () => this.resize());
      this.resize();
    },
    resize() {
      const fit = Math.min(window.innerWidth / W, window.innerHeight / H);
      this.scale = fit > 0 ? fit : 1;
      const root = document.getElementById('game-root');
      root.style.width = Math.round(W * this.scale) + 'px';
      root.style.height = Math.round(H * this.scale) + 'px';
      root.style.setProperty('--px', this.scale + 'px');
    },
    start() {
      this.last = performance.now();
      const frame = now => {
        let dt = (now - this.last) / 1000;
        this.last = now;
        if (dt > 0.05) dt = 0.05;
        this.realTime += dt;
        try {
          if (!this.paused) this.step(dt);
          this.hooks.update && this.hooks.update(this.paused ? 0 : dt, dt);
          this.hooks.render && this.hooks.render(this.ctx);
        } catch (err) {
          console.error('[Engine] frame error:', err);
          this.errors.push(String(err && err.stack || err));
        }
        Input.endFrame();
        requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
    },
    step(dt) {
      this.time += dt;
      for (let i = this.timers.length - 1; i >= 0; i--) {
        const t = this.timers[i];
        t.left -= dt;
        if (t.left <= 0) { this.timers.splice(i, 1); t.resolve(); }
      }
      for (let i = this.tweens.length - 1; i >= 0; i--) {
        const tw = this.tweens[i];
        tw.t = Math.min(tw.dur, tw.t + dt);
        const k = tw.ease(tw.dur <= 0 ? 1 : tw.t / tw.dur);
        for (const p in tw.to) tw.obj[p] = tw.from[p] + (tw.to[p] - tw.from[p]) * k;
        if (tw.t >= tw.dur) { this.tweens.splice(i, 1); tw.resolve(); }
      }
      for (let i = this.waiters.length - 1; i >= 0; i--) {
        const w = this.waiters[i];
        if (w.pred()) { this.waiters.splice(i, 1); w.resolve(); }
      }
    },
    wait(sec) { return new Promise(resolve => this.timers.push({ left: sec, resolve })); },
    waitUntil(pred) { return new Promise(resolve => this.waiters.push({ pred, resolve })); },
    tween(obj, to, dur, ease) {
      return new Promise(resolve => {
        const from = {};
        for (const p in to) from[p] = obj[p] != null ? obj[p] : 0;
        this.tweens.push({ obj, from, to, dur, t: 0, ease: ease || Ease.inOut, resolve });
      });
    },
    fade(alpha, dur, color) {
      if (color) this.fadeColor = color;
      return this.tween(this, { fadeAlpha: alpha }, dur == null ? 0.6 : dur, Ease.linear);
    },
    get inScript() { return this.scriptDepth > 0; },
    async runScript(fn) {
      this.scriptDepth++;
      try { return await fn(); }
      catch (err) { console.error('[Script] error:', err); this.errors.push(String(err && err.stack || err)); }
      finally { this.scriptDepth--; }
    },
    clearAsync() { this.timers = []; this.tweens = []; this.waiters = []; this.scriptDepth = 0; }
  };

  window.Engine = Engine;
  window.Input = Input;
  window.Camera = Camera;
})();

