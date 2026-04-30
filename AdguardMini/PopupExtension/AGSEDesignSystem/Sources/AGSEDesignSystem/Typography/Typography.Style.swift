// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  Typography.Style.swift
//  AGSEDesignSystem
//

import SwiftUI

// MARK: - Typography.Style

extension Typography {
    enum Style {
        case h4
        case t1CondensedRegular
        case t2CondensedRegular
        case t3
        case domain

        var typography: Typography {
            switch self {
            case .h4:
                return .init(fontStyle: .sfProBold, fontSize: 24)
            case .t1CondensedRegular:
                return .init(fontStyle: .sfPro, fontSize: 16)
            case .t2CondensedRegular:
                return .init(fontStyle: .sfPro, fontSize: 14)
            case .t3:
                return .init(fontStyle: .sfProDisplay, fontSize: 12)
            case .domain:
                return .init(fontStyle: .sfProDisplaySemibold, fontSize: 16)
            }
        }

        var font: Font { typography.font }
    }
}

// MARK: - TypographyStyle_Previews

struct TypographyStyle_Previews: PreviewProvider {
    static var previews: some View {
        VStack {
            Text("H4: Hello, Word!")
                .font(Typography.Style.h4.font)
            Spacer()
            Text("T1/Condensed/Regular: Hello, Word!")
                .font(Typography.Style.t1CondensedRegular.font)
            Spacer()
            Text("T2/Condensed/Regular: Hello, Word!")
                .font(Typography.Style.t2CondensedRegular.font)
            Spacer()
            Text("T3: Hello, Word!")
                .font(Typography.Style.t3.font)
            Spacer()
            Text("Domain: Hello, Word!")
                .font(Typography.Style.domain.font)
        }
        .padding(16)
    }
}
