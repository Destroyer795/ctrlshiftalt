'use client';

import React from 'react';
import { Wifi, WifiOff, Cloud, CloudOff, RefreshCw, Loader2 } from 'lucide-react';

/**
 * Network Status Bar Component
 * 
 * Shows current network status and sync state.
 * Member C/D can enhance with:
 * - Network quality indicator
 * - Last sync time
 * - Auto-sync toggle
 */

interface NetworkStatusProps {
    isOnline: boolean;
    pendingCount: number;
    syncStatus?: 'idle' | 'syncing' | 'success' | 'error';
    onSyncClick?: () => void;
}

export function NetworkStatus({
    isOnline,
    pendingCount,
    syncStatus = 'idle',
    onSyncClick
}: NetworkStatusProps) {
    return (
        <div className="glass-card p-3 flex items-center justify-between">
            {/* Online/Offline Status */}
            <div className={`flex items-center gap-2 ${isOnline ? 'text-emerald-400' : 'text-orange-400'}`}>
                {isOnline ? (
                    <Wifi className="w-4 h-4" />
                ) : (
                    <WifiOff className="w-4 h-4" />
                )}
                <span className="text-sm font-medium">
                    {isOnline ? 'Online' : 'Offline'}
                </span>
            </div>

            {/* Pending Transactions */}
            {pendingCount > 0 && (
                <div className="flex items-center gap-2 text-orange-400">
                    <CloudOff className="w-4 h-4" />
                    <span className="text-sm">{pendingCount} pending</span>
                </div>
            )}

            {/* Sync Status */}
            {pendingCount === 0 && isOnline && (
                <div className="flex items-center gap-2 text-emerald-400">
                    <Cloud className="w-4 h-4" />
                    <span className="text-sm">All synced</span>
                </div>
            )}

            {/* Sync Button */}
            {isOnline && pendingCount > 0 && onSyncClick && (
                <button
                    onClick={onSyncClick}
                    disabled={syncStatus === 'syncing'}
                    className="flex items-center gap-2 px-3 py-1.5 bg-indigo-500/20 hover:bg-indigo-500/30 rounded-lg text-indigo-400 text-sm font-medium transition-colors disabled:opacity-50"
                >
                    {syncStatus === 'syncing' ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <RefreshCw className="w-4 h-4" />
                    )}
                    Sync Now
                </button>
            )}
        </div>
    );
}
