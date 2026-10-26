// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { observer } from 'mobx-react-lite';
import { useEffect, useRef, useState } from 'preact/hooks';

import { useSettingsStore } from 'SettingsLib/hooks';
import { RouteName } from 'SettingsStore/modules';
import { Layout } from 'UILib';

import { InstallModal } from '../InstallModal';
import { NotSupportedModal } from '../NotSupportedModal';

import {
    FilteringRules,
    HowItWorks,
    ProtectionLevel,
    RemoveFilterModal,
    ResetCacheModal,
    Switch,
    Title,
    Troubleshooting,
} from './components';

import type { NotSupportedModalReason } from '../NotSupportedModal';

/**
 * System-wide Protection page component for settings module
 */
function SystemWideProtectionComponent() {
    const { advancedBlocking, router, account } = useSettingsStore();
    const {
        urlFilterNew,
        urlFilterState: { isInstalled },
        scrollToTroubleshootingRequested,
    } = advancedBlocking;

    const { isLicenseOrTrialActive } = account;

    const [notSupportedReason, setNotSupportedReason] = useState<NotSupportedModalReason>();
    const [showInstallModal, setShowInstallModal] = useState(false);
    const [showResetCacheModal, setShowResetCacheModal] = useState(false);
    const [showRemoveFilterModal, setShowRemoveFilterModal] = useState(false);

    const troubleshootingRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (urlFilterNew) {
            return () => advancedBlocking.updateURLFilterSeen(true);
        }
    }, [advancedBlocking, urlFilterNew]);

    useEffect(() => {
        if (isLicenseOrTrialActive) {
            // Opening the page starts a visit: automatic reports are collapsed per visit.
            advancedBlocking.beginSystemWideProtectionPageVisit();
            // The platform retries a failed bring-up on page open and on window focus.
            advancedBlocking.retrySystemWideProtection();
            const handleFocus = () => advancedBlocking.retrySystemWideProtection();
            window.addEventListener('focus', handleFocus);

            return () => {
                window.removeEventListener('focus', handleFocus);
                // Leaving the page ends the visit: failures on other pages show again.
                advancedBlocking.endSystemWideProtectionPageVisit();
            };
        }
    }, [advancedBlocking, isLicenseOrTrialActive]);

    useEffect(() => {
        if (!scrollToTroubleshootingRequested) {
            return;
        }
        advancedBlocking.consumeTroubleshootingScroll();
        troubleshootingRef.current?.scrollIntoView({ block: 'end' });
    }, [advancedBlocking, scrollToTroubleshootingRequested]);

    return (
        <Layout navigation={{ router, route: RouteName.advanced_blocking, title: translate('menu.advanced.blocking.title') }} type="settingsPage">
            <Title
                setShowNotSupportedModal={setNotSupportedReason}
                setShowRemoveFilterModal={setShowRemoveFilterModal}
                setShowResetCacheModal={setShowResetCacheModal}
            />
            <Switch onNeedInstall={() => setShowInstallModal(true)} />
            <ProtectionLevel />
            <FilteringRules />
            <HowItWorks />
            <Troubleshooting
                blockRef={troubleshootingRef}
                isInstalled={isInstalled}
                setShowRemoveFilterModal={setShowRemoveFilterModal}
                setShowResetCacheModal={setShowResetCacheModal}
                onContactSupport={() => router.changePath(RouteName.contact_support)}
            />
            {notSupportedReason && (
                <NotSupportedModal
                    reason={notSupportedReason}
                    setShowNotSupportedModal={() => setNotSupportedReason(undefined)}
                />
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
