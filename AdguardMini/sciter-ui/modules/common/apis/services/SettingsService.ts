/* This code was generated automatically by proto-parser tool version 1 */


import { EmptyValue, Settings, BoolValue, UpdateQuitReactionMessage, Path, OptionalError, ImportSettingsConfirmation, GlobalSettings, SafariExtensions, Int32Value, OptionalStringValue, UserConsent, SupportMessage, StringValue, EffectiveThemeValue, UpdateThemeMessage, StatisticsRequest, StatisticsResponse, WindowGeometry } from '../types'
import { xcall } from 'ApiWindow';

/* Service that handles settings  */
interface ISettingsService {
	/* Get Settings settings */
	GetSettings(param:EmptyValue): Promise<Settings>;
	/* Update LaunchOnStartup setting */
	UpdateLaunchOnStartup(param:BoolValue): Promise<EmptyValue>;
	/* Update ShowInMenuBar setting */
	UpdateShowInMenuBar(param:BoolValue): Promise<EmptyValue>;
	/* Update HardwareAcceleration setting */
	UpdateHardwareAcceleration(param:BoolValue): Promise<EmptyValue>;
	/* Force restart on hardware acceleration import */
	ForceRestartOnHardwareAccelerationImport(param:EmptyValue): Promise<EmptyValue>;
	/* Update DebugLogging setting */
	UpdateDebugLogging(param:BoolValue): Promise<EmptyValue>;
	/* Update quit reaction setting */
	UpdateQuitReaction(param:UpdateQuitReactionMessage): Promise<EmptyValue>;
	/* Update RealTimeFiltersUpdate setting */
	UpdateRealTimeFiltersUpdate(param:BoolValue): Promise<EmptyValue>;
	/* Update AutoFiltersUpdate setting */
	UpdateAutoFiltersUpdate(param:BoolValue): Promise<EmptyValue>;
	/* Export Settings settings */
	ExportSettings(param:Path): Promise<OptionalError>;
	/* Import Settings settings */
	ImportSettings(param:Path): Promise<EmptyValue>;
	/* Confirm Settings import with consent */
	ImportSettingsConfirm(param:ImportSettingsConfirmation): Promise<EmptyValue>;
	/* Reset Settings to default settings */
	ResetSettings(param:EmptyValue): Promise<Settings>;
	/* Get Settings settings */
	GetTraySettings(param:EmptyValue): Promise<GlobalSettings>;
	/* Update Settings settings */
	UpdateTraySettings(param:GlobalSettings): Promise<EmptyValue>;
	/* Get Safari extension status */
	GetSafariExtensions(param:EmptyValue): Promise<SafariExtensions>;
	/* Get limit on the number of rules for content blockers */
	GetContentBlockersRulesLimit(param:EmptyValue): Promise<Int32Value>;
	/* Open safati preferences */
	OpenSafariExtensionPreferences(param:OptionalStringValue): Promise<OptionalError>;
	/* Open login items settings */
	OpenLoginItemsSettings(param:EmptyValue): Promise<EmptyValue>;
	/* Export Logs archive */
	ExportLogs(param:Path): Promise<OptionalError>;
	/* Fires event for swift for checking application version, result will be dispatch
	 * by TrayCallbackService.OnApplicationVersionStatusResolved */
	CheckApplicationVersion(param:EmptyValue): Promise<EmptyValue>;
	/* Request to update application */
	RequestApplicationUpdate(param:EmptyValue): Promise<EmptyValue>;
	/* Update consent agreement */
	UpdateConsent(param:UserConsent): Promise<EmptyValue>;
	/* Send message to Support */
	SendFeedbackMessage(param:SupportMessage): Promise<OptionalError>;
	/* Request open settings page */
	RequestOpenSettingsPage(param:StringValue): Promise<EmptyValue>;
	/* Get user action last directory */
	GetUserActionLastDirectory(param:EmptyValue): Promise<StringValue>;
	/* Update user action last directory */
	UpdateUserActionLastDirectory(param:StringValue): Promise<EmptyValue>;
	/* Get system language */
	GetSystemLanguage(param:EmptyValue): Promise<StringValue>;
	/* Get effective theme */
	GetEffectiveTheme(param:EmptyValue): Promise<EffectiveThemeValue>;
	/* Update allow telemetry */
	UpdateAllowTelemetry(param:BoolValue): Promise<EmptyValue>;
	/* Update theme setting */
	UpdateTheme(param:UpdateThemeMessage): Promise<EmptyValue>;
	/* Get blocking statistics */
	GetStatistics(param:StatisticsRequest): Promise<StatisticsResponse>;
	/* Reset all statistics */
	ResetStatistics(param:EmptyValue): Promise<EmptyValue>;
	/* Update user rules editor window geometry */
	UpdateUserRulesEditorGeometry(param:WindowGeometry): Promise<EmptyValue>;
}

