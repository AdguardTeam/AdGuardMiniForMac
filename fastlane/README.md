fastlane documentation
----

# Installation

Make sure you have the latest version of the Xcode command line tools installed:

```sh
xcode-select --install
```

For _fastlane_ installation instructions, see [Installing _fastlane_](https://docs.fastlane.tools/#installing-fastlane)

# Available Actions

### update_third_party_deps

```sh
[bundle exec] fastlane update_third_party_deps
```

Update third party dependencies

Options:
- packages (optional): Comma-separated list of specific packages to update
- dry_run (optional): Run in dry-run mode to check for updates without applying them

Available packages:
- npm: assistant, safari-extension
- SPM: safariconverterlib

Note: Other SPM packages are updated manually, AdGuard Extra is downloaded during build

Examples:
fastlane update_third_party_deps
fastlane update_third_party_deps packages:assistant
fastlane update_third_party_deps packages:safariconverterlib
fastlane update_third_party_deps dry_run:true

### build_sciter_ui

```sh
[bundle exec] fastlane build_sciter_ui
```

Create sciter resources and UI

Options:

  - config: STRING If config is set to Debug, sciter resources will be built in `dev` configuration, otherwise `prod`. The default value is empty.

### update_proto_schema

```sh
[bundle exec] fastlane update_proto_schema
```

Update proto schema

----

This README.md is auto-generated and will be re-generated every time [_fastlane_](https://fastlane.tools) is run.

More information about _fastlane_ can be found on [fastlane.tools](https://fastlane.tools).

The documentation of _fastlane_ can be found on [docs.fastlane.tools](https://docs.fastlane.tools).
