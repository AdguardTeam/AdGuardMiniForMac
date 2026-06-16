// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  PopupViewController.swift
//  EntryExtension
//

import SafariServices
import SwiftUI

import AML

// MARK: - PopupViewControllerDelegate

protocol PopupViewControllerDelegate: AnyObject {
    func dismissPopover()
}

// MARK: - PopupViewController

class PopupViewController: SFSafariExtensionViewController, PopupViewControllerDelegate {
    private let mainView: PopupView
    private let viewState: PopupViewState

    // MARK: Init

    init(mainView: PopupView, viewState: PopupViewState) {
        self.mainView = mainView
        self.viewState = viewState

        super.init(nibName: nil, bundle: nil)
    }

    @available(*, unavailable)
    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    // MARK: Overrides

    override func loadView() {
        self.view = NSHostingView(rootView: self.mainView)
    }

    override func viewDidLayout() {
        super.viewDidLayout()
        // Keep the Safari popover tightly fitted to the SwiftUI content.
        // `NSHostingView.intrinsicContentSize` updates whenever the
        // SwiftUI view hierarchy changes (e.g. upsell shown/hidden).
        let fittingSize = self.view.intrinsicContentSize
        guard fittingSize.width > 0, fittingSize.height > 0 else { return }
        let rounded = CGSize(
            width: ceil(fittingSize.width),
            height: ceil(fittingSize.height)
        )
        guard self.preferredContentSize != rounded else { return }
        self.preferredContentSize = rounded
    }

    override func viewWillAppear() {
        super.viewWillAppear()
        self.viewState.popupWillShow()
    }

    override func viewDidAppear() {
        super.viewDidAppear()
        self.viewState.popupDidAppear()
    }
}
