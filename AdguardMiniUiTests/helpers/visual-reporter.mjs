// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * @fileoverview Self-contained HTML report generator for visual regression tests.
 *
 * Reads the actual, baseline, and diff PNGs from disk and embeds them as
 * base64 data URIs in a standalone HTML page. The report uses no external
 * resources — it works offline and can be shared as a single file.
 *
 * @module TestHelpers/VisualReporter
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
/** Output directory for generated reports. */
const REPORTS_DIR = resolve(__dirname, '..', 'reports');

/**
 * Reads a PNG file and returns a base64 data URI for embedding in HTML.
 *
 * @param {string} filePath - Absolute path to the PNG file.
 * @returns {string} Data URI string, or empty string if the file doesn't exist.
 */
function imageToDataUri(filePath) {
    if (!existsSync(filePath)) return '';
    const buf = readFileSync(filePath);
    const base64 = buf.toString('base64');
    return `data:image/png;base64,${base64}`;
}

/**
 * Generates a self-contained HTML visual regression report.
 *
 * Creates a timestamped HTML file in the reports/ directory with summary
 * cards (pass/fail/new/error counts) and a sortable table. Each row shows
 * the screenshot name, status, diff percentage, and duration. Clicking a
 * row reveals baseline, actual, and diff images side by side.
 *
 * @param {Array<Object>} results - Array of VisualTestResult objects.
 * @param {number} totalDurationMs - Total test run duration in milliseconds.
 * @returns {string} Path to the generated HTML report.
 */
export function generateVisualReport(results, totalDurationMs) {
    const passed = results.filter((r) => r.status === 'PASS').length;
    const failed = results.filter((r) => r.status === 'FAIL').length;
    const new_ = results.filter((r) => r.status === 'NEW').length;
    const errors = results.filter((r) => r.status === 'ERROR').length;
    const total = results.length;
    const pct = total > 0 ? Math.round((passed / total) * 100) : 0;

    const ts = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');

    const rows = results.map((r, i) => {
        const statusColor = r.status === 'PASS' ? 'green'
            : r.status === 'FAIL' ? 'red'
            : r.status === 'NEW' ? 'orange' : '#888';
        const pctStr = r.totalPixels > 0
            ? (r.diffPercent * 100).toFixed(2) + '%'
            : '—';

        const baselineUri = existsSync(r.baselinePath) ? imageToDataUri(r.baselinePath) : '';
        const actualUri = existsSync(r.actualPath) ? imageToDataUri(r.actualPath) : '';
        const diffUri = r.diffPath && existsSync(r.diffPath) ? imageToDataUri(r.diffPath) : '';

        return `<tr style="cursor:pointer" onclick="toggle(${i})">
            <td>${r.module}</td>
            <td><code>${r.screenshotName}</code></td>
            <td style="color:${statusColor};font-weight:bold">${r.status}</td>
            <td>${pctStr}</td>
            <td>${r.durationMs}ms</td>
        </tr>
        <tr id="detail-${i}" style="display:none">
            <td colspan="5" style="padding:1rem;background:#f9f9f9">
                <div style="display:flex;gap:1rem;flex-wrap:wrap">
                    ${baselineUri ? `<div><div style="font-weight:600;margin-bottom:4px">Baseline</div>
                        <img src="${baselineUri}" style="max-width:400px;border:1px solid #ddd;border-radius:4px"></div>` : ''}
                    ${actualUri ? `<div><div style="font-weight:600;margin-bottom:4px">Actual</div>
                        <img src="${actualUri}" style="max-width:400px;border:1px solid #ddd;border-radius:4px"></div>` : ''}
                    ${diffUri ? `<div><div style="font-weight:600;margin-bottom:4px">Diff</div>
                        <img src="${diffUri}" style="max-width:400px;border:1px solid #ddd;border-radius:4px"></div>` : ''}
                </div>
                ${r.error ? `<p style="color:red;margin-top:8px">${r.error}</p>` : ''}
            </td>
        </tr>`;
    }).join('');

    const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8">
<title>AdGuard Mini — Visual Regression Report</title>
<style>
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;margin:2rem;color:#1a1a1a}
h1{font-size:1.5rem;margin-bottom:.25rem}
.timestamp{color:#666;font-size:.85rem;margin-bottom:1.5rem}
.summary{display:flex;gap:2rem;margin-bottom:2rem;flex-wrap:wrap}
.summary-card{background:#f5f5f5;border-radius:8px;padding:1rem 1.5rem;text-align:center;min-width:80px}
.summary-card .value{font-size:2rem;font-weight:bold}
.summary-card .label{font-size:.8rem;color:#666;text-transform:uppercase}
.pass .value{color:#2e7d32}.fail .value{color:#c62828}.new .value{color:#e65100}.error .value{color:#555}
table{border-collapse:collapse;width:100%;margin-bottom:2rem}
th,td{border:1px solid #e0e0e0;padding:.5rem .75rem;text-align:left;font-size:.9rem}
th{background:#f5f5f5;font-weight:600}
code{background:#f0f0f0;padding:1px 4px;border-radius:3px;font-size:.85em}
</style>
<script>
function toggle(i){var d=document.getElementById('detail-'+i);d.style.display=d.style.display==='none'?'table-row':'none'}
</script>
</head><body>
<h1>AdGuard Mini — Visual Regression Report</h1>
<p class="timestamp">${new Date().toISOString()} &mdash; ${(totalDurationMs / 1000).toFixed(1)}s</p>
<div class="summary">
    <div class="summary-card pass"><div class="value">${passed}</div><div class="label">Passed</div></div>
    <div class="summary-card fail"><div class="value">${failed}</div><div class="label">Failed</div></div>
    <div class="summary-card new"><div class="value">${new_}</div><div class="label">New</div></div>
    <div class="summary-card error"><div class="value">${errors}</div><div class="label">Errors</div></div>
    <div class="summary-card"><div class="value">${pct}%</div><div class="label">Pass Rate</div></div>
    <div class="summary-card"><div class="value">${total}</div><div class="label">Total</div></div>
</div>
<table><thead><tr>
    <th>Module</th><th>Screenshot</th><th>Status</th><th>Diff %</th><th>Duration</th>
</tr></thead><tbody>
${rows}
</tbody></table>
<p style="color:#666;font-size:.8rem">Click any row to expand details.</p>
</body></html>`;

    mkdirSync(REPORTS_DIR, { recursive: true });
    const reportPath = resolve(REPORTS_DIR, `visual-report-${ts}.html`);
    writeFileSync(reportPath, html, 'utf8');
    console.log(`\n  Visual report: ${reportPath}`);
    return reportPath;
}
