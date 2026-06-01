module.exports = {
    "AdguardMini/sciter-ui/**/*.{ts,tsx}": "yarn lint --quiet",
    ".twosky.json": () => "yarn test:node",
    "AdguardMini/sciter-ui/modules/common/lib/number/**/*.ts": () => "yarn test:node",
    "AdguardMini/sciter-ui/modules/common/stores/SafariExtensionsStore.ts": () => "yarn test:node",
    "AdguardMini/sciter-ui/modules/tray/components/CheckUpdates/**/*.ts": () => "yarn test:node",
    "AdguardMini/sciter-ui/modules/tray/modules/stories/utils/navigationBoundary.ts": () => "yarn test:node",
    "AdguardMini/sciter-ui/tests/**/*.test.ts": () => "yarn test:node",
    "AdguardMiniUiTests/tests/**/*.ts": () => "yarn lint",
};
