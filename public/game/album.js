(function () {
  const el = (tag, text, cls) => { const node = document.createElement(tag); if (text) node.textContent = text; if (cls) node.className = cls; return node; };
  const Album = {
    active: false, selfies: {}, root: null,
    capture(final) {
      const canvas = document.createElement('canvas'); canvas.width = 320; canvas.height = 180;
      const ctx = canvas.getContext('2d'); ctx.imageSmoothingEnabled = false;
      World.render(ctx);
      if (final) {
        // Towering gaunt visitor standing in the dim background shadow behind the right sofa edge (zoom target: 220, 90)
        ctx.fillStyle = 'rgba(10, 8, 18, 0.32)';
        ctx.fillRect(209, 64, 23, 70);
        // Shrouded cloak & elongated torso
        ctx.fillStyle = '#15121d';
        ctx.fillRect(211, 80, 19, 39);
        ctx.fillRect(208, 86, 4, 28);
        ctx.fillRect(229, 86, 4, 28);
        ctx.fillRect(213, 119, 6, 15);
        ctx.fillRect(222, 119, 6, 15);
        ctx.fillStyle = '#201c2b';
        ctx.fillRect(213, 82, 15, 34);
        ctx.fillRect(210, 88, 2, 23);
        ctx.fillRect(229, 88, 2, 23);
        // Collar shadow & gaunt neck
        ctx.fillStyle = '#0d0b14';
        ctx.fillRect(216, 80, 9, 4);
        ctx.fillRect(218, 78, 5, 4);
        // Pale ash-gray gaunt head / hollow skull contour
        ctx.fillStyle = '#5c5769';
        ctx.fillRect(215, 67, 11, 13);
        ctx.fillRect(216, 65, 9, 2);
        ctx.fillStyle = '#8d8799';
        ctx.fillRect(216, 67, 9, 11);
        ctx.fillStyle = '#aba5b8';
        ctx.fillRect(217, 68, 7, 3);
        ctx.fillRect(217, 71, 2, 3);
        ctx.fillRect(222, 71, 2, 3);
        // Deep hollow dark eye sockets & haunting pale pinpoint pupils
        ctx.fillStyle = '#0c0912';
        ctx.fillRect(217, 71, 2, 3);
        ctx.fillRect(222, 71, 2, 3);
        ctx.fillStyle = '#e5e0f0';
        ctx.fillRect(218, 72, 1, 1);
        ctx.fillRect(222, 72, 1, 1);
        // Gaping hollow mouth
        ctx.fillStyle = '#0c0912';
        ctx.fillRect(219, 75, 3, 5);
        ctx.fillStyle = '#6c6678';
        ctx.fillRect(218, 76, 1, 3);
        ctx.fillRect(222, 76, 1, 3);
        // Long pale-gray fingers emerging slightly from cloak sleeves
        ctx.fillStyle = '#8b8596';
        ctx.fillRect(208, 111, 3, 5);
        ctx.fillRect(207, 115, 1, 2);
        ctx.fillRect(209, 115, 1, 3);
        ctx.fillRect(230, 111, 3, 5);
        ctx.fillRect(230, 115, 1, 3);
        ctx.fillRect(232, 115, 1, 2);
      }
      const data = canvas.toDataURL('image/png');
      this.selfies[final ? 'final' : 'party'] = data;
      return data;
    },
    panel(title) {
      this.active = true; UI.hidden = true; UI.clearPrompt();
      this.root = el('section', null, 'album-screen'); this.root.setAttribute('aria-label', title);
      this.root.append(el('h2', title)); document.getElementById('overlay').append(this.root);
      return this.root;
    },
    finish(resolve) {
      this.root.remove(); this.root = null; this.active = false; UI.hidden = false;
      Input.keys.clear(); Input.pressedCodes.clear(); resolve();
    },
    async open(reveal = false) {
      await Investigation.init();
      return new Promise(resolve => {
        const root = this.panel('OUR ORDINARY DAYS');
        const canvas = el('canvas', null, 'album-book'); canvas.width = 320; canvas.height = 180; root.append(canvas);
        const caption = el('p', null, 'album-caption'); root.append(caption);
        const actions = el('div', null, 'album-actions'); root.append(actions);
        const prev = el('button', 'Previous'), next = el('button', 'Next'), close = el('button', reveal ? 'Check the studio scans' : 'Close album');
        actions.append(prev, next, close);
        let index = 0, turn = { value: 0 }, turning = false, image = null;
        const draw = () => {
          const ctx = canvas.getContext('2d'); ctx.imageSmoothingEnabled = false; ctx.clearRect(0, 0, 320, 180);
          ctx.fillStyle = '#5b3239'; ctx.fillRect(7, 3, 306, 173);
          ctx.fillStyle = '#c6ad8a'; ctx.fillRect(13, 9, 294, 162);
          ctx.fillStyle = '#eadbc9'; ctx.fillRect(16, 12, 138, 156); ctx.fillRect(166, 12, 138, 156);
          ctx.fillStyle = '#9b8066'; ctx.fillRect(154, 12, 12, 156);
          const restored = Investigation.progress.restored.includes(index);
          const visible = restored || index === 11;
          ctx.fillStyle = '#b3a89a'; ctx.fillRect(26, 23, 118, 90); ctx.fillRect(177, 23, 116, 90);
          if (visible && image) ctx.drawImage(image, 179, 26, 112, 84);
          else {
            ctx.fillStyle = '#d7cabc'; ctx.fillRect(179, 26, 112, 84);
            ctx.fillStyle = '#8c7e70'; for (const [x, y] of [[180, 27], [285, 27], [180, 104], [285, 104]]) ctx.fillRect(x, y, 5, 4);
          }
          ctx.fillStyle = '#d7cabc'; ctx.fillRect(29, 26, 112, 84);
          Font.drawCentered(ctx, 'PHOTO ' + String(index + 1).padStart(2, '0'), 85, 124, '#554044');
          Font.drawCentered(ctx, visible ? restored ? 'RESTORED' : 'STILL HERE' : 'MISSING', 235, 124, '#554044');
          Font.drawCentered(ctx, (index + 1) + ' / 12', 235, 146, '#80605b');
          if (turn.value > 0 && turn.value < 1) {
            const w = Math.round(Math.sin(turn.value * Math.PI) * 138);
            ctx.fillStyle = '#e1cfb8'; ctx.fillRect(160 - w, 12, w, 156); ctx.fillStyle = '#b79b7c'; ctx.fillRect(160 - w, 12, 2, 156);
          }
        };
        const update = async () => {
          const photo = Investigation.photos[index];
          image = photo ? await Investigation.loadImage(photo.filename) : null;
          caption.textContent = photo ? photo.title + ' — ' + (Investigation.progress.restored.includes(index) ? photo.memory : index === 11 ? 'The only photograph left in the album.' : 'Only the corner mounts remain.') : 'The album is empty. The archive could not be loaded.';
          prev.disabled = index === 0; next.disabled = index === 11;
          close.disabled = reveal && index !== 11;
          draw();
        };
        const move = async delta => {
          if (turning || index + delta < 0 || index + delta > 11) return;
          turning = true; window.Sound && Sound.sfx('page');
          turn.value = 0;
          const renderTurn = () => { if (turning) { draw(); requestAnimationFrame(renderTurn); } };
          renderTurn(); await Engine.tween(turn, { value: 1 }, 0.3); index += delta; await update(); turning = false; draw();
        };
        prev.onclick = () => move(-1); next.onclick = () => move(1);
        const done = () => { window.removeEventListener('keydown', keys, true); this.finish(resolve); };
        close.onclick = done;
        const keys = e => {
          if (!this.active) return;
          if (e.code === 'ArrowRight') { e.preventDefault(); move(1); }
          if (e.code === 'ArrowLeft') { e.preventDefault(); move(-1); }
          if (e.code === 'Escape' && !close.disabled) { e.preventDefault(); done(); }
          if (!['Tab', 'Enter', 'Space'].includes(e.code)) e.stopImmediatePropagation();
        };
        window.addEventListener('keydown', keys, true);
        update(); next.focus();
      });
    },
    async showSelfie(data, final = false) {
      return new Promise(resolve => {
        const root = this.panel(final ? 'ONE MORE ORDINARY EVENING' : 'ANNIVERSARY SELFIE');
        const canvas = el('canvas', null, 'selfie-view'); canvas.width = 320; canvas.height = 180;
        root.append(canvas);
        const caption = el('p', final ? 'Look closely. Is it really just the two of us?' : 'A new memory, saved as a real PNG.', 'album-caption'); root.append(caption);
        const actions = el('div', null, 'album-actions'); root.append(actions);
        const download = el('a', 'Download PNG', 'album-download'); download.href = data; download.download = final ? 'album_13_the_last_anniversary.png' : 'anniversary_selfie.png'; actions.append(download);
        const close = el('button', final ? 'Inspect the background' : 'Keep this memory'); actions.append(close);
        const image = new Image(); const ctx = canvas.getContext('2d'); ctx.imageSmoothingEnabled = false;
        image.onload = () => ctx.drawImage(image, 0, 0); image.src = data;
        let inspected = false;
        const done = async () => {
          if (inspected) return; inspected = true;
          if (final) {
            caption.textContent = 'Closer.'; close.disabled = true;
            const zoom = { value: 1 };
            const draw = () => {
              ctx.save(); ctx.clearRect(0, 0, 320, 180); ctx.translate(160, 90); ctx.scale(zoom.value, zoom.value); ctx.drawImage(image, -220, -90); ctx.restore();
              if (zoom.value < 2.8) requestAnimationFrame(draw);
            };
            draw(); window.Sound && Sound.mood('ending'); await Engine.tween(zoom, { value: 2.8 }, 2.4);
          }
          window.removeEventListener('keydown', keys, true); this.finish(resolve);
        };
        close.onclick = done;
        canvas.onclick = e => { if (final) done(); };
        const keys = e => {
          if (e.code === 'Escape' && !final) { e.preventDefault(); done(); }
          if (e.code === 'Enter' || e.code === 'Space') { e.preventDefault(); done(); }
          if (e.code !== 'Tab') e.stopImmediatePropagation();
        };
        window.addEventListener('keydown', keys, true); close.focus();
      });
    }
  };
  window.Album = Album;
})();

