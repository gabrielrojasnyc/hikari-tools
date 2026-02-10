import { logger } from './logger.js';
import { getTelegramCredentials } from './credentials.js';

/**
 * Telegram notification utility
 * Sends alerts for important events
 * 
 * Credentials loaded from Vault via credentials.ts
 */

let telegramConfig: { botToken: string; chatId: string } | null = null;

/**
 * Initialize Telegram configuration
 * Called once at startup after credentials are loaded
 */
export function initializeTelegram(): void {
  try {
    telegramConfig = getTelegramCredentials();
  } catch (error) {
    logger.warn('Telegram not configured - alerts will be skipped', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    telegramConfig = null;
  }
}

export async function sendTelegramAlert(message: string, parseMode: 'Markdown' | 'HTML' = 'Markdown'): Promise<boolean> {
  // Lazy initialization if not already done
  if (!telegramConfig) {
    initializeTelegram();
  }

  if (!telegramConfig || !telegramConfig.botToken || !telegramConfig.chatId) {
    logger.debug('Telegram not configured, skipping alert');
    return false;
  }

  // Security: Never log the full bot token
  const url = `https://api.telegram.org/bot${telegramConfig.botToken}/sendMessage`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: telegramConfig.chatId,
        text: message,
        parse_mode: parseMode,
        disable_web_page_preview: true
      })
    });

    if (!response.ok) {
      // Don't log error details that might contain sensitive info
      logger.error('Failed to send Telegram alert', { 
        status: response.status,
        statusText: response.statusText
      });
      return false;
    }

    return true;
  } catch (error) {
    logger.error('Error sending Telegram alert', { 
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return false;
  }
}

export async function alertNewSignal(
  asset: string,
  direction: string,
  confidence: number,
  source: string
): Promise<void> {
  const emoji = direction === 'LONG' ? '🟢' : direction === 'SHORT' ? '🔴' : '⚪';
  const message = `${emoji} **New Signal Detected**\n\n` +
    `**Asset:** ${asset}\n` +
    `**Direction:** ${direction}\n` +
    `**Confidence:** ${confidence}/10\n` +
    `**Source:** ${source}\n\n` +
    `_Debate starting..._`;
  
  await sendTelegramAlert(message);
}

export async function alertTradeDecision(
  asset: string,
  direction: string,
  positionSize: number,
  confidenceScore: number,
  conviction: number,
  risk: number
): Promise<void> {
  const emoji = direction === 'LONG' ? '🚀' : direction === 'SHORT' ? '🐻' : '⏸️';
  const message = `${emoji} **Trade Decision**\n\n` +
    `**Asset:** ${asset}\n` +
    `**Direction:** ${direction}\n` +
    `**Position Size:** $${positionSize.toLocaleString()}\n` +
    `**Confidence Score:** ${confidenceScore.toFixed(2)}\n` +
    `**Conviction/Risk:** ${conviction}/${risk}\n\n` +
    (direction === 'NO_TRADE' 
      ? '_Trade rejected based on debate consensus_' 
      : '_Executing via Alpaca paper..._');
  
  await sendTelegramAlert(message);
}

export async function alertKillCriteria(
  trigger: string,
  action: string,
  details?: Record<string, unknown>
): Promise<void> {
  const message = `🛑 **KILL CRITERIA TRIGGERED**\n\n` +
    `**Trigger:** ${trigger}\n` +
    `**Action:** ${action}\n` +
    (details ? `\n**Details:**\n${JSON.stringify(details, null, 2)}` : '');
  
  await sendTelegramAlert(message);
}

export async function alertTradeExecuted(
  asset: string,
  direction: string,
  filledQty: number,
  filledPrice: number,
  orderId: string
): Promise<void> {
  const message = `✅ **Trade Executed**\n\n` +
    `**Asset:** ${asset}\n` +
    `**Direction:** ${direction}\n` +
    `**Quantity:** ${filledQty}\n` +
    `**Fill Price:** $${filledPrice.toFixed(2)}\n` +
    `**Order ID:** ${orderId}`;
  
  await sendTelegramAlert(message);
}

export async function alertError(
  context: string,
  error: string
): Promise<void> {
  const message = `⚠️ **Error Alert**\n\n` +
    `**Context:** ${context}\n` +
    `**Error:** ${error}\n\n` +
    `_Check logs for details_`;
  
  await sendTelegramAlert(message);
}

export interface DailyPnlSummary {
  date: string;
  totalPnl: number;
  realizedPnl: number;
  unrealizedPnl: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  portfolioValue: number;
  drawdownPercent: number;
}

export async function alertDailyPnl(summary: DailyPnlSummary): Promise<void> {
  const pnlEmoji = summary.totalPnl >= 0 ? '🟢' : '🔴';
  const pnlSign = summary.totalPnl >= 0 ? '+' : '';
  
  const message = `${pnlEmoji} **Daily P&L Summary**\n\n` +
    `**Date:** ${summary.date}\n` +
    `**Total P&L:** ${pnlSign}$${summary.totalPnl.toFixed(2)}\n` +
    `**Realized:** $${summary.realizedPnl.toFixed(2)}\n` +
    `**Unrealized:** $${summary.unrealizedPnl.toFixed(2)}\n\n` +
    `**Trades:** ${summary.totalTrades}\n` +
    `**Wins:** ${summary.winningTrades} | **Losses:** ${summary.losingTrades}\n` +
    `**Win Rate:** ${(summary.winRate * 100).toFixed(1)}%\n\n` +
    `**Portfolio:** $${summary.portfolioValue.toLocaleString()}\n` +
    `**Drawdown:** ${summary.drawdownPercent.toFixed(2)}%`;
  
  await sendTelegramAlert(message);
}

export async function alertSystemStatus(
  status: 'started' | 'stopped' | 'healthy' | 'unhealthy',
  details?: Record<string, unknown>
): Promise<void> {
  const emoji = status === 'started' ? '🚀' : status === 'stopped' ? '🛑' : 
                status === 'healthy' ? '💚' : '❤️';
  
  const statusText = status.charAt(0).toUpperCase() + status.slice(1);
  
  let message = `${emoji} **System ${statusText}**\n\n`;
  
  if (details) {
    message += Object.entries(details)
      .map(([key, value]) => `**${key}:** ${value}`)
      .join('\n');
  }
  
  await sendTelegramAlert(message);
}
