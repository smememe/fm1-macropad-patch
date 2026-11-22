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

## M-VAVE firmware (Apache License 2.0)

The prebuilt firmware attached to the [Releases](../../releases) (`FM-1-macropad.fwsc`) is a modified version of
the FM-1 V15 recovery image `sdk/firmware/FM-1_015.fwsc` that M-VAVE distributes in
[m-vave/fm1_open](https://github.com/m-vave/fm1_open/tree/4c7496daac04a95ff10d1afdcc8f9ead2dbabc41)
under the Apache License, Version 2.0 (see the "Boot/update resources and recovery firmware" section of that
repository's THIRD_PARTY.md). That file is byte-identical to the official `FM-1.fwsc` V15
(SHA-256 `db1642b2b6fa5c2cccb11ffd13878068bb28601678d3644049f99dc40e7edb8a`).

- Original: Copyright (c) 2026 珠海笙科智能科技有限公司 (M-VAVE), and the respective owners of its components.
- Modified by smememe, 2026: same-length changes at 16 sites in the app area, the version string, one padding
  byte in the EQ name, and the checksums. Every change is listed in [docs/PATCHES.md](docs/PATCHES.md).
  The modified file has SHA-256 `4192103baeef0b4601a60e0ec55cd517371ec9834ce2e6b2964647e22aa98641`.
- The full text of the Apache License 2.0 is in [LICENSES/Apache-2.0.txt](LICENSES/Apache-2.0.txt).
  The firmware and its modifications are distributed under that license, not under the MIT License of this repository.
- The original byte sequences listed in [docs/PATCHES.md](docs/PATCHES.md) and in `fm1patch.py` are excerpts of
  the same Apache-2.0 file, used to verify the input before patching.

M-VAVE and FM-1 are trademarks or product names of their respective owners. The Apache License does not grant
any trademark rights; the names are used only to identify the compatible hardware.
