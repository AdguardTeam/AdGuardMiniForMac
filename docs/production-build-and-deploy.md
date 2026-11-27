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
| `pr-check.yml` | PR gate: lint, builds of both variants, XCTest, protoc |
| `build-mas-iap.yml` | Manual Developer ID-signed MAS build for IAP testing |
| `mirror.yml` | Mirrors master, `release/*` and tags to the public repo |

The `pr-check.yml` gate also runs the `proto-check` job: it compiles
the Protobuf schema with `protoc --fatal_warnings` at the version
pinned in `.protoc-version`, so a schema warning fails the run. The
job verifies the downloaded `protoc` archive against `.protoc-checksum`
before it runs.

The rest (`build-standalone.yml`, `build-mas.yml`, `build-variant.yml`,
`build-variant-config.yml`) are reusable building blocks called from
the workflows above; see their headers.

## Pipeline (deploy-app.yml)

tag → version metadata → build number (KV store; must grow
monotonically for Sparkle) → changelogs → build standalone + MAS with
the same version/build/channel (dSYMs to Sentry) → package (zip
rename + Sparkle EdDSA signature) → Sparkle appcast → publish to the
static storage (standalone) and TestFlight (MAS) → Slack
notifications (see [Slack Notifications](#slack-notifications)).

## Slack Notifications

A run sends up to three best-effort notifications, one per stage, and
only when that stage succeeds. A failed Slack post never fails the
release:

- **Build** — sent when the standalone artifact is finalized and the MAS
  build succeeds, before the deploy approval gates; the clause is
  "built and ready for testing".
- **Static** — sent when the standalone bundle is published to the
  static storage; the clause is "published to the static storage".
- **TestFlight** — sent when the MAS build is uploaded to TestFlight;
  the clause is "uploaded to TestFlight".

### Channel Derivation

The channel is derived from the tag:

- `patch == 0` (e.g. `v3.0.0`, `v3.0.0-beta.1`, `v3.1.0-nightly.5`) →
  `#proj-ag-<major>-<minor>-mini-mac`.
- `patch != 0` (e.g. `v3.0.1`) →
  `#proj-ag-<major>-<minor>-<patch>-mini-mac`.

The `slack-channel` input of **Tag & Deploy** (and of `deploy-app.yml`)
overrides the derived channel; leave it empty to derive it from the tag.
The name is composed by the local `.github/actions/derive-slack-channel`
action, shared by both workflows.

Before any build starts, the `check-slack-channel` preflight job verifies
that the bot can post to the resolved channel. A missing or inaccessible
channel fails the run before the build jobs start, and so does an
unreachable SlackKit service. In **Tag & Deploy** the check runs before
the tag is created, so a bad channel leaves no tag behind.

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
3. Standalone deployment uses per-channel static-storage environments and may
   require manual approval; the MAS TestFlight upload uses the fixed
   `autodeploy-testflight` environment without approval.
4. Standalone lands in the static storage, MAS in TestFlight; submit
   the MAS build for App Store review manually when ready.
