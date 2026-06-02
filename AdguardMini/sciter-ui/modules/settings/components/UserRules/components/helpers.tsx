// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import cx from 'classix';

import { Icon } from 'UILib';

import s from './Helpers.module.pcss';

import type { RulesBuilder } from '@adguard/rules-editor';
import type { IconType } from 'UILib';

/**
 * Return specific icon by rule type;
 */
export function getIconByType(type: ReturnType<typeof RulesBuilder.getRuleType>, className?: string, muted?: boolean) {
    let icon: IconType = 'comment';
    let iconClassName = s.comment;
    switch (type) {
        case 'block':
            icon = 'adblocking';
            iconClassName = s.block;
            break;
        case 'unblock':
            icon = 'link';
            iconClassName = s.unblock;
            break;
        case 'noFiltering':
            icon = 'thumbsup';
            iconClassName = s.unblock;
            break;
        case 'comment':
            icon = 'comment';
            iconClassName = s.comment;
            break;
        case 'custom':
        case null:
        default:
            icon = 'custom_filter';
            iconClassName = s.custom;
            break;
    }
    if (muted) {
        iconClassName = s.muted;
    }
    return <Icon className={cx(iconClassName, className)} icon={icon} />;
}

/**
 * Return specific icon by rule type;
 */
export function getDescriptionByType(type: ReturnType<typeof RulesBuilder.getRuleType>) {
    let text = translate('user.rule.custom');
    switch (type) {
        case 'block':
            text = translate('user.rule.block');
            break;
        case 'unblock':
            text = translate('user.rule.unblock');
            break;
        case 'noFiltering':
            text = translate('user.rule.noFiltering.tooltip');
            break;
        case 'comment':
            text = translate('user.rule.comment');
            break;
        case 'custom':
        case null:
        default:
            text = translate('user.rule.custom');
            break;
    }
    return text;
}
