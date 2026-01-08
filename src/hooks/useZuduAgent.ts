'use client';

import { useState, useCallback, useEffect, useRef } from 'react';

/**
 * useZuduAgent Hook
 * 
 * Voice-based transaction input using Web Speech API.
 * Listens for commands like "Pay 500 for lunch" and extracts transaction data.
 * 
 * Member D should enhance with:
 * - Better NLP extraction
 * - Confirmation flow
 * - Multi-language support
 * - Zudu SDK integration if provided
 */

interface VoiceCommand {
    amount: number;
    description: string;
    type: 'credit' | 'debit';
    confidence: number;
}

interface UseZuduAgentResult {
    isListening: boolean;
    isSupported: boolean;
    transcript: string;
    lastCommand: VoiceCommand | null;
    error: string | null;
    startListening: () => void;
    stopListening: () => void;
    processText: (text: string) => VoiceCommand | null;
}

// Type for the SpeechRecognition API
type SpeechRecognitionType = typeof window extends { SpeechRecognition: infer T } ? T : unknown;

export function useZuduAgent(): UseZuduAgentResult {
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [lastCommand, setLastCommand] = useState<VoiceCommand | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isSupported, setIsSupported] = useState(false);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recognitionRef = useRef<any>(null);

    /**
     * Parse voice input to extract transaction data
     * Patterns:
     * - "Pay 500 for lunch"
     * - "Spent 150 on taxi"
     * - "Received 1000 from John"
     * - "Got 500 for freelance work"
     */
    const processText = useCallback((text: string): VoiceCommand | null => {
        const normalizedText = text.toLowerCase().trim();

        // Debit patterns
        const debitPatterns = [
            /(?:pay|paid|spent|spend)\s+(\d+(?:\.\d{2})?)\s+(?:for|on)\s+(.+)/i,
            /(\d+(?:\.\d{2})?)\s+(?:for|on)\s+(.+)/i,
        ];

        // Credit patterns
        const creditPatterns = [
            /(?:received|got|earned)\s+(\d+(?:\.\d{2})?)\s+(?:from|for)\s+(.+)/i,
            /(?:income|payment)\s+(\d+(?:\.\d{2})?)\s+(?:from|for)\s+(.+)/i,
        ];

        // Try debit patterns
        for (const pattern of debitPatterns) {
            const match = normalizedText.match(pattern);
            if (match) {
                return {
                    amount: parseFloat(match[1]),
                    description: match[2].trim(),
                    type: 'debit',
                    confidence: 0.8
                };
            }
        }

        // Try credit patterns
        for (const pattern of creditPatterns) {
            const match = normalizedText.match(pattern);
            if (match) {
                return {
                    amount: parseFloat(match[1]),
                    description: match[2].trim(),
                    type: 'credit',
                    confidence: 0.8
                };
            }
        }

        // Simple number extraction as fallback
        const amountMatch = normalizedText.match(/(\d+(?:\.\d{2})?)/);
        if (amountMatch) {
            return {
                amount: parseFloat(amountMatch[1]),
                description: normalizedText.replace(amountMatch[0], '').trim() || 'Voice transaction',
                type: 'debit', // Default to debit
                confidence: 0.5
            };
        }

        return null;
    }, []);

    // Check for speech recognition support
    useEffect(() => {
        if (typeof window === 'undefined') return;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        setIsSupported(!!SpeechRecognitionAPI);

        if (SpeechRecognitionAPI) {
            const recognition = new SpeechRecognitionAPI();
            recognition.continuous = false;
            recognition.interimResults = true;
            recognition.lang = 'en-US';

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            recognition.onresult = (event: any) => {
                const current = event.resultIndex;
                const result = event.results[current];
                const text = result[0].transcript;

                setTranscript(text);

                if (result.isFinal) {
                    const command = processText(text);
                    if (command) {
                        setLastCommand(command);
                    }
                }
            };

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            recognition.onerror = (event: any) => {
                setError(`Speech recognition error: ${event.error}`);
                setIsListening(false);
            };

            recognition.onend = () => {
                setIsListening(false);
            };

            recognitionRef.current = recognition;
        }

        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.abort();
            }
        };
    }, [processText]);

    const startListening = useCallback(() => {
        if (!recognitionRef.current || !isSupported) {
            setError('Speech recognition not supported');
            return;
        }

        setError(null);
        setTranscript('');
        setLastCommand(null);
        setIsListening(true);

        try {
            recognitionRef.current.start();
        } catch {
            setError('Failed to start speech recognition');
            setIsListening(false);
        }
    }, [isSupported]);

    const stopListening = useCallback(() => {
        if (recognitionRef.current) {
            recognitionRef.current.stop();
        }
        setIsListening(false);
    }, []);

    return {
        isListening,
        isSupported,
        transcript,
        lastCommand,
        error,
        startListening,
        stopListening,
        processText
    };
}
