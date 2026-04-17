// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  WindowGeometryDTOTests.swift
//  AdguardMiniTests
//

import XCTest

final class WindowGeometryDTOTests: XCTestCase {
    func testCodableRoundTrip() throws {
        let original = WindowGeometryDTO(x: 50, y: 75, width: 600, height: 400, monitor: 1)
        let data = try JSONEncoder().encode(original)
        let decoded = try JSONDecoder().decode(WindowGeometryDTO.self, from: data)
        XCTAssertEqual(original, decoded)
    }

    func testDecodingWithCorruptedData() {
        let corruptedData = Data("not json".utf8)
        let decoded = try? JSONDecoder().decode(WindowGeometryDTO.self, from: corruptedData)
        XCTAssertNil(decoded)
    }

    func testDecodingWithMissingKeys() throws {
        let json = Data(#"{"x": 50, "y": 75}"#.utf8)
        let decoded = try? JSONDecoder().decode(WindowGeometryDTO.self, from: json)
        XCTAssertNil(decoded)
    }
}
