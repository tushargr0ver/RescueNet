/**
 * ChatWindow Component
 * Chat interface for messaging with a connected peer
 */

import { useState, useRef, useEffect } from 'react';

export function ChatWindow({
    peer,
    messages,
    onSendMessage,
    connectionState,
    selfName,
    onBack
}) {
    const [inputText, setInputText] = useState('');
    const messagesEndRef = useRef(null);

    // Auto-scroll to bottom on new messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Filter messages for this peer
    const peerMessages = messages.filter(
        msg => msg.from === peer.peer_id || msg.to === peer.peer_id
    );

    const handleSend = () => {
        if (inputText.trim() && connectionState === 'connected') {
            onSendMessage(peer.peer_id, inputText.trim(), selfName);
            setInputText('');
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const formatTime = (date) => {
        return new Date(date).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="chat-window">
            <div className="chat-header">
                <button className="back-btn" onClick={onBack}>
                    ←
                </button>
                <div className="chat-peer-info">
                    <div className="chat-peer-avatar">
                        {peer.name?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div className="chat-peer-details">
                        <span className="chat-peer-name">{peer.name}</span>
                        <span className={`chat-peer-status ${connectionState}`}>
                            {connectionState === 'connected' ? '● Online' :
                                connectionState === 'connecting' ? '○ Connecting...' :
                                    '○ Offline'}
                        </span>
                    </div>
                </div>
                <div className="chat-header-spacer"></div>
            </div>

            <div className="chat-messages">
                {peerMessages.length === 0 ? (
                    <div className="no-messages">
                        <div className="no-messages-icon">💬</div>
                        <p>No messages yet</p>
                        <span>Send a message to start the conversation</span>
                    </div>
                ) : (
                    peerMessages.map((msg, idx) => {
                        const isMe = msg.from === 'me';
                        return (
                            <div
                                key={idx}
                                className={`message ${isMe ? 'sent' : 'received'}`}
                            >
                                <div className="message-bubble">
                                    <p className="message-text">{msg.text}</p>
                                    <span className="message-time">{formatTime(msg.timestamp)}</span>
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={messagesEndRef} />
            </div>

            <div className="chat-input-container">
                {connectionState !== 'connected' ? (
                    <div className="not-connected-notice">
                        <span>⚠️ Not connected to {peer.name}</span>
                    </div>
                ) : null}
                <div className="chat-input-wrapper">
                    <input
                        type="text"
                        className="chat-input"
                        placeholder={connectionState === 'connected' ? "Type a message..." : "Connect to send messages"}
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        onKeyPress={handleKeyPress}
                        disabled={connectionState !== 'connected'}
                    />
                    <button
                        className="send-btn"
                        onClick={handleSend}
                        disabled={!inputText.trim() || connectionState !== 'connected'}
                    >
                        <span className="send-icon">➤</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
