/* This code was generated automatically by proto-parser tool version 1 */


import { EmptyValue, LicenseOrError, OptionalError, AppStoreSubscriptionsMessage, Int32Value, StringValue, EnterActivationCodeResultMessage, WebActivateResultMessage, SubscriptionMessage } from '../types'
import { xcall } from 'ApiWindow';

/* Service handles account info  */
interface IAccountService {
	/* Return License info */
	GetLicense(param:EmptyValue): Promise<LicenseOrError>;
	/* Request to refresh the License */
	RefreshLicense(param:EmptyValue): Promise<OptionalError>;
	/* Return available subscriptions info */
	GetSubscriptionsInfo(param:EmptyValue): Promise<AppStoreSubscriptionsMessage>;
	/* Return trial availability */
	GetTrialAvailableDays(param:EmptyValue): Promise<Int32Value>;
	/* Enter activation code */
	EnterActivationCode(param:StringValue): Promise<EnterActivationCodeResultMessage>;
	/* Request opening activate page */
	RequestActivate(param:EmptyValue): Promise<WebActivateResultMessage>;
	/* Request opening bind page */
	RequestBind(param:StringValue): Promise<WebActivateResultMessage>;
	/* Request opening renew page */
	RequestRenew(param:StringValue): Promise<OptionalError>;
	/* Request log out */
	RequestLogout(param:EmptyValue): Promise<OptionalError>;
	/* Request purchase subscription */
	RequestSubscribe(param:SubscriptionMessage): Promise<OptionalError>;
	/* Request restore purchases */
	RequestRestorePurchases(param:EmptyValue): Promise<OptionalError>;
	/* Request opening subscriptions page */
	RequestOpenSubscriptions(param:EmptyValue): Promise<EmptyValue>;
	/* Request opening app store page */
	RequestOpenAppStore(param:EmptyValue): Promise<EmptyValue>;
	/* Request opening app store review page */
	RequestOpenAppStoreReview(param:EmptyValue): Promise<EmptyValue>;
}

/**
 * Service handles account info
 */
export class AccountService implements IAccountService {
	/**
	 * Return License info
	 * @param EmptyValue param
	 * @returns LicenseOrError param
	 */
	GetLicense = async (param: EmptyValue): Promise<LicenseOrError> => {
		log.dbg('Request data', 'AccountService.GetLicense', param.toObject());

		const res = await xcall('AccountService.GetLicense', param.serializeBinary().buffer);
		const data = LicenseOrError.deserializeBinary(res);

		log.dbg('Response data', 'AccountService.GetLicense', data.toObject());
		return data;
	};

	/**
	 * Request to refresh the License
	 * @param EmptyValue param
	 * @returns OptionalError param
	 */
	RefreshLicense = async (param: EmptyValue): Promise<OptionalError> => {
		log.dbg('Request data', 'AccountService.RefreshLicense', param.toObject());

		const res = await xcall('AccountService.RefreshLicense', param.serializeBinary().buffer);
		const data = OptionalError.deserializeBinary(res);

		log.dbg('Response data', 'AccountService.RefreshLicense', data.toObject());
		return data;
	};

	/**
	 * Return available subscriptions info
	 * @param EmptyValue param
	 * @returns AppStoreSubscriptionsMessage param
	 */
	GetSubscriptionsInfo = async (param: EmptyValue): Promise<AppStoreSubscriptionsMessage> => {
		log.dbg('Request data', 'AccountService.GetSubscriptionsInfo', param.toObject());

		const res = await xcall('AccountService.GetSubscriptionsInfo', param.serializeBinary().buffer);
		const data = AppStoreSubscriptionsMessage.deserializeBinary(res);

		log.dbg('Response data', 'AccountService.GetSubscriptionsInfo', data.toObject());
		return data;
	};

	/**
	 * Return trial availability
	 * @param EmptyValue param
	 * @returns Int32Value param
	 */
	GetTrialAvailableDays = async (param: EmptyValue): Promise<Int32Value> => {
		log.dbg('Request data', 'AccountService.GetTrialAvailableDays', param.toObject());

		const res = await xcall('AccountService.GetTrialAvailableDays', param.serializeBinary().buffer);
		const data = Int32Value.deserializeBinary(res);

		log.dbg('Response data', 'AccountService.GetTrialAvailableDays', data.toObject());
		return data;
	};

	/**
	 * Enter activation code
	 * @param StringValue param
	 * @returns EnterActivationCodeResultMessage param
	 */
	EnterActivationCode = async (param: StringValue): Promise<EnterActivationCodeResultMessage> => {
		log.dbg('Request data', 'AccountService.EnterActivationCode', param.toObject());

		const res = await xcall('AccountService.EnterActivationCode', param.serializeBinary().buffer);
		const data = EnterActivationCodeResultMessage.deserializeBinary(res);

		log.dbg('Response data', 'AccountService.EnterActivationCode', data.toObject());
		return data;
	};

