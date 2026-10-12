# Flashing, checking and reverting

## Before you flash

- This is an unofficial modification. Do not contact M-VAVE support about the patched firmware.
- Flashing modified firmware may void your warranty. Flashing the official firmware back does not
  necessarily restore it.
- Keep the USB cable connected and do not let the computer sleep during the update.
- It has not been checked what happens to patches or sequences saved on the unit. Write down anything
  you need first.
- After patching, the unit's settings screen can no longer be reached. Change settings such as velocity
  with the official firmware before flashing.
- Only the environments listed in the README under "Tested environments" have been tried.
- If you give away or sell a patched unit, tell the new owner it is modified.
- Following the laws of your country or region, and the manufacturer's terms, is your responsibility.

## 1. Get the official firmware

Download `FM-1.fwsc` (V15) from the Downloads page of the official M-VAVE website.
The patcher accepts only the file with this SHA-256:

```
db1642b2b6fa5c2cccb11ffd13878068bb28601678d3644049f99dc40e7edb8a
```

If M-VAVE replaces the file, the patcher will refuse it. Please report that in Issues.

## 2. Apply the patch

Either open the [browser patcher](https://smememe.github.io/fm1-macropad-patch/) and choose `FM-1.fwsc`,
or run `python3 fm1patch.py FM-1.fwsc` (`py` instead of `python3` on Windows).
Both produce `FM-1-macropad.fwsc` with this SHA-256:

```
4192103baeef0b4601a60e0ec55cd517371ec9834ce2e6b2964647e22aa98641
```

## 3. Flash with M-UPGRADE

Use M-UPGRADE, the official updater (the generic version on the M-VAVE Downloads page, Windows or macOS).

1. Start M-UPGRADE and connect the FM-1 over USB. The unit should be shown as FM-1.
   Its current firmware version does not matter.
2. Click "Select Firmware" and choose `FM-1-macropad.fwsc`. It should show "Firmware version:51".
3. Click "Update Firmware" and wait until it reports completion (about 20–60 seconds).
   During the update the unit restarts in update mode and reconnects as a different USB device, then
   restarts again with the new firmware.

### Windows in a virtual machine (Parallels, etc.)

Because the unit reconnects as a different USB device during the update, the virtual machine software may
ask where to connect it. Choose Windows. If it then asks for permission to connect, allow it.
(Tested with Parallels Desktop and Windows 11 on ARM. No SmartScreen warning appeared for M-UPGRADE.)

## 4. Check

- All LEDs are off and the display stays off.
- The unit still makes sound when you use it. Turn the MASTER knob (volume) down.
- Assign a shortcut to one key in your shortcut app and press the key.
- To see every note, use a MIDI monitor (e.g. [MIDI Monitor](https://www.snoize.com/midimonitor/) on macOS,
  [MIDI-OX](http://www.midiox.com/) on Windows) and compare with [NOTE_MAP.md](NOTE_MAP.md).

## 5. Revert

Flash the official `FM-1.fwsc` with M-UPGRADE, the same way as above. This has been tested on macOS.

## If something goes wrong

- **M-UPGRADE does not find the unit**: reconnect the cable, restart M-UPGRADE, and close any other app
  that may be using the unit's MIDI port.
- **"A firmware that does not conform to the device was selected"**: no file is selected, or it is not an
  FM-1 file. Select `FM-1-macropad.fwsc` again.
- **The update stopped halfway**: keep the cable connected, power-cycle the unit and try flashing again with
  M-UPGRADE. The author has not experienced an interrupted update, and no recovery method beyond this is
  known for this model.
