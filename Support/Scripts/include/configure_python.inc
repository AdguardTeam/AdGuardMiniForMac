# SPDX-FileCopyrightText: AdGuard Software Limited
#
# SPDX-License-Identifier: GPL-3.0-or-later

PYTHON_BIN="$(command -v python3)"
PYTHON_VERSION="$("$PYTHON_BIN" -c 'import sys; print("%d.%d" % sys.version_info[:2])')"

# A venv keeps the interpreter it was built from, so a new base Python needs a new venv.
if [ -x .venv/bin/python3 ]; then
    VENV_PYTHON_VERSION="$(.venv/bin/python3 -c 'import sys; print("%d.%d" % sys.version_info[:2])' 2>/dev/null || true)"
    if [ "$VENV_PYTHON_VERSION" != "$PYTHON_VERSION" ]; then
        echo "Recreating .venv for Python $PYTHON_VERSION (was ${VENV_PYTHON_VERSION:-unknown})"
        rm -rf .venv
    fi
fi

"$PYTHON_BIN" -m venv .venv
source .venv/bin/activate
# `python` -> `python3`, after activating virtual env
PROJECT_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
python -m pip install -r "$PROJECT_ROOT/AdguardMini/ui/packages/proto-generator/requirements.txt"
