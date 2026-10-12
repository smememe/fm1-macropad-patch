#!/usr/bin/env python3
"""Patch the official M-VAVE FM-1 firmware V15 (FM-1.fwsc) into macropad firmware.

    python3 fm1patch.py FM-1.fwsc -o FM-1-macropad.fwsc

Every button, key and knob sends a MIDI note, all LEDs stay off and the display stays off.
The input must be the official V15 FM-1.fwsc (checked by SHA-256). The patcher also checks
the original bytes at every patch site and the SHA-256 of the result, and writes nothing
if any check fails. See docs/PATCHES.md for what is changed and why.
"""
import argparse
import hashlib
import os
import struct
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from jltech.crc import jl_crc16  # noqa: E402
from jltech.cipher import jl_enc_cipher, jl_sfc_cipher  # noqa: E402

STOCK_SHA256 = "db1642b2b6fa5c2cccb11ffd13878068bb28601678d3644049f99dc40e7edb8a"
EXPECTED_OUT_SHA256 = "4192103baeef0b4601a60e0ec55cd517371ec9834ce2e6b2964647e22aa98641"
STOCK_VER = b"FM-1_015"
# The digits must add up to 6, like the stock "015": the device reports a checksum of the
# version string that is a precomputed constant, so a different byte sum crashes the updater.
VER = b"FM-1_051"
# One spare byte in the EQ name. Changed so the configuration differs from the stock one.
EQ_PAD = 0xFB

# Layout of the decrypted flash image inside the .fwsc
FLASH_DISK, FLASH_SIZE = 0x414, 0x93000
APP_AREA_BASE, APP_BIN_FW, APP_SIZE = 0x4000, 0x4120, 0x8DFBC
CHIPKEY, HDRKEY = 0x980F, 0xFFFF
CFG_E = APP_BIN_FW + APP_SIZE + 383            # 0x9225B: end of the app area CRC
EQ_E, EQ_DATA_LEN = CFG_E + 0x20, 2873
EQ_NAME_PAD = EQ_E + 0x1F                       # 0x9229A
VER_OFF = 0x4EA64                               # "FM-1_015" inside app.bin

# (name, offset in app.bin, original bytes, new bytes). All patches keep the length.
PATCHES = [
    # Buttons and keys -> notes
    ("A key_id = r7 + 1 (buttons included)", 0x0243A6, "70e17f7c", "00e10170"),
    ("B key_id > 13 -> > 0 (all buttons to the note path)", 0x0243AA, "00fcbf1a", "00fcbf00"),
    ("C range check 40 -> 63", 0x02452C, "00fcf050", "00fcf07e"),
    ("D note-on array -> reserved RAM", 0x024574, "f01843e0d304", "c3ff30fcc701"),
    ("E note-off array -> reserved RAM", 0x024616,
     "0017b4e000af48e0d304d8eea018", "00170a16c8ff30fcc701d8eea018"),
    ("F heap ceiling -256 B (reserves the RAM)", 0x055EEC, "30fdc701", "30fcc701"),
    # Knobs -> notes with direction
    ("G2 call BLOB from the knob reader", 0x025BCC, "f1170119", "bfea6ef5"),
    ("H2 nop x2", 0x025BD0, "42e1e016", "00000000"),
    ("J knob event class 7 -> exit", 0x0243A4, "a600", "bd01"),
    ("BLOB build a key event with direction", 0x0246AC,
     "011630ed0c00412c173430edf40f1716", "f11799af11b30119198142e140198000"),
    # LEDs and display off
    ("K nop LED-on call on key press", 0x0245A8, "bfea97d5", "00000000"),
    ("L nop SAVE LED-on call", 0x020FEC, "bfea75f0", "00000000"),
    ("M HOME LED blink -> always off", 0x024A88, "40284121", "40284120"),
    ("P1 LED scan IRQ: column value r7 = 0", 0x08873E, "d8ee6077", "47200000"),
    ("P2 LED scan IRQ: nop the dim-mask OR", 0x08874C, "1719", "0000"),
    ("N display init: DISPON -> DISPOFF", 0x022270, "42ea2910", "42ea2810"),
]


class PatchError(Exception):
    pass


def fix_ufw_header(data, flash, ver):
    """Rebuild the 20-slot container header: per-entry CRC, header CRCs, version markers."""
    header = bytearray()
    for i in range(20):
        header += data[i * 0x30:i * 0x30 + 0x30][:0x2F]
    jl_enc_cipher(header, 0, 0x40, HDRKEY)
    numents = struct.unpack_from("<H", header, 8)[0]
    headersize = 0x40 + numents * 0x50
    for off in range(0x40, headersize, 0x50):
        jl_enc_cipher(header, off, 0x50, HDRKEY)
    for off in range(0x40, headersize, 0x50):
        if struct.unpack_from("<H", header, off)[0] == 0:
            struct.pack_into("<H", header, off + 4, jl_crc16(flash))
    for off in range(0x40, headersize, 0x50):
        jl_enc_cipher(header, off, 0x50, HDRKEY)
    struct.pack_into("<H", header, 2, jl_crc16(header[0x40:headersize]))
    struct.pack_into("<H", header, 0, jl_crc16(header[2:0x40]))
    jl_enc_cipher(header, 0, 0x40, HDRKEY)
    out = bytearray(data)
    for i in range(20):
        marker = (ver[i] + i + 1) & 0xFF if i < len(ver) else 0x7D
        out[i * 0x30:(i + 1) * 0x30] = bytes(header[i * 0x2F:(i + 1) * 0x2F]) + bytes([marker])
    return out


