// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { useSettingsStore } from 'SettingsLib/hooks';
import theme from 'Theme';
import { ConsentModal, Modal } from 'UILib';

import { useSafariProtectionContext } from '../hooks/useSafariProtectionContext';

/**
 * Safari protection modals component
 */
export function SafariProtectionModals() {
    const { filters } = useSettingsStore();
    const {
        showConsentFilterIds,
        showLoginItemModal,
        closeConsentModal,
        closeLoginItemModal,
        enableConsent,
        openLoginItemsSettings,
    } = useSafariProtectionContext();

    const {
        filters: { filters: filtersArr },
    } = filters;

    return (
        <>
            {showLoginItemModal && (
                <Modal
                    cancel={false}
                    description={translate('login.item.modal.desc')}
                    submitAction={openLoginItemsSettings}
                    submitClassName={theme.button.greenSubmit}
                    submitText={translate('login.item.open.settings')}
                    title={translate('login.item.modal.title')}
                    submit
                    onClose={closeLoginItemModal}
                />
            )}
            {showConsentFilterIds && (
                <ConsentModal
                    filters={filtersArr.filter((f) => showConsentFilterIds.includes(f.id))}
                    onClose={closeConsentModal}
                    onEnable={enableConsent}
                />
            )}
        </>
    );
}
