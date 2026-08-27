// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
    BoolValue,
    StringValue,
    EffectiveThemeValue,
    EffectiveTheme,
} from '../../modules/common/apis/types';
import { TrayCallbackServiceImpl } from '../../modules/tray/store/modules/TrayCallbackServiceImpl';
import { TrayRoute } from '../../modules/tray/store/modules/TrayRouter';
import { TrayPage } from '../../modules/tray/store/modules/TrayTelemetry';

/**
 * Behavioral tests for the tray's Swift→TS callback handlers
 * (`TrayCallbackServiceImpl`, reached via
 * `TrayCallbackServiceInternal` → `store.callbackService`).
 *
 * These verify what each of the 8 `TrayCallbackService` pushes actually does
 * to the tray store/UI state — the part the bootstrap tests (which only check
 * that `window.__dispatchCallback` reaches the service) do NOT cover.
 */

interface FakeSettings {
    getSettings: () => Promise<void>;
    getStatistics: () => Promise<void>;
    getSafariExtensions: () => Promise<void>;
    getTrayLicense: () => Promise<void>;
    checkApplicationVersion: () => void;
    getAdguardExtra: () => Promise<void>;
    getURLFilterState: () => Promise<void>;
    setLoginItem: (v: boolean) => void;
    setNewVersionAvailable: (v: boolean) => void;
    setFiltersStatus: (s: unknown) => void;
    updateSafariExtension: (u: unknown) => void;
    setLicense: (l: unknown) => void;
    setEffectiveTheme: (t: unknown) => void;
    setTrayWindowVisible: (v: boolean) => void;
    effectiveTheme: unknown;
    trayWindowVisible: boolean;
}

interface FakeRouter {
    currentPath: TrayRoute;
    changePath: (p: TrayRoute) => void;
}

interface FakeTelemetry {
    setPage: (p: string) => void;
    trackPageView: () => void;
}

interface FakeNotification {
    clearAll: () => void;
}

interface FakeFiltersData {
    getEnabledFilters: () => Promise<void>;
    getFilters: () => Promise<void>;
    getFiltersIndex: () => Promise<void>;
}

const makeFakes = () => {
    const settings: FakeSettings = {
        getSettings: () => Promise.resolve(),
        getStatistics: () => Promise.resolve(),
        getSafariExtensions: () => Promise.resolve(),
        getTrayLicense: () => Promise.resolve(),
        checkApplicationVersion: () => {},
        getAdguardExtra: () => Promise.resolve(),
        getURLFilterState: () => Promise.resolve(),
        setLoginItem: () => {},
        setNewVersionAvailable: () => {},
        setFiltersStatus: () => {},
        updateSafariExtension: () => {},
        setLicense: () => {},
        setEffectiveTheme: () => {},
        setTrayWindowVisible: (v) => {
            settings.trayWindowVisible = v;
        },
        effectiveTheme: null,
        trayWindowVisible: false,
    };
    const router: FakeRouter = {
        currentPath: TrayRoute.home,
        changePath: () => {},
    };
    const telemetry: FakeTelemetry = {
        setPage: () => {},
        trackPageView: () => {},
    };
    const notification: FakeNotification = {
        clearAll: () => {},
    };
    const filtersData: FakeFiltersData = {
        getEnabledFilters: () => Promise.resolve(),
        getFilters: () => Promise.resolve(),
        getFiltersIndex: () => Promise.resolve(),
    };
    const service = new TrayCallbackServiceImpl(
        settings as unknown as import('../../modules/tray/store/modules/Settings').SettingsStore,
        router as unknown as import('../../modules/tray/store/modules/TrayRouter').TrayRouterStore,
        telemetry as unknown as import('../../modules/tray/store/modules/TrayTelemetry').TrayTelemetry,
        notification as unknown as import('../../modules/common/stores/NotificationsQueue').NotificationsQueue,
        filtersData as unknown as import('../../modules/common/stores/FiltersData').FiltersData,
    );
    return { settings, router, telemetry, notification, filtersData, service };
};

test('OnTrayWindowVisibilityChange(true) runs the full recovery sequence', () => {
    const { settings, router, telemetry, notification, filtersData, service } = makeFakes();
    const spy = <T,>(obj: T, method: keyof T & string) => {
        let calls = 0;
        const original = obj[method];
        // Return the original method's result so Promise-returning methods
        // keep returning a thenable (the handler attaches `.catch` to them).
        (obj as unknown as Record<string, unknown>)[method] = (..._args: unknown[]) => {
            calls++;
            if (typeof original === 'function') {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                return (original as any).apply(obj, _args);
            }
            return undefined;
        };
        return { getCalls: () => calls };
    };

    const getSettings = spy(settings, 'getSettings');
    const getStatistics = spy(settings, 'getStatistics');
    const getSafariExtensions = spy(settings, 'getSafariExtensions');
    const getTrayLicense = spy(settings, 'getTrayLicense');
    const checkApplicationVersion = spy(settings, 'checkApplicationVersion');
    const getAdguardExtra = spy(settings, 'getAdguardExtra');
    const getURLFilterState = spy(settings, 'getURLFilterState');
    const getEnabledFilters = spy(filtersData, 'getEnabledFilters');
    const getFilters = spy(filtersData, 'getFilters');
    const getFiltersIndex = spy(filtersData, 'getFiltersIndex');
    const setPage = spy(telemetry, 'setPage');
    const trackPageView = spy(telemetry, 'trackPageView');
    const clearAll = spy(notification, 'clearAll');

    void service.OnTrayWindowVisibilityChange(new BoolValue({ value: true }));

    assert.equal(getSettings.getCalls(), 1);
    assert.equal(getStatistics.getCalls(), 1);
    assert.equal(getSafariExtensions.getCalls(), 1);
    assert.equal(getTrayLicense.getCalls(), 1);
    assert.equal(checkApplicationVersion.getCalls(), 1);
    assert.equal(getAdguardExtra.getCalls(), 1);
    assert.equal(getURLFilterState.getCalls(), 1);
    assert.equal(getEnabledFilters.getCalls(), 1);
    assert.equal(getFilters.getCalls(), 1);
    assert.equal(getFiltersIndex.getCalls(), 1);
    assert.equal(setPage.getCalls(), 1);
    assert.equal(trackPageView.getCalls(), 1);
    // Notifications are cleared only on hide.
    assert.equal(clearAll.getCalls(), 0);
    // Route is NOT reset on open.
    assert.equal(router.currentPath, TrayRoute.home);
    assert.equal(settings.trayWindowVisible, true);
});

