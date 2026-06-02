// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { QuitReaction, Theme } from 'Apis/types';
import { createProvideContactSupportParam } from 'Common/utils/translate';
import { ContactSupportLink } from 'Modules/settings/components/ContactSupportLink';

/**
 * Translations for quit reactions
 * @param val - QuitReaction enum
 * @returns translated label
 */
export const quitReactionText = (val: QuitReaction) => {
    switch (val) {
        case QuitReaction.ask:
            return translate('settings.hardware.quit.reaction.ask');
        case QuitReaction.quit:
            return translate('settings.hardware.quit.reaction.quit');
        case QuitReaction.keepRunning:
            return translate('settings.hardware.quit.reaction.background');
    }
};

/**
 * Translations for themes
 * @param val - Theme enum
 * @returns translated label
 */
export const themeText = (val: Theme) => {
    switch (val) {
        case Theme.system:
            return translate('settings.theme.system');
        case Theme.light:
            return translate('settings.theme.light');
        case Theme.dark:
            return translate('settings.theme.dark');
    }
};

/**
 * Provides a contactSupport parameter for use with the translate lib's messages
 */
export const provideContactSupportParam = (
    createProvideContactSupportParam(ContactSupportLink)
);

/**
 * Provides a notification text for settings import failure
 */
export const getNotificationSettingsImportFailedText = () => {
    return translate('notification.settings.import.failed', provideContactSupportParam({
        className: tx.color.linkGreen,
    }));
};

/**
 * Provides a notification text for a general error
 */
export const getNotificationSomethingWentWrongText = () => {
    return translate('notification.something.went.wrong', provideContactSupportParam({
        className: tx.color.linkGreen,
    }));
};
