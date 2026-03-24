// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'preact/hooks';

import { Path } from 'Apis/types';
import { selectFile } from 'Common/utils/selectFile';
import { useSettingsStore } from 'SettingsLib/hooks';
import { getNotificationSettingsImportFailedText, getNotificationSomethingWentWrongText } from 'SettingsLib/utils/translate';
import { NotificationContext, NotificationsQueueIconType, NotificationsQueueType, NotificationsQueueVariant, SettingsEvent } from 'SettingsStore/modules';
import theme from 'Theme';
import { getFormattedDateTime } from 'Utils/date';

import { AdBlockingSection } from './AdBlockingSection';
import { AppSection } from './AppSection';
import { MiscSection } from './MiscSection';
import { SettingsHeader } from './SettingsHeader';
import { SettingsModals } from './SettingsModals';
import { UpdatesSection } from './UpdatesSection';

import type { ImportMode } from 'Apis/types';
import type { ModalProps } from 'Modules/common/components';

const SETTINGS_ARCHIVE_EXT = 'adguardminisettings';
const SETTINGS_ARCHIVE_FILTER = `(*.${SETTINGS_ARCHIVE_EXT})|*.${SETTINGS_ARCHIVE_EXT}`;
const LEGACY_SETTINGS_EXT = 'json';
const LEGACY_SETTINGS_FILTER = `(*.${LEGACY_SETTINGS_EXT})|*.${LEGACY_SETTINGS_EXT}`;

/**
 * Settings control component
 */
