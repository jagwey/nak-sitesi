"""Read an embroidery file with pyembroidery and print ONE JSON object to stdout.

Usage: python parse.py <path>
Success: {"format","stitchCount","colorChanges","colorCount","widthMm","heightMm","threads":[{"hex","description","catalogNumber"}]}
Failure: {"error": "..."}  (exit code is always 0 so the caller can read the JSON)
Nothing is guessed: values come only from the parsed file.
"""
import json
import os
import sys


def main():
    if len(sys.argv) != 2:
        print(json.dumps({"error": "usage: parse.py <path>"}))
        return
    path = sys.argv[1]
    try:
        import pyembroidery

        if not os.path.isfile(path):
            print(json.dumps({"error": "file not found"}))
            return
        ext = os.path.splitext(path)[1].lstrip(".").lower()
        pattern = pyembroidery.read(path)
        if pattern is None:
            print(json.dumps({"error": "unreadable or unsupported file"}))
            return
        stitches = pattern.count_stitches()
        if stitches <= 0:
            print(json.dumps({"error": "no stitches found"}))
            return
        min_x, min_y, max_x, max_y = pattern.bounds()  # units: 0.1 mm
        threads = []
        for t in pattern.threadlist:
            try:
                hex_color = t.hex_color()
            except Exception:
                hex_color = None
            threads.append(
                {
                    "hex": hex_color,
                    "description": getattr(t, "description", None) or None,
                    "catalogNumber": getattr(t, "catalog_number", None) or None,
                }
            )
        changes = pattern.count_color_changes()
        print(
            json.dumps(
                {
                    "format": ext,
                    "stitchCount": int(stitches),
                    "colorChanges": int(changes),
                    "colorCount": len(threads) if threads else int(changes) + 1,
                    "widthMm": round((max_x - min_x) / 10.0, 1),
                    "heightMm": round((max_y - min_y) / 10.0, 1),
                    "threads": threads,
                }
            )
        )
    except Exception as e:  # noqa: BLE001 - report any parser failure as data
        print(json.dumps({"error": "%s: %s" % (type(e).__name__, str(e)[:200])}))


if __name__ == "__main__":
    main()
