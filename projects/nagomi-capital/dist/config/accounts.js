/**
 * X Account Configuration - 30 Total Accounts
 * Organized by asset class for signal extraction
 */
// Equity Day Trading (10 accounts)
const equityAccounts = [
    { handle: 'modestproposal1', category: 'equity', weight: 8, tags: ['price_action', 'technical_analysis', 'swing_trading'] },
    { handle: 'dampedspring', category: 'equity', weight: 7, tags: ['macro', 'market_structure', 'flows'] },
    { handle: 'Mr_Derivatives', category: 'equity', weight: 9, tags: ['options_flow', 'unusual_volume', 'gamma'] },
    { handle: 'choffstein', category: 'equity', weight: 7, tags: ['quant', 'risk_parity', 'volatility'] },
    { handle: 'priceactionkim', category: 'equity', weight: 8, tags: ['price_action', 'volume', 'support_resistance'] },
    { handle: 'peterlbrandt', category: 'equity', weight: 8, tags: ['classical_charting', 'commodities', 'futures'] },
    { handle: 'sjosephburns', category: 'equity', weight: 8, tags: ['macro', 'education', 'trading_psychology'] },
    { handle: 'I_Am_The_ICT', category: 'equity', weight: 9, tags: ['ict_concepts', 'smart_money', 'institutional'] },
    { handle: 'garethsoloway', category: 'equity', weight: 8, tags: ['technical_analysis', 'market_analysis', 'institutional'] },
    { handle: 'traderstewie', category: 'equity', weight: 8, tags: ['technical_analysis', 'patterns', 'swing_trading'] },
];
// Options Trading (10 accounts)
const optionsAccounts = [
    { handle: 'OptionsHawk', category: 'options', weight: 9, tags: ['unusual_volume', 'sweeps', 'flow_alerts'] },
    { handle: 'unusual_whales', category: 'options', weight: 10, tags: ['flow_data', 'sweeps', 'institutional'] },
    { handle: '3PeaksTrading', category: 'options', weight: 8, tags: ['sentiment', 'breadth', 'market_analysis'] },
    { handle: 'thetaflow', category: 'options', weight: 8, tags: ['options_flow', 'greeks', 'theta'] },
    { handle: 'tradernickybat', category: 'options', weight: 8, tags: ['options_scalping', 'day_trading', 'flow'] },
    { handle: 'CheddarFlow', category: 'options', weight: 8, tags: ['options_flow', 'alerts', 'unusual_volume'] },
    { handle: 'patrickrooney', category: 'options', weight: 7, tags: ['options_education', 'risk_management', 'greeks'] },
    { handle: 'SweepCast', category: 'options', weight: 8, tags: ['sweeps', 'flow_alerts', 'institutional'] },
    { handle: 'Tradytics', category: 'options', weight: 8, tags: ['options_flow', 'unusual_volume', 'analytics'] },
    { handle: 'gcitrading', category: 'options', weight: 7, tags: ['options_scanner', 'alerts', 'technical'] },
];
// Crypto Trading (10 accounts)
const cryptoAccounts = [
    { handle: 'lookonchain', category: 'crypto', weight: 10, tags: ['on_chain', 'whale_tracking', 'smart_money'] },
    { handle: 'whale_alert', category: 'crypto', weight: 10, tags: ['whale_alerts', 'large_transfers', 'institutional'] },
    { handle: 'CryptoCred', category: 'crypto', weight: 9, tags: ['technical_analysis', 'education', 'trading_psychology'] },
    { handle: 'glassnode', category: 'crypto', weight: 9, tags: ['on_chain_data', 'market_indicators', 'analytics'] },
    { handle: 'SmartContracter', category: 'crypto', weight: 8, tags: ['elliott_wave', 'technical_analysis', 'btc'] },
    { handle: 'DonAlt', category: 'crypto', weight: 9, tags: ['crypto_trading', 'market_analysis', 'sentiment'] },
    { handle: 'Ansem', category: 'crypto', weight: 7, tags: ['solana', 'altcoins', 'narrative_trading'] },
    { handle: 'TylerSCrypto', category: 'crypto', weight: 8, tags: ['macro_crypto', 'market_cycles', 'btc'] },
    { handle: 'Ash_crypto', category: 'crypto', weight: 8, tags: ['crypto_trading', 'market_analysis', 'altcoins'] },
    { handle: 'CredibleCrypto', category: 'crypto', weight: 8, tags: ['technical_analysis', 'btc', 'market_structure'] },
];
// Export all accounts
export const xAccounts = [
    ...equityAccounts,
    ...optionsAccounts,
    ...cryptoAccounts,
];
// Export by category
export const equityDayTradingAccounts = equityAccounts;
export const optionsTradingAccounts = optionsAccounts;
export const cryptoTradingAccounts = cryptoAccounts;
// Helper functions
export function getAccountsByCategory(category) {
    return xAccounts.filter(acc => acc.category === category);
}
export function getAccountByHandle(handle) {
    return xAccounts.find(acc => acc.handle.toLowerCase() === handle.toLowerCase());
}
export function getAllHandles() {
    return xAccounts.map(acc => acc.handle);
}
export function getWeightedHandles() {
    // Return handles repeated by weight for sampling
    const weighted = [];
    for (const acc of xAccounts) {
        for (let i = 0; i < acc.weight; i++) {
            weighted.push(acc.handle);
        }
    }
    return weighted;
}
//# sourceMappingURL=accounts.js.map