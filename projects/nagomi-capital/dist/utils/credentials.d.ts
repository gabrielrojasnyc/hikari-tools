/**
 * Secure Credential Loader
 *
 * Reads credentials from HashiCorp Vault (filesystem-based)
 * located at ~/.openclaw/credentials/
 *
 * Security Features:
 * - Credentials read once at startup and cached in memory
 * - File permissions checked (must be 600)
 * - No secrets logged or exposed in errors
 * - Graceful failure with descriptive (but safe) error messages
 */
declare const REQUIRED_CREDENTIALS: readonly ["alpaca-api-key", "alpaca-secret-key", "openai-api-key", "x-api-bearer-token", "x-api-secret", "x-access-token", "x-access-secret", "telegram-bot-token", "telegram-chat-id"];
declare const OPTIONAL_CREDENTIALS: readonly ["openrouter-api-key"];
type RequiredCredential = typeof REQUIRED_CREDENTIALS[number];
type OptionalCredential = typeof OPTIONAL_CREDENTIALS[number];
type CredentialName = RequiredCredential | OptionalCredential;
/**
 * Custom error class for credential operations
 * Ensures sensitive data is never exposed in error messages
 */
export declare class CredentialError extends Error {
    readonly code: string;
    readonly credentialName?: string;
    readonly safeMessage: string;
    constructor(message: string, code: string, credentialName?: string);
}
export declare const credentials: {
    /**
     * Initialize the credential loader
     * Must be called once at application startup
     */
    initialize: () => Promise<void>;
    /**
     * Get a credential by name
     */
    get: (name: CredentialName) => string;
    /**
     * Get an optional credential (returns empty string if not found)
     */
    getOptional: (name: OptionalCredential) => string;
    /**
     * Check if credentials are loaded
     */
    isLoaded: () => boolean;
    /**
     * Clear cache (primarily for testing)
     */
    clearCache: () => void;
};
export declare const getAlpacaCredentials: () => {
    apiKey: string;
    secretKey: string;
};
export declare const getOpenRouterCredentials: () => {
    apiKey: string;
};
export declare const getOpenAICredentials: () => {
    apiKey: string;
};
export declare const getXCredentials: () => {
    apiKey: string;
    apiSecret: string;
    accessToken: string;
    accessSecret: string;
};
export declare const getTelegramCredentials: () => {
    botToken: string;
    chatId: string;
};
export default credentials;
//# sourceMappingURL=credentials.d.ts.map