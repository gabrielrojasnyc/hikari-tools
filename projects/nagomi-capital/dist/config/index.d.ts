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
export { PROMPTS, fillPromptTemplate, type PromptContext } from './prompts.js';
declare const configSchema: z.ZodObject<{
    alpacaEndpoint: z.ZodDefault<z.ZodString>;
    paperTrading: z.ZodDefault<z.ZodBoolean>;
    basePositionSizeUsd: z.ZodDefault<z.ZodNumber>;
    maxPositionSizeUsd: z.ZodDefault<z.ZodNumber>;
    maxDailyLossUsd: z.ZodDefault<z.ZodNumber>;
    debateDurationMs: z.ZodDefault<z.ZodNumber>;
    minConfidenceScore: z.ZodDefault<z.ZodNumber>;
    maxRiskScore: z.ZodDefault<z.ZodNumber>;
    databasePath: z.ZodDefault<z.ZodString>;
    nodeEnv: z.ZodDefault<z.ZodEnum<["development", "production"]>>;
    logLevel: z.ZodDefault<z.ZodEnum<["error", "warn", "info", "debug"]>>;
}, "strip", z.ZodTypeAny, {
    alpacaEndpoint: string;
    paperTrading: boolean;
    basePositionSizeUsd: number;
    maxPositionSizeUsd: number;
    maxDailyLossUsd: number;
    debateDurationMs: number;
    minConfidenceScore: number;
    maxRiskScore: number;
    databasePath: string;
    nodeEnv: "development" | "production";
    logLevel: "error" | "warn" | "info" | "debug";
}, {
    alpacaEndpoint?: string | undefined;
    paperTrading?: boolean | undefined;
    basePositionSizeUsd?: number | undefined;
    maxPositionSizeUsd?: number | undefined;
    maxDailyLossUsd?: number | undefined;
    debateDurationMs?: number | undefined;
    minConfidenceScore?: number | undefined;
    maxRiskScore?: number | undefined;
    databasePath?: string | undefined;
    nodeEnv?: "development" | "production" | undefined;
    logLevel?: "error" | "warn" | "info" | "debug" | undefined;
}>;
export declare const config: {
    alpacaEndpoint: string;
    paperTrading: boolean;
    basePositionSizeUsd: number;
    maxPositionSizeUsd: number;
    maxDailyLossUsd: number;
    debateDurationMs: number;
    minConfidenceScore: number;
    maxRiskScore: number;
    databasePath: string;
    nodeEnv: "development" | "production";
    logLevel: "error" | "warn" | "info" | "debug";
};
export type Config = z.infer<typeof configSchema>;
//# sourceMappingURL=index.d.ts.map