/**
 * Service that handles settings
 */
export class SettingsService implements ISettingsService {
	/**
	 * Get Settings settings
	 * @param EmptyValue param
	 * @returns Settings param
	 */
	GetSettings = async (param: EmptyValue): Promise<Settings> => {
		log.dbg('Request data', 'SettingsService.GetSettings', param.toObject());

		const res = await xcall('SettingsService.GetSettings', param.serializeBinary().buffer);
		const data = Settings.deserializeBinary(res);

		log.dbg('Response data', 'SettingsService.GetSettings', data.toObject());
		return data;
	};

	/**
	 * Update LaunchOnStartup setting
	 * @param BoolValue param
	 * @returns EmptyValue param
	 */
	UpdateLaunchOnStartup = async (param: BoolValue): Promise<EmptyValue> => {
		log.dbg('Request data', 'SettingsService.UpdateLaunchOnStartup', param.toObject());

		const res = await xcall('SettingsService.UpdateLaunchOnStartup', param.serializeBinary().buffer);
		const data = EmptyValue.deserializeBinary(res);

		log.dbg('Response data', 'SettingsService.UpdateLaunchOnStartup', data.toObject());
		return data;
	};

	/**
	 * Update ShowInMenuBar setting
	 * @param BoolValue param
	 * @returns EmptyValue param
	 */
	UpdateShowInMenuBar = async (param: BoolValue): Promise<EmptyValue> => {
		log.dbg('Request data', 'SettingsService.UpdateShowInMenuBar', param.toObject());

		const res = await xcall('SettingsService.UpdateShowInMenuBar', param.serializeBinary().buffer);
		const data = EmptyValue.deserializeBinary(res);

		log.dbg('Response data', 'SettingsService.UpdateShowInMenuBar', data.toObject());
		return data;
	};

	/**
	 * Update HardwareAcceleration setting
	 * @param BoolValue param
	 * @returns EmptyValue param
	 */
	UpdateHardwareAcceleration = async (param: BoolValue): Promise<EmptyValue> => {
		log.dbg('Request data', 'SettingsService.UpdateHardwareAcceleration', param.toObject());

		const res = await xcall('SettingsService.UpdateHardwareAcceleration', param.serializeBinary().buffer);
		const data = EmptyValue.deserializeBinary(res);

		log.dbg('Response data', 'SettingsService.UpdateHardwareAcceleration', data.toObject());
		return data;
	};

	/**
	 * Force restart on hardware acceleration import
	 * @param EmptyValue param
	 * @returns EmptyValue param
	 */
	ForceRestartOnHardwareAccelerationImport = async (param: EmptyValue): Promise<EmptyValue> => {
		log.dbg('Request data', 'SettingsService.ForceRestartOnHardwareAccelerationImport', param.toObject());

		const res = await xcall('SettingsService.ForceRestartOnHardwareAccelerationImport', param.serializeBinary().buffer);
		const data = EmptyValue.deserializeBinary(res);

		log.dbg('Response data', 'SettingsService.ForceRestartOnHardwareAccelerationImport', data.toObject());
		return data;
	};

	/**
	 * Update DebugLogging setting
	 * @param BoolValue param
	 * @returns EmptyValue param
	 */
	UpdateDebugLogging = async (param: BoolValue): Promise<EmptyValue> => {
		log.dbg('Request data', 'SettingsService.UpdateDebugLogging', param.toObject());

		const res = await xcall('SettingsService.UpdateDebugLogging', param.serializeBinary().buffer);
		const data = EmptyValue.deserializeBinary(res);

		log.dbg('Response data', 'SettingsService.UpdateDebugLogging', data.toObject());
		return data;
	};

