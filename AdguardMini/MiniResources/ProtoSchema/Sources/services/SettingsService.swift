// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

/// This code was generated automatically by proto-parser tool version 1

import Foundation
// WKWebView-only service bridge.

// MARK: Protocol definition

/// Service that handles settings
/// YOU MUST IMPLEMENT THIS PROTOCOL USING CLASS WITH TYPE `SettingsService.ServiceType` IN SEPARATE SOURCE FILE
public protocol SettingsServiceProtocol
{
	/// Get Settings settings
	func getSettings (
						_ message: EmptyValue,
						_ promise: @escaping (Settings) -> Void) -> Void
	/// Update LaunchOnStartup setting
	func updateLaunchOnStartup (
						_ message: BoolValue,
						_ promise: @escaping (EmptyValue) -> Void) -> Void
	/// Update ShowInMenuBar setting
	func updateShowInMenuBar (
						_ message: BoolValue,
						_ promise: @escaping (EmptyValue) -> Void) -> Void
	/// Update HardwareAcceleration setting
	func updateHardwareAcceleration (
						_ message: BoolValue,
						_ promise: @escaping (EmptyValue) -> Void) -> Void
	/// Force restart on hardware acceleration import
	func forceRestartOnHardwareAccelerationImport (
						_ message: EmptyValue,
						_ promise: @escaping (EmptyValue) -> Void) -> Void
	/// Update DebugLogging setting
	func updateDebugLogging (
						_ message: BoolValue,
						_ promise: @escaping (EmptyValue) -> Void) -> Void
	/// Update quit reaction setting
	func updateQuitReaction (
						_ message: UpdateQuitReactionMessage,
						_ promise: @escaping (EmptyValue) -> Void) -> Void
	/// Update AutoFiltersUpdate setting
	func updateAutoFiltersUpdate (
						_ message: BoolValue,
						_ promise: @escaping (EmptyValue) -> Void) -> Void
	/// Export Settings settings
	func exportSettings (
						_ message: Path,
						_ promise: @escaping (OptionalError) -> Void) -> Void
	/// Import Settings settings
	func importSettings (
						_ message: Path,
						_ promise: @escaping (EmptyValue) -> Void) -> Void
	/// Confirm Settings import with consent
	func importSettingsConfirm (
						_ message: ImportSettingsConfirmation,
						_ promise: @escaping (EmptyValue) -> Void) -> Void
	/// Reset Settings to default settings
	func resetSettings (
						_ message: EmptyValue,
						_ promise: @escaping (Settings) -> Void) -> Void
	/// Get limit on the number of rules for content blockers
	func getContentBlockersRulesLimit (
						_ message: EmptyValue,
						_ promise: @escaping (Int32Value) -> Void) -> Void
	/// Export Logs archive
	func exportLogs (
						_ message: Path,
						_ promise: @escaping (OptionalError) -> Void) -> Void
	/// Send message to Support
	func sendFeedbackMessage (
						_ message: SupportMessage,
						_ promise: @escaping (OptionalError) -> Void) -> Void
	/// Get user action last directory
	func getUserActionLastDirectory (
						_ message: EmptyValue,
						_ promise: @escaping (StringValue) -> Void) -> Void
	/// Update user action last directory
	func updateUserActionLastDirectory (
						_ message: StringValue,
						_ promise: @escaping (EmptyValue) -> Void) -> Void
	/// Update theme setting
	func updateTheme (
						_ message: UpdateThemeMessage,
						_ promise: @escaping (EmptyValue) -> Void) -> Void
	/// Reset all statistics
	func resetStatistics (
						_ message: EmptyValue,
						_ promise: @escaping (EmptyValue) -> Void) -> Void
	/// Present the native open or save panel and return the picked path
	func selectFile (
						_ message: SelectFileParams,
						_ promise: @escaping (SelectFilePath) -> Void) -> Void
	/// Updates Safari toolbar badge visibility
	func updateShowSafariToolbarBadge (
						_ message: BoolValue,
						_ promise: @escaping (EmptyValue) -> Void) -> Void
	/// Get dismissed Safari Protection health check cards
	func getHealthCheckDismissedCards (
						_ message: EmptyValue,
						_ promise: @escaping (StringValueArray) -> Void) -> Void
	/// Update dismissed Safari Protection health check cards
	func updateHealthCheckDismissedCards (
						_ message: StringValueArray,
						_ promise: @escaping (EmptyValue) -> Void) -> Void
	/// Get dismissed Safari Protection promo cards
	func getPromoDismissedCards (
						_ message: EmptyValue,
						_ promise: @escaping (StringValueArray) -> Void) -> Void
	/// Update dismissed Safari Protection promo cards
	func updatePromoDismissedCards (
						_ message: StringValueArray,
						_ promise: @escaping (EmptyValue) -> Void) -> Void
}

