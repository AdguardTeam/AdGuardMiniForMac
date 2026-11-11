// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'preact/hooks';

import { useMailProtectionToggle, useSettingsStore } from 'SettingsLib/hooks';
import { RouteName } from 'SettingsStore/modules';
import { Layout } from 'UILib';

import { EnableMailDialog } from '../EnableMailDialog';

import { ExtensionInstructions, HowItWorks, Switch, Title } from './components';

/**
 * Apple Mail tracking protection page component for settings module
 */
function MailProtectionComponent() {
    const {
        account, advancedBlocking, router,
    } = useSettingsStore();

    const { mailProtection, mailProtectionNew } = advancedBlocking;
    const { isLicenseOrTrialActive } = account;

    const [showEnableDialog, setShowEnableDialog] = useState(false);

    const { isInactive, onEnableFilter } = useMailProtectionToggle({
        onShowOnboarding: () => setShowEnableDialog(true),
    });

    useEffect(() => {
        if (!isInactive) {
            // The filter works again: the snack of the previous state is stale.
            advancedBlocking.closeMailProtectionInactiveNotification();
            return;
        }

        advancedBlocking.showMailProtectionInactiveNotification(
            translate('advanced.blocking.mail.tracking.protection.inactive', {
                b: (text: string) => <b>{text}</b>,
            }),
            onEnableFilter,
        );
    }, [advancedBlocking, isInactive, onEnableFilter]);

    // The entry is new until the user has opened this screen.
    useEffect(() => {
        if (mailProtectionNew) {
            return () => advancedBlocking.updateMailProtectionIsNew(false);
        }
    }, [advancedBlocking, mailProtectionNew]);

    return (
        <Layout navigation={{ router, route: RouteName.advanced_blocking, title: translate('menu.advanced.blocking.title') }} type="settingsPage">
            <Title />
            <Switch onShowOnboarding={() => setShowEnableDialog(true)} />
            <HowItWorks />
            {isLicenseOrTrialActive && <ExtensionInstructions enabled={mailProtection} />}
            {showEnableDialog && <EnableMailDialog onClose={() => setShowEnableDialog(false)} />}
        </Layout>
    );
}

export const MailProtection = observer(MailProtectionComponent);
