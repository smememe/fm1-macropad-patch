#!/usr/bin/env python3
"""Inline web/src/ into a single docs/index.html (no external files, so it also works from file://).

    python3 web/build_web.py

The Content-Security-Policy allows only this page's own script and style (by hash) and blocks
everything else, including all network requests.
"""
import base64
import hashlib
import pathlib

HERE = pathlib.Path(__file__).resolve().parent
SRC = HERE / "src"
OUT = HERE.parent / "docs" / "index.html"


def csp_hash(text):
    return "sha256-" + base64.b64encode(hashlib.sha256(text.encode("utf-8")).digest()).decode()


def main():
    script = "\n".join((SRC / name).read_text() for name in ("patches.js", "fm1patch.js", "ui.js"))
    style = (SRC / "style.css").read_text()
    for name, text in (("script", script), ("style", style)):
        if "</" in text:
            raise SystemExit(f"{name} contains '</', which would close the inline element")
    html = (SRC / "template.html").read_text()
    html = (html.replace("{{SCRIPT_HASH}}", csp_hash(script))
                .replace("{{STYLE_HASH}}", csp_hash(style))
                .replace("{{SCRIPT}}", script)
                .replace("{{STYLE}}", style))
    OUT.write_text(html)
    print(f"wrote {OUT} ({len(html.encode()):,} bytes)")


if __name__ == "__main__":
    main()
