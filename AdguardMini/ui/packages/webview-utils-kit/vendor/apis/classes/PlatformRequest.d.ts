import { Message as ProtobufMessage } from 'google-protobuf';
/** Base request class for API services. */
export declare abstract class PlatformRequest<ReturnValue extends ProtobufMessage = ProtobufMessage, RequestMessage extends ProtobufMessage = ProtobufMessage> {
    /** Request message to send. */
    protected requestMessage?: RequestMessage;
    getRequestMessage(): RequestMessage;
    /** Whether request/response logging is enabled. */
    get loggingEnabled(): boolean;
    /** Fully qualified backend method name. */
    abstract get FQN(): string;
    /** Process backend response bytes. */
    abstract processResponse(bytes: Uint8Array): ReturnValue;
}
