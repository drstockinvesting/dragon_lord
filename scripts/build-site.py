#!/usr/bin/env python3
"""Assemble the deployable site into _site/.

The repo is the source of truth; this only does the two things a static host
cannot do for itself:

  1. Stamps BUILD so the title screen names the version you are playing.
  2. Appends a content hash to each asset URL, so a changed backdrop or sprite
     sheet is fetched fresh instead of served from a stale browser cache.

Run it with no arguments to build with a 'local' stamp:  python3 scripts/build-site.py
"""

import hashlib
import os
import re
import shutil
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, '_site')


def git(*args, default=''):
    try:
        return subprocess.run(['git', *args], cwd=ROOT, capture_output=True,
                              text=True, check=True).stdout.strip()
    except (subprocess.CalledProcessError, FileNotFoundError):
        return default


def build_stamp():
    """Prefer an explicit stamp from CI, else derive one from git."""
    if os.environ.get('BUILD_STAMP'):
        return os.environ['BUILD_STAMP']
    sha = git('rev-parse', '--short', 'HEAD', default='local')
    date = git('log', '-1', '--format=%cd', '--date=format:%Y-%m-%d', default='')
    return f'{date} {sha}'.strip()


def main():
    if os.path.isdir(OUT):
        shutil.rmtree(OUT)
    os.makedirs(OUT)

    shutil.copytree(os.path.join(ROOT, 'assets'), os.path.join(OUT, 'assets'))

    html = open(os.path.join(ROOT, 'index.html'), encoding='utf-8').read()

    stamp = build_stamp()
    html, n = re.subn(r"const BUILD = 'dev';",
                      f"const BUILD = {stamp!r};".replace('"', "'"), html, count=1)
    if n != 1:
        sys.exit("build: could not find `const BUILD = 'dev';` in index.html")

    # Cache-bust every asset the page references, keyed on its own bytes.
    for name in sorted(os.listdir(os.path.join(ROOT, 'assets'))):
        path = f'assets/{name}'
        full = os.path.join(ROOT, path)
        if not os.path.isfile(full):
            continue
        digest = hashlib.sha256(open(full, 'rb').read()).hexdigest()[:12]
        html = html.replace(f"'{path}'", f"'{path}?v={digest}'")

    open(os.path.join(OUT, 'index.html'), 'w', encoding='utf-8').write(html)

    # A .nojekyll keeps Pages from running the files through Jekyll, which would
    # otherwise swallow any path beginning with an underscore.
    open(os.path.join(OUT, '.nojekyll'), 'w').close()

    print(f'build: _site/ ready, stamp {stamp!r}')


if __name__ == '__main__':
    main()
