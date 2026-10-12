// FM-1 macropad patch: browser / Node port of build_kbpatch_v15.py.
// Pure functions only. Nothing here touches the network or the DOM.
var FM1Patch = (function () {
  'use strict';

  // ---- SHA-256 (self-contained so the page also works from file://) ----
  var K = new Uint32Array([
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ]);

  function sha256Hex(bytes) {
    var len = bytes.length;
    var padded = new Uint8Array(((len + 9 + 63) >> 6) << 6);
    padded.set(bytes);
    padded[len] = 0x80;
    var bitsHi = Math.floor(len / 0x20000000), bitsLo = (len << 3) >>> 0;
    var dv = new DataView(padded.buffer);
    dv.setUint32(padded.length - 8, bitsHi);
    dv.setUint32(padded.length - 4, bitsLo);
    var h = new Uint32Array([0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
                             0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19]);
    var w = new Uint32Array(64);
    for (var off = 0; off < padded.length; off += 64) {
      for (var i = 0; i < 16; i++) w[i] = dv.getUint32(off + i * 4);
      for (i = 16; i < 64; i++) {
        var x = w[i - 15], y = w[i - 2];
        var s0 = ((x >>> 7) | (x << 25)) ^ ((x >>> 18) | (x << 14)) ^ (x >>> 3);
        var s1 = ((y >>> 17) | (y << 15)) ^ ((y >>> 19) | (y << 13)) ^ (y >>> 10);
        w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
      }
      var a = h[0], b = h[1], c = h[2], d = h[3], e = h[4], f = h[5], g = h[6], hh = h[7];
      for (i = 0; i < 64; i++) {
        var S1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
        var ch = (e & f) ^ (~e & g);
        var t1 = (hh + S1 + ch + K[i] + w[i]) >>> 0;
        var S0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
        var maj = (a & b) ^ (a & c) ^ (b & c);
        var t2 = (S0 + maj) >>> 0;
        hh = g; g = f; f = e; e = (d + t1) >>> 0;
        d = c; c = b; b = a; a = (t1 + t2) >>> 0;
      }
      h[0] = (h[0] + a) >>> 0; h[1] = (h[1] + b) >>> 0; h[2] = (h[2] + c) >>> 0; h[3] = (h[3] + d) >>> 0;
      h[4] = (h[4] + e) >>> 0; h[5] = (h[5] + f) >>> 0; h[6] = (h[6] + g) >>> 0; h[7] = (h[7] + hh) >>> 0;
    }
    var hex = '';
    for (i = 0; i < 8; i++) hex += ('00000000' + h[i].toString(16)).slice(-8);
    return hex;
  }

  // ---- JieLi CRC16 (poly 0x1021, init 0, MSB first) and ciphers ----
  var T16 = (function () {
    var t = new Uint16Array(256);
    for (var i = 0; i < 256; i++) {
      var c = i << 8;
      for (var j = 0; j < 8; j++) c = (c & 0x8000) ? ((c << 1) ^ 0x1021) : (c << 1);
      t[i] = c & 0xFFFF;
    }
    return t;
  })();

  function crc16(buf, start, end) {
    var crc = 0;
    for (var i = start; i < end; i++) crc = ((crc << 8) & 0xFFFF) ^ T16[((crc >> 8) ^ buf[i]) & 0xFF];
    return crc;
  }

  function encCipher(buf, off, size, key) {
    for (var i = 0; i < size; i++) {
      buf[off + i] ^= key & 0xFF;
      key = ((key << 1) ^ ((key & 0x8000) ? 0x1021 : 0)) & 0xFFFF;
    }
  }

  function sfcCipher(buf, off, size, base, key) {
    for (var i = 0; i < size; i += 32) {
      encCipher(buf, off + i, Math.min(size - i, 32), key ^ ((off + i - base) >> 2));
    }
  }

  function putU16(buf, off, v) { buf[off] = v & 0xFF; buf[off + 1] = (v >> 8) & 0xFF; }
  function getU16(buf, off) { return buf[off] | (buf[off + 1] << 8); }

  function fromHex(s) {
    var out = new Uint8Array(s.length / 2);
    for (var i = 0; i < out.length; i++) out[i] = parseInt(s.substr(i * 2, 2), 16);
    return out;
  }
  function toHex(buf, start, end) {
    var s = '';
    for (var i = start; i < end; i++) s += ('0' + buf[i].toString(16)).slice(-2);
    return s;
  }
  function ascii(s) {
    var out = new Uint8Array(s.length);
    for (var i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
    return out;
  }

  function fixUfwHeader(data, flash, ver, hdrKey) {
    var header = new Uint8Array(20 * 0x2F);
    for (var i = 0; i < 20; i++) header.set(data.subarray(i * 0x30, i * 0x30 + 0x2F), i * 0x2F);
    encCipher(header, 0, 0x40, hdrKey);
    var numents = getU16(header, 8);
    var headersize = 0x40 + numents * 0x50;
    if (headersize > header.length) throw new Error('header: unexpected entry count ' + numents);
    var off;
    for (off = 0x40; off < headersize; off += 0x50) encCipher(header, off, 0x50, hdrKey);
    for (off = 0x40; off < headersize; off += 0x50) {
      if (getU16(header, off) === 0) putU16(header, off + 4, crc16(flash, 0, flash.length));
    }
    for (off = 0x40; off < headersize; off += 0x50) encCipher(header, off, 0x50, hdrKey);
    putU16(header, 2, crc16(header, 0x40, headersize));
    putU16(header, 0, crc16(header, 2, 0x40));
    encCipher(header, 0, 0x40, hdrKey);
    for (i = 0; i < 20; i++) {
      data.set(header.subarray(i * 0x2F, (i + 1) * 0x2F), i * 0x30);
      data[i * 0x30 + 0x2F] = i < ver.length ? (ver[i] + i + 1) & 0xFF : 0x7D;
    }
  }

  // Returns { ok, error?, checks: [{id, off, ok, got, want}], output?, outSha256? }.
  // `raw` is the official FM-1.fwsc as a Uint8Array; it is never modified.
  function patch(raw, spec) {
    var result = { ok: false, inSha256: sha256Hex(raw), checks: [] };
    if (result.inSha256 !== spec.stockSha256) {
      result.error = 'sha256';
      return result;
    }
    var data = new Uint8Array(raw);
    var flash = data.slice(spec.flashDisk, spec.flashDisk + spec.flashSize);
    var base = spec.appAreaBase;
    sfcCipher(flash, base, flash.length - base, base, spec.chipKey);
    var app = flash.subarray(spec.appBinFw, spec.appBinFw + spec.appSize);

    var stockVer = ascii(spec.stockVer);
    if (toHex(app, spec.verOff, spec.verOff + 8) !== toHex(stockVer, 0, 8)) {
      result.error = 'decrypt';
      return result;
    }
    if (flash[spec.eqNamePad] !== 0xFF) {
      result.error = 'eqpad';
      return result;
    }

    var allOk = true;
    spec.patches.forEach(function (p) {
      var want = fromHex(p.want), neu = fromHex(p.new);
      if (want.length !== neu.length) throw new Error(p.name + ': not same length');
      var got = toHex(app, p.off, p.off + want.length);
      var ok = got === p.want;
      result.checks.push({ id: p.name.split(' ')[0], off: p.off, len: want.length, ok: ok, got: got, want: p.want });
      if (ok) app.set(neu, p.off); else allOk = false;
    });
    if (!allOk) {
      result.error = 'mismatch';
      return result;
    }
    var ver = ascii(spec.ver);
    app.set(ver, spec.verOff);
    flash[spec.eqNamePad] = spec.eqPad;

    // JLFS: app.bin entry -> app area header -> eq -> cfg (same order as the Python builder)
    var fw = spec.appBinFw, cfgE = spec.cfgE, eqE = spec.eqE;
    putU16(flash, 0x4022, crc16(flash, fw, fw + spec.appSize));
    putU16(flash, 0x4020, crc16(flash, 0x4022, 0x4040));
    putU16(flash, base + 2, crc16(flash, 0x4020, cfgE));
    putU16(flash, base, crc16(flash, base + 2, base + 32));
    putU16(flash, eqE, crc16(flash, eqE + 2, eqE + 32));
    putU16(flash, cfgE + 2, crc16(flash, eqE, eqE + 32 + spec.eqDataLen));
    putU16(flash, cfgE, crc16(flash, cfgE + 2, cfgE + 32));

    sfcCipher(flash, base, flash.length - base, base, spec.chipKey);
    data.set(flash, spec.flashDisk);
    fixUfwHeader(data, flash, ver, spec.hdrKey);

    result.ok = true;
    result.output = data;
    result.outSha256 = sha256Hex(data);
    result.outMatchesExpected = result.outSha256 === spec.expectedOutSha256;
    return result;
  }

  return { patch: patch, sha256Hex: sha256Hex, crc16: crc16 };
})();

if (typeof module !== 'undefined') module.exports = FM1Patch;
