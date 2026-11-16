(function () {
  function element(tag, text, className) {
    const el = document.createElement(tag);
    if (text != null) el.textContent = text;
    if (className) el.className = className;
    return el;
  }
  const COMPLETED_KEY = 'a-year-anniversary-completed';
  const Menus = {
    screen: null, root: null, backScreen: 'title',
    get blocking() { return !!this.screen; },
    isCompleted() {
      try {
        if (localStorage.getItem(COMPLETED_KEY) === '1') return true;
      } catch (e) {}
      const save = window.Save && Save.read();
      return !!(save && (save.step === 'finished' || (save.flags && save.flags.ending)));
    },
    markCompleted() {
      try { localStorage.setItem(COMPLETED_KEY, '1'); } catch (e) {}
    },
    init() {
      Save.init();
      window.addEventListener('keydown', e => {
        const tag = e.target.tagName;
        if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return;
        if (this.screen) {
          if (e.code === 'Escape' && !['title', 'ending'].includes(this.screen)) {
            e.preventDefault(); e.stopImmediatePropagation();
            if (this.screen === 'confirm' && this.cancelAction) this.cancelAction();
            else this.screen === 'settings' ? this.back() : this.close();
          } else if (e.code !== 'F11') e.stopImmediatePropagation();
          return;
        }
        if (window.Investigation && Investigation.active || window.Album && Album.active) return;
        if (e.code === 'Escape' && Game.mode === 'play') { e.preventDefault(); e.stopImmediatePropagation(); this.pause(); }
        if (e.code === 'KeyF') { e.preventDefault(); e.stopImmediatePropagation(); this.fullscreen(); }
        if (Game.canControl() && (e.code === 'Tab' || e.code === 'KeyI')) {
          e.preventDefault(); e.stopImmediatePropagation(); this.screenPanel(e.code === 'Tab' ? 'journal' : 'inventory');
        }
      }, true);
      document.addEventListener('pointerdown', () => window.Sound && Sound.unlock(), { passive: true });
      document.addEventListener('keydown', () => window.Sound && Sound.unlock(), { passive: true });
    },
    make(screen, title, subtitle) {
      if (this.root) this.root.remove();
      this.screen = screen;
      this.root = element('section', null, 'menu-screen');
      this.root.setAttribute('aria-label', title);
      const card = element('div', null, 'menu-card');
      const completed = this.isCompleted();
      card.append(element('p', screen === 'title' ? (completed ? 'A SMALL, PERSONAL MYSTERY' : 'ONE SPECIAL EVENING') : (completed ? 'ANNIVERSARY' : 'A YEAR ANNIVERSARY!'), 'menu-eyebrow'));
      card.append(element('h1', title));
      if (subtitle) card.append(element('p', subtitle, 'menu-subtitle'));
      this.root.append(card); document.getElementById('overlay').append(this.root);
      Input.keys.clear(); Input.pressedCodes.clear(); UI.clearPrompt();
      return card;
    },
    button(parent, label, action, disabled = false) {
      const b = element('button', label, 'menu-button'); b.type = 'button'; b.disabled = disabled;
      b.addEventListener('click', () => { window.Sound && Sound.sfx('ui_select'); action(); });
      parent.append(b); return b;
    },
    async title() {
      this.initOnce();
      const completed = this.isCompleted();
      Game.mode = 'title'; Game.sandbox = false; Engine.paused = false;
      World.load('living', { lighting: completed ? 'dark' : 'evening' });
      const def = SCENE_LAYOUTS.s07_party;
      for (const id of ['roni', 'kallita']) {
        const ch = Characters.get(id); ch.configure({ ...def.characters[id], ...def.marks[id + '_sofa'], state: 'sitting', direction: id === 'roni' ? 'right' : 'left', controllable: false, carrying: [] }); World.addChar(ch);
      }
      World.setHidden('living_anniversary_banner', false); World.setObjState('living_fairy_lights', 'off', completed);
      Camera.follow(Game.player); Camera.focusPt = { x: 170, y: 145 }; Camera.zoom = 1; Camera.snap();
      UI.hidden = true; Engine.fadeAlpha = 0;
      const card = this.make(
        'title',
        completed ? 'ANNIVERSARY' : 'A YEAR\nANNIVERSARY!',
        completed ? 'Twelve memories. Someone who was always there.' : 'An evening together. One special year to celebrate.'
      );
      const actions = element('div', null, 'menu-actions'); card.append(actions);
      const start = this.button(actions, 'New Game', () => this.newGame());
      this.button(actions, 'Continue', () => this.continueGame(), !Save.read());
      this.button(actions, 'Settings', () => { this.backScreen = 'title'; this.settings(); });
      card.append(element('p', 'WASD / arrows · Shift to run · E to interact · Space for dialogue', 'menu-help'));
      start.focus();
    },
    initOnce() { if (!this.initialized) { this.initialized = true; this.init(); } },
    newGame() {
      window.Sound && Sound.unlock();
      if (Save.read()) this.confirm('Start a new anniversary?', 'This replaces your saved progress. Your settings stay the same.', () => this.begin(), () => this.title());
      else this.begin();
    },
    async begin() {
      this.close(); UI.hidden = false;
      Investigation.progress = { restored: [], markers: {}, notes: {}, hints: {} }; Album.selfies = {};
      window.Sound && Sound.mood('warm');
      await Engine.runScript(() => Scenes.start());
    },
    async continueGame() {
      window.Sound && Sound.unlock(); this.close(); UI.hidden = false;
      if (!await Save.load()) await this.title();
    },
    close() {
      if (this.root) this.root.remove(); this.root = null; this.screen = null;
      Engine.paused = false; Input.keys.clear(); Input.pressedCodes.clear();
    },
    pause() {
      Engine.paused = true;
      const card = this.make('pause', 'A QUIET MOMENT', 'The evening will wait.');
      const b = this.button(card, 'Resume', () => this.close());
      this.button(card, 'Save game', () => { if (Save.write()) UI.toast('Anniversary saved.'); }, Engine.inScript);
      this.button(card, 'Settings', () => { this.backScreen = 'pause'; this.settings(); });
      this.button(card, 'Main menu', () => this.confirm('Leave this evening?', 'Return to your latest save with Continue.', () => { this.close(); window.location.reload(); }, () => this.pause()), Engine.inScript);
      b.focus();
    },
    settings() {
      const card = this.make('settings', 'SETTINGS', 'Keep the atmosphere comfortable.');
      const grid = element('div', null, 'settings-grid'); card.append(grid);
      for (const [key, label, min, max, step] of [['master', 'Master volume', 0, 1, 0.05], ['music', 'Music volume', 0, 1, 0.05], ['sfx', 'Sound effects', 0, 1, 0.05], ['textSpeed', 'Text speed', 15, 100, 5]]) {
        const row = element('label', label); const input = element('input'); input.type = 'range'; input.min = min; input.max = max; input.step = step; input.value = Save.settings[key];
        const output = element('output', key === 'textSpeed' ? input.value : Math.round(input.value * 100) + '%');
        input.addEventListener('input', () => { Save.settings[key] = Number(input.value); output.textContent = key === 'textSpeed' ? input.value : Math.round(input.value * 100) + '%'; Save.saveSettings(); });
        row.append(input, output); grid.append(row);
      }
      const row = element('label', 'Screen shake'); const check = element('input'); check.type = 'checkbox'; check.checked = Save.settings.shake;
      check.onchange = () => { Save.settings.shake = check.checked; Save.saveSettings(); }; row.append(check); grid.append(row);
      this.button(card, 'Toggle fullscreen', () => this.fullscreen());
      this.button(card, 'Reset saved game', () => this.confirm('Reset saved progress?', 'This removes the saved story and investigation progress, not your settings.', () => { Save.reset(); this.settings(); }, () => this.settings()), !Save.read());
      this.button(card, 'Back', () => this.back()).focus();
    },
    back() { this.backScreen === 'pause' ? this.pause() : this.title(); },
    confirm(title, text, yes, no) {
      const card = this.make('confirm', title, text);
      this.cancelAction = no;
      this.button(card, 'Cancel', no).focus(); this.button(card, 'Confirm', yes);
    },
    screenPanel(kind) {
      Engine.paused = true;
      const card = this.make(kind, kind === 'journal' ? 'JOURNAL' : 'INVENTORY', UI.objective || 'An evening together.');
      const list = element('ul', null, 'menu-list');
      const data = kind === 'journal' ? Scenes.journal : Scenes.inventory;
      for (const text of data.length ? data : [kind === 'journal' ? 'Our story is still unfolding.' : 'Nothing carried right now.']) list.append(element('li', text));
      card.append(list);
      if (kind === 'inventory' && Album.selfies.party) this.button(card, 'View tonight\'s selfie', async () => { this.close(); await Engine.runScript(() => Album.showSelfie(Album.selfies.party, false)); });
      if (kind === 'inventory' && Scenes.flags.album) this.button(card, 'View photo album', async () => { this.close(); await Engine.runScript(() => Album.open()); });
      this.button(card, 'Back to the evening', () => this.close()).focus();
    },
    async fullscreen() {
      try {
        if (document.fullscreenElement) await document.exitFullscreen();
        else if (document.getElementById('game-root').requestFullscreen) await document.getElementById('game-root').requestFullscreen();
        else UI.toast('Fullscreen is unavailable in this browser.');
      } catch (e) { UI.toast('The browser did not allow fullscreen.'); }
    },
    ending(opts) {
      UI.hidden = true;
      this.markCompleted();
      if (opts && opts.theEnd) {
        if (this.root) this.root.remove();
        this.screen = 'ending';
        this.root = element('section', null, 'menu-screen menu-screen--the-end');
        this.root.setAttribute('aria-label', 'The End');
        const wrap = element('div', null, 'the-end-wrap');
        wrap.append(element('h1', 'THE END', 'the-end-title'));
        const btn = this.button(wrap, 'Return to main menu', () => { this.close(); window.location.reload(); });
        btn.classList.add('the-end-return');
        this.root.append(wrap);
        document.getElementById('overlay').append(this.root);
        Input.keys.clear(); Input.pressedCodes.clear(); UI.clearPrompt();
        return;
      }
      const card = this.make('ending', 'ANNIVERSARY', 'THE END.');
      this.button(card, 'Return to main menu', () => { this.close(); window.location.reload(); });
    },
    update(dt) { if (Game.mode === 'title' && World.layout) { World.update(dt); Camera.update(dt); } },
    render() {}
  };
  window.Menus = Menus;
})();

