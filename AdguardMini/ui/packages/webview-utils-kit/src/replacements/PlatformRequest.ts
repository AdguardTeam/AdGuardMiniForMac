// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import type { Message as ProtobufMessage } from 'google-protobuf';

/** Base request class for API services. */
export abstract class PlatformRequest<
    ReturnValue extends ProtobufMessage = ProtobufMessage,
    RequestMessage extends ProtobufMessage = ProtobufMessage,
> {
    /** Request message sent to API. */
    protected requestMessage?: RequestMessage;

    /** Backend method FQN. */
    public abstract get FQN(): string;

    /** Whether request/response logging is enabled. */
    public get loggingEnabled(): boolean {
        return true;
    }

    /** Return initialized request message. @throws Error if the derived class did not set `requestMessage`. */
    public getRequestMessage(): RequestMessage {
        if (this.requestMessage === undefined) {
            throw new Error(
                `Request message is not initialized in ${this.constructor.name}. Set it in the derived class constructor.`,
            );
        }
        return this.requestMessage;
    }

    /** Deserialize backend response bytes. */
    public abstract processResponse(bytes: Uint8Array): ReturnValue;
}
