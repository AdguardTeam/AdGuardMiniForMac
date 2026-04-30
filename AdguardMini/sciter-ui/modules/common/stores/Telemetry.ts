// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { RecordEventRequest } from 'Apis/requests/TelemetryService';
import { CustomTelemetryEvent, PageView } from 'Apis/types/Telemetry';

/**
 * Telemetry relay for tracking pages and events
 * Manages page context and tracks user interactions
 */
export class TelemetryRelay<Pages extends string, Events extends string> {
    /**
     * Current telemetry page
     */
    private currentPage: Pages | 'unknown';

    /**
     * Previous telemetry page
     */
    private previousPage: Pages | 'unknown' = 'unknown';

    /**
     * We pass initial page to track first page view
     */
    constructor(initialPage?: Pages | 'unknown') {
        this.currentPage = initialPage || 'unknown';
    }

    /**
     * Sets the current page for telemetry tracking
     * @param page The page to set as current
     */
    public setPage(page: Pages | 'unknown') {
        if (this.currentPage !== page) {
            this.previousPage = this.currentPage;
        }

        this.currentPage = page;
    }

    /**
     * Tracks a page view event
     */
    public trackPageView() {
        window.API.Execute(new RecordEventRequest({
            pageView: new PageView({
                name: this.currentPage as string,
                refName: this.previousPage as string,
            }),
        }));
    }

    /**
     * Tracks a custom event
     * @param eventName The name of the event to track
     */
    public trackEvent(eventName: Events) {
        window.API.Execute(new RecordEventRequest({
            customEvent: new CustomTelemetryEvent({
                name: eventName,
                refName: this.currentPage as string,
            }),
        }));
    }
}

/**
 * Generic telemetry class for tracking user interactions
 * Usage: new Telemetry<PagesStringEnum, EventStringEnum, LayersStringEnum>()
 */
export default class Telemetry<
    Pages extends string,
    Events extends string,
    Layers extends string,
> extends TelemetryRelay<Pages, Events> {
    /**
     * Relay for layered pages (ex.: modal dialogs, overlays)
     * Used to track interactions within layered UI components WHICH HAVE THEIR OWN PAGE
     */
    public readonly layersRelay: TelemetryRelay<Layers, Events> = new TelemetryRelay();
}