def build(raw, patches=PATCHES, ver=VER, eq_pad=EQ_PAD, log=None):
    """Return the patched .fwsc as bytes. Raises PatchError if any check fails."""
    if hashlib.sha256(raw).hexdigest() != STOCK_SHA256:
        raise PatchError("the input is not the official V15 FM-1.fwsc (SHA-256 does not match)")
    data = bytearray(raw)
    flash = bytearray(data[FLASH_DISK:FLASH_DISK + FLASH_SIZE])
    jl_sfc_cipher(flash, APP_AREA_BASE, len(flash) - APP_AREA_BASE, APP_AREA_BASE, CHIPKEY)
    app = memoryview(flash)[APP_BIN_FW:APP_BIN_FW + APP_SIZE]
    if bytes(app[VER_OFF:VER_OFF + 8]) != STOCK_VER:
        raise PatchError("version string not found where expected (decryption failed)")
    if flash[EQ_NAME_PAD] != 0xFF:
        raise PatchError("EQ name padding not found where expected")

    for name, off, want_hex, new_hex in patches:
        want, new = bytes.fromhex(want_hex), bytes.fromhex(new_hex)
        if len(want) != len(new):
            raise PatchError(f"{name}: patch changes the length")
        got = bytes(app[off:off + len(want)])
        if got != want:
            raise PatchError(f"{name}: {off:#x} is {got.hex()}, expected {want.hex()}")
        app[off:off + len(new)] = new
        if log:
            log(f"  {off:#08x} {len(new):2d} B  {name}")
    app[VER_OFF:VER_OFF + 8] = ver
    flash[EQ_NAME_PAD] = eq_pad
    del app

    # Recompute the CRC chain: app.bin entry -> app area header -> EQ -> cfg
    struct.pack_into("<H", flash, 0x4022, jl_crc16(bytes(flash[APP_BIN_FW:APP_BIN_FW + APP_SIZE])))
    struct.pack_into("<H", flash, 0x4020, jl_crc16(bytes(flash[0x4022:0x4040])))
    struct.pack_into("<H", flash, APP_AREA_BASE + 2, jl_crc16(bytes(flash[0x4020:CFG_E])))
    struct.pack_into("<H", flash, APP_AREA_BASE, jl_crc16(bytes(flash[APP_AREA_BASE + 2:APP_AREA_BASE + 32])))
    struct.pack_into("<H", flash, EQ_E, jl_crc16(bytes(flash[EQ_E + 2:EQ_E + 32])))
    struct.pack_into("<H", flash, CFG_E + 2, jl_crc16(bytes(flash[EQ_E:EQ_E + 32 + EQ_DATA_LEN])))
    struct.pack_into("<H", flash, CFG_E, jl_crc16(bytes(flash[CFG_E + 2:CFG_E + 32])))

    jl_sfc_cipher(flash, APP_AREA_BASE, len(flash) - APP_AREA_BASE, APP_AREA_BASE, CHIPKEY)
    data[FLASH_DISK:FLASH_DISK + FLASH_SIZE] = flash
    return bytes(fix_ufw_header(data, flash, ver))


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("fwsc", help="the official V15 FM-1.fwsc")
    ap.add_argument("-o", "--out", default="FM-1-macropad.fwsc",
                    help="output file (default: FM-1-macropad.fwsc)")
    a = ap.parse_args()

    if os.path.exists(a.out):
        sys.exit(f"error: {a.out} already exists; not overwriting")
    try:
        with open(a.fwsc, "rb") as f:
            raw = f.read()
    except OSError as e:
        sys.exit(f"error: cannot read {a.fwsc}: {e.strerror}")
    try:
        out = build(raw, log=print)
    except PatchError as e:
        sys.exit(f"error: {e}. Nothing was written.")
    digest = hashlib.sha256(out).hexdigest()
    if digest != EXPECTED_OUT_SHA256:
        sys.exit(f"error: unexpected output SHA-256 {digest}. Nothing was written. Please report this in Issues.")
    with open(a.out, "wb") as f:
        f.write(out)
    print(f"wrote {a.out}")
    print(f"SHA-256 {digest} (matches the expected result)")
    print("Next: flash it with M-UPGRADE (see README).")


if __name__ == "__main__":
    main()
