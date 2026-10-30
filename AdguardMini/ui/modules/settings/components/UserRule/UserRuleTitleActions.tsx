// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { ContextMenu } from '../ContextMenu';

import s from './UserRule.module.pcss';

/**
 * Props of the user rule edit page heading actions.
 */
type UserRuleTitleActionsProps = {
    /** Whether the edited rule can be removed from the list. */
    canDelete: boolean;
    /** Removes the edited rule from the list. */
    onDelete(): void;
};

/**
 * Report-bug flag and the context actions of the user rule edit page heading.
 */
export function UserRuleTitleActions({ canDelete, onDelete }: UserRuleTitleActionsProps) {
    // One ContextMenu renders either the report flag or its actions, never both.
    if (!canDelete) {
        return <ContextMenu reportBug />;
    }

    return (
        <>
            <ContextMenu className={s.UserRule_reportBug} reportBug />
            <ContextMenu elements={[{ action: onDelete, text: translate('delete') }]} />
        </>
    );
}
