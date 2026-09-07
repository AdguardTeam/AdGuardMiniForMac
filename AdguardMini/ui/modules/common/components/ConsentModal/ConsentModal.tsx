// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { useId } from 'preact/hooks';

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
}: ConsentModalProps) {
    // Every text block here is its own tab stop, so the list can be read one
    // item at a time. Deliberately not `describedByChildren` like the other
    // text modals: the filter list is dynamic and long, and announcing all of
    // it in one breath on open would be unusable.
    const baseId = useId();

    return (
        <Modal
            cancel={!!onPartial}
            cancelAction={onPartial}
            cancelText={cancelText || translate('consent.modal.without.annoyance')}
            modalForceHeight={550}
            submitAction={onEnable}
            submitClassName={theme.button.greenSubmit}
            submitText={translate('enable')}
            title={title || translate('consent.modal.title')}
            submit
            onClose={onClose}
        >
            <div className={s.ConsentModal_content}>
                <Text className={s.ConsentModal_desc} tabIndex={0} type="t2">{description || translate('consent.modal.desc')}</Text>
                <div className={s.ConsentModal_enableFilters}>
                    <Text tabIndex={0} type="t2">{translate.plural('consent.modal.enable.filters', filters.length)}</Text>
                </div>
                {filters.map((f) => {
                    const titleId = `${baseId}-${f.id}-title`;
                    const descId = `${baseId}-${f.id}-desc`;

                    return (
                        <div key={f.id} className={s.ConsentModal_filter}>
                            <div className={s.ConsentModal_filterTitle}>
                                {/* One filter is one stop: its name and what it blocks together. */}
                                <Text
                                    ariaLabelledby={`${titleId} ${descId}`}
                                    id={titleId}
                                    tabIndex={0}
                                    type="t1"
                                >
                                    {f.title}
                                </Text>
                                <Text className={s.ConsentModal_filterDesc} id={descId} type="t2">{f.description}</Text>
                            </div>
                            <ExternalLink
                                ariaLabel={translate('filters.official.website')}
                                className={s.ConsentModal_link}
                                href={f.homepage}
                                icon="externalLink"
                            />
                        </div>
                    );
                })}
                <div className={s.ConsentModal_filtersPolicy}>
                    <Text tabIndex={0} type="t1">
                        {translate('consent.modal.enable.filter.policy', { link: (text: string) => (
                            <ExternalLink href={getTdsLink(TDS_PARAMS.filters_policy)} textType="t1">{text}</ExternalLink>
                        ) })}
                    </Text>
                </div>
            </div>
        </Modal>
    );
}
