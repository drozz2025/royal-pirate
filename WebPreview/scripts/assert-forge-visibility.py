#!/usr/bin/env python3
"""Reject a broken Forge screenshot before publishing ROYAL PIRATE.

The live SVG workshop sometimes disappears behind a rectangular blue harbour
compositor tile. Check the actual 390x844 Chromium screenshot using stdlib only.
"""
import argparse
import struct
import sys
import zlib
from pathlib import Path


def read_png_rgb(path: Path):
    png = path.read_bytes()
    if not png.startswith(b'\x89PNG\r\n\x1a\n'):
        raise ValueError('not a PNG screenshot')
    pos, compressed, width, height, channels = 8, bytearray(), None, None, None
    while pos < len(png):
        length = struct.unpack_from('>I', png, pos)[0]
        kind = png[pos + 4:pos + 8]
        payload = png[pos + 8:pos + 8 + length]
        pos += length + 12
        if kind == b'IHDR':
            width, height, bit_depth, color_type, compression, filtering, interlace = struct.unpack('>IIBBBBB', payload)
            if (bit_depth, color_type, compression, filtering, interlace) not in [(8, 2, 0, 0, 0), (8, 6, 0, 0, 0)]:
                raise ValueError('unsupported PNG encoding')
            channels = 3 if color_type == 2 else 4
        elif kind == b'IDAT':
            compressed.extend(payload)
        elif kind == b'IEND':
            break
    if width is None or not compressed:
        raise ValueError('PNG is incomplete')
    stream = zlib.decompress(compressed)
    stride = width * channels
    if len(stream) != (stride + 1) * height:
        raise ValueError('unexpected PNG data size')
    prev = bytearray(stride)
    rows = []
    offset = 0
    for _ in range(height):
        f = stream[offset]
        row = bytearray(stream[offset+1:offset+1+stride])
        offset += stride+1
        for i in range(stride):
            left = row[i-channels] if i >= channels else 0
            up = prev[i]
            up_left = prev[i-channels] if i >= channels else 0
            if f == 1:
                row[i] = (row[i] + left) & 255
            elif f == 2:
                row[i] = (row[i] + up) & 255
            elif f == 3:
                row[i] = (row[i] + (left + up)//2) & 255
            elif f == 4:
                pred = left + up - up_left
                da, db, dc = abs(pred-left), abs(pred-up), abs(pred-up_left)
                row[i] = (row[i] + (left if da<=db and da<=dc else up if db<=dc else up_left)) & 255
            elif f != 0:
                raise ValueError('unsupported PNG scanline filter')
        rows.append(row)
        prev = row
    return width, height, channels, rows


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('screenshot', type=Path)
    args = parser.parse_args()
    width, height, channels, rows = read_png_rgb(args.screenshot)
    if (width, height) != (390, 844):
        raise ValueError(f'expected 390x844 Forge screenshot, got {width}x{height}')
    blue, sampled = 0, 0
    for y in range(170, 365, 5):
        for x in range(25, 195, 5):
            row = rows[y]
            idx = x * channels
            red, green, b = row[idx:idx+3]
            blue += int(b > red + 18 and b > green + 8 and b > 65)
            sampled += 1
    fraction = blue/sampled
    print(f'Forge upper-left blue tile: {blue}/{sampled} pixels ({fraction:.1%})')
    if fraction >= 0.70:
        sys.exit('ERROR: Forge cannon/workshop is occluded by a blue rectangle. Reject public deployment.')
    print('Forge illustration remains visible in checked viewport region.')


if __name__ == '__main__':
    main()
