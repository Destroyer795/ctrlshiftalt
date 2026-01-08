'use client';

import { useState, useEffect, useCallback } from 'react';
import { syncOfflineTransactions } from '@/lib/syncEngine';

/**
 * useOnlineStatus Hook
 * 
 * Tracks online/offline status and triggers sync when coming back online.
 * Member B/D can enhance with:
 * - Network quality detection
 * - Sync retry logic with exponential backoff
 */

interface UseOnlineStatusResult {
    isOnline: boolean;
    lastOnlineAt: number | null;
    syncStatus: 'idle' | 'syncing' | 'success' | 'error';
    triggerSync: (userId: string) => Promise<void>;
}

export function useOnlineStatus(): UseOnlineStatusResult {
    const [isOnline, setIsOnline] = useState(true);
    const [lastOnlineAt, setLastOnlineAt] = useState<number | null>(null);
    const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');

    const triggerSync = useCallback(async (userId: string) => {
        if (!navigator.onLine) return;

        setSyncStatus('syncing');
        try {
            await syncOfflineTransactions(userId);
            setSyncStatus('success');
            setTimeout(() => setSyncStatus('idle'), 2000);
        } catch {
            setSyncStatus('error');
            setTimeout(() => setSyncStatus('idle'), 3000);
        }
    }, []);

    useEffect(() => {
        setIsOnline(navigator.onLine);
        if (navigator.onLine) {
            setLastOnlineAt(Date.now());
        }

        const handleOnline = () => {
            setIsOnline(true);
            setLastOnlineAt(Date.now());
        };

        const handleOffline = () => {
            setIsOnline(false);
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    return {
        isOnline,
        lastOnlineAt,
        syncStatus,
        triggerSync
    };
}
