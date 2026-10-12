#!/usr/bin/env python3
"""Inline web/src/ into single-file pages in docs/ (no external files, so they also work from file://).

    python3 web/build_web.py

    docs/index.html    the patcher
    docs/monitor.html  the input monitor (Web MIDI; Chrome / Edge)

The Content-Security-Policy allows only each page's own script and style (by hash) and blocks
everything else, including all network requests.
"""
import base64
import hashlib
import pathlib

HERE = pathlib.Path(__file__).resolve().parent
SRC = HERE / "src"
DOCS = HERE.parent / "docs"

PAGES = {
    "index.html": ("template.html", ["patches.js", "fm1patch.js", "ui.js"], ["style.css"]),
    "monitor.html": ("monitor.html", ["fm1layout.js", "monitor.js"], ["style.css", "monitor.css"]),
}


def csp_hash(text):
    return "sha256-" + base64.b64encode(hashlib.sha256(text.encode("utf-8")).digest()).decode()


def build(out_name, template, scripts, styles):
    script = "\n".join((SRC / name).read_text() for name in scripts)
    style = "\n".join((SRC / name).read_text() for name in styles)
    for name, text in (("script", script), ("style", style)):
        if "</" in text:
            raise SystemExit(f"{out_name}: {name} contains '</', which would close the inline element")
    html = (SRC / template).read_text()
    html = (html.replace("{{SCRIPT_HASH}}", csp_hash(script))
                .replace("{{STYLE_HASH}}", csp_hash(style))
                .replace("{{SCRIPT}}", script)
                .replace("{{STYLE}}", style))
    out = DOCS / out_name
    out.write_text(html)
    print(f"wrote {out} ({len(html.encode()):,} bytes)")


def main():
    for out_name, (template, scripts, styles) in PAGES.items():
        build(out_name, template, scripts, styles)


if __name__ == "__main__":
    main()
