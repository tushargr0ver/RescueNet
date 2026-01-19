/**
 * PeerList Component
 * Displays discovered peers on the local network
 */

import { useState } from 'react';

export function PeerList({
    peers,
    selfInfo,
    connections,
    onConnect,
    onSelectPeer,
    selectedPeer,
    isSignalingConnected
}) {
    return (
        <div className="peer-list">
            <div className="peer-list-header">
                <div className="logo">
                    <span className="logo-icon">📡</span>
                    <h1>RescueNet</h1>
                </div>
                <div className={`connection-status ${isSignalingConnected ? 'connected' : 'disconnected'}`}>
                    <span className="status-dot"></span>
                    {isSignalingConnected ? 'Online' : 'Offline'}
                </div>
            </div>

            {selfInfo && (
                <div className="self-info">
                    <div className="self-avatar">
                        {selfInfo.device_name?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div className="self-details">
                        <span className="self-name">{selfInfo.device_name}</span>
                        <span className="self-id">ID: {selfInfo.peer_id}</span>
                    </div>
                </div>
            )}

            <div className="peers-section">
                <h2>
                    <span>Nearby Devices</span>
                    <span className="peer-count">{peers.length}</span>
                </h2>

                {peers.length === 0 ? (
                    <div className="no-peers">
                        <div className="scanning-animation">
                            <div className="pulse-ring"></div>
                            <div className="pulse-ring delay-1"></div>
                            <div className="pulse-ring delay-2"></div>
                            <span className="scan-icon">📶</span>
                        </div>
                        <p>Scanning for devices...</p>
                        <span className="hint">Make sure other devices are on the same network</span>
                    </div>
                ) : (
                    <ul className="peer-items">
                        {peers.map((peer) => {
                            const connState = connections.get(peer.peer_id)?.state || 'disconnected';
                            const isSelected = selectedPeer?.peer_id === peer.peer_id;

                            return (
                                <li
                                    key={peer.peer_id}
                                    className={`peer-item ${connState} ${isSelected ? 'selected' : ''}`}
                                    onClick={() => onSelectPeer(peer)}
                                >
                                    <div className="peer-avatar">
                                        {peer.name?.[0]?.toUpperCase() || '?'}
                                    </div>
                                    <div className="peer-info">
                                        <span className="peer-name">{peer.name}</span>
                                        <span className="peer-host">{peer.host}:{peer.port}</span>
                                    </div>
                                    <div className="peer-actions">
                                        {connState === 'connected' ? (
                                            <span className="connected-badge">
                                                <span className="connected-dot"></span>
                                                Connected
                                            </span>
                                        ) : connState === 'connecting' ? (
                                            <span className="connecting-badge">
                                                <span className="spinner"></span>
                                                Connecting
                                            </span>
                                        ) : (
                                            <button
                                                className="connect-btn"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onConnect(peer.peer_id);
                                                }}
                                            >
                                                Connect
                                            </button>
                                        )}
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>
        </div>
    );
}