	/**
	 * Update quit reaction setting
	 * @param UpdateQuitReactionMessage param
	 * @returns EmptyValue param
	 */
	UpdateQuitReaction = async (param: UpdateQuitReactionMessage): Promise<EmptyValue> => {
		log.dbg('Request data', 'SettingsService.UpdateQuitReaction', param.toObject());

		const res = await xcall('SettingsService.UpdateQuitReaction', param.serializeBinary().buffer);
		const data = EmptyValue.deserializeBinary(res);

		log.dbg('Response data', 'SettingsService.UpdateQuitReaction', data.toObject());
		return data;
	};

	/**
	 * Update RealTimeFiltersUpdate setting
	 * @param BoolValue param
	 * @returns EmptyValue param
	 */
	UpdateRealTimeFiltersUpdate = async (param: BoolValue): Promise<EmptyValue> => {
		log.dbg('Request data', 'SettingsService.UpdateRealTimeFiltersUpdate', param.toObject());

		const res = await xcall('SettingsService.UpdateRealTimeFiltersUpdate', param.serializeBinary().buffer);
		const data = EmptyValue.deserializeBinary(res);

		log.dbg('Response data', 'SettingsService.UpdateRealTimeFiltersUpdate', data.toObject());
		return data;
	};

	/**
	 * Update AutoFiltersUpdate setting
	 * @param BoolValue param
	 * @returns EmptyValue param
	 */
	UpdateAutoFiltersUpdate = async (param: BoolValue): Promise<EmptyValue> => {
		log.dbg('Request data', 'SettingsService.UpdateAutoFiltersUpdate', param.toObject());

		const res = await xcall('SettingsService.UpdateAutoFiltersUpdate', param.serializeBinary().buffer);
		const data = EmptyValue.deserializeBinary(res);

		log.dbg('Response data', 'SettingsService.UpdateAutoFiltersUpdate', data.toObject());
		return data;
	};

	/**
	 * Export Settings settings
	 * @param Path param
	 * @returns OptionalError param
	 */
	ExportSettings = async (param: Path): Promise<OptionalError> => {
		log.dbg('Request data', 'SettingsService.ExportSettings', param.toObject());

		const res = await xcall('SettingsService.ExportSettings', param.serializeBinary().buffer);
		const data = OptionalError.deserializeBinary(res);

		log.dbg('Response data', 'SettingsService.ExportSettings', data.toObject());
		return data;
	};

	/**
	 * Import Settings settings
	 * @param Path param
	 * @returns EmptyValue param
	 */
	ImportSettings = async (param: Path): Promise<EmptyValue> => {
		log.dbg('Request data', 'SettingsService.ImportSettings', param.toObject());

		const res = await xcall('SettingsService.ImportSettings', param.serializeBinary().buffer);
		const data = EmptyValue.deserializeBinary(res);

		log.dbg('Response data', 'SettingsService.ImportSettings', data.toObject());
		return data;
	};

	/**
	 * Confirm Settings import with consent
	 * @param ImportSettingsConfirmation param
	 * @returns EmptyValue param
	 */
	ImportSettingsConfirm = async (param: ImportSettingsConfirmation): Promise<EmptyValue> => {
		log.dbg('Request data', 'SettingsService.ImportSettingsConfirm', param.toObject());

		const res = await xcall('SettingsService.ImportSettingsConfirm', param.serializeBinary().buffer);
		const data = EmptyValue.deserializeBinary(res);

		log.dbg('Response data', 'SettingsService.ImportSettingsConfirm', data.toObject());
		return data;
	};

	/**
	 * Reset Settings to default settings
	 * @param EmptyValue param
	 * @returns Settings param
	 */
	ResetSettings = async (param: EmptyValue): Promise<Settings> => {
		log.dbg('Request data', 'SettingsService.ResetSettings', param.toObject());

		const res = await xcall('SettingsService.ResetSettings', param.serializeBinary().buffer);
		const data = Settings.deserializeBinary(res);

		log.dbg('Response data', 'SettingsService.ResetSettings', data.toObject());
		return data;
	};

