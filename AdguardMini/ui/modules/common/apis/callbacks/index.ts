/* This code was generated automatically by proto-parser tool version 1 */
import { IFiltersCallbackService, IFiltersCallbackServiceInternal, FiltersCallbackService } from './FiltersCallbackService';
import { FiltersCallbackServiceInternal } from './FiltersCallbackServiceInternal';
import { IUserRulesCallbackService, IUserRulesCallbackServiceInternal, UserRulesCallbackService } from './UserRulesCallbackService';
import { UserRulesCallbackServiceInternal } from './UserRulesCallbackServiceInternal';
import { IOnboardingCallbackService, IOnboardingCallbackServiceInternal, OnboardingCallbackService } from './OnboardingCallbackService';
import { OnboardingCallbackServiceInternal } from './OnboardingCallbackServiceInternal';
import { IAccountCallbackService, IAccountCallbackServiceInternal, AccountCallbackService } from './AccountCallbackService';
import { AccountCallbackServiceInternal } from './AccountCallbackServiceInternal';
import { ITrayCallbackService, ITrayCallbackServiceInternal, TrayCallbackService } from './TrayCallbackService';
import { TrayCallbackServiceInternal } from './TrayCallbackServiceInternal';
import { ISettingsCallbackService, ISettingsCallbackServiceInternal, SettingsCallbackService } from './SettingsCallbackService';
import { SettingsCallbackServiceInternal } from './SettingsCallbackServiceInternal';

export class API_CALLBACK {
    filtersCallbackService: IFiltersCallbackService;
    userRulesCallbackService: IUserRulesCallbackService;
    onboardingCallbackService: IOnboardingCallbackService;
    accountCallbackService: IAccountCallbackService;
    trayCallbackService: ITrayCallbackService;
    settingsCallbackService: ISettingsCallbackService;

    constructor(
        filtersCallbackServiceInternal: IFiltersCallbackServiceInternal,
        userRulesCallbackServiceInternal: IUserRulesCallbackServiceInternal,
        onboardingCallbackServiceInternal: IOnboardingCallbackServiceInternal,
        accountCallbackServiceInternal: IAccountCallbackServiceInternal,
        trayCallbackServiceInternal: ITrayCallbackServiceInternal,
        settingsCallbackServiceInternal: ISettingsCallbackServiceInternal,
    )
    {
        this.filtersCallbackService = new FiltersCallbackService(filtersCallbackServiceInternal);
        this.userRulesCallbackService = new UserRulesCallbackService(userRulesCallbackServiceInternal);
        this.onboardingCallbackService = new OnboardingCallbackService(onboardingCallbackServiceInternal);
        this.accountCallbackService = new AccountCallbackService(accountCallbackServiceInternal);
        this.trayCallbackService = new TrayCallbackService(trayCallbackServiceInternal);
        this.settingsCallbackService = new SettingsCallbackService(settingsCallbackServiceInternal);
    }
}

export {
            IFiltersCallbackService, IFiltersCallbackServiceInternal, FiltersCallbackService, FiltersCallbackServiceInternal,
            IUserRulesCallbackService, IUserRulesCallbackServiceInternal, UserRulesCallbackService, UserRulesCallbackServiceInternal,
            IOnboardingCallbackService, IOnboardingCallbackServiceInternal, OnboardingCallbackService, OnboardingCallbackServiceInternal,
            IAccountCallbackService, IAccountCallbackServiceInternal, AccountCallbackService, AccountCallbackServiceInternal,
            ITrayCallbackService, ITrayCallbackServiceInternal, TrayCallbackService, TrayCallbackServiceInternal,
            ISettingsCallbackService, ISettingsCallbackServiceInternal, SettingsCallbackService, SettingsCallbackServiceInternal,
    };
