// swift-tools-version: 5.8
// The swift-tools-version declares the minimum version of Swift required to build this package.

// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import PackageDescription

let package = Package(
    name: "ProtoSchema",
    platforms: [
        // Aligned with the consuming Xcode project, which targets macOS 13+.
        // `AdguardMini/CommonConfig.xcconfig:27` is the single source of truth.
        // The `os.Logger` used by the WKWebView bridge needs no lower floor.
        .macOS(.v13)
    ],
    products: [
        .library(
            name: "ProtoSchema",
            targets: ["ProtoSchema"]),
    ],
    dependencies: [
        .package(url: "https://github.com/apple/swift-protobuf.git", exact: "1.31.0")
    ],
    targets: [
        .target(
            name: "ProtoSchema",
            dependencies: ["BaseProtoSchema"],
            path: "Initialisers"
        ),
        .target(
            name: "BaseProtoSchema",
            dependencies: [
                .product(name: "SwiftProtobuf", package: "swift-protobuf")
            ],
            path: "Sources"
        )
    ]
)
