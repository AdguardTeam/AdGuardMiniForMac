// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { ImportMode } from 'Apis/types';
import theme from 'Theme';
import { AppUsageDataModal, ConsentModal, Modal, Text } from 'UILib';

import s from '../Settings.module.pcss';

import type { Filter } from 'Apis/types';
import type { ModalProps } from 'UILib';

type Props = {
    filters: Filter[];
    hardwareAccModalProps: ModalProps;
    isHardwareModalLoaderOpen: boolean;
    isHardwareModalOpen: boolean;
    isResetModalOpen: boolean;
    isTelemetryModalOpen: boolean;
    isClearStatisticsModalOpen: boolean;
    resetModalDescription: string;
    showConsentModalFilterIds: number[] | undefined;
    onCloseResetModal(): void;
    onCloseTelemetryModal(): void;
    onCloseClearStatisticsModal(): void;
    onConfirmConsent(mode: ImportMode): void;
    onResetSubmit(): void;
    onClearStatistics(): void;
};

/**
 * Settings modals component
 */
export function SettingsModals(props: Props) {
    const {
        filters,
        hardwareAccModalProps,
        isHardwareModalLoaderOpen,
        isHardwareModalOpen,
        isResetModalOpen,
        isTelemetryModalOpen,
        isClearStatisticsModalOpen,
        onCloseResetModal,
        onCloseTelemetryModal,
        onCloseClearStatisticsModal,
        onConfirmConsent,
        onResetSubmit,
        onClearStatistics,
        resetModalDescription,
        showConsentModalFilterIds,
    } = props;

    return (
        <>
            {isResetModalOpen && (
                <Modal
                    childrenClassName={s.Settings_resetWarning}
                    description={resetModalDescription}
                    submitAction={onResetSubmit}
                    submitClassName={theme.button.redSubmit}
                    submitText={translate('reset')}
                    title={`${translate('reset.defaults')}?`}
                    cancel
                    submit
                    onClose={onCloseResetModal}
                >
                    <div className={theme.color.orange}>
                        <Text type="t1">{translate('reset.defaults.all.warning')}</Text>
                    </div>
                </Modal>
            )}
            {isHardwareModalOpen && (
                <Modal {...hardwareAccModalProps} />
            )}
            {isHardwareModalLoaderOpen && (
                <Modal
                    canClose={false}
                    loaderText={translate('applying.changes')}
                />
            )}
            {isClearStatisticsModalOpen && (
                <Modal
                    childrenClassName={s.Settings_resetWarning}
                    description={translate('clear.statistics.description')}
                    submitAction={onClearStatistics}
                    submitClassName={theme.button.redSubmit}
                    submitText={translate('clear')}
                    title={`${translate('clear.statistics.title')}?`}
                    cancel
                    submit
                    onClose={onCloseClearStatisticsModal}
                />
            )}
            {showConsentModalFilterIds && (
                <ConsentModal
                    filters={filters.filter((f) => showConsentModalFilterIds.includes(f.id))}
                    onClose={() => onConfirmConsent(ImportMode.withoutAnnoyance)}
                    onEnable={() => onConfirmConsent(ImportMode.full)}
                    onPartial={() => onConfirmConsent(ImportMode.withoutAnnoyance)}
                />
            )}
            {isTelemetryModalOpen && <AppUsageDataModal onClose={onCloseTelemetryModal} />}
        </>
    );
}
