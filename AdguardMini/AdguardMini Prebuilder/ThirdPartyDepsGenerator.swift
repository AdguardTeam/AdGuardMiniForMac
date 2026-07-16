// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  ThirdPartyDepsGenerator.swift
//  AdguardMini Prebuilder
//

import Foundation
import AML

private enum Constants {
    static let spmMapping: [String: (caseName: String, displayName: String)] = [
        "sparkle": ("sparkle", "Sparkle"),
        "xmlcoder": ("xmlCoder", "XMLCoder"),
        "filterlistmanager": ("adguardFlm", "AdGuardFLM"),
        "mac.sp-sciter-sdk": ("sciter", "Sciter")
    ]
}

enum ThirdPartyDepsError: Error, LocalizedError {
    case cannotReadPackageResolved(path: String)
    case cannotDecodePackageResolved(path: String)
    case cannotReadAdGuardExtra(path: String)
    case cannotParseAdGuardExtraMetadata
    case missingEnvironmentVariable(String)

    var errorDescription: String? {
        switch self {
        case .cannotReadPackageResolved(let path):
            return "Cannot read Package.resolved at \(path)"
        case .cannotDecodePackageResolved(let path):
            return "Cannot decode Package.resolved at \(path)"
        case .cannotReadAdGuardExtra(let path):
            return "Cannot read adguard-extra.js at \(path)"
        case .cannotParseAdGuardExtraMetadata:
            return "Cannot parse AdGuard Extra metadata from script"
        case .missingEnvironmentVariable(let name):
            return "Missing required environment variable: \(name)"
        }
    }
}

struct PackageResolved: Decodable {
    let pins: [Pin]

    struct Pin: Decodable {
        let identity: String
        let state: State

        struct State: Decodable {
            let version: String?
            let branch: String?
            let revision: String?
        }
    }
}

struct DependencyInfo {
    let caseName: String
    let displayName: String
    let version: String
}

func generateThirdPartyDeps(
    preparedResourcesPath: String,
    outputPath: String
) -> Bool {
    do {
        var dependencies: [DependencyInfo] = []

        let spmDeps = try parseSPMDependencies()
        dependencies.append(contentsOf: spmDeps)

        do {
            let extraDep = try parseAdGuardExtra(preparedResourcesPath: preparedResourcesPath)
            dependencies.append(extraDep)
        } catch {
            LogError("AdGuard Extra not available")
            return false
        }

        dependencies.sort { $0.caseName < $1.caseName }
        let content = generateSwiftFile(dependencies: dependencies)
        try content.write(toFile: outputPath, atomically: true, encoding: .utf8)

        LogInfo("ThirdPartyDeps.swift generated with \(dependencies.count) dependencies")
        return true
    } catch {
        LogError("Failed to generate ThirdPartyDeps.swift: \(error.localizedDescription)")
        return false
    }
}

// MARK: - SPM Parsing

private func parseSPMDependencies() throws -> [DependencyInfo] {
    guard let packageResolvedPath = ProcessInfo.processInfo.environment["AGP_PACKAGE_RESOLVED_PATH"] else {
        throw ThirdPartyDepsError.missingEnvironmentVariable("AGP_PACKAGE_RESOLVED_PATH")
    }

    guard let data = FileManager.default.contents(atPath: packageResolvedPath) else {
        throw ThirdPartyDepsError.cannotReadPackageResolved(path: packageResolvedPath)
    }

    let decoder = JSONDecoder()
    guard let resolved = try? decoder.decode(PackageResolved.self, from: data) else {
        throw ThirdPartyDepsError.cannotDecodePackageResolved(path: packageResolvedPath)
    }

    var dependencies: [DependencyInfo] = []

    for pin in resolved.pins {
        guard let mapping = Constants.spmMapping[pin.identity] else {
            continue
        }

        let rawVersion = pin.state.version ?? pin.state.branch ?? pin.state.revision ?? "unknown"
        let cleanedVersion = cleanVersion(rawVersion)

        dependencies.append(DependencyInfo(
            caseName: mapping.caseName,
            displayName: mapping.displayName,
            version: cleanedVersion
        ))
    }

    return dependencies
}

private func cleanVersion(_ version: String) -> String {
    var cleaned = version

    if cleaned.hasPrefix("v") {
        cleaned = String(cleaned.dropFirst())
    }

    if let slashIndex = cleaned.firstIndex(of: "/") {
        cleaned = String(cleaned[cleaned.index(after: slashIndex)...])
    }

    if let atIndex = cleaned.firstIndex(of: "@") {
        cleaned = String(cleaned[..<atIndex])
    }

    return cleaned
}

// MARK: - AdGuard Extra Parsing

private func parseAdGuardExtra(preparedResourcesPath: String) throws -> DependencyInfo {
    let extraPath = "\(preparedResourcesPath)/adguard-extra.js"

    guard let script = try? String(contentsOfFile: extraPath, encoding: .utf8) else {
        throw ThirdPartyDepsError.cannotReadAdGuardExtra(path: extraPath)
    }

    let metadata: UserscriptMetadata
    do {
        metadata = try UserscriptParser.parseMetadata(from: script)
    } catch {
        throw ThirdPartyDepsError.cannotParseAdGuardExtraMetadata
    }

    return DependencyInfo(
        caseName: "adguardExtra",
        displayName: metadata.name,
        version: metadata.version
    )
}

// MARK: - Swift File Generation

private func generateSwiftFile(dependencies: [DependencyInfo]) -> String {
    let cases = dependencies.map { "    case \($0.caseName)" }.joined(separator: "\n")
    let switchCases = dependencies.map {
        """
                case .\($0.caseName):
                    return ("\($0.displayName)", "\($0.version)")
        """
    }
        .joined(separator: "\n")

    return """
        // ==========================================================================
        // AUTOGENERATED FILE
        // FILE IS CREATED EVERY BUILD PROCESS
        // CREATED BY AdguardMini Prebuilder
        // ==========================================================================

        // SPDX-FileCopyrightText: AdGuard Software Limited
        //
        // SPDX-License-Identifier: GPL-3.0-or-later

        import Foundation

        /// Third-party dependencies with their versions.
        enum ThirdPartyDeps: CaseIterable {
        \(cases)

            /// Returns name and version for the dependency.
            var dependency: (name: String, version: String) {
                switch self {
        \(switchCases)
                }
            }
        }

        """
}
