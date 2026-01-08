import { NextResponse } from 'next/server';

/**
 * Health Check Endpoint
 * 
 * Used by useOnlineStatus hook to detect "Lie-Fi" scenarios.
 * Returns quickly with minimal payload to check real connectivity.
 * 
 * This is a lightweight endpoint that confirms the backend is reachable.
 */

export async function GET() {
    return NextResponse.json(
        { 
            status: 'ok',
            timestamp: Date.now(),
            version: '1.0.0'
        },
        {
            headers: {
                'Cache-Control': 'no-store, no-cache, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            }
        }
    );
}

export async function HEAD() {
    return new NextResponse(null, {
        status: 200,
        headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
        }
    });
}