function SettingsControlComponent() {
    const {
        settings,
        filters: { filters: { filters: storeFilters } },
        telemetry,
        notification,
    } = useSettingsStore();

    const {
        settings: {
            launchOnStartup,
            showInMenuBar,
            hardwareAcceleration,
            debugLogging,
            allowTelemetry,
            quitReaction,
            theme: themeSetting,
        },
        userActionLastDirectory,
        incomeHardwareAcceleration,
        shouldGiveConsent,
    } = settings;

    const [showResetModal, setShowResetModal] = useState(false);
    const [showHardwareModal, setShowHardwareModal] = useState(false);
    const [showClearStatisticsModal, setShowClearStatisticsModal] = useState(false);
    const [hardwareModalLoader, setHardwareModalLoader] = useState(false);
    const [showTelemetryModal, setShowTelemetryModal] = useState(false);
    const [showConsentModal, setShowConsentModal] = useState<number[]>();

    useEffect(() => {
        if (shouldGiveConsent.length) {
            setShowConsentModal(shouldGiveConsent);
        } else {
            setShowConsentModal(undefined);
        }
    }, [shouldGiveConsent]);

    useEffect(() => {
        if (typeof incomeHardwareAcceleration === 'boolean') {
            setShowHardwareModal(true);
        }
    }, [incomeHardwareAcceleration]);

    const showInFinder = (path: string) => {
        window.API.internalService.ShowInFinder(new Path({ path }));
    };

    const onConsent = (mode: ImportMode) => {
        setShowConsentModal(undefined);
        settings.confirmImport(mode);
    };

    const onClearStatistics = () => {
        setShowClearStatisticsModal(false);
        settings.clearStatistics();
    };

    const onHardwareChange = () => {
        setShowHardwareModal(false);
        setHardwareModalLoader(true);
        if (typeof incomeHardwareAcceleration === 'boolean') {
            settings.restartAppToApplyHardwareAcceleration();
        } else {
            settings.updateHardwareAcceleration(!hardwareAcceleration);
        }
    };

    const onImport = () => {
        const defaultPath = userActionLastDirectory || window.DocumentsPath;
        try {
            selectFile(false, `${SETTINGS_ARCHIVE_FILTER}|${LEGACY_SETTINGS_FILTER}`, translate('import'), defaultPath, async (path: string) => {
                const pathParts = path.split('/');
                pathParts.pop();
                settings.updateUserActionLastDirectory(pathParts.join('/'));
                settings.importSettings(path);
            });
        } catch (error) {
            log.error(String(error), 'onImportRules');
            notification.notify({
                message: getNotificationSettingsImportFailedText(),
                notificationContext: NotificationContext.info,
                type: NotificationsQueueType.warning,
                iconType: NotificationsQueueIconType.error,
                closeable: true,
            });
        }
    };

    const onExport = async () => {
        const defaultPath = userActionLastDirectory || window.DocumentsPath;
        selectFile(true, `${SETTINGS_ARCHIVE_FILTER}`, translate('export'), `${defaultPath}/adguard_mini_${getFormattedDateTime()}`, async (path: string) => {
            settings.updateUserActionLastDirectory(path);
            const error = await settings.exportSettings(path);
            if (error.hasError) {
                notification.notify({
                    message: translate('notification.something.went.wrong'),
                    notificationContext: NotificationContext.info,
                    type: NotificationsQueueType.warning,
                    iconType: NotificationsQueueIconType.error,
                    closeable: true,
                });
            } else {
                notification.notify({
                    message: translate('notification.settings.export'),
                    notificationContext: NotificationContext.ctaButton,
                    type: NotificationsQueueType.success,
                    iconType: NotificationsQueueIconType.done,
                    closeable: true,
                    onClick: () => { showInFinder(path); },
                    btnLabel: translate('notification.open.in.finder'),
                    variant: NotificationsQueueVariant.textOnly,
                });
            }
        });
    };

    const onReset = () => {
        settings.resetSettings();
        notification.notify({
            message: translate('notification.settings.reset'),
            notificationContext: NotificationContext.info,
            type: NotificationsQueueType.success,
            iconType: NotificationsQueueIconType.done,
            closeable: true,
        });
        setShowResetModal(false);
        telemetry.trackEvent(SettingsEvent.ResetToDefaultClick);
    };

    const onExportLogs = () => {
        selectFile(true, '(*.zip)|*.zip', translate('export'), `${window.DocumentsPath}/adguard_mini_${getFormattedDateTime()}`, async (path: string) => {
            const error = await settings.exportLogs(path);
            if (error) {
                notification.notify({
                    message: getNotificationSomethingWentWrongText(),
                    notificationContext: NotificationContext.info,
                    type: NotificationsQueueType.warning,
                    iconType: NotificationsQueueIconType.error,
                    closeable: true,
                });
            } else {
                notification.notify({
                    message: translate('notification.settings.logs'),
                    notificationContext: NotificationContext.ctaButton,
                    type: NotificationsQueueType.success,
                    iconType: NotificationsQueueIconType.done,
                    closeable: true,
                    onClick: () => { showInFinder(path); },
                    btnLabel: translate('notification.open.in.finder'),
                    variant: NotificationsQueueVariant.textOnly,
                });
            }
        });
    };

    const hardwareAccModalProps: ModalProps = typeof incomeHardwareAcceleration === 'boolean' ? {
        title: translate('restart.app'),
        description: translate('restart.app.desc.import'),
        submitText: translate('restart'),
        canClose: false,
        submit: true,
        submitAction: onHardwareChange,
        submitClassName: theme.button.greenSubmit,
    } : {
        cancel: true,
        title: translate('restart.app'),
        description: translate('restart.app.desc'),
        submitText: translate('restart'),
        cancelText: !hardwareAcceleration ? translate('hardware.dont.enable') : translate('hardware.dont.disable'),
        onClose: () => setShowHardwareModal(false),
        submit: true,
        submitAction: onHardwareChange,
        submitClassName: theme.button.greenSubmit,
    };

    return (
        <>
            <SettingsHeader
                onClearStatistics={() => setShowClearStatisticsModal(true)}
                onExport={onExport}
                onImport={onImport}
                onToggleResetModal={() => setShowResetModal(!showResetModal)}
            />
            <AdBlockingSection />
            <UpdatesSection />
            <AppSection
                launchOnStartup={launchOnStartup}
                quitReaction={quitReaction}
                showInMenuBar={showInMenuBar}
                themeSetting={themeSetting}
                onLaunchOnStartup={(value) => settings.updateLaunchOnStartup(value)}
                onShowInMenuBar={(value) => settings.updateShowInMenuBar(value)}
            />
            <MiscSection
                allowTelemetry={allowTelemetry}
                debugLogging={debugLogging}
                onExportLogs={onExportLogs}
                onOpenTelemetryModal={() => setShowTelemetryModal(true)}
                onToggleAllowTelemetry={(value) => settings.updateAllowTelemetry(value)}
                onToggleDebugLogging={(value) => settings.updateDebugLogging(value)}
            />
            <div className={theme.layout.bottomPadding} />
            <SettingsModals
                filters={storeFilters}
                hardwareAccModalProps={hardwareAccModalProps}
                isClearStatisticsModalOpen={showClearStatisticsModal}
                isHardwareModalLoaderOpen={hardwareModalLoader}
                isHardwareModalOpen={showHardwareModal}
                isResetModalOpen={showResetModal}
                isTelemetryModalOpen={showTelemetryModal}
                resetModalDescription={translate('reset.defaults.all.desc')}
                showConsentModalFilterIds={showConsentModal}
                onClearStatistics={onClearStatistics}
                onCloseClearStatisticsModal={() => setShowClearStatisticsModal(false)}
                onCloseResetModal={() => setShowResetModal(false)}
                onCloseTelemetryModal={() => setShowTelemetryModal(false)}
                onConfirmConsent={onConsent}
                onResetSubmit={onReset}
            />
        </>
    );
}

export const SettingsControl = observer(SettingsControlComponent);
