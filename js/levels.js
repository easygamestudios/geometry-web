/* ============================================================
   Geometry Web — встроенные уровни (версия для игроков)
   Уровень 1 ("new Adventure") лежит в js/level1-data.js.
   Новые уровни: window.LEVELS.push(<данные из .gwlevel.json>),
   музыку класть в music/ и указывать путь в поле music.
   ============================================================ */
(function () {
  'use strict';

  function builder() {
    const o = [];
    return {
      o,
      block:  (x, y, style)   => o.push(style ? { t: 'block', x, y, style } : { t: 'block', x, y }),
      spike:  (x, y)          => o.push({ t: 'spike', x, y: y || 0 }),
      coin:   (x, y)          => o.push({ t: 'coin', x, y }),
      portal: (x, mode)       => o.push({ t: 'portal', x, y: 0, mode }),
      orb:    (x, y, kind)    => o.push({ t: 'orb', x, y, kind: kind || 'yellow' }),
      pad:    (x, kind)       => o.push({ t: 'pad', x, y: 0, kind: kind || 'yellow' }),
      speed:  (x, mult)       => o.push({ t: 'speed', x, y: 0, mult }),
      trig:   (x, color, d)   => o.push({ t: 'trigger', x, y: 4, color, dur: d == null ? 1.2 : d }),
      col:    function (x, y0, y1, style) { for (let y = y0; y <= y1; y++) this.block(x, y, style); },
      row:    function (x0, x1, y, style) { for (let x = x0; x <= x1; x++) this.block(x, y, style); }
    };
  }

  /* ================= Уровень 2: "Волна и скорость" ================= */
  const L2 = builder();
  (function (b) {
    b.spike(7);

    // батут через тройной ряд шипов
    b.pad(12, 'yellow');
    b.spike(14); b.spike(15); b.spike(16);

    // орб: двойной прыжок через тройные шипы
    b.spike(24); b.spike(25); b.spike(26);
    b.orb(24, 2, 'yellow');

    b.spike(34); b.spike(35);

    // ускорение 1.5x
    b.speed(40, 1.5);
    b.spike(46);
    b.spike(52);

    // волна
    b.portal(58, 'wave');
    b.trig(60, '#6a2ee8');
    b.row(58, 102, 6);
    b.col(66, 0, 1, 3);
    b.block(74, 4, 3); b.block(74, 5, 3);
    b.col(82, 0, 1, 3);
    b.block(90, 4, 3); b.block(90, 5, 3);
    b.coin(78, 2);

    // обратно на куб, обычная скорость
    b.portal(102, 'cube');
    b.trig(104, '#e83a3a');
    b.speed(105, 1);

    b.spike(110);
    b.coin(110, 2);

    b.spike(118); b.spike(119);

    // батут с монетой над шипами
    b.pad(126, 'yellow');
    b.spike(128); b.spike(129); b.spike(130);
    b.coin(129, 4);

    b.spike(137);
  })(L2);

  window.LEVELS = [
    window.LEVEL1_DATA, // "new Adventure" — из js/level1-data.js
    {
      name: 'Волна и скорость',
      bg: '#10a0c0',
      music: null,
      musicName: null,
      difficulty: 'normal',
      objects: L2.o
    }
  ];
})();
