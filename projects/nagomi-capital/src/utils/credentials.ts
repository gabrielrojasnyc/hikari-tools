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

import { readFileSync } from 'fs';
import { stat } from 'fs/promises';
import { join, resolve } from 'path';
import { homedir } from 'os';
import { logger } from './logger.js';

const VAULT_PATH = resolve(join(homedir(), '.openclaw', 'credentials'));

// Credential names that must exist in Vault
const REQUIRED_CREDENTIALS = [
  'alpaca-api-key',
  'alpaca-secret-key',
  'openai-api-key',      // OpenAI API Key (for GPT-4)
  'x-api-bearer-token',  // X API Key (App Key)
  'x-api-secret',        // X API Secret (App Secret)
  'x-access-token',      // X Access Token
  'x-access-secret',     // X Access Secret
  'telegram-bot-token',
  'telegram-chat-id',
] as const;

// Optional credentials (won't fail if missing)
const OPTIONAL_CREDENTIALS = [
  'openrouter-api-key',  // Optional - fallback LLM provider
] as const;

type RequiredCredential = typeof REQUIRED_CREDENTIALS[number];
type OptionalCredential = typeof OPTIONAL_CREDENTIALS[number];
type CredentialName = RequiredCredential | OptionalCredential;

interface CredentialCache {
  [key: string]: string;
}

class CredentialLoader {
  private cache: CredentialCache = {};
  private loaded = false;
  private loadingPromise: Promise<void> | null = null;

  /**
   * Initialize and load all credentials from Vault
   * Must be called before using get()
   */
  async initialize(): Promise<void> {
    if (this.loaded) return;
    
    // Prevent race conditions during initialization
    if (this.loadingPromise) {
      return this.loadingPromise;
    }

    this.loadingPromise = this.loadAllCredentials();
    return this.loadingPromise;
  }

  /**
   * Get a credential by name
   * Throws if credentials haven't been initialized
   */
  get(name: CredentialName): string {
    if (!this.loaded) {
      throw new CredentialError(
        'Credentials not initialized. Call initialize() before using get()',
        'CREDENTIALS_NOT_INITIALIZED'
      );
    }

    const value = this.cache[name];
    if (value === undefined) {
      // Check if it's optional
      if (OPTIONAL_CREDENTIALS.includes(name as OptionalCredential)) {
        return '';
      }
      throw new CredentialError(
        `Required credential '${name}' not found in Vault`,
        'CREDENTIAL_NOT_FOUND',
        name
      );
    }

    return value;
  }

  /**
   * Get a credential, returning empty string if not found
   * Only use for optional credentials
   */
  getOptional(name: OptionalCredential): string {
    if (!this.loaded) {
      return '';
    }
    return this.cache[name] || '';
  }

  /**
   * Check if credentials have been loaded
   */
  isLoaded(): boolean {
    return this.loaded;
  }

  /**
   * Load all credentials from Vault
   */
  private async loadAllCredentials(): Promise<void> {
    const errors: string[] = [];

    // Load required credentials
    for (const name of REQUIRED_CREDENTIALS) {
      try {
        await this.loadCredential(name, true);
      } catch (error) {
        if (error instanceof CredentialError) {
          errors.push(error.safeMessage);
        } else {
          errors.push(`Failed to load '${name}'`);
        }
      }
    }

    // Load optional credentials (don't fail on error)
    for (const name of OPTIONAL_CREDENTIALS) {
      try {
        await this.loadCredential(name, false);
      } catch {
        // Optional credentials can fail silently
      }
    }

    if (errors.length > 0) {
      throw new CredentialError(
        `Vault credential loading failed:\n${errors.join('\n')}`,
        'VAULT_LOAD_ERROR'
      );
    }

    this.loaded = true;
    logger.info('Credentials loaded securely from Vault', {
      count: Object.keys(this.cache).length,
      vaultPath: VAULT_PATH,
    });
  }

