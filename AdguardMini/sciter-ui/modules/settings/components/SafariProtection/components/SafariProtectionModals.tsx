// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { observer } from 'mobx-react-lite';

import { useNotificationSomethingWentWrongText, useSettingsStore } from 'SettingsLib/hooks';
import theme from 'Theme';
import { ConsentModal, Modal } from 'UILib';

type SafariProtectionModalsProps = {
    showConsentFilterIds?: number[];
    showLoginItemModal?: boolean;
    closeConsentModal(): void;
    closeLoginItemModal(): void;
};

/**
 * Safari protection modals component
 */
export function SafariProtectionModalsComponent({
    showConsentFilterIds,
    showLoginItemModal,
    closeConsentModal,
    closeLoginItemModal,
}: SafariProtectionModalsProps) {
    const { filtersMeta, appSettings } = useSettingsStore();
    const notifyError = useNotificationSomethingWentWrongText();

    const enableConsent = async () => {
        if (!showConsentFilterIds) {
            return;
        }

        const { consentFiltersIds } = appSettings.settings;
        const newConsent = [...consentFiltersIds, ...showConsentFilterIds];
        appSettings.updateUserConsent(newConsent);

        const error = await filtersMeta.switchFiltersState(showConsentFilterIds, true);
        if (error) {
            notifyError();
        }

        closeConsentModal();
    };

    const openLoginItemsSettings = () => {
        appSettings.openLoginItemsSettings();
    };

    const { filters: { filters: filtersArr } } = filtersMeta;

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

export const SafariProtectionModals = observer(SafariProtectionModalsComponent);
