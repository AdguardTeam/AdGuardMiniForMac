// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { getTdsLink, TDS_PARAMS } from 'Common/utils/links';
import theme from 'Theme';
import { ExternalLink, Modal, Text } from 'UILib';

import s from './ConsentModal.module.pcss';

import type { Filter } from 'Apis/types';

type ConsentModalProps = {
    filters: Filter[];
    onEnable(): void;
    onClose(): void;
    onPartial?(): void;
    title?: string;
    description?: string;
    cancelText?: string;
    testIdModal?: string;
    testIdEnableButton?: string;
    testIdCancelButton?: string;
};

/**
 * Consent modal
 */
export function ConsentModal({
    filters,
    onClose,
    onEnable,
    onPartial,
    title,
    description,
    cancelText,
    testIdModal,
    testIdEnableButton,
    testIdCancelButton,
}: ConsentModalProps) {
    return (
        <Modal
            testId={testIdModal}
            testIdSubmit={testIdEnableButton}
            testIdCancel={testIdCancelButton}
            cancel={!!onPartial}
            cancelAction={onPartial}
            cancelText={cancelText || translate('consent.modal.without.annoyance')}
            modalForceHeight={550}
            size="large"
            submitAction={onEnable}
            submitClassName={theme.button.greenSubmit}
            submitText={translate('enable')}
            title={title || translate('consent.modal.title')}
            submit
            onClose={onClose}
        >
            <div className={s.ConsentModal_content}>
                <Text className={s.ConsentModal_desc} type="t2">{description || translate('consent.modal.desc')}</Text>
                <div className={s.ConsentModal_enableFilters}><Text type="t2">{translate.plural('consent.modal.enable.filters', filters.length)}</Text></div>
                {filters.map((f) => (
                    <div key={f.id} className={s.ConsentModal_filter}>
                        <div className={s.ConsentModal_filterTitle}>
                            <Text type="t1">{f.title}</Text>
                            <Text className={s.ConsentModal_filterDesc} type="t2">{f.description}</Text>
                        </div>
                        <ExternalLink className={s.ConsentModal_link} href={f.homepage} icon="externalLink" />
                    </div>
                ))}
                <div className={s.ConsentModal_filtersPolicy}>
                    <Text type="t1">
                        {translate('consent.modal.enable.filter.policy', { link: (text: string) => (
                            <ExternalLink href={getTdsLink(TDS_PARAMS.filters_policy)} textType="t1">{text}</ExternalLink>
                        ) })}
                    </Text>
                </div>
            </div>
            <button
                id={testIdEnableButton}
                type="button"
                className={s.ConsentModal_enableButton}
            >
                {translate('enable')}
            </button>
            <button
                id={testIdCancelButton}
                type="button"
                className={s.ConsentModal_cancelButton}
            >
                {cancelText || translate('consent.modal.without.annoyance')}
            </button>
        </Modal>
    );
}
