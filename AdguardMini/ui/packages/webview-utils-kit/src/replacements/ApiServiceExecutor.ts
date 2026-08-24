// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import type { PlatformRequest } from './PlatformRequest';
import type { Message as ProtobufMessage } from 'google-protobuf';

/** API request executor. */
export class ApiServiceExecutor {
    /** Execute API request and return processed response. */
    public async Execute<
        ReturnValue extends ProtobufMessage,
        RequestMessage extends ProtobufMessage,
    >(
        request: PlatformRequest<ReturnValue, RequestMessage>,
    ): Promise<ReturnValue> {
        if (request.loggingEnabled) {
            // Use `window.log?.` to avoid ReferenceError before bootstrap.
            window.log?.dbg(
                'Request data',
                request.FQN,
                request.getRequestMessage().toObject(),
            );
        }
        const bytes = await window.xcallWrapper(
            request.FQN,
            request.getRequestMessage().serializeBinary().buffer,
        );
        const response = request.processResponse(bytes);
        if (request.loggingEnabled) {
            // Same `window.log?.` guard as above.
            window.log?.dbg('Response data', request.FQN, response.toObject());
        }
        return response;
    }
}
