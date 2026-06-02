// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { useCallback } from 'preact/hooks';

import { ShowInFinderRequest } from 'Apis/requests/InternalService';
import { getFormattedDateTime } from 'Common/utils/date';
import { selectFile } from 'Common/utils/selectFile';
import { getNotificationSomethingWentWrongText, provideContactSupportParam } from 'SettingsLib/utils/translate';
import { NotificationContext, NotificationsQueueIconType, NotificationsQueueType, NotificationsQueueVariant } from 'SettingsStore/modules';

import type { UserRules, NotificationsQueue, Settings } from 'SettingsStore/modules';

interface UseImportExportParams {
    userRules: UserRules;
    notification: NotificationsQueue;
    settings: Settings;
    userActionLastDirectory: string | undefined;
}

/**
 * Hook that provides import/export file handling for user rules.
 */
export function useImportExport({
    userRules, notification, settings, userActionLastDirectory,
}: UseImportExportParams) {
    const showInFinder = (path: string) => {
        window.API.Execute(new ShowInFinderRequest({ path }));
    };

    const onImportRules = useCallback(() => {
        try {
            const defaultPath = userActionLastDirectory ?? window.DocumentsPath;
            selectFile(false, '(*.txt)|*.txt', translate('import'), defaultPath, async (path: string) => {
                const pathParts = path.split('/');
                pathParts.pop();
                settings.updateUserActionLastDirectory(pathParts.join('/'));
                userRules.importUserRules(path);
                notification.notify({
                    message: translate('notification.user.rules.import'),
                    notificationContext: NotificationContext.info,
                    type: NotificationsQueueType.success,
                    iconType: NotificationsQueueIconType.done,
                    closeable: true,
                });
            });
        } catch (error) {
            log.error(String(error), 'onImportRules');
            notification.notify({
                message: translate('notification.user.rules.import.failed', provideContactSupportParam({
                    className: tx.color.linkGreen,
                })),
                notificationContext: NotificationContext.info,
                type: NotificationsQueueType.warning,
                iconType: NotificationsQueueIconType.error,
                closeable: true,
            });
        }
    }, [userRules, notification, settings, userActionLastDirectory]);

    const onExportRules = useCallback(() => {
        const defaultPath = userActionLastDirectory ?? window.DocumentsPath;
        selectFile(true, '(*.txt)|*.txt', translate('export'), `${defaultPath}/adguard_mini_user_rules_${getFormattedDateTime()}`, async (path: string) => {
            settings.updateUserActionLastDirectory(path);
            const error = await userRules.exportUserRules(path);
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
                    message: translate('notification.user.rules.export'),
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
    }, [userRules, notification, settings, userActionLastDirectory]);

    const onDeleteAll = useCallback(() => {
        const { rules: currentRules } = userRules.userRules;
        userRules.resetUserRules();
        notification.notify({
            message: translate('notification.user.rules.delete.all'),
            notificationContext: NotificationContext.info,
            type: NotificationsQueueType.success,
            iconType: NotificationsQueueIconType.done,
            undoAction: () => {
                userRules.updateRules(currentRules);
            },
            closeable: true,
        });
    }, [userRules, notification]);

    return { onImportRules, onExportRules, onDeleteAll };
}
