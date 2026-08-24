// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { observer } from 'mobx-react-lite';
import { useEffect } from 'preact/hooks';

import { provideTrialDaysParam } from 'Common/utils/translate';
import { useSettingsStore } from 'SettingsLib/hooks';
import { provideContactSupportParam } from 'SettingsLib/utils/translate';
import { ActivationFlowResult, SettingsEvent, SettingsLayer } from 'SettingsStore/modules';
import theme from 'Theme';
import { Modal, Text } from 'UILib';

import s from './ActivationFlowResultModal.module.pcss';
import { SuccessImage, FailureImage } from './Images';

import type { ModalProps } from 'UILib';

type ActivationFlowResultModalProps = {
    activationResult: ActivationFlowResult;
};

/**
 * Modal for showing feedback based on the activation flow result
 */
function ActivationFlowResultModalComponent({
    activationResult,
}: ActivationFlowResultModalProps) {
    const { account, telemetry } = useSettingsStore();
    const { trialAvailableDays } = account;

    const handleModalClose = () => {
        const isSuccessfulResult = [
            ActivationFlowResult.trialSuccess,
            ActivationFlowResult.licenseSuccess,
        ].includes(activationResult);

        if (isSuccessfulResult) {
            account.closePaywall();
        }

        account.resetActivationFlowStatus();
    };

    useEffect(() => {
        if (activationResult === ActivationFlowResult.licenseFailure) {
            telemetry.layersRelay.setPage(SettingsLayer.FailedActivation);
        } else if (activationResult === ActivationFlowResult.restoreFailure) {
            telemetry.layersRelay.setPage(SettingsLayer.NoPurchaseScreen);
        }
        telemetry.layersRelay.trackPageView();
    }, [activationResult, telemetry.layersRelay]);

    let modalConfig: ModalProps;

    switch (activationResult) {
        case ActivationFlowResult.trialSuccess:
            modalConfig = {
                headerSlot: <SuccessImage className={s.ActivationFlowResultModal_image} />,
                title: translate('settings.activation.flow.trial.success.title', provideTrialDaysParam(trialAvailableDays)),
                submit: true,
                submitAction: handleModalClose,
                submitText: translate('settings.activation.flow.trial.success.btn'),
                submitClassName: theme.button.greenSubmit,
                children: (
                    <Text className={s.ActivationFlowResultModal_description} type="t1">
                        {translate('settings.activation.flow.trial.success.desc')}
                    </Text>
                ),
            };
            break;
        case ActivationFlowResult.licenseSuccess:
            modalConfig = {
                headerSlot: <SuccessImage className={s.ActivationFlowResultModal_image} />,
                title: translate('settings.activation.flow.full.version.success.title'),
                submit: true,
                submitAction: handleModalClose,
                submitText: translate('settings.activation.flow.full.version.success.btn'),
                submitClassName: theme.button.greenSubmit,
                children: (
                    <Text className={s.ActivationFlowResultModal_description} type="t1">
                        {translate('settings.activation.flow.full.version.success.desc')}
                    </Text>
                ),
            };
            break;
        case ActivationFlowResult.licenseFailure:
            modalConfig = {
                headerSlot: <FailureImage className={s.ActivationFlowResultModal_image} />,
                title: translate('settings.activation.flow.full.version.failure.title'),
                submit: true,
                submitAction: handleModalClose,
                submitText: translate('settings.activation.flow.full.version.failure.btn'),
                submitClassName: theme.button.greenSubmit,
                children: (
                    <Text className={s.ActivationFlowResultModal_description} type="t1">
                        {translate('settings.activation.flow.full.version.failure.desc', provideContactSupportParam({
                            onClick: handleModalClose,
                            className: tx.color.linkGreen,
                        }))}
                    </Text>
                ),
            };
            break;
        case ActivationFlowResult.restoreFailure:
            modalConfig = {
                headerSlot: <FailureImage className={s.ActivationFlowResultModal_image} />,
                title: translate('settings.activation.flow.restore.failure.title'),
                submit: true,
                submitAction: () => {
                    // Open the paywall when restoring purchases from outside it
                    account.showPaywall();
                    account.resetActivationFlowStatus();
                    telemetry.layersRelay.trackEvent(SettingsEvent.NoRestoreSubscribeClick);
                },
                submitText: translate('settings.activation.flow.restore.failure.subscribe'),
                submitClassName: theme.button.greenSubmit,
                cancel: true,
                cancelAction: handleModalClose,
                cancelText: translate('settings.activation.flow.restore.failure.close'),
                children: (
                    <Text className={s.ActivationFlowResultModal_description} type="t1">
                        {translate('settings.activation.flow.restore.failure.desc')}
                    </Text>
                ),
            };
    }

    return (
        <Modal
            childrenClassName={s.ActivationFlowResultModal_children}
            zIndex="paywall-modal"
            onClose={handleModalClose}
            {...modalConfig}
        />
    );
}

export const ActivationFlowResultModal = observer(ActivationFlowResultModalComponent);
