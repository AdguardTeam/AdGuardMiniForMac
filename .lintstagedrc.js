module.exports = {
    "AdguardMini/ui/**/*.{ts,tsx}": ["yarn lint --quiet", () => "yarn test:node"],
    ".twosky.json": () => "yarn test:node"
};
