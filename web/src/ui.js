// Page logic. Reads the chosen file locally, runs FM1Patch.patch, offers the result as a download.
(function () {
  'use strict';
  var REPO = 'https://github.com/smememe/fm1-macropad-patch';

  var STR = {
    en: {
      title: 'FM-1 Macropad Patch',
      lead: 'Turns the official M-VAVE FM-1 firmware V15 into macropad firmware: every button, key and knob sends a MIDI note.',
      local: 'Everything runs inside this page. Your file is not uploaded anywhere.',
      warnTitle: 'Before you start',
      warn1: 'Unofficial and not affiliated with M-VAVE.',
      warn2: 'Use at your own risk. Flashing modified firmware may void your warranty, and a failed update can leave the unit unusable.',
      warn3: 'The software comes with no warranty.',
      warnMore: 'Read the README first',
      step1: '1. Get the official firmware',
      step1Body: 'Download FM-1.fwsc (V15) from the Downloads page of the official M-VAVE website.',
      step2: '2. Choose FM-1.fwsc',
      drop: 'Drop FM-1.fwsc here, or',
      choose: 'choose a file',
      step3: '3. Download the patched firmware',
      working: 'Checking…',
      okSha: 'Official V15 firmware confirmed',
      okSites: 'All 16 patch sites match',
      okOut: 'Output matches the expected result',
      details: 'Details',
      download: 'Download FM-1-macropad.fwsc',
      outSha: 'SHA-256 of the output',
      errSha: 'This is not the official V15 FM-1.fwsc (SHA-256 does not match). Choose the file downloaded from the M-VAVE website. If M-VAVE has replaced the file, please report it in Issues.',
      errOther: 'The file has unexpected content. Nothing was produced. Please report it in Issues.',
      errRead: 'Could not read the file.',
      step4: '4. Flash it with M-UPGRADE',
      step4a: 'Start M-UPGRADE (the official updater) and connect the FM-1 over USB.',
      step4b: 'Click “Select Firmware” and choose FM-1-macropad.fwsc. It should show “Firmware version:51”.',
      step4c: 'Click “Update Firmware” and wait until it completes (about 20–60 seconds). Do not unplug the cable.',
      step4d: 'All LEDs go dark. Assign shortcuts to the notes in your shortcut app.',
      revert: 'To go back, flash the official FM-1.fwsc with M-UPGRADE.',
      footer: 'Source, note map and troubleshooting'
    },
    ja: {
      title: 'FM-1 マクロパッド化パッチ',
      lead: 'M-VAVE FM-1 の公式ファームウェア V15 を、ボタン・鍵盤・ノブのすべてが MIDI のノートを送るマクロパッド用に書き換えます。',
      local: '処理はすべてこのページの中で行います。選んだファイルはどこにも送信されません。',
      warnTitle: '使う前に',
      warn1: '非公式の改造です。M-VAVE とは関係ありません。',
      warn2: '自己責任でお使いください。改造したファームウェアを書き込むとメーカー保証を受けられなくなる場合があります。書き込みに失敗すると、本体が使えなくなるおそれがあります。',
      warn3: 'このソフトウェアは無保証です。',
      warnMore: '先に README をお読みください',
      step1: '1. 公式ファームウェアを入手する',
      step1Body: 'M-VAVE 公式サイトの Downloads ページから FM-1.fwsc（V15）をダウンロードします。',
      step2: '2. FM-1.fwsc を選ぶ',
      drop: 'FM-1.fwsc をここにドラッグするか、',
      choose: 'ファイルを選ぶ',
      step3: '3. 改造版をダウンロードする',
      working: '確認中…',
      okSha: '公式 V15 であることを確認しました',
      okSites: '書き換える 16 か所がすべて一致しました',
      okOut: '出力が期待どおりの内容になりました',
      details: '詳細',
      download: 'FM-1-macropad.fwsc をダウンロード',
      outSha: '出力の SHA-256',
      errSha: '公式 V15 の FM-1.fwsc ではありません（SHA-256 が一致しません）。M-VAVE 公式サイトからダウンロードしたファイルを選んでください。M-VAVE がファイルを差し替えた場合は、Issues でお知らせください。',
      errOther: 'ファイルの中身が想定と違うため、何も作成しませんでした。Issues でお知らせください。',
      errRead: 'ファイルを読み込めませんでした。',
      step4: '4. M-UPGRADE で書き込む',
      step4a: '公式の書き込みアプリ M-UPGRADE を起動し、FM-1 を USB でつなぎます。',
      step4b: '「Select Firmware」で FM-1-macropad.fwsc を選びます。「Firmware version:51」と表示されます。',
      step4c: '「Update Firmware」を押し、完了するまで待ちます（20〜60 秒ほど）。途中でケーブルを抜かないでください。',
      step4d: 'LED がすべて消えます。ショートカット用のアプリで、各ノートにショートカットを割り当ててください。',
      revert: '元に戻すときは、M-UPGRADE で公式の FM-1.fwsc を書き込みます。',
      footer: 'ソースコード・ノート番号の対応表・困ったとき'
    }
  };

  var lang = /^ja\b/i.test(navigator.language || '') ? 'ja' : 'en';
  var lastResult = null;
  var downloadUrl = null;

  function $(id) { return document.getElementById(id); }
  function t(key) { return STR[lang][key]; }

  function applyLang() {
    document.documentElement.lang = lang;
    document.title = t('title');
    var nodes = document.querySelectorAll('[data-i18n]');
    for (var i = 0; i < nodes.length; i++) nodes[i].textContent = t(nodes[i].getAttribute('data-i18n'));
    $('lang-en').setAttribute('aria-pressed', String(lang === 'en'));
    $('lang-ja').setAttribute('aria-pressed', String(lang === 'ja'));
    $('readme-link').href = REPO + (lang === 'ja' ? '/blob/main/README.ja.md' : '#readme');
    $('repo-link').href = REPO;
    if (lastResult) render(lastResult);
  }

  function item(ok, text) {
    var li = document.createElement('li');
    li.className = ok ? 'ok' : 'ng';
    li.textContent = (ok ? '✓ ' : '✗ ') + text;
    return li;
  }

  function render(r) {
    var list = $('checks');
    list.textContent = '';
    $('error').hidden = true;
    $('result').hidden = true;
    if (r.readError) {
      $('error').textContent = t('errRead');
      $('error').hidden = false;
      return;
    }
    if (r.error === 'sha256') {
      list.appendChild(item(false, t('errSha')));
      return;
    }
    if (r.error === 'exception') {
      $('error').textContent = t('errOther') + ' (' + r.message + ')';
      $('error').hidden = false;
      return;
    }
    list.appendChild(item(true, t('okSha')));
    var sitesOk = r.checks.length > 0 && r.checks.every(function (c) { return c.ok; });
    if (!r.ok || !sitesOk || !r.outMatchesExpected) {
      if (r.checks.length) list.appendChild(item(sitesOk, t('okSites')));
      $('error').textContent = t('errOther');
      $('error').hidden = false;
      renderDetails(r);
      return;
    }
    list.appendChild(item(true, t('okSites')));
    list.appendChild(item(true, t('okOut')));
    renderDetails(r);
    $('out-sha').textContent = r.outSha256;
    $('result').hidden = false;
  }

  function renderDetails(r) {
    var pre = $('detail-body');
    pre.textContent = r.checks.map(function (c) {
      return (c.ok ? 'OK ' : 'NG ') + ('     ' + c.id).slice(-5) + '  0x' + c.off.toString(16) +
        '  ' + c.len + ' B' + (c.ok ? '' : '  got ' + c.got + ' / want ' + c.want);
    }).join('\n');
    $('detail').hidden = r.checks.length === 0;
  }

  function handleFile(file) {
    if (!file) return;
    if (downloadUrl) { URL.revokeObjectURL(downloadUrl); downloadUrl = null; }
    $('checks').textContent = '';
    $('checks').appendChild(item(true, t('working')));
    $('result').hidden = true;
    $('detail').hidden = true;
    $('error').hidden = true;
    var reader = new FileReader();
    reader.onload = function () {
      // Let the "Checking…" line paint before the synchronous work starts.
      setTimeout(function () {
        var r;
        try {
          r = FM1Patch.patch(new Uint8Array(reader.result), FM1_SPEC);
        } catch (e) {
          r = { ok: false, error: 'exception', checks: [], message: String(e) };
        }
        lastResult = r;
        if (r.ok && r.outMatchesExpected) {
          downloadUrl = URL.createObjectURL(new Blob([r.output], { type: 'application/octet-stream' }));
          $('download').href = downloadUrl;
        }
        render(r);
      }, 30);
    };
    reader.onerror = function () { lastResult = { readError: true, checks: [] }; render(lastResult); };
    reader.readAsArrayBuffer(file);
  }

  function setup() {
    $('lang-en').addEventListener('click', function () { lang = 'en'; applyLang(); });
    $('lang-ja').addEventListener('click', function () { lang = 'ja'; applyLang(); });
    $('file').addEventListener('change', function (e) { handleFile(e.target.files[0]); });
    var zone = $('drop');
    ['dragenter', 'dragover'].forEach(function (ev) {
      zone.addEventListener(ev, function (e) { e.preventDefault(); zone.classList.add('over'); });
    });
    ['dragleave', 'drop'].forEach(function (ev) {
      zone.addEventListener(ev, function () { zone.classList.remove('over'); });
    });
    zone.addEventListener('drop', function (e) {
      e.preventDefault();
      handleFile(e.dataTransfer.files[0]);
    });
    // A file dropped outside the zone must not make the browser navigate away from the page.
    window.addEventListener('dragover', function (e) { e.preventDefault(); });
    window.addEventListener('drop', function (e) { e.preventDefault(); });
    applyLang();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setup);
  else setup();
})();
