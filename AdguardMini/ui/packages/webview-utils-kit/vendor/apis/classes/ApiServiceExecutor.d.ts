import { Message as ProtobufMessage } from 'google-protobuf';
import { PlatformRequest } from './PlatformRequest';
/** Service executor for API requests. */
export declare class ApiServiceExecutor {
    /** Execute request and return processed response. */
    Execute<ReturnValue extends ProtobufMessage, RequestMessage extends ProtobufMessage>(request: PlatformRequest<ReturnValue, RequestMessage>): Promise<ReturnValue>;
}
