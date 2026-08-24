import '../modules/crypto-polyfill';
/** Encrypt string with Rabbit cipher. */
export declare function encrypt(string: string, salt: string, pseudoIV?: string): string;
/** Decrypt Rabbit-encrypted string. */
export declare function decrypt(encryptedString: string, salt: string, pseudoIV?: string): string;
