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
        console.error('❌ Sync error:', err);
        return null;
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
