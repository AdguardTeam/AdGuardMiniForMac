// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { observer } from 'mobx-react-lite';

import { SettingsItem } from 'Modules/settings/components/SettingsItem';
import { SettingsEvent } from 'Modules/settings/store/modules';
import { useSettingsStore } from 'SettingsLib/hooks';
import { Modal } from 'UILib';

import s from './AlreadyPurchasedModal.module.pcss';

type AlreadyPurchasedModalProps = {
    onClose(): void;
    onGoToEnterActivationCodeStep(): void;
};

/**
 * "Already purchased" modal for activation flow
 */
function AlreadyPurchasedModalComponent({
    onClose,
    onGoToEnterActivationCodeStep,
}: AlreadyPurchasedModalProps) {
    const { account, settings, telemetry } = useSettingsStore();

    const { isMASReleaseVariant } = settings;

    return (
        <Modal
            childrenClassName={s.AlreadyPurchasedModal_modalChildren}
            contentPadding={false}
            title={translate('settings.activation.flow.already.purchased.modal.title')}
            zIndex="paywall-modal"
            onClose={onClose}
        >
            <SettingsItem
                icon="user"
                iconColor="green"
                title={translate('settings.activation.flow.already.purchased.modal.log.in')}
                onContainerClick={() => {
                    account.requestLoginOrActivate();
                    onClose();
                    telemetry.trackEvent(SettingsEvent.LogInClick);
                }}
            />
            {isMASReleaseVariant && (
                <SettingsItem
                    icon="purchase"
                    iconColor="green"
                    title={translate('settings.activation.flow.already.purchased.modal.restore')}
                    onContainerClick={() => {
                        account.restorePurchase();
                        onClose();
                        telemetry.trackEvent(SettingsEvent.RestoreClick);
                    }}
                />
            )}
            <SettingsItem
                icon="key"
                iconColor="green"
                title={translate('settings.activation.flow.already.purchased.modal.enter.code')}
                onContainerClick={onGoToEnterActivationCodeStep}
            />
        </Modal>
    );
}

export const AlreadyPurchasedModal = observer(AlreadyPurchasedModalComponent);
