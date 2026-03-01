/**
 * X Account Configuration - 30 Total Accounts
 * Organized by asset class for signal extraction
 */
export interface XAccount {
    handle: string;
    category: 'equity' | 'options' | 'crypto';
    weight: number;
    tags: string[];
}
export declare const xAccounts: XAccount[];
export declare const equityDayTradingAccounts: XAccount[];
export declare const optionsTradingAccounts: XAccount[];
export declare const cryptoTradingAccounts: XAccount[];
export declare function getAccountsByCategory(category: XAccount['category']): XAccount[];
export declare function getAccountByHandle(handle: string): XAccount | undefined;
export declare function getAllHandles(): string[];
export declare function getWeightedHandles(): string[];
//# sourceMappingURL=accounts.d.ts.map