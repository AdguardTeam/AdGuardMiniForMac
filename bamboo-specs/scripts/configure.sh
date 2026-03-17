#!/bin/bash

# SPDX-FileCopyrightText: AdGuard Software Limited
#
# SPDX-License-Identifier: GPL-3.0-or-later

set -e

pushd "$(dirname $0)/../../"

# Activate nvm and use Node.js 22 on CI
if [ "${bamboo_agentId}" ]; then
    [ -s "/opt/homebrew/opt/nvm/nvm.sh" ] && \. "/opt/homebrew/opt/nvm/nvm.sh"
    nvm use 22
fi

./bamboo-specs/scripts/setup_ssh.sh
./configure.sh

popd
