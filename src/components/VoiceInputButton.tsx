'use client';

import React, { useState, useEffect } from 'react';
import { Mic, MicOff, Loader2, Check, X, Volume2 } from 'lucide-react';
import { useZuduAgent } from '@/hooks/useZuduAgent';

/**
 * Voice Input Button Component
 * 
 * A floating action button for voice input using the Zudu Agent.
 * Shows visual feedback during listening and displays parsed commands.
 */

interface VoiceInputButtonProps {
    onTransaction: (amount: number, description: string, type: 'credit' | 'debit') => Promise<boolean>;
    disabled?: boolean;
}

export function VoiceInputButton({ onTransaction, disabled }: VoiceInputButtonProps) {
    const {
        isListening,
        isSupported,
        transcript,
        lastCommand,
        error,
        startListening,
        stopListening
    } = useZuduAgent();

    const [showConfirm, setShowConfirm] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [showFeedback, setShowFeedback] = useState<'success' | 'error' | null>(null);

    // Show confirmation when command is detected
    useEffect(() => {
        if (lastCommand) {
            setShowConfirm(true);
        }
    }, [lastCommand]);

    const handleConfirm = async () => {
        if (!lastCommand) return;

        setIsProcessing(true);
        try {
            const success = await onTransaction(
                lastCommand.amount,
                lastCommand.description,
                lastCommand.type
            );

            setShowFeedback(success ? 'success' : 'error');
            setTimeout(() => {
                setShowFeedback(null);
                setShowConfirm(false);
            }, 2000);
        } catch {
            setShowFeedback('error');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleCancel = () => {
        setShowConfirm(false);
        stopListening();
    };

    if (!isSupported) {
        return null; // Don't show button if not supported
    }

    return (
        <>
            {/* Floating Voice Button */}
            <button
                onClick={isListening ? stopListening : startListening}
                disabled={disabled || isProcessing}
                className={`fixed bottom-24 right-4 w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all z-40 ${isListening
                        ? 'bg-red-500 animate-pulse-glow'
                        : 'bg-gradient-to-br from-amber-500 to-orange-600 hover:scale-110'
                    } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                title="Voice input (Zudu AI)"
            >
                {isListening ? (
                    <MicOff className="w-6 h-6 text-white" />
                ) : (
                    <Mic className="w-6 h-6 text-white" />
                )}
            </button>

            {/* Listening Overlay */}
            {isListening && (
                <div className="fixed inset-x-0 bottom-40 z-50 flex justify-center px-4 animate-fade-in">
                    <div className="glass-card p-4 max-w-sm w-full">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center">
                                <Volume2 className="w-4 h-4 text-red-400 animate-pulse" />
                            </div>
                            <span className="text-white font-medium">Listening...</span>
                        </div>
                        <p className="text-slate-400 text-sm min-h-[40px]">
                            {transcript || 'Try saying: "Pay 500 for lunch"'}
                        </p>
                    </div>
                </div>
            )}

            {/* Confirmation Modal */}
            {showConfirm && lastCommand && (
                <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={handleCancel}
                    />
                    <div className="relative glass-card p-6 max-w-sm w-full animate-fade-in">
                        {showFeedback ? (
                            <div className="text-center py-4">
                                {showFeedback === 'success' ? (
                                    <>
                                        <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                                            <Check className="w-8 h-8 text-emerald-400" />
                                        </div>
                                        <p className="text-white font-medium">Transaction recorded!</p>
                                    </>
                                ) : (
                                    <>
                                        <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
                                            <X className="w-8 h-8 text-red-400" />
                                        </div>
                                        <p className="text-white font-medium">Transaction failed</p>
                                    </>
                                )}
                            </div>
                        ) : (
                            <>
                                <h3 className="text-lg font-bold text-white mb-4">Confirm Transaction</h3>

                                <div className="space-y-3 mb-6">
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">Type</span>
                                        <span className={`font-medium ${lastCommand.type === 'debit' ? 'text-red-400' : 'text-emerald-400'
                                            }`}>
                                            {lastCommand.type === 'debit' ? 'Payment' : 'Received'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">Amount</span>
                                        <span className="text-white font-bold">{lastCommand.amount.toLocaleString()} Rs</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">Description</span>
                                        <span className="text-white">{lastCommand.description}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">Confidence</span>
                                        <span className={`${lastCommand.confidence > 0.7 ? 'text-emerald-400' : 'text-orange-400'
                                            }`}>
                                            {Math.round(lastCommand.confidence * 100)}%
                                        </span>
                                    </div>
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        onClick={handleConfirm}
                                        disabled={isProcessing}
                                        className="flex-1 primary-button flex items-center justify-center gap-2"
                                    >
                                        {isProcessing ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                Processing...
                                            </>
                                        ) : (
                                            <>
                                                <Check className="w-4 h-4" />
                                                Confirm
                                            </>
                                        )}
                                    </button>
                                    <button
                                        onClick={handleCancel}
                                        disabled={isProcessing}
                                        className="secondary-button px-6"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Error Toast */}
            {error && (
                <div className="fixed bottom-40 right-4 z-50 glass-card p-3 text-red-400 text-sm animate-fade-in">
                    {error}
                </div>
            )}
        </>
    );
}
