'use client';

import React, { useState } from 'react';
import { CheckCircle2, Clock, AlertCircle, RefreshCw, Edit2, Trash2, ShoppingBag, Coffee, Home, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { OfflineTransaction } from '@/lib/types';
import { updateTransactionStatus } from '@/lib/db';

/**
 * Transaction List Component - Enhanced for Offline-First
 * 
 * Implements sophisticated state visualization from UI roadmap:
 * - 4 distinct visual states (Confirmed, Pending, Syncing, Failed)
 * - Edit/Delete for pending transactions (grace period)
 * - Retry capability for failed items
 * - Animated state transitions
 * - Category icons with state overlays
 */

interface TransactionListProps {
    transactions: OfflineTransaction[];
    isLoading?: boolean;
    onEdit?: (transaction: OfflineTransaction) => void;
    onDelete?: (offlineId: string) => Promise<void>;
    onRetry?: (offlineId: string) => Promise<void>;
}

export function TransactionList({ 
    transactions, 
    isLoading,
    onEdit,
    onDelete,
    onRetry 
}: TransactionListProps) {
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
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-12 text-slate-500 italic"
            >
                <p className="mb-2">No transactions yet</p>
                <p className="text-sm">Make your first payment to get started!</p>
            </motion.div>
        );
    }

    // Sort by timestamp descending
    const sorted = [...transactions].sort((a, b) => b.timestamp - a.timestamp);

    return (
        <div className="flex flex-col gap-3">
            <AnimatePresence mode="popLayout">
                {sorted.map((tx, index) => (
                    <motion.div
                        key={tx.offline_id}
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -100 }}
                        transition={{ delay: index * 0.05 }}
                    >
                        <TransactionItem 
                            transaction={tx}
                            onEdit={onEdit}
                            onDelete={onDelete}
                            onRetry={onRetry}
                        />
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
}

interface TransactionItemProps {
    transaction: OfflineTransaction;
    onEdit?: (transaction: OfflineTransaction) => void;
    onDelete?: (offlineId: string) => Promise<void>;
    onRetry?: (offlineId: string) => Promise<void>;
}

function TransactionItem({ transaction: tx, onEdit, onDelete, onRetry }: TransactionItemProps) {
    const [showActions, setShowActions] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isRetrying, setIsRetrying] = useState(false);
    
    const isDebit = tx.type === 'debit';
    const formattedAmount = tx.amount.toLocaleString();
    const formattedDate = new Date(tx.timestamp).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    // Determine if transaction is editable (pending only)
    const isEditable = tx.sync_status === 'pending';
    const isRetryable = tx.sync_status === 'failed';

    // Status configuration with enhanced visuals
    const statusConfig = {
        synced: {
            icon: <CheckCircle2 size={14} />,
            label: 'Synced',
            className: 'text-emerald-400',
            borderClass: '',
            bgClass: ''
        },
        pending: {
            icon: <Clock size={14} />,
            label: 'Pending',
            className: 'text-orange-400',
            borderClass: 'border-l-2 border-orange-400/50',
            bgClass: ''
        },
        syncing: {
            icon: <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}><RefreshCw size={14} /></motion.div>,
            label: 'Syncing',
            className: 'text-blue-400',
            borderClass: 'border-l-2 border-blue-400/50',
            bgClass: 'bg-blue-500/5'
        },
        failed: {
            icon: <AlertCircle size={14} />,
            label: 'Failed',
            className: 'text-red-400',
            borderClass: 'border-2 border-red-400/30',
            bgClass: 'bg-red-500/5'
        },
        conflict: {
            icon: <AlertCircle size={14} />,
            label: 'Conflict',
            className: 'text-yellow-400',
            borderClass: 'border-2 border-yellow-400/30',
            bgClass: 'bg-yellow-500/5'
        }
    };

    const status = statusConfig[tx.sync_status];

    // Get category icon (simple heuristic)
    const getCategoryIcon = () => {
        const desc = tx.description.toLowerCase();
        if (desc.includes('coffee') || desc.includes('cafe')) return <Coffee size={20} />;
        if (desc.includes('shop') || desc.includes('store')) return <ShoppingBag size={20} />;
        if (desc.includes('rent') || desc.includes('home')) return <Home size={20} />;
        return <Zap size={20} />;
    };

    const handleDelete = async () => {
        if (!onDelete || !window.confirm('Delete this pending transaction?')) return;
        setIsDeleting(true);
        try {
            await onDelete(tx.offline_id);
        } finally {
            setIsDeleting(false);
        }
    };

    const handleRetry = async () => {
        if (!onRetry) return;
        setIsRetrying(true);
        try {
            await onRetry(tx.offline_id);
        } finally {
            setIsRetrying(false);
        }
    };

    return (
        <motion.div 
            className={`glass-card p-4 relative overflow-hidden transition-all duration-200 ${status.borderClass} ${status.bgClass}`}
            whileHover={{ scale: 1.01 }}
            onHoverStart={() => (isEditable || isRetryable) && setShowActions(true)}
            onHoverEnd={() => setShowActions(false)}
        >
            {/* Syncing shimmer effect */}
            {tx.sync_status === 'syncing' && (
                <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-500/10 to-transparent"
                    animate={{ x: ['-100%', '100%'] }}
                    transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
                />
            )}

            <div className="flex items-center justify-between relative z-10">
                {/* Left: Icon + Description */}
                <div className="flex items-center gap-3">
                    {/* Category Icon with Status Overlay */}
                    <div className="relative">
                        <div className={`p-2 rounded-lg ${isDebit ? 'bg-red-500/10' : 'bg-emerald-500/10'}`}>
                            <div className={isDebit ? 'text-red-400' : 'text-emerald-400'}>
                                {getCategoryIcon()}
                            </div>
                        </div>
                        {/* Status Badge Overlay */}
                        {tx.sync_status !== 'synced' && (
                            <div className={`absolute -bottom-1 -right-1 ${status.className}`}>
                                {status.icon}
                            </div>
                        )}
                    </div>

                    {/* Description + Date */}
                    <div className="flex flex-col">
                        <span className="font-semibold text-white">
                            {tx.description || 'Transaction'}
                        </span>
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-500">{formattedDate}</span>
                            {tx.retry_count && tx.retry_count > 0 && (
                                <span className="text-xs text-orange-400">
                                    (Retry {tx.retry_count})
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right: Amount + Status */}
                <div className="flex items-center gap-4">
                    <div className="text-right">
                        <div className={`text-lg font-bold font-mono ${isDebit ? 'text-red-400' : 'text-emerald-400'}`}>
                            {isDebit ? '-' : '+'}{formattedAmount}
                        </div>
                        <div className={`flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider ${status.className}`}>
                            <span>{status.label}</span>
                        </div>
                    </div>

                    {/* Action Buttons (Pending/Failed) */}
                    <AnimatePresence>
                        {showActions && (isEditable || isRetryable) && (
                            <motion.div
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 10 }}
                                className="flex items-center gap-2"
                            >
                                {isEditable && onEdit && (
                                    <button
                                        onClick={() => onEdit(tx)}
                                        className="p-2 hover:bg-indigo-500/20 rounded-lg transition-colors"
                                        title="Edit transaction"
                                    >
                                        <Edit2 size={16} className="text-indigo-400" />
                                    </button>
                                )}
                                {isEditable && onDelete && (
                                    <button
                                        onClick={handleDelete}
                                        disabled={isDeleting}
                                        className="p-2 hover:bg-red-500/20 rounded-lg transition-colors disabled:opacity-50"
                                        title="Delete transaction"
                                    >
                                        <Trash2 size={16} className="text-red-400" />
                                    </button>
                                )}
                                {isRetryable && onRetry && (
                                    <button
                                        onClick={handleRetry}
                                        disabled={isRetrying}
                                        className="p-2 hover:bg-emerald-500/20 rounded-lg transition-colors disabled:opacity-50"
                                        title="Retry sync"
                                    >
                                        <RefreshCw size={16} className={`text-emerald-400 ${isRetrying ? 'animate-spin' : ''}`} />
                                    </button>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Conflict Notice */}
            {tx.sync_status === 'conflict' && tx.conflict_data && (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-3 p-2 bg-yellow-500/10 border border-yellow-400/30 rounded text-xs text-yellow-400"
                >
                    ⚠️ Conflict detected. Data differs from server. Tap to resolve.
                </motion.div>
            )}
        </motion.div>
    );
}
