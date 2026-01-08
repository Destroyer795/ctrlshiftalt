'use client';

import React, { useState, useEffect } from 'react';
import { Shield, Home, ArrowRight, Ghost } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function NotFound() {
    const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
    const router = useRouter();

    useEffect(() => {
        const checkAuth = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setIsAuthenticated(!!user);
        };
        checkAuth();
    }, []);

    const handleRedirect = () => {
        if (isAuthenticated) {
            router.push('/dashboard');
        } else {
            router.push('/');
        }
    };

    return (
        <main className="min-h-screen flex items-center justify-center p-4">
            <div className="w-full max-w-md text-center">
                {/* Animated Ghost Icon */}
                <div className="relative mb-8">
                    <div className="w-32 h-32 mx-auto rounded-3xl bg-gradient-to-br from-indigo-500/20 to-purple-600/20 flex items-center justify-center animate-float">
                        <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                            <Ghost className="w-14 h-14 text-white" />
                        </div>
                    </div>

                    {/* Decorative Elements */}
                    <div className="absolute top-0 left-1/4 w-3 h-3 rounded-full bg-indigo-500/40 animate-pulse"></div>
                    <div className="absolute bottom-4 right-1/4 w-2 h-2 rounded-full bg-purple-500/50 animate-pulse" style={{ animationDelay: '0.5s' }}></div>
                    <div className="absolute top-1/3 right-1/6 w-2 h-2 rounded-full bg-indigo-400/30 animate-pulse" style={{ animationDelay: '1s' }}></div>
                </div>

                {/* Error Code */}
                <div className="mb-4">
                    <span className="text-8xl font-bold bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 bg-clip-text text-transparent animate-pulse-glow">
                        404
                    </span>
                </div>

                {/* Title */}
                <h1 className="text-2xl font-bold text-white mb-3">
                    Page Not Found
                </h1>

                {/* Description */}
                <p className="text-slate-400 mb-8 max-w-sm mx-auto leading-relaxed">
                    Oops! It seems this page has vanished into the digital void.
                    Don't worry, we'll help you find your way back.
                </p>

                {/* Glass Card with Actions */}
                <div className="glass-card p-6 space-y-4">
                    {/* Status Message */}
                    <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
                        <Shield className="w-4 h-4" />
                        <span>
                            {isAuthenticated === null
                                ? 'Checking your session...'
                                : isAuthenticated
                                    ? 'You are signed in'
                                    : 'You are not signed in'
                            }
                        </span>
                    </div>

                    {/* Redirect Button */}
                    <button
                        onClick={handleRedirect}
                        disabled={isAuthenticated === null}
                        className="primary-button w-full flex items-center justify-center gap-2 group"
                    >
                        <Home className="w-5 h-5" />
                        <span>
                            {isAuthenticated === null
                                ? 'Loading...'
                                : isAuthenticated
                                    ? 'Go to Dashboard'
                                    : 'Go to Sign In'
                            }
                        </span>
                        <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                    </button>

                    {/* Secondary Info */}
                    <p className="text-xs text-slate-600">
                        The page you're looking for might have been moved or deleted.
                    </p>
                </div>

                {/* Branding */}
                <div className="mt-8 flex flex-col items-center gap-2">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                            <Shield className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-lg font-bold text-white">
                            Phantom<span className="text-indigo-500">Pay</span>
                        </span>
                    </div>
                    <p className="text-slate-600 text-xs">
                        Offline-First Payment Tracker
                    </p>
                </div>
            </div>
        </main>
    );
}
