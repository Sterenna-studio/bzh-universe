/**
 * BZH Universe – Audio Player v2
 *
 * API publique :
 *   BZHAudioPlayer.play({ title, artist, src, cover? })  → charge + joue immédiatement
 *   BZHAudioPlayer.queue({ title, artist, src, cover? }) → ajoute à la file locale
 *   BZHAudioPlayer.init(tracks[])                        → remplace la playlist courante
 *
 * Intégration dans une page :
 *   <a href="mon-fichier.mp3"
 *      data-bzh-play
 *      data-bzh-title="Titre"
 *      data-bzh-artist="Artiste"
 *      data-bzh-cover="cover.jpg">Écouter</a>
 *
 *   <a href="mon-fichier.mp3"
 *      data-bzh-queue
 *      data-bzh-title="Titre">+ Ajouter</a>
 *
 * La playlist locale est sauvegardée dans localStorage (bzh_ap_queue).
 * Le volume et l'état shuffle/repeat sont également mémorisés.
 */
(function () {
  'use strict';

  var LS_QUEUE  = 'bzh_ap_queue';
  var LS_PREFS  = 'bzh_ap_prefs';
  var LS_CURSOR = 'bzh_ap_cursor';

  // ── Helpers ─────────────────────────────────────────────────────────────
  function fmt(sec) {
    if (isNaN(sec) || sec < 0) return '0:00';
    var m = Math.floor(sec / 60);
    var s = Math.floor(sec % 60).toString().padStart(2, '0');
    return m + ':' + s;
  }

  function icon(name) {
    var map = {
      prev: '⏮', play: '▶', pause: '⏸', next: '⏭',
      vol: '🔊', mute: '🔇', list: '☰', shuffle: '🔀',
      repeat: '🔁', music: '🎵', plus: '＋', trash: '🗑',
      queue: '📋', close: '✕'
    };
    return map[name] || '?';
  }

  function lsGet(key, def) {
    try { var v = localStorage.getItem(key); return v !== null ? JSON.parse(v) : def; }
    catch(e) { return def; }
  }
  function lsSet(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch(e) {}
  }

  function resolveUrl(href) {
    try { return new URL(href, document.baseURI).href; }
    catch(e) { return href; }
  }

  // ── Injection CSS ────────────────────────────────────────────────────────
  var _scriptSrc = '';
  (function(){
    var s = document.currentScript;
    if (s) _scriptSrc = s.src;
  })();

  function injectCSS() {
    if (document.getElementById('bzh-ap-css')) return;
    var link = document.createElement('link');
    link.id  = 'bzh-ap-css';
    link.rel = 'stylesheet';
    link.href = _scriptSrc.replace(/[^/]+$/, '') + 'audio-player.css';
    document.head.appendChild(link);
  }

  // ── DOM builder ──────────────────────────────────────────────────────────
  function buildUI() {
    injectCSS();

    var bar = document.createElement('div');
    bar.id = 'bzh-audioplayer';
    bar.className = 'bzh-audioplayer is-hidden';
    bar.setAttribute('role', 'region');
    bar.setAttribute('aria-label', 'Lecteur audio BZH');
    bar.innerHTML =
      '<div class="bzh-ap-thumb" id="bzh-ap-thumb">' + icon('music') + '</div>' +
      '<div class="bzh-ap-info">' +
        '<div class="bzh-ap-title"  id="bzh-ap-title">–</div>' +
        '<div class="bzh-ap-artist" id="bzh-ap-artist">BZH Universe</div>' +
      '</div>' +
      '<div class="bzh-ap-controls">' +
        '<button class="bzh-ap-btn" id="bzh-ap-shuffle" title="Aléatoire">'    + icon('shuffle') + '</button>' +
        '<button class="bzh-ap-btn" id="bzh-ap-prev"    title="Précédent">'    + icon('prev')    + '</button>' +
        '<button class="bzh-ap-btn" id="bzh-ap-play"    title="Lecture/Pause">'+ icon('play')    + '</button>' +
        '<button class="bzh-ap-btn" id="bzh-ap-next"    title="Suivant">'      + icon('next')    + '</button>' +
        '<button class="bzh-ap-btn" id="bzh-ap-repeat"  title="Répéter">'      + icon('repeat')  + '</button>' +
      '</div>' +
      '<div class="bzh-ap-seek-wrap">' +
        '<span class="bzh-ap-time" id="bzh-ap-cur">0:00</span>' +
        '<input class="bzh-ap-seek" id="bzh-ap-seek" type="range" min="0" value="0" step="0.1" aria-label="Position">' +
        '<span class="bzh-ap-time" id="bzh-ap-dur">0:00</span>' +
      '</div>' +
      '<div class="bzh-ap-vol-wrap">' +
        '<button class="bzh-ap-btn" id="bzh-ap-mute" title="Muet">' + icon('vol') + '</button>' +
        '<input class="bzh-ap-vol" id="bzh-ap-vol" type="range" min="0" max="1" step="0.02" value="0.8" aria-label="Volume">' +
      '</div>' +
      '<button class="bzh-ap-btn" id="bzh-ap-list-btn"  title="Playlist serveur">'   + icon('list')  + '</button>' +
      '<button class="bzh-ap-btn" id="bzh-ap-queue-btn" title="Ma playlist locale">' + icon('queue') + '</button>';

    var toggleBtn = document.createElement('button');
    toggleBtn.className = 'bzh-ap-toggle';
    toggleBtn.setAttribute('aria-expanded', 'false');
    toggleBtn.title = 'Lecteur audio';
    toggleBtn.textContent = icon('music');

    var plServer = document.createElement('div');
    plServer.className = 'bzh-ap-playlist-wrap';
    plServer.id = 'bzh-ap-playlist-server';

    var plLocal = document.createElement('div');
    plLocal.className = 'bzh-ap-playlist-wrap bzh-ap-queue-wrap';
    plLocal.id = 'bzh-ap-playlist-local';
    plLocal.innerHTML =
      '<div class="bzh-ap-queue-header">' +
        '<span>Ma playlist locale</span>' +
        '<button class="bzh-ap-btn bzh-ap-queue-clear" title="Vider la playlist">' + icon('trash') + '</button>' +
      '</div>' +
      '<div id="bzh-ap-queue-list"></div>' +
      '<p class="bzh-ap-queue-empty" id="bzh-ap-queue-empty">Aucun morceau. Utilise <kbd>+ Ajouter</kbd> depuis n\'importe quelle page.</p>';

    document.body.appendChild(bar);
    document.body.appendChild(toggleBtn);
    document.body.appendChild(plServer);
    document.body.appendChild(plLocal);

    return { bar: bar, toggleBtn: toggleBtn, plServer: plServer, plLocal: plLocal };
  }

  // ── Player ───────────────────────────────────────────────────────────────
  function Player() {
    this._audio   = new Audio();
    this._built   = false;
    this._server  = [];
    this._sCursor = 0;
    this._queue   = lsGet(LS_QUEUE, []);
    this._qCursor = lsGet(LS_CURSOR, 0);
    this._mode    = 'server';   // 'server' | 'local'
    this.shuffle  = false;
    this.repeat   = false;
    this._nowPlaying = null;
  }

  // init (playlist serveur JSON)
  Player.prototype.init = function (tracks) {
    this._server  = tracks || [];
    this._sCursor = 0;
    if (!this._built) { this._build(); this._built = true; }
    this._renderServer();
    this._renderQueue();
    // restaurer prefs
    var prefs = lsGet(LS_PREFS, {});
    if (prefs.volume !== undefined && this._volEl) {
      this._audio.volume = prefs.volume;
      this._volEl.value  = prefs.volume;
    }
    if (prefs.shuffle && this._shuffleBtn) {
      this.shuffle = true;
      this._shuffleBtn.classList.add('is-active');
    }
    if (prefs.repeat && this._repeatBtn) {
      this.repeat = true;
      this._audio.loop = true;
      this._repeatBtn.classList.add('is-active');
    }
    // choisir source initiale
    if (this._queue.length) {
      this._mode = 'local';
      if (this._qCursor >= this._queue.length) this._qCursor = 0;
      this._loadRaw(this._queue[this._qCursor]);
    } else if (this._server.length) {
      this._mode = 'server';
      this._loadRaw(this._server[0]);
    }
  };

  // play immédiat (data-bzh-play)
  Player.prototype.play = function (track) {
    if (!track || !track.src) return;
    track.src = resolveUrl(track.src);
    if (!this._built) { this._build(); this._built = true; }
    this._insertInQueue(track, true);
    this._mode    = 'local';
    this._qCursor = 0;
    lsSet(LS_CURSOR, 0);
    this._loadRaw(track);
    this._doPlay();
  };

  // ajouter à la queue locale (data-bzh-queue)
  Player.prototype.queue = function (track) {
    if (!track || !track.src) return;
    track.src = resolveUrl(track.src);
    if (!this._built) { this._build(); this._built = true; }
    this._insertInQueue(track, false);
    this._renderQueue();
    this._flashQueueBtn();
  };

  Player.prototype._insertInQueue = function (track, prepend) {
    this._queue = this._queue.filter(function(t){ return t.src !== track.src; });
    if (prepend) this._queue.unshift(track);
    else         this._queue.push(track);
    lsSet(LS_QUEUE, this._queue);
  };

  Player.prototype._loadRaw = function (track) {
    if (!track) return;
    this._nowPlaying = track;
    this._audio.src  = track.src;
    if (this._titleEl)  this._titleEl.textContent  = track.title  || 'Sans titre';
    if (this._artistEl) this._artistEl.textContent = track.artist || 'BZH Universe';
    if (this._thumbEl) {
      this._thumbEl.innerHTML = track.cover
        ? '<img src="' + track.cover + '" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:6px">'
        : icon('music');
    }
    if (this._curEl)  this._curEl.textContent  = '0:00';
    if (this._durEl)  this._durEl.textContent  = '0:00';
    if (this._seekEl) this._seekEl.value = 0;
    this._renderServer();
    this._renderQueue();
  };

  Player.prototype._doPlay = function () {
    this._bar.classList.remove('is-hidden');
    this._toggle.setAttribute('aria-expanded', 'true');
    this._updatePad();
    this._audio.play().catch(function(){});
  };

  // construction DOM + événements
  Player.prototype._build = function () {
    var ui   = buildUI();
    var self = this;
    this._bar    = ui.bar;
    this._toggle = ui.toggleBtn;
    this._plSrv  = ui.plServer;
    this._plLoc  = ui.plLocal;

    var $ = function(id){ return document.getElementById(id); };
    this._thumbEl    = $('bzh-ap-thumb');
    this._titleEl    = $('bzh-ap-title');
    this._artistEl   = $('bzh-ap-artist');
    this._playBtn    = $('bzh-ap-play');
    this._seekEl     = $('bzh-ap-seek');
    this._curEl      = $('bzh-ap-cur');
    this._durEl      = $('bzh-ap-dur');
    this._volEl      = $('bzh-ap-vol');
    this._muteBtn    = $('bzh-ap-mute');
    this._shuffleBtn = $('bzh-ap-shuffle');
    this._repeatBtn  = $('bzh-ap-repeat');

    var audio = this._audio;
    audio.volume = 0.8;

    this._playBtn.addEventListener('click', function(){ self.togglePlay(); });
    $('bzh-ap-prev').addEventListener('click', function(){ self.prev(); });
    $('bzh-ap-next').addEventListener('click', function(){ self.next(); });

    this._seekEl.addEventListener('input', function(){
      audio.currentTime = parseFloat(self._seekEl.value);
    });
    this._volEl.addEventListener('input', function(){
      audio.volume = parseFloat(self._volEl.value);
      audio.muted  = false;
      self._muteBtn.textContent = icon('vol');
      lsSet(LS_PREFS, Object.assign(lsGet(LS_PREFS, {}), { volume: audio.volume }));
    });
    this._muteBtn.addEventListener('click', function(){
      audio.muted = !audio.muted;
      self._muteBtn.textContent = audio.muted ? icon('mute') : icon('vol');
    });
    this._shuffleBtn.addEventListener('click', function(){
      self.shuffle = !self.shuffle;
      self._shuffleBtn.classList.toggle('is-active', self.shuffle);
      lsSet(LS_PREFS, Object.assign(lsGet(LS_PREFS, {}), { shuffle: self.shuffle }));
    });
    this._repeatBtn.addEventListener('click', function(){
      self.repeat = !self.repeat;
      self._repeatBtn.classList.toggle('is-active', self.repeat);
      audio.loop = self.repeat;
      lsSet(LS_PREFS, Object.assign(lsGet(LS_PREFS, {}), { repeat: self.repeat }));
    });

    audio.addEventListener('timeupdate', function(){
      if (!isNaN(audio.duration)) {
        self._seekEl.max   = audio.duration;
        self._seekEl.value = audio.currentTime;
        self._curEl.textContent = fmt(audio.currentTime);
        self._durEl.textContent = fmt(audio.duration);
      }
    });
    audio.addEventListener('loadedmetadata', function(){
      self._seekEl.max = audio.duration;
      self._durEl.textContent = fmt(audio.duration);
    });
    audio.addEventListener('play',  function(){ self._playBtn.textContent = icon('pause'); });
    audio.addEventListener('pause', function(){ self._playBtn.textContent = icon('play');  });
    audio.addEventListener('ended', function(){ if (!self.repeat) self.next(); });

    // toggle barre
    ui.toggleBtn.addEventListener('click', function(){
      var hidden = self._bar.classList.toggle('is-hidden');
      ui.toggleBtn.setAttribute('aria-expanded', String(!hidden));
      if (hidden) { self._plSrv.classList.remove('is-open'); self._plLoc.classList.remove('is-open'); }
      self._updatePad();
    });
    // panneaux
    $('bzh-ap-list-btn').addEventListener('click', function(){
      self._plLoc.classList.remove('is-open');
      self._plSrv.classList.toggle('is-open');
    });
    $('bzh-ap-queue-btn').addEventListener('click', function(){
      self._plSrv.classList.remove('is-open');
      self._plLoc.classList.toggle('is-open');
    });
    // vider queue
    this._plLoc.querySelector('.bzh-ap-queue-clear').addEventListener('click', function(){
      self._queue = []; self._qCursor = 0;
      lsSet(LS_QUEUE, []); lsSet(LS_CURSOR, 0);
      self._renderQueue();
    });

    this._updatePad();
    window.addEventListener('resize', function(){ self._updatePad(); });
  };

  Player.prototype._updatePad = function () {
    var h = this._bar.offsetHeight || 56;
    document.documentElement.style.setProperty('--ap-height', h + 'px');
    document.body.style.paddingBottom =
      (this._bar.classList.contains('is-hidden') ? 0 : h) + 'px';
  };

  // Navigation
  Player.prototype.togglePlay = function () {
    if (this._audio.paused) this._doPlay();
    else this._audio.pause();
  };

  Player.prototype.next = function () {
    var list   = this._mode === 'local' ? this._queue   : this._server;
    var cursor = this._mode === 'local' ? this._qCursor : this._sCursor;
    if (!list.length) return;
    var idx = this.shuffle ? Math.floor(Math.random() * list.length) : (cursor + 1) % list.length;
    this._setCursor(idx);
    this._loadRaw(list[idx]);
    this._audio.play().catch(function(){});
  };

  Player.prototype.prev = function () {
    if (this._audio.currentTime > 3) { this._audio.currentTime = 0; return; }
    var list   = this._mode === 'local' ? this._queue   : this._server;
    var cursor = this._mode === 'local' ? this._qCursor : this._sCursor;
    if (!list.length) return;
    var idx = (cursor - 1 + list.length) % list.length;
    this._setCursor(idx);
    this._loadRaw(list[idx]);
    this._audio.play().catch(function(){});
  };

  Player.prototype._setCursor = function (idx) {
    if (this._mode === 'local') { this._qCursor = idx; lsSet(LS_CURSOR, idx); }
    else                        { this._sCursor = idx; }
  };

  // Rendu playlist serveur
  Player.prototype._renderServer = function () {
    if (!this._plSrv) return;
    var self = this;
    if (!this._server.length) {
      this._plSrv.innerHTML = '<p style="padding:.6rem 1rem;opacity:.5;font-size:.8rem">Aucune piste serveur.</p>';
      return;
    }
    this._plSrv.innerHTML = this._server.map(function(t, i){
      var active = (self._mode === 'server' && i === self._sCursor);
      return '<div class="bzh-ap-playlist-item' + (active ? ' is-playing' : '') + '" data-src-idx="' + i + '">' +
        '<span class="bzh-ap-playlist-num">' + (i+1) + '</span>' +
        '<span>' + (t.title || 'Sans titre') +
          (t.artist ? ' <small style="opacity:.6">– ' + t.artist + '</small>' : '') +
        '</span></div>';
    }).join('');
    this._plSrv.querySelectorAll('[data-src-idx]').forEach(function(el){
      el.addEventListener('click', function(){
        var i = parseInt(el.dataset.srcIdx);
        self._sCursor = i;
        self._mode = 'server';
        self._loadRaw(self._server[i]);
        self._doPlay();
      });
    });
  };

  // Rendu queue locale
  Player.prototype._renderQueue = function () {
    var listEl  = document.getElementById('bzh-ap-queue-list');
    var emptyEl = document.getElementById('bzh-ap-queue-empty');
    if (!listEl) return;
    var self = this;
    if (!this._queue.length) {
      listEl.innerHTML = '';
      if (emptyEl) emptyEl.style.display = '';
      return;
    }
    if (emptyEl) emptyEl.style.display = 'none';
    listEl.innerHTML = this._queue.map(function(t, i){
      var active = (self._mode === 'local' && i === self._qCursor);
      return '<div class="bzh-ap-playlist-item' + (active ? ' is-playing' : '') + '" data-q-idx="' + i + '">' +
        '<span class="bzh-ap-playlist-num">' + (i+1) + '</span>' +
        '<span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' +
          (t.title || 'Sans titre') +
          (t.artist ? ' <small style="opacity:.6">– ' + t.artist + '</small>' : '') +
        '</span>' +
        '<button class="bzh-ap-btn bzh-ap-q-remove" data-q-rm="' + i + '" title="Retirer">✕</button>' +
        '</div>';
    }).join('');
    listEl.querySelectorAll('[data-q-idx]').forEach(function(el){
      el.addEventListener('click', function(e){
        if (e.target.closest('[data-q-rm]')) return;
        var i = parseInt(el.dataset.qIdx);
        self._qCursor = i; self._mode = 'local';
        lsSet(LS_CURSOR, i);
        self._loadRaw(self._queue[i]);
        self._doPlay();
      });
    });
    listEl.querySelectorAll('[data-q-rm]').forEach(function(btn){
      btn.addEventListener('click', function(e){
        e.stopPropagation();
        var i = parseInt(btn.dataset.qRm);
        self._queue.splice(i, 1);
        if (self._qCursor >= self._queue.length) self._qCursor = Math.max(0, self._queue.length - 1);
        lsSet(LS_QUEUE, self._queue); lsSet(LS_CURSOR, self._qCursor);
        self._renderQueue();
      });
    });
  };

  // flash badge
  Player.prototype._flashQueueBtn = function () {
    var btn = document.getElementById('bzh-ap-queue-btn');
    if (!btn) return;
    btn.classList.add('bzh-ap-badge-flash');
    setTimeout(function(){ btn.classList.remove('bzh-ap-badge-flash'); }, 1200);
    btn.dataset.count = this._queue.length;
  };

  // ── Auto-init ────────────────────────────────────────────────────────────
  var instance = new Player();
  window.BZHAudioPlayer = instance;

  document.addEventListener('DOMContentLoaded', function () {
    var scriptEl = document.querySelector('script[data-bzh-playlist]');
    if (scriptEl) {
      fetch(scriptEl.dataset.bzhPlaylist)
        .then(function(r){ return r.json(); })
        .then(function(data){ instance.init(data); })
        .catch(function(e){ console.warn('[BZH Audio] playlist load error:', e); instance.init([]); });
    } else {
      instance.init([]);
    }

    // Délégation globale data-bzh-play / data-bzh-queue
    document.addEventListener('click', function (e) {
      var el = e.target.closest('[data-bzh-play], [data-bzh-queue]');
      if (!el) return;
      var href  = el.getAttribute('href') || el.dataset.bzhSrc || '';
      var track = {
        src:    href,
        title:  el.dataset.bzhTitle  || el.textContent.trim().slice(0, 60) || 'Sans titre',
        artist: el.dataset.bzhArtist || '',
        cover:  el.dataset.bzhCover  || ''
      };
      if (el.hasAttribute('data-bzh-play')) {
        e.preventDefault();
        instance.play(track);
      } else if (el.hasAttribute('data-bzh-queue')) {
        e.preventDefault();
        instance.queue(track);
      }
    });
  });

})();
