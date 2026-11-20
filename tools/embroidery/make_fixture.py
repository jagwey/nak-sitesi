"""Generate TEST FIXTURES (a handful of stitches, not real designs) for the parser tests.
Usage: python make_fixture.py <out_dir>
"""
import os
import sys

import pyembroidery


def build():
    p = pyembroidery.EmbPattern()
    p.add_thread(pyembroidery.EmbThread(0xFF0000, "Test Red", "T-001"))
    p.add_thread(pyembroidery.EmbThread(0x0000FF, "Test Blue", "T-002"))
    for x, y in [(0, 0), (100, 0), (100, 200), (0, 200)]:  # 0.1 mm units -> 10 x 20 mm box
        p.add_stitch_absolute(pyembroidery.STITCH, x, y)
    p.add_stitch_absolute(pyembroidery.COLOR_CHANGE, 0, 0)
    for x, y in [(0, 0), (50, 50), (100, 0)]:
        p.add_stitch_absolute(pyembroidery.STITCH, x, y)
    p.add_stitch_absolute(pyembroidery.END, 100, 0)
    return p


if __name__ == "__main__":
    out = sys.argv[1]
    os.makedirs(out, exist_ok=True)
    for ext in ("dst", "pes"):
        pyembroidery.write(build(), os.path.join(out, "test-fixture." + ext))