	/**
	 * Get Settings settings
	 * @param EmptyValue param
	 * @returns GlobalSettings param
	 */
	GetTraySettings = async (param: EmptyValue): Promise<GlobalSettings> => {
		log.dbg('Request data', 'SettingsService.GetTraySettings', param.toObject());

		const res = await xcall('SettingsService.GetTraySettings', param.serializeBinary().buffer);
		const data = GlobalSettings.deserializeBinary(res);

		log.dbg('Response data', 'SettingsService.GetTraySettings', data.toObject());
		return data;
	};

	/**
	 * Update Settings settings
	 * @param GlobalSettings param
	 * @returns EmptyValue param
	 */
	UpdateTraySettings = async (param: GlobalSettings): Promise<EmptyValue> => {
		log.dbg('Request data', 'SettingsService.UpdateTraySettings', param.toObject());

		const res = await xcall('SettingsService.UpdateTraySettings', param.serializeBinary().buffer);
		const data = EmptyValue.deserializeBinary(res);

		log.dbg('Response data', 'SettingsService.UpdateTraySettings', data.toObject());
		return data;
	};

	/**
	 * Get Safari extension status
	 * @param EmptyValue param
	 * @returns SafariExtensions param
	 */
	GetSafariExtensions = async (param: EmptyValue): Promise<SafariExtensions> => {
		log.dbg('Request data', 'SettingsService.GetSafariExtensions', param.toObject());

		const res = await xcall('SettingsService.GetSafariExtensions', param.serializeBinary().buffer);
		const data = SafariExtensions.deserializeBinary(res);

		log.dbg('Response data', 'SettingsService.GetSafariExtensions', data.toObject());
		return data;
	};

	/**
	 * Get limit on the number of rules for content blockers
	 * @param EmptyValue param
	 * @returns Int32Value param
	 */
	GetContentBlockersRulesLimit = async (param: EmptyValue): Promise<Int32Value> => {
		log.dbg('Request data', 'SettingsService.GetContentBlockersRulesLimit', param.toObject());

		const res = await xcall('SettingsService.GetContentBlockersRulesLimit', param.serializeBinary().buffer);
		const data = Int32Value.deserializeBinary(res);

		log.dbg('Response data', 'SettingsService.GetContentBlockersRulesLimit', data.toObject());
		return data;
	};

	/**
	 * Open safati preferences
	 * @param OptionalStringValue param
	 * @returns OptionalError param
	 */
	OpenSafariExtensionPreferences = async (param: OptionalStringValue): Promise<OptionalError> => {
		log.dbg('Request data', 'SettingsService.OpenSafariExtensionPreferences', param.toObject());

		const res = await xcall('SettingsService.OpenSafariExtensionPreferences', param.serializeBinary().buffer);
		const data = OptionalError.deserializeBinary(res);

		log.dbg('Response data', 'SettingsService.OpenSafariExtensionPreferences', data.toObject());
		return data;
	};

	/**
	 * Open login items settings
	 * @param EmptyValue param
	 * @returns EmptyValue param
	 */
	OpenLoginItemsSettings = async (param: EmptyValue): Promise<EmptyValue> => {
		log.dbg('Request data', 'SettingsService.OpenLoginItemsSettings', param.toObject());

		const res = await xcall('SettingsService.OpenLoginItemsSettings', param.serializeBinary().buffer);
		const data = EmptyValue.deserializeBinary(res);

		log.dbg('Response data', 'SettingsService.OpenLoginItemsSettings', data.toObject());
		return data;
	};

	/**
	 * Export Logs archive
	 * @param Path param
	 * @returns OptionalError param
	 */
	ExportLogs = async (param: Path): Promise<OptionalError> => {
		log.dbg('Request data', 'SettingsService.ExportLogs', param.toObject());

		const res = await xcall('SettingsService.ExportLogs', param.serializeBinary().buffer);
		const data = OptionalError.deserializeBinary(res);

		log.dbg('Response data', 'SettingsService.ExportLogs', data.toObject());
		return data;
	};

