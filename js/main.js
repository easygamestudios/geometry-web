/* ============================================================
   Geometry Web — интерфейс: лобби, гараж, выбор уровня, HUD
   ============================================================ */
(function () {
  'use strict';
  const GW = window.GW;
  const $ = (sel) => document.querySelector(sel);

  /* ---------- масштабирование сцены 1280x720 + чёткий канвас ---------- */
  const stage = $('#stage');
  let stageScale = 1;
  const hidpiCanvases = [];

  function applyHiDPI(canvas) {
    // разрешение канваса = логика 1280x720 × масштаб экрана × dpr —
    // картинка остаётся чёткой и на больших мониторах, и на Retina
    const k = Math.min(2.5, Math.max(1, stageScale) * (window.devicePixelRatio || 1));
    const w = Math.round(1280 * k), h = Math.round(720 * k);
    if (canvas.width !== w) {
      canvas.width = w;
      canvas.height = h;
      canvas.style.width = '1280px';
      canvas.style.height = '720px';
    }
    canvas.getContext('2d').setTransform(k, 0, 0, k, 0, 0);
  }

  function fitStage() {
    const s = Math.min(window.innerWidth / 1280, window.innerHeight / 720);
    if (s > 0 && Math.abs(s - stageScale) > 0.001) {
      stageScale = s;
      stage.style.transform = `scale(${s})`;
      hidpiCanvases.forEach(applyHiDPI);
    } else if (s > 0) {
      stage.style.transform = `scale(${s})`;
    }
  }

  function setupHiDPI(canvas) {
    if (!hidpiCanvases.includes(canvas)) hidpiCanvases.push(canvas);
    applyHiDPI(canvas);
  }
  window.GW_SETUP_HIDPI = setupHiDPI;

  // окно может «доехать» до финального размера уже после загрузки —
  // пересчитываем масштаб по всем возможным сигналам
  window.addEventListener('resize', fitStage);
  window.addEventListener('orientationchange', fitStage);
  window.addEventListener('load', fitStage);
  if (window.visualViewport) window.visualViewport.addEventListener('resize', fitStage);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) fitStage(); });
  [100, 400, 1000].forEach(ms => setTimeout(fitStage, ms));
  fitStage();

  const gameCanvas = $('#game-canvas');
  if (!gameCanvas.getContext || !gameCanvas.getContext('2d')) {
    document.body.innerHTML = '<div style="color:#fff;font:20px Arial;padding:40px;text-align:center">Твой браузер не поддерживает canvas.<br>Открой игру в свежем Chrome, Firefox или Safari.</div>';
    return;
  }
  setupHiDPI(gameCanvas);

  /* ---------- сохранения ---------- */
  const SAVE_KEY = 'gw_save_v1';
  function loadSave() {
    try { return JSON.parse(localStorage.getItem(SAVE_KEY)) || {}; } catch (e) { return {}; }
  }
  function writeSave() { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); }
  const save = Object.assign({ icon: 0, levels: {} }, loadSave());
  function levelSave(name) {
    if (!save.levels[name]) save.levels[name] = { best: 0, practice: 0, coins: [], totalAttempts: 0, totalJumps: 0 };
    const ls = save.levels[name];
    if (ls.totalAttempts == null) ls.totalAttempts = ls.attempts || 0;
    if (ls.totalJumps == null) ls.totalJumps = 0;
    return ls;
  }

  /* ---------- экраны ---------- */
  const screens = ['lobby', 'garage', 'levels', 'game', 'editor', 'map'];
  function showScreen(name) {
    screens.forEach(s => {
      const el = $('#screen-' + s);
      if (el) el.classList.toggle('active', s === name);
    });
  }
  const fader = $('#fader');
  function fadeTo(name, cb) {
    fader.style.opacity = 1;
    setTimeout(() => {
      showScreen(name);
      if (cb) cb();
      fader.style.opacity = 0;
    }, 260);
  }

  function toast(msg, ms) {
    const t = $('#toast');
    t.textContent = msg;
    t.style.display = 'block';
    clearTimeout(toast._tm);
    toast._tm = setTimeout(() => { t.style.display = 'none'; }, ms || 2200);
  }

  /* ---------- иконки в лобби и гараже ---------- */
  const LOCKED_SLOTS = 6;

  function drawIconOn(canvas, id) {
    const c = canvas.getContext('2d');
    c.clearRect(0, 0, canvas.width, canvas.height);
    GW.Icons.draw(c, id, canvas.width / 2, canvas.height / 2, canvas.width * 0.82, 0);
  }

  // кубик 2 открывается за прохождение первого уровня
  function iconLocked(ic) {
    if (ic.id === 0) return false;
    if (ic.id === 1) {
      const lvl1 = (window.LEVELS || [])[0];
      return !(lvl1 && save.levels[lvl1.name] && save.levels[lvl1.name].best >= 100);
    }
    return true;
  }

  function buildGarage() {
    drawIconOn($('#garage-btn-icon'), save.icon);
    drawIconOn($('#garage-preview'), save.icon);
    const grid = $('#icon-grid');
    grid.innerHTML = '';
    GW.Icons.list.forEach(ic => {
      const locked = iconLocked(ic);
      const slot = document.createElement('div');
      slot.className = 'icon-slot' + (save.icon === ic.id ? ' selected' : '') + (locked ? ' locked-icon' : '');
      const cv = document.createElement('canvas');
      cv.width = cv.height = 62;
      slot.appendChild(cv);
      drawIconOn(cv, ic.id);
      if (locked) {
        const lk = document.createElement('div');
        lk.className = 'icon-lock';
        lk.innerHTML = `<svg width="26" height="26" viewBox="0 0 40 40">
          <rect x="8" y="17" width="24" height="17" rx="4" fill="#222" stroke="#000" stroke-width="3"/>
          <path d="M13 17 v-4 a7 7 0 0 1 14 0 v4" fill="none" stroke="#000" stroke-width="4"/>
          <path d="M13 17 v-4 a7 7 0 0 1 14 0 v4" fill="none" stroke="#999" stroke-width="2.5"/>
        </svg>`;
        slot.appendChild(lk);
      }
      slot.addEventListener('click', () => {
        if (iconLocked(ic)) {
          toast('Пройди уровень «' + ((window.LEVELS || [])[0] || {}).name + '», чтобы открыть этот кубик!');
          return;
        }
        save.icon = ic.id;
        writeSave();
        game && game.setIcon(ic.id);
        buildGarage();
      });
      grid.appendChild(slot);
    });
    for (let i = 0; i < LOCKED_SLOTS; i++) {
      const slot = document.createElement('div');
      slot.className = 'icon-slot locked';
      slot.innerHTML = `<svg width="34" height="34" viewBox="0 0 40 40">
        <rect x="8" y="17" width="24" height="17" rx="4" fill="#3a3a3a" stroke="#000" stroke-width="3"/>
        <path d="M13 17 v-4 a7 7 0 0 1 14 0 v4" fill="none" stroke="#000" stroke-width="4"/>
        <path d="M13 17 v-4 a7 7 0 0 1 14 0 v4" fill="none" stroke="#777" stroke-width="2.5"/>
      </svg>`;
      grid.appendChild(slot);
    }
  }

  /* ---------- сложность уровня (лицо в стиле GD) ---------- */
  const DIFF_META = {
    easy:   { name: 'Легко',        color: '#5ec1ff' },
    normal: { name: 'Нормально',    color: '#7dff5e' },
    hard:   { name: 'Сложно',       color: '#ffc95e' },
    harder: { name: 'Очень сложно', color: '#ff7d5e' },
    insane: { name: 'Безумно',      color: '#ff5ec8' },
    demon:  { name: 'Демон',        color: '#c84aff' }
  };
  function drawDiffFace(canvas, diff) {
    const meta = DIFF_META[diff] || DIFF_META.normal;
    const c = canvas.getContext('2d');
    const S = canvas.width, cx = S / 2, cy = S / 2, r = S * 0.38;
    c.clearRect(0, 0, S, S);
    // рожки демона
    if (diff === 'demon') {
      c.fillStyle = meta.color;
      c.strokeStyle = '#000'; c.lineWidth = 3;
      [[-1, 0], [1, 0]].forEach(([sgn]) => {
        c.beginPath();
        c.moveTo(cx + sgn * r * 0.5, cy - r * 0.55);
        c.lineTo(cx + sgn * r * 0.95, cy - r * 1.25);
        c.lineTo(cx + sgn * r * 0.98, cy - r * 0.35);
        c.closePath();
        c.fill(); c.stroke();
      });
    }
    // лицо
    const g = c.createRadialGradient(cx - r * 0.3, cy - r * 0.35, r * 0.2, cx, cy, r);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.25, meta.color);
    g.addColorStop(1, meta.color);
    c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2);
    c.fillStyle = g; c.fill();
    c.lineWidth = 3.5; c.strokeStyle = '#000'; c.stroke();
    // глаза (наклон бровей растёт со сложностью)
    const tilt = { easy: 0, normal: 0.1, hard: 0.25, harder: 0.4, insane: 0.5, demon: 0.6 }[diff] || 0;
    c.fillStyle = '#000';
    [[-1, 0], [1, 0]].forEach(([sgn]) => {
      c.save();
      c.translate(cx + sgn * r * 0.42, cy - r * 0.18);
      c.rotate(sgn * tilt);
      c.beginPath();
      c.ellipse(0, 0, r * 0.13, r * 0.22, 0, 0, Math.PI * 2);
      c.fill();
      c.restore();
    });
    // рот
    c.lineWidth = 4; c.strokeStyle = '#000'; c.lineCap = 'round';
    c.beginPath();
    if (diff === 'easy') c.arc(cx, cy + r * 0.25, r * 0.42, 0.25, Math.PI - 0.25);
    else if (diff === 'normal') c.arc(cx, cy + r * 0.3, r * 0.34, 0.45, Math.PI - 0.45);
    else if (diff === 'hard') { c.moveTo(cx - r * 0.36, cy + r * 0.48); c.lineTo(cx + r * 0.36, cy + r * 0.48); }
    else if (diff === 'harder') c.arc(cx, cy + r * 0.85, r * 0.4, Math.PI + 0.5, -0.5);
    else { // insane / demon — зигзаг
      c.moveTo(cx - r * 0.42, cy + r * 0.5);
      for (let i = 0; i < 4; i++) {
        c.lineTo(cx - r * 0.42 + (i + 0.5) * r * 0.21, cy + r * (i % 2 ? 0.5 : 0.36));
      }
      c.lineTo(cx + r * 0.42, cy + r * 0.5);
    }
    c.stroke();
    // клыки демона
    if (diff === 'demon') {
      c.fillStyle = '#fff';
      c.strokeStyle = '#000'; c.lineWidth = 2;
      [[-0.22, 1], [0.22, 1]].forEach(([dx]) => {
        c.beginPath();
        c.moveTo(cx + dx * r - 4, cy + r * 0.44);
        c.lineTo(cx + dx * r, cy + r * 0.66);
        c.lineTo(cx + dx * r + 4, cy + r * 0.44);
        c.closePath();
        c.fill(); c.stroke();
      });
    }
  }

  /* ---------- выбор уровня ---------- */
  let levelIndex = 0;
  function currentLevels() { return window.LEVELS || []; }

  function buildLevelCard() {
    const list = currentLevels();
    if (!list.length) return;
    levelIndex = Math.max(0, Math.min(levelIndex, list.length - 1));
    const lvl = list[levelIndex];
    const ls = levelSave(lvl.name);
    $('#level-name').textContent = lvl.name;
    const diff = lvl.difficulty || 'normal';
    drawDiffFace($('#level-diff-face'), diff);
    $('#level-diff-name').textContent = (DIFF_META[diff] || DIFF_META.normal).name;
    const pn = $('#pbar-normal'), pp = $('#pbar-practice');
    pn.querySelector('i').style.width = ls.best + '%';
    pn.querySelector('span').textContent = Math.floor(ls.best) + '%';
    pp.querySelector('i').style.width = ls.practice + '%';
    pp.querySelector('span').textContent = Math.floor(ls.practice) + '%';

    const total = (lvl.objects || []).filter(x => x.t === 'coin').length;
    const wrap = $('#level-coins');
    wrap.innerHTML = '';
    for (let i = 0; i < total; i++) {
      const c = document.createElement('div');
      c.className = 'lvl-coin' + (ls.coins[i] ? ' got' : '');
      wrap.appendChild(c);
    }

    const dots = $('#level-page-dots');
    dots.innerHTML = '';
    list.forEach((_, i) => {
      const b = document.createElement('b');
      if (i === levelIndex) b.className = 'on';
      dots.appendChild(b);
    });
    $('#lvl-prev').disabled = levelIndex === 0;
    $('#lvl-next').disabled = levelIndex >= list.length - 1;
  }

  function showInfo() {
    const lvl = currentLevels()[levelIndex];
    if (!lvl) return;
    const ls = levelSave(lvl.name);
    const total = (lvl.objects || []).filter(x => x.t === 'coin').length;
    const got = ls.coins.filter(Boolean).length;
    $('#info-title').textContent = lvl.name;
    $('#info-rows').innerHTML =
      '<div class="info-row"><span>Сложность</span><b>' + (DIFF_META[lvl.difficulty] || DIFF_META.normal).name + '</b></div>' +
      '<div class="info-row"><span>Всего попыток</span><b>' + ls.totalAttempts + '</b></div>' +
      '<div class="info-row"><span>Всего прыжков</span><b>' + ls.totalJumps + '</b></div>' +
      '<div class="info-row"><span>Рекорд</span><b>' + Math.floor(ls.best) + '%</b></div>' +
      '<div class="info-row"><span>Практика</span><b>' + Math.floor(ls.practice) + '%</b></div>' +
      '<div class="info-row"><span>Монеты</span><b>' + got + ' / ' + total + '</b></div>';
    $('#overlay-info').classList.add('active');
  }

  /* ---------- карта прохождений ---------- */
  const MAP_NODE_POS = [[150, 560], [430, 470], [700, 510], [950, 380], [1130, 230]];

  function buildMap() {
    const wrap = $('#map-nodes');
    wrap.innerHTML = '';
    const levels = window.MAP_LEVELS || [];
    MAP_NODE_POS.forEach((pos, i) => {
      const lvl = levels[i];
      const prevDone = i === 0 || (levels[i - 1] && levelSave(levels[i - 1].name).best >= 100);
      const node = document.createElement('div');
      node.style.left = pos[0] + 'px';
      node.style.top = pos[1] + 'px';
      if (lvl && prevDone) {
        const ls = levelSave(lvl.name);
        const done = ls.best >= 100;
        node.className = 'map-node ' + (done ? 'done' : 'open');
        node.innerHTML =
          '<b class="gd-text">' + (i + 1) + '</b>' +
          (done ? '<span class="map-star">★</span>' : '') +
          '<span class="map-node-name gd-text">' + lvl.name + '</span>' +
          '<span class="map-node-pct gd-text">' + Math.floor(ls.best) + '%</span>';
        node.addEventListener('click', () => playLevel(lvl, { fromMap: true }));
      } else {
        node.className = 'map-node locked';
        node.innerHTML =
          '<svg width="30" height="30" viewBox="0 0 40 40">' +
          '<rect x="8" y="17" width="24" height="17" rx="4" fill="#2a2a3a" stroke="#000" stroke-width="3"/>' +
          '<path d="M13 17 v-4 a7 7 0 0 1 14 0 v4" fill="none" stroke="#889" stroke-width="3"/></svg>';
        node.addEventListener('click', () => {
          toast(lvl ? 'Сначала пройди предыдущий уровень карты!' : 'Скоро!');
        });
      }
      wrap.appendChild(node);
    });
  }

  /* ---------- игра ---------- */
  let game = null;
  let playingLevel = null;
  let fromEditor = false;
  let fromMap = false;

  const hudBar = $('#hud-progress i');
  const hudPct = $('#hud-percent');

  function hooks() {
    return {
      onTick(pct) {
        hudBar.style.width = pct + '%';
        hudPct.textContent = Math.floor(pct) + '%';
      },
      onAttempt() {
        if (fromEditor || !playingLevel) return;
        const ls = levelSave(playingLevel.name);
        ls.totalAttempts++;
        writeSave();
      },
      onDeath(attempts, pct, jumps) {
        if (fromEditor || !playingLevel) return;
        const ls = levelSave(playingLevel.name);
        ls.totalJumps += jumps || 0;
        if (game.practice) {
          if (pct > ls.practice) ls.practice = Math.min(100, pct);
        } else {
          if (pct > ls.best) ls.best = Math.min(99, Math.floor(pct));
        }
        writeSave();
      },
      onComplete(stats) {
        if (!fromEditor && playingLevel) {
          const ls = levelSave(playingLevel.name);
          const firstWin = !stats.practice && ls.best < 100;
          ls.totalJumps += stats.jumps || 0;
          if (stats.practice) {
            ls.practice = 100;
          } else {
            ls.best = 100;
            stats.coins.forEach(i => { ls.coins[i] = true; });
          }
          writeSave();
          // награда за первый уровень — кубик 2
          if (firstWin && playingLevel === (window.LEVELS || [])[0]) {
            toast('🎉 Открыт новый кубик! Загляни в гараж', 3500);
          }
        }
        showComplete(stats);
      },
      onPractice(on) {
        $('#hud-practice-tag').style.display = on ? 'block' : 'none';
        $('#hud-practice-btns').style.display = on ? 'flex' : 'none';
        $('#pause-practice').classList.toggle('on', on);
      }
    };
  }

  function playLevel(lvl, opts) {
    opts = opts || {};
    playingLevel = lvl;
    fromEditor = !!opts.fromEditor;
    fromMap = !!opts.fromMap;
    const ls = fromEditor ? null : levelSave(lvl.name);
    if (!game) game = new GW.Game($('#game-canvas'), hooks());
    game.setIcon(save.icon);
    game.setLevel(lvl, fromEditor ? [] : ls.coins.slice());
    $('#overlay-pause').classList.remove('active');
    $('#overlay-complete').classList.remove('active');
    $('#hud-practice-tag').style.display = 'none';
    $('#hud-practice-btns').style.display = 'none';
    $('#pause-practice').classList.remove('on');
    fadeTo('game', () => {
      game.attempts = 0;           // каждый заход в уровень — с попытки 1
      game.resetAttempt(true);
      game.start();
    });
  }
  window.GW_APP = { playLevel, showScreen, fadeTo, toast, get save() { return save; }, get game() { return game; } };

  function exitGame() {
    if (game) game.stop();
    $('#overlay-pause').classList.remove('active');
    $('#overlay-complete').classList.remove('active');
    if (fromEditor && window.GW_EDITOR) {
      fadeTo('editor', () => window.GW_EDITOR.onReturn());
    } else if (fromMap) {
      fadeTo('map', buildMap);
    } else {
      fadeTo('levels', buildLevelCard);
    }
  }

  function showComplete(stats) {
    $('#complete-title').textContent = stats.practice ? 'ПРАКТИКА ПРОЙДЕНА!' : 'УРОВЕНЬ ПРОЙДЕН!';
    $('#complete-stats').innerHTML =
      'Попыток: ' + stats.attempts + '<br>' +
      'Прыжков: ' + stats.jumps + '<br>' +
      'Время: ' + stats.time + ' сек';
    const wrap = $('#complete-coins');
    wrap.innerHTML = '';
    const total = (playingLevel.objects || []).filter(x => x.t === 'coin').length;
    const ls = fromEditor ? { coins: [] } : levelSave(playingLevel.name);
    for (let i = 0; i < total; i++) {
      const c = document.createElement('div');
      c.className = 'lvl-coin' + ((ls.coins[i] || stats.coins.includes(i)) ? ' got' : '');
      wrap.appendChild(c);
    }
    $('#overlay-complete').classList.add('active');
  }

  /* ---------- пауза ---------- */
  function setPaused(p) {
    if (!game || !game.running) return;
    game.setPaused(p);
    $('#overlay-pause').classList.toggle('active', p);
  }

  $('#hud-pause').addEventListener('click', () => setPaused(true));
  $('#pause-resume').addEventListener('click', () => setPaused(false));
  $('#pause-restart').addEventListener('click', () => {
    $('#overlay-pause').classList.remove('active');
    game.checkpoints = [];
    game.attempts = 0;
    game.resetAttempt(true);
    game.setPaused(false);
  });
  $('#pause-practice').addEventListener('click', () => {
    const on = !game.practice;
    game.setPractice(on);
    $('#overlay-pause').classList.remove('active');
    game.setPaused(false);
  });
  $('#pause-exit').addEventListener('click', exitGame);
  $('#complete-exit').addEventListener('click', exitGame);
  $('#complete-replay').addEventListener('click', () => {
    $('#overlay-complete').classList.remove('active');
    game.checkpoints = [];
    game.attempts = 0;
    game.resetAttempt(true);
  });

  $('#btn-checkpoint').addEventListener('click', () => game && game.placeCheckpoint(true));
  $('#btn-delcheck').addEventListener('click', () => game && game.removeCheckpoint());

  window.addEventListener('keydown', (e) => {
    if (e.code === 'Escape' && $('#screen-game').classList.contains('active')) {
      if (!$('#overlay-complete').classList.contains('active')) setPaused(!game.paused);
    }
  });

  // свернул вкладку — игра на паузу (физика не «догоняет» при возврате)
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) return;
    if (game && game.running && !game.paused &&
        $('#screen-game').classList.contains('active') &&
        !$('#overlay-complete').classList.contains('active')) {
      setPaused(true);
    }
  });

  /* ---------- навигация по меню ---------- */
  $('#btn-play').addEventListener('click', () => fadeTo('levels', buildLevelCard));
  $('#btn-garage').addEventListener('click', () => fadeTo('garage', buildGarage));
  $('#garage-back').addEventListener('click', () => fadeTo('lobby'));
  $('#levels-back').addEventListener('click', () => fadeTo('lobby'));
  $('#lvl-prev').addEventListener('click', () => { levelIndex--; buildLevelCard(); });
  $('#lvl-next').addEventListener('click', () => { levelIndex++; buildLevelCard(); });
  $('#level-card').addEventListener('click', () => playLevel(currentLevels()[levelIndex]));

  $('#btn-info').addEventListener('click', (e) => { e.stopPropagation(); showInfo(); });
  $('#info-close').addEventListener('click', () => $('#overlay-info').classList.remove('active'));

  $('#btn-map').addEventListener('click', () => fadeTo('map', buildMap));
  $('#map-back').addEventListener('click', () => fadeTo('lobby'));

  /* ---------- старт ---------- */
  GW.Icons.load(() => {
    buildGarage();
  });
})();
