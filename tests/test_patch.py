#!/usr/bin/env python3
"""Checks for fm1patch.py. Needs the official V15 FM-1.fwsc, which is not in this repository.

    FM1_FWSC=/path/to/FM-1.fwsc python3 tests/test_patch.py

Without FM1_FWSC only the checks that need no firmware run.
"""
import hashlib
import os
import pathlib
import sys
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
import fm1patch  # noqa: E402
from jltech.crc import jl_crc16  # noqa: E402

FWSC = os.environ.get("FM1_FWSC")


class NoFirmware(unittest.TestCase):
    def test_crc16_check_value(self):
        # CRC-16/XMODEM check value
        self.assertEqual(jl_crc16(b"123456789"), 0x31C3)

    def test_patches_keep_length(self):
        for name, _, want, new in fm1patch.PATCHES:
            self.assertEqual(len(want), len(new), name)

    def test_patch_count_and_size(self):
        self.assertEqual(len(fm1patch.PATCHES), 16)
        self.assertEqual(sum(len(w) // 2 for _, _, w, _ in fm1patch.PATCHES), 84)

    def test_version_digit_sum(self):
        self.assertEqual(sum(fm1patch.VER), sum(fm1patch.STOCK_VER))
        self.assertNotEqual(fm1patch.VER, fm1patch.STOCK_VER)

    def test_rejects_other_input(self):
        with self.assertRaises(fm1patch.PatchError):
            fm1patch.build(b"not a firmware")


@unittest.skipUnless(FWSC, "set FM1_FWSC to the official V15 FM-1.fwsc")
class WithFirmware(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.raw = pathlib.Path(FWSC).read_bytes()

    def test_output_matches_expected(self):
        out = fm1patch.build(self.raw)
        self.assertEqual(hashlib.sha256(out).hexdigest(), fm1patch.EXPECTED_OUT_SHA256)
        self.assertEqual(len(out), len(self.raw))

    def test_rebuild_without_patches_is_identical(self):
        # Decrypt, recompute every CRC and re-encrypt with no changes: must give back the stock file.
        self.assertEqual(fm1patch.build(self.raw, patches=[], ver=fm1patch.STOCK_VER, eq_pad=0xFF), self.raw)

    def test_one_byte_change_is_rejected(self):
        bad = bytearray(self.raw)
        bad[0x50000] ^= 1
        with self.assertRaises(fm1patch.PatchError):
            fm1patch.build(bytes(bad))


if __name__ == "__main__":
    unittest.main(verbosity=2)
