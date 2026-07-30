// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'preact/hooks';

import { useSettingsStore } from 'SettingsLib/hooks';
import { Layout } from 'UILib';

import { FilteringRules, HowItWorks, NotSupportedModal, ProtectionLevel, Switch, Title, InstallModal, ResetCacheModal, RemoveFilterModal } from './components';

/**
 * System-wide Protection page component for settings module
 */
function SystemWideProtectionComponent() {
    const { advancedBlocking } = useSettingsStore();
    const {
        isNew: isSystemWideProtectionNew,
        isPageNew: isSystemWideProtectionPageNew,
    } = advancedBlocking.urlFilterState.configuration;

    const [showNotSupportedModal, setShowNotSupportedModal] = useState(false);
    const [showInstallModal, setShowInstallModal] = useState(false);
    const [showResetCacheModal, setShowResetCacheModal] = useState(false);
    const [showRemoveFilterModal, setShowRemoveFilterModal] = useState(false);

    useEffect(() => {
        if (isSystemWideProtectionNew) {
            advancedBlocking.markSystemWideProtectionAsSeen();
        }
    }, [advancedBlocking, isSystemWideProtectionNew]);

    useEffect(() => {
        return () => {
            if (!isSystemWideProtectionNew && isSystemWideProtectionPageNew) {
                advancedBlocking.markSystemWideProtectionPageAsSeen();
            }
        };
    }, [advancedBlocking, isSystemWideProtectionNew, isSystemWideProtectionPageNew]);

    return (
        <Layout type="settingsPage">
            <Title
                setShowNotSupportedModal={setShowNotSupportedModal}
                setShowResetCacheModal={setShowResetCacheModal}
                setShowRemoveFilterModal={setShowRemoveFilterModal}
            />
            <Switch setShowInstallModal={setShowInstallModal} />
            <ProtectionLevel setShowInstallModal={setShowInstallModal} />
            <FilteringRules />
            <HowItWorks />
            {showNotSupportedModal && (
                <NotSupportedModal setShowNotSupportedModal={setShowNotSupportedModal} />
            )}
            {showInstallModal && (
                <InstallModal setShowInstallModal={setShowInstallModal} />
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
