""" CRC calculation routines

Pure-Python replacement for the original crcmod-based definitions:
    jl_crc16 = crcmod.mkCrcFun(0x11021,     initCrc=0x0000,     rev=False)
    jl_crc32 = crcmod.mkCrcFun(0x104C11DB7, initCrc=0x26536734, rev=True)
Same call signature: func(data, crc=<init>) -> int, where `crc` continues a previous result.
"""

__all__ = [
    'jl_crc16',
    'jl_crc32'
]


def _table16():
    table = []
    for i in range(256):
        c = i << 8
        for _ in range(8):
            c = ((c << 1) ^ 0x1021) if c & 0x8000 else (c << 1)
        table.append(c & 0xFFFF)
    return tuple(table)


def _table32():
    table = []
    for i in range(256):
        c = i
        for _ in range(8):
            c = (c >> 1) ^ 0xEDB88320 if c & 1 else c >> 1
        table.append(c)
    return tuple(table)


_T16 = _table16()
_T32 = _table32()


def jl_crc16(data, crc=0x0000):
    """CRC-16, poly 0x1021, MSB first, no final XOR (CRC-16/XMODEM when crc=0)."""
    for b in data:
        crc = ((crc << 8) & 0xFFFF) ^ _T16[((crc >> 8) ^ b) & 0xFF]
    return crc


def jl_crc32(data, crc=0x26536734):
    """CRC-32, poly 0x04C11DB7 reflected, init 0x26536734, no final XOR."""
    for b in data:
        crc = (crc >> 8) ^ _T32[(crc ^ b) & 0xFF]
    return crc
