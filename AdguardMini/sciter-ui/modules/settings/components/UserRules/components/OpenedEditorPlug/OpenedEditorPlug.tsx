// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import theme from 'Theme';
import { Button, Text } from 'UILib';

import s from './OpenedEditorPlug.module.pcss';

type OpenedEditorPlugProps = {
    onGoToEditor(): void;
};

/**
 * Plug that shown when editor is open
 */
export function OpenedEditorPlug({ onGoToEditor }: OpenedEditorPlugProps) {
    return (
        <div className={s.container}>
            <div className={s.wrapper}>
                <Text type="t1">{translate('user.rules.editor.plug.title')}</Text>
                <Text className={s.desc} type="t2">{translate('user.rules.editor.plug.desc')}</Text>
                <Button
                    className={cx(theme.button.greenSubmit, s.btn)}
                    testId="settings-user-rules-open-editor-plug-button"
                    type="submit"
                    onClick={onGoToEditor}
                >
                    <Text lineHeight="none" type="t1">{translate('user.rules.editor.plug.btn')}</Text>
                </Button>
            </div>
        </div>
    );
}
