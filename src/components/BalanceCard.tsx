'use client';

import React from 'react';
import { Wallet, TrendingUp, TrendingDown, Clock } from 'lucide-react';

/**
 * Balance Card Component
 * 
 * Displays the shadow balance with pending transaction info.
 * Member C should enhance with:
 * - Animations for balance changes
 * - Currency selector
 * - Balance history sparkline
 */

interface BalanceCardProps {
    shadowBalance: number;
    cachedBalance: number;
    pendingCount: number;
    isOnline: boolean;
    isLoading?: boolean;
}

export function BalanceCard({
    shadowBalance,
    cachedBalance,
    pendingCount,
    isOnline,
    isLoading
}: BalanceCardProps) {
    const pendingDiff = cachedBalance - shadowBalance;
    const hasPending = pendingCount > 0;

    if (isLoading) {
        return (
            <div className="glass-card p-6 animate-pulse">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-6 h-6 bg-slate-700 rounded"></div>
                    <div className="h-4 w-24 bg-slate-700 rounded"></div>
                </div>
                <div className="h-12 w-48 bg-slate-700 rounded mb-2"></div>
                <div className="h-4 w-32 bg-slate-800 rounded"></div>
            </div>
        );
    }

    return (
        <div className="glass-card p-6 relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute -right-10 -top-10 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl"></div>

            {/* Header */}
            <div className="flex items-center gap-3 mb-4 relative">
                <Wallet className="w-6 h-6 text-indigo-400" />
                <span className="text-slate-400 text-sm uppercase tracking-wider font-medium">
                    {hasPending ? 'Safe Balance' : 'Balance'}
                </span>
                {hasPending && (
                    <span className="text-xs text-orange-400 bg-orange-500/20 px-2 py-0.5 rounded-full">
                        {pendingCount} pending
                    </span>
                )}
            </div>

            {/* Main Balance */}
            <div className="text-4xl md:text-5xl font-bold text-white mb-2 relative">
                {shadowBalance.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                <span className="text-2xl text-slate-500 ml-2">сом</span>
            </div>

            {/* Pending Info */}
            {hasPending && (
                <div className="flex items-center gap-2 text-sm text-orange-400 mb-2">
                    <Clock className="w-4 h-4" />
                    <span>
                        {pendingDiff > 0 ? (
                            <>-{pendingDiff.toLocaleString()} pending sync</>
                        ) : (
                            <>+{Math.abs(pendingDiff).toLocaleString()} pending sync</>
                        )}
                    </span>
                </div>
            )}

            {/* Sync Status */}
            <p className="text-slate-500 text-sm relative">
                {isOnline
                    ? hasPending
                        ? '↻ Will sync automatically when possible'
                        : '✓ Synced with server'
                    : '⏳ Will sync when online'}
            </p>

            {/* Server Balance (if different) */}
            {hasPending && (
                <div className="mt-4 pt-4 border-t border-white/5">
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-500">Last known server balance</span>
                        <span className="text-slate-400 font-medium">
                            {cachedBalance.toLocaleString()} сом
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
}
