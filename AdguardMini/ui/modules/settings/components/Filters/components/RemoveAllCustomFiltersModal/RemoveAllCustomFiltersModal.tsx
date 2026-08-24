// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import theme from 'Theme';
import { Modal, Text, Button } from 'UILib';

import s from './RemoveAllCustomFiltersModal.module.pcss';

export type RemoveAllCustomFiltersModalProps = {
    onClose(): void;
    onSubmit(): void;
};

/**
 * Remove all user custom filters modal
 */
export function RemoveAllCustomFiltersModal({
    onClose,
    onSubmit,
}: RemoveAllCustomFiltersModalProps) {
    return (
        <Modal
            description={translate('filters.remove.all.custom.filters.desc')}
            title={translate('filters.remove.all.custom.filters')}
            onClose={onClose}
        >
            <Button
                className={cx(s.RemoveAllCustomFiltersModal_button, theme.button.redSubmit)}
                type="submit"
                onClick={() => {
                    onSubmit();
                    onClose();
                }}
            >
                <div className={s.RemoveAllCustomFiltersModal_buttonContent}>
                    <Text className={s.RemoveAllCustomFiltersModal_buttonContent_text} lineHeight="none" type="t1">{translate('remove')}</Text>
                </div>
            </Button>
            <Button
                className={s.RemoveAllCustomFiltersModal_button}
                type="outlined"
                onClick={onClose}
            >
                <Text lineHeight="none" type="t1">{translate('cancel')}</Text>
            </Button>
        </Modal>
    );
}
