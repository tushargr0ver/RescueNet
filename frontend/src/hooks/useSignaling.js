/**
 * WebSocket Signaling Hook
 * Manages connection to the FastAPI signaling server
 */

import { useState, useEffect, useCallback, useRef } from 'react';

export function useSignaling(peerId) {
    const [isConnected, setIsConnected] = useState(false);
    const [peers, setPeers] = useState([]);
    const [selfInfo, setSelfInfo] = useState(null);
    const wsRef = useRef(null);
    const messageHandlersRef = useRef(new Map());

    // Connect to signaling server
    useEffect(() => {
        if (!peerId) return;

        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.hostname;
        const wsUrl = `${protocol}//${host}:8000/ws/${peerId}`;

        console.log('[Signaling] Connecting to:', wsUrl);
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
            console.log('[Signaling] Connected');
            setIsConnected(true);
        };

        ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                console.log('[Signaling] Received:', message.type);

                if (message.type === 'peer-list') {
                    setPeers(message.data.peers || []);
                } else {
                    // Route to registered handlers
                    const handler = messageHandlersRef.current.get(message.type);
                    if (handler) {
                        handler(message);
                    }
                }
            } catch (e) {
                console.error('[Signaling] Parse error:', e);
            }
        };

        ws.onclose = () => {
            console.log('[Signaling] Disconnected');
            setIsConnected(false);
        };

        ws.onerror = (error) => {
            console.error('[Signaling] Error:', error);
        };

        // Fetch self info
        fetch(`http://${host}:8000/`)
            .then(res => res.json())
            .then(data => setSelfInfo(data))
            .catch(console.error);

        return () => {
            ws.close();
        };
    }, [peerId]);

    // Send signaling message
    const sendMessage = useCallback((type, toPeer, data = {}) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            const message = { type, to: toPeer, data };
            wsRef.current.send(JSON.stringify(message));
            console.log('[Signaling] Sent:', type, 'to:', toPeer);
        }
    }, []);

    // Register message handler
    const onMessage = useCallback((type, handler) => {
        messageHandlersRef.current.set(type, handler);
        return () => messageHandlersRef.current.delete(type);
    }, []);

    // Request updated peer list
    const refreshPeers = useCallback(() => {
        sendMessage('get-peers', null);
    }, [sendMessage]);

    return {
        isConnected,
        peers,
        selfInfo,
        sendMessage,
        onMessage,
        refreshPeers
    };
}