	/**
	 * Request opening activate page
	 * @param EmptyValue param
	 * @returns WebActivateResultMessage param
	 */
	RequestActivate = async (param: EmptyValue): Promise<WebActivateResultMessage> => {
		log.dbg('Request data', 'AccountService.RequestActivate', param.toObject());

		const res = await xcall('AccountService.RequestActivate', param.serializeBinary().buffer);
		const data = WebActivateResultMessage.deserializeBinary(res);

		log.dbg('Response data', 'AccountService.RequestActivate', data.toObject());
		return data;
	};

	/**
	 * Request opening bind page
	 * @param StringValue param
	 * @returns WebActivateResultMessage param
	 */
	RequestBind = async (param: StringValue): Promise<WebActivateResultMessage> => {
		log.dbg('Request data', 'AccountService.RequestBind', param.toObject());

		const res = await xcall('AccountService.RequestBind', param.serializeBinary().buffer);
		const data = WebActivateResultMessage.deserializeBinary(res);

		log.dbg('Response data', 'AccountService.RequestBind', data.toObject());
		return data;
	};

	/**
	 * Request opening renew page
	 * @param StringValue param
	 * @returns OptionalError param
	 */
	RequestRenew = async (param: StringValue): Promise<OptionalError> => {
		log.dbg('Request data', 'AccountService.RequestRenew', param.toObject());

		const res = await xcall('AccountService.RequestRenew', param.serializeBinary().buffer);
		const data = OptionalError.deserializeBinary(res);

		log.dbg('Response data', 'AccountService.RequestRenew', data.toObject());
		return data;
	};

	/**
	 * Request log out
	 * @param EmptyValue param
	 * @returns OptionalError param
	 */
	RequestLogout = async (param: EmptyValue): Promise<OptionalError> => {
		log.dbg('Request data', 'AccountService.RequestLogout', param.toObject());

		const res = await xcall('AccountService.RequestLogout', param.serializeBinary().buffer);
		const data = OptionalError.deserializeBinary(res);

		log.dbg('Response data', 'AccountService.RequestLogout', data.toObject());
		return data;
	};

	/**
	 * Request purchase subscription
	 * @param SubscriptionMessage param
	 * @returns OptionalError param
	 */
	RequestSubscribe = async (param: SubscriptionMessage): Promise<OptionalError> => {
		log.dbg('Request data', 'AccountService.RequestSubscribe', param.toObject());

		const res = await xcall('AccountService.RequestSubscribe', param.serializeBinary().buffer);
		const data = OptionalError.deserializeBinary(res);

		log.dbg('Response data', 'AccountService.RequestSubscribe', data.toObject());
		return data;
	};

	/**
	 * Request restore purchases
	 * @param EmptyValue param
	 * @returns OptionalError param
	 */
	RequestRestorePurchases = async (param: EmptyValue): Promise<OptionalError> => {
		log.dbg('Request data', 'AccountService.RequestRestorePurchases', param.toObject());

		const res = await xcall('AccountService.RequestRestorePurchases', param.serializeBinary().buffer);
		const data = OptionalError.deserializeBinary(res);

		log.dbg('Response data', 'AccountService.RequestRestorePurchases', data.toObject());
		return data;
	};

	/**
	 * Request opening subscriptions page
	 * @param EmptyValue param
	 * @returns EmptyValue param
	 */
	RequestOpenSubscriptions = async (param: EmptyValue): Promise<EmptyValue> => {
		log.dbg('Request data', 'AccountService.RequestOpenSubscriptions', param.toObject());

		const res = await xcall('AccountService.RequestOpenSubscriptions', param.serializeBinary().buffer);
		const data = EmptyValue.deserializeBinary(res);

		log.dbg('Response data', 'AccountService.RequestOpenSubscriptions', data.toObject());
		return data;
	};

	/**
	 * Request opening app store page
	 * @param EmptyValue param
	 * @returns EmptyValue param
	 */
	RequestOpenAppStore = async (param: EmptyValue): Promise<EmptyValue> => {
		log.dbg('Request data', 'AccountService.RequestOpenAppStore', param.toObject());

		const res = await xcall('AccountService.RequestOpenAppStore', param.serializeBinary().buffer);
		const data = EmptyValue.deserializeBinary(res);

		log.dbg('Response data', 'AccountService.RequestOpenAppStore', data.toObject());
		return data;
	};

	/**
	 * Request opening app store review page
	 * @param EmptyValue param
	 * @returns EmptyValue param
	 */
	RequestOpenAppStoreReview = async (param: EmptyValue): Promise<EmptyValue> => {
		log.dbg('Request data', 'AccountService.RequestOpenAppStoreReview', param.toObject());

		const res = await xcall('AccountService.RequestOpenAppStoreReview', param.serializeBinary().buffer);
		const data = EmptyValue.deserializeBinary(res);

		log.dbg('Response data', 'AccountService.RequestOpenAppStoreReview', data.toObject());
		return data;
	};

}
