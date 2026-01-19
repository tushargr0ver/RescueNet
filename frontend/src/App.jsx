/**
 * RescueNet P2P Chat Application
 * Main App component
 */

import { useState, useMemo } from 'react';
import { useSignaling } from './hooks/useSignaling';
import { useWebRTC } from './hooks/useWebRTC';
import { PeerList } from './components/PeerList';
import { ChatWindow } from './components/ChatWindow';
import './index.css';

function App() {
  // Generate a unique peer ID for this session
  const peerId = useMemo(() => {
    const stored = sessionStorage.getItem('peerId');
    if (stored) return stored;
    const newId = Math.random().toString(36).substring(2, 10);
    sessionStorage.setItem('peerId', newId);
    return newId;
  }, []);

  const [selectedPeer, setSelectedPeer] = useState(null);

  // Initialize signaling connection
  const signaling = useSignaling(peerId);

  // Initialize WebRTC with signaling
  const webrtc = useWebRTC(signaling);

  const handleConnect = (targetPeerId) => {
    webrtc.connectToPeer(targetPeerId);
  };

  const handleSelectPeer = (peer) => {
    setSelectedPeer(peer);
  };

  const handleBack = () => {
    setSelectedPeer(null);
  };

  return (
    <div className="app">
      <div className={`sidebar ${selectedPeer ? 'hidden-mobile' : ''}`}>
        <PeerList
          peers={signaling.peers}
          selfInfo={signaling.selfInfo}
          connections={webrtc.connections}
          onConnect={handleConnect}
          onSelectPeer={handleSelectPeer}
          selectedPeer={selectedPeer}
          isSignalingConnected={signaling.isConnected}
        />
      </div>

      <div className={`main-content ${!selectedPeer ? 'hidden-mobile' : ''}`}>
        {selectedPeer ? (
          <ChatWindow
            peer={selectedPeer}
            messages={webrtc.messages}
            onSendMessage={webrtc.sendMessage}
            connectionState={webrtc.getConnectionState(selectedPeer.peer_id)}
            selfName={signaling.selfInfo?.device_name || 'Me'}
            onBack={handleBack}
          />
        ) : (
          <div className="welcome-screen">
            <div className="welcome-content">
              <div className="welcome-icon">
                <span className="icon-large">🌐</span>
                <div className="orbit">
                  <span className="orbit-dot"></span>
                </div>
              </div>
              <h2>RescueNet P2P Chat</h2>
              <p>Secure peer-to-peer messaging on your local network</p>
              <div className="features">
                <div className="feature">
                  <span className="feature-icon">🔒</span>
                  <span>End-to-end encrypted</span>
                </div>
                <div className="feature">
                  <span className="feature-icon">📡</span>
                  <span>No internet required</span>
                </div>
                <div className="feature">
                  <span className="feature-icon">⚡</span>
                  <span>Direct P2P connection</span>
                </div>
              </div>
              <p className="select-hint">← Select a device from the sidebar to start chatting</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