// MARK: Protobuf Bridge definition
// Base class for `SettingsService.ServiceType`.

/// Service that handles settings
open class SettingsService: WebViewBridge
{
	public override var serviceName: String { "SettingsService" }
	public typealias ServiceType = SettingsService & Service & SettingsServiceProtocol

	/// WKWebView dispatch entry.
	public override func handleRequest(method: String, bytes: Data, promise: @escaping (Data) -> Void) {
		switch method {
		case "GetSettings":
			do {
				let input = try EmptyValue(serializedBytes: bytes)
				cast.getSettings(input) { result in
					do {
						promise(try result.serializedData())
					} catch {
						BridgeLog.error("SettingsService.GetSettings: failed to serialize reply: \(error)")
						promise(Data())
					}
				}
			} catch {
				BridgeLog.error("SettingsService.GetSettings: failed to deserialize request: \(error)")
				promise(Data())
			}
		case "UpdateLaunchOnStartup":
			do {
				let input = try BoolValue(serializedBytes: bytes)
				cast.updateLaunchOnStartup(input) { result in
					do {
						promise(try result.serializedData())
					} catch {
						BridgeLog.error("SettingsService.UpdateLaunchOnStartup: failed to serialize reply: \(error)")
						promise(Data())
					}
				}
			} catch {
				BridgeLog.error("SettingsService.UpdateLaunchOnStartup: failed to deserialize request: \(error)")
				promise(Data())
			}
		case "UpdateShowInMenuBar":
			do {
				let input = try BoolValue(serializedBytes: bytes)
				cast.updateShowInMenuBar(input) { result in
					do {
						promise(try result.serializedData())
					} catch {
						BridgeLog.error("SettingsService.UpdateShowInMenuBar: failed to serialize reply: \(error)")
						promise(Data())
					}
				}
			} catch {
				BridgeLog.error("SettingsService.UpdateShowInMenuBar: failed to deserialize request: \(error)")
				promise(Data())
			}
		case "UpdateHardwareAcceleration":
			do {
				let input = try BoolValue(serializedBytes: bytes)
				cast.updateHardwareAcceleration(input) { result in
					do {
						promise(try result.serializedData())
					} catch {
						BridgeLog.error("SettingsService.UpdateHardwareAcceleration: failed to serialize reply: \(error)")
						promise(Data())
					}
				}
			} catch {
				BridgeLog.error("SettingsService.UpdateHardwareAcceleration: failed to deserialize request: \(error)")
				promise(Data())
			}
		case "ForceRestartOnHardwareAccelerationImport":
			do {
				let input = try EmptyValue(serializedBytes: bytes)
				cast.forceRestartOnHardwareAccelerationImport(input) { result in
					do {
						promise(try result.serializedData())
					} catch {
						BridgeLog.error("SettingsService.ForceRestartOnHardwareAccelerationImport: failed to serialize reply: \(error)")
						promise(Data())
					}
				}
			} catch {
				BridgeLog.error("SettingsService.ForceRestartOnHardwareAccelerationImport: failed to deserialize request: \(error)")
				promise(Data())
			}
		case "UpdateDebugLogging":
			do {
				let input = try BoolValue(serializedBytes: bytes)
				cast.updateDebugLogging(input) { result in
					do {
						promise(try result.serializedData())
					} catch {
						BridgeLog.error("SettingsService.UpdateDebugLogging: failed to serialize reply: \(error)")
						promise(Data())
					}
				}
			} catch {
				BridgeLog.error("SettingsService.UpdateDebugLogging: failed to deserialize request: \(error)")
				promise(Data())
			}
		case "UpdateQuitReaction":
			do {
				let input = try UpdateQuitReactionMessage(serializedBytes: bytes)
				cast.updateQuitReaction(input) { result in
					do {
						promise(try result.serializedData())
					} catch {
						BridgeLog.error("SettingsService.UpdateQuitReaction: failed to serialize reply: \(error)")
						promise(Data())
					}
				}
			} catch {
				BridgeLog.error("SettingsService.UpdateQuitReaction: failed to deserialize request: \(error)")
				promise(Data())
			}
		case "UpdateAutoFiltersUpdate":
			do {
				let input = try BoolValue(serializedBytes: bytes)
				cast.updateAutoFiltersUpdate(input) { result in
					do {
						promise(try result.serializedData())
					} catch {
						BridgeLog.error("SettingsService.UpdateAutoFiltersUpdate: failed to serialize reply: \(error)")
						promise(Data())
					}
				}
			} catch {
				BridgeLog.error("SettingsService.UpdateAutoFiltersUpdate: failed to deserialize request: \(error)")
				promise(Data())
			}
		case "ExportSettings":
			do {
				let input = try Path(serializedBytes: bytes)
				cast.exportSettings(input) { result in
					do {
						promise(try result.serializedData())
					} catch {
						BridgeLog.error("SettingsService.ExportSettings: failed to serialize reply: \(error)")
						promise(Data())
					}
				}
			} catch {
				BridgeLog.error("SettingsService.ExportSettings: failed to deserialize request: \(error)")
				promise(Data())
			}
		case "ImportSettings":
			do {
				let input = try Path(serializedBytes: bytes)
				cast.importSettings(input) { result in
					do {
						promise(try result.serializedData())
					} catch {
						BridgeLog.error("SettingsService.ImportSettings: failed to serialize reply: \(error)")
						promise(Data())
					}
				}
			} catch {
				BridgeLog.error("SettingsService.ImportSettings: failed to deserialize request: \(error)")
				promise(Data())
			}
		case "ImportSettingsConfirm":
			do {
				let input = try ImportSettingsConfirmation(serializedBytes: bytes)
				cast.importSettingsConfirm(input) { result in
					do {
						promise(try result.serializedData())
					} catch {
						BridgeLog.error("SettingsService.ImportSettingsConfirm: failed to serialize reply: \(error)")
						promise(Data())
					}
				}
			} catch {
				BridgeLog.error("SettingsService.ImportSettingsConfirm: failed to deserialize request: \(error)")
				promise(Data())
			}
		case "ResetSettings":
			do {
				let input = try EmptyValue(serializedBytes: bytes)
				cast.resetSettings(input) { result in
					do {
						promise(try result.serializedData())
					} catch {
						BridgeLog.error("SettingsService.ResetSettings: failed to serialize reply: \(error)")
						promise(Data())
					}
				}
			} catch {
				BridgeLog.error("SettingsService.ResetSettings: failed to deserialize request: \(error)")
				promise(Data())
			}
		case "GetContentBlockersRulesLimit":
			do {
				let input = try EmptyValue(serializedBytes: bytes)
				cast.getContentBlockersRulesLimit(input) { result in
					do {
						promise(try result.serializedData())
					} catch {
						BridgeLog.error("SettingsService.GetContentBlockersRulesLimit: failed to serialize reply: \(error)")
						promise(Data())
					}
				}
			} catch {
				BridgeLog.error("SettingsService.GetContentBlockersRulesLimit: failed to deserialize request: \(error)")
				promise(Data())
			}
		case "ExportLogs":
			do {
				let input = try Path(serializedBytes: bytes)
				cast.exportLogs(input) { result in
					do {
						promise(try result.serializedData())
					} catch {
						BridgeLog.error("SettingsService.ExportLogs: failed to serialize reply: \(error)")
						promise(Data())
					}
				}
			} catch {
				BridgeLog.error("SettingsService.ExportLogs: failed to deserialize request: \(error)")
				promise(Data())
			}
		case "SendFeedbackMessage":
			do {
				let input = try SupportMessage(serializedBytes: bytes)
				cast.sendFeedbackMessage(input) { result in
					do {
						promise(try result.serializedData())
					} catch {
						BridgeLog.error("SettingsService.SendFeedbackMessage: failed to serialize reply: \(error)")
						promise(Data())
					}
				}
			} catch {
				BridgeLog.error("SettingsService.SendFeedbackMessage: failed to deserialize request: \(error)")
				promise(Data())
			}
		case "GetUserActionLastDirectory":
			do {
				let input = try EmptyValue(serializedBytes: bytes)
				cast.getUserActionLastDirectory(input) { result in
					do {
						promise(try result.serializedData())
					} catch {
						BridgeLog.error("SettingsService.GetUserActionLastDirectory: failed to serialize reply: \(error)")
						promise(Data())
					}
				}
			} catch {
				BridgeLog.error("SettingsService.GetUserActionLastDirectory: failed to deserialize request: \(error)")
				promise(Data())
			}
		case "UpdateUserActionLastDirectory":
			do {
				let input = try StringValue(serializedBytes: bytes)
				cast.updateUserActionLastDirectory(input) { result in
					do {
						promise(try result.serializedData())
					} catch {
						BridgeLog.error("SettingsService.UpdateUserActionLastDirectory: failed to serialize reply: \(error)")
						promise(Data())
					}
				}
			} catch {
				BridgeLog.error("SettingsService.UpdateUserActionLastDirectory: failed to deserialize request: \(error)")
				promise(Data())
			}
		case "UpdateTheme":
			do {
				let input = try UpdateThemeMessage(serializedBytes: bytes)
				cast.updateTheme(input) { result in
					do {
						promise(try result.serializedData())
					} catch {
						BridgeLog.error("SettingsService.UpdateTheme: failed to serialize reply: \(error)")
						promise(Data())
					}
				}
			} catch {
				BridgeLog.error("SettingsService.UpdateTheme: failed to deserialize request: \(error)")
				promise(Data())
			}
		case "ResetStatistics":
			do {
				let input = try EmptyValue(serializedBytes: bytes)
				cast.resetStatistics(input) { result in
					do {
						promise(try result.serializedData())
					} catch {
						BridgeLog.error("SettingsService.ResetStatistics: failed to serialize reply: \(error)")
						promise(Data())
					}
				}
			} catch {
				BridgeLog.error("SettingsService.ResetStatistics: failed to deserialize request: \(error)")
				promise(Data())
			}
		case "SelectFile":
			do {
				let input = try SelectFileParams(serializedBytes: bytes)
				cast.selectFile(input) { result in
					do {
						promise(try result.serializedData())
					} catch {
						BridgeLog.error("SettingsService.SelectFile: failed to serialize reply: \(error)")
						promise(Data())
					}
				}
			} catch {
				BridgeLog.error("SettingsService.SelectFile: failed to deserialize request: \(error)")
				promise(Data())
			}
		case "UpdateShowSafariToolbarBadge":
			do {
				let input = try BoolValue(serializedBytes: bytes)
				cast.updateShowSafariToolbarBadge(input) { result in
					do {
						promise(try result.serializedData())
					} catch {
						BridgeLog.error("SettingsService.UpdateShowSafariToolbarBadge: failed to serialize reply: \(error)")
						promise(Data())
					}
				}
			} catch {
				BridgeLog.error("SettingsService.UpdateShowSafariToolbarBadge: failed to deserialize request: \(error)")
				promise(Data())
			}
		case "GetHealthCheckDismissedCards":
			do {
				let input = try EmptyValue(serializedBytes: bytes)
				cast.getHealthCheckDismissedCards(input) { result in
					do {
						promise(try result.serializedData())
					} catch {
						BridgeLog.error("SettingsService.GetHealthCheckDismissedCards: failed to serialize reply: \(error)")
						promise(Data())
					}
				}
			} catch {
				BridgeLog.error("SettingsService.GetHealthCheckDismissedCards: failed to deserialize request: \(error)")
				promise(Data())
			}
		case "UpdateHealthCheckDismissedCards":
			do {
				let input = try StringValueArray(serializedBytes: bytes)
				cast.updateHealthCheckDismissedCards(input) { result in
					do {
						promise(try result.serializedData())
					} catch {
						BridgeLog.error("SettingsService.UpdateHealthCheckDismissedCards: failed to serialize reply: \(error)")
						promise(Data())
					}
				}
			} catch {
				BridgeLog.error("SettingsService.UpdateHealthCheckDismissedCards: failed to deserialize request: \(error)")
				promise(Data())
			}
		case "GetPromoDismissedCards":
			do {
				let input = try EmptyValue(serializedBytes: bytes)
				cast.getPromoDismissedCards(input) { result in
					do {
						promise(try result.serializedData())
					} catch {
						BridgeLog.error("SettingsService.GetPromoDismissedCards: failed to serialize reply: \(error)")
						promise(Data())
					}
				}
			} catch {
				BridgeLog.error("SettingsService.GetPromoDismissedCards: failed to deserialize request: \(error)")
				promise(Data())
			}
		case "UpdatePromoDismissedCards":
			do {
				let input = try StringValueArray(serializedBytes: bytes)
				cast.updatePromoDismissedCards(input) { result in
					do {
						promise(try result.serializedData())
					} catch {
						BridgeLog.error("SettingsService.UpdatePromoDismissedCards: failed to serialize reply: \(error)")
						promise(Data())
					}
				}
			} catch {
				BridgeLog.error("SettingsService.UpdatePromoDismissedCards: failed to deserialize request: \(error)")
				promise(Data())
			}
		default:
			BridgeLog.error("SettingsService.handleRequest: unknown method \"\(method)\"")
			promise(Data())
		}
	}

	private var cast : ServiceType
	{
		if let service = self as? ServiceType {
			return service
		}

		fatalError("SettingsService instance must conform to its ServiceType protocol")
	}
}
