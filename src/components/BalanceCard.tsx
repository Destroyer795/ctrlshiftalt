'use client';

import React, { useState } from 'react';
import { Wallet, Clock, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Balance Card Component - Enhanced for Offline-First
 * 
 * Implements the "Projected Balance" strategy from UI roadmap.
 * Key features:
 * - Shows calculated balance (server - pending_debits + pending_credits)
 * - Expandable breakdown for transparency
 * - Staleness indicator (> 24 hours)
 * - Yellow dot for pending transactions
 * - Trust signals through explicit math
 */

interface BalanceCardProps {
    shadowBalance: number;
    cachedBalance: number;
    pendingCount: number;
    pendingDebits?: number;
    pendingCredits?: number;
    isOnline: boolean;
    isStale?: boolean;
    lastSyncTime?: number;
    isLoading?: boolean;
}

export function BalanceCard({
    shadowBalance,
    cachedBalance,
    pendingCount,
    pendingDebits = 0,
    pendingCredits = 0,
    isOnline,
    isStale = false,
    lastSyncTime,
    isLoading
}: BalanceCardProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const hasPending = pendingCount > 0;
    const netPending = pendingCredits - pendingDebits;

    // Calculate staleness message
    const getStalenessMessage = () => {
        if (!lastSyncTime) return 'Never synced';
        const hoursSince = Math.floor((Date.now() - lastSyncTime) / (1000 * 60 * 60));
        if (hoursSince < 1) return 'Synced recently';
        if (hoursSince < 24) return `Synced ${hoursSince}h ago`;
        const daysSince = Math.floor(hoursSince / 24);
        return `Data is ${daysSince} day${daysSince > 1 ? 's' : ''} old`;
    };

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
        <motion.div 
            className={`glass-card p-6 relative overflow-hidden transition-all duration-300 ${
                isStale ? 'border-orange-500/30' : ''
            }`}
            whileHover={{ scale: 1.01 }}
            transition={{ type: 'spring', stiffness: 300 }}
        >
            {/* Background decoration */}
            <div className={`absolute -right-10 -top-10 w-40 h-40 rounded-full blur-3xl transition-colors duration-500 ${
                isStale ? 'bg-orange-500/10' : 'bg-indigo-500/10'
            }`}></div>

            {/* Header */}
            <div className="flex items-center justify-between mb-4 relative">
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Wallet className="w-6 h-6 text-indigo-400" />
                        {hasPending && (
                            <motion.div
                                className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full"
                                animate={{ scale: [1, 1.2, 1] }}
                                transition={{ repeat: Infinity, duration: 2 }}
                            />
                        )}
                    </div>
                    <span className="text-slate-400 text-sm uppercase tracking-wider font-medium">
                        {hasPending ? 'Projected Balance' : 'Available Balance'}
                    </span>
                </div>

                {hasPending && (
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                    >
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        <span>Details</span>
                    </button>
                )}
            </div>

            {/* Staleness Warning */}
            {isStale && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 mb-3 text-xs text-orange-400 bg-orange-500/10 px-3 py-2 rounded-lg"
                >
                    <AlertTriangle size={14} />
                    <span>{getStalenessMessage()}. Connect to update.</span>
                </motion.div>
            )}

            {/* Main Balance */}
            <motion.div 
                className="text-4xl md:text-5xl font-bold text-white mb-2 relative font-mono"
                key={shadowBalance}
                initial={{ scale: 1.05 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200 }}
            >
                {shadowBalance.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                <span className="text-2xl text-slate-500 ml-2">Rs</span>
                {hasPending && (
                    <span className="text-lg text-slate-600 ml-2">*</span>
                )}
            </motion.div>

            {/* Pending Summary Badge */}
            {hasPending && !isExpanded && (
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center gap-2 text-sm text-orange-400 mb-2"
                >
                    <Clock className="w-4 h-4" />
                    <span>
                        {pendingCount} transaction{pendingCount > 1 ? 's' : ''} pending
                        {netPending !== 0 && (
                            <span className="ml-1">
                                ({netPending > 0 ? '+' : ''}{netPending.toLocaleString()} Rs)
                            </span>
                        )}
                    </span>
                </motion.div>
            )}

            {/* Expandable Balance Breakdown */}
            <AnimatePresence>
                {isExpanded && hasPending && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="mt-4 pt-4 border-t border-white/5 space-y-2"
                    >
                        <div className="text-sm font-medium text-slate-300 mb-3">Balance Calculation:</div>
                        
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-400">Confirmed Balance</span>
                            <span className="text-slate-300 font-mono">
                                {cachedBalance.toLocaleString()} Rs
                            </span>
                        </div>

                        {pendingDebits > 0 && (
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-slate-400">Pending Outgoing</span>
                                <span className="text-red-400 font-mono">
                                    -{pendingDebits.toLocaleString()} Rs
                                </span>
                            </div>
                        )}

                        {pendingCredits > 0 && (
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-slate-400">Pending Incoming</span>
                                <span className="text-emerald-400 font-mono">
                                    +{pendingCredits.toLocaleString()} Rs
                                </span>
                            </div>
                        )}

                        <div className="flex items-center justify-between text-sm pt-2 border-t border-white/5">
                            <span className="text-slate-200 font-medium">Safe to Spend</span>
                            <span className="text-white font-bold font-mono">
                                {shadowBalance.toLocaleString()} Rs
                            </span>
                        </div>

                        <p className="text-xs text-slate-500 italic mt-2">
                            * This balance accounts for pending transactions that haven&apos;t synced yet.
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Sync Status */}
            <p className="text-slate-500 text-sm relative mt-2">
                {isOnline
                    ? hasPending
                        ? '↻ Syncing automatically...'
                        : '✓ All synced'
                    : '⏳ Will sync when online'}
            </p>
        </motion.div>
    );
}
