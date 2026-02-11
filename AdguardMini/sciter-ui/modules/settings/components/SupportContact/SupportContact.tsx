// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'preact/hooks';

import { SupportMessage } from 'Apis/types';
import { useSettingsStore } from 'SettingsLib/hooks';
import { RouteName } from 'SettingsStore/modules';
import th from 'Theme';
import { Layout, Text, Input, Textarea, Checkbox, Button, Modal, Select } from 'UILib';
import { isValidEmail } from 'Utils/email';

import { SettingsTitle } from '../SettingsTitle';

import s from './SupportContact.module.pcss';

import type { ContactSupportRouterParams } from 'SettingsStore/modules';
import type { IOption } from 'UILib';

// Subject of contact to support
export type Subject = 'report_bug' | 'suggest' | 'other';

/**
 * Contact support page of settings module
 */
function SupportContactComponent() {
    const { router, account: { license }, ui, ui: { supportContactFormData } } = useSettingsStore();

    const params = router.castParams<ContactSupportRouterParams>();

    const themes: IOption<Subject>[] = [
        { value: 'report_bug', label: translate('support.contact.theme.report.bug') },
        { value: 'suggest', label: translate('support.contact.theme.suggest.feature') },
        { value: 'other', label: translate('support.contact.theme.other') },
    ];

    const [message, setMessage] = useState(supportContactFormData?.message ?? '');
    const [addLogs, setAddLogs] = useState(supportContactFormData?.addLogs ?? true);
    const [emailError, setEmailError] = useState('');
    const [messageError, setMessageError] = useState('');

    let initialTheme = themes[0];
    if (supportContactFormData?.theme) {
        initialTheme = themes.find(({ value }) => value === supportContactFormData?.theme)!;
    }
    if (params?.subject) {
        initialTheme = themes.find(({ value }) => value === params.subject)!;
    }

    const [theme, setTheme] = useState(initialTheme);
    const [submitDisabled, setSubmitDisabled] = useState(false);
    const [showSuccessSubmitModal, setShowSuccessSubmitModal] = useState(false);
    const [showFailedSubmitModal, setShowFailedSubmitModal] = useState(false);

    const [email, setEmail] = useState(supportContactFormData?.email ?? (license.license?.applicationKeyOwner || ''));

    useEffect(() => {
        ui.setSupportContactFormData({
            message,
            email,
            // We don't add logs, when user suggest feature
            addLogs: theme.value === 'suggest' ? false : addLogs,
            theme: theme.value,
        });
    }, [message, addLogs, theme, email, ui]);

    const showAddLogsCheckbox = theme.value !== 'suggest';

    const getMessagePlaceholder = (currentTheme: Subject) => {
        switch (currentTheme) {
            case 'report_bug':
                return translate('support.contact.what.went.wrong');
            case 'suggest':
                return translate('support.contact.improve.app');
            case 'other':
                return translate('support.contact.enter.message');
        }
    };

    const validateForm = (): boolean => {
        let isValid = true;

        if (!email) {
            setEmailError(translate('support.contact.error.empty.email'));
            isValid = false;
        } else if (!isValidEmail(email)) {
            setEmailError(translate('support.contact.error.invalid.email'));
            isValid = false;
        }

        if (!message) {
            setMessageError(translate('support.contact.error.empty.message'));
            isValid = false;
        }

        return isValid;
    };

    const handleSubmit = async () => {
        if (!validateForm()) {
            return;
        }
        setSubmitDisabled(true);

        // We don't add logs, when user suggest feature
        const sendLogs = theme.value === 'suggest' ? false : addLogs;

        const { hasError } = await window.API.settingsService.SendFeedbackMessage(new SupportMessage({
            email,
            message,
            addLogs: sendLogs,
            theme: theme.label,
        }));

        setSubmitDisabled(false);
        if (hasError) {
            setShowFailedSubmitModal(true);
        } else {
            setShowSuccessSubmitModal(true);
            ui.setSupportContactFormData(null);
        }
    };

    return (
        <>
            <Layout navigation={{ route: RouteName.support, title: translate('menu.support'), router }} type="settingsPage">
                <SettingsTitle
                    description={translate('support.contact.support.desc')}
                    title={translate('support.contact.support')}
                />
                <div className={cx(s.SupportContact_content, tx.layout.content, th.layout.bottomPadding)}>
                    <Input
                        error={!!emailError}
                        errorMessage={emailError}
                        id="email"
                        label={translate('email')}
                        placeholder="example@email.com"
                        value={email}
                        allowClear
                        autoFocus
                        onChange={(e) => {
                            setEmailError('');
                            setEmail(e);
                        }}
                        onClear={() => setEmail('')}
                    />
                    <Select
                        className={s.SupportContact_input}
                        currentValue={theme.value}
                        id="type"
                        itemList={themes}
                        label={translate('theme')}
                        onChange={(opt) => setTheme(themes.find(({ value }) => value === opt)!)}
                    />
                    <Textarea
                        className={s.SupportContact_textarea}
                        error={!!messageError}
                        errorMessage={messageError}
                        id="message"
                        label={translate('message')}
                        placeholder={getMessagePlaceholder(theme.value)}
                        textAreaClassName={s.SupportContact_textarea_inner}
                        value={message}
                        onChange={(e) => {
                            setMessageError('');
                            setMessage(e);
                        }}
                    />
                    {showAddLogsCheckbox && (
                        <Checkbox
                            checked={addLogs}
                            className={s.SupportContact_input}
                            id="addLogs"
                            onChange={(e) => setAddLogs(e)}
                        >
                            <Text type="t1">{translate('support.contact.add.logs')}</Text>
                            <Text className={s.SupportContact_input_addLogsDesc} type="t2">{translate('support.contact.add.logs.desc')}</Text>
                        </Checkbox>
                    )}
                    <Button className={cx(th.button.greenSubmit, s.SupportContact_submit)} disabled={submitDisabled} type="submit" onClick={handleSubmit}>
                        <Text lineHeight="none" type="t1">
                            {translate('send')}
                        </Text>
                    </Button>
                </div>
            </Layout>
            {showSuccessSubmitModal && (
                <Modal
                    description={translate('support.contact.got.your.message.desc')}
                    submitAction={() => router.changePath(RouteName.support)}
                    submitClassName={th.button.greenSubmit}
                    submitText={translate('support.contact.got.your.message.submit.text')}
                    title={translate('support.contact.got.your.message.title')}
                    submit
                    onClose={() => setShowSuccessSubmitModal(false)}
                />
            )}
            {showFailedSubmitModal && (
                <Modal
                    description={translate('support.contact.failed.submit.desc', {
                        link: (text: string) => <a className={s.SupportContact_failedSubmitLink} href="mailto:support@adguard.com">{text}</a>,
                    })}
                    submitAction={() => setShowFailedSubmitModal(false)}
                    submitClassName={th.button.greenSubmit}
                    submitText={translate('support.contact.failed.submit.text')}
                    title={translate('support.contact.failed.submit.title')}
                    submit
                    onClose={() => setShowFailedSubmitModal(false)}
                />
            )}
        </>
    );
}

export const SupportContact = observer(SupportContactComponent);