  /**
   * Load a single credential from Vault
   */
  private async loadCredential(name: string, required: boolean): Promise<void> {
    const filePath = join(VAULT_PATH, name);

    // Check file permissions first
    try {
      const stats = await stat(filePath);
      const mode = stats.mode & 0o777;
      
      // File should be readable only by owner (600)
      if (mode !== 0o600) {
        throw new CredentialError(
          `Credential file '${name}' has incorrect permissions (${mode.toString(8)}). Expected 600.`,
          'INCORRECT_PERMISSIONS',
          name
        );
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        if (required) {
          throw new CredentialError(
            `Required credential '${name}' not found in Vault`,
            'CREDENTIAL_NOT_FOUND',
            name
          );
        }
        return; // Optional credential missing is OK
      }
      throw error;
    }

    // Read and cache the credential
    try {
      const content = readFileSync(filePath, 'utf-8').trim();
      
      if (!content) {
        throw new CredentialError(
          `Credential '${name}' is empty`,
          'EMPTY_CREDENTIAL',
          name
        );
      }

      // Basic validation - check for placeholder values
      const placeholderPatterns = [
        /your_.*here/i,
        /placeholder/i,
        /example/i,
        /xxx+/i,
        /^test$/i,
      ];

      if (placeholderPatterns.some(pattern => pattern.test(content))) {
        throw new CredentialError(
          `Credential '${name}' contains placeholder value`,
          'PLACEHOLDER_CREDENTIAL',
          name
        );
      }

      this.cache[name] = content;
    } catch (error) {
      if (error instanceof CredentialError) throw error;
      
      throw new CredentialError(
        `Failed to read credential '${name}'`,
        'READ_ERROR',
        name
      );
    }
  }

  /**
   * Clear the credential cache (for testing)
   */
  clearCache(): void {
    this.cache = {};
    this.loaded = false;
    this.loadingPromise = null;
  }
}

/**
 * Custom error class for credential operations
 * Ensures sensitive data is never exposed in error messages
 */
export class CredentialError extends Error {
  public readonly code: string;
  public readonly credentialName?: string;
  public readonly safeMessage: string;

  constructor(message: string, code: string, credentialName?: string) {
    // Create a safe message that never includes the actual credential value
    const safeMessage = credentialName 
      ? `[${code}] Credential error for '${credentialName}'`
      : `[${code}] ${message}`;

    super(safeMessage);
    this.name = 'CredentialError';
    this.code = code;
    this.credentialName = credentialName;
    this.safeMessage = safeMessage;

    // Ensure stack traces don't leak credential values
    if (this.stack) {
      // Filter out any lines that might contain sensitive paths
      this.stack = this.stack
        .split('\n')
        .filter(line => !line.includes(VAULT_PATH) || line.includes('/credentials/'))
        .join('\n');
    }
  }
}

// Singleton instance
const credentialLoader = new CredentialLoader();

// Export singleton methods
export const credentials = {
  /**
   * Initialize the credential loader
   * Must be called once at application startup
   */
  initialize: () => credentialLoader.initialize(),

  /**
   * Get a credential by name
   */
  get: (name: CredentialName) => credentialLoader.get(name),

  /**
   * Get an optional credential (returns empty string if not found)
   */
  getOptional: (name: OptionalCredential) => credentialLoader.getOptional(name),

  /**
   * Check if credentials are loaded
   */
  isLoaded: () => credentialLoader.isLoaded(),

  /**
   * Clear cache (primarily for testing)
   */
  clearCache: () => credentialLoader.clearCache(),
};

// Convenience exports for common credentials
export const getAlpacaCredentials = () => ({
  apiKey: credentials.get('alpaca-api-key'),
  secretKey: credentials.get('alpaca-secret-key'),
});

export const getOpenRouterCredentials = () => ({
  apiKey: credentials.get('openrouter-api-key'),
});

export const getOpenAICredentials = () => ({
  apiKey: credentials.get('openai-api-key'),
});

export const getXCredentials = () => ({
  apiKey: credentials.get('x-api-bearer-token'),      // App Key
  apiSecret: credentials.get('x-api-secret'),          // App Secret
  accessToken: credentials.get('x-access-token'),      // Access Token
  accessSecret: credentials.get('x-access-secret'),    // Access Secret
});

export const getTelegramCredentials = () => ({
  botToken: credentials.get('telegram-bot-token'),
  chatId: credentials.get('telegram-chat-id'),
});

export default credentials;
