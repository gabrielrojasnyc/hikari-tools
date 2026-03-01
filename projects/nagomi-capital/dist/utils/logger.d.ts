import winston from 'winston';
export declare const logger: winston.Logger;
export declare function logSignal(asset: string, direction: string, confidence: number, source: string, metadata?: Record<string, unknown>): void;
export declare function logTrade(asset: string, direction: string, size: number, price: number, status: 'pending' | 'filled' | 'rejected' | 'error', metadata?: Record<string, unknown>): void;
export declare function logDebate(asset: string, bullScore: number, bearScore: number, flowScore: number, finalDecision: string, durationMs: number): void;
export declare function logError(error: Error, context?: Record<string, unknown>): void;
export default logger;
//# sourceMappingURL=logger.d.ts.map