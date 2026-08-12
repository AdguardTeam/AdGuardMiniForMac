<!--
SPDX-FileCopyrightText: AdGuard Software Limited
SPDX-License-Identifier: GPL-3.0-or-later
-->

# Production Build And Deploy

Quick map of how AdGuard Mini production builds are created and
deployed. Implementation details live in the header and job comments
of the workflow files in `.github/workflows/`.

## TL;DR

- Entry point: the **Tag & Deploy** workflow (`tag-and-deploy.yml`),
  run manually with a semver tag. The prerelease suffix selects the
  channel: no suffix = release (`v2.5.0`), `-beta.N` / `-rc.N` = beta
  (`v2.6.0-beta.1`), `-nightly.N` = nightly.
- Every release builds two variants: standalone (Developer ID,
  notarized, Sparkle auto-updates) and MAS (App Store signing,
  TestFlight).
- Standalone ships to the static storage (the exact target is chosen
  by the deployer module), MAS to TestFlight / App Store.
- Pushing a semver tag also triggers the pipeline directly
  (`deploy-app.yml`).

## Workflow Map

| Workflow | Role |
| --- | --- |
| `tag-and-deploy.yml` | Release entry point: validate tag, create tag, deploy |
| `deploy-app.yml` | Production pipeline: build, sign, publish, notify |
| `pr-check.yml` | PR gate: lint, full builds of both variants, XCTest |
| `build-mas-iap.yml` | Manual Developer ID-signed MAS build for IAP testing |
| `mirror.yml` | Mirrors master, `release/*` and tags to the public repo |

The rest (`build-standalone.yml`, `build-mas.yml`, `build-variant.yml`,
`build-variant-config.yml`) are reusable building blocks called from
the workflows above; see their headers.

## Pipeline (deploy-app.yml)

tag → version metadata → build number (KV store; must grow
monotonically for Sparkle) → changelogs → build standalone + MAS with
the same version/build/channel (dSYMs to Sentry) → package (zip
rename + Sparkle EdDSA signature) → Sparkle appcast → publish to the
static storage (standalone) and TestFlight (MAS) → Slack.

## Build Variants

| Variant | Config | Signing | Notarize | Distribution |
| --- | --- | --- | --- | --- |
| `standalone` | Release | Developer ID | yes | direct download, Sparkle |
| `mas` | MAS | App Store | no | TestFlight / App Store |
| `mas-iap` | MAS | Developer ID | yes | IAP testing (manual runs only) |

Single source of truth for this table is `build-variant-config.yml`.

## How To Cut A Release

1. Make sure the branch you release from is green (PR Check).
2. GitHub → Actions → **Tag & Deploy** → Run workflow; pick the branch
   and set the tag (e.g. `v2.5.0`). Optionally pin `ref` to a specific
   SHA or branch — empty means the HEAD of the picked branch.
3. Deployment environments may require manual approval.
4. Standalone lands in the static storage, MAS in TestFlight; submit
   the MAS build for App Store review manually when ready.
