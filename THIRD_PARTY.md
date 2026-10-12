# Third-party notices

## jltech/ — kagaimiq/jl-misctools (MIT License)

`jltech/` contains part of [kagaimiq/jl-misctools](https://github.com/kagaimiq/jl-misctools),
Copyright (c) 2023 Andrey Grigoryev (kagaimiq), under the MIT License. The full license text is in
[jltech/LICENSE](jltech/LICENSE).

- `cipher.py` and `__init__.py` are unchanged.
- `crc.py` was rewritten in pure Python so that the `crcmod` package is not needed. It returns the same
  values as the original `crcmod`-based definitions (checked on random inputs and on the full patch build).

The browser patcher (`web/src/fm1patch.js`) contains a JavaScript port of the same CRC and cipher routines.

## AL-255/FM-1-RE (WTFPL)

The analysis of the firmware container and the update protocol in
[AL-255/FM-1-RE](https://github.com/AL-255/FM-1-RE) was the starting point of this work.
No code from that repository is included.

## M-VAVE firmware

This repository does not contain M-VAVE firmware. The original byte sequences listed in
[docs/PATCHES.md](docs/PATCHES.md) and in `fm1patch.py` are short excerpts used only to verify the input
before patching. They belong to M-VAVE (or their respective owners) and are not covered by the MIT License
of this repository.

M-VAVE and FM-1 are trademarks or product names of their respective owners.
