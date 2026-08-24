// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { observer } from 'mobx-react-lite';
import { useState } from 'preact/hooks';

import { useSettingsStore } from 'SettingsLib/hooks';

import { AlreadyPurchasedModal } from './AlreadyPurchasedModal';
import { EnterActivationCodeModal } from './EnterActivationCodeModal';

enum AlreadyPurchasedFlowStep {
    initial = 'initial',
    enterActivationCode = 'enterActivationCode',
}

type AlreadyPurchasedFlowModalProps = {
    onClose(): void;
};

/**
 * Used as a controller for already purchased flow
 */
function AlreadyPurchasedFlowModalComponent({
    onClose,
}: AlreadyPurchasedFlowModalProps) {
    const { account } = useSettingsStore();

    const [step, setStep] = useState(AlreadyPurchasedFlowStep.initial);

    const [activationCode, setActivationCode] = useState('');
    const [activationCodeErrorMessage, setActivationCodeErrorMessage] = useState('');

    const { isCheckingLicenseStatus } = account;

    if (isCheckingLicenseStatus) {
        return null;
    }

    if (step === AlreadyPurchasedFlowStep.initial) {
        return (
            <AlreadyPurchasedModal
                onClose={onClose}
                onGoToEnterActivationCodeStep={() => {
                    setStep(AlreadyPurchasedFlowStep.enterActivationCode);
                }}
            />
        );
    }

    if (step === AlreadyPurchasedFlowStep.enterActivationCode) {
        return (
            <EnterActivationCodeModal
                activationCode={activationCode}
                activationCodeErrorMessage={activationCodeErrorMessage}
                handleActivationCodeChange={setActivationCode}
                handleActivationCodeErrorMessageChange={setActivationCodeErrorMessage}
                onClose={onClose}
                onGoBack={() => setStep(AlreadyPurchasedFlowStep.initial)}
            />
        );
    }

    return null;
}

export const AlreadyPurchasedFlowModal = observer(AlreadyPurchasedFlowModalComponent);
