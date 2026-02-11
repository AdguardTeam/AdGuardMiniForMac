// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { useSearch } from '@adg/sciter-utils-kit';
import { observer } from 'mobx-react-lite';
import { useState, useEffect, useRef } from 'preact/hooks';

import { Path } from 'Apis/types';
import { getFormattedDateTime } from 'Common/utils/date';
import { TDS_PARAMS, getTdsLink } from 'Common/utils/links';
import { selectFile } from 'Common/utils/selectFile';
import { useSettingsStore } from 'SettingsLib/hooks';
import { useOpenUserRulesWindow } from 'SettingsLib/hooks/useOpenUserRulesWindow';
import { getNotificationSomethingWentWrongText, provideContactSupportParam } from 'SettingsLib/utils/translate';
import { NotificationContext, NotificationsQueueIconType, NotificationsQueueType, NotificationsQueueVariant, RouteName, SettingsEvent } from 'SettingsStore/modules';
import theme from 'Theme';
import { Modal, Input, Pagination, Icon, Text, Button } from 'UILib';

import { SettingsItemSwitch } from '../SettingsItem';
import { SettingsTitle } from '../SettingsTitle';

import { RulesList, OpenedEditorPlug, ImportModal } from './components';
import { useToggleHeader } from './hooks/useToggleHeader';
import s from './UserRules.module.pcss';

/**
 * Elements count per page
 */
const PAGE_SIZE = 100;

/**
 * User rules page in settings module
 */
