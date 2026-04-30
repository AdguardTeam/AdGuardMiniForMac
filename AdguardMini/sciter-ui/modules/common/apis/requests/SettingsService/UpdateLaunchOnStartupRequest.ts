/* This code was generated automatically by proto-parser tool version 1 */

import { PlatformRequest } from '@adg/sciter-utils-kit';
import { EmptyValue as ReturnValue, BoolValue as RequestMessage } from '../../types'

/**
 * Update LaunchOnStartup setting
 */
export class UpdateLaunchOnStartupRequest extends PlatformRequest<ReturnValue, RequestMessage> {
    /**
     * Constructs a new request instance
     * @param requestMessage The request message or its constructor parameters
     */
    public constructor(requestMessage: RequestMessage | ConstructorParameters<typeof RequestMessage>[0]) {
        super();
        this.requestMessage = requestMessage instanceof RequestMessage
            ? requestMessage
            : new RequestMessage(requestMessage);
    }

    /**
     * Fully qualified method name to be called on the backend
     * @returns The fully qualified method name
     */
    public get FQN() { return 'SettingsService.UpdateLaunchOnStartup'; }

    /**
     * Processes the response bytes received from the backend
     * @param bytes The response bytes
     * @returns The deserialized response
     */
    public processResponse(bytes: Uint8Array) { return ReturnValue.deserializeBinary(bytes); }
};