	/**
	 * Fires event for swift for checking application version, result will be dispatch
	 * by TrayCallbackService.OnApplicationVersionStatusResolved
	 * @param EmptyValue param
	 * @returns EmptyValue param
	 */
	CheckApplicationVersion = async (param: EmptyValue): Promise<EmptyValue> => {
		log.dbg('Request data', 'SettingsService.CheckApplicationVersion', param.toObject());

		const res = await xcall('SettingsService.CheckApplicationVersion', param.serializeBinary().buffer);
		const data = EmptyValue.deserializeBinary(res);

		log.dbg('Response data', 'SettingsService.CheckApplicationVersion', data.toObject());
		return data;
	};

	/**
	 * Request to update application
	 * @param EmptyValue param
	 * @returns EmptyValue param
	 */
	RequestApplicationUpdate = async (param: EmptyValue): Promise<EmptyValue> => {
		log.dbg('Request data', 'SettingsService.RequestApplicationUpdate', param.toObject());

		const res = await xcall('SettingsService.RequestApplicationUpdate', param.serializeBinary().buffer);
		const data = EmptyValue.deserializeBinary(res);

		log.dbg('Response data', 'SettingsService.RequestApplicationUpdate', data.toObject());
		return data;
	};

	/**
	 * Update consent agreement
	 * @param UserConsent param
	 * @returns EmptyValue param
	 */
	UpdateConsent = async (param: UserConsent): Promise<EmptyValue> => {
		log.dbg('Request data', 'SettingsService.UpdateConsent', param.toObject());

		const res = await xcall('SettingsService.UpdateConsent', param.serializeBinary().buffer);
		const data = EmptyValue.deserializeBinary(res);

		log.dbg('Response data', 'SettingsService.UpdateConsent', data.toObject());
		return data;
	};

	/**
	 * Send message to Support
	 * @param SupportMessage param
	 * @returns OptionalError param
	 */
	SendFeedbackMessage = async (param: SupportMessage): Promise<OptionalError> => {
		log.dbg('Request data', 'SettingsService.SendFeedbackMessage', param.toObject());

		const res = await xcall('SettingsService.SendFeedbackMessage', param.serializeBinary().buffer);
		const data = OptionalError.deserializeBinary(res);

		log.dbg('Response data', 'SettingsService.SendFeedbackMessage', data.toObject());
		return data;
	};

	/**
	 * Request open settings page
	 * @param StringValue param
	 * @returns EmptyValue param
	 */
	RequestOpenSettingsPage = async (param: StringValue): Promise<EmptyValue> => {
		log.dbg('Request data', 'SettingsService.RequestOpenSettingsPage', param.toObject());

		const res = await xcall('SettingsService.RequestOpenSettingsPage', param.serializeBinary().buffer);
		const data = EmptyValue.deserializeBinary(res);

		log.dbg('Response data', 'SettingsService.RequestOpenSettingsPage', data.toObject());
		return data;
	};

	/**
	 * Get user action last directory
	 * @param EmptyValue param
	 * @returns StringValue param
	 */
	GetUserActionLastDirectory = async (param: EmptyValue): Promise<StringValue> => {
		log.dbg('Request data', 'SettingsService.GetUserActionLastDirectory', param.toObject());

		const res = await xcall('SettingsService.GetUserActionLastDirectory', param.serializeBinary().buffer);
		const data = StringValue.deserializeBinary(res);

		log.dbg('Response data', 'SettingsService.GetUserActionLastDirectory', data.toObject());
		return data;
	};

	/**
	 * Update user action last directory
	 * @param StringValue param
	 * @returns EmptyValue param
	 */
	UpdateUserActionLastDirectory = async (param: StringValue): Promise<EmptyValue> => {
		log.dbg('Request data', 'SettingsService.UpdateUserActionLastDirectory', param.toObject());

		const res = await xcall('SettingsService.UpdateUserActionLastDirectory', param.serializeBinary().buffer);
		const data = EmptyValue.deserializeBinary(res);

		log.dbg('Response data', 'SettingsService.UpdateUserActionLastDirectory', data.toObject());
		return data;
	};