function UserRulesComponent() {
    const {
        userRules,
        notification,
        router,
        settings,
        settings: { userActionLastDirectory },
        telemetry
    } = useSettingsStore();

    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    const [page, setPage] = useState(1);
    const { userRules: { enabled }, rules, dontAskAgainImportModal } = userRules;

    const { openUserRulesWindow, isRuleEditorWindowOpened } = useOpenUserRulesWindow();

    const contentRef = useRef<HTMLDivElement>(null);
    const [isScrolling, setIsScrolling] = useToggleHeader(rules, isRuleEditorWindowOpened, contentRef);

    useEffect(() => {
        if (isRuleEditorWindowOpened) {
            setIsScrolling(false);
        }
    }, [isRuleEditorWindowOpened]);

    const showInFinder = (path: string) => {
        window.API.internalService.ShowInFinder(new Path({ path }));
    };

    const onImportRules = () => {
        try {
            const defaultPath = userActionLastDirectory || window.DocumentsPath;
            selectFile(false, '(*.txt)|*.txt', translate('import'), defaultPath, async (path: string) => {
                const pathParts = path.split('/');
                pathParts.pop();
                settings.updateUserActionLastDirectory(pathParts.join('/'));
                userRules.importUserRules(path);
                notification.notify({
                    message: translate('notification.user.rules.import'),
                    notificationContext: NotificationContext.info,
                    type: NotificationsQueueType.success,
                    iconType: NotificationsQueueIconType.done,
                    closeable: true,
                });
            });
        } catch (error) {
            log.error(String(error), 'onImportRules');
            notification.notify({
                message: translate('notification.user.rules.import.failed', provideContactSupportParam({
                    className: tx.color.linkGreen,
                })),
                notificationContext: NotificationContext.info,
                type: NotificationsQueueType.warning,
                iconType: NotificationsQueueIconType.error,
                closeable: true,
            });
        }
    };

    const onExportRules = () => {
        const defaultPath = userActionLastDirectory || window.DocumentsPath;
        selectFile(true, '(*.txt)|*.txt', translate('export'), `${defaultPath}/adguard_mini_user_rules_${getFormattedDateTime()}`, async (path: string) => {
            settings.updateUserActionLastDirectory(path);
            const error = await userRules.exportUserRules(path);
            if (error) {
                notification.notify({
                    message: getNotificationSomethingWentWrongText(),
                    notificationContext: NotificationContext.info,
                    type: NotificationsQueueType.warning,
                    iconType: NotificationsQueueIconType.error,
                    closeable: true,
                });
            } else {
                notification.notify({
                    message: translate('notification.user.rules.export'),
                    notificationContext: NotificationContext.ctaButton,
                    type: NotificationsQueueType.success,
                    iconType: NotificationsQueueIconType.done,
                    closeable: true,
                    onClick: () => { showInFinder(path); },
                    btnLabel: translate('notification.open.in.finder'),
                    variant: NotificationsQueueVariant.textOnly,
                });
            }
        });
    };

    const onDeleteAll = () => {
        const { rules: currentRules } = userRules.userRules;
        userRules.resetUserRules();
        setShowDeleteModal(false);
        notification.notify({
            message: translate('notification.user.rules.delete.all'),
            notificationContext: NotificationContext.info,
            type: NotificationsQueueType.success,
            iconType: NotificationsQueueIconType.done,
            undoAction: () => {
                userRules.updateRules(currentRules);
            },
            closeable: true,
        });
    };

    const {
        foundItems,
        searchQuery,
        updateSearchQuery,
    } = useSearch(rules, ['rule']);

    const onSearch = (e: string) => {
        setIsScrolling(false);
        updateSearchQuery(e);
    };

    const rulesToRender = foundItems.slice((page - 1) * PAGE_SIZE, (page * PAGE_SIZE));
    const showPagination = Math.ceil(foundItems.length / PAGE_SIZE) > 1;

    return (
        <div className={cx(s.UserRules, showPagination && s.UserRules__padding)}>
            <div>
                <SettingsTitle
                    description={isScrolling ? undefined : translate('user.rules.desc')}
                    elements={[{
                        text: translate('user.rules.open.rules.editor'),
                        action: () => openUserRulesWindow(),
                    }, {
                        text: translate('user.rules.export.rules'),
                        action: onExportRules,
                    }, {
                        text: translate('user.rules.import.rules'),
                        action: () => {
                            if (rulesToRender.length === 0 || dontAskAgainImportModal) {
                                onImportRules();
                            } else {
                                setShowImportModal(true);
                            }
                        },
                    }, {
                        text: translate('delete.all'),
                        action: () => setShowDeleteModal(!showDeleteModal),
                        className: theme.button.redText,
                    }]}
                    navigateContactSupport={{ subject: 'report_bug' }}
                    title={translate('menu.user.rules')}
                    maxTopPadding
                >
                    {!isScrolling && (
                        <Button
                            type="text"
                            className={s.UserRules_howTo}
                            onClick={() => {
                                window.OpenLinkInBrowser(getTdsLink(TDS_PARAMS.filterrules, RouteName.user_rules));
                                telemetry.trackEvent(SettingsEvent.RuleSyntaxClick);
                            }}
                        >
                            <Text lineHeight="none" type="t1">
                                {translate('user.rules.how.create.rule')}
                            </Text>
                        </Button>
                    )}
                </SettingsTitle>
                {!isScrolling && (
                    <SettingsItemSwitch
                        className={s.UserRules_mainControl}
                        icon="custom_rule"
                        setValue={(e) => {
                            userRules.updateUserRulesEnabled(e);
                        }}
                        title={translate('user.rules')}
                        value={enabled}
                    />
                )}
                <Input
                    className={cx(s.UserRules_search, isScrolling && s.UserRules_search__scroll)}
                    disabled={isRuleEditorWindowOpened}
                    id="search"
                    placeholder={translate('search')}
                    value={searchQuery}
                    allowClear
                    onChange={onSearch}
                />
                {!isRuleEditorWindowOpened && (
                    <div className={cx(s.UserRules_addRule, isScrolling && s.UserRules_addRule__scroll)} role="button" onClick={() => router.changePath(RouteName.user_rule)}>
                        <Icon className={s.UserRules_addRule_icon} icon="plus" />
                        <Text className={s.UserRules_addRule_text} type="t1">{translate('user.rules.create')}</Text>
                    </div>
                )}
            </div>
            {isScrolling && <div className={s.UserRules_shadow} />}
            {isRuleEditorWindowOpened && (<OpenedEditorPlug onGoToEditor={openUserRulesWindow} />)}
            {!isRuleEditorWindowOpened && (
                <>
                    {rulesToRender.length !== 0 && (
                        <div ref={contentRef} className={s.UserRules_scrollableContainer}>
                            <RulesList
                                muted={!enabled}
                                rulesList={rulesToRender}
                            />
                        </div>
                    )}
                    {rulesToRender.length === 0 && (
                        <div className={s.UserRules_emptyResult}>
                            <Icon className={s.UserRules_emptyResult_icon} icon={searchQuery ? 'noRulesFound' : 'noRules'} />
                            <div className={s.UserRules_emptyResult_text}>
                                <Text type="t2">{searchQuery ? translate('nothing.found') : translate('user.rules.no.rules')}</Text>
                            </div>
                        </div>
                    )}
                    {showPagination && (
                        <div className={s.UserRules_pagination}>
                            <div className={s.UserRules_pagination_shadowBottom} />
                            <div className={s.UserRules_pagination__bg}>
                                <Pagination
                                    className={s.UserRules_pagination_placement}
                                    currentPage={page}
                                    pageCount={Math.ceil(foundItems.length / PAGE_SIZE)}
                                    onChangePage={(e) => setPage(e)}
                                />
                            </div>
                        </div>
                    )}
                </>
            )}

            {showDeleteModal && (
                <Modal
                    description={translate('user.rules.delete.all.desc')}
                    submitAction={onDeleteAll}
                    submitClassName={theme.button.redSubmit}
                    submitText={translate('delete')}
                    title={`${translate('delete.all')}?`}
                    cancel
                    submit
                    onClose={() => setShowDeleteModal(false)}
                />
            )}
            {showImportModal && <ImportModal setShowImportModal={setShowImportModal} onImportRules={onImportRules} />}
        </div>
    );
}

export const UserRules = observer(UserRulesComponent);
