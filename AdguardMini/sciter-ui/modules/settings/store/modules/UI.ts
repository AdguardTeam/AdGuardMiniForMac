// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { makeAutoObservable } from 'mobx';

import type { Subject } from 'Modules/settings/components/SupportContact';
import type { VNode, ComponentChild } from 'preact';
import type { SettingsStore } from 'SettingsStore';

/**
 * Tooltip show data
 */
type TooltipData = {
    coords: Vec2;
    renderTooltip(): ComponentChild | VNode | string;
};

/**
 * Type for save intermediate data of inputed by user in SupportContact
 */
type SupportContactFormData = {
    message: string;
    addLogs: boolean;
    theme: Subject;
    email: string;
};

/**
 * Report problem label status, used to show report problem popup once open
 */
export enum ReportProblemVariant {
    NotShown = 'notShown',
    Show = 'show',
    Hidden = 'hidden',
}

/**
 * Store that manages UI settings
 */
export class UI {
    public rootStore: SettingsStore;

    public tooltipData: Nullable<TooltipData> = null;

    public supportContactFormData: Nullable<SupportContactFormData> = null;

    public userRulesScrollTop = 0;

    // Used in Safari protection page to show report problem button once open
    public reportProblemLabelStatus: ReportProblemVariant = ReportProblemVariant.NotShown;

    /**
     *
     */
    constructor(rootStore: SettingsStore) {
        this.rootStore = rootStore;
        makeAutoObservable(this, {
            rootStore: false,
        });
    }

    /**
     * Update tooltip position
     * @param data Nullable<TooltipData>
     */
    public updateTooltip(data: Nullable<TooltipData>) {
        this.tooltipData = data;
    }

    /**
     * Set user rules scroll top
     * @param value number
     */
    public setUserRulesScrollTop(value: number) {
        this.userRulesScrollTop = value;
    }

    /**
     * Reset user rules scroll top
     */
    public resetUserRulesScrollTop() {
        this.userRulesScrollTop = 0;
    }

    /**
     * Setter for supportContactFormData
     * @param data SupportContactFormData
     */
    public setSupportContactFormData(data: SupportContactFormData | null) {
        this.supportContactFormData = data;
    }

    /**
     * Updates reportProblemLabel to show only if it was NotShown
     */
    public tryShowProblemLabel() {
        if (this.reportProblemLabelStatus === ReportProblemVariant.NotShown) {
            this.reportProblemLabelStatus = ReportProblemVariant.Show;
        }
    }

    /**
     * Updates reportProblemLabel to hidden
     */
    public hideProblemLabel() {
        this.reportProblemLabelStatus = ReportProblemVariant.Hidden;
    }
}
