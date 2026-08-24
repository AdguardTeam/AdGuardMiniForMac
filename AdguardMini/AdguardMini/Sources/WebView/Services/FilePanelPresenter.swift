// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  FilePanelPresenter.swift
//  AdguardMini
//

import AppKit
import UniformTypeIdentifiers
import ProtoSchema

/// Interface for presenting native open/save panels.
protocol FilePanelPresenting {
    /// Presents the panel and returns selected path or `nil`.
    func present(params: SelectFileParams) -> String?
}

/// Production presenter for `NSOpenPanel` and `NSSavePanel`.
final class NSFilePanelPresenter: FilePanelPresenting {
    /// Converts comma-separated extensions to non-dynamic `UTType` values.
    static func contentTypes(from extensions: String) -> [UTType] {
        extensions
            .split(separator: ",")
            // Trim whitespace and strip a leading `.` so inputs like
            // "txt, zip" or ".txt" resolve instead of silently widening the
            // Allowed set (an empty filter accepts any file type).
            .map { $0.trimmingCharacters(in: .whitespaces) }
            .map { $0.hasPrefix(".") ? String($0.dropFirst()) : $0 }
            .compactMap { UTType(filenameExtension: $0) }
            .filter { !$0.isDynamic }
    }

    static var documentsDirectory: URL? {
        FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first
    }

    static func resolvedDirectory(from requested: String?) -> URL? {
        guard let requested, !requested.isEmpty, requested != "/" else {
            return Self.documentsDirectory
        }
        if Self.isExistingDirectory(at: requested) {
            return URL(fileURLWithPath: requested, isDirectory: true)
        }
        return Self.documentsDirectory
    }

    static func splitSavePath(_ initialPath: String) -> (directory: String, fileName: String) {
        let url = URL(fileURLWithPath: initialPath)
        let fileName = url.lastPathComponent
        if initialPath.hasSuffix("/") || fileName == "/" {
            return (url.path, "")
        }
        if !initialPath.contains("/") {
            // `URL(fileURLWithPath:)` resolves relative paths against the
            // Current working directory, which would leak into the panel.
            return ("", fileName)
        }
        return (url.deletingLastPathComponent().path, fileName)
    }

    /// Whether `path` is an existing directory on disk.
    private static func isExistingDirectory(at path: String) -> Bool {
        var isDirectory: ObjCBool = false
        return FileManager.default.fileExists(atPath: path, isDirectory: &isDirectory)
            && isDirectory.boolValue
    }

    func present(params: SelectFileParams) -> String? {
        if params.isSave {
            let panel = NSSavePanel()
            panel.title = params.title
            panel.allowedContentTypes = Self.contentTypes(from: params.allowedExtensions)
            if !params.initialPath.isEmpty {
                let (directory, fileName) = Self.splitSavePath(params.initialPath)
                panel.directoryURL = Self.resolvedDirectory(from: directory)
                if !fileName.isEmpty {
                    panel.nameFieldStringValue = fileName
                }
            }
            return panel.runModal() == .OK ? panel.url?.path : nil
        }

        let panel = NSOpenPanel()
        panel.title = params.title
        panel.canChooseFiles = true
        panel.canChooseDirectories = false
        panel.allowsMultipleSelection = false
        panel.allowedContentTypes = Self.contentTypes(from: params.allowedExtensions)
        if !params.initialPath.isEmpty {
            panel.directoryURL = Self.resolvedDirectory(from: params.initialPath)
        }
        return panel.runModal() == .OK ? panel.url?.path : nil
    }
}
