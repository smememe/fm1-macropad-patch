# Note map

All messages are on MIDI channel 1. See the [layout diagram](layout.svg) for where each control is.

- Buttons and keys: note-on when pressed, note-off when released.
- Knobs: one note-on per detent, no note-off.
- Note-on velocity follows the unit's velocity setting (1 on the author's unit). Note-off velocity is 100.
- Note names use C4 = 60. Some apps call note 60 "C3"; the note numbers are what matter.

## Buttons

| Button | Note |
|---|---|
| OCT− | 39 |
| OCT+ | 40 |
| FX | 41 |
| SEL | 42 |
| ENV | 43 |
| LFO | 44 |
| EDIT | 45 |
| GLO | 46 |
| HOME | 47 |
| SAVE | 48 |
| ARP | 49 |
| SEQ | 50 |
| PLAY/STOP | 51 |
| REC | 52 |

## Keys (same as stock)

| Note | Name | Note | Name | Note | Name |
|---|---|---|---|---|---|
| 53 | F3 | 62 | D4 | 71 | B4 |
| 54 | F#3 | 63 | D#4 | 72 | C5 |
| 55 | G3 | 64 | E4 | 73 | C#5 |
| 56 | G#3 | 65 | F4 | 74 | D5 |
| 57 | A3 | 66 | F#4 | 75 | D#5 |
| 58 | A#3 | 67 | G4 | 76 | E5 |
| 59 | B3 | 68 | G#4 | 77 | F5 |
| 60 | C4 | 69 | A4 | 78 | F#5 |
| 61 | C#4 | 70 | A#4 | 79 | G5 |

## Knobs

| Knob | Clockwise | Counter-clockwise |
|---|---|---|
| SELECT | 87 | 95 |
| ALGORITHM | 88 | 96 |
| KNOB1 | 89 | 97 |
| KNOB2 | 90 | 98 |
| KNOB3 | 91 | 99 |
| KNOB4 | 92 | 100 |
| PRESETS | 93 | 101 |

MASTER is the volume knob and sends no MIDI.