test('OnTrayWindowVisibilityChange(false) clears notifications and resets the route', () => {
    const { settings, router, telemetry, notification, service } = makeFakes();
    let clearCalls = 0;
    let changePathCalls = 0;
    let setPageCalls = 0;
    notification.clearAll = () => { clearCalls++; };
    router.currentPath = TrayRoute.updates;
    router.changePath = () => { changePathCalls++; };
    telemetry.setPage = () => { setPageCalls++; };

    void service.OnTrayWindowVisibilityChange(new BoolValue({ value: false }));

    assert.equal(clearCalls, 1);
    assert.equal(setPageCalls, 1);
    assert.equal(changePathCalls, 1);
    assert.equal(settings.trayWindowVisible, false);
});

test('OnTrayWindowVisibilityChange(false) keeps the home route untouched', () => {
    const { settings, router, telemetry, notification, service } = makeFakes();
    let changePathCalls = 0;
    router.currentPath = TrayRoute.home;
    router.changePath = () => { changePathCalls++; };
    telemetry.setPage = () => {};

    void service.OnTrayWindowVisibilityChange(new BoolValue({ value: false }));

    assert.equal(changePathCalls, 0);
    assert.equal(settings.trayWindowVisible, false);
});

test('OnLoginItemStateChange forwards the value to setLoginItem', () => {
    const { settings, service } = makeFakes();
    const received: boolean[] = [];
    settings.setLoginItem = (v) => { received.push(v); };

    void service.OnLoginItemStateChange(new BoolValue({ value: true }));
    void service.OnLoginItemStateChange(new BoolValue({ value: false }));

    assert.deepEqual(received, [true, false]);
});

test('OnApplicationVersionStatusResolved forwards to setNewVersionAvailable', () => {
    const { settings, service } = makeFakes();
    const received: boolean[] = [];
    settings.setNewVersionAvailable = (v) => { received.push(v); };

    void service.OnApplicationVersionStatusResolved(new BoolValue({ value: true }));

    assert.deepEqual(received, [true]);
});

test('OnFilterStatusResolved stores the status and refreshes settings', () => {
    const { settings, service } = makeFakes();
    let statusCalls = 0;
    let getSettingsCalls = 0;
    settings.setFiltersStatus = () => { statusCalls++; };
    settings.getSettings = () => { getSettingsCalls++; return Promise.resolve(); };

    void service.OnFilterStatusResolved({} as never);

    assert.equal(statusCalls, 1);
    assert.equal(getSettingsCalls, 1);
});

test('OnSafariExtensionUpdate forwards to updateSafariExtension', () => {
    const { settings, service } = makeFakes();
    const received: unknown[] = [];
    settings.updateSafariExtension = (u) => { received.push(u); };
    const update = {} as never;

    void service.OnSafariExtensionUpdate(update);

    assert.deepEqual(received, [update]);
});

test('OnLicenseUpdate stores the license and refreshes adguard extra + URL filter', () => {
    const { settings, service } = makeFakes();
    const received: unknown[] = [];
    let adguardExtraCalls = 0;
    let urlFilterCalls = 0;
    settings.setLicense = (l) => { received.push(l); };
    settings.getAdguardExtra = () => { adguardExtraCalls++; return Promise.resolve(); };
    settings.getURLFilterState = () => { urlFilterCalls++; return Promise.resolve(); };
    const license = {} as never;

    void service.OnLicenseUpdate(license);

    assert.deepEqual(received, [license]);
    assert.equal(adguardExtraCalls, 1);
    assert.equal(urlFilterCalls, 1);
});

test('OnEffectiveThemeChanged forwards the theme to setEffectiveTheme', () => {
    const { settings, service } = makeFakes();
    const received: unknown[] = [];
    settings.setEffectiveTheme = (v) => { received.push(v); };

    void service.OnEffectiveThemeChanged(new EffectiveThemeValue({ value: EffectiveTheme.dark }));

    assert.deepEqual(received, [EffectiveTheme.dark]);
});

test('OnTrayPageRequested navigates for known routes only', () => {
    const { router, service } = makeFakes();
    const navigated: string[] = [];
    router.changePath = (p) => { navigated.push(p); };

    void service.OnTrayPageRequested(new StringValue({ value: TrayRoute.updates }));
    void service.OnTrayPageRequested(new StringValue({ value: TrayRoute.filters }));
    // Unknown page — must be ignored, not crash.
    void service.OnTrayPageRequested(new StringValue({ value: 'not-a-route' }));

    assert.deepEqual(navigated, [TrayRoute.updates, TrayRoute.filters]);
});
