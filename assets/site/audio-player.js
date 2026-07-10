/**
 * BZH Universe – Audio Player
 * Usage : include this script (defer) on any page, then call:
 *   BZHAudioPlayer.init([ { title, artist, src, cover? }, ... ])
 * Or let it auto-init from <script data-bzh-playlist='...'> pointing to a JSON file.
 */
(function () {
  'use strict';

  // ── Helpers ──────────────────────────────────────────────
  function fmt(sec) {
    if (isNaN(sec)) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60).toString().padStart(2, '0');
    return m + ':' + s;
  }

  function icon(name) {
    const icons = {
      prev:    '⏮',
      play:    '▶',
      pause:   '⏸',
      next:    '⏭',
      vol:     '🔊',
      mute:    '🔇',
      list:    '☰',
      shuffle: '🔀',
      repeat:  '🔁',
      music:   '🎵',
    };
    return icons[name] || '?';
  }

  // ── DOM builder ──────────────────────────────────────────
  function buildUI() {
    // Inject CSS if not already present
    if (!document.querySelector('#bzh-ap-css')) {
      const link = document.createElement('link');
      link.id   = 'bzh-ap-css';
      link.rel  = 'stylesheet';
      // Resolve relative to this script's location
      const base = (document.currentScript || {src: ''}).src
        .replace(/[^/]+$/, '');
      link.href = base + 'audio-player.css';
      document.head.appendChild(link);
    }

    const bar = document.createElement('div');
    bar.className = 'bzh-audioplayer is-hidden';
    bar.setAttribute('role', 'region');
    bar.setAttribute('aria-label', 'Lecteur audio BZH');
    bar.innerHTML = `
      <div class="bzh-ap-thumb" id="bzh-ap-thumb">${icon('music')}</div>
      <div class="bzh-ap-info">
        <div class="bzh-ap-title" id="bzh-ap-title">–</div>
        <div class="bzh-ap-artist" id="bzh-ap-artist">BZH Universe</div>
      </div>
      <div class="bzh-ap-controls">
        <button class="bzh-ap-btn" id="bzh-ap-shuffle" title="Aléatoire">${icon('shuffle')}</button>
        <button class="bzh-ap-btn" id="bzh-ap-prev"    title="Précédent">${icon('prev')}</button>
        <button class="bzh-ap-btn" id="bzh-ap-play"    title="Lecture / Pause">${icon('play')}</button>
        <button class="bzh-ap-btn" id="bzh-ap-next"    title="Suivant">${icon('next')}</button>
        <button class="bzh-ap-btn" id="bzh-ap-repeat"  title="Répéter">${icon('repeat')}</button>
      </div>
      <div class="bzh-ap-seek-wrap">
        <span class="bzh-ap-time" id="bzh-ap-cur">0:00</span>
        <input class="bzh-ap-seek" id="bzh-ap-seek" type="range" min="0" value="0" step="0.1" aria-label="Position">
        <span class="bzh-ap-time" id="bzh-ap-dur">0:00</span>
      </div>
      <div class="bzh-ap-vol-wrap">
        <button class="bzh-ap-btn" id="bzh-ap-mute" title="Muet">${icon('vol')}</button>
        <input class="bzh-ap-vol" id="bzh-ap-vol" type="range" min="0" max="1" step="0.02" value="0.8" aria-label="Volume">
      </div>
      <button class="bzh-ap-btn" id="bzh-ap-list-btn" title="Playlist">${icon('list')}</button>
    `;

    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'bzh-ap-toggle';
    toggleBtn.setAttribute('aria-expanded', 'false');
    toggleBtn.setAttribute('aria-controls', 'bzh-audioplayer');
    toggleBtn.title = 'Lecteur audio';
    toggleBtn.textContent = icon('music');

    const playlist = document.createElement('div');
    playlist.className = 'bzh-ap-playlist-wrap';
    playlist.id = 'bzh-ap-playlist';

    bar.id = 'bzh-audioplayer';
    document.body.appendChild(bar);
    document.body.appendChild(toggleBtn);
    document.body.appendChild(playlist);

    return { bar, toggleBtn, playlist };
  }

  // ── Player logic ─────────────────────────────────────────
  function BZHAudioPlayer() {
    this.tracks   = [];
    this.current  = 0;
    this.shuffle  = false;
    this.repeat   = false;
    this._audio   = new Audio();
    this._built   = false;
  }

  BZHAudioPlayer.prototype.init = function (tracks) {
    if (!tracks || !tracks.length) return;
    this.tracks = tracks;
    if (!this._built) {
      this._build();
      this._built = true;
    }
    this._renderPlaylist();
    this.loadTrack(0);
  };

  BZHAudioPlayer.prototype._build = function () {
    const { bar, toggleBtn, playlist } = buildUI();
    this._bar      = bar;
    this._toggle   = toggleBtn;
    this._plWrap   = playlist;

    // Shorthand getters
    const $ = id => document.getElementById(id);
    this._thumbEl  = $('bzh-ap-thumb');
    this._titleEl  = $('bzh-ap-title');
    this._artistEl = $('bzh-ap-artist');
    this._playBtn  = $('bzh-ap-play');
    this._seekEl   = $('bzh-ap-seek');
    this._curEl    = $('bzh-ap-cur');
    this._durEl    = $('bzh-ap-dur');
    this._volEl    = $('bzh-ap-vol');
    this._muteBtn  = $('bzh-ap-mute');
    this._shuffleBtn = $('bzh-ap-shuffle');
    this._repeatBtn  = $('bzh-ap-repeat');

    const audio = this._audio;
    audio.volume = 0.8;

    // Play / Pause
    this._playBtn.addEventListener('click', () => this.togglePlay());

    // Prev / Next
    $('bzh-ap-prev').addEventListener('click', () => this.prev());
    $('bzh-ap-next').addEventListener('click', () => this.next());

    // Seek
    this._seekEl.addEventListener('input', () => {
      audio.currentTime = parseFloat(this._seekEl.value);
    });

    // Volume
    this._volEl.addEventListener('input', () => {
      audio.volume = parseFloat(this._volEl.value);
      audio.muted  = false;
      this._muteBtn.textContent = icon('vol');
    });

    // Mute toggle
    this._muteBtn.addEventListener('click', () => {
      audio.muted = !audio.muted;
      this._muteBtn.textContent = audio.muted ? icon('mute') : icon('vol');
    });

    // Shuffle
    this._shuffleBtn.addEventListener('click', () => {
      this.shuffle = !this.shuffle;
      this._shuffleBtn.classList.toggle('is-active', this.shuffle);
    });

    // Repeat
    this._repeatBtn.addEventListener('click', () => {
      this.repeat = !this.repeat;
      this._repeatBtn.classList.toggle('is-active', this.repeat);
      audio.loop = this.repeat;
    });

    // Audio events
    audio.addEventListener('timeupdate', () => {
      if (!isNaN(audio.duration)) {
        this._seekEl.max   = audio.duration;
        this._seekEl.value = audio.currentTime;
        this._curEl.textContent = fmt(audio.currentTime);
        this._durEl.textContent = fmt(audio.duration);
      }
    });
    audio.addEventListener('loadedmetadata', () => {
      this._seekEl.max = audio.duration;
      this._durEl.textContent = fmt(audio.duration);
    });
    audio.addEventListener('play',  () => {
      this._playBtn.textContent = icon('pause');
    });
    audio.addEventListener('pause', () => {
      this._playBtn.textContent = icon('play');
    });
    audio.addEventListener('ended', () => {
      if (!this.repeat) this.next();
    });

    // Bar toggle
    toggleBtn.addEventListener('click', () => {
      const hidden = this._bar.classList.toggle('is-hidden');
      toggleBtn.setAttribute('aria-expanded', String(!hidden));
      if (hidden) this._plWrap.classList.remove('is-open');
    });

    // Playlist toggle
    $('bzh-ap-list-btn').addEventListener('click', () => {
      this._plWrap.classList.toggle('is-open');
    });

    // Update toggle position when bar is visible
    this._updateTogglePos();
    window.addEventListener('resize', () => this._updateTogglePos());
  };

  BZHAudioPlayer.prototype._updateTogglePos = function () {
    const h = this._bar.offsetHeight || 56;
    document.documentElement.style.setProperty('--ap-height', h + 'px');
    // add bottom padding to body so content isn't hidden
    document.body.style.paddingBottom = (this._bar.classList.contains('is-hidden') ? 0 : h) + 'px';
  };

  BZHAudioPlayer.prototype.loadTrack = function (index) {
    const t = this.tracks[index];
    if (!t) return;
    this.current = index;
    this._audio.src = t.src;
    this._titleEl.textContent  = t.title  || 'Sans titre';
    this._artistEl.textContent = t.artist || 'BZH Universe';
    if (t.cover) {
      this._thumbEl.innerHTML = `<img src="${t.cover}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:6px">`;
    } else {
      this._thumbEl.innerHTML = icon('music');
    }
    this._curEl.textContent = '0:00';
    this._durEl.textContent = '0:00';
    this._seekEl.value = 0;
    this._renderPlaylist();
  };

  BZHAudioPlayer.prototype.togglePlay = function () {
    if (this._audio.paused) {
      this._audio.play().catch(() => {});
      // Show bar on first play
      this._bar.classList.remove('is-hidden');
      this._toggle.setAttribute('aria-expanded', 'true');
      this._updateTogglePos();
    } else {
      this._audio.pause();
    }
  };

  BZHAudioPlayer.prototype.next = function () {
    let idx;
    if (this.shuffle) {
      idx = Math.floor(Math.random() * this.tracks.length);
    } else {
      idx = (this.current + 1) % this.tracks.length;
    }
    this.loadTrack(idx);
    this._audio.play().catch(() => {});
  };

  BZHAudioPlayer.prototype.prev = function () {
    if (this._audio.currentTime > 3) {
      this._audio.currentTime = 0;
      return;
    }
    const idx = (this.current - 1 + this.tracks.length) % this.tracks.length;
    this.loadTrack(idx);
    this._audio.play().catch(() => {});
  };

  BZHAudioPlayer.prototype._renderPlaylist = function () {
    if (!this._plWrap) return;
    this._plWrap.innerHTML = this.tracks.map((t, i) => `
      <div class="bzh-ap-playlist-item ${i === this.current ? 'is-playing' : ''}" data-idx="${i}">
        <span class="bzh-ap-playlist-num">${i + 1}</span>
        <span>${t.title || 'Sans titre'}${
          t.artist ? ' <small style="opacity:.6">– ' + t.artist + '</small>' : ''
        }</span>
      </div>
    `).join('');
    this._plWrap.querySelectorAll('.bzh-ap-playlist-item').forEach(el => {
      el.addEventListener('click', () => {
        this.loadTrack(parseInt(el.dataset.idx));
        this._audio.play().catch(() => {});
      });
    });
  };

  // ── Auto-init ─────────────────────────────────────────────
  const instance = new BZHAudioPlayer();
  window.BZHAudioPlayer = instance;

  document.addEventListener('DOMContentLoaded', function () {
    // Look for <script data-bzh-playlist="path/to/playlist.json">  
    const scriptEl = document.querySelector('script[data-bzh-playlist]');
    if (scriptEl) {
      fetch(scriptEl.dataset.bzhPlaylist)
        .then(r => r.json())
        .then(data => instance.init(data))
        .catch(err => console.warn('[BZH Audio] Playlist load error:', err));
    }
  });

})();
