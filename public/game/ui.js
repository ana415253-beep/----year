// UI: HUD (interaction prompt, toasts, room label, objective), dialogue with portraits and typewriter text,
// choices, phone messages and chapter cards. Everything is drawn on the logical 320x180 canvas.
(function () {
  const C = PALETTE.ui;
  const W = 320, H = 180;
  const BOX = { x: 10, y: 120, w: 300, h: 56 };
  const snd = (name, a) => window.Sound && Sound.sfx && Sound.sfx(name, a);

  function panel(ctx, x, y, w, h, opts) {
    opts = opts || {};
    x = Math.round(x); y = Math.round(y);
    const fill = opts.fill || C.panel, edge = opts.edge || C.panelLight, ol = opts.outline || PALETTE.outline;
    ctx.fillStyle = ol;
    ctx.fillRect(x + 1, y, w - 2, h); ctx.fillRect(x, y + 1, w, h - 2);
    ctx.fillStyle = edge;
    ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
    ctx.fillStyle = fill;
    ctx.fillRect(x + 2, y + 2, w - 4, h - 4);
    if (!opts.flat) { ctx.fillStyle = 'rgba(255,255,255,0.06)'; ctx.fillRect(x + 2, y + 2, w - 4, 1); }
  }
  function keycap(ctx, label, x, y) {
    const w = Math.max(9, Font.measure(label) + 6);
    ctx.fillStyle = PALETTE.outline; ctx.fillRect(x, y, w, 11);
    ctx.fillStyle = C.text; ctx.fillRect(x + 1, y, w - 2, 10);
    ctx.fillStyle = '#c9bfae'; ctx.fillRect(x + 1, y + 9, w - 2, 1);
    Font.draw(ctx, label, x + 3, y + 1, C.bg);
    return w;
  }

  const UI = {
    t: 0, prompt: null, promptObj: null, toasts: [], room: null, objective: null, objectiveFlash: 0,
    dialogue: null, bubbleView: null, choice: null, phoneView: null, cardView: null, hidden: false,
    textSpeed: 42, portrait: null,
    panel, keycap,

    get busy() { return !!(this.dialogue || this.bubbleView || this.choice || this.phoneView || (this.cardView && this.cardView.block)); },

    init() {
      this.portrait = document.createElement('canvas');
      this.portrait.width = 26; this.portrait.height = 26;
    },

    // ---------------------------------------------------------------- HUD
    setPrompt(text, obj) { this.prompt = text; this.promptObj = obj || null; },
    clearPrompt() { this.prompt = null; this.promptObj = null; },
    toast(text, dur) { this.toasts.push({ text, t: 0, dur: dur || 2.6 }); if (this.toasts.length > 3) this.toasts.shift(); },
    showRoom(name) { this.room = { text: name, t: 0 }; },
    setObjective(text) { if (text !== this.objective) { this.objective = text; this.objectiveFlash = text ? 2 : 0; } },

    // ---------------------------------------------------------------- Dialogue
    // speaker: character id, or null for narration. opts: { expr, name, sfx }.
    say(speaker, text, opts) {
      opts = opts || {};
      return new Promise(resolve => {
        const ch = speaker && window.World ? World.chars.find(c => c.id === speaker) : null;
        const def = speaker ? Characters.def(speaker) : null;
        if (ch && opts.expr) ch.expression = opts.expr;
        const textW = speaker ? BOX.w - 72 : BOX.w - 16;
        this.dialogue = {
          speaker, ch, name: opts.name || (def ? def.name : ''), expr: opts.expr || (ch ? ch.expression : 'neutral'),
          lines: Font.wrap(text, textW), shown: 0, total: 0, hold: 0, done: false, resolve, voice: def ? def.voice : null, blipN: 0
        };
        this.dialogue.total = this.dialogue.lines.join('\n').length;
      });
    },
    // A list of [speaker, text, opts] played in order.
    async talk(list) { for (const l of list) await this.say(l[0], l[1], l[2]); },

    // Overhead speech bubble attached to a character's head. Disappears automatically after reading pause or on confirm.
    bubble(speaker, text, opts) {
      opts = opts || {};
      return new Promise(resolve => {
        const ch = speaker && window.World ? World.chars.find(c => c.id === speaker) : null;
        const def = speaker ? Characters.def(speaker) : null;
        if (ch && opts.expr) ch.expression = opts.expr;
        const maxW = opts.maxW || 136;
        const lines = Font.wrap(text, maxW);
        this.bubbleView = {
          speaker, ch, text, lines,
          shown: 0, total: lines.join('\n').length,
          hold: 0, done: false,
          holdAfter: opts.holdAfter != null ? opts.holdAfter : Math.max(1.3, Math.min(2.6, text.length * 0.045)),
          resolve, voice: def ? def.voice : null, blipN: 0
        };
      });
    },

    choose(options, opts) {
      opts = opts || {};
      return new Promise(resolve => {
        snd('ui_open');
        const w = Math.max(...options.map(o => Font.measure(o))) + 22;
        this.choice = { options, idx: 0, resolve, w, title: opts.title || null, cancel: opts.cancel != null ? opts.cancel : -1 };
      });
    },

    // thread: { contact, messages: [{from:'kei'|'roni', text}], reply?: [options] } -> resolves with reply index (or -1)
    phone(thread) {
      return new Promise(resolve => {
        snd('phone_buzz');
        this.phoneView = { thread, shown: 0, t: 0, typing: 0.7, y: H, reply: null, resolve, replyIdx: 0, done: false, msgs: thread.messages.slice() };
        Engine.tween(this.phoneView, { y: 22 }, 0.35, Engine.Ease.out);
      });
    },

    card(title, sub, dur, block) {
      return new Promise(resolve => {
        this.cardView = { title, sub, t: 0, dur: dur || 3, resolve, block: block !== false };
      });
    },

    // ---------------------------------------------------------------- Update
    update(dt) {
      this.t += dt;
      for (let i = this.toasts.length - 1; i >= 0; i--) { this.toasts[i].t += dt; if (this.toasts[i].t > this.toasts[i].dur) this.toasts.splice(i, 1); }
      if (this.room) { this.room.t += dt; if (this.room.t > 3.2) this.room = null; }
      if (this.objectiveFlash > 0) this.objectiveFlash -= dt;
      if (this.cardView) {
        this.cardView.t += dt;
        if (this.cardView.t >= this.cardView.dur) { const r = this.cardView.resolve; this.cardView = null; r(); }
      }
      const confirm = Input.codePressed('Enter') || Input.codePressed('Space') || Input.codePressed('KeyE') || Input.mouse.clicked;
      if (this.choice) { this.updateChoice(confirm); return; }
      if (this.phoneView) { this.updatePhone(dt, confirm); return; }
      if (this.bubbleView) { this.updateBubble(dt, confirm); return; }
      if (this.dialogue) this.updateDialogue(dt, confirm);
    },
    updateBubble(dt, confirm) {
      const b = this.bubbleView;
      if (!b.done) {
        const before = Math.floor(b.shown);
        const flat = b.lines.join('\n');
        if (b.hold > 0) b.hold -= dt;
        else b.shown = Math.min(b.total, b.shown + dt * this.textSpeed * (Input.codeDown('ShiftLeft') ? 2.5 : 1));
        const after = Math.floor(b.shown);
        if (after > before) {
          const c = flat[after - 1];
          if ('.!?'.includes(c) && flat[after] === ' ') b.hold = 0.14;
          else if (c === ',' && flat[after] === ' ') b.hold = 0.06;
          if (c && c !== ' ' && (b.blipN++ % 2 === 0) && b.voice && window.Sound && Sound.blip) Sound.blip(b.voice);
        }
        if (b.shown >= b.total) b.done = true;
        if (b.ch) b.ch.talking = !b.done && b.hold <= 0;
        if (confirm) { b.shown = b.total; b.done = true; if (b.ch) b.ch.talking = false; this.eat(); }
      } else {
        if (b.ch) b.ch.talking = false;
        b.holdAfter -= dt;
        if (b.holdAfter <= 0 || confirm) {
          this.bubbleView = null;
          if (confirm) { snd('ui_next'); this.eat(); }
          b.resolve();
        }
      }
    },
    updateDialogue(dt, confirm) {
      const d = this.dialogue;
      if (!d.done) {
        const before = Math.floor(d.shown);
        const flat = d.lines.join('\n');
        if (d.hold > 0) d.hold -= dt;
        else d.shown = Math.min(d.total, d.shown + dt * this.textSpeed * (Input.codeDown('ShiftLeft') ? 2.5 : 1));
        const after = Math.floor(d.shown);
        if (after > before) {
          const c = flat[after - 1];
          if ('.!?'.includes(c) && flat[after] === ' ') d.hold = 0.18;
          else if (c === ',' && flat[after] === ' ') d.hold = 0.08;
          if (c && c !== ' ' && (d.blipN++ % 2 === 0)) {
            if (d.voice && window.Sound && Sound.blip) Sound.blip(d.voice);
            else if (!d.speaker) snd('type', 0.4);
          }
        }
        if (d.shown >= d.total) d.done = true;
        if (d.ch) d.ch.talking = !d.done && d.hold <= 0;
        if (confirm) { d.shown = d.total; d.done = true; this.eat(); }
      } else if (confirm) {
        if (d.ch) d.ch.talking = false;
        this.dialogue = null;
        snd('ui_next');
        this.eat();
        d.resolve();
      }
    },
    updateChoice(confirm) {
      const c = this.choice;
      const n = c.options.length;
      if (Input.codePressed('ArrowUp') || Input.codePressed('KeyW')) { c.idx = (c.idx + n - 1) % n; snd('ui_move'); }
      if (Input.codePressed('ArrowDown') || Input.codePressed('KeyS')) { c.idx = (c.idx + 1) % n; snd('ui_move'); }
      const r = this.choiceRect();
      const m = Input.mouse;
      let hover = -1;
      if (m.inside && m.x >= r.x && m.x <= r.x + r.w) {
        const i = Math.floor((m.y - r.y - 4 - (c.title ? 11 : 0)) / 11);
        if (i >= 0 && i < n) hover = i;
      }
      if (hover >= 0 && hover !== c.idx && (m.down || m.clicked || this.lastMouse !== m.x + ',' + m.y)) { c.idx = hover; }
      this.lastMouse = m.x + ',' + m.y;
      if (Input.mouse.clicked && hover < 0) return;
      if (Input.codePressed('Escape') && c.cancel >= 0) { this.choice = null; this.eat(); c.resolve(c.cancel); return; }
      if (confirm) { this.choice = null; snd('ui_select'); this.eat(); c.resolve(c.idx); }
    },
    choiceRect() {
      const c = this.choice;
      const h = c.options.length * 11 + 7 + (c.title ? 11 : 0);
      const w = Math.max(c.w, c.title ? Font.measure(c.title) + 12 : 0);
      return { x: W - w - 8, y: (this.dialogue ? BOX.y : H - 6) - h - 3, w, h };
    },
    updatePhone(dt, confirm) {
      const p = this.phoneView;
      p.t += dt;
      if (p.shown < p.msgs.length) {
        const m = p.msgs[p.shown];
        if (m.from !== 'roni') {
          p.typing -= dt;
          if (p.typing <= 0) { p.shown++; snd('phone_msg'); p.typing = 0.5 + Math.min(1.4, (p.msgs[p.shown] ? p.msgs[p.shown].text.length : 0) * 0.02); }
        } else { p.typing -= dt; if (p.typing <= 0) { p.shown++; snd('phone_send'); p.typing = 0.7; } }
        if (confirm) { p.shown = p.msgs.length; this.eat(); }
        return;
      }
      if (p.thread.reply && p.reply == null) {
        const n = p.thread.reply.length;
        if (Input.codePressed('ArrowUp') || Input.codePressed('KeyW')) { p.replyIdx = (p.replyIdx + n - 1) % n; snd('ui_move'); }
        if (Input.codePressed('ArrowDown') || Input.codePressed('KeyS')) { p.replyIdx = (p.replyIdx + 1) % n; snd('ui_move'); }
        const opts = p.thread.reply;
        const rw = Math.max(...opts.map(o => Font.measure(o))) + 20, rh = opts.length * 11 + 6;
        const rx = 196 - rw - 4, ry = Math.round(p.y) + 150 - rh - 12;
        const m = Input.mouse;
        let hover = -1;
        if (m.inside && m.x >= rx && m.x <= rx + rw && m.y >= ry && m.y <= ry + rh) {
          const i = Math.floor((m.y - ry - 4) / 11);
          if (i >= 0 && i < n) hover = i;
        }
        if (hover >= 0 && hover !== p.replyIdx && (m.down || m.clicked || this.lastPhoneMouse !== m.x + ',' + m.y)) {
          p.replyIdx = hover;
        }
        this.lastPhoneMouse = m.x + ',' + m.y;
        if (Input.mouse.clicked && hover < 0) return;
        if (confirm) {
          p.reply = p.replyIdx; snd('phone_send'); this.eat();
          p.msgs.push({ from: 'roni', text: p.thread.reply[p.reply] }); p.shown = p.msgs.length;
          if (p.thread.after && p.thread.after[p.reply]) { p.msgs.push({ from: p.thread.contactId || 'kallita', text: p.thread.after[p.reply] }); p.typing = 1; }
        }
        return;
      }
      if (confirm && p.t >= (p.thread.minHold || 0)) {
        this.eat();
        const res = p.reply == null ? -1 : p.reply;
        Engine.tween(p, { y: H + 4 }, 0.3, Engine.Ease.in).then(() => { if (this.phoneView === p) this.phoneView = null; p.resolve(res); });
        p.done = true;
      }
    },
    eat() { Input.consume('confirm'); Input.consume('interact'); Input.mouse.clicked = false; },

    // ---------------------------------------------------------------- Render
    render(ctx) {
      if (this.hidden) return;
      this.renderObjective(ctx);
      if (this.room) this.renderRoom(ctx);
      if (this.prompt && !this.busy) this.renderPrompt(ctx);
      this.renderToasts(ctx);
      if (this.bubbleView) this.renderBubble(ctx);
      if (this.dialogue) this.renderDialogue(ctx);
      if (this.choice) this.renderChoice(ctx);
      if (this.phoneView) this.renderPhone(ctx);
      if (this.cardView) this.renderCard(ctx);
    },
    renderBubble(ctx) {
      const b = this.bubbleView;
      const ch = b.ch;
      let anchorX = W / 2, anchorY = H / 2 - 20;
      if (ch && window.World) {
        const s = World.toScreen(ch.x + (ch.offX || 0), ch.y + (ch.offY || 0) + (ch.hopY || 0) - ch.height() - 4);
        anchorX = Math.round(s.x);
        anchorY = Math.round(s.y);
      }
      const bw = Math.max(26, Math.max(...b.lines.map(l => Font.measure(l))) + 10);
      const bh = b.lines.length * 10 + 6;
      const bx = Math.max(4, Math.min(W - bw - 4, Math.round(anchorX - bw / 2)));
      const by = Math.max(4, Math.min(H - bh - 10, Math.round(anchorY - bh - 5)));
      panel(ctx, bx, by, bw, bh, { fill: '#fbf7f2', edge: '#e6dcc8', outline: PALETTE.outline, flat: true });
      // Tail pointing to speaker's head.
      const tx = Math.max(bx + 5, Math.min(bx + bw - 6, anchorX));
      const ty = by + bh;
      ctx.fillStyle = PALETTE.outline;
      ctx.fillRect(tx - 2, ty - 1, 5, 2);
      ctx.fillRect(tx - 1, ty + 1, 3, 2);
      ctx.fillRect(tx, ty + 3, 1, 1);
      ctx.fillStyle = '#fbf7f2';
      ctx.fillRect(tx - 1, ty - 2, 3, 3);
      ctx.fillRect(tx, ty + 1, 1, 1);
      let left = Math.floor(b.shown);
      b.lines.forEach((line, i) => {
        if (left <= 0) return;
        const part = line.slice(0, left);
        Font.draw(ctx, part, bx + 5, by + 3 + i * 10, '#2a1e2e');
        left -= line.length + 1;
      });
    },
    renderPrompt(ctx) {
      const prefix = '— ';
      const keyW = Font.measure('E') + 5;
      const lines = Font.wrap(prefix + this.prompt, Math.min(200, W - keyW - 24));
      const maxLineW = Math.max(...lines.map(l => Font.measure(l)));
      const w = Math.min(W - 14, maxLineW + keyW + 8);
      const h = lines.length * 10 + 1;
      const x = Math.max(7, Math.min(W - w - 7, Math.round(W / 2 - w / 2)));
      const y = Math.max(7, Math.min(H - h - 7, 160 - (lines.length - 1) * 10));
      panel(ctx, x - 3, y - 3, w + 6, h + 6, { fill: 'rgba(29,22,38,0.92)' });
      const kw = keycap(ctx, 'E', x, y);
      lines.forEach((line, i) => Font.draw(ctx, line, x + kw + 4, y + 1 + i * 10, C.text));
      // Bouncing marker above the target object.
      const o = this.promptObj;
      if (o && o.bbox && window.World) {
        const top = o.layer === 'zone' ? o.interactionPoint.y - 30 : o.bbox.y - 4;
        const s = World.toScreen(o.layer === 'zone' ? o.interactionPoint.x : o.bbox.x + o.width / 2, top);
        const bob = Math.round(Math.sin(this.t * 5) * 1.5);
        const mx = Math.max(6, Math.min(W - 6, Math.round(s.x))), my = Math.max(4, Math.min(H - 6, Math.round(s.y) + bob));
        ctx.fillStyle = PALETTE.outline;
        ctx.fillRect(mx - 3, my - 1, 7, 2); ctx.fillRect(mx - 2, my + 1, 5, 1); ctx.fillRect(mx - 1, my + 2, 3, 1); ctx.fillRect(mx, my + 3, 1, 1);
        ctx.fillStyle = C.accent;
        ctx.fillRect(mx - 2, my - 1, 5, 1); ctx.fillRect(mx - 1, my, 3, 1); ctx.fillRect(mx, my + 1, 1, 1);
      }
    },
    renderToasts(ctx) {
      let y = 22;
      for (const t of this.toasts) {
        const a = Math.min(1, t.t * 6, (t.dur - t.t) * 3);
        ctx.globalAlpha = Math.max(0, a);
        const lines = Font.wrap(t.text, 220);
        const w = Math.max(...lines.map(l => Font.measure(l))) + 12, h = lines.length * 10 + 6;
        panel(ctx, W / 2 - w / 2, y, w, h, { fill: 'rgba(43,34,54,0.95)' });
        lines.forEach((l, i) => Font.drawCentered(ctx, l, W / 2, y + 3 + i * 10, C.text));
        y += h + 2;
        ctx.globalAlpha = 1;
      }
    },
    renderRoom(ctx) {
      const r = this.room, k = Math.min(1, r.t * 4, (3.2 - r.t) * 3);
      const w = Font.measure(r.text) + 14;
      const x = Math.round(-w + (w + 4) * Engine.Ease.out(Math.max(0, Math.min(1, k))));
      panel(ctx, x, 4, w, 15, { fill: C.bg });
      ctx.fillStyle = C.accent; ctx.fillRect(x + 4, 9, 2, 5);
      Font.draw(ctx, r.text, x + 9, 7, C.text);
    },
    renderObjective(ctx) {
      if (!this.objective || this.busy) return;
      const maxTextW = Math.min(180, W - 28);
      const lines = Font.wrap(this.objective, maxTextW);
      const w = Math.min(W - 8, Math.max(...lines.map(l => Font.measure(l))) + 18);
      const h = lines.length * 10 + 5;
      const x = Math.max(4, Math.min(W - w - 4, W - w - 4));
      const y = Math.max(4, Math.min(H - h - 4, 4));
      ctx.globalAlpha = 0.9;
      panel(ctx, x, y, w, h, { fill: 'rgba(29,22,38,0.85)', edge: this.objectiveFlash > 0 && Math.floor(this.t * 6) % 2 ? C.accent : C.panelLight });
      ctx.globalAlpha = 1;
      ctx.fillStyle = C.accent2;
      ctx.fillRect(x + 5, y + 6, 3, 3); ctx.fillRect(x + 6, y + 5, 1, 5); ctx.fillRect(x + 4, y + 7, 5, 1);
      lines.forEach((line, i) => Font.draw(ctx, line, x + 12, y + 3 + i * 10, C.text));
    },
    renderDialogue(ctx) {
      const d = this.dialogue;
      panel(ctx, BOX.x, BOX.y, BOX.w, BOX.h);
      let tx = BOX.x + 8;
      if (d.speaker) {
        // Portrait (2x) breaking out of the top edge.
        const pc = this.portrait;
        Characters.drawPortrait(pc.getContext('2d'), d.speaker, d.ch ? d.ch.expression : d.expr, this.t, { talking: !d.done && d.hold <= 0 });
        const px = BOX.x + 5, py = BOX.y - 12;
        panel(ctx, px - 2, py - 2, 56, 56, { fill: '#3a2f4a' });
        ctx.drawImage(pc, 0, 0, 26, 26, px, py, 52, 52);
        tx = BOX.x + 64;
        const nw = Font.measure(d.name) + 10;
        panel(ctx, tx - 2, BOX.y - 9, nw, 13, { fill: C.bg });
        Font.draw(ctx, d.name, tx + 3, BOX.y - 6, C.accent);
      }
      let left = Math.floor(d.shown);
      const col = d.speaker ? C.text : '#cfc4e0';
      d.lines.forEach((line, i) => {
        if (left <= 0) return;
        const part = line.slice(0, left);
        Font.draw(ctx, part, tx, BOX.y + 7 + i * 11, col);
        left -= line.length + 1;
      });
      if (d.done && Math.floor(this.t * 3) % 2 === 0) {
        const ax = BOX.x + BOX.w - 11, ay = BOX.y + BOX.h - 9;
        ctx.fillStyle = C.accent;
        ctx.fillRect(ax, ay, 5, 1); ctx.fillRect(ax + 1, ay + 1, 3, 1); ctx.fillRect(ax + 2, ay + 2, 1, 1);
      }
    },
    renderChoice(ctx) {
      const c = this.choice, r = this.choiceRect();
      panel(ctx, r.x, r.y, r.w, r.h, { fill: C.bg, edge: C.accent });
      let y = r.y + 4;
      if (c.title) { Font.draw(ctx, c.title, r.x + 6, y, C.accent2); y += 11; }
      c.options.forEach((o, i) => {
        const sel = i === c.idx;
        if (sel) {
          ctx.fillStyle = 'rgba(240,166,184,0.18)'; ctx.fillRect(r.x + 3, y - 1, r.w - 6, 10);
          const bx = r.x + 6 + (Math.floor(this.t * 4) % 2);
          Font.draw(ctx, '>', bx, y, C.accent);
        }
        Font.draw(ctx, o, r.x + 14, y, sel ? C.text : '#a99bb8');
        y += 11;
      });
    },
    renderPhone(ctx) {
      const p = this.phoneView, x = 196, y = Math.round(p.y), w = 104, h = 150;
      ctx.fillStyle = 'rgba(10,8,16,0.45)'; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = PALETTE.outline; ctx.fillRect(x + 2, y, w - 4, h); ctx.fillRect(x, y + 2, w, h - 4);
      ctx.fillStyle = '#4a4560'; ctx.fillRect(x + 2, y + 1, w - 4, h - 2); ctx.fillRect(x + 1, y + 2, w - 2, h - 4);
      ctx.fillStyle = '#f4efe6'; ctx.fillRect(x + 5, y + 10, w - 10, h - 22);
      ctx.fillStyle = '#2a2638'; ctx.fillRect(x + w / 2 - 8, y + 4, 16, 2);
      ctx.fillStyle = '#e9e1d2'; ctx.fillRect(x + w / 2 - 6, y + h - 9, 12, 5);
      // Header.
      ctx.fillStyle = PALETTE.ui.accent2; ctx.fillRect(x + 5, y + 10, w - 10, 14);
      const cid = p.thread.contactId || 'kallita';
      const pc = this.portrait;
      Characters.drawPortrait(pc.getContext('2d'), cid, p.thread.contactExpr || 'happy', this.t);
      ctx.fillStyle = '#fff'; ctx.fillRect(x + 8, y + 12, 10, 10);
      ctx.drawImage(pc, 8, 2, 10, 10, x + 8, y + 12, 10, 10);
      Font.draw(ctx, p.thread.contact || 'Kallita', x + 22, y + 13, '#1d1626');
      // Messages, newest at the bottom.
      ctx.save();
      ctx.beginPath(); ctx.rect(x + 5, y + 25, w - 10, h - 38); ctx.clip();
      const bubbles = [];
      for (let i = 0; i < p.shown; i++) bubbles.push(p.msgs[i]);
      let by = y + h - 16;
      const typing = p.shown < p.msgs.length && p.msgs[p.shown].from !== 'roni';
      if (typing) {
        by -= 12;
        ctx.fillStyle = '#ddd5e8'; ctx.fillRect(x + 8, by, 20, 10);
        for (let k = 0; k < 3; k++) { ctx.fillStyle = Math.floor(this.t * 4) % 3 === k ? '#5a5070' : '#9a90aa'; ctx.fillRect(x + 11 + k * 5, by + 4, 2, 2); }
        by -= 3;
      }
      for (let i = bubbles.length - 1; i >= 0; i--) {
        const m = bubbles[i], mine = m.from === 'roni';
        const lines = Font.wrap(m.text, w - 30);
        const bw = Math.max(...lines.map(l => Font.measure(l))) + 8, bh = lines.length * 10 + 3;
        by -= bh;
        const bx = mine ? x + w - 8 - bw : x + 8;
        ctx.fillStyle = mine ? '#f0a6b8' : '#ddd5e8';
        ctx.fillRect(bx + 1, by, bw - 2, bh); ctx.fillRect(bx, by + 1, bw, bh - 2);
        lines.forEach((l, j) => Font.draw(ctx, l, bx + 4, by + 2 + j * 10, '#1d1626'));
        by -= 3;
        if (by < y + 20) break;
      }
      ctx.restore();
      // Reply picker.
      if (p.shown >= p.msgs.length && p.thread.reply && p.reply == null) {
        const opts = p.thread.reply;
        const rw = Math.max(...opts.map(o => Font.measure(o))) + 20, rh = opts.length * 11 + 6;
        const rx = x - rw - 4, ry = y + h - rh - 12;
        panel(ctx, rx, ry, rw, rh, { fill: C.bg, edge: C.accent });
        opts.forEach((o, i) => {
          const sel = i === p.replyIdx;
          if (sel) Font.draw(ctx, '>', rx + 5, ry + 4 + i * 11, C.accent);
          Font.draw(ctx, o, rx + 13, ry + 4 + i * 11, sel ? C.text : '#a99bb8');
        });
      } else if (p.shown >= p.msgs.length && !p.done && p.t >= (p.thread.minHold || 0) && Math.floor(this.t * 2) % 2 === 0) {
        Font.drawCentered(ctx, 'E', x + w / 2, y + h + 2, C.text);
      }
    },
    renderCard(ctx) {
      const c = this.cardView;
      const a = Math.max(0, Math.min(1, c.t * 2, (c.dur - c.t) * 2));
      ctx.globalAlpha = a;
      ctx.fillStyle = 'rgba(14,10,22,0.82)'; ctx.fillRect(0, 62, W, 50);
      ctx.fillStyle = C.accent; ctx.fillRect(0, 62, W, 1); ctx.fillRect(0, 111, W, 1);
      Font.drawCentered(ctx, c.title, W / 2, 72, C.text, PALETTE.outline);
      if (c.sub) Font.drawCentered(ctx, c.sub, W / 2, 90, '#bfb2d2');
      ctx.globalAlpha = 1;
    }
  };

  window.UI = UI;
})();

