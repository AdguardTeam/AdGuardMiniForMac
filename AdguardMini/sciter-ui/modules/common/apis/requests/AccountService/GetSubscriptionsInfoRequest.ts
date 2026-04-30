/* This code was generated automatically by proto-parser tool version 1 */

import { PlatformRequest } from '@adg/sciter-utils-kit';
import { AppStoreSubscriptionsMessage as ReturnValue, EmptyValue as RequestMessage, EmptyValue as EmptyMessageImpl } from '../../types'

/**
 * Return available subscriptions info
 */
export class GetSubscriptionsInfoRequest extends PlatformRequest<ReturnValue, RequestMessage> {
    /**
     * Constructs a new request instance
     */
    public constructor() {
        super();
        this.requestMessage = new EmptyMessageImpl();
    }

    /**
     * Fully qualified method name to be called on the backend
     * @returns The fully qualified method name
     */
    public get FQN() { return 'AccountService.GetSubscriptionsInfo'; }

    /**
     * Processes the response bytes received from the backend
     * @param bytes The response bytes
     * @returns The deserialized response
     */
    public processResponse(bytes: Uint8Array) { return ReturnValue.deserializeBinary(bytes); }
};