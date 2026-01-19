/**
 * WebRTC Connection Hook
 * Manages peer-to-peer connections using WebRTC DataChannels
 */

import { useState, useCallback, useRef, useEffect } from 'react';

// ICE configuration for local network only (no STUN/TURN servers)
const RTC_CONFIG = {
    iceServers: [] // Empty for local network - uses host candidates only
};

export function useWebRTC(signaling) {
    const [connections, setConnections] = useState(new Map()); // peerId -> { pc, dataChannel, state }
    const [messages, setMessages] = useState([]); // { from, text, timestamp }
    const connectionsRef = useRef(new Map());

    // Update ref when connections change
    useEffect(() => {
        connectionsRef.current = connections;
    }, [connections]);

    // Handle incoming signaling messages
    useEffect(() => {
        if (!signaling) return;

        const unsubOffer = signaling.onMessage('offer', async (msg) => {
            console.log('[WebRTC] Received offer from:', msg.from);
            await handleOffer(msg.from, msg.data);
        });

        const unsubAnswer = signaling.onMessage('answer', async (msg) => {
            console.log('[WebRTC] Received answer from:', msg.from);
            await handleAnswer(msg.from, msg.data);
        });

        const unsubIce = signaling.onMessage('ice-candidate', async (msg) => {
            console.log('[WebRTC] Received ICE candidate from:', msg.from);
            await handleIceCandidate(msg.from, msg.data);
        });

        return () => {
            unsubOffer();
            unsubAnswer();
            unsubIce();
        };
    }, [signaling]);

    // Create a new peer connection
    const createPeerConnection = useCallback((peerId, isInitiator) => {
        console.log('[WebRTC] Creating connection to:', peerId, 'initiator:', isInitiator);

        const pc = new RTCPeerConnection(RTC_CONFIG);
        let dataChannel = null;

        // Handle ICE candidates
        pc.onicecandidate = (event) => {
            if (event.candidate) {
                signaling.sendMessage('ice-candidate', peerId, {
                    candidate: event.candidate.toJSON()
                });
            }
        };

        // Handle connection state changes
        pc.onconnectionstatechange = () => {
            console.log('[WebRTC] Connection state:', pc.connectionState);
            updateConnectionState(peerId, pc.connectionState);
        };

        // Handle incoming data channel (for answerer)
        pc.ondatachannel = (event) => {
            console.log('[WebRTC] Received data channel');
            dataChannel = event.channel;
            setupDataChannel(peerId, dataChannel);
        };

        // Create data channel (for initiator)
        if (isInitiator) {
            dataChannel = pc.createDataChannel('chat', {
                ordered: true
            });
            setupDataChannel(peerId, dataChannel);
        }

        const connInfo = { pc, dataChannel, state: 'connecting' };
        connectionsRef.current.set(peerId, connInfo);
        setConnections(new Map(connectionsRef.current));

        return pc;
    }, [signaling]);

    // Setup data channel event handlers
    const setupDataChannel = useCallback((peerId, channel) => {
        channel.onopen = () => {
            console.log('[WebRTC] Data channel open with:', peerId);
            updateConnectionState(peerId, 'connected');

            // Update the data channel reference
            const conn = connectionsRef.current.get(peerId);
            if (conn) {
                conn.dataChannel = channel;
                setConnections(new Map(connectionsRef.current));
            }
        };

        channel.onclose = () => {
            console.log('[WebRTC] Data channel closed with:', peerId);
            updateConnectionState(peerId, 'disconnected');
        };

        channel.onmessage = (event) => {
            console.log('[WebRTC] Message from:', peerId);
            const msg = JSON.parse(event.data);
            setMessages(prev => [...prev, {
                from: peerId,
                fromName: msg.fromName || peerId,
                text: msg.text,
                timestamp: new Date()
            }]);
        };
    }, []);

    // Update connection state
    const updateConnectionState = useCallback((peerId, state) => {
        const conn = connectionsRef.current.get(peerId);
        if (conn) {
            conn.state = state;
            setConnections(new Map(connectionsRef.current));
        }
    }, []);

    // Initiate connection to a peer
    const connectToPeer = useCallback(async (peerId) => {
        const pc = createPeerConnection(peerId, true);

        try {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            signaling.sendMessage('offer', peerId, {
                sdp: pc.localDescription.toJSON()
            });
        } catch (e) {
            console.error('[WebRTC] Error creating offer:', e);
        }
    }, [createPeerConnection, signaling]);

    // Handle incoming offer
    const handleOffer = useCallback(async (fromPeer, data) => {
        const pc = createPeerConnection(fromPeer, false);

        try {
            await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            signaling.sendMessage('answer', fromPeer, {
                sdp: pc.localDescription.toJSON()
            });
        } catch (e) {
            console.error('[WebRTC] Error handling offer:', e);
        }
    }, [createPeerConnection, signaling]);

    // Handle incoming answer
    const handleAnswer = useCallback(async (fromPeer, data) => {
        const conn = connectionsRef.current.get(fromPeer);
        if (conn?.pc) {
            try {
                await conn.pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
            } catch (e) {
                console.error('[WebRTC] Error handling answer:', e);
            }
        }
    }, []);

    // Handle incoming ICE candidate
    const handleIceCandidate = useCallback(async (fromPeer, data) => {
        const conn = connectionsRef.current.get(fromPeer);
        if (conn?.pc) {
            try {
                await conn.pc.addIceCandidate(new RTCIceCandidate(data.candidate));
            } catch (e) {
                console.error('[WebRTC] Error adding ICE candidate:', e);
            }
        }
    }, []);

    // Send message to a peer
    const sendMessage = useCallback((peerId, text, fromName) => {
        const conn = connectionsRef.current.get(peerId);
        if (conn?.dataChannel?.readyState === 'open') {
            const msg = { text, fromName };
            conn.dataChannel.send(JSON.stringify(msg));

            // Add to local messages
            setMessages(prev => [...prev, {
                from: 'me',
                fromName: fromName,
                text,
                timestamp: new Date(),
                to: peerId
            }]);

            return true;
        }
        return false;
    }, []);

    // Get connection state for a peer
    const getConnectionState = useCallback((peerId) => {
        return connectionsRef.current.get(peerId)?.state || 'disconnected';
    }, []);

    // Disconnect from a peer
    const disconnectFromPeer = useCallback((peerId) => {
        const conn = connectionsRef.current.get(peerId);
        if (conn) {
            conn.dataChannel?.close();
            conn.pc?.close();
            connectionsRef.current.delete(peerId);
            setConnections(new Map(connectionsRef.current));
        }
    }, []);

    return {
        connections,
        messages,
        connectToPeer,
        sendMessage,
        getConnectionState,
        disconnectFromPeer
    };
}
