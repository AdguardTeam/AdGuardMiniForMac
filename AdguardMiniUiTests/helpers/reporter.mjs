// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPORTS_DIR = join(__dirname, '..', 'reports');

/**
 * Custom node:test reporter that passes through spec output and generates
 * a self-contained HTML report at the end of the test run.
 *
 * @param {AsyncIterable<object>} source - node:test event stream.
 */
export default async function* reporter(source) {
    const results = [];
    const startTime = Date.now();
    let currentModule = 'unknown';

    for await (const event of source) {
        // Track current module from "Smoke tests: <module>" events
        // (emitted both by suite:start for the top-level describe,
        //  and by test:pass/test:fail for suite completion)
        const moduleMatch = event.data?.name?.match(/^Smoke tests: (\w+)$/);
        if (moduleMatch) currentModule = moduleMatch[1];

        if (event.type === 'test:pass' || event.type === 'test:fail') {
            const name = event.data.name;
            const isPass = event.type === 'test:pass';

            // Extract testId from leaf test name:
            //   "#settings-xxx is visible"  → settings-xxx
            //   "container #settings-xxx is visible" → settings-xxx
            //   "navigate to page" → navigate to page
            let testId = name;
            const elementMatch = name.match(/^#(\S+) is visible$/);
            const containerMatch = name.match(/^container #(\S+) is visible$/);
            if (elementMatch) {
                testId = elementMatch[1];
            } else if (containerMatch) {
                testId = containerMatch[1];
            }

            results.push({
                testId,
                module: currentModule,
                status: isPass ? 'PASS' : 'FAIL',
                error: event.data.details?.error?.message || null,
                duration: event.data.details?.duration_ms || 0,
            });
        }
    }

    const totalDuration = Date.now() - startTime;
    const passed = results.filter((r) => r.status === 'PASS').length;
    const failed = results.filter((r) => r.status === 'FAIL').length;

    mkdirSync(REPORTS_DIR, { recursive: true });
    const html = buildHtml(results, passed, failed, totalDuration);

    writeFileSync(join(REPORTS_DIR, 'report.html'), html, 'utf8');

    const ts = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
    writeFileSync(join(REPORTS_DIR, `report-${ts}.html`), html, 'utf8');
}

/**
 * Builds a self-contained HTML report page from smoke test results.
 *
 * Generates a summary with total/passed/failed/pass-rate/duration cards,
 * a per-module breakdown table, and a detailed results table with each
 * test ID, status, duration, and error message.
 *
 * The HTML uses no external resources — all styling is inline, making
 * the report viewable offline.
 *
 * @param {Array<{testId: string, module: string, status: string, error: string|null, duration: number}>} results - Test results array.
 * @param {number} passed - Number of passed tests.
 * @param {number} failed - Number of failed tests.
 * @param {number} durationMs - Total test run duration in milliseconds.
 * @returns {string} Self-contained HTML string.
 */
function buildHtml(results, passed, failed, durationMs) {
    const total = passed + failed;
    const pct = total > 0 ? Math.round((passed / total) * 100) : 0;
    const ts = new Date().toISOString();

    const byModule = {};
    for (const r of results) {
        if (!byModule[r.module]) byModule[r.module] = [];
        byModule[r.module].push(r);
    }

    const moduleRows = Object.entries(byModule).map(([mod, items]) => {
        const p = items.filter((i) => i.status === 'PASS').length;
        const f = items.filter((i) => i.status === 'FAIL').length;
        return `<tr><td>${mod}</td><td>${p + f}</td>`
            + `<td style="color:green">${p}</td><td style="color:red">${f}</td></tr>`;
    }).join('');

    const detailRows = results.map((r) => {
        const bg = r.status === 'FAIL' ? 'background:#ffe0e0' : '';
        return `<tr style="${bg}">`
            + `<td>${r.module}</td><td><code>#${r.testId}</code></td>`
            + `<td style="color:${r.status === 'PASS' ? 'green' : 'red'};font-weight:bold">${r.status}</td>`
            + `<td>${r.duration}ms</td>`
            + `<td style="color:red;font-size:0.85em">${r.error || ''}</td></tr>`;
    }).join('');

    return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8">
<title>AdGuard Mini E2E Smoke Test Report</title>
<style>
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;margin:2rem;color:#1a1a1a}
h1{font-size:1.5rem;margin-bottom:.25rem}
.timestamp{color:#666;font-size:.85rem;margin-bottom:1.5rem}
.summary{display:flex;gap:2rem;margin-bottom:2rem}
.summary-card{background:#f5f5f5;border-radius:8px;padding:1rem 1.5rem;text-align:center}
.summary-card .value{font-size:2rem;font-weight:bold}
.summary-card .label{font-size:.8rem;color:#666;text-transform:uppercase}
.pass .value{color:#2e7d32}.fail .value{color:#c62828}
table{border-collapse:collapse;width:100%;margin-bottom:2rem}
th,td{border:1px solid #e0e0e0;padding:.5rem .75rem;text-align:left;font-size:.9rem}
th{background:#f5f5f5;font-weight:600}
h2{font-size:1.2rem;margin-top:2rem;margin-bottom:.5rem}
code{background:#f0f0f0;padding:1px 4px;border-radius:3px;font-size:.85em}
</style></head><body>
<h1>AdGuard Mini &mdash; E2E Smoke Test Report</h1>
<p class="timestamp">${ts}</p>
<div class="summary">
<div class="summary-card"><div class="value">${total}</div><div class="label">Total</div></div>
<div class="summary-card pass"><div class="value">${passed}</div><div class="label">Passed</div></div>
<div class="summary-card fail"><div class="value">${failed}</div><div class="label">Failed</div></div>
<div class="summary-card"><div class="value">${pct}%</div><div class="label">Pass Rate</div></div>
<div class="summary-card"><div class="value">${(durationMs / 1000).toFixed(1)}s</div><div class="label">Duration</div></div>
</div>
<h2>By Module</h2>
<table><thead><tr><th>Module</th><th>Total</th><th>Passed</th><th>Failed</th></tr></thead>
<tbody>${moduleRows}</tbody></table>
<h2>All Results</h2>
<table><thead><tr><th>Module</th><th>Test ID</th><th>Status</th><th>Duration</th><th>Error</th></tr></thead>
<tbody>${detailRows}</tbody></table>
</body></html>`;
}
