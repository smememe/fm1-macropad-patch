// Input monitor: receives MIDI from the patched FM-1 with Web MIDI and lights up the matching control.
(function () {
  'use strict';
  var REPO = 'https://github.com/smememe/fm1-macropad-patch';
  var LOG_MAX = 30;
  var KNOB_FLASH_MS = 250;

  var STR = {
    en: {
      title: 'FM-1 Input Monitor',
      lead: 'Shows which control of the patched FM-1 sends which note. Press a button or key, or turn a knob.',
      local: 'Runs entirely in this page. Nothing is sent anywhere.',
      input: 'MIDI input',
      allInputs: 'All inputs',
      start: 'Connect',
      startHint: 'Your browser will ask for permission to use MIDI devices.',
      noSupport: 'This browser does not support Web MIDI. Please open this page in Chrome or Edge.',
      denied: 'Access to MIDI devices was not allowed. Allow it in the browser settings and reload the page.',
      noInputs: 'No MIDI input found. Connect the FM-1 over USB.',
      listening: 'Listening',
      log: 'Recent input',
      clear: 'Clear',
      on: 'on', off: 'off',
      cw: 'clockwise', ccw: 'counter-clockwise',
      other: 'not an FM-1 note',
      back: 'Patcher and README'
    },
    ja: {
      title: 'FM-1 入力モニター',
      lead: '改造した FM-1 のどの入力が何番のノートを送るかを表示します。ボタンや鍵盤を押したり、ノブを回したりしてください。',
      local: '処理はすべてこのページの中で行います。どこにも送信しません。',
      input: 'MIDI 入力',
      allInputs: 'すべての入力',
      start: '接続する',
      startHint: 'ブラウザが MIDI 機器の使用許可を求めます。',
      noSupport: 'このブラウザは Web MIDI に対応していません。Chrome か Edge で開いてください。',
      denied: 'MIDI 機器へのアクセスが許可されませんでした。ブラウザの設定で許可してから、ページを再読み込みしてください。',
      noInputs: 'MIDI 入力が見つかりません。FM-1 を USB でつないでください。',
      listening: '受信中',
      log: '最近の入力',
      clear: '消去',
      on: 'オン', off: 'オフ',
      cw: '時計回り', ccw: '反時計回り',
      other: 'FM-1 のノートではありません',
      back: 'パッチャーと README'
    }
  };

  var lang = /^ja\b/i.test(navigator.language || '') ? 'ja' : 'en';
  var access = null;
  var selected = 'all';
  var log = [];
  var status = null;

  function $(id) { return document.getElementById(id); }
  function t(key) { return STR[lang][key]; }

  function drawLayout() {
    $('layout').innerHTML = FM1Layout.svg(lang, { interactive: true });
  }

  function applyLang() {
    document.documentElement.lang = lang;
    document.title = t('title');
    var nodes = document.querySelectorAll('[data-i18n]');
    for (var i = 0; i < nodes.length; i++) nodes[i].textContent = t(nodes[i].getAttribute('data-i18n'));
    $('lang-en').setAttribute('aria-pressed', String(lang === 'en'));
    $('lang-ja').setAttribute('aria-pressed', String(lang === 'ja'));
    $('back-link').href = REPO + (lang === 'ja' ? '/blob/main/README.ja.md' : '#readme');
    drawLayout();
    renderInputs();
    renderStatus();
    renderLog();
  }

  function setStatus(key) { status = key; renderStatus(); }
  function renderStatus() {
    var el = $('status');
    el.textContent = status ? t(status) : '';
    el.className = status === 'listening' ? 'status ok' : 'status';
    el.hidden = !status;
  }

  function label(note, cmd) {
    var d = FM1Layout.describe(note);
    if (!d) return t('other');
    if (d.kind === 'knob') return d.name + ' ' + t(d.dir);
    return d.name + ' ' + t(cmd === 'on' ? 'on' : 'off');
  }

  function renderLog() {
    var list = $('log');
    list.textContent = '';
    log.forEach(function (e) {
      var li = document.createElement('li');
      var num = document.createElement('span');
      num.className = 'num';
      num.textContent = String(e.note);
      li.appendChild(num);
      li.appendChild(document.createTextNode(' ' + label(e.note, e.cmd) + '  (vel ' + e.vel + ', ch ' + e.ch + ')'));
      list.appendChild(li);
    });
  }

  function light(note, onOff) {
    var els = document.querySelectorAll('#layout [data-note="' + note + '"]');
    for (var i = 0; i < els.length; i++) els[i].classList.toggle('lit', onOff);
    var d = FM1Layout.describe(note);
    if (d && d.kind === 'knob') {
      var k = document.querySelector('#layout [data-knob="' + d.name + '"]');
      if (k) k.classList.toggle('lit', onOff);
    }
  }

  function flashKnob(note) {
    light(note, true);
    setTimeout(function () { light(note, false); }, KNOB_FLASH_MS);
  }

  // Handles one MIDI message (array of bytes). Exposed for testing from the console.
  function handle(data) {
    var status = data[0] & 0xF0, ch = (data[0] & 0x0F) + 1;
    if (status !== 0x90 && status !== 0x80) return;
    var note = data[1], vel = data[2];
    var cmd = status === 0x90 && vel > 0 ? 'on' : 'off';
    var d = FM1Layout.describe(note);
    if (d && d.kind === 'knob') {
      if (cmd === 'on') flashKnob(note);
    } else {
      light(note, cmd === 'on');
    }
    log.unshift({ note: note, cmd: cmd, vel: vel, ch: ch });
    if (log.length > LOG_MAX) log.length = LOG_MAX;
    renderLog();
  }

  function inputs() {
    var out = [];
    if (access) access.inputs.forEach(function (i) { out.push(i); });
    return out;
  }

  function renderInputs() {
    var sel = $('input-select');
    sel.textContent = '';
    var all = document.createElement('option');
    all.value = 'all';
    all.textContent = t('allInputs');
    sel.appendChild(all);
    inputs().forEach(function (i) {
      var o = document.createElement('option');
      o.value = i.id;
      o.textContent = i.name || i.id;
      sel.appendChild(o);
    });
    sel.value = selected;
    if (sel.value !== selected) { selected = 'all'; sel.value = 'all'; }
    sel.disabled = !access;
  }

  function attach() {
    var list = inputs();
    list.forEach(function (i) {
      i.onmidimessage = (selected === 'all' || selected === i.id) ? function (e) { handle(e.data); } : null;
    });
    if (access) setStatus(list.length ? 'listening' : 'noInputs');
  }

  function autoSelect() {
    var fm1 = inputs().filter(function (i) { return /FM-?1/i.test(i.name || ''); });
    if (fm1.length === 1) selected = fm1[0].id;
  }

  function start() {
    if (!navigator.requestMIDIAccess) { setStatus('noSupport'); return; }
    navigator.requestMIDIAccess({ sysex: false }).then(function (a) {
      access = a;
      autoSelect();
      renderInputs();
      attach();
      $('start').hidden = true;
      $('start-hint').hidden = true;
      a.onstatechange = function () { renderInputs(); attach(); };
    }, function () { setStatus('denied'); });
  }

  function setup() {
    $('lang-en').addEventListener('click', function () { lang = 'en'; applyLang(); });
    $('lang-ja').addEventListener('click', function () { lang = 'ja'; applyLang(); });
    $('start').addEventListener('click', start);
    $('input-select').addEventListener('change', function (e) { selected = e.target.value; attach(); });
    $('clear').addEventListener('click', function () { log = []; renderLog(); });
    if (!navigator.requestMIDIAccess) {
      status = 'noSupport';
      $('start').hidden = true;
      $('start-hint').hidden = true;
    }
    applyLang();
    window.FM1Monitor = { handle: handle };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setup);
  else setup();
})();
