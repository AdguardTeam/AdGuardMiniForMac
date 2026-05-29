// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { useState } from 'preact/hooks';

import theme from 'Theme';
import { Modal, Input, Checkbox, Text } from 'UILib';

import s from './EditCustomFilterModal.module.pcss';

import type { Filter } from 'Apis/types';
import type { ModalProps } from 'UILib';

export type EditCustomFilterModalProps = {
    filter: Filter;
    onFilterUpdate(filter_id: number, name: string, trusted: boolean): void;
    onClose(): void;
};

/**
 * Add/edit user custom filter modal;
 */
export function EditCustomFilterModal({
    filter,
    onFilterUpdate,
    onClose,
}: EditCustomFilterModalProps) {
    const [localFilter, setLocalFilter] = useState({
        id: filter.id,
        name: filter.title,
        trusted: filter.trusted,
    });

    const modalConfig: ModalProps = {
        title: translate('filters.edit.filter'),
        testId: 'settings-filters-edit-custom-modal',
        testIdSubmit: 'settings-filters-edit-custom-modal-submit',
        testIdCancel: 'settings-filters-edit-custom-modal-cancel',
        onClose,
        submit: true,
        submitText: translate('save'),
        submitAction: () => {
            onFilterUpdate(localFilter.id, localFilter.name, localFilter.trusted);
            onClose();
        },
        cancel: true,
        submitDisabled: !localFilter,
        submitClassName: theme.button.greenSubmit,
    };
    return (
        <Modal {...modalConfig}>
            <div className={s.EditCustomFilterModal_input}>
                <Input
                    key="input"
                    id="filters.edit.filter"
                    testId="settings-filters-edit-custom-modal-name"
                    label={translate('filters.filter.name')}
                    placeholder={translate('filters.filter.name')}
                    value={localFilter.name}
                    allowClear
                    autoFocus
                    onChange={(e) => setLocalFilter({ ...localFilter, name: e })}
                    onClear={() => setLocalFilter({ ...localFilter, name: '' })}
                />
            </div>
            <Checkbox
                checked={localFilter.trusted}
                className={s.EditCustomFilterModal_checkbox}
                id="trusted"
                onChange={(e) => setLocalFilter({ ...localFilter, trusted: e })}
            >
                <div>
                    <Text type="t1">{translate('filters.trusted.filter')}</Text>
                    <Text className={s.EditCustomFilterModal_checkbox_desk} type="t2">{translate('filters.trusted.filter.desc')}</Text>
                </div>
            </Checkbox>
        </Modal>
    );
}
