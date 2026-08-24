// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'preact/hooks';

import { useSettingsStore } from 'SettingsLib/hooks';
import { Layout } from 'UILib';

import { InstallModal } from '../InstallModal';
import { NotSupportedModal } from '../NotSupportedModal';

import { FilteringRules, HowItWorks, ProtectionLevel, Switch, Title, ResetCacheModal, RemoveFilterModal } from './components';

/**
 * System-wide Protection page component for settings module
 */
function SystemWideProtectionComponent() {
    const { advancedBlocking } = useSettingsStore();
    const { urlFilterNew } = advancedBlocking;

    const [showNotSupportedModal, setShowNotSupportedModal] = useState(false);
    const [showInstallModal, setShowInstallModal] = useState(false);
    const [showResetCacheModal, setShowResetCacheModal] = useState(false);
    const [showRemoveFilterModal, setShowRemoveFilterModal] = useState(false);

    useEffect(() => {
        if (urlFilterNew) {
            return () => advancedBlocking.updateURLFilterSeen(true);
        }
    }, [advancedBlocking, urlFilterNew]);

    return (
        <Layout type="settingsPage">
            <Title
                setShowNotSupportedModal={setShowNotSupportedModal}
                setShowRemoveFilterModal={setShowRemoveFilterModal}
                setShowResetCacheModal={setShowResetCacheModal}
            />
            <Switch onNeedInstall={() => setShowInstallModal(true)} />
            <ProtectionLevel />
            <FilteringRules />
            <HowItWorks />
            {showNotSupportedModal && (
                <NotSupportedModal setShowNotSupportedModal={setShowNotSupportedModal} />
            )}
            {showInstallModal && (
                <InstallModal onClose={() => setShowInstallModal(false)} />
            )}
            {showResetCacheModal && (
                <ResetCacheModal setShowResetCacheModal={setShowResetCacheModal} />
            )}
            {showRemoveFilterModal && (
                <RemoveFilterModal setShowRemoveFilterModal={setShowRemoveFilterModal} />
            )}
        </Layout>
    );
}

export const SystemWideProtection = observer(SystemWideProtectionComponent);
