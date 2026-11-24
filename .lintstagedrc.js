module.exports = {
    "AdguardMini/ui/**/*.{ts,tsx}": ["yarn lint --quiet", () => "yarn test --silent"],
    "AdguardMini/ui/**/*.svg": "svgo --config svgo.config.mjs",
    ".twosky.json": () => "yarn test --silent"
};
