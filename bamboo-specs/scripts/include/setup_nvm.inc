#!/bin/bash

# SPDX-FileCopyrightText: AdGuard Software Limited
#
# SPDX-License-Identifier: GPL-3.0-or-later

# Activates nvm and switches to Node.js 22 on CI build agents.
# Source this file in any bamboo script that requires Node.js.
# No-op outside of CI (bamboo_agentId is not set).

setup_nvm() {
    if [ "${bamboo_agentId}" ]; then
        [ -s "/opt/homebrew/opt/nvm/nvm.sh" ] && \. "/opt/homebrew/opt/nvm/nvm.sh"
        nvm use 22
    fi
}
