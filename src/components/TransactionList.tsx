'use client';

import React from 'react';
import { CheckCircle2, CloudOff, Clock, AlertCircle } from 'lucide-react';
import type { OfflineTransaction } from '@/lib/types';

/**
 * Transaction List Component
 * 
 * Displays transactions with visual distinction for sync status.
 * Member C should enhance with:
 * - Animations (Framer Motion)
 * - Pull to refresh
 * - Infinite scroll
 * - Date grouping
 */

interface TransactionListProps {
    transactions: OfflineTransaction[];
    isLoading?: boolean;
}

export function TransactionList({ transactions, isLoading }: TransactionListProps) {
    if (isLoading) {
        return (
            <div className="flex flex-col gap-3">
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="glass-card p-4 animate-pulse">
                        <div className="flex items-center justify-between">
                            <div className="space-y-2">
                                <div className="h-4 w-32 bg-slate-700 rounded"></div>
                                <div className="h-3 w-24 bg-slate-800 rounded"></div>
                            </div>
                            <div className="h-6 w-20 bg-slate-700 rounded"></div>
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    if (transactions.length === 0) {
        return (
            <div className="text-center py-12 text-slate-500 italic">
                <p className="mb-2">No transactions yet</p>
                <p className="text-sm">Make your first payment to get started!</p>
            </div>
        );
    }

    // Sort by timestamp descending
    const sorted = [...transactions].sort((a, b) => b.timestamp - a.timestamp);

    return (
        <div className="flex flex-col gap-3">
            {sorted.map((tx) => (
                <TransactionItem key={tx.offline_id} transaction={tx} />
            ))}
        </div>
    );
}

interface TransactionItemProps {
    transaction: OfflineTransaction;
}

function TransactionItem({ transaction: tx }: TransactionItemProps) {
    const isDebit = tx.type === 'debit';
    const formattedAmount = tx.amount.toLocaleString();
    const formattedDate = new Date(tx.timestamp).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    const statusConfig = {
        synced: {
            icon: <CheckCircle2 size={14} />,
            label: 'Synced',
            className: 'text-emerald-400'
        },
        pending: {
            icon: <Clock size={14} />,
            label: 'Pending',
            className: 'text-orange-400'
        },
        failed: {
            icon: <AlertCircle size={14} />,
            label: 'Failed',
            className: 'text-red-400'
        }
    };

    const status = statusConfig[tx.sync_status];

    return (
        <div className="glass-card p-4 flex items-center justify-between hover:border-indigo-500/30 transition-colors animate-fade-in">
            <div className="flex flex-col">
                <span className="font-semibold text-white">{tx.description || 'Transaction'}</span>
                <span className="text-xs text-slate-500">{formattedDate}</span>
            </div>
            <div className="flex items-center gap-4">
                <span className={`text-lg font-bold ${isDebit ? 'text-red-400' : 'text-emerald-400'}`}>
                    {isDebit ? '-' : '+'}{formattedAmount} сом
                </span>
                <div className={`flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider ${status.className}`}>
                    {status.icon}
                    <span>{status.label}</span>
                </div>
            </div>
        </div>
    );
}
