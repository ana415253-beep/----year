// Procedural audio only. Call Sound.unlock() directly from a pointer/key gesture.
(function (global) {
  'use strict';

  var context = null;
  var masterBus = null;
  var musicBus = null;
  var effectsBus = null;
  var noiseBuffer = null;
  var activeVoices = 0;
  var MAX_VOICES = 72;
  var ambienceLayer = null;
  var scoreLayer = null;
  var scoreTimer = null;
  var scoreIndex = 0;
  var lastPlayed = Object.create(null);
  var state = {
    unlocked: false,
    music: true,
    mood: 'warm',
    room: null,
    lighting: 'day',
    volumes: { master: 0.75, music: 0.55, sfx: 0.7 }
  };
  var EPSILON = 0.0001;

  function number(value, fallback) {
    return typeof value === 'number' && isFinite(value) ? value : fallback;
  }

  function volume(value, fallback) {
    return Math.max(0, Math.min(1, number(value, fallback)));
  }

  function label(value) {
    if (value && typeof value === 'object') value = value.mode || value.name || value.id;
    return String(value == null ? '' : value).toLowerCase();
  }

  function hash(value) {
    var text = label(value), result = 0;
    for (var i = 0; i < text.length; i++) result = (result * 31 + text.charCodeAt(i)) >>> 0;
    return result;
  }

  function midi(note) {
    return 440 * Math.pow(2, (note - 69) / 12);
  }

  function ready() {
    return !!(context && state.unlocked && context.state === 'running');
  }

  function smooth(param, target, seconds) {
    var now = context.currentTime;
    if (param.cancelAndHoldAtTime) param.cancelAndHoldAtTime(now);
    else {
      var current = param.value;
      param.cancelScheduledValues(now);
      param.setValueAtTime(current, now);
    }
    param.linearRampToValueAtTime(target, now + seconds);
  }

  function disconnect(node) {
    try { node.disconnect(); } catch (ignore) { /* Already disconnected. */ }
  }

  function createContext() {
    var AudioContextClass = global.AudioContext || global.webkitAudioContext;
    if (!AudioContextClass) return false;
    context = new AudioContextClass();
    masterBus = context.createGain();
    musicBus = context.createGain();
    effectsBus = context.createGain();
    var limiter = context.createDynamicsCompressor();
    limiter.threshold.value = -18;
    limiter.knee.value = 18;
    limiter.ratio.value = 3;
    limiter.attack.value = 0.025;
    limiter.release.value = 0.35;
    masterBus.gain.value = state.volumes.master;
    musicBus.gain.value = state.volumes.music;
    effectsBus.gain.value = state.volumes.sfx;
    musicBus.connect(masterBus);
    effectsBus.connect(masterBus);
    masterBus.connect(limiter);
    limiter.connect(context.destination);

    // A shared, generated mono buffer feeds filtered swishes, air and footsteps.
    noiseBuffer = context.createBuffer(1, Math.ceil(context.sampleRate * 6), context.sampleRate);
    var samples = noiseBuffer.getChannelData(0);
    for (var i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
    context.addEventListener('statechange', function () {
      if (ready()) {
        if (!ambienceLayer && state.room) buildAmbience();
        startScore();
      } else {
        clearScoreTimer();
      }
    });
    return true;
  }

  function unlock() {
    try {
      if (!context && !createContext()) return Promise.resolve(false);
      if (context.state === 'closed') return Promise.resolve(false);
      // Both resume and the silent source start happen synchronously in the gesture.
      var resumed = context.state === 'running' ? Promise.resolve() : context.resume();
      var source = context.createBufferSource();
      source.buffer = context.createBuffer(1, 1, context.sampleRate);
      source.connect(masterBus);
      source.onended = function () { disconnect(source); };
      source.start();
      return Promise.resolve(resumed).then(function () {
        state.unlocked = context.state === 'running';
        if (ready()) {
          if (!ambienceLayer && state.room) buildAmbience();
          startScore();
        }
        return state.unlocked;
      }, function () { return false; });
    } catch (ignore) {
      return Promise.resolve(false);
    }
  }

  function envelope(param, start, duration, peak, attack) {
    attack = Math.min(attack || 0.008, duration * 0.4);
    param.setValueAtTime(EPSILON, start);
    param.linearRampToValueAtTime(Math.max(EPSILON, peak), start + attack);
    param.exponentialRampToValueAtTime(EPSILON, start + duration);
  }

  function transient(source, nodes, start, duration, owner) {
    activeVoices++;
    if (owner) owner.sources.add(source);
    source.onended = function () {
      activeVoices = Math.max(0, activeVoices - 1);
      if (owner) owner.sources.delete(source);
      nodes.forEach(disconnect);
    };
    source.start(start);
    source.stop(start + duration + 0.025);
  }

  function tone(frequency, duration, peak, options) {
    if (!ready() || peak <= 0 || activeVoices >= MAX_VOICES) return;
    options = options || {};
    var start = context.currentTime + (options.delay || 0);
    var osc = context.createOscillator();
    var filter = context.createBiquadFilter();
    var gain = context.createGain();
    osc.type = options.wave || 'sine';
    osc.frequency.setValueAtTime(Math.max(25, frequency), start);
    osc.detune.value = options.detune || 0;
    if (options.to) osc.frequency.exponentialRampToValueAtTime(Math.max(25, options.to), start + duration);
    filter.type = 'lowpass';
    filter.frequency.value = Math.min(context.sampleRate * 0.45, options.cutoff || 2600);
    filter.Q.value = 0.55;
    envelope(gain.gain, start, duration, Math.min(0.3, peak), options.attack);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(options.bus || effectsBus);
    transient(osc, [osc, filter, gain], start, duration, options.owner);
  }

  function noise(duration, peak, options) {
    if (!ready() || peak <= 0 || activeVoices >= MAX_VOICES) return;
    options = options || {};
    var start = context.currentTime + (options.delay || 0);
    var source = context.createBufferSource();
    var high = context.createBiquadFilter();
    var low = context.createBiquadFilter();
    var gain = context.createGain();
    source.buffer = noiseBuffer;
    source.loop = true;
    source.playbackRate.value = options.rate || 1;
    high.type = 'highpass';
    high.frequency.value = options.highpass || 90;
    high.Q.value = 0.5;
    low.type = 'lowpass';
    low.frequency.value = Math.min(context.sampleRate * 0.45, options.lowpass || 2200);
    low.Q.value = 0.6;
    if (options.to) low.frequency.exponentialRampToValueAtTime(options.to, start + duration);
    envelope(gain.gain, start, duration, Math.min(0.3, peak), options.attack);
    source.connect(high);
    high.connect(low);
    low.connect(gain);
    gain.connect(options.bus || effectsBus);
    transient(source, [source, high, low, gain], start, duration, options.owner);
  }

  function piano(note, strength, delay, bus, owner, detune) {
    var frequency = midi(note);
    var base = { bus: bus || effectsBus, owner: owner, delay: delay || 0, detune: detune || 0 };
    tone(frequency, 2.8, strength * 0.075, Object.assign({}, base, { cutoff: 2200, attack: 0.012 }));
    tone(frequency * 2.003, 1.4, strength * 0.022, Object.assign({}, base, { cutoff: 2800 }));
    tone(frequency * 3.995, 0.65, strength * 0.007, Object.assign({}, base, { cutoff: 3200 }));
    noise(0.04, strength * 0.009, Object.assign({}, base, { highpass: 900, lowpass: 3400 }));
  }

  function allowed(key, seconds) {
    var now = context.currentTime;
    if (lastPlayed[key] != null && now - lastPlayed[key] < seconds) return false;
    lastPlayed[key] = now;
    return true;
  }

  // Every cue is short, softly enveloped and independently volume-scaled.
  function sfx(name, amount) {
    if (!ready() || state.volumes.master === 0 || state.volumes.sfx === 0) return;
    var v = volume(amount, 1);
    var cue = label(name);
    if (!v || !allowed('sfx:' + cue, cue === 'type' ? 0.035 : 0.055)) return;
    switch (cue) {
      case 'ui_open':
        tone(392, 0.22, 0.035 * v, { wave: 'triangle', cutoff: 1500 });
        tone(587.3, 0.27, 0.025 * v, { delay: 0.06 });
        break;
      case 'ui_move':
        tone(420, 0.075, 0.025 * v, { cutoff: 1200 });
        break;
      case 'ui_select':
      case 'msg':
      case 'phone_msg':
        tone(523.25, 0.2, 0.036 * v);
        tone(659.25, 0.3, 0.029 * v, { delay: 0.07 });
        break;
      case 'type':
        noise(0.025, 0.025 * v, { highpass: 800, lowpass: 3200 });
        tone(330, 0.035, 0.01 * v);
        break;
      case 'phone_buzz':
        for (var b = 0; b < 2; b++) {
          tone(83, 0.24, 0.028 * v, { wave: 'sawtooth', cutoff: 280, delay: b * 0.35, attack: 0.04 });
          tone(87, 0.24, 0.022 * v, { wave: 'triangle', cutoff: 300, delay: b * 0.35, attack: 0.04 });
          noise(0.22, 0.015 * v, { highpass: 70, lowpass: 250, delay: b * 0.35 });
        }
        break;
      case 'send':
      case 'phone_send':
        tone(440, 0.22, 0.03 * v, { to: 660, attack: 0.025 });
        noise(0.16, 0.018 * v, { highpass: 1100, lowpass: 2400 });
        break;
      case 'bell':
        tone(880, 0.65, 0.045 * v, { wave: 'sine', cutoff: 2600 });
        tone(1318.5, 0.45, 0.022 * v, { wave: 'triangle', delay: 0.015, cutoff: 2600 });
        break;
      case 'unlock':
        noise(0.06, 0.045 * v, { highpass: 900, lowpass: 3200 });
        tone(620, 0.08, 0.03 * v, { wave: 'triangle', delay: 0.05 });
        tone(780, 0.1, 0.025 * v, { wave: 'triangle', delay: 0.14 });
        break;
      case 'cash':
        tone(1046.5, 0.18, 0.038 * v, { wave: 'triangle' });
        tone(1318.5, 0.28, 0.03 * v, { wave: 'triangle', delay: 0.07 });
        noise(0.08, 0.02 * v, { highpass: 1400, lowpass: 3600, delay: 0.04 });
        break;
      case 'eat':
        noise(0.07, 0.03 * v, { highpass: 250, lowpass: 1100, attack: 0.01 });
        tone(180, 0.08, 0.018 * v, { to: 120, delay: 0.02 });
        break;
      case 'distortion':
        tone(72, 1.4, 0.04 * v, { wave: 'sawtooth', cutoff: 340, attack: 0.18, to: 58 });
        tone(76, 1.4, 0.032 * v, { wave: 'triangle', cutoff: 380, attack: 0.2, to: 63 });
        noise(1.1, 0.026 * v, { highpass: 400, lowpass: 2000, attack: 0.15 });
        break;
      case 'ui_next':
        tone(587.3, 0.13, 0.03 * v);
        tone(440, 0.18, 0.022 * v, { delay: 0.065 });
        break;
      case 'door_open':
        tone(145, 0.5, 0.035 * v, { wave: 'triangle', to: 95, cutoff: 650, attack: 0.035 });
        noise(0.4, 0.055 * v, { highpass: 180, lowpass: 1100, attack: 0.03 });
        tone(280, 0.09, 0.024 * v, { delay: 0.04 });
        break;
      case 'door_close':
        noise(0.25, 0.065 * v, { highpass: 60, lowpass: 750, attack: 0.018 });
        tone(90, 0.32, 0.05 * v, { to: 55, attack: 0.018 });
        tone(240, 0.075, 0.014 * v, { delay: 0.16 });
        break;
      case 'sit':
        noise(0.34, 0.05 * v, { highpass: 100, lowpass: 900, attack: 0.06 });
        tone(90, 0.18, 0.022 * v, { to: 65 });
        break;
      case 'paper':
      case 'page':
        noise(0.3, 0.06 * v, { highpass: 650, lowpass: 4500, to: 1300, attack: 0.035 });
        noise(0.12, 0.03 * v, { highpass: 1600, lowpass: 5000, delay: 0.14 });
        break;
      case 'bag':
      case 'wrap':
        noise(0.42, 0.06 * v, { highpass: 200, lowpass: 2600, attack: 0.045 });
        noise(0.18, 0.04 * v, { highpass: 900, lowpass: 3700, delay: 0.18 });
        tone(130, 0.12, 0.015 * v, { delay: 0.07 });
        break;
      case 'computer_start':
        noise(1.8, 0.035 * v, { highpass: 120, lowpass: 900, attack: 0.45 });
        tone(130, 1.6, 0.015 * v, { wave: 'triangle', to: 170, cutoff: 500, attack: 0.4 });
        [60, 64, 67].forEach(function (note, index) {
          tone(midi(note), 0.35, 0.022 * v, { delay: 0.45 + index * 0.12 });
        });
        break;
      case 'shutter':
        noise(0.045, 0.055 * v, { highpass: 750, lowpass: 4600 });
        noise(0.065, 0.035 * v, { highpass: 350, lowpass: 1800, delay: 0.065 });
        tone(210, 0.065, 0.02 * v);
        break;
      case 'restore':
        [60, 64, 67, 74].forEach(function (note, index) { piano(note, v * 0.65, index * 0.16); });
        tone(196, 2, 0.028 * v, { attack: 0.4 });
        break;
      case 'piano':
        [60, 64, 67].forEach(function (note, index) { piano(note, v * 0.75, index * 0.065); });
        break;
      default:
        // Unknown story cues are intentionally silent, never a startling fallback.
        break;
    }
  }

  function blip(voice) {
    if (!ready() || !allowed('blip', 0.045)) return;
    var name = label(voice);
    var base = 155 + hash(name) % 90;
    if (/low|deep|male|father|grandpa/.test(name)) base = 135;
    if (/high|child|female/.test(name)) base = 235;
    if (typeof voice === 'number') base = Math.max(90, Math.min(380, voice));
    if (voice && typeof voice === 'object') base = Math.max(90, Math.min(380, number(voice.pitch, base)));
    tone(base * (0.97 + Math.random() * 0.06), 0.065, 0.021, { wave: 'triangle', cutoff: 1100, to: base * 0.93 });
  }

  function step(surface, amount, running) {
    if (!ready() || !allowed('step', running ? 0.075 : 0.11)) return;
    var v = volume(amount, 1) * (running ? 1 : 0.75);
    var material = label(surface);
    var duration = running ? 0.1 : 0.15;
    if (/grass|garden|soil|dirt|leaf/.test(material)) {
      noise(duration + 0.08, 0.075 * v, { highpass: 450, lowpass: 2800, attack: 0.015 });
      noise(duration, 0.035 * v, { highpass: 70, lowpass: 450 });
    } else if (/carpet|rug|cloth/.test(material)) {
      noise(duration, 0.055 * v, { highpass: 90, lowpass: 700, attack: 0.015 });
      tone(65, duration, 0.026 * v, { to: 48 });
    } else if (/stone|tile|concrete|pavement|street|marble/.test(material)) {
      noise(duration * 0.75, 0.065 * v, { highpass: 500, lowpass: 3000 });
      tone(150 + Math.random() * 20, duration, 0.033 * v, { wave: 'triangle', cutoff: 800, to: 95 });
    } else {
      noise(duration, 0.05 * v, { highpass: 180, lowpass: 1500 });
      tone(105 + Math.random() * 15, duration + 0.06, 0.045 * v, { to: 72, cutoff: 650 });
      tone(220, 0.065, 0.008 * v, { wave: 'triangle', cutoff: 900 });
    }
  }

  function emote(kind) {
    if (!ready() || !allowed('emote', 0.2)) return;
    var name = label(kind);
    if (/happy|joy|smile|love|laugh|relief/.test(name)) {
      piano(67, 0.45);
      piano(72, 0.35, 0.12);
    } else if (/sad|sigh|tired|worry|fear|cry/.test(name)) {
      tone(220, 0.65, 0.025, { to: 174.6, attack: 0.06 });
      noise(0.32, 0.012, { highpass: 300, lowpass: 1200, attack: 0.06 });
    } else {
      // Surprise and curiosity stay soft; no stingers or abrupt pitch spikes.
      tone(349.2, 0.28, 0.029, { to: 392, wave: 'triangle', cutoff: 1300 });
      tone(523.25, 0.35, 0.015, { delay: 0.11 });
    }
  }

  function makeLayer(bus, target, fade) {
    var gain = context.createGain();
    gain.gain.setValueAtTime(0, context.currentTime);
    gain.gain.linearRampToValueAtTime(target, context.currentTime + fade);
    gain.connect(bus);
    return { gain: gain, sources: new Set(), cleanup: null, disposed: false };
  }

  function disposeLayer(layer) {
    if (!layer || layer.disposed) return;
    layer.disposed = true;
    if (layer.cleanup != null) global.clearTimeout(layer.cleanup);
    layer.sources.forEach(function (source) {
      try { source.stop(); } catch (ignore) { /* A transient may have ended. */ }
    });
    disconnect(layer.gain);
  }

  function fadeLayer(layer, seconds) {
    if (!layer || layer.disposed) return;
    smooth(layer.gain.gain, 0, seconds);
    if (layer.cleanup != null) global.clearTimeout(layer.cleanup);
    layer.cleanup = global.setTimeout(function () { disposeLayer(layer); }, (seconds + 0.1) * 1000);
  }

  function continuous(layer, frequency, peak, detune, cutoff) {
    var osc = context.createOscillator();
    var filter = context.createBiquadFilter();
    var gain = context.createGain();
    osc.type = 'triangle';
    osc.frequency.value = frequency;
    osc.detune.value = detune || 0;
    filter.type = 'lowpass';
    filter.frequency.value = cutoff || 550;
    filter.Q.value = 0.45;
    gain.gain.value = peak;
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(layer.gain);
    layer.sources.add(osc);
    osc.onended = function () {
      layer.sources.delete(osc);
      [osc, filter, gain].forEach(disconnect);
    };
    osc.start();
  }

  function air(layer, peak, highpass, lowpass, rate) {
    var source = context.createBufferSource();
    var high = context.createBiquadFilter();
    var low = context.createBiquadFilter();
    var gain = context.createGain();
    source.buffer = noiseBuffer;
    source.loop = true;
    source.playbackRate.value = rate;
    high.type = 'highpass';
    high.frequency.value = highpass;
    high.Q.value = 0.45;
    low.type = 'lowpass';
    low.frequency.value = lowpass;
    low.Q.value = 0.45;
    gain.gain.value = peak;
    source.connect(high);
    high.connect(low);
    low.connect(gain);
    gain.connect(layer.gain);
    layer.sources.add(source);
    source.onended = function () {
      layer.sources.delete(source);
      [source, high, low, gain].forEach(disconnect);
    };
    source.start(0, Math.random() * 4);
    // Very slow filter breathing makes a shared loop feel less mechanical.
    var motion = context.createOscillator();
    var depth = context.createGain();
    motion.frequency.value = 0.045 + Math.random() * 0.025;
    depth.gain.value = lowpass * 0.16;
    motion.connect(depth);
    depth.connect(low.frequency);
    layer.sources.add(motion);
    motion.onended = function () {
      layer.sources.delete(motion);
      disconnect(motion);
      disconnect(depth);
    };
    motion.start();
  }

  function buildAmbience() {
    if (!ready()) return;
    if (ambienceLayer) fadeLayer(ambienceLayer, 2.5);
    ambienceLayer = null;
    if (!state.room) return;
    var outdoor = /street|outside|outdoor|garden|balcony|park|courtyard|flower/.test(state.room);
    var night = /night|dark|evening|dim/.test(state.lighting);
    var mystery = state.mood === 'investigation';
    var layer = makeLayer(effectsBus, state.mood === 'ending' ? 0.22 : 1, 3);
    ambienceLayer = layer;
    air(layer, outdoor ? 0.065 : 0.027, outdoor ? 100 : 65, night ? 650 : 1200, 0.72);
    air(layer, outdoor ? 0.022 : 0.008, outdoor ? 1200 : 320, outdoor ? 3600 : 700, 0.93);
    var hum = outdoor ? 73.4 : [55, 65.4, 73.4][hash(state.room) % 3];
    continuous(layer, hum, outdoor ? 0.008 : 0.014, 0, 220);
    continuous(layer, hum * (mystery ? 1.004 : 2), mystery ? 0.009 : 0.004, night ? -4 : 2, 380);
    if (state.mood === 'ending') {
      layer.gain.gain.linearRampToValueAtTime(0, context.currentTime + 20);
      layer.cleanup = global.setTimeout(function () {
        disposeLayer(layer);
        // Keep the reference so another unlock does not replay the ending air.
      }, 20100);
    }
  }

  function ambience(room, lighting) {
    var nextRoom = label(room);
    var nextLight = label(lighting) || 'day';
    if (nextRoom === state.room && nextLight === state.lighting) return;
    state.room = nextRoom || null;
    state.lighting = nextLight;
    buildAmbience();
  }

  function clearScoreTimer() {
    if (scoreTimer != null) global.clearTimeout(scoreTimer);
    scoreTimer = null;
  }

  function stopScore(fade) {
    clearScoreTimer();
    if (scoreLayer) fadeLayer(scoreLayer, fade);
    scoreLayer = null;
  }

  var scores = {
    warm: { pad: [48, 55, 64], notes: [60, 64, 67, null, 69, 67, 64, 72], gap: 2.8, spread: 1.6 },
    album: { pad: [53, 60, 69], notes: [65, 69, null, 72, 64, 60, null, 67], gap: 3.7, spread: 1.8 },
    investigation: { pad: [45, 52, 58], notes: [57, null, 64, null, 58, 69, null, 52], gap: 5, spread: 2.5 },
    // Suspended fifths/ninths, no final tonic cadence.
    ending: { pad: [48, 55, 62], notes: [69, null, 62, 67, null, 74], gap: 4.2, spread: 1.5 }
  };

  function scheduleNote() {
    scoreTimer = null;
    if (!ready() || !scoreLayer || !state.music || state.volumes.music === 0 || state.volumes.master === 0) return;
    var score = scores[state.mood];
    var note = score.notes[scoreIndex++ % score.notes.length];
    var mystery = state.mood === 'investigation';
    if (note != null) piano(note, mystery ? 0.36 : 0.52, 0.03, scoreLayer.gain, scoreLayer, mystery ? -7 : 0);
    if (state.mood !== 'ending' && scoreIndex % 4 === 0) {
      piano(score.pad[scoreIndex % score.pad.length], 0.28, 0.4, scoreLayer.gain, scoreLayer);
    }
    scoreTimer = global.setTimeout(scheduleNote, (score.gap + Math.random() * score.spread) * 1000);
  }

  function startScore() {
    if (!ready() || !state.music || state.volumes.music === 0 || state.volumes.master === 0) return;
    if (scoreLayer) {
      if (scoreTimer == null && !scoreLayer.disposed) scheduleNote();
      return;
    }
    var score = scores[state.mood];
    var mystery = state.mood === 'investigation';
    var layer = makeLayer(musicBus, 1, 3.5);
    scoreLayer = layer;
    scoreIndex = 0;
    score.pad.forEach(function (note, index) {
      continuous(layer, midi(note), mystery ? 0.009 : 0.012, mystery ? (index % 2 ? 9 : -8) : index - 1, mystery ? 380 : 700);
    });
    if (state.mood === 'ending') {
      layer.gain.gain.linearRampToValueAtTime(0, context.currentTime + 20);
      layer.cleanup = global.setTimeout(function () {
        if (scoreLayer === layer) clearScoreTimer();
        disposeLayer(layer);
        // Preserve the silent session until a new mood or music toggle.
      }, 20100);
    }
    scoreTimer = global.setTimeout(scheduleNote, 1100);
  }

  function mood(name) {
    var next = label(name);
    if (!Object.prototype.hasOwnProperty.call(scores, next) || next === state.mood) return;
    state.mood = next;
    stopScore(2.5);
    buildAmbience();
    startScore();
  }

  function setVolumes(values) {
    if (!values || typeof values !== 'object') return Object.assign({}, state.volumes);
    ['master', 'music', 'sfx'].forEach(function (key) {
      if (Object.prototype.hasOwnProperty.call(values, key)) state.volumes[key] = volume(values[key], state.volumes[key]);
    });
    if (context && context.state !== 'closed') {
      smooth(masterBus.gain, state.volumes.master, 0.08);
      smooth(musicBus.gain, state.volumes.music, 0.12);
      smooth(effectsBus.gain, state.volumes.sfx, 0.08);
      if (state.volumes.music === 0 || state.volumes.master === 0) stopScore(0.15);
      else startScore();
    }
    return Object.assign({}, state.volumes);
  }

  function music(on) {
    if (typeof on === 'undefined') return state.music;
    state.music = !!on;
    if (state.music) startScore();
    else stopScore(0.65);
    return state.music;
  }

  function setMusicScale(factor, seconds) {
    var k = Math.max(0, Math.min(1, number(factor, 1)));
    var sec = Math.max(0.05, number(seconds, 1));
    if (context && context.state !== 'closed' && musicBus) {
      smooth(musicBus.gain, state.volumes.music * k, sec);
    }
  }

  function silence(seconds) {
    var sec = Math.max(0.1, number(seconds, 2));
    clearScoreTimer();
    if (scoreLayer) fadeLayer(scoreLayer, sec);
    scoreLayer = null;
    if (ambienceLayer) fadeLayer(ambienceLayer, sec);
    ambienceLayer = null;
    if (context && context.state !== 'closed' && musicBus) {
      smooth(musicBus.gain, 0, sec);
    }
  }

  global.Sound = {
    unlock: unlock,
    sfx: sfx,
    blip: blip,
    step: step,
    emote: emote,
    ambience: ambience,
    mood: mood,
    setVolumes: setVolumes,
    music: music,
    setMusicScale: setMusicScale,
    silence: silence
  };
})(window);

