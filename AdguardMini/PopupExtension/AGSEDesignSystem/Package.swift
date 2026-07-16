// swift-tools-version: 5.10
// The swift-tools-version declares the minimum version of Swift required to build this package.

import PackageDescription

let package = Package(
    name: "AGSEDesignSystem",
    platforms: [.macOS(.v12)],
    products: [
        .library(
            name: "AGSEDesignSystem",
            targets: ["AGSEDesignSystem"]
        )
    ],
    dependencies: [
        .package(url: "https://github.com/SimplyDanny/SwiftLintPlugins.git", .upToNextMinor(from: "0.62.0")),
        .package(id: "mac.sp-color-palette", exact: "2025.5.1")
    ],
    targets: [
        .target(
            name: "AGSEDesignSystem",
            dependencies: [.product(name: "ColorPalette", package: "mac.sp-color-palette")],
            path: "Sources",
            resources: [
                .copy("AGSEDesignSystem/Resources/Assets.xcassets")
            ],
            swiftSettings: [
                .unsafeFlags([
                    "-Xfrontend",
                    "-warn-long-function-bodies=50",
                    "-Xfrontend",
                    "-warn-long-expression-type-checking=50"
                ])
            ],
            plugins: [
                .plugin(name: "SwiftLintBuildToolPlugin", package: "SwiftLintPlugins")
            ]
        )
    ],
    swiftLanguageVersions: [.v5]
)
