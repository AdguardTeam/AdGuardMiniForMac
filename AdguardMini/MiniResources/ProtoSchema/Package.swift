// swift-tools-version: 5.8
// The swift-tools-version declares the minimum version of Swift required to build this package.

// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import PackageDescription

let package = Package(
    name: "ProtoSchema",
    platforms: [
        // Required for `os.Logger` (macOS 11+) used by the WKWebView bridge
        // dispatcher + the handcrafted `WebViewBridge` / `WebViewCallbackBridge`
        // base classes. The consuming Xcode project targets macOS 12+
        // (`AdguardMini/CommonConfig.xcconfig:27`).
        .macOS(.v11)
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
