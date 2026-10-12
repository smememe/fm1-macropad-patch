// FM-1 layout diagram (schematic, line drawing on white). Single source for docs/layout*.svg and the
// input monitor. With {interactive: true} the controls carry data-note attributes and the knobs get
// direction arrows, so the monitor can light them up.
var FM1Layout = (function () {
  'use strict';

  var W = 1000, H = 640;
  var LINE = '#222222', TXT = '#222222', SUB = '#666666';

  var BUTTONS = ['FX', 'SEL', 'ENV', 'LFO', 'EDIT', 'GLO', 'HOME', 'SAVE', 'ARP', 'SEQ', 'PLAY\nSTOP', 'REC'];
  var KNOBS = {
    SELECT: [87, 95], ALGORITHM: [88, 96], KNOB1: [89, 97], KNOB2: [90, 98],
    KNOB3: [91, 99], KNOB4: [92, 100], PRESETS: [93, 101]
  };
  var NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

  var TEXT = {
    en: {
      title: 'FM-1 Macropad Patch: note numbers (MIDI channel 1)',
      legend: 'Buttons and keys: note-on when pressed, note-off when released.   Knobs: clockwise / counter-clockwise (note-on only).',
      master: 'no MIDI', screen: 'display\n(off)'
    },
    ja: {
      title: 'FM-1 マクロパッド化パッチ：ノート番号（MIDI チャンネル 1）',
      legend: 'ボタン・鍵盤：押すとノートオン、離すとノートオフ。　ノブ：時計回り / 反時計回り（ノートオンのみ）',
      master: 'MIDIなし', screen: '画面\n（消灯）'
    }
  };

  // What each note number means: {kind: 'button'|'key'|'knob', name, dir?}
  function describe(note) {
    if (note >= 39 && note <= 52) {
      var names = ['OCT−', 'OCT+'].concat(BUTTONS.map(function (b) { return b.replace('\n', '/'); }));
      return { kind: 'button', name: names[note - 39] };
    }
    if (note >= 53 && note <= 79) {
      return { kind: 'key', name: NOTE_NAMES[note % 12] + (Math.floor(note / 12) - 1) };
    }
    for (var k in KNOBS) {
      if (KNOBS[k][0] === note) return { kind: 'knob', name: k, dir: 'cw' };
      if (KNOBS[k][1] === note) return { kind: 'knob', name: k, dir: 'ccw' };
    }
    return null;
  }

  function attr(note, on) { return on && note != null ? ' data-note="' + note + '"' : ''; }

  function text(x, y, s, size, fill, weight) {
    size = size || 13; fill = fill || '#222222'; weight = weight || 'normal';
    var lines = s.split('\n');
    return lines.map(function (line, i) {
      var dy = (i - (lines.length - 1) / 2) * (size * 1.15);
      return '<text x="' + x + '" y="' + (y + dy).toFixed(1) + '" font-size="' + size + '" fill="' + fill +
        '" text-anchor="middle" dominant-baseline="central" font-weight="' + weight + '">' + line + '<\/text>';
    }).join('\n');
  }

  function knob(x, y, name, label, labelSub, interactive) {
    var notes = KNOBS[name];
    var s = ['<circle cx="' + x + '" cy="' + y + '" r="17" fill="none" stroke="' + LINE + '" stroke-width="2"' +
             (interactive && notes ? ' data-knob="' + name + '"' : '') + '/>',
             '<line x1="' + x + '" y1="' + (y - 6) + '" x2="' + x + '" y2="' + (y - 15) + '" stroke="' + LINE + '" stroke-width="2"/>',
             text(x, y - 32, name, 12, SUB)];
    s.push(text(x, y + 32, label, 14, labelSub ? SUB : TXT, labelSub ? 'normal' : 'bold'));
    if (interactive && notes) {
      // Small arrows beside the knob: right = clockwise, left = counter-clockwise.
      s.push('<path d="M' + (x + 22) + ' ' + (y - 8) + ' l9 8 l-9 8 z" class="arrow" data-note="' + notes[0] + '"/>');
      s.push('<path d="M' + (x - 22) + ' ' + (y - 8) + ' l-9 8 l9 8 z" class="arrow" data-note="' + notes[1] + '"/>');
    }
    return s.join('\n');
  }

  function svg(lang, opts) {
    var t = TEXT[lang] || TEXT.en;
    var on = !!(opts && opts.interactive);
    var s = ['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + ' ' + H + '"' +
             (on ? ' class="fm1" role="img" aria-label="FM-1"' : ' width="' + W + '" height="' + H + '"') +
             ' font-family="Helvetica, Arial, \'Hiragino Sans\', \'Noto Sans JP\', sans-serif">',
             '<rect width="' + W + '" height="' + H + '" fill="#ffffff"/>',
             text(W / 2, 24, t.title, 18, '#222', 'bold'),
             '<rect x="20" y="48" width="' + (W - 40) + '" height="520" rx="28" fill="none" stroke="' + LINE + '" stroke-width="2.5"/>'];
    // Knobs on the left
    s.push(knob(80, 110, 'MASTER', t.master, true, on));
    s.push(knob(170, 110, 'SELECT', '87 / 95', false, on));
    s.push(knob(80, 205, 'PRESETS', '93 / 101', false, on));
    s.push(knob(170, 205, 'ALGORITHM', '88 / 96', false, on));
    // Display
    s.push('<rect x="235" y="70" width="170" height="170" rx="12" fill="none" stroke="' + LINE + '" stroke-width="1.5" stroke-dasharray="6 4"/>');
    s.push(text(320, 155, t.screen, 13, SUB));
    // KNOB1-4
    [560, 665, 770, 875].forEach(function (x, i) {
      var name = 'KNOB' + (i + 1);
      s.push(knob(x, 110, name, KNOBS[name][0] + ' / ' + KNOBS[name][1], false, on));
    });
    // OCT-/OCT+
    [['OCT−', 39], ['OCT+', 40]].forEach(function (b, i) {
      var x = 55 + i * 75;
      s.push('<rect x="' + x + '" y="262" width="62" height="30" rx="6" fill="none" stroke="' + LINE + '" stroke-width="1.5"' + attr(b[1], on) + '/>');
      s.push(text(x + 31, 277, b[0], 12, TXT));
      s.push(text(x + 31, 307, String(b[1]), 14, TXT, 'bold'));
    });
    // 12 buttons
    s.push('<rect x="455" y="170" width="505" height="150" rx="14" fill="none" stroke="' + SUB + '" stroke-width="1"/>');
    BUTTONS.forEach(function (name, k) {
      var col = k % 6, row = Math.floor(k / 6);
      var x = 470 + col * 81, y = 182 + row * 68;
      s.push('<rect x="' + x + '" y="' + y + '" width="70" height="36" rx="6" fill="none" stroke="' + LINE + '" stroke-width="1.5"' + attr(41 + k, on) + '/>');
      s.push(text(x + 35, y + 18, name, name.indexOf('\n') >= 0 ? 11 : 13, TXT));
      s.push(text(x + 35, y + 50, String(41 + k), 14, TXT, 'bold'));
    });
    // 27 keys (F3 = 53 to G5 = 79)
    s.push('<rect x="38" y="340" width="' + (W - 76) + '" height="215" rx="18" fill="none" stroke="' + SUB + '" stroke-width="1"/>');
    var kw = 56, x0 = 52, wx = {}, n, i = 0;
    for (n = 53; n < 80; n++) {
      if ([0, 2, 4, 5, 7, 9, 11].indexOf(n % 12) < 0) continue;
      var xw = x0 + i * kw;
      wx[n] = xw; i++;
      s.push('<rect x="' + (xw + 6) + '" y="450" width="' + (kw - 12) + '" height="92" rx="20" fill="none" stroke="' + LINE + '" stroke-width="1.5"' + attr(n, on) + '/>');
      s.push(text(xw + kw / 2, 496, String(n), 13, TXT, 'bold'));
    }
    for (n = 53; n < 80; n++) {
      if ([1, 3, 6, 8, 10].indexOf(n % 12) < 0) continue;
      var xb = wx[n - 1] + kw / 2;
      s.push('<rect x="' + (xb + 10) + '" y="352" width="' + (kw - 20) + '" height="84" rx="18" fill="none" stroke="' + LINE + '" stroke-width="1.5"' + attr(n, on) + '/>');
      s.push(text(xb + kw / 2, 394, String(n), 13, TXT, 'bold'));
    }
    if (!on) s.push(text(W / 2, 600, t.legend, 13, '#333'));
    s.push('<\/svg>');
    return s.join('\n');
  }

  return { svg: svg, describe: describe };
})();

if (typeof module !== 'undefined') module.exports = FM1Layout;
