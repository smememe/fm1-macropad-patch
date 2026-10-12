# How it works

A short summary of the analysis behind the patch. The firmware container and the update protocol were
first worked out in [AL-255/FM-1-RE](https://github.com/AL-255/FM-1-RE); this project builds on that work
and ports the macropad changes to the official V15 firmware.

## The firmware file

The FM-1 uses a JieLi SoC. `FM-1.fwsc` is a JieLi firmware container:

- The first 20 slots of 0x30 bytes hold the container header (0x2F bytes each) plus one marker byte per
  slot derived from the version string.
- The flash image (0x93000 bytes) starts at offset 0x414. From 0x4000 on, it is encrypted with JieLi's
  SFC cipher in 32-byte blocks (chip key 0x980F).
- Inside the decrypted image, the application `app.bin` starts at 0x4120. It is followed by the
  configuration area, which includes the EQ data.
- Integrity is a chain of CRC16 values (polynomial 0x1021, initial value 0): app.bin, the app area header,
  EQ, cfg, and finally the container header. The patcher recomputes all of them.

The patcher decrypts the image, checks and rewrites the bytes listed in [PATCHES.md](PATCHES.md), recomputes
the CRCs and encrypts it again. Rebuilding with no changes gives back the official file byte for byte.

## Version string

The device answers the updater's identify request with its version string and a checksum. In this firmware
the checksum is a precomputed constant, not calculated from the string. If the string is changed so that its
byte sum differs, the reported checksum no longer matches and the updater fails. The patched version
`FM-1_051` keeps the digit sum of the stock `FM-1_015`.

## Keys and buttons

Every input produces a key event with a key_id. The stock firmware sends key_id 14–40 (the 27 keys) to the
note handler and 0–13 (OCT−, OCT+ and the 12 buttons) to the UI handler. Patches A–C send every key_id to the
note handler and widen its range check, so a button sends note `39 + key_id`.

The note handler remembers sounding notes in an array sized for 27 keys. Rather than overflow it, patch F
lowers the heap ceiling by 256 bytes and patches D/E move the array into that freed RAM.

## Knobs

The seven encoders produce "class 7" events that drive the UI. Patch J sends that class to the dispatcher's
exit, so the knobs no longer change anything on the unit. The class-7 handler code that becomes unused is
overwritten with a 16-byte function (BLOB) that turns an encoder step into a key event whose key_id encodes
both the knob and the direction. Patches G2/H2 call it from the encoder reader. The result is note 87–93 for
clockwise and 95–101 for counter-clockwise steps.

## LEDs

In V15 the LEDs of the buttons and keys are multiplexed by the IRQ 37 interrupt handler, which runs from RAM.
It scans 11 rows; for each row it outputs the "lit" bits from a RAM buffer on 4 column lines, and in 2 frames
out of 10 it ORs in a second "dim" buffer, which gives the faint 20 % glow of idle buttons.

In testing, changing what the LED functions write to the buffers could not turn every LED off (some stayed lit
or dim). Patches P1/P2 change the interrupt itself so that the column value is always 0. Key scanning uses
other pins and happens before this point, so input is not affected.

## Display

Patch N replaces the "display on" command in the display initialisation with "display off".
