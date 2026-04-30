// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { makeAutoObservable } from 'mobx';

import { GetActiveABTestsRequest } from 'Apis/requests/TelemetryService';
import { ActiveABTest, ABTestOption } from 'Apis/types';

type ABTestsMap = Map<ActiveABTest, ABTestOption>;

/**
 * A/B Tests store
 */
export class ABTests {
    private tests: ABTestsMap = new Map();

    /**
     * Constructor
     */
    public constructor() {
        makeAutoObservable(this, {}, { autoBind: true });
    }

    /**
     * Get the option for a specific A/B test
     */
    public getOption(test: ActiveABTest): ABTestOption | null {
        return this.tests.get(test) ?? null;
    }

    /**
     * Check if a specific A/B test is active
     */
    public hasTest(test: ActiveABTest): boolean {
        return this.tests.has(test);
    }

    /**
     * Check if a specific A/B test has a specific option
     */
    public isOption(test: ActiveABTest, option: ABTestOption): boolean {
        return this.getOption(test) === option;
    }

    /**
     * Load active A/B tests from the backend
     */
    public async loadActiveABTests() {
        const resp = await window.API.Execute(new GetActiveABTestsRequest());
        const next: ABTestsMap = new Map();

        const activeTests = Array.isArray(resp.activeTests) ? resp.activeTests : [];
        for (const t of activeTests) {
            if (t.name === ActiveABTest.unknown) {
                continue;
            }

            if (t.option === ABTestOption.unknown) {
                continue;
            }

            next.set(t.name, t.option);
        }

        this.tests = next;
    }
}
