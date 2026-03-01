/**
 * Application Configuration
 *
 * NON-SENSITIVE configuration only.
 * All secrets are loaded from HashiCorp Vault via credentials.ts
 *
 * Security: This file contains NO secrets. Credentials are loaded
 * at runtime from ~/.openclaw/credentials/ (Vault filesystem)
 */
import { z } from 'zod';
export { PROMPTS, fillPromptTemplate } from './prompts.js';
// Schema for non-sensitive configuration
const configSchema = z.object({
    // Alpaca Configuration (non-sensitive only)
    alpacaEndpoint: z.string().url().default('https://paper-api.alpaca.markets'),
    // Trading Configuration
    paperTrading: z.boolean().default(true),
    basePositionSizeUsd: z.number().default(1000),
    maxPositionSizeUsd: z.number().default(5000),
    maxDailyLossUsd: z.number().default(500),
    // Agent Configuration
    debateDurationMs: z.number().default(180000),
    minConfidenceScore: z.number().default(2.5),
    maxRiskScore: z.number().default(8.0),
    // Database
    databasePath: z.string().default('./data/nagomi.db'),
    // Environment
    nodeEnv: z.enum(['development', 'production']).default('development'),
    logLevel: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
});
// Parse non-sensitive config from environment
// NOTE: Environment variables here are for NON-SENSITIVE config only
// All secrets are in Vault and loaded via credentials.ts
export const config = configSchema.parse({
    alpacaEndpoint: process.env.ALPACA_ENDPOINT,
    paperTrading: process.env.PAPER_TRADING === 'true',
    basePositionSizeUsd: parseInt(process.env.BASE_POSITION_SIZE_USD || '1000', 10),
    maxPositionSizeUsd: parseInt(process.env.MAX_POSITION_SIZE_USD || '5000', 10),
    maxDailyLossUsd: parseInt(process.env.MAX_DAILY_LOSS_USD || '500', 10),
    debateDurationMs: parseInt(process.env.DEBATE_DURATION_MS || '180000', 10),
    minConfidenceScore: parseFloat(process.env.MIN_CONFIDENCE_SCORE || '2.5'),
    maxRiskScore: parseFloat(process.env.MAX_RISK_SCORE || '8.0'),
    databasePath: process.env.DATABASE_PATH,
    nodeEnv: process.env.NODE_ENV,
    logLevel: process.env.LOG_LEVEL,
});
//# sourceMappingURL=index.js.map