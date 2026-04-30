// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { observer } from 'mobx-react-lite';
import { useState, useEffect } from 'preact/hooks';

import { CheckCustomFilterRequest } from 'Apis/requests/FiltersService';
import { selectFile } from 'Modules/common/utils/selectFile';
import { useSettingsStore } from 'Modules/settings/lib/hooks';
import { NotificationContext, NotificationsQueueIconType, NotificationsQueueType } from 'Modules/settings/store/modules';
import theme from 'Theme';
import { Modal, Input, Checkbox, Text, ExternalLink, Button, Loader } from 'UILib';

import s from './AddCustomFilterModal.module.pcss';
import { DEFAULT_FILTER_VERSION } from './constant';

import type { Filter } from 'Apis/types';

export type AddCustomFilterModalProps = {
    onClose(): void;
};

type AddCustomFilterError = Nullable<'checkCustomFilterError' | 'addCustomFilterError'>;

// Filterlists provide lists of filters, we will provide this info in Custom filter adding
const FILTERLISTS_URL = 'https://filterlists.com';

/**
 * Add/edit user custom filter modal;
 */
function AddCustomFilterModalComponent({
    onClose,
}: AddCustomFilterModalProps) {
    const { notification, filters } = useSettingsStore();
    const [url, setUrl] = useState(filters.customFiltersSubscribeURL || '');
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<AddCustomFilterError>(null);
    const [trusted, setTrusted] = useState(false);
    const [filterInfo, setFilterInfo] = useState<Filter>();
    /**
     * Handles submission of custom filter form
     * First validates URL and checks if filter exists
     * Then validates filter info and name
     * Finally adds custom filter if all validations pass
     * Shows error notifications if any step fails
     */
    const onSubmit = async () => {
        setLoading(true);
        if (!url) {
            return;
        }

        if (!filterInfo) {
            const resp = await window.API.Execute(new CheckCustomFilterRequest({ path: url }));

            if (resp.has_filter) {
                setFilterInfo(resp.filter);
                setName(resp.filter.title);
            } else {
                setError('checkCustomFilterError');
            }

            setLoading(false);
            filters.setCustomFiltersSubscribeURL('');
            return;
        }

        if (!name) {
            setLoading(false);
            setError('addCustomFilterError');
            filters.setCustomFiltersSubscribeURL('');
            return;
        }

        const addError = await filters.addCustomFilter(url, name, trusted);
        if (addError) {
            setLoading(false);
            setError('addCustomFilterError');
            filters.setCustomFiltersSubscribeURL('');
            return;
        }

        notification.notify({
            message: translate('notification.custom.filter.added', { name }),
            notificationContext: NotificationContext.info,
            type: NotificationsQueueType.success,
            iconType: NotificationsQueueIconType.done,
            closeable: true,
        });

        filters.setCustomFiltersSubscribeURL('');
        onClose();
    };

    /**
     * Opens file selection dialog to browse for custom filter file
     * Allows selecting .txt files from Documents folder
     * Sets selected file path as URL when file is chosen
     */
    const onBrowse = () => {
        selectFile(false, '(*.txt)|*.txt', translate('import'), window.DocumentsPath, async (path: string) => {
            setUrl(`file:///${path}`);
        });
    };

    const onTryAgain = () => {
        setError(null);
        setFilterInfo(undefined);
    };

    let description = !filterInfo
        ? translate('filters.more.filters.desc', {
            nav: (text: string) => (<ExternalLink href={FILTERLISTS_URL} textType="t1">{text}</ExternalLink>),
        })
        : undefined;

    if (error === 'addCustomFilterError') {
        description = translate('filters.add.custom.failed.desc');
    }

    useEffect(() => {
        if (filters.customFiltersSubscribeURL) {
            onSubmit();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filters.customFiltersSubscribeURL]);

    return (
        <Modal
            contentPadding={false}
            description={description}
            title={error === 'addCustomFilterError' ? translate('filters.add.custom.failed') : translate('filters.add.custom')}
            onClose={onClose}
        >
            <div className={s.AddCustomFilterModal_container}>
                {error === 'addCustomFilterError' && (
                    <Button
                        className={cx(s.AddCustomFilterModal_button, theme.button.greenSubmit)}
                        type="submit"
                        onClick={onTryAgain}
                    >
                        <Text lineHeight="none" type="t1">{translate('try.again')}</Text>
                    </Button>
                )}
                {!filterInfo && error !== 'addCustomFilterError' && (
                    <>
                        <div className={s.AddCustomFilterModal_input}>
                            <Input
                                key="input"
                                className={s.AddCustomFilterModal_input}
                                error={error === 'checkCustomFilterError'}
                                errorMessage={error === 'checkCustomFilterError' ? translate('custom.filter.check.failed') : undefined}
                                id="filters.url.or.path"
                                label={translate('filters.url.or.path')}
                                placeholder={translate('filters.add.custom.placeholder')}
                                value={url}
                                allowClear
                                onChange={(e) => {
                                    setUrl(e);
                                    setError(null);
                                }}
                                onClear={() => {
                                    setUrl('');
                                    setError(null);
                                }}
                            />
                        </div>
                        <Button
                            className={cx(s.AddCustomFilterModal_button, theme.button.greenSubmit)}
                            disabled={!url || loading}
                            type="submit"
                            onClick={onSubmit}
                        >
                            <div className={s.AddCustomFilterModal_buttonContent}>
                                <Text className={s.AddCustomFilterModal_buttonContent_text} lineHeight="none" type="t1">{translate('next')}</Text>
                                {loading && <Loader className={s.AddCustomFilterModal_buttonContent_loader} />}
                            </div>
                        </Button>
                        <Button
                            className={s.AddCustomFilterModal_button}
                            type="outlined"
                            onClick={onBrowse}
                        >
                            <Text lineHeight="none" type="t1">{translate('browse')}</Text>
                        </Button>
                    </>
                )}
                {filterInfo && !error && (
                    <>
                        <div className={s.AddCustomFilterModal_input}>
                            <Input
                                id="filters.edit.filter"
                                label={translate('filters.filter.name')}
                                placeholder={translate('filters.filter.name')}
                                value={name}
                                allowClear
                                onChange={(e) => {
                                    setName(e);
                                }}
                                onClear={() => {
                                    setName('');
                                }}
                            />
                        </div>
                        <div>
                            {filterInfo.description && (
                                <Text className={s.AddCustomFilterModal_filterDesc} type="t2">
                                    {translate('filters.custom.description')}
                                    {' '}
                                    <div className={s.AddCustomFilterModal_checkboxDesk}>{filterInfo.description}</div>
                                </Text>
                            )}
                            {filterInfo.homepage && (
                                <Text className={s.AddCustomFilterModal_filterDesc} type="t2">
                                    {translate('filters.custom.homepage')}
                                    {' '}
                                    <div className={s.AddCustomFilterModal_checkboxDesk}>{filterInfo.homepage}</div>
                                </Text>
                            )}
                            {filterInfo.version && filterInfo.version !== DEFAULT_FILTER_VERSION && (
                                <Text className={s.AddCustomFilterModal_filterDesc} type="t2">
                                    {translate('filters.custom.version')}
                                    {' '}
                                    <div className={s.AddCustomFilterModal_checkboxDesk}>{filterInfo.version}</div>
                                </Text>
                            )}
                        </div>
                        <Checkbox
                            checked={trusted}
                            className={s.AddCustomFilterModal_checkbox}
                            id="trusted"
                            onChange={(e) => setTrusted(e)}
                        >
                            <div>
                                <Text type="t1">{translate('filters.trusted.filter')}</Text>
                                <Text className={s.AddCustomFilterModal_checkbox_desk} type="t2">{translate('filters.trusted.filter.desc')}</Text>
                            </div>
                        </Checkbox>
                        <Button
                            className={cx(s.AddCustomFilterModal_button, theme.button.greenSubmit)}
                            disabled={!name || loading}
                            type="submit"
                            onClick={onSubmit}
                        >
                            <div className={s.AddCustomFilterModal_buttonContent}>
                                <Text className={s.AddCustomFilterModal_buttonContent_text} lineHeight="none" type="t1">{translate('add')}</Text>
                                {loading && <Loader className={s.AddCustomFilterModal_buttonContent_loader} />}
                            </div>
                        </Button>
                        <Button
                            className={s.AddCustomFilterModal_button}
                            type="outlined"
                            onClick={() => setFilterInfo(undefined)}
                        >
                            <Text lineHeight="none" type="t1">{translate('back')}</Text>
                        </Button>
                    </>
                )}
            </div>
        </Modal>
    );
}

export const AddCustomFilterModal = observer(AddCustomFilterModalComponent);
