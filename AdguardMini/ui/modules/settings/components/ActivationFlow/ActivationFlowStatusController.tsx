// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { observer } from 'mobx-react-lite';
import { useEffect, useRef } from 'preact/hooks';

import { LicenseStatus } from 'Apis/types';
import { useSettingsStore } from 'SettingsLib/hooks';
import { ActivationFlowResult } from 'SettingsStore/modules';

import { ActivationFlowResultModal, CheckingLicenseStatusModal } from './Modals';

/**
 * Handles the activation flow statuses
 */
function ActivationFlowStatusControllerComponent() {
    const { account } = useSettingsStore();

    const {
        license,
        licenseUpdateTime,
        hasActivationError,
        isCheckingLicenseStatus,
        activationResult,
    } = account;

    const licenseStatus = license.license?.status || LicenseStatus.unknown;

    const initialLicenseStatusRef = useRef(licenseUpdateTime);

    // Looks for changes and sets the activation flow result accordingly
    useEffect(() => {
        log.dbg(`Initial license status: ${initialLicenseStatusRef.current}. New status: ${licenseStatus}`);

        if (hasActivationError) {
            account.setActivationFlowResult(ActivationFlowResult.licenseFailure);
        }

        // License status did not change, returning
        if (initialLicenseStatusRef.current === licenseUpdateTime) {
            log.info('License status did not change, returning');
            return;
        }

        if (isCheckingLicenseStatus) {
            log.info('Checking license status, setting activation flow result');
            // We got the new license status while checking,
            // set appropriate activation flow result
            switch (licenseStatus) {
                case LicenseStatus.trial:
                    account.setActivationFlowResult(ActivationFlowResult.trialSuccess);
                    account.closePaywall();
                    break;
                case LicenseStatus.active:
                    account.setActivationFlowResult(ActivationFlowResult.licenseSuccess);
                    account.closePaywall();
                    break;
                default:
                    account.setActivationFlowResult(ActivationFlowResult.licenseFailure);
                    break;
            }
        }
    }, [licenseUpdateTime, licenseStatus, hasActivationError, isCheckingLicenseStatus, account]);

    useEffect(() => {
        initialLicenseStatusRef.current = licenseUpdateTime;
    }, [licenseUpdateTime]);

    // Checking license status right now, show loader
    if (isCheckingLicenseStatus) {
        return (
            <CheckingLicenseStatusModal
                onClose={() => {
                    account.resetActivationFlowStatus();
                }}
            />
        );
    }

    // Has activation flow result. Display it
    if (activationResult) {
        return <ActivationFlowResultModal activationResult={activationResult} />;
    }

    return null;
}

export const ActivationFlowStatusController = observer(ActivationFlowStatusControllerComponent);
