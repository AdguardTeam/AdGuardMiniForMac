// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

class WhoImportedPlugin {
  apply(compiler) {
    compiler.hooks.compilation.tap("WhoImportedPlugin", (compilation) => {
      compilation.hooks.finishModules.tap("WhoImportedPlugin", (modules) => {
        for (const m of modules) {
          const resource = m.resource;
          if (!resource) continue;
          // Change this path to the module you want to track
          if (resource.includes("settings/store")) {
            const issuer = compilation.moduleGraph.getIssuer(m);
            console.log("MODULE:", resource);
            console.log("IMPORTED BY:", issuer && issuer.resource);
          }
        }
      });
    });
  }
}

module.exports = WhoImportedPlugin;
