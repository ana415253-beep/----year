(function () {
  const sound = name => window.Sound && Sound.sfx(name);
  const set = (id, key, value) => World.setObjState(id, key, value);
  const hide = (id, value = true) => World.setHidden(id, value);
  const roni = () => Game.player;
  const kallita = () => Game.kallita;

  const objectives = {
    s01_office: {
      computer: 'Shut down your computer at your desk',
      papers: 'Collect the messy papers on your desk',
      papers_bag: 'Collect the messy papers on your desk for your bag',
      bag: 'Put the messy papers inside your work bag',
      pack: 'Pick up your work bag and put the papers inside',
      leave: 'Take the elevator'
    },
    s02_street: { walk: 'Find Bloomery to the east' },
    s03_shop: { browse: 'Talk to Odette at the counter', collect: 'Collect your bouquet', leave: 'Leave Bloomery' },
    s04_street_night: { home: 'Walk east toward home' },
    s05_porch: { unlock: 'Unlock the front door' },
    s05_arrival: { coat: 'Hang up your bag and change clothes', surprise: 'Step into the living room' },
    s06_outfit: { handover: 'Give Kallita the flowers' },
    s07_party: {
      cake: 'Cut the anniversary cake',
      pizza: 'Eat pizza together',
      presents: 'Exchange anniversary presents',
      selfie: 'Take an anniversary photograph by the sofa',
      couch: 'Sit together on the couch'
    },
    s08_album: { reveal: 'Look through the album' },
    s09_studio: { computer: 'Open the old studio computer', archive: 'Restore the missing memories' },
    s10_finale: { return: 'Return to Kallita in the living room', selfie: 'Take one more photograph', finished: null }
  };

  const initialSteps = {
    s01_office: 'computer', s02_street: 'walk', s03_shop: 'browse', s04_street_night: 'home',
    s05_porch: 'unlock', s05_arrival: 'coat', s06_outfit: 'handover', s07_party: 'cake',
    s08_album: 'reveal', s09_studio: 'computer', s10_finale: 'return'
  };

  const Scenes = {
    current: null, step: null, flags: {}, inventory: [], journal: [], triggerBusy: false,
    ambientTimer: 0, distortion: 0,

    get layout() { return SCENE_LAYOUTS[this.current]; },
    mark(name, sid) { return SCENE_LAYOUTS[sid || this.current].marks[name]; },
    async move(ch, name, sid, opts) {
      const m = this.mark(name, sid);
      await ch.walkTo(m.x, m.y, opts);
    },
    addItem(item) { if (!this.inventory.includes(item)) this.inventory.push(item); },
    removeItem(item) { this.inventory = this.inventory.filter(i => i !== item); },
    note(text) { if (!this.journal.includes(text)) this.journal.push(text); },
    inStudioTechZone() {
      if (World.roomId !== 'bedroom') return false;
      const p = roni();
      if (!p) return false;
      const tx = Math.floor(p.x / 14), ty = Math.floor(p.y / 14);
      return tx >= 25 && tx <= 37 && ty >= 2 && ty <= 8;
    },
    syncStudioComputerObjective() {
      if (this.current !== 's09_studio' || this.step !== 'computer') return;
      const next = this.inStudioTechZone() ? objectives.s09_studio.computer : null;
      if (UI.objective !== next) UI.setObjective(next);
    },
    commit(step) {
      if (step) this.step = step;
      let obj = (objectives[this.current] || {})[this.step] || null;
      if (this.current === 's09_studio' && this.step === 'computer' && !this.inStudioTechZone()) obj = null;
      UI.setObjective(obj);
      window.Save && Save.write();
    },
    lightingFor(room) {
      if (room === 'office') return 'sunset';
      if (room === 'street') return this.current === 's04_street_night' ? 'night' : 'sunset';
      if (room === 'porch') return 'night';
      if (room === 'shop') return 'day';
      if (room === 'living' && this.current === 's05_arrival') return 'dark';
      return 'evening';
    },
    onRoomEnter(room) {
      if (!this.current || Game.sandbox || this.inRevisedEnding) return;
      const def = this.layout;
      if (room === def.room) {
        for (const id of Object.keys(def.characters)) {
          if (id !== 'roni') World.addChar(Characters.get(id));
        }
      }
      if (this.current === 's09_studio' && room === 'kitchen') {
        const ch = kallita();
        ch.configure({ ...SCENE_LAYOUTS.s09_studio.others.kitchen.kallita, carrying: [] });
        World.addChar(ch);
      }
    },
    async enter(id, preserve = false) {
      this.current = id; this.step = initialSteps[id];
      this.npcState = {};
      this._busState = null;
      const def = this.layout;
      for (const [key, spawn] of Object.entries(def.characters)) {
        if (preserve && key === 'roni') continue;
        if (preserve && key === 'kallita' && World.chars.includes(kallita())) continue;
        Characters.get(key).configure({ carrying: [], ...spawn });
      }
      if (!preserve || World.roomId !== def.room) {
        await Game.changeRoom(def.room, def.characters.roni, { lighting: this.lightingFor(def.room) });
        roni().configure({ carrying: [], ...def.characters.roni });
      } else {
        for (const key of Object.keys(def.characters)) World.addChar(Characters.get(key));
      }
      roni().controllable = true; Game.mode = 'play';
      WorldArt.clockMinutes = {
        s01_office: 18 * 60 + 15, s02_street: 18 * 60 + 25, s03_shop: 18 * 60 + 30,
        s04_street_night: 18 * 60 + 45, s05_porch: 18 * 60 + 55, s05_arrival: 18 * 60 + 55,
        s07_party: 19 * 60 + 10, s08_album: 20 * 60 + 30, s09_studio: 20 * 60 + 40
      }[id];
      if (id === 's01_office') {
        set('office_elevator', 'floor', 'G2');
        set('office_elevator', 'dir', null);
        set('office_elevator', 'openAmt', 0);
        set('office_elevator', 'called', false);
        hide('office_paperwork', false);
        set('office_paperwork', 'read', false);
      }
      if (id === 's04_street_night') {
        set('street_flower_shop', 'openAmt', 0);
        set('street_flower_shop', 'lightsOff', false);
        set('street_flower_shop', 'closed', false);
      }
      if (id === 's05_porch') {
        set('porch_front_door', 'openAmt', 0);
        set('porch_front_door', 'unlocked', false);
      }
      if (id === 's07_party') {
        hide('living_cake', false);
        set('living_cake', 'splitAmt', 0);
        set('living_cake', 'cut', false);
        set('living_cake', 'candles', true);
        hide('living_plate_01', true);
        hide('living_plate_02', true);
        set('living_plate_01', 'mode', null);
        set('living_plate_02', 'mode', null);
        hide('living_tripod_stored', false);
        hide('living_tripod', true);
        set('living_present_01', 'opened', false);
        set('living_present_01', 'giftType', null);
        set('living_present_02', 'opened', false);
        set('living_present_02', 'stage', null);
        set('living_pizza_box', 'open', false);
        set('living_pizza_box', 'slices', 0);
      }
      this.commit();
    },
    async start(id = 's01_office') {
      Game.sandbox = false; Game.mode = 'play';
      this.flags = {}; this.inventory = []; this.journal = []; World.objState = {};
      this.triggerBusy = false; this.distortion = 0;
      await this.enter(id);
      if (id === 's01_office') await this.officeIntro();
      else if (id === 's04_street_night') await this.streetNightClosing();
      else if (id === 's05_porch') await this.porchIntro();
      else if (id === 's05_arrival') await this.arrivalIntro();
    },

    // ------------------------------------------------------------------ SCENE 01
    async officeIntro() {
      roni().sitAmt = 1;
      roni().state = 'typing';
      roni().expression = 'neutral';
      await UI.card('6:15 PM', 'One ordinary anniversary', 2.0);
      await Camera.focus(this.mark('focus_window').x, this.mark('focus_window').y, 1.3, 0.9);
      await Engine.wait(0.7);
      await Camera.focus(this.mark('camera_desk').x, this.mark('camera_desk').y, 1.2, 0.9);
      await roni().play('lookAround', 0.7);
      roni().state = 'sitting';
      const penguin = Characters.get('penguin');
      await this.move(penguin, 'penguin_stop');
      await penguin.face(roni());
      await Camera.focus((roni().x + penguin.x) / 2, roni().y - 20, 1.15, 0.8);
      await UI.talk([
        ['penguin', "You're still here? It's getting late.", { expr: 'curious' }],
        ['roni', "I'm leaving now. I have something important tonight.", { expr: 'happy' }],
        ['penguin', 'Ooohh? is it about your wife?', { expr: 'happy' }],
        ['roni', 'Iya kan hari ini anniversary, udahlah mau balik dulu.', { expr: 'happy' }]
      ]);
      await penguin.play('wave');
      await Camera.release();
      this.note('Tonight is our anniversary. Bloomery should still be open.');
      this.commit('computer');
    },

    updateOfficeStep() {
      const f = this.flags;
      if (!f.computerOff) { this.commit('computer'); return; }
      if (!f.papersCollected && !f.hasBag) { this.commit('papers'); return; }
      if (!f.papersCollected && f.hasBag) { this.commit('papers_bag'); return; }
      if (f.papersCollected && !f.hasBag) { this.commit('bag'); return; }
      if (!f.papersPacked) { this.commit('pack'); return; }
      this.commit('leave');
    },

    isInteractable(o) {
      if (!this.current || Game.sandbox) return true;
      const id = o.id, s = this.step, f = this.flags;
      if (id === 'office_roni_desk') return this.current === 's01_office' && !f.computerOff;
      if (id === 'office_paperwork') return this.current === 's01_office' && !f.papersCollected;
      if (id === 'office_work_bag') return this.current === 's01_office' && (!f.hasBag || (f.papersCollected && !f.papersPacked));
      if (id === 'office_elevator') return this.current === 's01_office' && s === 'leave';
      if (id === 'shop_bouquet') return this.current === 's03_shop' && s === 'collect';
      if (id === 'shop_talk_spot') return this.current === 's03_shop';
      if (id === 'shop_entrance_door') return s === 'leave';
      if (id === 'street_shop_entrance') return this.current === 's02_street';
      if (id === 'porch_front_door') return this.current === 's05_porch';
      if (id === 'living_coat_rack') return this.current === 's05_arrival' && s === 'coat';
      if (id === 'living_front_door') return false;
      if (id === 'living_cake') return this.current === 's07_party' && s === 'cake';
      if (id === 'living_pizza_box') return this.current === 's07_party' && s === 'pizza';
      if (id === 'living_present_01' || id === 'living_present_02') return this.current === 's07_party' && s === 'presents';
      if (id === 'living_coffee_table') return this.current === 's09_studio' || (this.current === 's10_finale' && s === 'selfie');
      if (id === 'living_sofa') return (this.current === 's07_party' && ['selfie', 'couch'].includes(s)) || ['s09_studio', 's10_finale'].includes(this.current);
      if (id === 'living_kallita_talk') return this.current === 's07_party' && ['cake', 'pizza', 'presents'].includes(s);
      if (id === 'studio_computer') {
        if (this.current === 's09_studio' && s === 'computer') return this.inStudioTechZone();
        return ['s09_studio', 's10_finale'].includes(this.current);
      }
      return true;
    },
    promptFor(o) {
      if (o.id === 'office_paperwork') return 'Collect messy papers';
      if (o.id === 'office_work_bag' && this.flags.papersCollected && !this.flags.hasBag) return 'Put papers in work bag';
      if (o.id === 'porch_front_door') return 'Unlock front door';
      if (o.id === 'living_coffee_table') {
        if (this.current === 's10_finale') return 'Take one more photograph';
        return 'Examine photo album';
      }
      if (o.id === 'living_sofa') {
        if (this.current === 's07_party' && this.step === 'selfie') return 'Take anniversary photograph';
        if (this.current === 's07_party' && this.step === 'couch') return 'Sit together on the couch';
      }
      if (o.id === 'living_coat_rack') return 'Hang up bag and change clothes';
      if (o.id === 'studio_computer' && this.step !== 'computer') return 'Open photo archive';
      if (o.id.includes('lamp') || o.type.includes('lamp')) return o.state.off ? 'Turn on lamp' : 'Turn off lamp';
      if (o.type === 'filing_cabinet' || o.type === 'wardrobe' || o.type === 'refrigerator') return o.state.open ? 'Close' : 'Open';
      return o.prompt;
    },

    async interact(o) {
      if (!this.current || Game.sandbox) return false;
      const id = o.id;
      if (id === 'office_roni_desk') {
        roni().state = 'typing'; sound('type'); await roni().play('reach', 0.65);
        set('office_monitor', 'off', true); sound('ui_select');
        roni().state = 'idle';
        await roni().stand();
        this.flags.computerOff = true;
        this.updateOfficeStep(); return true;
      }
      if (id === 'office_paperwork') {
        if (roni().state === 'sitting' || roni().state === 'typing') await roni().stand();
        await roni().play('reach', 0.5);
        set('office_paperwork', 'read', true);
        hide('office_paperwork', true);
        sound('paper');
        this.flags.papersCollected = true;
        if (this.flags.hasBag) {
          await roni().play('adjustBag', 0.55);
          sound('bag');
          this.flags.papersPacked = true;
          this.addItem('Desk papers (packed)');
          UI.toast('Collected all papers and tucked them inside your bag.');
        } else {
          if (!roni().carrying.includes('papers')) roni().carrying.push('papers');
          UI.toast('Collected all the messy papers. Put them in your work bag.');
        }
        this.updateOfficeStep(); return true;
      }
      if (id === 'office_work_bag') {
        if (roni().state === 'sitting' || roni().state === 'typing') await roni().stand();
        await roni().play('reach', 0.45);
        if (!this.flags.hasBag) {
          hide(id, true);
          this.flags.hasBag = true;
          this.addItem('Worker bag');
        }
        roni().carrying = roni().carrying.filter(i => i !== 'papers');
        if (!roni().carrying.includes('work_bag')) roni().carrying.push('work_bag');
        sound('bag');
        await roni().play('adjustBag', 0.6);
        if (this.flags.papersCollected && !this.flags.papersPacked) {
          sound('paper');
          this.flags.papersPacked = true;
          this.addItem('Desk papers (packed)');
          UI.toast('All papers tucked safely inside your work bag.');
        }
        this.updateOfficeStep(); return true;
      }
      if (id === 'office_elevator') {
        const elev = World.get('office_elevator');
        if (elev && (elev.state.openAmt || 0) < 0.6) {
          set(id, 'called', true); set(id, 'floor', 'G2'); set(id, 'dir', null); sound('ui_select');
          await Engine.wait(0.6);
          set(id, 'dir', 'up');
          for (const fl of ['G1', 'L', 'M', '1', '2']) {
            set(id, 'floor', fl); sound('ui_select');
            await Engine.wait(0.32);
          }
          set(id, 'floor', '3'); set(id, 'dir', null); sound('bell');
          await Engine.tween(elev.state, { openAmt: 1 }, 0.65, Engine.Ease.out);
        }
        await this.move(roni(), 'elevator_inside', null, { direct: true });
        await roni().face('down');
        await Engine.wait(0.15);
        sound('door_close');
        if (elev) {
          await Engine.tween(elev.state, { openAmt: 0 }, 0.55, Engine.Ease.inOut);
          roni().visible = false;
        } else {
          roni().visible = false;
        }
        await Engine.wait(0.25);
        await this.enter('s02_street'); await UI.card('6:25 PM', 'Maple Street', 1.8); return true;
      }
      if (id === 'street_shop_entrance') {
        const front = World.get('street_flower_shop');
        await roni().walkTo(730, 129, { direct: true });
        await roni().face('up');
        await roni().play('reach', 0.45);
        sound('bell'); sound('door_open');
        if (front) {
          front.state.openAmt = 0; front.state.bellT = 1.0;
          await Engine.tween(front.state, { openAmt: 1 }, 0.45);
        }
        await Engine.wait(0.15);
        await roni().walkTo(730, 123, { direct: true });
        await Engine.wait(0.15);
        await this.enter('s03_shop');
        await Camera.focus(225, 128, 1.15, 0.9);
        await Engine.wait(0.6);
        await Camera.release();
        return true;
      }
      if (id === 'shop_talk_spot') {
        if (this.step !== 'browse') { await UI.say('owl', 'Fresh stems wrapped with care. Enjoy your evening!'); return true; }
        const owl = Characters.get('owl');
        await this.move(owl, 'owl_counter', null, { direct: true });
        await owl.face('down');
        await Camera.focus((roni().x + owl.x) / 2, roni().y - 25, 1.2, 0.8);
        await UI.talk([
          ['roni', 'Hi, oh wow these flowers are so pretty. Do you still have sunflowers and peonies? i want them mixed in a bouquet', { expr: 'excited' }],
          ['owl', 'Of course. Are they for someone special?', { expr: 'happy' }],
          ['roni', "My wife. It's our anniversary.", { expr: 'happy' }],
          ['owl', "Oh how sweet. Wait here I'll prepare it for you", { expr: 'happy' }]
        ]);
        await this.move(owl, 'owl_wrap', null, { direct: true }); await owl.face('up');
        await owl.play('reach', 0.9); sound('wrap'); await owl.play('cut', 1.2);
        set('shop_bouquet', 'bouquetType', 'mixed'); hide('shop_bouquet', false);
        await this.move(owl, 'owl_counter', null, { direct: true }); await owl.face('down');
        await Camera.release(); this.commit('collect'); return true;
      }
      if (id === 'shop_bouquet') {
        await roni().play('reach'); hide(id); roni().carrying.push('bouquet'); roni().bouquetType = 'mixed';
        sound('cash'); this.addItem('Sunflower and peony bouquet'); roni().emote('heart');
        await Engine.wait(0.4);
        sound('phone_msg');
        roni().state = 'phone';
        await UI.phone({
          contact: 'Kallita',
          messages: [
            { from: 'kallita', text: "Don't take too long. I have something for you <3" }
          ]
        });
        roni().expression = 'happy';
        roni().state = 'idle'; this.commit('leave'); return true;
      }
      if (id === 'shop_entrance_door') {
        sound('door_open'); o.state.openAmt = 0; await Engine.tween(o.state, { openAmt: 1 }, 0.4);
        await this.enter('s04_street_night');
        await UI.card('6:45 PM', 'Walking home', 1.8);
        await this.streetNightClosing();
        return true;
      }
      if (id === 'porch_front_door') {
        o.state.openAmt = o.state.openAmt || 0;
        await roni().play('unlock', 0.55);
        sound('unlock');
        o.state.unlocked = true;
        await Engine.wait(0.2);
        await roni().play('reach', 0.35);
        sound('door_open');
        await Engine.tween(o.state, { openAmt: 1 }, 0.65, Engine.Ease.out);
        await Engine.wait(0.2);
        await this.move(roni(), 'porch_inside', null, { direct: true });
        await Engine.wait(0.12);
        await this.enter('s05_arrival');
        await this.arrivalIntro();
        return true;
      }
      if (id === 'living_coat_rack') { await this.changeClothes(); return true; }
      if (id === 'living_cake' && this.current === 's07_party' && this.step === 'cake') { await this.cutCake(); return true; }
      if (id === 'living_pizza_box' && this.current === 's07_party' && this.step === 'pizza') { await this.pizzaDinner(); return true; }
      if ((id === 'living_present_01' || id === 'living_present_02') && this.current === 's07_party' && this.step === 'presents') {
        await this.exchangePresents(); return true;
      }
      if (id === 'living_sofa' && this.current === 's07_party' && this.step === 'selfie') {
        await this.selfie(false);
        this.commit('couch'); return true;
      }
      if (id === 'living_sofa' && this.current === 's07_party' && this.step === 'couch') {
        await this.couchConversation(); return true;
      }
      if (id === 'living_coffee_table' && this.current === 's10_finale') { await this.selfie(true); return true; }
      if (id === 'living_coffee_table' && this.current === 's09_studio') { await Album.open(); return true; }
      if (id === 'studio_computer') { await this.computer(); return true; }
      if (id === 'living_kallita_talk') {
        await this.talkToKallita();
        return true;
      }
      if (id === 'living_present_01' || id === 'living_present_02') {
        UI.toast('Wait until it is time to exchange anniversary presents.');
        return true;
      }
      if (o.to) return false;
      return await this.examine(o);
    },

    // ------------------------------------------------------------------ SCENE 04 NIGHT CLOSING
    async streetNightClosing() {
      const owl = Characters.get('owl');
      const front = World.get('street_flower_shop');
      if (!owl || !front) return;
      owl.x = 730; owl.y = 123; owl.direction = 'down'; owl.visible = true;
      front.state.lightsOff = false; front.state.closed = false; front.state.openAmt = 0.85;
      await Promise.all([
        roni().walkTo(754, 182, { direct: true }),
        Camera.focus(730, 146, 1.15, 0.7)
      ]);
      await roni().face('up');
      await Engine.wait(0.15);
      // Shop interior lights turn off as Odette exits Bloomery
      set('street_flower_shop', 'lightsOff', true);
      sound('ui_select');
      await owl.walkTo(730, 133, { direct: true, speed: 32 });
      await owl.face('up');
      // Door closes and OPEN sign switches to closed
      await Engine.tween(front.state, { openAmt: 0 }, 0.35, Engine.Ease.inOut);
      set('street_flower_shop', 'closed', true);
      sound('door_close');
      await Engine.wait(0.2);
      // Odette locks the front door visibly before leaving
      await owl.play('unlock', 1.0);
      sound('unlock');
      await Engine.wait(0.25);
      await owl.walkTo(730, 184, { direct: true, speed: 34 });
      await Engine.wait(0.1);
      await owl.walkTo(548, 184, { direct: true, speed: 44 });
      owl.visible = false;
      await Camera.release();
    },
    async talkToKallita() {
      const r = roni(), k = kallita();
      if (!r || !k || !k.visible) return;
      k.stopPath(false);
      r.expression = 'happy'; k.expression = 'happy';
      const dirR = r.x <= k.x ? 'right' : 'left';
      const dirK = dirR === 'right' ? 'left' : 'right';
      await Promise.all([r.face(dirR), k.face(dirK)]);
      r.lookTarget = k; k.lookTarget = r;

      this.flags.kallitaTalkCount = (this.flags.kallitaTalkCount || 0) + 1;
      const shouldAffection = !this.flags.justAffection && (this.flags.kallitaTalkCount === 2 || Math.random() < 0.45);
      this.flags.justAffection = shouldAffection;

      if (shouldAffection) {
        const kind = this.flags.lastAffection === 'hug' ? 'kiss' : (Math.random() < 0.5 ? 'hug' : 'kiss');
        this.flags.lastAffection = kind;
        const sideSign = r.x <= k.x ? -1 : 1;
        let closeX = k.x + sideSign * 13;
        if (!World.canStand(closeX, k.y, r, true)) {
          const altX = k.x - sideSign * 13;
          if (World.canStand(altX, k.y, r, true)) closeX = altX;
        }
        if (World.canStand(closeX, k.y, r, true)) {
          await r.walkTo(closeX, k.y, { direct: true, speed: 36 });
        }
        const fR = r.x <= k.x ? 'right' : 'left';
        const fK = fR === 'right' ? 'left' : 'right';
        await Promise.all([r.face(fR), k.face(fK)]);
        r.lookTarget = k; k.lookTarget = r;
        r.emote('heart'); k.emote('heart');
        r.expression = 'tender'; k.expression = 'tender';
        await Promise.all([
          r.play(kind, kind === 'hug' ? 1.15 : 0.95),
          k.play(kind, kind === 'hug' ? 1.15 : 0.95)
        ]);
        r.expression = 'happy'; k.expression = 'happy';
        if (kind === 'hug') {
          await UI.talk([['kallita', 'Come here, sayang. Happy one year.', { expr: 'tender' }], ['roni', 'Best anniversary ever.', { expr: 'happy' }]]);
        } else {
          await UI.talk([['kallita', 'Mwah. Okay, back to celebrating!', { expr: 'happy' }], ['roni', 'Hehe, love you too.', { expr: 'happy' }]]);
        }
        const backSign = r.x <= k.x ? -1 : 1;
        const backX = k.x + backSign * 18;
        if (Math.abs(r.x - k.x) < 16 && World.canStand(backX, k.y, r, true)) {
          await r.walkTo(backX, k.y, { direct: true, speed: 36 });
          await r.face(r.x <= k.x ? 'right' : 'left');
        }
      } else {
        const lines = [
          [['roni', 'You really kept all this a secret?', { expr: 'curious' }], ['kallita', 'I wanted tonight to feel special!', { expr: 'laughing' }]],
          [['kallita', 'How was work today, love?', { expr: 'curious' }], ['roni', 'All I could think about was getting home to you.', { expr: 'happy' }]],
          [['roni', 'The living room looks so cozy with those fairy lights.', { expr: 'happy' }], ['kallita', 'I hung them right before you got home!', { expr: 'excited' }]]
        ];
        const idx = (this.flags.kallitaTalkCount - 1) % lines.length;
        await UI.talk(lines[idx]);
      }
      r.lookTarget = null; k.lookTarget = null;
    },
    updateNightBus(dt) {
      if (this.current !== 's04_street_night' || World.roomId !== 'street') return;
      const otto = Characters.get('otto');
      const willow = Characters.get('willow');
      const bramble = Characters.get('bramble');
      const milo = Characters.get('milo');
      const curb = this.mark('bus_stop_curb', 's04_street_night') || { x: 506, y: 222 };
      const st = this._busState = this._busState || { phase: 'pending', timer: 0, car: null, ottoDone: false, willowDone: false, willowSent: false };
      st.timer += dt;

      if (st.phase === 'pending') {
        if (st.timer >= 2.2 || (roni().x < 650 && st.timer >= 0.8)) {
          World.cars = World.cars.filter(c => Math.abs(c.y - 244) > 6);
          const spawnX = Math.max(780, Math.round(Camera.x + Camera.viewW() + 80));
          st.car = { kind: 'bus', scripted: true, x: spawnX, y: 244, dir: -1, col: '#39609c', doorAmt: 0 };
          World.cars.push(st.car);
          st.phase = 'approaching';
          st.timer = 0;
        }
      } else if (st.phase === 'approaching') {
        const stopX = 530;
        const dist = st.car.x - stopX;
        const speed = dist > 70 ? 74 : Math.max(20, dist * 1.15);
        st.car.x -= speed * dt;
        if (dist < 110 && otto && otto.visible && !otto.moving) otto.face('down');
        if (dist < 100 && willow && willow.visible && !willow.moving) willow.face('down');
        if (st.car.x <= stopX) {
          st.car.x = stopX;
          st.phase = 'opening';
          st.timer = 0;
          if (Math.abs(roni().x - stopX) < 240) sound('door_open');
        }
      } else if (st.phase === 'opening') {
        st.car.doorAmt = Math.min(1, st.timer / 0.45);
        if (st.timer >= 0.55) {
          st.car.doorAmt = 1;
          st.phase = 'boarding';
          st.timer = 0;
          if (otto && otto.visible) {
            otto.stopPath(false);
            otto.walkTo(curb.x - 2, curb.y, { direct: true, speed: 34 }).then(() => {
              if (this.current !== 's04_street_night') return;
              otto.face('down');
              otto.visible = false;
              st.ottoDone = true;
            }).catch(() => { st.ottoDone = true; });
          } else st.ottoDone = true;
        }
      } else if (st.phase === 'boarding') {
        if (!st.willowSent && st.timer >= 0.4) {
          st.willowSent = true;
          if (willow && willow.visible) {
            willow.stopPath(false);
            willow.walkTo(curb.x + 3, curb.y, { direct: true, speed: 34 }).then(() => {
              if (this.current !== 's04_street_night') return;
              willow.face('down');
              willow.visible = false;
              st.willowDone = true;
            }).catch(() => { st.willowDone = true; });
          } else st.willowDone = true;
        }
        if ((st.ottoDone && st.willowDone) || st.timer >= 4.5) {
          if (otto) otto.visible = false;
          if (willow) willow.visible = false;
          if (bramble && bramble.visible) { bramble.face('down'); bramble.emote('...'); }
          if (milo && milo.visible) { milo.face('down'); milo.play('wave', 0.7); }
          st.phase = 'closing';
          st.timer = 0;
          if (Math.abs(roni().x - 530) < 240) sound('door_close');
        }
      } else if (st.phase === 'closing') {
        st.car.doorAmt = Math.max(0, 1 - st.timer / 0.45);
        if (st.timer >= 0.65) {
          st.car.doorAmt = 0;
          st.phase = 'departing';
          st.timer = 0;
        }
      } else if (st.phase === 'departing') {
        const accel = Math.min(82, 22 + st.timer * 48);
        st.car.x -= accel * dt;
        if (st.car.x < -120) {
          World.cars = World.cars.filter(c => c !== st.car);
          st.car = null;
          st.phase = 'done';
        }
      }
    },

    // ------------------------------------------------------------------ SCENE 05
    async porchIntro() {
      await UI.card('6:55 PM', 'Home', 1.8);
      await Camera.focus(160, 128, 0.92, 0.7);
      await Engine.wait(0.4);
      await Camera.release();
      this.commit('unlock');
    },
    async arrivalIntro() {
      set('living_fairy_lights', 'off', true); set('living_crt_tv', 'on', false);
      Camera.focusPt = { x: 82, y: 205 }; Camera.zoom = 1.12; Camera.snap();
      sound('door_close');
      await Promise.all([
        roni().walkTo(96, 224, { direct: true }),
        Camera.focus(roni().x + 48, roni().y - 24, 1.25, 1.3)
      ]);
      await UI.say('roni', "Sayang I'm home.", { expr: 'happy' });
      await roni().play('lookAround', 1.1);
      await Engine.wait(0.8);
      await UI.say(null, 'No answer.');
      await Camera.release();
      this.commit('coat');
    },

    // ------------------------------------------------------------------ SCENE 06
    async changeClothes() {
      await roni().face('down'); await roni().play('reach'); sound('bag');
      roni().carrying = roni().carrying.filter(i => i !== 'work_bag');
      set('living_coat_rack', 'bag', true); set('living_coat_rack', 'coat', true);
      this.removeItem('Worker bag');
      roni().changing = true; roni().changeAmt = 0;
      await Engine.tween(roni(), { changeAmt: 0.5 }, 0.7);
      roni().outfit = 'roni_casual';
      await Engine.tween(roni(), { changeAmt: 1 }, 0.7); roni().changing = false;
      await roni().play('stretch', 0.6);
      this.flags.changed = true; this.commit('surprise');
    },
    async surprise() {
      await this.move(roni(), 'roni_surprise');
      this.current = 's06_outfit'; this.step = 'handover';
      kallita().visible = true; kallita().state = 'idle';
      hide('living_anniversary_banner', false); set('living_fairy_lights', 'off', false);
      await Promise.all([this.move(kallita(), 'kallita_surprise', 's05_arrival'), World.fadeLighting('evening', 1.4)]);
      await Promise.all([roni().face(kallita()), kallita().face(roni())]);
      roni().expression = 'surprised'; roni().emote('!'); Camera.shake(1.2, 0.25); await roni().play('surprised');
      await Camera.focus((roni().x + kallita().x) / 2, roni().y - 26, 1.25, 0.9);
      await UI.talk([
        ['kallita', 'Suprise sayang hehe', { expr: 'excited' }],
        ['kallita', 'Happy anniversary, love.', { expr: 'happy' }],
        ['roni', 'Hehehe Happy anniversary too, sweetheart. I got something for you.', { expr: 'happy' }]
      ]);
      await Promise.all([roni().play('give', 0.8), kallita().play('reach', 0.8)]);
      roni().carrying = roni().carrying.filter(i => i !== 'bouquet');
      kallita().carrying = ['bouquet'];
      this.removeItem('Sunflower and peony bouquet');
      kallita().bouquetType = 'mixed';
      await UI.say('roni', 'I got something for you too.', { expr: 'happy' });
      await kallita().play('inspect', 0.9);
      kallita().emote('heart');
      await UI.say('kallita', 'These flowers are so pretty.. i love it so much! it smells nice too, thank you sayang', { expr: 'excited' });
      await Promise.all([roni().play('bow'), kallita().play('bow')]);
      this.flags.surprise = true;
      // Kallita places the bouquet she is holding into the vase on the coffee table herself.
      await this.move(kallita(), 'kallita_vase', 's06_outfit');
      await kallita().face('down');
      await kallita().play('reach', 0.65);
      hide('living_vase', false); set('living_vase', 'bouquetType', 'mixed');
      kallita().carrying = [];
      sound('paper');
      await kallita().walkTo(SCENE_LAYOUTS.s07_party.characters.kallita.x, SCENE_LAYOUTS.s07_party.characters.kallita.y);
      await kallita().face('left');
      await Camera.release();
      await this.enter('s07_party', true);
      this.note('Kallita surprised me with decorations, cake, pizza, and presents.');
    },

    // ------------------------------------------------------------------ SCENE 07
    async cutCake() {
      await Promise.all([
        this.move(roni(), 'roni_cake', 's07_party'),
        this.move(kallita(), 'kallita_cake', 's07_party')
      ]);
      await Promise.all([roni().face('up'), kallita().face('up')]);
      const cakeObj = World.get('living_cake');
      roni().lookTarget = cakeObj;
      kallita().lookTarget = cakeObj;
      await Camera.focus(150, 186, 1.35, 0.75);
      set('living_cake', 'candles', false);
      await Engine.wait(0.25);
      // Roni & Kallita cut the cake together while both face and look toward it
      sound('cut');
      await Promise.all([
        roni().play('cut', 1.15),
        kallita().play('cut', 1.15),
        cakeObj ? Engine.tween(cakeObj.state, { splitAmt: 1 }, 0.95, Engine.Ease.inOut) : Engine.wait(0.95)
      ]);
      await Engine.wait(0.2);
      // Place two neatly separated cake slices on separate plates on the coffee table
      hide('living_cake', true);
      set('living_plate_01', 'mode', 'slice');
      set('living_plate_02', 'mode', 'slice');
      hide('living_plate_01', false);
      hide('living_plate_02', false);
      sound('paper');
      await Engine.wait(0.45);
      // Roni picks up one slice plate, turns to look directly at Kallita with a warm smile, and feeds her a bite
      roni().expression = 'happy'; kallita().expression = 'happy';
      await roni().play('reach', 0.4);
      hide('living_plate_01', true);
      roni().carrying.push('cake_plate');
      roni().lookTarget = kallita(); kallita().lookTarget = roni();
      await Promise.all([roni().face(kallita()), kallita().face(roni())]);
      roni().expression = 'happy'; kallita().expression = 'happy';
      sound('eat');
      await Promise.all([roni().play('give', 1.05), kallita().play('eat_cake', 1.05)]);
      await Engine.wait(0.15);
      // Roni sets the plate back down on the table, then both laugh together
      roni().lookTarget = World.get('living_plate_01');
      await roni().face('up');
      await roni().play('reach', 0.35);
      roni().carrying = roni().carrying.filter(i => i !== 'cake_plate');
      hide('living_plate_01', false);
      roni().lookTarget = kallita(); kallita().lookTarget = roni();
      await Promise.all([roni().face(kallita()), kallita().face(roni())]);
      roni().expression = 'laughing'; kallita().expression = 'laughing';
      roni().emote('heart'); kallita().emote('heart');
      await Promise.all([roni().play('laugh', 1.25), kallita().play('laugh', 1.25)]);
      // Fade to black screen, then return with empty plates holding only a few cake crumbs
      await Engine.fade(1, 0.7, '#000');
      set('living_plate_01', 'mode', 'crumbs');
      set('living_plate_02', 'mode', 'crumbs');
      roni().lookTarget = null; kallita().lookTarget = null;
      roni().expression = 'happy'; kallita().expression = 'happy';
      await Engine.wait(0.45);
      await Engine.fade(0, 0.7, '#000');
      await Camera.release();
      await kallita().walkTo(SCENE_LAYOUTS.s07_party.characters.kallita.x, SCENE_LAYOUTS.s07_party.characters.kallita.y);
      this.commit('pizza');
    },
    async pizzaDinner() {
      await Promise.all([
        this.move(roni(), 'roni_table', 's07_party'),
        this.move(kallita(), 'kallita_table', 's07_party')
      ]);
      // Roni and Kallita turn to look directly at each other and smile warmly
      await Promise.all([roni().face(kallita()), kallita().face(roni())]);
      roni().lookTarget = kallita(); kallita().lookTarget = roni();
      roni().expression = 'happy'; kallita().expression = 'happy';
      await Camera.focus(178, 188, 1.32, 0.75);
      await Engine.wait(0.45);
      await UI.bubble('roni', 'mam pizzanya juga yuk', { expr: 'happy', holdAfter: 1.5 });
      await UI.bubble('kallita', 'ayuk numpung masih anget', { expr: 'happy', holdAfter: 1.5 });
      // After talking, both turn their attention toward the pizza
      const pizza = World.get('living_pizza_box');
      roni().lookTarget = pizza; kallita().lookTarget = pizza;
      await Promise.all([roni().face('up'), kallita().face('up')]);
      await Engine.wait(0.25);
      // Open the box to reveal a whole, untouched pizza first
      await roni().play('reach', 0.45);
      set('living_pizza_box', 'open', true);
      set('living_pizza_box', 'slices', 0);
      sound('paper');
      await Engine.wait(0.55);
      // Eat slice by slice (1 slice disappearing at a time, synchronized with eating animations & pauses)
      for (let s = 1; s <= 6; s++) {
        const eater = s % 2 === 1 ? roni() : kallita();
        eater.expression = 'happy';
        set('living_pizza_box', 'slices', s);
        sound('eat');
        await eater.play('eat', 0.8);
        if (s < 6) await Engine.wait(0.25);
      }
      await Engine.wait(0.25);
      roni().lookTarget = null; kallita().lookTarget = null;
      await Camera.release();
      await kallita().walkTo(SCENE_LAYOUTS.s07_party.characters.kallita.x, SCENE_LAYOUTS.s07_party.characters.kallita.y);
      this.commit('presents');
    },
    async exchangePresents() {
      await Promise.all([
        this.move(roni(), 'roni_presents', 's07_party'),
        this.move(kallita(), 'kallita_presents', 's07_party')
      ]);
      // Roni (left) by the blue box, Kallita (right) by the red box
      await Promise.all([roni().face(kallita()), kallita().face(roni())]);
      roni().lookTarget = kallita(); kallita().lookTarget = roni();
      roni().expression = 'happy'; kallita().expression = 'happy';
      await Camera.focus(170, 162, 1.32, 0.8);
      // Kallita turns toward the RED gift box on the right and opens it
      const redBox = World.get('living_present_01');
      const blueBox = World.get('living_present_02');
      await roni().play('give', 0.55);
      kallita().lookTarget = redBox;
      await kallita().face('right');
      await kallita().play('reach', 0.65);
      set('living_present_01', 'giftType', 'kallita_gifts');
      set('living_present_01', 'opened', true); sound('paper');
      World.burst('sparkle', redBox.x, redBox.y - 6, 8);
      kallita().expression = 'excited'; kallita().emote('heart');
      await Engine.wait(0.55);
      kallita().lookTarget = roni();
      await kallita().face(roni());
      await Engine.wait(0.35);
      // Roni turns toward the BLUE gift box on the left and opens it
      await kallita().play('give', 0.55);
      roni().lookTarget = blueBox;
      await roni().face('left');
      await roni().play('reach', 0.65);
      set('living_present_02', 'stage', 'noodle_box'); sound('paper');
      await UI.bubble('roni', 'BENERAN INIEHH ISINYA INDOMIE??', { expr: 'excited', holdAfter: 1.7 });
      // Opening the Indomie box reveals a big chubby hamster plushie inside
      await roni().play('reach', 0.55);
      set('living_present_02', 'stage', 'hamster_plushie');
      set('living_present_02', 'opened', true); sound('paper');
      roni().lookTarget = kallita();
      await roni().face(kallita());
      roni().expression = 'surprised'; roni().emote('!');
      await Engine.wait(0.45);
      await UI.bubble('roni', 'oh.. awhh this is cute thanks love', { expr: 'tender', holdAfter: 1.9 });
      roni().expression = 'happy'; kallita().expression = 'happy';
      roni().emote('heart'); kallita().emote('heart');
      this.addItem('Big chubby seal plushie & two Litten figurines');
      this.addItem('Big chubby hamster plushie');
      await Engine.wait(0.6);
      // Transition naturally into the anniversary photo moment
      await UI.bubble('kallita', 'Eh foto bareng yuk buat ditaro di foto album', { expr: 'happy', holdAfter: 1.8 });
      await UI.bubble('roni', 'ayuk sayang', { expr: 'happy', holdAfter: 1.4 });
      roni().lookTarget = null; kallita().lookTarget = null;
      await this.selfie(false, true);
      this.commit('couch');
    },
    async selfie(final, fromGifts = false) {
      if (roni().state === 'sitting') await roni().stand();
      if (kallita().state === 'sitting') await kallita().stand();
      roni().lookTarget = null; kallita().lookTarget = null;
      roni().headDir = null; kallita().headDir = null;
      const sid = final ? 's10_finale' : 's07_party';
      const tripod = World.get('living_tripod');
      if (!final) {
        if (!fromGifts) await Camera.release();
        await this.move(roni(), 'tripod_pickup', sid);
        await roni().face('up');
        await roni().play('reach', 0.4);
        hide('living_tripod_stored', true);
        if (!roni().carrying.includes('tripod')) roni().carrying.push('tripod');
        sound('bag');
        await this.move(roni(), 'tripod_spot', sid);
        await roni().face('up');
        await roni().play('reach', 0.45);
        roni().carrying = roni().carrying.filter(i => i !== 'tripod');
        if (tripod) World.setHidden('living_tripod', false);
        sound('ui_select');
        await Engine.wait(0.2);
        // Roni & Kallita walk together in front of the sofa and stand clearly visible facing the camera
        await Promise.all([
          this.move(roni(), 'roni_selfie_entry', sid),
          this.move(kallita(), 'kallita_selfie_entry', sid)
        ]);
        await Promise.all([
          this.move(roni(), 'roni_selfie', sid, { direct: true }),
          this.move(kallita(), 'kallita_selfie', sid, { direct: true })
        ]);
      } else {
        await roni().walkTo(170, 226, { direct: true });
        await roni().face('up');
        await roni().play('reach'); sound('ui_select');
        if (tripod) World.setHidden('living_tripod', false);
        await this.move(roni(), 'roni_selfie', sid, { direct: true });
        await this.move(kallita(), 'kallita_selfie', sid, { direct: true });
      }
      roni().lookTarget = null; kallita().lookTarget = null;
      roni().headDir = null; kallita().headDir = null;
      await Promise.all([roni().face('down'), kallita().face('down')]);
      roni().state = 'posing'; kallita().state = 'posing';
      roni().expression = 'happy'; kallita().expression = 'excited';
      await Camera.focus(170, 174, 1.32, 0.8);
      if (tripod) tripod.state.timer = true;
      sound('ui_select'); await Engine.wait(0.5);
      sound('ui_select'); await Engine.wait(0.5);
      if (final) await UI.say('kallita', 'Just us. One more ordinary evening.', { expr: 'happy' });
      await Engine.wait(0.2);
      const photo = Album.capture(final);
      sound('shutter');
      await Engine.fade(0.85, 0.08, '#fff5ea');
      await Engine.fade(0, 0.35, '#fff5ea');
      Engine.fadeColor = '#000';
      if (tripod) tripod.state.timer = false;
      roni().state = kallita().state = 'idle';
      this.addItem(final ? 'The thirteenth photograph' : "Tonight's anniversary selfie");
      this.commit();
      if (final) {
        await Camera.release();
        await Album.showSelfie(photo, true);
        window.Sound && Sound.mood('ending'); await Engine.fade(1, 2.2);
        this.flags.ending = true; this.commit('finished'); Game.mode = 'ending'; Menus.ending();
      } else {
        await Engine.wait(0.55);
        await Camera.release();
        UI.toast('Anniversary photo added to the album.');
      }
    },
    async couchConversation() {
      await Promise.all([
        this.move(roni(), 'roni_sofa_front', 's07_party'),
        this.move(kallita(), 'kallita_sofa_front', 's07_party')
      ]);
      await Promise.all([
        this.move(roni(), 'roni_sofa', 's07_party', { direct: true }),
        this.move(kallita(), 'kallita_sofa', 's07_party', { direct: true })
      ]);
      await Promise.all([roni().sit('down'), kallita().sit('down')]);
      roni().lookTarget = kallita(); kallita().lookTarget = roni();
      await Camera.focus((roni().x + kallita().x) / 2, roni().y - 6, 1.25, 0.9);
      await Engine.wait(0.5);
      await UI.say('kallita', 'Do you remember our first date?', { expr: 'tender' });
      await Engine.wait(0.45);
      await UI.say('roni', 'How could I forget?', { expr: 'happy' });
      await Engine.wait(0.45);
      await UI.say('kallita', 'I think I still have the pictures somewhere.', { expr: 'happy' });
      roni().lookTarget = null; kallita().lookTarget = null;
      roni().emote('?');
      await Engine.wait(0.4);
      await Camera.release();
      await this.albumReveal();
    },

    // ------------------------------------------------------------------ SCENE 08
    async albumReveal() {
      await this.enter('s08_album', true);
      await UI.card('8:30 PM', 'The Old Photo Album', 1.8);
      if (roni().state === 'sitting') await roni().stand();
      if (kallita().state === 'sitting') await kallita().stand();
      await this.move(kallita(), 'kallita_shelf'); await kallita().face('up');
      await kallita().play('reach'); kallita().carrying = ['album'];
      await this.move(roni(), 'roni_table'); await this.move(kallita(), 'kallita_table');
      await Promise.all([roni().face('up'), kallita().face('up')]);
      await kallita().play('reach'); kallita().carrying = []; set('living_coffee_table', 'album', 'closed');
      hide('living_cake'); hide('living_pizza_box'); hide('living_plate_01'); hide('living_plate_02'); hide('living_tripod_stored');
      const focus = this.mark('album_focus'); await Camera.focus(focus.x, focus.y, 1.8, 1.1);
      roni().state = kallita().state = 'lean'; sound('page'); set('living_coffee_table', 'album', 'open');
      set('living_coffee_table', 'slots', [false, false, false, false]); await Engine.wait(0.6);
      set('living_coffee_table', 'lastPhoto', true);
      window.Sound && Sound.mood('album');
      await Album.open(true);
      await UI.talk([
        ['roni', 'Wait... where are the other pictures?', { expr: 'worried' }],
        ['kallita', 'They were here. I remember putting them in.', { expr: 'worried' }],
        ['roni', 'Then why is this the only one left?', { expr: 'worried' }]
      ]);
      const tableObj = World.get('living_coffee_table');
      roni().lookTarget = tableObj; kallita().lookTarget = tableObj;
      roni().expression = 'worried'; roni().emote('?');
      await roni().play('inspect', 0.45);
      await UI.bubble('roni', "Hey, did you notice there's something strange in this picture?", { expr: 'worried', holdAfter: 2.2 });
      kallita().lookTarget = tableObj; kallita().emote('!');
      sound('distortion');
      Camera.shake(2.5, 0.35);
      Engine.tween(this, { distortion: 0.65 }, 0.9);
      await kallita().play('surprised', 0.55);
      await UI.bubble('kallita', 'Shit... I just noticed. What the hell is that?', { expr: 'worried', holdAfter: 2.3 });
      roni().lookTarget = kallita();
      await roni().face(kallita());
      await Engine.wait(0.15);
      await UI.bubble('roni', "This is fucked up, love. I'll go check it on my computer.", { expr: 'determined', holdAfter: 2.3 });
      roni().lookTarget = null;
      roni().state = 'idle';
      kallita().state = 'idle';
      kallita().lookTarget = tableObj;
      kallita().expression = 'worried';
      kallita().emote('...');
      await roni().face('right');
      Camera.release(0.75);
      roni().walkTo(315, 224, { speed: 46 }).catch(() => {});
      kallita().walkTo(186, 168, { speed: 24 }).then(() => {
        kallita().face('down');
        kallita().lookTarget = tableObj;
        kallita().expression = 'worried';
      }).catch(() => {});
      await Engine.wait(1.0);
      Engine.tween(this, { distortion: 1 }, 0.7);
      await Engine.fade(1, 0.85, '#000');
      this.distortion = 0;
      roni().state = kallita().state = 'idle';
      roni().lookTarget = null; kallita().lookTarget = null;
      this.flags.album = true; this.note('Eleven photographs are gone. Only The Visitor remains. Check the studio computer.');
      await this.enter('s09_studio');
      set('studio_crt_monitor', 'on', false); set('studio_second_monitor', 'off', true);
      window.Sound && Sound.mood('investigation'); this.commit('computer');
    },

    // ------------------------------------------------------------------ SCENE 09 & 10
    async computer() {
      const ch = roni(), chair = World.get('studio_desk_chair');
      if (ch.state !== 'sitting') {
        await ch.play('reach'); sound('sit'); chair.state.offsetY = chair.state.offsetY || 0;
        await Engine.tween(chair.state, { offsetY: 8 }, 0.4);
        await this.move(ch, 'chair_back', 's09_studio', { direct: true }); await ch.sit('up');
        await Promise.all([Engine.tween(chair.state, { offsetY: 0 }, 0.5), this.move(ch, 'computer_seat', 's09_studio', { direct: true })]);
        const m = this.mark('camera_desk', 's09_studio'); await Camera.focus(m.x, m.y, 1.6, 1);
      }
      set('studio_computer_tower', 'on', true); set('studio_crt_monitor', 'on', true);
      set('studio_crt_monitor', 'screen', 'boot'); set('studio_crt_monitor', 'bootT', World.t); sound('computer_start');
      await Engine.wait(1.6); set('studio_crt_monitor', 'screen', 'archive');
      this.commit(this.current === 's09_studio' ? 'archive' : null);
      await Investigation.open();
      if (this.flags.startEnding) {
        this.flags.startEnding = false;
        await this.revisedEnding();
        return;
      }
      await ch.stand(); await Camera.release(); this.commit();
    },
    async onPhotoRestored(index) {
      const photo = Investigation.photos[index];
      set('studio_crt_monitor', 'solved', Investigation.progress.restored.slice());
      set('living_coffee_table', 'slots', [0, 1, 2, 3].map(i => Investigation.progress.restored.includes(i)));
      set('living_photo_collage', 'missing', Array.from({ length: 11 }, (_, i) => i).filter(i => !Investigation.progress.restored.includes(i)));
      sound('restore'); this.note(photo.title + ': ' + photo.memory);
      await UI.say(null, photo.memory);
      if ([2, 5, 8, 10].includes(index)) {
        await UI.say('roni', [
          'I remember this day. But not that detail.',
          'Was that window always occupied?',
          'Those shadows... there were only two of us.',
          'The same shape. Inside another photograph.'
        ][[2, 5, 8, 10].indexOf(index)], { expr: 'worried' });
      }
      if (Investigation.progress.restored.length === 12) {
        this.flags.startEnding = true;
        UI.setObjective(null);
        Investigation.close();
        this.commit();
        return;
      }
      this.commit();
    },
    async finaleArrival() {
      kallita().visible = true; kallita().state = 'idle'; await kallita().face(roni());
      await UI.talk([
        ['kallita', 'You found them?', { expr: 'curious' }],
        ['roni', 'The scans are all there. But someone keeps appearing in them.', { expr: 'worried' }],
        ['kallita', 'Someone?', { expr: 'confused' }],
        ['roni', "I don't know. Maybe we should take a new one.", { expr: 'worried' }]
      ]);
      await this.move(kallita(), 'kallita_selfie'); this.commit('selfie');
    },
    async revisedEnding() {
      this.inRevisedEnding = true;
      Game.mode = 'cutscene';
      UI.setObjective(null);
      UI.clearPrompt();
      roni().controllable = false;

      // ------------------------------------------------------------------ 3. LIVING ROOM: KALLITA BECOMES IMPATIENT
      this.current = 's10_finale';
      WorldArt.clockMinutes = 20 * 60 + 50;
      await Game.changeRoom('living', { x: 40, y: 235, direction: 'right' }, {
        lighting: 'evening', fadeOut: 0.65, fadeIn: 0.65, silentLabel: true
      });
      roni().visible = false; roni().ghost = true;
      hide('living_cake', true); hide('living_pizza_box', true);
      hide('living_plate_01', true); hide('living_plate_02', true);
      hide('living_tripod_stored', true); hide('living_tripod', true);
      set('living_coffee_table', 'album', 'open');
      set('living_coffee_table', 'lastPhoto', true);

      kallita().configure({
        x: 204, y: 196, direction: 'down', state: 'idle',
        expression: 'neutral', outfit: 'kallita_casual', carrying: [], visible: true, controllable: false
      });
      World.addChar(kallita());
      Camera.follow(kallita());
      Camera.focusPt = { x: kallita().x, y: kallita().y - 16 };
      Camera.zoom = 1.28;
      Camera.snap();

      window.Sound && Sound.mood('album');
      window.Sound && Sound.setMusicScale(0.7, 1.0);
      await Engine.wait(1.0);

      kallita().expression = 'impatient';
      await Engine.wait(0.9);
      await kallita().face('right');
      kallita().headDir = 'right';
      kallita().emote('...');
      await Engine.wait(1.1);
      kallita().expression = 'worried';
      await kallita().play('lookAround', 0.8);
      await kallita().face('right');

      await UI.say('kallita', 'Roni? Are you almost done?', { expr: 'impatient' });
      await Engine.wait(1.2);
      await UI.say('kallita', 'Sayang?', { expr: 'worried' });
      await Engine.wait(1.3);
      kallita().emote('...');
      await UI.say('kallita', "Hmm... what's taking her so long?", { expr: 'worried' });
      await UI.say('kallita', "Maybe she's just resting...", { expr: 'worried' });
      await Engine.wait(0.8);
      await UI.say('kallita', "I'll go check on her.", { expr: 'worried' });

      kallita().headDir = null;
      await Camera.release(0.65);
      window.Sound && Sound.setMusicScale(0.24, 4.5);
      await kallita().face('right');
      await kallita().walkTo(458, 225, { speed: 42 });

      // Hallway walk toward the bedroom
      set('hallway_bedroom_door', 'openAmt', 0);
      await Game.changeRoom('hallway', { x: 16, y: 178, direction: 'right' }, {
        lighting: 'evening', fadeOut: 0.35, fadeIn: 0.35, silentLabel: true
      });
      roni().visible = false; roni().ghost = true;
      kallita().configure({
        x: 24, y: 178, direction: 'right', state: 'idle',
        expression: 'worried', outfit: 'kallita_casual', carrying: [], visible: true, controllable: false
      });
      World.addChar(kallita());
      Camera.follow(kallita());
      Camera.focusPt = null; Camera.zoom = 1; Camera.snap();
      window.Sound && Sound.setMusicScale(0.08, 3.0);
      await kallita().walkTo(240, 90, { speed: 40 });
      const bedDoor = World.get('hallway_bedroom_door');
      if (bedDoor) {
        window.Sound && Sound.sfx('door_open', 0.7);
        await Engine.tween(bedDoor.state, { openAmt: 1 }, 0.45, Engine.Ease.out);
      }
      await kallita().walkTo(240, 82, { direct: true, speed: 34 });

      // ------------------------------------------------------------------ 4. BEDROOM REVELATION — RONI IS DYING AT HER DESK
      await Game.changeRoom('bedroom', { x: 300, y: 296, direction: 'up' }, {
        lighting: 'dark', fadeOut: 0.4, fadeIn: 0.65, silentLabel: true
      });
      set('bedroom_bedside_lamp', 'off', true);
      set('studio_desk_lamp', 'off', false);
      set('studio_crt_monitor', 'on', true);
      set('studio_crt_monitor', 'screen', 'archive');
      set('studio_crt_monitor', 'solved', Array.from({ length: 12 }, (_, i) => i));
      set('studio_second_monitor', 'off', false);
      set('studio_computer_tower', 'on', true);
      set('studio_long_desk', 'roniDying', true);
      set('studio_desk_chair', 'roniDying', true);
      set('studio_desk_chair', 'offsetY', -4);

      roni().visible = false; roni().ghost = true;
      kallita().configure({
        x: 298, y: 288, direction: 'up', state: 'idle',
        expression: 'worried', outfit: 'kallita_casual', carrying: [], visible: true, controllable: false
      });
      World.addChar(kallita());
      Camera.follow(kallita());
      Camera.focusPt = { x: 308, y: 248 };
      Camera.zoom = 1.18;
      Camera.snap();
      window.Sound && Sound.mood('ending');
      window.Sound && Sound.setMusicScale(0.18, 2.5);

      await kallita().walkTo(322, 232, { direct: true, speed: 34 });
      await kallita().face('right');
      await Camera.focus(432, 84, 1.72, 3.0);
      sound('distortion', 0.45);
      await Engine.wait(1.6);

      await Camera.focus(322, 214, 1.85, 1.0);
      kallita().expression = 'confused';
      kallita().emote('?');
      await Engine.wait(0.75);
      kallita().expression = 'shocked';
      kallita().emote('!');
      sound('distortion', 0.6);
      Camera.shake(1.6, 0.25);
      await kallita().play('surprised', 0.5);
      await Engine.wait(0.6);

      kallita().expression = 'panicked';
      Camera.focus(412, 98, 1.48, 1.1);
      await kallita().walkTo(404, 114, { speed: 78, run: true });
      await kallita().face('right');
      kallita().lookTarget = World.get('studio_desk_chair');
      await Camera.focus(420, 88, 1.62, 0.7);

      await UI.say('kallita', 'Roni...?', { expr: 'shocked' });
      await UI.say('kallita', 'Roni, hey... can you hear me?', { expr: 'panicked' });
      await UI.say('kallita', 'Sayang, wake up...', { expr: 'panicked' });
      await UI.say('kallita', "Please, Roni. It's me. Open your eyes.", { expr: 'crying' });
      await Engine.wait(0.85);
      await UI.say('kallita', "Don't scare me like this...", { expr: 'crying' });
      Camera.shake(2.0, 0.35);
      await UI.say('kallita', 'RONI!', { expr: 'panicked' });

      // ------------------------------------------------------------------ 5. SUDDEN WAKE-UP — IT WAS A NIGHTMARE (OFFICE)
      WorldArt.clockMinutes = 18 * 60 + 50;
      await Game.changeRoom('office', { x: 180, y: 153, direction: 'down' }, {
        lighting: 'sunset', instant: true, silentLabel: true
      });
      for (const id of ['clara', 'penguin', 'barnaby', 'miles']) {
        const ch = Characters.get(id);
        if (ch) { ch.visible = false; World.removeChar(ch); }
      }
      hide('office_work_bag', false);
      hide('office_paperwork', true);
      set('office_monitor', 'off', false);
      set('office_elevator', 'floor', '3');
      set('office_elevator', 'dir', null);
      set('office_elevator', 'openAmt', 0);

      roni().configure({
        x: 180, y: 153, direction: 'down', state: 'sitting',
        expression: 'asleep', outfit: 'roni_office', carrying: [], visible: true, controllable: false
      });
      roni().ghost = false;
      roni().sitAmt = 1;
      Camera.follow(roni());
      Camera.focusPt = { x: 180, y: 129 };
      Camera.zoom = 2.6;
      Camera.snap();

      window.Sound && Sound.mood('warm');
      window.Sound && Sound.setMusicScale(0.18, 0.3);
      await Engine.wait(0.85);

      roni().expression = 'shocked';
      sound('ui_move', 0.8);
      Camera.shake(1.8, 0.22);
      await Engine.wait(0.65);

      await Camera.focus(180, 138, 1.32, 2.3);
      roni().expression = 'confused';
      await roni().face('left');
      await Engine.wait(0.45);
      await roni().face('right');
      await Engine.wait(0.45);
      roni().expression = 'frightened';
      await roni().face('down');

      await UI.say('roni', '...Huh?', { expr: 'confused' });
      await UI.say('roni', 'Where...?', { expr: 'confused' });
      await UI.say('roni', 'Was that... a dream?', { expr: 'frightened' });
      await Engine.wait(1.0);

      // ------------------------------------------------------------------ 6. KALLITA'S MESSAGE
      sound('phone_msg');
      sound('phone_buzz');
      await Engine.wait(0.35);
      roni().state = 'phone';
      await UI.phone({
        contact: 'Kallita',
        contactId: 'kallita',
        contactExpr: 'worried',
        minHold: 2.8,
        messages: [
          { from: 'kallita', text: 'Im waiting for you sayang, come home fast i miss you' }
        ]
      });
      roni().state = 'sitting';

      roni().expression = 'confused';
      await Engine.wait(0.4);
      roni().expression = 'tender';
      roni().emote('heart');
      await Engine.wait(0.45);
      roni().expression = 'frightened';
      roni().emote('!');
      await Engine.wait(0.35);

      await UI.say('roni', 'Kallita...', { expr: 'worried' });
      await UI.say('roni', "Oh no. I've been here too long.", { expr: 'frightened' });
      await Engine.tween(roni(), { sitAmt: 0 }, 0.2, Engine.Ease.out);
      roni().state = 'idle';
      roni().sortBias = 0;
      await roni().face('right');
      await UI.say('roni', 'I need to get home. Now.', { expr: 'determined' });

      // ------------------------------------------------------------------ 7. RONI GOES HOME & FADE OUT TO THE END
      await Camera.release(0.6);
      await roni().walkTo(244, 138, { speed: 74, run: true });
      await roni().face('up');
      await roni().play('reach', 0.25);
      hide('office_work_bag', true);
      if (!roni().carrying.includes('work_bag')) roni().carrying.push('work_bag');
      sound('bag');

      await roni().walkTo(457, 160, { speed: 78, run: true });
      await roni().face('up');
      const elev = World.get('office_elevator');
      sound('bell');
      if (elev) await Engine.tween(elev.state, { openAmt: 1 }, 0.4, Engine.Ease.out);
      await roni().walkTo(455, 141, { direct: true, speed: 65 });
      await roni().face('down');
      sound('door_close');
      if (elev) await Engine.tween(elev.state, { openAmt: 0 }, 0.45, Engine.Ease.inOut);
      roni().visible = false;

      // Quiet tense walk/run home through night street
      this.current = 's04_street_night';
      WorldArt.clockMinutes = 19 * 60 + 15;
      await Game.changeRoom('street', { x: 75, y: 207, direction: 'right' }, {
        lighting: 'night', fadeOut: 0.4, fadeIn: 0.55, silentLabel: true
      });
      for (const id of ['owl', 'otto', 'willow', 'bramble', 'milo', 'koda', 'lumi', 'sage', 'pebble', 'felix', 'clover', 'pip', 'maple', 'hazel', 'pippin']) {
        const ch = Characters.get(id);
        if (ch) { ch.visible = false; World.removeChar(ch); }
      }
      roni().configure({
        x: 75, y: 207, direction: 'right', state: 'idle',
        expression: 'worried', outfit: 'roni_office', carrying: ['work_bag'], visible: true, controllable: false
      });
      roni().ghost = false;
      World.addChar(roni());
      Camera.follow(roni());
      Camera.focusPt = null; Camera.zoom = 1; Camera.snap();
      window.Sound && Sound.mood('ending');
      window.Sound && Sound.setMusicScale(0.28, 0.5);

      await roni().walkTo(260, 207, { direct: true, speed: 74, run: true });
      await UI.say('roni', 'Wait for me, sayang...', { expr: 'worried' });
      await roni().walkTo(480, 207, { direct: true, speed: 78, run: true });
      await UI.say('roni', "I'm coming home.", { expr: 'determined' });

      roni().walkTo(780, 207, { direct: true, speed: 78, run: true }).catch(() => {});
      UI.hidden = true;
      window.Sound && Sound.silence(2.6);
      await Engine.fade(1, 3.0, '#000');
      await Engine.wait(3.5);

      this.inRevisedEnding = false;
      this.current = 's10_finale';
      this.flags.ending = true;
      this.commit('finished');
      Game.mode = 'ending';
      Menus.ending({ theEnd: true });
    },
    onExit(ex) {
      if (!this.current || Game.sandbox) return false;
      if (ex.id === 'street_east_edge') {
        if (this.current === 's04_street_night') {
          Engine.runScript(async () => { await this.enter('s05_porch'); await this.porchIntro(); });
          return true;
        }
      }
      if (ex.id === 'street_west_edge') {
        if (this.current === 's04_street_night') {
          UI.toast('Home is to the east. Kallita is waiting.');
          Engine.runScript(() => roni().walkTo(700, roni().y, { direct: true }));
        } else {
          UI.toast('A bouquet first. Bloomery is east of here.');
          Engine.runScript(() => roni().walkTo(WORLD_LAYOUTS.street.entries.default.x, roni().y, { direct: true }));
        }
        return true;
      }
      if (ex.id === 'living_to_hallway' && ['s05_arrival', 's06_outfit'].includes(this.current)) {
        UI.toast('Something is waiting in the living room.');
        Engine.runScript(() => roni().walkTo(WORLD_LAYOUTS.living.entries.from_hallway.x, roni().y, { direct: true })); return true;
      }
      return false;
    },
    update(dt) {
      this.ambientTimer = (this.ambientTimer || 0) + dt;
      const freeAI = !Engine.inScript && !Game.transitioning && !UI.busy && Game.mode === 'play';
      if (!freeAI) {
        for (const ch of World.chars) {
          if (!UI.dialogue && !UI.bubbleView) ch.talking = false;
          if (ch.pathOpts && ch.pathOpts.wander) ch.stopPath(false);
        }
      } else {
        this.npcState = this.npcState || {};
        const ns = this.npcState;
        const tickAI = (id, fn) => {
          const ch = Characters.get(id);
          if (!ch || !ch.visible || !World.chars.includes(ch)) return;
          const st = ns[id] = ns[id] || { wait: 0.4 + Math.random() * 1.4, talkT: 0 };
          if (st.talkT > 0) {
            st.talkT -= dt;
            if (st.talkT <= 0) ch.talking = false;
          }
          if (ch.moving || ch.anim) return;
          st.wait -= dt;
          if (st.wait <= 0) fn(ch, st);
        };

        if (this.current === 's01_office') {
          tickAI('clara', (ch, st) => {
            ch.state = 'sitting'; ch.sitAmt = 1;
            const r = Math.random();
            if (r < 0.6) { ch.play('type', 1.3); ch.expression = 'neutral'; st.wait = 0.8 + Math.random() * 1.4; }
            else if (r < 0.9) { ch.play('inspect', 0.65); ch.expression = 'happy'; st.wait = 1.5 + Math.random() * 1.6; }
            else { ch.emote('note'); ch.expression = 'happy'; st.wait = 2.0 + Math.random() * 1.6; }
          });

          const barnaby = Characters.get('barnaby'), miles = Characters.get('miles');
          const barnabyBounds = { x: 135, y: 130, width: 175, height: 105 };
          const milesBounds = { x: 255, y: 128, width: 155, height: 108 };
          const penguinBounds = { x: 195, y: 135, width: 215, height: 105 };

          tickAI('barnaby', (ch, st) => {
            if (Math.random() < 0.35 && miles && !miles.moving && Math.hypot(miles.x - ch.x, miles.y - ch.y) < 48) {
              ch.face(miles);
              ch.talking = true; st.talkT = 1.3;
              ch.expression = Math.random() < 0.7 ? 'happy' : 'neutral';
              ch.play(Math.random() < 0.5 ? 'nod' : 'inspect', 0.7);
              st.wait = 1.8 + Math.random() * 1.8;
            } else {
              ch.wander(barnabyBounds, { minDist: 28, maxDist: 110, speed: 26 }).then(ok => {
                if (!ok) return;
                if (miles && !miles.moving && Math.hypot(miles.x - ch.x, miles.y - ch.y) < 52) ch.face(miles);
                else ch.play(Math.random() < 0.5 ? 'lookAround' : 'inspect', 0.65);
              }).catch(() => {});
              st.wait = 2.2 + Math.random() * 2.4;
            }
          });

          tickAI('miles', (ch, st) => {
            if (Math.random() < 0.38 && barnaby && !barnaby.moving && Math.hypot(barnaby.x - ch.x, barnaby.y - ch.y) < 48) {
              ch.face(barnaby);
              ch.talking = true; st.talkT = 1.4;
              ch.expression = Math.random() < 0.6 ? 'happy' : 'curious';
              ch.play(Math.random() < 0.5 ? 'nod' : 'lookAround', 0.7);
              st.wait = 1.9 + Math.random() * 2.0;
            } else {
              ch.wander(milesBounds, { minDist: 28, maxDist: 115, speed: 28 }).then(ok => {
                if (!ok) return;
                if (barnaby && !barnaby.moving && Math.hypot(barnaby.x - ch.x, barnaby.y - ch.y) < 52) ch.face(barnaby);
                else ch.play('inspect', 0.7);
              }).catch(() => {});
              st.wait = 2.4 + Math.random() * 2.6;
            }
          });

          tickAI('penguin', (ch, st) => {
            if (!st.booted) { st.booted = true; st.wait = 4.5; return; }
            ch.wander(penguinBounds, { minDist: 36, maxDist: 135, speed: 30 }).then(ok => {
              if (!ok) return;
              ch.play(Math.random() < 0.5 ? 'inspect' : 'lookAround', 0.75);
            }).catch(() => {});
            st.wait = 2.8 + Math.random() * 2.8;
          });
        }

        const isEveningStreet = this.current === 's02_street' &&
          World.roomId === 'street' &&
          World.light.mode !== 'night' &&
          World.light.mode !== 'dark' &&
          (WorldArt.clockMinutes == null || WorldArt.clockMinutes < 18 * 60 + 40);

        if (isEveningStreet) {
          const felix = Characters.get('felix');
          const clover = Characters.get('clover');
          const pip = Characters.get('pip');
          const hazel = Characters.get('hazel');
          const pippin = Characters.get('pippin');
          const bruno = Characters.get('bruno'), pippa = Characters.get('pippa');
          const jun = Characters.get('jun'), mina = Characters.get('mina');
          const theo = Characters.get('theo'), rosie = Characters.get('rosie');

          const nextWaypoint = (st, waypoints) => {
            if (st.routeIdx == null) st.routeIdx = Math.floor(Math.random() * waypoints.length);
            else st.routeIdx = (st.routeIdx + 1 + Math.floor(Math.random() * Math.max(1, waypoints.length - 2))) % waypoints.length;
            return waypoints[st.routeIdx];
          };

          const felixRoute = [{ x: 196, y: 202 }, { x: 248, y: 196 }, { x: 288, y: 210 }, { x: 222, y: 204 }, { x: 184, y: 192 }];
          const cloverRoute = [{ x: 216, y: 206 }, { x: 266, y: 198 }, { x: 304, y: 208 }, { x: 238, y: 204 }, { x: 202, y: 192 }];
          const pipRoute = [{ x: 486, y: 186 }, { x: 528, y: 182 }, { x: 562, y: 196 }, { x: 506, y: 204 }, { x: 468, y: 192 }];
          const mapleRoute = [{ x: 330, y: 194 }, { x: 410, y: 206 }, { x: 515, y: 198 }, { x: 618, y: 208 }, { x: 472, y: 190 }];
          const hazelHomeRoute = [{ x: 690, y: 206 }, { x: 782, y: 208 }, { x: 862, y: 206 }];
          const hazelPorchRoute = [{ x: 842, y: 202 }, { x: 878, y: 208 }, { x: 860, y: 214 }, { x: 896, y: 204 }];
          const brunoFamilyRoute = [{ x: 96, y: 204 }, { x: 156, y: 212 }, { x: 226, y: 202 }, { x: 178, y: 192 }, { x: 118, y: 212 }];
          const junCoupleRoute = [{ x: 274, y: 204 }, { x: 326, y: 196 }, { x: 392, y: 208 }, { x: 344, y: 214 }, { x: 292, y: 194 }];
          const theoCoupleRoute = [{ x: 662, y: 206 }, { x: 728, y: 198 }, { x: 808, y: 206 }, { x: 764, y: 214 }, { x: 694, y: 194 }];

          tickAI('felix', (ch, st) => {
            if (clover && !clover.moving && Math.hypot(clover.x - ch.x, clover.y - ch.y) < 42 && Math.random() < 0.56) {
              ch.face(clover);
              ch.talking = true; st.talkT = 1.3;
              ch.expression = 'happy';
              ch.play(Math.random() < 0.5 ? 'nod' : 'wave', 0.75);
              if (Math.random() < 0.35) ch.emote('note');
              st.wait = 1.9 + Math.random() * 1.9;
            } else {
              const wp = nextWaypoint(st, felixRoute);
              ch.walkTo(wp.x + (Math.random() - 0.5) * 14, wp.y + (Math.random() - 0.5) * 6, { speed: 27 + Math.random() * 6 }).then(() => {
                if (clover && !clover.moving && Math.hypot(clover.x - ch.x, clover.y - ch.y) < 44) ch.face(clover);
                else { ch.face(Math.random() < 0.5 ? 'up' : 'right'); ch.play('inspect', 0.75); }
              }).catch(() => {});
              st.wait = 2.3 + Math.random() * 2.1;
            }
          });

          tickAI('clover', (ch, st) => {
            if (felix && !felix.moving && Math.hypot(felix.x - ch.x, felix.y - ch.y) < 42 && Math.random() < 0.58) {
              ch.face(felix);
              ch.talking = true; st.talkT = 1.25;
              ch.expression = 'happy';
              ch.play('nod', 0.7);
              if (Math.random() < 0.3) ch.emote('heart');
              st.wait = 2.1 + Math.random() * 1.8;
            } else {
              const wp = nextWaypoint(st, cloverRoute);
              ch.walkTo(wp.x + (Math.random() - 0.5) * 14, wp.y + (Math.random() - 0.5) * 6, { speed: 26 + Math.random() * 6 }).then(() => {
                if (felix && !felix.moving && Math.hypot(felix.x - ch.x, felix.y - ch.y) < 44) ch.face(felix);
                else ch.play('lookAround', 0.75);
              }).catch(() => {});
              st.wait = 2.5 + Math.random() * 2.2;
            }
          });

          tickAI('pip', (ch, st) => {
            if (Math.random() < 0.42) {
              ch.face('up');
              ch.play('inspect', 0.7);
              if (Math.random() < 0.4) ch.emote('...');
              st.wait = 2.1 + Math.random() * 1.9;
            } else {
              const wp = nextWaypoint(st, pipRoute);
              ch.walkTo(wp.x + (Math.random() - 0.5) * 10, wp.y + (Math.random() - 0.5) * 5, { speed: 26 + Math.random() * 5 }).then(() => {
                ch.face(Math.random() < 0.5 ? 'up' : 'down');
                if (Math.random() < 0.35) ch.play('hop', 0.4);
              }).catch(() => {});
              st.wait = 2.7 + Math.random() * 2.3;
            }
          });

          tickAI('maple', (ch, st) => {
            const near = [felix, clover, pip, hazel].find(n => n && n.visible && !n.moving && Math.hypot(n.x - ch.x, n.y - ch.y) < 48);
            if (near && Math.random() < 0.42) {
              ch.face(near); ch.talking = true; st.talkT = 1.2;
              ch.expression = 'happy'; ch.play('wave', 0.8);
              st.wait = 2.2 + Math.random() * 1.9;
            } else {
              const wp = nextWaypoint(st, mapleRoute);
              ch.walkTo(wp.x + (Math.random() - 0.5) * 18, wp.y + (Math.random() - 0.5) * 6, { speed: 29 + Math.random() * 6 }).then(() => {
                ch.play(Math.random() < 0.5 ? 'lookAround' : 'inspect', 0.7);
              }).catch(() => {});
              st.wait = 2.6 + Math.random() * 2.4;
            }
          });

          // Evening-only NPCs walking toward their respective homes as the evening progresses
          tickAI('hazel', (ch, st) => {
            st.phase = st.phase || 'chat';
            st.t = (st.t || 0) + 1;
            if (st.phase === 'chat') {
              if (pippin && !pippin.moving && Math.hypot(pippin.x - ch.x, pippin.y - ch.y) < 42) ch.face(pippin);
              ch.talking = true; st.talkT = 1.25; ch.expression = 'happy';
              ch.play(Math.random() < 0.5 ? 'nod' : 'wave', 0.75);
              if (st.t >= 2) { st.phase = 'walkHome'; st.homeStep = 0; }
              st.wait = 2.1 + Math.random() * 1.7;
            } else if (st.phase === 'walkHome') {
              const step = hazelHomeRoute[st.homeStep || 0];
              ch.walkTo(step.x, step.y, { speed: 25 + Math.random() * 4 }).then(() => {
                ch.face(pippin || 'left');
                st.homeStep = (st.homeStep || 0) + 1;
                if (st.homeStep >= hazelHomeRoute.length) st.phase = 'atHome';
              }).catch(() => {});
              st.wait = 2.2 + Math.random() * 1.6;
            } else {
              if (pippin && !pippin.moving && Math.hypot(pippin.x - ch.x, pippin.y - ch.y) < 48 && Math.random() < 0.55) {
                ch.face(pippin); ch.talking = true; st.talkT = 1.2; ch.play('nod', 0.7);
                st.wait = 2.5 + Math.random() * 2.1;
              } else {
                const wp = nextWaypoint(st, hazelPorchRoute);
                ch.walkTo(wp.x, wp.y, { speed: 23 }).catch(() => {});
                st.wait = 3.0 + Math.random() * 2.4;
              }
            }
          });

          tickAI('pippin', (ch, st) => {
            const hSt = ns.hazel;
            if (hSt && hSt.phase === 'walkHome' && hazel && Math.hypot(hazel.x - ch.x, hazel.y - ch.y) > 32) {
              const side = (st.t || 0) % 2 === 0 ? 15 : -14;
              st.t = (st.t || 0) + 1;
              ch.walkTo(Math.max(580, Math.min(912, hazel.x + side)), Math.min(218, hazel.y + 4), { speed: 29 }).then(() => {
                ch.face(hazel);
                if (Math.random() < 0.5) ch.play('hop', 0.4);
              }).catch(() => {});
              st.wait = 1.7 + Math.random() * 1.5;
            } else if (hazel && Math.hypot(hazel.x - ch.x, hazel.y - ch.y) < 44 && Math.random() < 0.62) {
              ch.face(hazel); ch.expression = 'excited';
              if (Math.random() < 0.45) { ch.play('hop', 0.4); ch.emote('note'); }
              else { ch.talking = true; st.talkT = 1.1; ch.play('nod', 0.65); }
              st.wait = 2.0 + Math.random() * 2.0;
            } else if (hazel) {
              ch.walkTo(Math.max(580, Math.min(912, hazel.x + 14)), 210, { speed: 27 }).catch(() => {});
              st.wait = 2.3 + Math.random() * 1.8;
            }
          });

          // Evening-only family (bruno parent & pippa child) walking varied neighborhood paths
          tickAI('bruno', (ch, st) => {
            if (pippa && !pippa.moving && Math.hypot(pippa.x - ch.x, pippa.y - ch.y) < 38 && Math.random() < 0.48) {
              ch.face(pippa); ch.talking = true; st.talkT = 1.3; ch.expression = 'happy';
              ch.play(Math.random() < 0.5 ? 'nod' : 'wave', 0.7);
              st.wait = 2.3 + Math.random() * 2.0;
            } else {
              const wp = nextWaypoint(st, brunoFamilyRoute);
              ch.walkTo(wp.x + (Math.random() - 0.5) * 12, wp.y + (Math.random() - 0.5) * 5, { speed: 24 + Math.random() * 4 }).then(() => {
                if (pippa && Math.hypot(pippa.x - ch.x, pippa.y - ch.y) < 42) ch.face(pippa);
                else { ch.face('up'); ch.play('inspect', 0.7); }
              }).catch(() => {});
              st.wait = 2.6 + Math.random() * 2.3;
            }
          });

          tickAI('pippa', (ch, st) => {
            if (bruno && Math.hypot(bruno.x - ch.x, bruno.y - ch.y) > 30) {
              const offset = ((st.stepCount = (st.stepCount || 0) + 1) % 2 === 0 ? 17 : -15);
              const gx = Math.max(66, Math.min(310, bruno.x + offset));
              const gy = Math.max(188, Math.min(220, bruno.y + (st.stepCount % 3 === 0 ? -3 : 3)));
              ch.walkTo(gx, gy, { speed: 30 + Math.random() * 4 }).then(() => {
                ch.face(bruno);
                if (Math.random() < 0.5) { ch.play('hop', 0.4); ch.emote('note'); }
              }).catch(() => {});
              st.wait = 1.8 + Math.random() * 1.5;
            } else if (bruno && !bruno.moving && Math.random() < 0.58) {
              ch.face(bruno); ch.expression = 'excited';
              if (Math.random() < 0.45) { ch.play('hop', 0.4); ch.emote('heart'); }
              else { ch.talking = true; st.talkT = 1.1; ch.play('wave', 0.65); }
              st.wait = 2.2 + Math.random() * 1.9;
            } else if (bruno) {
              ch.walkTo(Math.max(66, Math.min(310, bruno.x + 15)), Math.min(220, bruno.y + 2), { speed: 28 }).catch(() => {});
              st.wait = 2.1 + Math.random() * 1.9;
            }
          });

          // Evening-only couple 1 (jun & mina): varied stroll spots + staggered affectionate gestures
          tickAI('jun', (ch, st) => {
            st.beats = (st.beats || 0) + 1;
            if (mina && !mina.moving && Math.hypot(mina.x - ch.x, mina.y - ch.y) < 42) {
              if (!st.affectionate && (st.beats % 4 === 2 || Math.random() < 0.25)) {
                st.affectionate = true;
                const dir = ch.x <= mina.x ? 'right' : 'left';
                const tx = mina.x + (dir === 'right' ? -13 : 13);
                const doAffection = async () => {
                  if (World.canStand(tx, mina.y, ch, true)) await ch.walkTo(tx, mina.y, { direct: true, speed: 24 });
                  await Promise.all([ch.face(dir), mina.face(dir === 'right' ? 'left' : 'right')]);
                  ch.lookTarget = mina; mina.lookTarget = ch;
                  const kind = Math.random() < 0.55 ? 'hug' : 'kiss';
                  ch.emote('heart'); mina.emote('heart');
                  await Promise.all([ch.play(kind, kind === 'hug' ? 1.15 : 0.95), mina.play(kind, kind === 'hug' ? 1.15 : 0.95)]);
                  ch.lookTarget = null; mina.lookTarget = null;
                };
                doAffection().catch(() => {});
                st.wait = 3.7 + Math.random() * 2.5;
                return;
              }
              st.affectionate = false;
              if (Math.random() < 0.5) {
                ch.face(mina); ch.lookTarget = mina; ch.talking = true; st.talkT = 1.3; ch.expression = 'tender';
                ch.play('nod', 0.7);
                st.wait = 2.3 + Math.random() * 1.9;
                return;
              }
            }
            ch.lookTarget = null;
            const wp = nextWaypoint(st, junCoupleRoute);
            ch.walkTo(wp.x + (Math.random() - 0.5) * 12, wp.y + (Math.random() - 0.5) * 5, { speed: 25 + Math.random() * 4 }).then(() => {
              if (mina && Math.hypot(mina.x - ch.x, mina.y - ch.y) < 44) ch.face(mina);
            }).catch(() => {});
            st.wait = 2.9 + Math.random() * 2.4;
          });

          tickAI('mina', (ch, st) => {
            if (jun && Math.hypot(jun.x - ch.x, jun.y - ch.y) > 28 && !ch.moving) {
              const side = ((st.followSide = (st.followSide || 0) + 1) % 2 === 0 ? 16 : -16);
              const gx = Math.max(246, Math.min(448, jun.x + side));
              ch.walkTo(gx, Math.min(220, jun.y + 1), { speed: 26 }).then(() => ch.face(jun)).catch(() => {});
              st.wait = 2.0 + Math.random() * 1.7;
            } else if (jun && !jun.anim && !jun.moving) {
              ch.face(jun); ch.talking = true; st.talkT = 1.2; ch.expression = 'happy';
              ch.play(Math.random() < 0.5 ? 'nod' : 'wave', 0.7);
              if (Math.random() < 0.25) ch.emote('heart');
              st.wait = 2.5 + Math.random() * 2.0;
            } else {
              st.wait = 1.7 + Math.random() * 1.6;
            }
          });

          // Evening-only couple 2 (theo & rosie): east sidewalk varied stroll + independent staggered timing
          tickAI('theo', (ch, st) => {
            st.beats = (st.beats || 0) + 1;
            if (rosie && !rosie.moving && Math.hypot(rosie.x - ch.x, rosie.y - ch.y) < 44) {
              if (!st.affectionate && (st.beats % 5 === 3 || Math.random() < 0.24)) {
                st.affectionate = true;
                const dir = ch.x <= rosie.x ? 'right' : 'left';
                const tx = rosie.x + (dir === 'right' ? -13 : 13);
                const doAffection = async () => {
                  if (World.canStand(tx, rosie.y, ch, true)) await ch.walkTo(tx, rosie.y, { direct: true, speed: 24 });
                  await Promise.all([ch.face(dir), rosie.face(dir === 'right' ? 'left' : 'right')]);
                  ch.lookTarget = rosie; rosie.lookTarget = ch;
                  const kind = Math.random() < 0.5 ? 'kiss' : 'hug';
                  ch.emote('heart'); rosie.emote('heart');
                  await Promise.all([ch.play(kind, kind === 'hug' ? 1.15 : 0.95), rosie.play(kind, kind === 'hug' ? 1.15 : 0.95)]);
                  ch.lookTarget = null; rosie.lookTarget = null;
                };
                doAffection().catch(() => {});
                st.wait = 4.2 + Math.random() * 2.5;
                return;
              }
              st.affectionate = false;
              if (Math.random() < 0.54) {
                ch.face(rosie); ch.talking = true; st.talkT = 1.25; ch.expression = 'happy';
                ch.play(Math.random() < 0.5 ? 'wave' : 'nod', 0.7);
                st.wait = 2.7 + Math.random() * 2.2;
                return;
              }
            }
            const wp = nextWaypoint(st, theoCoupleRoute);
            ch.walkTo(wp.x + (Math.random() - 0.5) * 14, wp.y + (Math.random() - 0.5) * 5, { speed: 26 + Math.random() * 4 }).then(() => {
              if (rosie && Math.hypot(rosie.x - ch.x, rosie.y - ch.y) < 44) ch.face(rosie);
              else { ch.face('up'); ch.play('lookAround', 0.7); }
            }).catch(() => {});
            st.wait = 3.1 + Math.random() * 2.5;
          });

          tickAI('rosie', (ch, st) => {
            if (theo && Math.hypot(theo.x - ch.x, theo.y - ch.y) > 28 && !ch.moving) {
              const side = ((st.followSide = (st.followSide || 0) + 1) % 2 === 0 ? -16 : 16);
              const gx = Math.max(630, Math.min(905, theo.x + side));
              ch.walkTo(gx, Math.min(220, theo.y + 1), { speed: 27 }).then(() => ch.face(theo)).catch(() => {});
              st.wait = 2.1 + Math.random() * 1.7;
            } else if (theo && !theo.anim && !theo.moving) {
              ch.face(theo); ch.talking = true; st.talkT = 1.2; ch.expression = 'tender';
              ch.play('nod', 0.7);
              if (Math.random() < 0.25) ch.emote('note');
              st.wait = 2.6 + Math.random() * 2.2;
            } else {
              st.wait = 1.9 + Math.random() * 1.5;
            }
          });
        }

        if (this.current === 's04_street_night') {
          this.updateNightBus(dt);
          const otto = Characters.get('otto');
          const willow = Characters.get('willow');
          const bramble = Characters.get('bramble');
          const milo = Characters.get('milo');
          const koda = Characters.get('koda');
          const lumi = Characters.get('lumi');
          const sage = Characters.get('sage');
          const pebble = Characters.get('pebble');
          const busStopBounds = { x: 484, y: 180, width: 108, height: 22 };
          const miloBounds = { x: 548, y: 180, width: 78, height: 28 };
          const coupleHomeBounds = { x: 820, y: 192, width: 88, height: 26 };
          const familyHomeBounds = { x: 74, y: 192, width: 88, height: 26 };
          const bs = this._busState;
          const busBusy = bs && ['opening', 'boarding', 'closing'].includes(bs.phase);

          if (!busBusy) {
            tickAI('otto', (ch, st) => {
              if (willow && willow.visible && !willow.moving && Math.hypot(willow.x - ch.x, willow.y - ch.y) < 40 && Math.random() < 0.65) {
                ch.face(willow); ch.talking = true; st.talkT = 1.2;
                ch.play(Math.random() < 0.5 ? 'nod' : 'shiver', 0.7);
                st.wait = 1.8 + Math.random() * 1.6;
              } else {
                ch.wander(busStopBounds, { minDist: 16, maxDist: 44, speed: 24 }).then(ok => {
                  if (!ok) return;
                  if (willow && willow.visible && Math.hypot(willow.x - ch.x, willow.y - ch.y) < 42) ch.face(willow);
                  else ch.face('down');
                }).catch(() => {});
                st.wait = 2.0 + Math.random() * 1.8;
              }
            });

            tickAI('willow', (ch, st) => {
              if (otto && otto.visible && !otto.moving && Math.hypot(otto.x - ch.x, otto.y - ch.y) < 40 && Math.random() < 0.65) {
                ch.face(otto); ch.talking = true; st.talkT = 1.2;
                ch.expression = 'happy';
                ch.play(Math.random() < 0.5 ? 'nod' : 'wave', 0.7);
                st.wait = 1.9 + Math.random() * 1.7;
              } else {
                ch.wander(busStopBounds, { minDist: 16, maxDist: 44, speed: 26 }).then(ok => {
                  if (!ok) return;
                  if (otto && otto.visible && Math.hypot(otto.x - ch.x, otto.y - ch.y) < 42) ch.face(otto);
                  else ch.face('down');
                }).catch(() => {});
                st.wait = 2.1 + Math.random() * 1.9;
              }
            });
          }

          tickAI('bramble', (ch, st) => {
            if (milo && !milo.moving && Math.hypot(milo.x - ch.x, milo.y - ch.y) < 46 && Math.random() < 0.5) {
              ch.face(milo); ch.talking = true; st.talkT = 1.3;
              ch.play('nod', 0.7);
              st.wait = 2.2 + Math.random() * 2.0;
            } else {
              ch.wander({ x: 522, y: 182, width: 64, height: 26 }, { minDist: 18, maxDist: 48, speed: 22 }).then(ok => {
                if (!ok) return;
                ch.face(Math.random() < 0.5 ? 'down' : 'up');
                ch.play(Math.random() < 0.5 ? 'lookAround' : 'shiver', 0.7);
                if (Math.random() < 0.3) ch.emote('...');
              }).catch(() => {});
              st.wait = 2.5 + Math.random() * 2.3;
            }
          });

          tickAI('milo', (ch, st) => {
            if (bramble && !bramble.moving && Math.hypot(bramble.x - ch.x, bramble.y - ch.y) < 46 && Math.random() < 0.5) {
              ch.face(bramble); ch.talking = true; st.talkT = 1.2;
              ch.play('wave', 0.7);
              st.wait = 2.3 + Math.random() * 2.1;
            } else {
              ch.wander(miloBounds, { minDist: 20, maxDist: 56, speed: 24 }).then(ok => {
                if (!ok) return;
                ch.play(Math.random() < 0.5 ? 'inspect' : 'lookAround', 0.7);
              }).catch(() => {});
              st.wait = 2.6 + Math.random() * 2.4;
            }
          });

          // Night couple (koda & lumi): converse warmly, share occasional hugs/kisses, then stroll homeward east
          tickAI('koda', (ch, st) => {
            st.phase = st.phase || 'lingering';
            st.beats = (st.beats || 0) + 1;
            if (lumi && !lumi.moving && Math.hypot(lumi.x - ch.x, lumi.y - ch.y) < 46) {
              if (!st.affectionate && (st.beats === 2 || Math.random() < 0.35)) {
                st.affectionate = true;
                const dir = ch.x <= lumi.x ? 'right' : 'left';
                const targetX = lumi.x + (dir === 'right' ? -13 : 13);
                const doHugOrKiss = async () => {
                  if (World.canStand(targetX, lumi.y, ch, true)) await ch.walkTo(targetX, lumi.y, { direct: true, speed: 24 });
                  await Promise.all([ch.face(dir), lumi.face(dir === 'right' ? 'left' : 'right')]);
                  ch.lookTarget = lumi; lumi.lookTarget = ch;
                  const kind = Math.random() < 0.5 ? 'hug' : 'kiss';
                  ch.emote('heart'); lumi.emote('heart');
                  await Promise.all([ch.play(kind, kind === 'hug' ? 1.15 : 0.95), lumi.play(kind, kind === 'hug' ? 1.15 : 0.95)]);
                  ch.lookTarget = null; lumi.lookTarget = null;
                };
                doHugOrKiss().catch(() => {});
                st.wait = 3.2 + Math.random() * 2.2;
                return;
              }
              st.affectionate = false;
              if (st.phase === 'lingering' && st.beats >= 4) {
                st.phase = 'walkHome';
                ch.walkTo(848, 206, { speed: 24 }).then(() => ch.face(lumi)).catch(() => {});
                st.wait = 2.6 + Math.random() * 2.0;
                return;
              }
              if (st.phase === 'walkHome' && ch.x < 810) {
                ch.walkTo(848, 206, { speed: 24 }).then(() => ch.face(lumi)).catch(() => {});
                st.wait = 2.5;
                return;
              }
              ch.face(lumi); ch.talking = true; st.talkT = 1.3; ch.expression = 'tender';
              ch.play('nod', 0.7);
              if (Math.random() < 0.35) ch.emote('heart');
              st.wait = 2.2 + Math.random() * 2.0;
            } else if (st.phase === 'walkHome') {
              ch.wander(coupleHomeBounds, { minDist: 16, maxDist: 52, speed: 22 }).catch(() => {});
              st.wait = 3.0 + Math.random() * 2.2;
            } else {
              ch.face(lumi || 'right');
              st.wait = 1.6 + Math.random() * 1.4;
            }
          });

          tickAI('lumi', (ch, st) => {
            const kSt = ns.koda;
            if (koda && Math.hypot(koda.x - ch.x, koda.y - ch.y) > 30 && !ch.moving) {
              const goalX = koda.x + (koda.x < 800 ? 18 : -18);
              ch.walkTo(Math.max(60, Math.min(910, goalX)), Math.min(218, koda.y + 2), { speed: 24 }).then(() => {
                ch.face(koda);
              }).catch(() => {});
              st.wait = 1.9 + Math.random() * 1.5;
            } else if (koda && !koda.anim && !koda.moving) {
              ch.face(koda); ch.talking = true; st.talkT = 1.2; ch.expression = 'happy';
              ch.play(Math.random() < 0.5 ? 'nod' : 'wave', 0.7);
              if (kSt && kSt.phase === 'walkHome' && Math.random() < 0.3) ch.emote('note');
              st.wait = 2.3 + Math.random() * 2.1;
            } else {
              st.wait = 1.5 + Math.random() * 1.2;
            }
          });

          // Night family (sage & pebble): hang out under west streetlamp then head toward home
          tickAI('sage', (ch, st) => {
            st.phase = st.phase || 'lingering';
            st.beats = (st.beats || 0) + 1;
            if (st.phase === 'lingering' && st.beats >= 3) {
              st.phase = 'walkHome';
              ch.walkTo(106, 206, { speed: 24 }).then(() => ch.face(pebble || 'right')).catch(() => {});
              st.wait = 2.4 + Math.random() * 1.8;
              return;
            }
            if (st.phase === 'walkHome' && ch.x > 165) {
              ch.walkTo(106, 206, { speed: 24 }).then(() => ch.face(pebble || 'right')).catch(() => {});
              st.wait = 2.4;
              return;
            }
            if (pebble && !pebble.moving && Math.hypot(pebble.x - ch.x, pebble.y - ch.y) < 42 && Math.random() < 0.6) {
              ch.face(pebble); ch.talking = true; st.talkT = 1.2; ch.expression = 'happy';
              ch.play('nod', 0.7);
              st.wait = 2.3 + Math.random() * 1.8;
            } else if (st.phase === 'walkHome') {
              ch.wander(familyHomeBounds, { minDist: 16, maxDist: 48, speed: 22 }).catch(() => {});
              st.wait = 2.8 + Math.random() * 2.2;
            } else {
              ch.play('lookAround', 0.75);
              st.wait = 2.2 + Math.random() * 1.8;
            }
          });

          tickAI('pebble', (ch, st) => {
            if (sage && Math.hypot(sage.x - ch.x, sage.y - ch.y) > 32) {
              ch.walkTo(Math.max(54, Math.min(912, sage.x + 16)), Math.min(218, sage.y + 3), { speed: 27 }).then(() => {
                ch.face(sage);
                if (Math.random() < 0.5) ch.play('hop', 0.4);
              }).catch(() => {});
              st.wait = 1.8 + Math.random() * 1.5;
            } else if (sage && !sage.moving) {
              ch.face(sage); ch.expression = 'excited';
              if (Math.random() < 0.5) { ch.play('hop', 0.4); ch.emote('note'); }
              else { ch.talking = true; st.talkT = 1.1; ch.play('wave', 0.65); }
              st.wait = 2.1 + Math.random() * 1.9;
            } else {
              st.wait = 1.6 + Math.random() * 1.3;
            }
          });
        }

        if (this.current === 's03_shop') {
          const owlBounds = { x: 322, y: 128, width: 78, height: 1 };
          tickAI('owl', (ch, st) => {
            ch.wander(owlBounds, { minDist: 16, avoidHistoryDist: 14, direct: true, speed: 24 }).then(ok => {
              if (!ok) return;
              ch.face(Math.random() < 0.7 ? 'down' : 'up');
              ch.play('inspect', 0.7);
              if (Math.random() < 0.35) ch.emote('note');
            }).catch(() => {});
            st.wait = 2.6 + Math.random() * 2.4;
          });
        }

        if (this.current === 's07_party') {
          const partyBounds = { x: 214, y: 145, width: 135, height: 85 };
          const k = Characters.get('kallita'), kt = World.get('living_kallita_talk');
          if (k && kt && k.visible) {
            const side = roni().x >= k.x ? 16 : -16;
            kt.x = k.x; kt.y = k.y;
            kt.interactionPoint = { x: k.x + side, y: k.y };
            kt.interactionRadius = 22;
            kt.facing = null;
          }
          tickAI('kallita', (ch, st) => {
            if (Math.random() < 0.4) {
              ch.face(roni());
              ch.expression = Math.random() < 0.5 ? 'excited' : 'happy';
              if (Math.random() < 0.45) ch.emote(Math.random() < 0.6 ? 'heart' : 'note');
              st.wait = 2.6 + Math.random() * 2.2;
            } else {
              ch.wander(partyBounds, { minDist: 24, maxDist: 85, avoidPlayerDist: 28, speed: 26 }).then(ok => {
                if (!ok) return;
                ch.face(roni());
                ch.expression = 'happy';
              }).catch(() => {});
              st.wait = 2.8 + Math.random() * 2.6;
            }
          });
        }

        if (this.current === 's09_studio' && World.roomId === 'kitchen') {
          const kitchenBounds = { x: 60, y: 118, width: 215, height: 90 };
          tickAI('kallita', (ch, st) => {
            ch.wander(kitchenBounds, { minDist: 26, maxDist: 100, speed: 26 }).then(ok => {
              if (!ok) return;
              ch.play(Math.random() < 0.5 ? 'inspect' : 'lookAround', 0.7);
              if (Math.random() < 0.3) ch.emote('note');
            }).catch(() => {});
            st.wait = 2.8 + Math.random() * 2.6;
          });
        }
      }
      if (!this.current || Game.sandbox || this.triggerBusy || Engine.inScript || !Game.canControl()) return;
      this.syncStudioComputerObjective();
      if (this.current === 's02_street' && !this.flags.sawBloomerySign && roni().x >= 655) {
        this.flags.sawBloomerySign = true;
        this.trigger(async () => {
          roni().moving = false;
          await roni().face('up');
          roni().emote('!');
          await Camera.focus(730, 92, 1.25, 0.8);
          await Engine.wait(1.0);
          await Camera.release();
        });
      }
      if (this.current === 's05_arrival' && this.step === 'surprise') {
        const rect = this.mark('surprise_trigger');
        if (World.pointIn(rect, roni().x, roni().y)) this.trigger(() => this.surprise());
      }
      if (this.current === 's10_finale' && this.step === 'return' && World.roomId === 'living') {
        this.trigger(() => this.finaleArrival());
      }
    },
    trigger(fn) {
      this.triggerBusy = true;
      Engine.runScript(fn).finally(() => { this.triggerBusy = false; });
    },
    renderWorldOverlay(ctx) {
      if (this.distortion > 0.01) {
        const a = Math.min(0.45, this.distortion * 0.45);
        ctx.fillStyle = `rgba(30, 12, 42, ${(a * 0.4).toFixed(2)})`;
        ctx.fillRect(0, 0, Engine.W, Engine.H);
        const t = World.t || 0;
        for (let y = 0; y < Engine.H; y += 3) {
          if (Math.sin(t * 24 + y * 0.4) > 0.5) {
            ctx.fillStyle = `rgba(210, 235, 255, ${(a * 0.25).toFixed(2)})`;
            ctx.fillRect(Math.round(Math.sin(y + t * 40) * 3 * this.distortion), y, Engine.W, 1);
          }
        }
        return;
      }
      if (!this.current || !['s08_album', 's09_studio', 's10_finale'].includes(this.current)) return;
      ctx.fillStyle = 'rgba(66,77,106,0.08)'; ctx.fillRect(0, 0, Engine.W, Engine.H);
    },
    async examine(o) {
      await roni().play('inspect');
      const isLamp = o.id.includes('lamp') || o.type.includes('lamp');
      if (isLamp) {
        o.state.off = !o.state.off;
        sound('ui_select');
        UI.toast(o.state.off ? 'Off.' : 'On.');
        this.commit(); return true;
      }
      const toggles = { office_filing_cabinet: 'open', living_hifi: 'playing', living_crt_tv: 'on', kitchen_refrigerator: 'open', kitchen_sink: 'running', bedroom_wardrobe: 'open', bedroom_easel: 'covered' };
      if (toggles[o.id]) {
        const key = toggles[o.id]; set(o.id, key, !o.state[key]); sound(o.id === 'living_hifi' ? 'piano' : 'ui_select');
        if (o.id === 'living_hifi' && window.Sound) Sound.music(o.state.playing);
        if (key === 'open') UI.toast(o.state.open ? 'Open.' : 'Closed.');
        else if (key === 'on') UI.toast(o.state.on ? 'On.' : 'Off.');
        else if (key === 'playing') UI.toast(o.state.playing ? 'Playing.' : 'Stopped.');
        else if (key === 'running') UI.toast(o.state.running ? 'Water running.' : 'Water off.');
        else UI.toast(o.state[key] ? 'On.' : 'Off.');
        this.commit(); return true;
      }
      if (o.id === 'living_piano' || o.id === 'bedroom_music_keyboard' || o.id === 'bedroom_guitar' || o.id === 'bedroom_electric_guitar') {
        set(o.id, 'playing', true); sound('piano'); await roni().play('reach'); set(o.id, 'playing', false);
      }
      if (o.id === 'bedroom_teddy') { set(o.id, 'hugT', World.t); roni().emote('heart'); }
      if (o.id === 'studio_archive_folders') set(o.id, 'pulled', true);
      if (o.id === 'bedroom_bed') set(o.id, 'made', !o.state.made);
      if (o.id === 'kitchen_dining_table') set(o.id, 'runnerLifted', !o.state.runnerLifted);
      if (o.id === 'living_cactus') set(o.id, 'bloom', true);
      if (o.id === 'office_desk_organizer') sound('ui_select');
      if (o.id === 'living_sofa' || o.id === 'street_bench' || o.id === 'kitchen_chair_04') {
        if (o.id === 'living_sofa') {
          const front = SCENE_LAYOUTS.s07_party.marks.roni_sofa_front;
          const seat = SCENE_LAYOUTS.s07_party.marks.roni_sofa;
          await roni().walkTo(front.x, front.y);
          await roni().walkTo(seat.x, seat.y, { direct: true });
        } else {
          const pos = o.id === 'street_bench' ? SCENE_LAYOUTS.s02_street.marks.bench_seat : { x: o.x, y: o.y };
          await roni().walkTo(pos.x, pos.y, { direct: true });
        }
        await roni().sit('down');
        UI.toast('A quiet moment. Move to stand up.'); return true;
      }
      if (o.id === 'street_bus_stop') {
        const night = World.roomId === 'street' && (this.current === 's04_street_night' || World.light.mode === 'night');
        const msg = night
          ? 'Night Route N12 runs every twenty minutes. Looks like a few neighbors are still waiting—better keep walking east toward home.'
          : 'Route 12 arrives in 4 minutes. Bloomery is closer on foot.';
        await UI.say('roni', msg, { expr: 'happy' });
        this.commit(); return true;
      }
      const text = {
        office_desk_organizer: 'Neat wooden organizer with pens, colorful sticky notes, and a date stamp.',
        office_desk_plant: 'A resilient little desk succulent. Kallita gave it to me on my first day at Pemberton & Co.',
        office_pen_holder: 'Neatly organized gel pens, pencils, and a wooden ruler.',
        office_paperwork: 'Messy notes and project drafts scattered across my desk. Better put these in my bag.',
        office_calendar: 'November 12th. Circled with a little red heart: "Anniversary with Kallita".',
        office_clara_desk: "Clara's desk: sticky notes, a tiny succulent, and a family photo from the seaside.",
        office_wastebasket: 'Three failed drafts. One successful day.',
        office_penguin_desk: 'A mug, neat folders, and a photo of a snowy beach.',
        office_filing_cabinet: 'Quarterly reports. No anniversary ideas in here.',
        office_water_cooler: 'A sip of cool water before the walk home.',
        porch_mailbox: 'A few bills and a postcard addressed to Roni & Kallita.',
        street_storefront_01: 'The bakery has sold its last loaf. Someone is sweeping inside.',
        street_road_sign: 'Maple Street. Downtown is west. Bloomery and Home are east.',
        shop_bucket_01: 'Bright tulips, standing like little cups of sunset.',
        shop_bucket_02: 'Daisies and roses. Too many lovely choices.',
        shop_sunflower_display: 'Sunflowers. Kallita calls them portable sunshine.',
        shop_peony_display: 'Soft peonies. Perfect mixed with sunflowers.',
        shop_chalkboard: 'BLOOMERY: fresh stems, carefully wrapped. Open until seven.',
        shop_corner_fern: 'A lush Boston fern catching the soft warm shop lights.',
        shop_floor_ficus: 'A healthy fiddle-leaf fig greeting visitors by the entrance.',
        living_bookshelf: 'Dog-eared novels beside our old photo albums.',
        living_rotary_phone: 'A dial tone. Neither of us can remember the last time it rang.',
        living_photo_collage: 'Little frames from our ordinary days. We never took enough pictures.',
        living_cactus: 'Still growing. Neither of us is entirely sure how.',
        hallway_console: 'A photograph from the day we moved in. Both tired. Both smiling.',
        kitchen_stove: 'The kettle is still warm. Kallita must have made tea.',
        kitchen_dining_table: 'Three white dotted mandalas, stitched by hand. Our first table runner.',
        kitchen_sink: 'The dishes can wait until tomorrow.',
        bedroom_teddy: 'An old bear with one repaired ear. Kallita refuses to replace it.',
        bedroom_bookshelf: 'Sketchbooks, poetry, and a book of impossible houses.',
        bedroom_poster: 'A midnight Fox Live concert poster Kallita insisted on framing.',
        bedroom_easel: 'An unfinished painting of our home, in the last light of day.',
        bedroom_art_table: 'Mustard paint on the edge. Again.',
        bedroom_vinyl_shelf: "Kallita's vinyl records and a dusty turntable that still plays smoothly.",
        bedroom_guitar: 'Warm cedar and worn frets. Kallita plays it on rainy Sundays.',
        bedroom_music_keyboard: 'Her synth keyboard—half sticky notes of chord progressions, half melodies.',
        bedroom_amplifier: 'A little vintage practice amp humming softly on standby.',
        bedroom_electric_guitar: "Kallita's sky-blue electric guitar, plugged into the practice amp.",
        studio_corkboard: 'Polaroids, ticket stubs, and strings pinning our favorite afternoons together.',
        studio_server_rack: 'My home-lab server rack—cool blue status lights humming quietly in the corner.',
        studio_printer: 'A scanner and printer stocked with glossy photo paper for our prints.',
        studio_archive_folders: 'Kallita kept the scan dates in order. Twelve memories.',
        bedroom_wardrobe: 'Office jackets and comfortable clothes, neatly sharing the same space.',
        bedroom_bed: 'The blanket is soft. Neither of us has outgrown stealing it.'
      };
      if (text[o.id]) await UI.say('roni', text[o.id], { expr: this.flags.album ? 'curious' : 'happy' });
      else UI.toast(o.state.open ? 'Open.' : o.state.off ? 'Off.' : 'A little piece of home.');
      this.commit(); return true;
    }
  };
  window.Scenes = Scenes;
})();
