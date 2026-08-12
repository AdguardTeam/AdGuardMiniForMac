# AdGuard Mini Private

Templates for the private configuration directory required to build AdGuard
Mini locally.

## Structure

The private directory (named `sciter-adguard-mini-private`) contains:

- `.env` — environment variables consumed by `configure.sh`:
    - `SWIFT_REGISTRY_URL` — URL of the private Swift package registry
    - `SUPPORT_SCRIPTS_GIT` — git URL of the `support-scripts` repository
    - `CONFIG_BACKEND_REQUEST_KEY` / `CONFIG_BACKEND_REQUEST_ENCRYPTION_KEY` —
      backend keys (optional; dummy values are used when empty)
- `configuration/PrivateConfig.xcconfig` — generated automatically by
  `configure.sh` from the backend keys above and included by
  `AdguardMini/CommonConfig.xcconfig`. You normally do not create this by hand.

## Development

1. Copy this template folder next to the main repository and rename it to
   `sciter-adguard-mini-private`, so the layout is:

    ```text
    - Base folder:
      - sciter-adguard-mini
      - sciter-adguard-mini-private
    ```

2. Copy `.env.template` to `.env` and fill in your values.

3. Run `./configure.sh dev` from the `sciter-adguard-mini` repository. It reads
   `.env` and generates `configuration/PrivateConfig.xcconfig` automatically.
