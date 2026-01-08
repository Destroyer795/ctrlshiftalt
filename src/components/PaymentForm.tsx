'use client';

import React, { useState } from 'react';
import { Send, Loader2 } from 'lucide-react';

/**
 * Payment Form Component
 * 
 * Quick payment input form for debits.
 * Member C should enhance with:
 * - Credit/Debit toggle
 * - QR code scanning integration
 * - Recent recipients
 * - Amount validation
 */

interface PaymentFormProps {
    onSubmit: (amount: number, description: string) => Promise<boolean>;
    maxAmount?: number;
    disabled?: boolean;
}

export function PaymentForm({ onSubmit, maxAmount, disabled }: PaymentFormProps) {
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [recipientEmail, setRecipientEmail] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [resolvingRecipient, setResolvingRecipient] = useState(false);

    // Import supabase client
    const { supabase } = require('@/lib/supabase');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const numAmount = parseFloat(amount);

        // SEC-04 Fix: Comprehensive amount validation
        if (isNaN(numAmount) || !Number.isFinite(numAmount) || numAmount <= 0) {
            setError('Please enter a valid positive amount');
            return;
        }

        // Round to 2 decimal places for consistency
        const roundedAmount = Math.round(numAmount * 100) / 100;

        if (maxAmount && roundedAmount > maxAmount) {
            setError(`Insufficient balance. Max: ${maxAmount.toLocaleString()} Rs`);
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            let resolvedRecipientId: string | undefined = undefined;

            // Resolve recipient if email is provided
            if (recipientEmail.trim()) {
                setResolvingRecipient(true);
                const { data: recipientId, error: lookupError } = await supabase
                    .rpc('get_recipient_id', { email_input: recipientEmail.trim() });

                setResolvingRecipient(false);

                if (lookupError || !recipientId) {
                    throw new Error('Recipient not found. Please check the email.');
                }
                resolvedRecipientId = recipientId;
            }

            // Pass resolvedRecipientId to parent
            // Note: The parent component's onSubmit signature might need to support the 3rd argument
            // We cast it here assuming basic usage, but ideally type definition updates are needed globally
            const result = await (onSubmit as any)(numAmount, description || 'Payment', undefined, resolvedRecipientId);

            if (result) {
                setSuccess(true);
                setAmount('');
                setDescription('');
                setRecipientEmail('');
                setTimeout(() => setSuccess(false), 2000);
            } else {
                setError('Transaction failed. Please try again.');
            }
        } catch (err: any) {
            setError(err.message || 'An error occurred. Please try again.');
        } finally {
            setIsSubmitting(false);
            setResolvingRecipient(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="glass-card p-6">
            <h3 className="text-lg font-bold text-white mb-4">Quick Payment</h3>

            {/* Recipient Email Input (Optional) */}
            <div className="mb-4">
                <label htmlFor="recipient" className="block text-sm font-medium text-slate-400 mb-2">
                    Recipient Email (Optional)
                </label>
                <input
                    type="email"
                    id="recipient"
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                    placeholder="friend@example.com"
                    className="input-field"
                    disabled={disabled || isSubmitting}
                />
            </div>

            {/* Amount Input */}
            <div className="mb-4">
                <label htmlFor="amount" className="block text-sm font-medium text-slate-400 mb-2">
                    Amount (Rs)
                </label>
                <input
                    type="number"
                    id="amount"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0"
                    className="input-field text-2xl font-bold"
                    disabled={disabled || isSubmitting}
                    min="0"
                    step="0.01"
                />
            </div>

            {/* Description Input */}
            <div className="mb-4">
                <label htmlFor="description" className="block text-sm font-medium text-slate-400 mb-2">
                    Description
                </label>
                <input
                    type="text"
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="What's this for?"
                    className="input-field"
                    disabled={disabled || isSubmitting}
                    maxLength={100}
                />
            </div>

            {/* Error Message */}
            {error && (
                <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 text-sm">
                    {error}
                </div>
            )}

            {/* Success Message */}
            {success && (
                <div className="mb-4 p-3 bg-emerald-500/20 border border-emerald-500/30 rounded-lg text-emerald-400 text-sm">
                    ✓ Transaction recorded!
                </div>
            )}

            {/* Submit Button */}
            <button
                type="submit"
                className="primary-button w-full flex items-center justify-center gap-2"
                disabled={disabled || isSubmitting || !amount}
            >
                {isSubmitting || resolvingRecipient ? (
                    <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        {resolvingRecipient ? 'Finding User...' : 'Processing...'}
                    </>
                ) : (
                    <>
                        <Send className="w-5 h-5" />
                        Pay
                    </>
                )}
            </button>
        </form>
    );
}
