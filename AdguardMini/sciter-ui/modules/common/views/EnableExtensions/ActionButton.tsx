// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import theme from 'Theme';
import { Button, Text } from 'UILib';

import s from './ActionButton.module.pcss';

export type ActionButtonType = 'outlined' | 'submit' | 'text';

export type ActionButtonProps = {
    buttonType: ActionButtonType;
    label: string;
    action(): void;
    testId?: string;
};

/**
 * Action button for Template component
 */
export function ActionButton({ buttonType, label, action, testId }: ActionButtonProps) {
    switch (buttonType) {
        case 'outlined':
            return (
                <Button testId={testId} type="outlined" onClick={action}>
                    <Text lineHeight="none" type="t1">{label}</Text>
                </Button>
            );
        case 'submit':
            return (
                <Button testId={testId} className={theme.button.greenSubmit} type="submit" onClick={action}>
                    <Text lineHeight="none" type="t1">{label}</Text>
                </Button>
            );
        case 'text':
            return (
                <div className={s.ActionButton_textButtonContainer}>
                    <Button testId={testId} className={s.ActionButton_textButton} type="text" onClick={action}>
                        <Text lineHeight="none" type="t1" semibold>{label}</Text>
                    </Button>
                </div>
            );
    }
}
