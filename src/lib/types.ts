// ============================================
// PHANTOM PAY - SHARED TYPES
// These types are shared across the application
// ============================================

/**
 * Transaction types
 */
export type TransactionType = 'credit' | 'debit';

/**
 * Sync status for offline transactions
 */
export type SyncStatus = 'pending' | 'synced' | 'failed';

/**
 * Offline Transaction stored in Dexie (IndexedDB)
 */
export interface OfflineTransaction {
    id?: number; // Auto-increment for local indexing
    offline_id: string; // UUID v4 generated on client - IDEMPOTENCY KEY
    user_id: string; // User's Supabase ID
    amount: number;
    type: TransactionType;
    description: string;
    timestamp: number; // Unix timestamp
    signature: string; // SHA256(offline_id + user_id + amount + timestamp + salt)
    sync_status: SyncStatus;
    created_at: string; // ISO string
}

/**
 * Local wallet state stored in Dexie
 */
export interface WalletState {
    id: string; // User ID
    cached_balance: number; // Last known balance from server
    shadow_balance: number; // Real effective balance (cached - pending debits)
    last_updated: number; // Unix timestamp
}

/**
 * Transaction from Supabase (server)
 */
export interface ServerTransaction {
    id: string; // UUID
    user_id: string;
    amount: number;
    type: TransactionType;
    description: string;
    status: SyncStatus;
    offline_id: string;
    signature: string;
    created_at: string;
}

/**
 * User profile from Supabase
 */
export interface UserProfile {
    id: string;
    username: string | null;
    balance: number;
    last_synced_at: string | null;
    created_at: string;
}

/**
 * Payload for batch sync RPC
 */
export interface SyncPayload {
    transactions: OfflineTransaction[];
}

/**
 * Response from batch sync RPC
 */
export interface SyncResponse {
    processed_ids: string[];
    failed_ids: { offline_id: string; reason: string }[];
    new_balance: number;
}

/**
 * QR Payment data structure
 */
export interface QRPaymentData {
    recipient_id: string;
    recipient_name?: string;
    amount?: number;
    timestamp: number;
    signature: string;
}
