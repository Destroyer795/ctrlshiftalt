'use client';

import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, Check, Download, Share2 } from 'lucide-react';
import { generateSignature, generateOfflineId } from '@/utils/crypto';
import type { QRPaymentData } from '@/lib/types';

/**
 * QR Code Generator Component
 * 
 * Generates a QR code for receiving payments.
 * The QR contains a signed payload with recipient info.
 */

interface QRCodeGeneratorProps {
    userId: string;
    userName?: string;
    amount?: number;
    onClose?: () => void;
}

export function QRCodeGenerator({ userId, userName, amount, onClose }: QRCodeGeneratorProps) {
    const [qrData, setQrData] = useState<string>('');
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        const generateQR = async () => {
            const timestamp = Date.now();
            const signature = await generateSignature(userId, generateOfflineId(), amount || 0, timestamp);

            const payload: QRPaymentData = {
                recipient_id: userId,
                recipient_name: userName,
                amount: amount,
                timestamp,
                signature
            };

            setQrData(JSON.stringify(payload));
        };

        generateQR();
    }, [userId, userName, amount]);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(qrData);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    const handleShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'PhantomPay Payment Request',
                    text: `Pay ${userName || 'me'} ${amount ? amount + ' сом' : ''}`,
                    url: `phantompay://pay?data=${encodeURIComponent(qrData)}`
                });
            } catch (err) {
                console.error('Share failed:', err);
            }
        }
    };

    return (
        <div className="glass-card p-6 text-center">
            <h3 className="text-lg font-bold text-white mb-2">Your Payment QR</h3>
            <p className="text-slate-400 text-sm mb-6">
                {amount
                    ? `Request ${amount.toLocaleString()} сом`
                    : 'Scan to pay any amount'}
            </p>

            {/* QR Code */}
            <div className="bg-white p-4 rounded-2xl inline-block mb-6">
                {qrData ? (
                    <QRCodeSVG
                        value={qrData}
                        size={200}
                        level="M"
                        includeMargin={false}
                        bgColor="#FFFFFF"
                        fgColor="#0a0a0b"
                    />
                ) : (
                    <div className="w-[200px] h-[200px] bg-slate-200 animate-pulse rounded-xl" />
                )}
            </div>

            {/* User Info */}
            <div className="mb-6">
                <p className="text-white font-semibold">{userName || 'Anonymous'}</p>
                <p className="text-slate-500 text-sm">ID: {userId.slice(0, 8)}...</p>
            </div>

            {/* Actions */}
            <div className="flex gap-3 justify-center">
                <button
                    onClick={handleCopy}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
                >
                    {copied ? (
                        <>
                            <Check className="w-4 h-4 text-emerald-400" />
                            <span className="text-emerald-400 text-sm">Copied!</span>
                        </>
                    ) : (
                        <>
                            <Copy className="w-4 h-4 text-slate-400" />
                            <span className="text-slate-400 text-sm">Copy</span>
                        </>
                    )}
                </button>

                {typeof navigator !== 'undefined' && 'share' in navigator && (
                    <button
                        onClick={handleShare}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-500/20 hover:bg-indigo-500/30 rounded-lg transition-colors"
                    >
                        <Share2 className="w-4 h-4 text-indigo-400" />
                        <span className="text-indigo-400 text-sm">Share</span>
                    </button>
                )}
            </div>

            {/* Close Button */}
            {onClose && (
                <button
                    onClick={onClose}
                    className="mt-6 w-full secondary-button"
                >
                    Close
                </button>
            )}
        </div>
    );
}

/**
 * Amount Request Modal
 * Lets user specify an amount before generating QR
 */
interface QRRequestModalProps {
    userId: string;
    userName?: string;
    onClose: () => void;
}

export function QRRequestModal({ userId, userName, onClose }: QRRequestModalProps) {
    const [amount, setAmount] = useState('');
    const [showQR, setShowQR] = useState(false);

    if (showQR) {
        return (
            <QRCodeGenerator
                userId={userId}
                userName={userName}
                amount={amount ? parseFloat(amount) : undefined}
                onClose={onClose}
            />
        );
    }

    return (
        <div className="glass-card p-6">
            <h3 className="text-lg font-bold text-white mb-4">Request Payment</h3>

            <div className="mb-4">
                <label className="block text-sm font-medium text-slate-400 mb-2">
                    Amount (optional)
                </label>
                <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Enter amount"
                    className="input-field text-xl font-bold"
                    min="0"
                />
            </div>

            <div className="flex gap-3">
                <button
                    onClick={() => setShowQR(true)}
                    className="flex-1 primary-button"
                >
                    Generate QR
                </button>
                <button
                    onClick={onClose}
                    className="secondary-button px-6"
                >
                    Cancel
                </button>
            </div>
        </div>
    );
}
