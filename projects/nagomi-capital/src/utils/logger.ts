import winston from 'winston';
import { config } from '../config/index.js';

const { combine, timestamp, json, printf, colorize, errors } = winston.format;

// Custom format for console output
const consoleFormat = printf(({ level, message, timestamp, service, ...metadata }) => {
  const metaStr = Object.keys(metadata).length 
    ? ' ' + JSON.stringify(metadata, null, 0) 
    : '';
  return `${timestamp} [${service}] ${level}: ${message}${metaStr}`;
});

// Create logger instance
export const logger = winston.createLogger({
  level: config.logLevel,
  defaultMeta: { service: 'nagomi-capital' },
  format: combine(
    timestamp(),
    errors({ stack: true })
  ),
  transports: [
    // Write to all logs with level 'info' and below
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error',
      format: json()
    }),
    new winston.transports.File({ 
      filename: 'logs/combined.log',
      format: json()
    }),
  ],
});

// Add console transport in development
if (config.nodeEnv === 'development') {
  logger.add(new winston.transports.Console({
    format: combine(
      colorize(),
      timestamp({ format: 'HH:mm:ss' }),
      consoleFormat
    )
  }));
}

// Helper methods for structured logging
export function logSignal(
  asset: string,
  direction: string,
  confidence: number,
  source: string,
  metadata?: Record<string, unknown>
): void {
  logger.info('Signal detected', {
    asset,
    direction,
    confidence,
    source,
    ...metadata
  });
}

export function logTrade(
  asset: string,
  direction: string,
  size: number,
  price: number,
  status: 'pending' | 'filled' | 'rejected' | 'error',
  metadata?: Record<string, unknown>
): void {
  logger.info('Trade executed', {
    asset,
    direction,
    size,
    price,
    status,
    ...metadata
  });
}

export function logDebate(
  asset: string,
  bullScore: number,
  bearScore: number,
  flowScore: number,
  finalDecision: string,
  durationMs: number
): void {
  logger.info('Debate completed', {
    asset,
    bullScore,
    bearScore,
    flowScore,
    finalDecision,
    durationMs
  });
}

export function logError(
  error: Error,
  context?: Record<string, unknown>
): void {
  logger.error('Error occurred', {
    message: error.message,
    stack: error.stack,
    ...context
  });
}

export default logger;
