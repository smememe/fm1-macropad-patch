// Write docs/layout.svg (English) and docs/layout.ja.svg (Japanese) from web/src/fm1layout.js.
//   node web/make_layout_svg.cjs
'use strict';
const fs = require('fs');
const path = require('path');
const FM1Layout = require(path.join(__dirname, 'src', 'fm1layout.js'));
const docs = path.join(__dirname, '..', 'docs');
fs.writeFileSync(path.join(docs, 'layout.svg'), FM1Layout.svg('en'));
fs.writeFileSync(path.join(docs, 'layout.ja.svg'), FM1Layout.svg('ja'));
console.log('wrote docs/layout.svg and docs/layout.ja.svg');
