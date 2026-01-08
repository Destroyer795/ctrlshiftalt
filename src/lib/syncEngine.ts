'use client';

/**
 * Sync Engine - The Bridge Between Offline and Online
 * 
 * This module handles synchronization of offline transactions with Supabase.
 * It implements:
 * - Batch syncing of pending transactions
 * - Balance reconciliation
 * - Error handling and retry logic
 * 
 * Member B should implement the full logic here.
 */

import { db, getPendingTransactions, markTransactionsSynced, updateWalletState } from './db';
import { supabase, isSupabaseConfigured } from './supabase';
import type { SyncResponse, WalletState } from './types';

/**
 * Sync all pending offline transactions to Supabase
 * 
 * @param userId - User's Supabase ID
 * @returns SyncResponse with processed and failed transaction IDs
 */
export async function syncOfflineTransactions(userId: string): Promise<SyncResponse | null> {
    // Check if we're online
    if (typeof window === 'undefined' || !navigator.onLine) {
        console.log('📴 Offline - sync skipped');
        return null;
    }

    // Check if Supabase is configured
    if (!isSupabaseConfigured()) {
        console.warn('⚠️ Supabase not configured - sync skipped');
        return null;
    }

    try {
        // Get all pending transactions
        const pending = await getPendingTransactions(userId);

        if (pending.length === 0) {
            console.log('✅ No pending transactions to sync');
            return { processed_ids: [], failed_ids: [], new_balance: 0 };
        }

        console.log(`🔄 Syncing ${pending.length} transactions...`);

        // DEBUG: Log the exact payload to verify recipient_id is present
        console.log('📦 Sync Payload:', JSON.stringify({ transactions: pending }, null, 2));
        pending.forEach((tx, i) => {
            console.log(`  Transaction ${i + 1}: type=${tx.type}, amount=${tx.amount}, recipient_id=${tx.recipient_id || 'NONE'}`);
        });

        // Call the Supabase RPC function to process batch
        const { data, error } = await supabase.rpc('process_offline_batch', {
            payload: { transactions: pending }
        });

        if (error) {
            console.error('❌ Sync failed:', error);
            throw error;
        }

        const response = data as SyncResponse;

        // Mark synced transactions locally
        if (response.processed_ids.length > 0) {
            await markTransactionsSynced(response.processed_ids);
            console.log(`✅ Synced ${response.processed_ids.length} transactions`);
        }

        // Update local wallet state with new balance
        if (response.new_balance !== undefined) {
            const walletState: WalletState = {
                id: userId,
                cached_balance: response.new_balance,
                shadow_balance: response.new_balance, // Reset shadow to actual after sync
                last_updated: Date.now()
            };
            await updateWalletState(walletState);
        }

        return response;
    } catch (err) {
        // BUG-05 Fix: Re-throw error so callers can handle it
        console.error('❌ Sync error:', err);
        throw err; // Propagate error to caller for proper handling
    }
}

/**
 * Fetch the latest balance from the server
 * 
 * @param userId - User's Supabase ID
 * @returns The user's current balance or null if offline/error
 */
export async function fetchServerBalance(userId: string): Promise<number | null> {
    if (typeof window === 'undefined' || !navigator.onLine) {
        return null;
    }

    if (!isSupabaseConfigured()) {
        return null;
    }

    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('balance')
            .eq('id', userId)
            .single();

        if (error) throw error;
        return data?.balance ?? null;
    } catch (err) {
        console.error('Failed to fetch balance:', err);
        return null;
    }
}

/**
 * Fetch historical transactions from the server
 * 
 * @param userId - User's Supabase ID
 * @param limit - Maximum number of transactions to fetch
 */
export async function fetchServerTransactions(userId: string, limit: number = 50) {
    if (typeof window === 'undefined' || !navigator.onLine) {
        return null;
    }

    if (!isSupabaseConfigured()) {
        return null;
    }

    try {
        const { data, error } = await supabase
            .from('transactions')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) throw error;
        return data;
    } catch (err) {
        console.error('Failed to fetch transactions:', err);
        return null;
    }
}
/**
 * Full Sync: Download latest state from Server to Local DB
 * 
 * Used when:
 * 1. App loads
 * 2. User comes online
 * 3. Incoming P2P transaction notification received
 */
export async function syncWalletFromServer(userId: string): Promise<void> {
    if (typeof window === 'undefined' || !navigator.onLine || !isSupabaseConfigured()) {
        return;
    }

    try {
        console.log('⬇️ Starting Down-Sync...');

        // 1. Fetch Balance
        const balance = await fetchServerBalance(userId);
        if (balance !== null) {
            const currentWallet = await db.wallet.get(userId);
            await updateWalletState({
                id: userId,
                // If we have pending local txs, shadow might differ, but cached_balance is truth from server
                cached_balance: balance,
                shadow_balance: balance, // simplified strategy: server authority reset
                // In a perfect CRDT world we'd replay pending on top, 
                // but for this P2P update, resetting to server balance is safer to see the incoming money immediately.
                // We will re-apply pending debits if any exist.
                last_updated: Date.now(),
                last_sync_success: Date.now()
            });

            // Re-apply pending debits to shadow balance so we don't think we have more money than we do
            const { updateWalletPendingAmounts } = require('./db');
            await updateWalletPendingAmounts(userId);
        }

        // 2. Fetch Recent Transactions
        const serverTxs = await fetchServerTransactions(userId, 20); // Get last 20
        if (serverTxs && serverTxs.length > 0) {
            const formattedTxs = serverTxs.map((tx: any) => ({
                offline_id: tx.offline_id,
                user_id: tx.user_id,
                amount: tx.amount,
                type: tx.type,
                description: tx.description,
                timestamp: new Date(tx.created_at).getTime(), // Convert ISO to timestamp
                sync_status: 'synced' as const,
                signature: tx.signature || 'server-auth',
                created_at: tx.created_at
            }));

            // Bulk put (upsert) to Dexie
            // This ensures new incoming P2P txs appear in the list
            await db.transactions.bulkPut(formattedTxs);
            console.log(`⬇️ Downloaded ${serverTxs.length} transactions`);
        }

    } catch (err) {
        console.error('❌ Down-Sync failed:', err);
    }
}
