// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { observer } from 'mobx-react-lite';
import { useState } from 'preact/hooks';

import { useSettingsStore } from 'SettingsLib/hooks';

import { AdBlockingSection } from './AdBlockingSection';
import { AnnoyanceSection } from './AnnoyanceSection';
import { OtherSection } from './OtherSection';
import { SafariProtectionModals } from './SafariProtectionModals';
import { SafariProtectionTitle } from './SafariProtectionTitle';
import { TrackingSection } from './TrackingSection';

/**
 * Safari protection main control component
 */
function SafariProtectionControlComponent() {
    const { settings } = useSettingsStore();
    const [showLoginItemModal, setShowLoginItemModal] = useState(!settings.loginItemEnabled);
    const [showConsentFilterIds, setShowConsentFilterIds] = useState<number[]>();

    const closeConsentModal = () => {
        setShowConsentFilterIds(undefined);
    };

    const closeLoginItemModal = () => {
        setShowLoginItemModal(false);
    };

    return (
        <>
            <SafariProtectionTitle />
            <AdBlockingSection />
            <TrackingSection />
            <AnnoyanceSection setShowConsent={setShowConsentFilterIds} />
            <OtherSection />
            <SafariProtectionModals
                closeConsentModal={closeConsentModal}
                closeLoginItemModal={closeLoginItemModal}
                showConsentFilterIds={showConsentFilterIds}
                showLoginItemModal={showLoginItemModal}
            />
        </>
    );
}

export const SafariProtectionControl = observer(SafariProtectionControlComponent);