	/**
	 * Get system language
	 * @param EmptyValue param
	 * @returns StringValue param
	 */
	GetSystemLanguage = async (param: EmptyValue): Promise<StringValue> => {
		log.dbg('Request data', 'SettingsService.GetSystemLanguage', param.toObject());

		const res = await xcall('SettingsService.GetSystemLanguage', param.serializeBinary().buffer);
		const data = StringValue.deserializeBinary(res);

		log.dbg('Response data', 'SettingsService.GetSystemLanguage', data.toObject());
		return data;
	};

	/**
	 * Get effective theme
	 * @param EmptyValue param
	 * @returns EffectiveThemeValue param
	 */
	GetEffectiveTheme = async (param: EmptyValue): Promise<EffectiveThemeValue> => {
		log.dbg('Request data', 'SettingsService.GetEffectiveTheme', param.toObject());

		const res = await xcall('SettingsService.GetEffectiveTheme', param.serializeBinary().buffer);
		const data = EffectiveThemeValue.deserializeBinary(res);

		log.dbg('Response data', 'SettingsService.GetEffectiveTheme', data.toObject());
		return data;
	};

	/**
	 * Update allow telemetry
	 * @param BoolValue param
	 * @returns EmptyValue param
	 */
	UpdateAllowTelemetry = async (param: BoolValue): Promise<EmptyValue> => {
		log.dbg('Request data', 'SettingsService.UpdateAllowTelemetry', param.toObject());

		const res = await xcall('SettingsService.UpdateAllowTelemetry', param.serializeBinary().buffer);
		const data = EmptyValue.deserializeBinary(res);

		log.dbg('Response data', 'SettingsService.UpdateAllowTelemetry', data.toObject());
		return data;
	};

	/**
	 * Update theme setting
	 * @param UpdateThemeMessage param
	 * @returns EmptyValue param
	 */
	UpdateTheme = async (param: UpdateThemeMessage): Promise<EmptyValue> => {
		log.dbg('Request data', 'SettingsService.UpdateTheme', param.toObject());

		const res = await xcall('SettingsService.UpdateTheme', param.serializeBinary().buffer);
		const data = EmptyValue.deserializeBinary(res);

		log.dbg('Response data', 'SettingsService.UpdateTheme', data.toObject());
		return data;
	};

	/**
	 * Get blocking statistics
	 * @param StatisticsRequest param
	 * @returns StatisticsResponse param
	 */
	GetStatistics = async (param: StatisticsRequest): Promise<StatisticsResponse> => {
		log.dbg('Request data', 'SettingsService.GetStatistics', param.toObject());

		const res = await xcall('SettingsService.GetStatistics', param.serializeBinary().buffer);
		const data = StatisticsResponse.deserializeBinary(res);

		log.dbg('Response data', 'SettingsService.GetStatistics', data.toObject());
		return data;
	};

	/**
	 * Reset all statistics
	 * @param EmptyValue param
	 * @returns EmptyValue param
	 */
	ResetStatistics = async (param: EmptyValue): Promise<EmptyValue> => {
		log.dbg('Request data', 'SettingsService.ResetStatistics', param.toObject());

		const res = await xcall('SettingsService.ResetStatistics', param.serializeBinary().buffer);
		const data = EmptyValue.deserializeBinary(res);

		log.dbg('Response data', 'SettingsService.ResetStatistics', data.toObject());
		return data;
	};

	/**
	 * Update user rules editor window geometry
	 * @param WindowGeometry param
	 * @returns EmptyValue param
	 */
	UpdateUserRulesEditorGeometry = async (param: WindowGeometry): Promise<EmptyValue> => {
		log.dbg('Request data', 'SettingsService.UpdateUserRulesEditorGeometry', param.toObject());

		const res = await xcall('SettingsService.UpdateUserRulesEditorGeometry', param.serializeBinary().buffer);
		const data = EmptyValue.deserializeBinary(res);

		log.dbg('Response data', 'SettingsService.UpdateUserRulesEditorGeometry', data.toObject());
		return data;
	};

}
