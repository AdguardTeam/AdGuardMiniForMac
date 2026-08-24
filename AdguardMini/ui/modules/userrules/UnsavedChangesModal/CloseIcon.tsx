// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import s from './UnsavedChangesModal.module.pcss';

type CloseIconProps = {
    onClick(): void;
};

/**
 * Close icon component (gray stroke, transparent background)
 */
export function CloseIcon({ onClick }: CloseIconProps) {
    return (
        <div
            className={s.UnsavedChangesModal_modal_close}
            onClick={onClick}
        >
            <svg fill="none" height="24" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg">
                <path d="M6.42857 6.42857L17.6043 17.6043" stroke="#A4A4A4" stroke-linecap="round" stroke-width="1.5" />
                <path d="M6.42773 17.5713L17.6035 6.39551" stroke="#A4A4A4" stroke-linecap="round" stroke-width="1.5" />
            </svg>
        </div>
    );
}
