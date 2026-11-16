// Authoring tools are inert unless the page was explicitly opened with ?dev=1.
(function () {
  'use strict';

  const enabled = new URLSearchParams(window.location.search).get('dev') === '1';
  const el = (tag, className, text) => {
    const item = document.createElement(tag);
    if (className) item.className = className;
    if (text !== undefined) item.textContent = text;
    return item;
  };
  const btn = (text, action) => {
    const item = el('button', '', text);
    item.type = 'button';
    item.addEventListener('click', action);
    return item;
  };
  const Debug = {
    enabled,
    open: false,
    showHitboxes: false,
    mode: 'select',
    selectedId: null,
    investigation: null,
    panel: null,
    dirty: false,
    _photoId: null,

    mount(investigation) {
      if (!this.enabled || !investigation.debugHost || this.panel) return;
      this.investigation = investigation;
      const host = investigation.debugHost;
      const toggle = btn('Anomaly editor [F2]', () => this.toggle());
      toggle.className = 'inv-debug-toggle';
      toggle.setAttribute('aria-expanded', 'false');
      const panel = el('section', 'inv-debug');
      panel.setAttribute('aria-label', 'Developer anomaly coordinate editor');
      panel.hidden = true;
      this.panel = panel;
      this.refs = { toggle };
      const r = this.refs;
      panel.append(el('h3', '', 'DEVELOPER / COORDINATE EDITOR'),
        el('p', 'inv-tool-note', 'Edits are in memory only. Export JSON, then replace the metadata yourself. No image recognition.'));
      const hitLabel = el('label', 'inv-debug-check', 'Show normalized hitboxes');
      r.hitboxes = el('input'); r.hitboxes.type = 'checkbox';
      hitLabel.prepend(r.hitboxes);
      r.hitboxes.addEventListener('change', () => {
        this.showHitboxes = r.hitboxes.checked; investigation.requestRender();
      });
      panel.append(hitLabel);
      const modes = el('div', 'inv-debug-modes');
      r.modes = {};
      for (const mode of ['select', 'add', 'move']) {
        const item = btn(mode === 'select' ? 'Select' : mode === 'add' ? 'Add at click' : 'Move at click', () => this.setMode(mode));
        item.setAttribute('aria-pressed', String(mode === this.mode));
        modes.append(item); r.modes[mode] = item;
      }
      panel.append(modes);
      const selectedLabel = el('label', 'inv-debug-field', 'Selected region');
      r.list = el('select'); r.list.setAttribute('aria-label', 'Anomaly region to edit');
      selectedLabel.append(r.list);
      r.list.addEventListener('change', () => { this.selectedId = r.list.value || null; this.refresh(); investigation.requestRender(); });
      panel.append(selectedLabel);
      const position = el('div', 'inv-debug-position');
      const numeric = (name, key, min, max, step, convert) => {
        const label = el('label', 'inv-debug-field', name);
        const input = el('input');
        input.type = 'number'; Object.assign(input, { min, max, step });
        input.setAttribute('aria-label', name);
        label.append(input); position.append(label); r[key] = input;
        input.addEventListener('input', () => {
          const anomaly = this.selected;
          if (!anomaly || !input.value || !input.checkValidity()) return;
          const value = Number(input.value);
          if (!Number.isFinite(value)) return;
          anomaly[key] = convert(value); this._changed(false);
        });
        input.addEventListener('change', () => this.refresh());
      };
      numeric('X %', 'x', 0, 100, 0.01, value => value / 100);
      numeric('Y %', 'y', 0, 100, 0.01, value => value / 100);
      numeric('Radius (0–1)', 'radius', 0.001, 1, 0.001, value => value);
      panel.append(position);
      const requiredLabel = el('label', 'inv-debug-check', 'Required for restoration');
      r.required = el('input'); r.required.type = 'checkbox'; requiredLabel.prepend(r.required);
      r.required.addEventListener('change', () => {
        if (!this.selected) return;
        this.selected.required = r.required.checked; this._changed(false);
      });
      panel.append(requiredLabel);
      for (const field of ['description', 'hint']) {
        const label = el('label', 'inv-debug-field', field === 'hint' ? 'Textual hint' : 'Description');
        const input = el('textarea'); input.rows = 2;
        input.setAttribute('aria-label', 'Anomaly ' + field);
        label.append(input); panel.append(label); r[field] = input;
        input.addEventListener('input', () => {
          if (!this.selected) return;
          this.selected[field] = input.value; this._changed(false);
        });
      }
      const actions = el('div', 'inv-debug-actions');
      r.remove = btn('Delete region', () => this.deleteSelected());
      r.export = btn('Export updated JSON', () => this.exportJSON());
      actions.append(r.remove, r.export); panel.append(actions);
      r.message = el('p', 'inv-debug-message', 'F2 toggles this editor. Select, add, or move by clicking the photograph.');
      r.message.setAttribute('role', 'status'); panel.append(r.message);
      host.append(toggle, panel);
      this.refresh();
    },

    get selected() {
      const photo = this.investigation && this.investigation.currentPhoto;
      return photo ? photo.anomalies.find(a => a.id === this.selectedId) || null : null;
    },

    toggle(force) {
      if (!this.enabled) return;
      if (!this.panel && window.Investigation) this.mount(window.Investigation);
      if (!this.panel) return;
      this.open = typeof force === 'boolean' ? force : !this.open;
      this.panel.hidden = !this.open;
      this.refs.toggle.setAttribute('aria-expanded', String(this.open));
      if (this.open) {
        this.showHitboxes = true;
        this.refs.hitboxes.checked = true;
        this.refresh();
        this.panel.scrollIntoView({ block: 'nearest' });
      }
      this.investigation.requestRender();
    },

    setMode(mode) {
      if (!this.enabled || !['select', 'add', 'move'].includes(mode)) return;
      this.mode = mode;
      if (this.refs) Object.keys(this.refs.modes).forEach(key => this.refs.modes[key].setAttribute('aria-pressed', String(key === mode)));
      this._message(mode === 'add' ? 'Click the photograph to add a region. New regions use radius 0.04.' :
        mode === 'move' ? 'Select a region, then click its new center.' : 'Click a hitbox or choose a region in the list.');
    },

    refresh() {
      if (!this.enabled || !this.panel) return;
      const photo = this.investigation.currentPhoto, r = this.refs;
      if (this._photoId !== (photo && photo.id)) {
        this._photoId = photo && photo.id;
        this.selectedId = photo && photo.anomalies.length ? photo.anomalies[0].id : null;
      }
      if (photo && !photo.anomalies.some(a => a.id === this.selectedId)) {
        this.selectedId = photo.anomalies.length ? photo.anomalies[0].id : null;
      }
      r.list.replaceChildren();
      if (photo) photo.anomalies.forEach(a => {
        const option = el('option', '', a.id + (a.required ? ' / required' : ' / optional'));
        option.value = a.id; r.list.append(option);
      });
      if (!photo || !photo.anomalies.length) {
        const option = el('option', '', 'No regions'); option.value = ''; r.list.append(option);
      }
      r.list.value = this.selectedId || '';
      const a = this.selected;
      r.x.value = a ? (a.x * 100).toFixed(2) : '';
      r.y.value = a ? (a.y * 100).toFixed(2) : '';
      r.radius.value = a ? a.radius : '';
      r.description.value = a ? a.description : '';
      r.hint.value = a ? a.hint : '';
      r.required.checked = !!a && a.required;
      for (const key of ['x', 'y', 'radius', 'description', 'hint', 'required', 'remove']) r[key].disabled = !a;
      r.list.disabled = !a;
      r.export.disabled = !photo;
      r.hitboxes.checked = this.showHitboxes;
    },

    handleCanvasClick(point) {
      if (!this.enabled || !this.open || !this.investigation || !this.investigation.currentPhoto) return false;
      const photo = this.investigation.currentPhoto;
      if (this.mode === 'add') {
        let serial = 1;
        while (photo.anomalies.some(a => a.id === photo.id + '-edit-' + serial)) serial++;
        const anomaly = {
          id: photo.id + '-edit-' + serial, x: point.x, y: point.y, radius: 0.04,
          description: 'Describe the visible disturbance.', hint: 'Write a useful textual hint.', required: true
        };
        photo.anomalies.push(anomaly); this.selectedId = anomaly.id;
        this._changed(); this._message('Region added. Edit its radius, description, and hint before export.');
      } else if (this.mode === 'move') {
        const a = this.selected;
        if (!a) this._message('Select a region before moving it.');
        else { a.x = point.x; a.y = point.y; this._changed(); this._message('Region center moved.'); }
      } else {
        let nearest = null, best = Infinity;
        photo.anomalies.forEach(a => {
          const distance = Math.hypot(a.x - point.x, a.y - point.y);
          if (distance <= Math.max(a.radius, 0.025) && distance < best) { nearest = a; best = distance; }
        });
        if (nearest) { this.selectedId = nearest.id; this.refresh(); this.investigation.requestRender(); }
        this._message(nearest ? 'Selected ' + nearest.id + '.' : 'No region at that location. Use Add at click to create one.');
      }
      // Editor clicks are never also game evidence clicks.
      return true;
    },

    deleteSelected() {
      if (!this.enabled || !this.selected) return;
      const photo = this.investigation.currentPhoto, index = photo.anomalies.findIndex(a => a.id === this.selectedId);
      photo.anomalies.splice(index, 1);
      this.selectedId = photo.anomalies.length ? photo.anomalies[Math.min(index, photo.anomalies.length - 1)].id : null;
      this._changed(); this._message('Region deleted. Every photo must retain at least one required region for export.');
    },

    handleKey(event) {
      if (!this.enabled || !this.open || !this.investigation) return false;
      if (event.code === 'Delete' || event.code === 'Backspace') {
        if (!event.repeat) this.deleteSelected();
        return true;
      }
      return false;
    },

    _changed(refresh = true) {
      this.dirty = true;
      const inv = this.investigation;
      inv._evaluation = null;
      // Keep text/number editing stable; full refresh would reset the caret on each input.
      if (refresh) inv.onMetadataEdited();
      else { inv._renderEvidence(); inv._renderHints(); inv.requestRender(); }
      this._message('Metadata modified in memory. Export to keep these changes.');
    },

    _message(text) { if (this.refs) this.refs.message.textContent = text; },

    exportJSON() {
      if (!this.enabled || !this.investigation || !this.investigation.photos.length) return null;
      const data = { version: 1, photos: this.investigation.photos };
      try { this.investigation.validateMetadata(data); }
      catch (error) { this._message('Cannot export: ' + error.message); return null; }
      const json = JSON.stringify(data, null, 2) + '\n';
      let url;
      try {
        url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
        const link = el('a');
        link.href = url; link.download = 'anomalies.json';
        this.panel.append(link); link.click(); link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        this.dirty = false;
        this._message('Updated anomalies.json exported. Replace assets/photos/anomalies.json manually.');
      } catch (error) {
        if (url) URL.revokeObjectURL(url);
        this._message('Download unavailable: ' + error.message + '. exportJSON() still returns the JSON text.');
      }
      return json;
    },

    drawHitboxes(ctx, transform) {
      if (!this.enabled || !this.showHitboxes || !this.investigation || !this.investigation.currentPhoto) return;
      const t = transform;
      ctx.save();
      this.investigation.currentPhoto.anomalies.forEach((a, i) => {
        const selected = a.id === this.selectedId;
        const x = t.x + a.x * t.w, y = t.y + a.y * t.h;
        ctx.strokeStyle = selected ? '#f7dd81' : '#7ee7df';
        ctx.fillStyle = selected ? 'rgba(247,221,129,0.12)' : 'rgba(126,231,223,0.08)';
        ctx.lineWidth = selected ? 2 : 1;
        ctx.setLineDash(a.required ? [5, 3] : [2, 4]);
        ctx.beginPath(); ctx.ellipse(x, y, a.radius * t.w, a.radius * t.h, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.setLineDash([]);
        ctx.beginPath(); ctx.moveTo(x - 5, y); ctx.lineTo(x + 5, y); ctx.moveTo(x, y - 5); ctx.lineTo(x, y + 5); ctx.stroke();
        ctx.font = '11px monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
        const label = 'DEV ' + (i + 1) + (a.required ? '' : ' optional');
        const width = ctx.measureText(label).width;
        ctx.fillStyle = '#081b17'; ctx.fillRect(x + 6, y - 19, width + 6, 15);
        ctx.fillStyle = selected ? '#f7dd81' : '#7ee7df'; ctx.fillText(label, x + 9, y - 6);
      });
      ctx.restore();
    }
  };

  window.AnomalyDebug = Debug;
  // Either script order is supported; Investigation also mounts the editor during render/init.
  if (enabled && window.Investigation && window.Investigation.debugHost) Debug.mount(window.Investigation);
})();

