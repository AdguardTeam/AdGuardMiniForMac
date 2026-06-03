// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { useSearch } from '@adg/sciter-utils-kit';
import { observer } from 'mobx-react-lite';
import { useState, useEffect, useRef } from 'preact/hooks';

import { TDS_PARAMS, getTdsLink } from 'Common/utils/links';
import { useSettingsStore } from 'SettingsLib/hooks';
import { useOpenUserRulesWindow } from 'SettingsLib/hooks/useOpenUserRulesWindow';
import { RouteName, SettingsEvent } from 'SettingsStore/modules';
import theme from 'Theme';
import { Modal, Input, Pagination, Icon, Text, Button } from 'UILib';

import { SettingsItemSwitch } from '../SettingsItem';
import { SettingsTitle } from '../SettingsTitle';

import { RulesList, OpenedEditorPlug, ImportModal } from './components';
import { useImportExport } from './hooks/useImportExport';
import { useToggleHeader } from './hooks/useToggleHeader';
import s from './UserRules.module.pcss';

const PAGE_SIZE = 100;

/**
 * Restores scroll position after navigating back from the rule editor.
 */
const useScrollRestoration = (
    contentRef: { current: HTMLDivElement | null },
    savedScrollTop: number | undefined,
    resetScrollTop: () => void,
    isRuleEditorOpened: boolean,
    rulesLength: number,
    setIsScrolling: (v: boolean) => void,
) => {
    useEffect(() => {
        if (!savedScrollTop || isRuleEditorOpened || rulesLength === 0) {
            return;
        }
        const content = contentRef.current;
        if (!content) {
            return;
        }
        requestAnimationFrame(() => {
            const maxScrollTop = Math.max(0, content.scrollHeight - content.clientHeight);
            content.scrollTop = Math.min(Math.max(savedScrollTop, 0), maxScrollTop);
            resetScrollTop();
            setIsScrolling(true);
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [savedScrollTop, isRuleEditorOpened, rulesLength]);
};

/**
 * User rules page in settings module
 */
function UserRulesComponent() {
    const {
        userRules,
        ui,
        notification,
        router,
        settings,
        settings: { userActionLastDirectory },
        telemetry,
    } = useSettingsStore();

    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    const [page, setPage] = useState(1);
    const { userRules: { enabled }, rules, dontAskAgainImportModal } = userRules;

    const { openUserRulesWindow, isRuleEditorWindowOpened } = useOpenUserRulesWindow();
    const { onImportRules, onExportRules, onDeleteAll } = useImportExport({
        userRules, notification, settings, userActionLastDirectory,
    });

    const contentRef = useRef<HTMLDivElement>(null);
    const [isScrolling, setIsScrolling] = useToggleHeader(rules, isRuleEditorWindowOpened, contentRef);

    const navigateToUserRule = (index?: number) => {
        const savedScrollTop = contentRef.current?.scrollTop;
        if (typeof savedScrollTop === 'number') {
            ui.setUserRulesScrollTop(savedScrollTop);
        }
        router.changePath(typeof index === 'number' ? RouteName.user_rule : RouteName.user_rule, typeof index === 'number' ? { index } : undefined);
    };

    useEffect(() => {
        if (isRuleEditorWindowOpened) {
            setIsScrolling(false);
        }
    }, [isRuleEditorWindowOpened, setIsScrolling]);

    const { foundItems, searchQuery, updateSearchQuery } = useSearch(rules, ['rule']);

    const onSearch = (e: string) => {
        setIsScrolling(false);
        updateSearchQuery(e);
    };

    const rulesToRender = foundItems.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
    const showPagination = Math.ceil(foundItems.length / PAGE_SIZE) > 1;

    // Scroll position restoration
    useScrollRestoration(
        contentRef,
        ui.userRulesScrollTop,
        () => ui.resetUserRulesScrollTop(),
        isRuleEditorWindowOpened,
        rulesToRender.length,
        setIsScrolling,
    );

    const handleDeleteAll = () => {
        onDeleteAll();
        setShowDeleteModal(false);
    };

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
                    title={translate('menu.user.rules')}
                    maxTopPadding
                    reportBug
                >
                    {!isScrolling && (
                        <Button
                            className={s.UserRules_howTo}
                            type="text"
                            onClick={() => {
                                window.OpenLinkInBrowser(getTdsLink(TDS_PARAMS.filterrules, RouteName.user_rules));
                                telemetry.trackEvent(SettingsEvent.RuleSyntaxClick);
                            }}
                        >
                            <Text lineHeight="none" type="t1">{translate('user.rules.how.create.rule')}</Text>
                        </Button>
                    )}
                </SettingsTitle>
                {!isScrolling && (
                    <SettingsItemSwitch
                        className={s.UserRules_mainControl}
                        icon="custom_rule"
                        setValue={(e) => userRules.updateUserRulesEnabled(e)}
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
                    <div
                        className={cx(s.UserRules_addRule, isScrolling && s.UserRules_addRule__scroll)}
                        onClick={() => navigateToUserRule()}
                    >
                        <Icon className={s.UserRules_addRule_icon} icon="plus" />
                        <Text className={s.UserRules_addRule_text} type="t1">{translate('user.rules.create')}</Text>
                    </div>
                )}
            </div>
            {isScrolling && <div className={s.UserRules_shadow} />}
            {isRuleEditorWindowOpened && <OpenedEditorPlug onGoToEditor={openUserRulesWindow} />}
            {!isRuleEditorWindowOpened && (
                <>
                    {rulesToRender.length !== 0 && (
                        <div ref={contentRef} className={s.UserRules_scrollableContainer}>
                            <RulesList muted={!enabled} rulesList={rulesToRender} onEdit={navigateToUserRule} />
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
                    submitAction={handleDeleteAll}
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
