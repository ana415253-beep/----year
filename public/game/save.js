(function () {
  const KEY = 'the-last-anniversary-save-v2', SETTINGS = 'the-last-anniversary-settings-v2';
  const defaults = { master: 0.7, music: 0.45, sfx: 0.7, textSpeed: 42, shake: true };
  const characterData = ch => ({ x: ch.x, y: ch.y, direction: ch.dir, outfit: ch.outfit, state: ch.state, expression: ch.expression, carrying: ch.carrying.slice(), visible: ch.visible, controllable: ch.controllable, bouquetType: ch.bouquetType });
  const Save = {
    settings: { ...defaults }, lastError: null,
    init() {
      try {
        const data = JSON.parse(localStorage.getItem(SETTINGS) || 'null');
        if (data) {
          for (const key of ['master', 'music', 'sfx']) if (Number.isFinite(data[key])) this.settings[key] = Math.max(0, Math.min(1, data[key]));
          if (Number.isFinite(data.textSpeed)) this.settings.textSpeed = Math.max(15, Math.min(100, data.textSpeed));
          if (typeof data.shake === 'boolean') this.settings.shake = data.shake;
        }
      } catch (e) { this.lastError = 'Settings could not be read.'; }
      this.applySettings();
    },
    applySettings() {
      UI.textSpeed = this.settings.textSpeed;
      window.Sound && Sound.setVolumes(this.settings);
    },
    saveSettings() {
      this.applySettings();
      try { localStorage.setItem(SETTINGS, JSON.stringify(this.settings)); }
      catch (e) { UI.toast('Settings could not be saved in this browser.'); }
    },
    read() {
      try {
        const data = JSON.parse(localStorage.getItem(KEY) || 'null');
        if (!data || data.version !== 2 || !SCENE_LAYOUTS[data.scene] || !WORLD_LAYOUTS[data.room] || !data.characters || !data.characters.roni) return null;
        const p = data.characters.roni;
        if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) return null;
        return data;
      } catch (e) { this.lastError = 'The saved game could not be read.'; return null; }
    },
    write() {
      if (!Scenes.current || Game.sandbox || ['s06_outfit', 's08_album'].includes(Scenes.current)) return false;
      const characters = {};
      for (const [id, ch] of Object.entries(Characters.all)) characters[id] = characterData(ch);
      const data = {
        version: 2, savedAt: new Date().toISOString(), scene: Scenes.current, step: Scenes.step,
        flags: Scenes.flags, inventory: Scenes.inventory, journal: Scenes.journal,
        room: World.roomId, lighting: World.light.mode, characters, objects: World.objState,
        investigation: window.Investigation ? Investigation.progress : { restored: [], markers: {}, notes: {}, hints: {} },
        selfies: window.Album ? Album.selfies : {}
      };
      try { localStorage.setItem(KEY, JSON.stringify(data)); this.lastError = null; return true; }
      catch (e) { this.lastError = 'Save failed: browser storage is full or disabled. Download your selfies and try again.'; UI.toast(this.lastError, 4); return false; }
    },
    async load() {
      const data = this.read();
      if (!data) { UI.toast(this.lastError || 'No readable saved game.'); return false; }
      Scenes.current = data.scene; Scenes.step = data.step; Scenes.flags = data.flags || {};
      Scenes.inventory = data.inventory || []; Scenes.journal = data.journal || [];
      Scenes.triggerBusy = false; World.objState = data.objects || {};
      Investigation.progress = { restored: [], markers: {}, notes: {}, hints: {}, ...data.investigation };
      Album.selfies = data.selfies || {};
      for (const [id, spawn] of Object.entries(data.characters)) {
        const targetId = id === 'kei' ? 'kallita' : id;
        const ch = Characters.get(targetId);
        if (ch) { ch.configure(spawn); ch.bouquetType = spawn.bouquetType || 'mixed'; }
      }
      Game.mode = 'play'; Game.sandbox = false;
      await Game.changeRoom(data.room, data.characters.roni, { instant: true, lighting: data.lighting });
      Game.player.configure(data.characters.roni); Game.player.controllable = true;
      if (Scenes.current === 's07_party' && Scenes.step === 'flowers') {
        World.setHidden('living_vase', false);
        World.setObjState('living_vase', 'bouquetType', 'mixed');
        const k = Characters.get('kallita');
        if (k) k.carrying = (k.carrying || []).filter(i => i !== 'bouquet');
        Scenes.step = 'cake';
      }
      window.Sound && Sound.mood(Scenes.flags.album ? 'investigation' : 'warm');
      Scenes.commit();
      if (Scenes.step === 'finished') { Game.mode = 'ending'; Menus.ending(); }
      return true;
    },
    reset() {
      try { localStorage.removeItem(KEY); localStorage.removeItem('a-year-anniversary-completed'); return true; }
      catch (e) { UI.toast('The browser could not reset this save.'); return false; }
    }
  };
  window.Save = Save;
})();

