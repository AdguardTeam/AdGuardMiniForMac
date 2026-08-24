// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { observer } from 'mobx-react-lite';

import { EnterActivationCodeResult } from 'Apis/types';
import { getTdsLink, TDS_PARAMS } from 'Modules/common/utils/links';
import { useSettingsStore } from 'SettingsLib/hooks';
import { provideContactSupportParam } from 'SettingsLib/utils/translate';
import { ActivationFlowResult, RouteName, SettingsEvent } from 'SettingsStore/modules';
import theme from 'Theme';
import { ExternalLink, Input, Modal, Text } from 'UILib';

import s from './EnterActivationCodeModal.module.pcss';

type EnterActivationCodeModalProps = {
    activationCode: string;
    handleActivationCodeChange(activationCode: string): void;
    activationCodeErrorMessage: string;
    handleActivationCodeErrorMessageChange(errorMessage: string): void;
    onGoBack(): void;
    onClose(): void;
};

/**
 * "Enter activation code" modal for activation flow
 */
function EnterActivationCodeModalComponent({
    activationCode,
    handleActivationCodeChange,
    handleActivationCodeErrorMessageChange,
    activationCodeErrorMessage,
    onGoBack,
    onClose,
}: EnterActivationCodeModalProps) {
    const { account, telemetry } = useSettingsStore();

    /**
     * Handle activation code submission
     */
    const submitAction = async () => {
        const { error: { hasError }, result } = await account.activateLicenseByCode(activationCode);

        telemetry.trackEvent(SettingsEvent.ActivateViaCodeClick);

        if (hasError) {
            handleActivationCodeErrorMessageChange(
                translate('settings.activation.flow.enter.activation.code.modal.error.error', provideContactSupportParam({
                    onClick: onGoBack,
                })),
            );
            return;
        }

        switch (result) {
            case EnterActivationCodeResult.valid:
                account.setActivationFlowResult(ActivationFlowResult.licenseSuccess);
                onClose();
                break;
            case EnterActivationCodeResult.notExists:
                handleActivationCodeErrorMessageChange(
                    translate('settings.activation.flow.enter.activation.code.modal.error.not.exist'),
                );
                break;
            case EnterActivationCodeResult.blocked:
                handleActivationCodeErrorMessageChange(
                    translate('settings.activation.flow.enter.activation.code.modal.error.blocked'),
                );
                break;
            case EnterActivationCodeResult.expired:
                handleActivationCodeErrorMessageChange(
                    translate('settings.activation.flow.enter.activation.code.modal.error.expired'),
                );
                break;
            case EnterActivationCodeResult.maxComputersExceed:
                handleActivationCodeErrorMessageChange(
                    translate('settings.activation.flow.enter.activation.code.modal.error.max.computers', { link: (text: string) => (
                        <ExternalLink
                            color="red"
                            href={getTdsLink(TDS_PARAMS.account, RouteName.license)}
                            textType="t1"
                        >
                            {text}
                        </ExternalLink>
                    ) }),
                );
                break;
        }
    };

    return (
        <Modal
            submitAction={submitAction}
            submitClassName={theme.button.greenSubmit}
            submitText={translate('settings.activation.flow.enter.activation.code.modal.activate')}
            title={translate('settings.activation.flow.enter.activation.code.modal.title')}
            zIndex="paywall-modal"
            submit
            onClose={onGoBack}
        >
            <>
                <Text className={s.EnterActivationCodeModal_description} type="t1">
                    {translate('settings.activation.flow.enter.activation.code.modal.desc', {
                        link: (text: string) => (
                            <ExternalLink
                                href={getTdsLink(TDS_PARAMS.account, RouteName.license)}
                                textType="t1"
                            >
                                {text}
                            </ExternalLink>
                        ),
                    })}
                </Text>
                <div className={s.EnterActivationCodeModal_inputContainer}>
                    <Input
                        className={s.EnterActivationCodeModal_input}
                        error={!!activationCodeErrorMessage}
                        errorMessage={activationCodeErrorMessage}
                        id="code"
                        label={translate('settings.activation.flow.enter.activation.code.modal.input.label')}
                        placeholder={translate('settings.activation.flow.enter.activation.code.modal.input.placeholder')}
                        value={activationCode}
                        allowClear
                        autoFocus
                        onChange={(value) => {
                            handleActivationCodeErrorMessageChange('');
                            handleActivationCodeChange(value);
                        }}
                    />
                </div>
            </>
        </Modal>
    );
}

export const EnterActivationCodeModal = observer(EnterActivationCodeModalComponent);
