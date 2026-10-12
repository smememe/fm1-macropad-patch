# Patch list

Offsets are inside `app.bin`, the application image obtained by decrypting the official V15 `FM-1.fwsc`.
All patches keep the length, so the firmware size does not change. In total, 84 bytes at 16 sites.

The "Original" column is what the patcher expects to find before writing. These short byte sequences
belong to M-VAVE and are listed only for verification (see [THIRD_PARTY.md](../THIRD_PARTY.md)).

## 1. Buttons and keys send notes

In the stock firmware, key_id 0–13 (OCT−, OCT+ and the 12 buttons) go to the UI handler, and only
14–40 (the keys) go to the note handler. The array that remembers sounding notes has only 27 entries.

| | Offset | Original | New | Meaning |
|---|---|---|---|---|
| A | 0x243A6 | `70e17f7c` | `00e10170` | Take key_id as `r0 = r7 + 1`, a running number that includes the buttons |
| B | 0x243AA | `00fcbf1a` | `00fcbf00` | "key_id > 13 → note handler" becomes "> 0". Because A adds 1, this always holds, so every button (including OCT−) goes to the note handler |
| C | 0x2452C | `00fcf050` | `00fcf07e` | Range check in the note handler: 40 → 63 (lets buttons, keys and knobs through) |
| D | 0x24574 | `f01843e0d304` | `c3ff30fcc701` | Note-on: store sounding notes in the RAM reserved by F (0x01C7FC30) |
| E | 0x24616 | `0017b4e000af48e0d304d8eea018` | `00170a16c8ff30fcc701d8eea018` | Note-off: read from the same reserved RAM |
| F | 0x55EEC | `30fdc701` | `30fcc701` | Lower the heap ceiling from 0x01C7FD30 to 0x01C7FC30, freeing 256 bytes |

Button notes are `39 + key_id`: 0 = OCT−, 1 = OCT+, 2 = FX, 3 = SEL, 4 = ENV, 5 = LFO, 6 = EDIT, 7 = GLO,
8 = HOME, 9 = SAVE, 10 = ARP, 11 = SEQ, 12 = PLAY/STOP, 13 = REC. Keys keep the stock notes 53–79.

## 2. Knobs send notes

| | Offset | Original | New | Meaning |
|---|---|---|---|---|
| J | 0x243A4 | `a600` | `bd01` | In the dispatch table, send knob events (class 7) to the "do nothing" exit. Stops the knobs' UI actions |
| BLOB | 0x246AC | `011630ed0c00412c173430edf40f1716` | `f11799af11b30119198142e140198000` | A 16-byte function that builds a key event including the direction (clockwise / counter-clockwise). Placed inside the class-7 handler that J made unused |
| G2 | 0x25BCC | `f1170119` | `bfea6ef5` | Call BLOB from the knob reader |
| H2 | 0x25BD0 | `42e1e016` | `00000000` | nop the two instructions G2 makes unnecessary |

Knobs 0–6 send notes 87–93 when turned clockwise and 95–101 counter-clockwise:
0 = SELECT, 1 = ALGORITHM, 2–5 = KNOB1–4, 6 = PRESETS. MASTER is the volume knob and sends no MIDI.

## 3. LEDs and display off

The display's backlight is not changed by these patches, so the blank screen still glows faintly.

| | Offset | Original | New | Meaning |
|---|---|---|---|---|
| K | 0x245A8 | `bfea97d5` | `00000000` | nop the call that lights an LED on note-on |
| L | 0x20FEC | `bfea75f0` | `00000000` | nop the call that lights the SAVE LED |
| M | 0x24A88 | `40284121` | `40284120` | HOME blink → always off |
| P1 | 0x8873E | `d8ee6077` | `47200000` | LED scan interrupt: the value sent to the columns is always 0 |
| P2 | 0x8874C | `1719` | `0000` | Same interrupt: nop the instruction that ORs in the dim mask |
| N | 0x22270 | `42ea2910` | `42ea2810` | Display init: "display on" command → "display off" |

- In V15 the LEDs are driven by the IRQ 37 handler. It scans 11 rows and outputs, on 4 columns, the "lit"
  buffer in RAM, ORed with a "dim" buffer in 2 frames out of 10 (20 % duty). With P1 and P2 the column output
  is always 0, so every LED stays off regardless of the buffers.
- With P in place, K, L and M have no visible effect. They are kept because this exact combination is the one
  tested on hardware.

## 4. Version string and checksums

- The version string at app.bin 0x4EA64 changes from `FM-1_015` to `FM-1_051`. The device reports a checksum
  of this string that is a precomputed constant, so the digits must add up to 6 like the stock `015`.
- One spare byte in the EQ name (flash offset 0x9229A) changes from 0xFF to 0xFB, so the configuration block
  differs from the stock one. This is a precaution carried over from development; it has not been shown that
  the updater rejects an unchanged configuration.
- CRC16 values are recomputed in this order: app.bin entry, app area header, EQ, cfg, and the container header.
- Rebuilding with no patches (same version, same EQ byte) gives back the stock file byte for byte
  (`tests/test_patch.py`).
