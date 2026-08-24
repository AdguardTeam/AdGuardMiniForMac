/* This code was generated automatically by proto-parser tool version 1 */
import { EmptyValue, FiltersIndex, StringValue } from '../types'

/* Service handles filters lists- public part for external platform calls with methods for ArrayBuffer */
export interface IFiltersCallbackService {
	/* Fires when filters list updated */
	OnFiltersUpdate(param: ArrayBuffer): Promise<EmptyValue>;
	/* Fires when filters index updated */
	OnFiltersIndexUpdate(param: ArrayBuffer): Promise<EmptyValue>;
	/* Fires when user asked to subscribe on custom filter */
	OnCustomFiltersSubscribe(param: ArrayBuffer): Promise<EmptyValue>;
}

/* Service handles filters lists- private part for operations with unmarshalled params */
export interface IFiltersCallbackServiceInternal {
	/* Fires when filters list updated*/
	OnFiltersUpdate(param: EmptyValue): Promise<EmptyValue>;
	/* Fires when filters index updated*/
	OnFiltersIndexUpdate(param: FiltersIndex): Promise<EmptyValue>;
	/* Fires when user asked to subscribe on custom filter*/
	OnCustomFiltersSubscribe(param: StringValue): Promise<EmptyValue>;
}

/* Service handles filters lists */
export class FiltersCallbackService implements IFiltersCallbackService {
	filtersCallbackServiceInternal: IFiltersCallbackServiceInternal;

	constructor(filtersCallbackServiceInternal: IFiltersCallbackServiceInternal) {
		this.filtersCallbackServiceInternal = filtersCallbackServiceInternal
	}

	/**
	 * Fires when filters list updated
	 * @param ArrayBuffer param
	 * @returns EmptyValue param
	 */
	OnFiltersUpdate = async (param: ArrayBuffer): Promise<EmptyValue> => {
		const bytes = new Uint8Array(param);
		const arg = EmptyValue.deserializeBinary(bytes);

		if (!arg) {
			throw new Error(`Empty parameter in FiltersCallbackService.OnFiltersUpdate: ${ param }`);
		}
		log.dbg('Callback data', 'FiltersCallbackService.OnFiltersUpdate', arg.toObject());
		await this.filtersCallbackServiceInternal.OnFiltersUpdate(arg);
		return new EmptyValue();
	};
	/**
	 * Fires when filters index updated
	 * @param ArrayBuffer param
	 * @returns EmptyValue param
	 */
	OnFiltersIndexUpdate = async (param: ArrayBuffer): Promise<EmptyValue> => {
		const bytes = new Uint8Array(param);
		const arg = FiltersIndex.deserializeBinary(bytes);

		if (!arg) {
			throw new Error(`Empty parameter in FiltersCallbackService.OnFiltersIndexUpdate: ${ param }`);
		}
		log.dbg('Callback data', 'FiltersCallbackService.OnFiltersIndexUpdate', arg.toObject());
		await this.filtersCallbackServiceInternal.OnFiltersIndexUpdate(arg);
		return new EmptyValue();
	};
	/**
	 * Fires when user asked to subscribe on custom filter
	 * @param ArrayBuffer param
	 * @returns EmptyValue param
	 */
	OnCustomFiltersSubscribe = async (param: ArrayBuffer): Promise<EmptyValue> => {
		const bytes = new Uint8Array(param);
		const arg = StringValue.deserializeBinary(bytes);

		if (!arg) {
			throw new Error(`Empty parameter in FiltersCallbackService.OnCustomFiltersSubscribe: ${ param }`);
		}
		log.dbg('Callback data', 'FiltersCallbackService.OnCustomFiltersSubscribe', arg.toObject());
		await this.filtersCallbackServiceInternal.OnCustomFiltersSubscribe(arg);
		return new EmptyValue();
	};
}
