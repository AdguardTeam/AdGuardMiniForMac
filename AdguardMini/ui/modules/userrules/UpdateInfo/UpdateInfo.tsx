// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import s from './UpdateInfo.module.pcss';

type UpdateInfoProps = {
    onUpdate(): void;
    loading: boolean;
    hasUpdates: boolean;
    saved: boolean;
};

/**
 * Contains info about rules update
 */
export function UpdateInfo({ loading, hasUpdates, onUpdate, saved }: UpdateInfoProps) {
    let info;

    if (loading) {
        info = translate('user.rules.editor.update_info.applying_updates');
    } else if (hasUpdates) {
        info = (
            translate('user.rules.editor.update_info.has_updates', {
                btn: (text: string) => (
                    <span className={s.UpdateInfo_applyUpdates} onClick={onUpdate}>{text}</span>
                ),
            })
        );
    } else if (saved) {
        info = translate('user.rules.editor.update_info.saved');
    }

    if (!info) {
        return null;
    }

    return (
        <div className={cx(s.UpdateInfo, saved && s.UpdateInfo_saved)}>
            {info}
        </div>
    );
}
