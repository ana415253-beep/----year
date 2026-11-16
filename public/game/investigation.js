// Photo desk. All evidence coordinates are normalized to the untransformed image.
(function () {
  'use strict';

  const ROOT = 'assets/photos/';
  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
  const node = (tag, className, text) => {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== undefined) el.textContent = text;
    return el;
  };
  const button = (text, label, action, className) => {
    const el = node('button', className, text);
    el.type = 'button';
    if (label) el.setAttribute('aria-label', label);
    if (action) el.addEventListener('click', action);
    return el;
  };
  const range = (label, min, max, step, value, action) => {
    const wrap = node('label', 'inv-range');
    const name = node('span', '', label);
    const input = node('input');
    const output = node('output', '', String(value));
    input.type = 'range';
    Object.assign(input, { min, max, step, value });
    input.setAttribute('aria-label', label);
    wrap.append(name, input, output);
    input.addEventListener('input', () => action(Number(input.value)));
    return { wrap, input, output };
  };
  const validPoint = p => p && Number.isFinite(p.x) && Number.isFinite(p.y) &&
    p.x >= 0 && p.x <= 1 && p.y >= 0 && p.y <= 1;

  function validateMetadata(data) {
    if (!data || data.version !== 1 || !Array.isArray(data.photos) || data.photos.length !== 12) {
      throw new Error('Expected version 1 metadata with exactly 12 photos.');
    }
    const ids = new Set(), filenames = new Set();
    for (const photo of data.photos) {
      if (!photo || typeof photo.id !== 'string' || !photo.id.trim() || ids.has(photo.id) ||
          typeof photo.filename !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9_.-]*\.png$/i.test(photo.filename) ||
          filenames.has(photo.filename) || typeof photo.title !== 'string' ||
          typeof photo.memory !== 'string' || !Array.isArray(photo.anomalies)) {
        throw new Error('A photo has invalid or duplicate identity, filename, title, memory, or anomalies.');
      }
      ids.add(photo.id);
      filenames.add(photo.filename);
      const anomalyIds = new Set();
      for (const a of photo.anomalies) {
        if (!a || typeof a.id !== 'string' || !a.id.trim() || anomalyIds.has(a.id) ||
            !validPoint(a) || !Number.isFinite(a.radius) || a.radius <= 0 || a.radius > 1 ||
            typeof a.description !== 'string' || typeof a.hint !== 'string' ||
            typeof a.required !== 'boolean') {
          throw new Error('Invalid anomaly in ' + photo.filename + ': use normalized x/y/radius and text hints.');
        }
        anomalyIds.add(a.id);
      }
      if (!photo.anomalies.some(a => a.required)) {
        throw new Error(photo.filename + ' needs at least one required anomaly.');
      }
    }
    return data;
  }

  // Maximum bipartite matching: a single marker can never satisfy two regions.
  function matchEvidence(photo, markers) {
    const required = photo.anomalies.filter(a => a.required);
    const owners = new Array(markers.length).fill(-1);
    function assign(ai, seen) {
      const a = required[ai];
      for (let mi = 0; mi < markers.length; mi++) {
        if (seen.has(mi) || Math.hypot(markers[mi].x - a.x, markers[mi].y - a.y) > a.radius) continue;
        seen.add(mi);
        if (owners[mi] < 0 || assign(owners[mi], seen)) {
          owners[mi] = ai;
          return true;
        }
      }
      return false;
    }
    let count = 0;
    required.forEach((a, i) => { if (assign(i, new Set())) count++; });
    return { count, total: required.length, owners, complete: required.length > 0 && count === required.length };
  }

  const Investigation = {
    active: false,
    photos: [],
    progress: { restored: [], markers: {}, notes: {}, hints: {} },
    selectedIndex: 0,
    zoom: 1,
    pan: { x: 0, y: 0 },
    brightness: 100,
    contrast: 100,
    negative: false,
    comparing: false,
    element: null,
    viewerCanvas: null,
    debugHost: null,
    _loaded: false,
    _loading: false,
    _error: '',
    _status: '',
    _statusKind: '',
    _imageCache: new Map(),
    _imageEpoch: 0,
    _imagePending: false,
    _photoImage: null,
    _originalImage: null,
    _diff: null,
    _evaluation: null,
    _story: false,
    _submitting: false,
    _saveTimer: null,
    _closeRequested: false,

    get currentPhoto() { return this.photos[this.selectedIndex] || null; },

    async init() {
      if (this._loaded) { this._build(); return true; }
      if (this._initPromise) return this._initPromise;
      this._initPromise = (async () => {
        this._build();
        this._loading = true;
        this._error = '';
        this.render();
        const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
        const timeout = setTimeout(() => controller && controller.abort(), 15000);
        try {
          let rawData = null;
          if (typeof fetch === 'function') {
            try {
              const res = await fetch(ROOT + 'anomalies.json', { cache: 'no-store', signal: controller ? controller.signal : undefined });
              if (res.ok) rawData = await res.json();
            } catch (_) {}
          }
          if (!rawData && window.TheLastAnniversaryAssets && window.TheLastAnniversaryAssets.metadata) {
            rawData = window.TheLastAnniversaryAssets.metadata;
          }
          const data = validateMetadata(rawData);
          this._metadata = data;
          this.photos = data.photos;
          this._sanitizeProgress();
          this._loaded = true;
          this._loading = false;
          this.selectPhoto(this.isLocked(this.selectedIndex) ? 0 : this.selectedIndex);
          return true;
        } finally {
          clearTimeout(timeout);
        }
      })().catch(error => {
        this._loading = false;
        this._loaded = false;
        this.photos = [];
        this._error = 'Cannot load ' + ROOT + 'anomalies.json. ' +
          error.message + ' Ensure real photo metadata exists in ' + ROOT + 'anomalies.json.';
        this.render();
        return false;
      }).finally(() => { this._initPromise = null; });
      return this._initPromise;
    },

    open() {
      if (this.active) return this._openPromise;
      this.active = true;
      this._closeRequested = false;
      this._previousFocus = document.activeElement;
      this._openPromise = new Promise(resolve => { this._resolveClose = resolve; });
      this._clearInput();
      if (window.UI) window.UI.hidden = true;
      this.init().then(ok => {
        if (!this.active || this._story) return;
        if (this.element) {
          this.element.hidden = false;
          if (ok) {
            this._sanitizeProgress();
            this.selectPhoto(this.isLocked(this.selectedIndex) ? 0 : this.selectedIndex);
          }
          this.render();
          this.refs.close.focus();
        }
      });
      if (this.element) {
        this.element.hidden = false;
        this.render();
        this.refs.close.focus();
      }
      return this._openPromise;
    },

    close() {
      if (!this.active) return;
      // Never release the caller's script while its restoration dialogue is still running.
      if (this._story || this._submitting) { this._closeRequested = true; return; }
      this._flushSave();
      this.active = false;
      this._cancelDrag();
      if (this.element) this.element.hidden = true;
      if (window.UI) window.UI.hidden = false;
      this._clearInput();
      if (this._previousFocus && this._previousFocus.isConnected) this._previousFocus.focus();
      const resolve = this._resolveClose;
      this._resolveClose = null;
      this._openPromise = null;
      if (resolve) resolve();
    },

    update() {},

    loadImage(filename, original = false) {
      if (typeof filename !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9_.-]*\.png$/i.test(filename)) {
        return Promise.resolve(null);
      }
      const path = ROOT + (original ? 'original/' : '') + filename;
      if (this._imageCache.has(path)) return this._imageCache.get(path);
      const promise = new Promise(resolve => {
        const image = new Image();
        let done = false;
        const finish = value => {
          if (done) return;
          done = true;
          clearTimeout(timer);
          image.onload = image.onerror = null;
          if (!value) this._imageCache.delete(path);
          resolve(value);
        };
        const timer = setTimeout(() => finish(null), 15000);
        image.onload = () => finish(image.naturalWidth && image.naturalHeight ? image : null);
        image.onerror = () => {
          const embedded = window.TheLastAnniversaryAssets && window.TheLastAnniversaryAssets.images && window.TheLastAnniversaryAssets.images[path];
          if (embedded && image.src !== embedded) { image.src = embedded; }
          else finish(null);
        };
        image.src = path;
      });
      this._imageCache.set(path, promise);
      return promise;
    },

    isLocked(index) {
      return index === this.photos.length - 1 && this.photos.length === 12 &&
        !this.photos.slice(0, -1).every((photo, i) => this.progress.restored.includes(i));
    },

    isRestored(index = this.selectedIndex) { return this.progress.restored.includes(index); },

    _sanitizeProgress() {
      const old = this.progress && typeof this.progress === 'object' ? this.progress : {};
      const progress = { restored: [], markers: {}, notes: {}, hints: {} };
      progress.restored = Array.from(new Set((Array.isArray(old.restored) ? old.restored : [])
        .filter(i => Number.isInteger(i) && i >= 0 && i < this.photos.length))).sort((a, b) => a - b);
      // A malformed save cannot bypass the final photograph's lock.
      if (!this.photos.slice(0, -1).every((p, i) => progress.restored.includes(i))) {
        progress.restored = progress.restored.filter(i => i !== this.photos.length - 1);
      }
      for (const photo of this.photos) {
        const key = photo.filename;
        progress.markers[key] = (old.markers && Array.isArray(old.markers[key]) ? old.markers[key] : [])
          .filter(validPoint).slice(0, 100).map(p => ({ x: p.x, y: p.y }));
        progress.notes[key] = old.notes && typeof old.notes[key] === 'string' ? old.notes[key].slice(0, 10000) : '';
        const hint = old.hints && old.hints[key];
        progress.hints[key] = Number.isFinite(hint) ? clamp(Math.floor(hint), 0, 3) : 0;
      }
      this.progress = progress;
    },

    _save(delay = false) {
      clearTimeout(this._saveTimer);
      this._saveTimer = null;
      if (delay) {
        this._saveTimer = setTimeout(() => { this._saveTimer = null; this._writeSave(); }, 400);
      } else this._writeSave();
    },

    _writeSave() {
      if (!window.Save || typeof window.Save.write !== 'function') return;
      const failed = error => {
        console.warn('[Investigation] Save failed:', error);
        this._setStatus('Changes remain on this desk, but could not be saved. Check storage permissions.', 'error');
      };
      try {
        const result = window.Save.write();
        if (result && typeof result.catch === 'function') result.catch(failed);
      } catch (error) { failed(error); }
    },

    _flushSave() {
      if (this._saveTimer !== null) { clearTimeout(this._saveTimer); this._saveTimer = null; this._writeSave(); }
    },

    _build() {
      if (this.element) return;
      const overlay = document.getElementById('overlay');
      if (!overlay) throw new Error('The game overlay is missing.');
      const panel = node('section', 'investigation');
      panel.hidden = true;
      panel.setAttribute('role', 'dialog');
      panel.setAttribute('aria-modal', 'true');
      panel.setAttribute('aria-label', 'Photographic memory investigation');
      this.element = panel;
      this.refs = {};
      const r = this.refs;

      const titlebar = node('header', 'inv-titlebar');
      const brand = node('div', 'inv-brand');
      brand.append(node('span', 'inv-led'), node('span', '', 'MEMORY / PHOTO LAB'));
      r.counter = node('span', 'inv-counter', 'ARCHIVE OFFLINE');
      r.close = button('Close [Esc]', 'Close photo investigation', () => this.close(), 'inv-close');
      titlebar.append(brand, r.counter, r.close);
      const menubar = node('div', 'inv-menubar');
      menubar.append(node('span', '', 'A YEAR ANNIVERSARY!'), node('span', 'inv-system', 'LOCAL ARCHIVE • READ / RESTORE'));
      const body = node('div', 'inv-body');
      const archive = node('aside', 'inv-archive');
      const archiveHeader = node('div', 'inv-section-title', '01 / CONTACT SHEET');
      r.archiveProgress = node('progress');
      r.archiveProgress.max = 12;
      r.archiveProgress.setAttribute('aria-label', 'Photographs restored');
      r.archiveList = node('div', 'inv-archive-list');
      r.archiveList.setAttribute('aria-label', 'Photo archive');
      r.archiveList.setAttribute('role', 'group');
      archive.append(archiveHeader, r.archiveProgress, r.archiveList);

      const work = node('main', 'inv-work');
      const photoHeader = node('div', 'inv-photo-header');
      const heading = node('div');
      r.photoNumber = node('span', 'inv-kicker', 'NO PHOTO SELECTED');
      r.title = node('h2', '', 'Recover what the photograph remembers.');
      heading.append(r.photoNumber, r.title);
      r.badge = node('span', 'inv-badge', 'WAITING');
      photoHeader.append(heading, r.badge);
      const desk = node('div', 'inv-desk');
      const viewColumn = node('div', 'inv-view-column');
      const viewer = node('div', 'inv-viewer');
      const canvas = node('canvas', 'inv-canvas');
      canvas.tabIndex = 0;
      canvas.setAttribute('role', 'img');
      canvas.setAttribute('aria-label', 'Selected photograph. Click to mark, drag to pan, or use coordinate controls.');
      this.viewerCanvas = canvas;
      r.viewer = viewer;
      r.assetMessage = node('div', 'inv-asset-message');
      r.assetMessage.setAttribute('role', 'status');
      r.coordinate = node('span', 'inv-coordinate', 'X — / Y —');
      viewer.append(canvas, r.assetMessage, r.coordinate);
      const zoomBar = node('div', 'inv-zoom-bar');
      r.zoomMinus = button('−', 'Zoom out', () => this.setZoom(this.zoom - 0.25));
      r.zoomPlus = button('+', 'Zoom in', () => this.setZoom(this.zoom + 0.25));
      r.zoom = range('Zoom', 1, 6, 0.05, 1, value => this.setZoom(value));
      r.reset = button('Reset [R]', 'Reset zoom, pan, and image adjustments', () => this.resetView());
      zoomBar.append(r.zoomMinus, r.zoom.wrap, r.zoomPlus, r.reset);
      r.memory = node('p', 'inv-memory');
      const help = node('p', 'inv-help', 'Click: pin / unpin · Drag: pan · Wheel: zoom · Right-click: remove pin');
      viewColumn.append(viewer, zoomBar, r.memory, help);

      const inspector = node('aside', 'inv-inspector');
      inspector.append(node('div', 'inv-section-title', '02 / INSPECTION TOOLS'));
      r.brightness = range('Brightness', 40, 200, 1, 100, value => {
        this.brightness = value; this._syncControls(); this.requestRender();
      });
      r.contrast = range('Contrast', 40, 220, 1, 100, value => {
        this.contrast = value; this._syncControls(); this.requestRender();
      });
      r.negative = button('Negative', 'Toggle photograph negative', () => {
        this.negative = !this.negative; this._syncControls(); this.requestRender();
      }, 'inv-toggle');
      r.negative.setAttribute('aria-pressed', 'false');
      r.compare = button('Compare original pixels', 'Highlight pixels different from the clean original', () => this.toggleComparison(), 'inv-toggle');
      r.compare.setAttribute('aria-pressed', 'false');
      r.compareInfo = node('p', 'inv-tool-note', 'Compares image pixels, not objects or meaning.');
      inspector.append(r.brightness.wrap, r.contrast.wrap, r.negative, r.compare, r.compareInfo);

      const evidence = node('div', 'inv-evidence');
      r.evidenceCount = node('h3', '', 'EVIDENCE / 0 PINS');
      r.markerList = node('ol', 'inv-marker-list');
      r.markerList.setAttribute('aria-label', 'Recorded evidence pins');
      const coordinates = node('div', 'inv-coordinate-controls');
      const coordinateInput = (label, key) => {
        const wrap = node('label', '', label);
        const input = node('input');
        input.type = 'number'; input.min = '0'; input.max = '100'; input.step = '0.1'; input.value = '50';
        input.setAttribute('aria-label', label + ' position in percent');
        wrap.append(input); coordinates.append(wrap); r[key] = input;
      };
      coordinateInput('X %', 'markX'); coordinateInput('Y %', 'markY');
      r.addCoordinate = button('Pin', 'Add evidence at these normalized coordinates', () => {
        const x = Number(r.markX.value) / 100, y = Number(r.markY.value) / 100;
        if (!r.markX.value || !r.markY.value || !validPoint({ x, y })) {
          this._setStatus('Enter X and Y from 0 to 100 percent.', 'error'); return;
        }
        this.addMarker({ x, y });
      });
      coordinates.append(r.addCoordinate);
      r.clear = button('Clear pins', 'Remove all evidence pins from this photo', () => {
        if (!this.currentPhoto || this.isRestored() || this._submitting) return;
        this.progress.markers[this.currentPhoto.filename] = [];
        this._evaluation = null;
        this._save(); this._setStatus('Evidence pins cleared.'); this._renderEvidence(); this.requestRender();
      }, 'inv-quiet');
      evidence.append(r.evidenceCount, r.markerList, coordinates, r.clear);
      const hintBox = node('div', 'inv-hints');
      r.hint = button('Request hint', 'Reveal the next textual hint', () => this.requestHint());
      r.hintText = node('p', 'inv-hint-text', 'Use the light controls. Look slowly.');
      hintBox.append(r.hint, r.hintText);
      const noteLabel = node('label', 'inv-notes', 'PRIVATE FIELD NOTES');
      r.notes = node('textarea');
      r.notes.rows = 3;
      r.notes.maxLength = 10000;
      r.notes.placeholder = 'What feels out of place?';
      r.notes.setAttribute('aria-label', 'Private notes for this photograph');
      r.notes.addEventListener('input', () => {
        if (!this.currentPhoto) return;
        this.progress.notes[this.currentPhoto.filename] = r.notes.value;
        this._save(true);
      });
      noteLabel.append(r.notes);
      this.debugHost = node('div', 'inv-debug-host');
      inspector.append(evidence, hintBox, noteLabel, this.debugHost);
      desk.append(viewColumn, inspector);
      const submitBar = node('div', 'inv-submit-bar');
      r.status = node('p', 'inv-status', 'Loading archive metadata…');
      r.status.setAttribute('role', 'status');
      r.status.setAttribute('aria-live', 'polite');
      r.submit = button('Restore memory [Enter]', 'Check all required evidence and restore this photo', () => this.submit(), 'inv-submit');
      submitBar.append(r.status, r.submit);
      work.append(photoHeader, desk, submitBar);
      body.append(archive, work);
      const footer = node('footer', 'inv-footer');
      footer.append(node('span', '', 'PHOTO DESK / LOCAL SESSION'), node('span', '', '1–6× OPTICS • NORMALIZED EVIDENCE'));
      panel.append(titlebar, menubar, body, footer);
      overlay.append(panel);
      this._bindViewer();
      window.addEventListener('keydown', event => this._keyDown(event), true);
      window.addEventListener('keyup', event => {
        if (!this.active) return;
        event.stopImmediatePropagation();
        if (window.Input) {
          window.Input.keys.delete(event.code);
          if (!this._story) window.Input.pressedCodes.delete(event.code);
        }
      }, true);
      window.addEventListener('blur', () => { if (this.active) { this._clearInput(); this._cancelDrag(); } });
      window.addEventListener('pagehide', () => this._flushSave());
      if (typeof ResizeObserver !== 'undefined') {
        this._resizeObserver = new ResizeObserver(() => this.requestRender());
        this._resizeObserver.observe(viewer);
      } else window.addEventListener('resize', () => this.requestRender());
      this._mountDebug();
    },

    _mountDebug() {
      if (window.AnomalyDebug && typeof window.AnomalyDebug.mount === 'function') window.AnomalyDebug.mount(this);
    },

    _clearInput() {
      if (!window.Input) return;
      window.Input.keys.clear();
      window.Input.pressedCodes.clear();
      if (window.Input.mouse) {
        window.Input.mouse.down = false;
        window.Input.mouse.clicked = false;
        window.Input.mouse.released = false;
      }
    },

    _keyDown(event) {
      if (!this.active) return;
      event.stopImmediatePropagation();
      if (this._story) {
        // Feed only dialogue navigation directly to UI; do not run main/debug key listeners.
        event.preventDefault();
        const allowed = ['Enter', 'Space', 'KeyE', 'ArrowUp', 'ArrowDown', 'KeyW', 'KeyS', 'Escape', 'ShiftLeft', 'ShiftRight'];
        if (window.Input && allowed.includes(event.code)) {
          if (!event.repeat && !window.Input.keys.has(event.code)) window.Input.pressedCodes.add(event.code);
          window.Input.keys.add(event.code);
        }
        return;
      }
      const editable = event.target && (event.target.matches('input, textarea, select') || event.target.isContentEditable);
      if (event.code === 'Escape') { event.preventDefault(); this.close(); return; }
      if (event.code === 'F2' && window.AnomalyDebug && window.AnomalyDebug.enabled) {
        event.preventDefault(); if (!event.repeat) window.AnomalyDebug.toggle(); return;
      }
      if (event.code === 'Tab') { this._trapFocus(event); return; }
      if (editable) {
        if (event.code === 'Enter' && event.target.tagName !== 'TEXTAREA' && !event.target.closest('.inv-debug')) {
          event.preventDefault(); if (!event.repeat) this.submit();
        }
        return;
      }
      if (window.AnomalyDebug && window.AnomalyDebug.handleKey && window.AnomalyDebug.handleKey(event)) {
        event.preventDefault(); return;
      }
      if (event.code === 'Enter') {
        event.preventDefault();
        if (!event.repeat) {
          if (event.target && event.target.tagName === 'BUTTON') event.target.click();
          else this.submit();
        }
      } else if (event.code === 'KeyR') { event.preventDefault(); this.resetView(); }
      else if ((event.key === '+' || event.key === '=') && !event.ctrlKey && !event.metaKey) {
        event.preventDefault(); this.setZoom(this.zoom + 0.25);
      } else if (event.key === '-' && !event.ctrlKey && !event.metaKey) {
        event.preventDefault(); this.setZoom(this.zoom - 0.25);
      } else if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.code)) {
        event.preventDefault();
        const step = 28;
        this.pan.x += event.code === 'ArrowLeft' ? step : event.code === 'ArrowRight' ? -step : 0;
        this.pan.y += event.code === 'ArrowUp' ? step : event.code === 'ArrowDown' ? -step : 0;
        this.requestRender();
      } else if (event.code !== 'Space' || !event.target || event.target.tagName !== 'BUTTON') {
        // Space retains native focused-button activation; all game listeners remain isolated.
        event.preventDefault();
      }
    },

    _trapFocus(event) {
      const focusable = Array.from(this.element.querySelectorAll('button, input, textarea, select, [tabindex="0"]'))
        .filter(el => !el.disabled && el.getClientRects().length);
      if (!focusable.length) { event.preventDefault(); return; }
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || !this.element.contains(document.activeElement))) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !this.element.contains(document.activeElement))) {
        event.preventDefault(); first.focus();
      }
    },

    selectPhoto(index) {
      if (!Number.isInteger(index) || !this.photos[index] || this._submitting) return;
      if (this.isLocked(index)) { this._setStatus('Restore the first eleven photographs to unlock the final memory.'); return; }
      this._cancelDrag();
      this.selectedIndex = index;
      this._evaluation = null;
      this._status = '';
      this._statusKind = '';
      this._photoImage = this._originalImage = this._diff = null;
      this._imagePending = true;
      this.resetView(false);
      const epoch = ++this._imageEpoch;
      const photo = this.currentPhoto;
      this.refs.notes.value = this.progress.notes[photo.filename] || '';
      this.render();
      Promise.all([this.loadImage(photo.filename), this.loadImage(photo.filename, true)]).then(([image, original]) => {
        if (epoch !== this._imageEpoch) return;
        this._photoImage = image;
        this._originalImage = original;
        this._imagePending = false;
        this._renderAssetMessage();
        this.requestRender();
      });
    },

    resetView(announce = true) {
      this.zoom = 1; this.pan = { x: 0, y: 0 };
      this.brightness = this.contrast = 100;
      this.negative = this.comparing = false;
      if (this.refs) {
        this.refs.compareInfo.textContent = 'Compares image pixels, not objects or meaning.';
        this._syncControls();
      }
      if (announce) this._setStatus('View reset. Evidence pins and notes are unchanged.');
      this.requestRender();
    },

    setZoom(value, anchor) {
      if (!Number.isFinite(value)) return;
      const old = this.zoom, next = clamp(value, 1, 6);
      if (anchor) {
        const t = this._transform();
        this.pan.x = anchor.x - t.cw / 2 - (anchor.x - t.cw / 2 - this.pan.x) * next / old;
        this.pan.y = anchor.y - t.ch / 2 - (anchor.y - t.ch / 2 - this.pan.y) * next / old;
      } else {
        this.pan.x *= next / old;
        this.pan.y *= next / old;
      }
      this.zoom = next;
      this._syncControls();
      this.requestRender();
    },

    _syncControls() {
      if (!this.refs) return;
      const r = this.refs;
      r.zoom.input.value = this.zoom;
      r.zoom.output.textContent = this.zoom.toFixed(2).replace(/0$/, '') + '×';
      r.zoomMinus.disabled = this.zoom <= 1;
      r.zoomPlus.disabled = this.zoom >= 6;
      r.brightness.input.value = this.brightness;
      r.brightness.output.textContent = this.brightness + '%';
      r.contrast.input.value = this.contrast;
      r.contrast.output.textContent = this.contrast + '%';
      r.negative.setAttribute('aria-pressed', String(this.negative));
      r.compare.setAttribute('aria-pressed', String(this.comparing));
    },

    _transform() {
      const rect = this.viewerCanvas.getBoundingClientRect();
      const cw = Math.max(1, rect.width), ch = Math.max(1, rect.height);
      const image = this._photoImage || this._originalImage;
      const iw = image ? image.naturalWidth : 1536, ih = image ? image.naturalHeight : 1024;
      const fit = Math.min(Math.max(1, cw - 20) / iw, Math.max(1, ch - 20) / ih);
      const w = iw * fit * this.zoom, h = ih * fit * this.zoom;
      this.pan.x = clamp(this.pan.x, -Math.max(0, (w - cw) / 2 + 10), Math.max(0, (w - cw) / 2 + 10));
      this.pan.y = clamp(this.pan.y, -Math.max(0, (h - ch) / 2 + 10), Math.max(0, (h - ch) / 2 + 10));
      return { cw, ch, w, h, x: (cw - w) / 2 + this.pan.x, y: (ch - h) / 2 + this.pan.y };
    },

    pointFromEvent(event) {
      const rect = this.viewerCanvas.getBoundingClientRect();
      const t = this._transform();
      const point = { x: (event.clientX - rect.left - t.x) / t.w, y: (event.clientY - rect.top - t.y) / t.h };
      return validPoint(point) ? point : null;
    },

    _bindViewer() {
      const canvas = this.viewerCanvas;
      canvas.addEventListener('wheel', event => {
        event.preventDefault(); event.stopPropagation();
        const rect = canvas.getBoundingClientRect();
        const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? rect.height : 1);
        this.setZoom(this.zoom * Math.exp(-clamp(delta, -300, 300) * 0.002), {
          x: event.clientX - rect.left, y: event.clientY - rect.top
        });
      }, { passive: false });
      canvas.addEventListener('pointerdown', event => {
        if (event.button !== 0 || this._drag || !this.currentPhoto) return;
        event.preventDefault(); event.stopPropagation(); canvas.focus();
        this._drag = { id: event.pointerId, x: event.clientX, y: event.clientY, panX: this.pan.x, panY: this.pan.y, moved: false };
        canvas.setPointerCapture(event.pointerId);
      });
      canvas.addEventListener('pointermove', event => {
        const drag = this._drag;
        if (drag && drag.id === event.pointerId) {
          if (Math.hypot(event.clientX - drag.x, event.clientY - drag.y) > 5) drag.moved = true;
          if (drag.moved) {
            this.pan.x = drag.panX + event.clientX - drag.x;
            this.pan.y = drag.panY + event.clientY - drag.y;
            canvas.classList.add('is-panning'); this.requestRender();
          }
        }
        const p = this.pointFromEvent(event);
        this.refs.coordinate.textContent = p ? 'X ' + (p.x * 100).toFixed(1) + '% / Y ' + (p.y * 100).toFixed(1) + '%' : 'X — / Y —';
      });
      canvas.addEventListener('pointerup', event => {
        const drag = this._drag;
        if (!drag || drag.id !== event.pointerId) return;
        const moved = drag.moved;
        this._cancelDrag();
        if (moved) return;
        const point = this.pointFromEvent(event);
        if (!point) { this._setStatus('Place evidence inside the photograph, not the border.'); return; }
        if (window.AnomalyDebug && window.AnomalyDebug.handleCanvasClick && window.AnomalyDebug.handleCanvasClick(point)) return;
        const nearest = this._nearestMarker(point);
        if (nearest >= 0) this.removeMarker(nearest); else this.addMarker(point);
      });
      canvas.addEventListener('pointercancel', () => this._cancelDrag());
      canvas.addEventListener('lostpointercapture', () => { this._drag = null; canvas.classList.remove('is-panning'); });
      canvas.addEventListener('contextmenu', event => {
        event.preventDefault(); event.stopPropagation();
        const point = this.pointFromEvent(event);
        if (!point) return;
        const nearest = this._nearestMarker(point, 24);
        if (nearest >= 0) this.removeMarker(nearest);
        else this._setStatus('Right-click near an existing pin to remove it.');
      });
    },

    _cancelDrag() {
      if (!this.viewerCanvas) return;
      const drag = this._drag;
      this._drag = null;
      if (drag && this.viewerCanvas.hasPointerCapture(drag.id)) this.viewerCanvas.releasePointerCapture(drag.id);
      this.viewerCanvas.classList.remove('is-panning');
    },

    _nearestMarker(point, pixels = 13) {
      if (!this.currentPhoto) return -1;
      const t = this._transform();
      let best = -1, distance = pixels;
      this.getMarkers().forEach((marker, i) => {
        const d = Math.hypot((marker.x - point.x) * t.w, (marker.y - point.y) * t.h);
        if (d <= distance) { best = i; distance = d; }
      });
      return best;
    },

    getMarkers() { return this.currentPhoto ? (this.progress.markers[this.currentPhoto.filename] || []) : []; },

    addMarker(point) {
      if (!this.currentPhoto || !validPoint(point) || this._submitting) return;
      if (this.isRestored()) { this._setStatus('This memory is restored. Its evidence is preserved.'); return; }
      const markers = this.getMarkers();
      if (markers.length >= 100) { this._setStatus('The desk holds at most 100 pins per photo. Remove a pin first.', 'error'); return; }
      markers.push({ x: point.x, y: point.y });
      this.progress.markers[this.currentPhoto.filename] = markers;
      this._evaluation = null;
      this._save(); this._setStatus('Pin ' + markers.length + ' recorded. Submit to check the evidence.');
      this._renderEvidence(); this.requestRender();
    },

    removeMarker(index) {
      if (!this.currentPhoto || this.isRestored() || this._submitting) return;
      const markers = this.getMarkers();
      if (!Number.isInteger(index) || index < 0 || index >= markers.length) return;
      markers.splice(index, 1);
      this._evaluation = null;
      this._save(); this._setStatus('Evidence pin removed.'); this._renderEvidence(); this.requestRender();
    },

    requestHint() {
      const photo = this.currentPhoto;
      if (!photo) return;
      const previous = this.progress.hints[photo.filename] || 0;
      this.progress.hints[photo.filename] = Math.min(3, previous + 1);
      if (previous < 3) this._save();
      this._renderHints();
    },

    _renderHints() {
      const photo = this.currentPhoto;
      if (!photo) return;
      const level = this.progress.hints[photo.filename] || 0;
      const required = photo.anomalies.filter(a => a.required);
      let text = 'Use the light controls. Look slowly.';
      if (level === 1) text = required.length + ' distinct disturbance' + (required.length === 1 ? '' : 's') +
        ' must be marked. A pin cannot count twice. Compare shapes, edges, and small details.';
      if (level === 2) text = required.map((a, i) => (i + 1) + '. ' + (a.hint || 'Inspect the photo carefully.')).join('\n');
      if (level === 3) text = required.map((a, i) => {
        const row = a.y < 1 / 3 ? 'upper' : a.y > 2 / 3 ? 'lower' : 'middle';
        const col = a.x < 1 / 3 ? 'left' : a.x > 2 / 3 ? 'right' : 'center';
        return (i + 1) + '. ' + (a.description || a.hint || 'Disturbance') + ' — ' + row + ' ' + col + ' region.';
      }).join('\n');
      this.refs.hintText.textContent = text;
      this.refs.hint.textContent = level >= 3 ? 'All hints revealed' : 'Request hint (' + (level + 1) + '/3)';
      this.refs.hint.disabled = level >= 3 || this._submitting;
    },

    async submit() {
      const photo = this.currentPhoto, index = this.selectedIndex;
      if (!this.active || !photo || this._submitting || this._story) return;
      if (this.isLocked(index)) { this._setStatus('The final memory is still locked.', 'error'); return; }
      if (this.isRestored(index)) { this._setStatus('This memory has already been restored.', 'success'); return; }
      const result = matchEvidence(photo, this.getMarkers());
      this._evaluation = result;
      this._renderEvidence(); this.requestRender();
      if (!result.complete) {
        this._setStatus(result.total ? result.count + ' / ' + result.total +
          ' required disturbances matched. Add or reposition pins; each region needs its own pin.' :
          'This photo has no required evidence metadata. Fix it before restoring.', 'error');
        return;
      }
      this._submitting = true;
      this.progress.restored.push(index);
      this.progress.restored.sort((a, b) => a - b);
      this._setStatus('Evidence complete. Memory restored; returning it to the album…', 'success');
      this.render();
      let callbackFailed = false;
      try {
        if (window.Scenes && typeof window.Scenes.onPhotoRestored === 'function') {
          this._story = true;
          this.element.hidden = true;
          this._cancelDrag(); this._clearInput();
          if (document.activeElement && this.element.contains(document.activeElement)) document.activeElement.blur();
          if (window.UI) window.UI.hidden = false;
          const callback = () => window.Scenes.onPhotoRestored(index);
          // Game.interact already owns a script depth until open() resolves.
          if (window.Engine && !window.Engine.inScript && typeof window.Engine.runScript === 'function') {
            await window.Engine.runScript(async () => {
              try { await callback(); } catch (error) { callbackFailed = true; console.error('[Investigation] Album callback:', error); }
            });
          } else await callback();
        }
      } catch (error) {
        callbackFailed = true;
        console.error('[Investigation] Album callback:', error);
      } finally {
        this._story = false;
        this._submitting = false;
        this._save();
        this._clearInput();
        if (this.active) {
          this.element.hidden = false;
          if (window.UI) window.UI.hidden = true;
          this._setStatus(callbackFailed ? 'Photo restored and saved, but its story callback failed. Check the game console.' :
            'Memory restored. ' + this.progress.restored.length + ' / 12 photographs recovered.' +
            (this.progress.restored.length === 11 ? ' The final memory is now unlocked.' : ''), callbackFailed ? 'error' : 'success');
          this.render();
          this.refs.close.focus();
        }
        if (this._closeRequested) this.close();
      }
    },

    toggleComparison() {
      if (!this.currentPhoto) return;
      if (this.comparing) {
        this.comparing = false; this._syncControls(); this._renderAssetMessage(); this.requestRender(); return;
      }
      if (!this._photoImage || !this._originalImage) {
        this.refs.compareInfo.textContent = this._imagePending ? 'Images are still loading. Try again shortly.' :
          'Original pixel comparison unavailable: a photo or clean original is missing. Checking uses JSON coordinates only.';
        this._setStatus(this.refs.compareInfo.textContent, 'warning'); return;
      }
      try {
        if (!this._diff) this._diff = this._comparePixels(this._photoImage, this._originalImage);
        this.comparing = true;
        this.refs.compareInfo.textContent = 'Amber pixels differ by more than 24 / 255 in a color channel (' +
          this._diff.percent.toFixed(2) + '% of pixels). No semantic recognition; submissions use JSON coordinates.';
        this._setStatus('Pixel difference overlay enabled. Lighting, alignment, or noise can also create differences.');
      } catch (error) {
        this.comparing = false;
        this.refs.compareInfo.textContent = 'Pixel comparison unavailable (' + error.message + '). JSON-coordinate checking remains usable.';
        this._setStatus(this.refs.compareInfo.textContent, 'warning');
      }
      this._syncControls(); this._renderAssetMessage(); this.requestRender();
    },

    _comparePixels(image, original) {
      const w = image.naturalWidth, h = image.naturalHeight;
      if (w !== original.naturalWidth || h !== original.naturalHeight) throw new Error('original and photo dimensions differ');
      if (w * h > 20000000) throw new Error('images exceed the safe pixel budget');
      const left = document.createElement('canvas'), right = document.createElement('canvas');
      left.width = right.width = w; left.height = right.height = h;
      const a = left.getContext('2d', { willReadFrequently: true }), b = right.getContext('2d', { willReadFrequently: true });
      if (!a || !b) throw new Error('canvas pixel access is unavailable');
      a.drawImage(image, 0, 0); b.drawImage(original, 0, 0);
      const pixels = a.getImageData(0, 0, w, h).data, clean = b.getImageData(0, 0, w, h).data;
      const overlay = a.createImageData(w, h);
      let changed = 0;
      for (let i = 0; i < pixels.length; i += 4) {
        const delta = Math.max(Math.abs(pixels[i] - clean[i]), Math.abs(pixels[i + 1] - clean[i + 1]),
          Math.abs(pixels[i + 2] - clean[i + 2]), Math.abs(pixels[i + 3] - clean[i + 3]));
        if (delta > 24) {
          overlay.data[i] = 255; overlay.data[i + 1] = 180; overlay.data[i + 2] = 45;
          overlay.data[i + 3] = 190; changed++;
        }
      }
      a.putImageData(overlay, 0, 0);
      return { canvas: left, percent: changed / (w * h) * 100 };
    },

    _setStatus(text, kind = '') {
      this._status = text; this._statusKind = kind;
      if (!this.refs) return;
      this.refs.status.textContent = text;
      this.refs.status.dataset.kind = kind;
    },

    render() {
      if (!this.element) return;
      this._mountDebug();
      const r = this.refs, photo = this.currentPhoto;
      r.counter.textContent = this.photos.length ? 'RECOVERED ' + this.progress.restored.length.toString().padStart(2, '0') + ' / 12' : 'ARCHIVE OFFLINE';
      r.archiveProgress.value = this.progress.restored.length;
      this._renderArchive();
      r.photoNumber.textContent = photo ? 'FILE ' + (this.selectedIndex + 1).toString().padStart(2, '0') + ' / ' + photo.filename : 'NO PHOTO SELECTED';
      r.title.textContent = photo ? photo.title : 'Recover what the photograph remembers.';
      r.badge.textContent = photo ? (this.isRestored() ? 'RESTORED' : 'UNRESOLVED') : 'OFFLINE';
      r.badge.dataset.restored = String(!!photo && this.isRestored());
      r.memory.textContent = photo ? (this.isRestored() ? photo.memory : 'This memory is incomplete. Find what does not belong, then restore its story.') : 'The archive requires its real photographs and anomaly metadata.';
      r.notes.disabled = !photo || this._submitting;
      r.submit.disabled = !photo || this.isRestored() || this._submitting;
      r.submit.textContent = this._submitting ? 'Returning memory…' : this.isRestored() ? 'Memory restored' : 'Restore memory [Enter]';
      r.negative.disabled = r.compare.disabled = !photo || this._submitting;
      r.brightness.input.disabled = r.contrast.input.disabled = !photo;
      if (this._error) this._setStatus(this._error, 'error');
      else if (this._loading) this._setStatus('Loading real archive metadata…');
      else if (this._status) this._setStatus(this._status, this._statusKind);
      else this._setStatus(photo ? (this.isRestored() ? 'This memory has been returned to the album.' :
        'Mark all ' + photo.anomalies.filter(a => a.required).length + ' required disturbances, then restore the memory.') : 'No photo metadata available.');
      this._renderEvidence(); this._renderHints(); this._renderAssetMessage(); this._syncControls();
      if (window.AnomalyDebug && window.AnomalyDebug.refresh) window.AnomalyDebug.refresh();
      this.requestRender();
    },

    _renderArchive() {
      const list = this.refs.archiveList;
      const focused = document.activeElement && document.activeElement.closest('.inv-photo-entry');
      const focusedIndex = focused && list.contains(focused) ? focused.dataset.index : null;
      list.replaceChildren();
      if (!this.photos.length) {
        list.append(node('p', 'inv-empty', this._loading ? 'Reading contact sheet…' : 'Archive unavailable.'));
        if (this._error) list.append(button('Retry metadata', 'Reload archive metadata', () => this.init()));
        return;
      }
      this.photos.forEach((photo, index) => {
        const locked = this.isLocked(index), restored = this.isRestored(index), selected = this.selectedIndex === index;
        const entry = button('', (index + 1) + '. ' + (locked ? 'Locked final memory' : photo.title) +
          (restored ? ', restored' : ''), () => this.selectPhoto(index), 'inv-photo-entry');
        entry.disabled = locked || this._submitting;
        entry.dataset.index = String(index);
        entry.dataset.selected = String(selected);
        entry.dataset.restored = String(restored);
        entry.setAttribute('aria-pressed', String(selected));
        const thumb = node('span', 'inv-thumb');
        if (!locked) {
          const image = node('img');
          image.alt = ''; image.loading = 'lazy'; image.draggable = false;
          image.addEventListener('error', () => { image.hidden = true; thumb.classList.add('is-missing'); });
          image.src = ROOT + photo.filename;
          thumb.append(image);
        } else thumb.append(node('span', '', 'LOCKED'));
        const info = node('span', 'inv-entry-info');
        info.append(node('span', 'inv-entry-number', (index + 1).toString().padStart(2, '0') + ' / ' +
          (locked ? 'SEALED' : restored ? 'RESTORED' : 'PENDING')),
        node('span', 'inv-entry-title', locked ? 'The final memory' : photo.title));
        entry.append(thumb, info);
        list.append(entry);
      });
      if (focusedIndex !== null) {
        const entry = Array.from(list.children).find(item => item.dataset.index === focusedIndex);
        if (entry && !entry.disabled) entry.focus({ preventScroll: true });
      }
    },

    _renderEvidence() {
      const r = this.refs, markers = this.getMarkers(), locked = !this.currentPhoto || this.isRestored() || this._submitting;
      r.evidenceCount.textContent = 'EVIDENCE / ' + markers.length + ' PIN' + (markers.length === 1 ? '' : 'S');
      r.markerList.replaceChildren();
      markers.forEach((marker, i) => {
        const item = node('li');
        const matched = this._evaluation && this._evaluation.owners[i] >= 0;
        const label = (i + 1) + ' · ' + (marker.x * 100).toFixed(1) + '%, ' + (marker.y * 100).toFixed(1) + '%' +
          (this._evaluation ? (matched ? ' · matched' : ' · unmatched') : '');
        const remove = button('Remove', 'Remove pin ' + (i + 1), () => this.removeMarker(i), 'inv-remove');
        remove.disabled = locked;
        item.append(node('span', '', label), remove); r.markerList.append(item);
      });
      if (!markers.length) r.markerList.append(node('li', 'inv-empty', 'No evidence pinned.'));
      r.clear.disabled = locked || !markers.length;
      r.addCoordinate.disabled = r.markX.disabled = r.markY.disabled = locked;
    },

    _renderAssetMessage() {
      if (!this.refs) return;
      let text = '';
      if (this._error) text = 'Metadata unavailable. Use Retry metadata in the contact sheet.';
      else if (!this.currentPhoto) text = 'Loading archive…';
      else if (this._imagePending) text = 'Loading photograph and clean original…';
      else if (!this._photoImage && !this._originalImage) text = 'Photograph missing: ' + ROOT + this.currentPhoto.filename +
        '. The grid is a placeholder, not a generated photo. JSON coordinates and percent pins still work.';
      else if (!this._photoImage) text = 'Investigation photo missing. Showing its clean original; evidence checking uses JSON coordinates.';
      else if (!this._originalImage) text = 'Clean original missing. Pixel comparison is unavailable; checking uses JSON coordinates only.';
      this.refs.assetMessage.textContent = text;
      this.refs.assetMessage.hidden = !text;
    },

    onMetadataEdited() {
      this._evaluation = null;
      this.render();
    },

    requestRender() {
      if (!this.viewerCanvas || this._frame) return;
      this._frame = requestAnimationFrame(() => { this._frame = null; this._draw(); });
    },

    _draw() {
      if (!this.active || this._story || !this.viewerCanvas || this.element.hidden) return;
      const canvas = this.viewerCanvas, t = this._transform();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.round(t.cw * dpr), height = Math.round(t.ch * dpr);
      if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        this.refs.assetMessage.hidden = false;
        this.refs.assetMessage.textContent = 'Canvas display unavailable. Use percent-coordinate pins; validation still uses JSON metadata.';
        return;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, t.cw, t.ch);
      ctx.fillStyle = '#09110f'; ctx.fillRect(0, 0, t.cw, t.ch);
      ctx.save(); ctx.beginPath(); ctx.rect(t.x, t.y, t.w, t.h); ctx.clip();
      const image = this._photoImage || this._originalImage;
      ctx.filter = 'brightness(' + this.brightness + '%) contrast(' + this.contrast + '%) invert(' + (this.negative ? 1 : 0) + ')';
      ctx.imageSmoothingEnabled = !!image && image.naturalWidth > 512;
      if (image) ctx.drawImage(image, t.x, t.y, t.w, t.h);
      else {
        ctx.fillStyle = '#172520'; ctx.fillRect(t.x, t.y, t.w, t.h);
        ctx.strokeStyle = '#3e5548'; ctx.lineWidth = 1;
        for (let i = 0; i <= 10; i++) {
          ctx.beginPath(); ctx.moveTo(t.x + t.w * i / 10, t.y); ctx.lineTo(t.x + t.w * i / 10, t.y + t.h); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(t.x, t.y + t.h * i / 10); ctx.lineTo(t.x + t.w, t.y + t.h * i / 10); ctx.stroke();
        }
      }
      ctx.filter = 'none';
      if (this.comparing && this._diff) ctx.drawImage(this._diff.canvas, t.x, t.y, t.w, t.h);
      if (window.AnomalyDebug && window.AnomalyDebug.drawHitboxes) window.AnomalyDebug.drawHitboxes(ctx, t);
      this.getMarkers().forEach((marker, i) => {
        const x = t.x + marker.x * t.w, y = t.y + marker.y * t.h;
        const matched = this.isRestored() || (this._evaluation && this._evaluation.owners[i] >= 0);
        ctx.beginPath(); ctx.arc(x, y, 10, 0, Math.PI * 2);
        ctx.fillStyle = matched ? '#acd8aa' : '#f2ce84'; ctx.fill();
        ctx.lineWidth = 2; ctx.strokeStyle = '#15271e'; ctx.stroke();
        ctx.fillStyle = '#10251b'; ctx.font = 'bold 11px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(String(i + 1), x, y + 0.5);
      });
      ctx.restore();
      ctx.strokeStyle = '#a4b79a'; ctx.lineWidth = 1; ctx.strokeRect(t.x, t.y, t.w, t.h);
    },

    validateMetadata,
    matchEvidence
  };

  window.Investigation = Investigation;
})();

