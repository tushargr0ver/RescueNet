"""
WebRTC Signaling Server
Handles WebSocket connections and routes signaling messages between peers
"""

import json
from dataclasses import dataclass, field
from typing import Callable
from fastapi import WebSocket


@dataclass
class SignalingMessage:
    """WebRTC signaling message structure"""
    type: str  # "offer", "answer", "ice-candidate", "peer-list", "error"
    from_peer: str
    to_peer: str | None = None
    data: dict = field(default_factory=dict)
    
    def to_json(self) -> str:
        return json.dumps({
            "type": self.type,
            "from": self.from_peer,
            "to": self.to_peer,
            "data": self.data
        })
    
    @classmethod
    def from_json(cls, json_str: str, from_peer: str) -> "SignalingMessage":
        data = json.loads(json_str)
        return cls(
            type=data.get("type", ""),
            from_peer=from_peer,
            to_peer=data.get("to"),
            data=data.get("data", {})
        )


class SignalingServer:
    """Manages WebSocket connections and message routing for WebRTC signaling"""
    
    def __init__(self):
        self.connections: dict[str, WebSocket] = {}
        self._get_peers_callback: Callable | None = None
    
    def set_get_peers_callback(self, callback: Callable):
        """Set callback to get current peer list"""
        self._get_peers_callback = callback
    
    async def connect(self, peer_id: str, websocket: WebSocket):
        """Register a new peer connection"""
        await websocket.accept()
        self.connections[peer_id] = websocket
        print(f"[Signaling] Peer connected: {peer_id}")
        
        # Send current peer list to the new connection
        await self._send_peer_list(peer_id)
    
    async def disconnect(self, peer_id: str):
        """Remove a peer connection"""
        if peer_id in self.connections:
            del self.connections[peer_id]
            print(f"[Signaling] Peer disconnected: {peer_id}")
            
            # Notify remaining peers about the disconnection
            await self.broadcast_peer_list()
    
    async def handle_message(self, peer_id: str, message: str):
        """Process an incoming signaling message"""
        try:
            msg = SignalingMessage.from_json(message, peer_id)
            
            if msg.type in ("offer", "answer", "ice-candidate"):
                # Route to specific peer
                await self._route_to_peer(msg)
            elif msg.type == "get-peers":
                # Send peer list
                await self._send_peer_list(peer_id)
            else:
                print(f"[Signaling] Unknown message type: {msg.type}")
                
        except json.JSONDecodeError as e:
            print(f"[Signaling] Invalid JSON from {peer_id}: {e}")
            await self._send_error(peer_id, "Invalid JSON message")
    
    async def broadcast_peer_list(self):
        """Send updated peer list to all connected peers"""
        for peer_id in self.connections:
            await self._send_peer_list(peer_id)
    
    async def _send_peer_list(self, peer_id: str):
        """Send peer list to specific peer"""
        if peer_id not in self.connections:
            return
        
        peers = []
        if self._get_peers_callback:
            peers = [p.to_dict() for p in self._get_peers_callback()]
        
        msg = SignalingMessage(
            type="peer-list",
            from_peer="server",
            to_peer=peer_id,
            data={"peers": peers}
        )
        
        try:
            await self.connections[peer_id].send_text(msg.to_json())
        except Exception as e:
            print(f"[Signaling] Error sending to {peer_id}: {e}")
    
    async def _route_to_peer(self, msg: SignalingMessage):
        """Route message to target peer"""
        if not msg.to_peer:
            print(f"[Signaling] No target peer specified")
            return
        
        # Find the target peer's connection
        target_ws = self.connections.get(msg.to_peer)
        
        if target_ws:
            try:
                await target_ws.send_text(msg.to_json())
                print(f"[Signaling] Routed {msg.type} from {msg.from_peer} to {msg.to_peer}")
            except Exception as e:
                print(f"[Signaling] Error routing to {msg.to_peer}: {e}")
        else:
            # Target not connected locally, need to forward to their signaling server
            print(f"[Signaling] Peer {msg.to_peer} not connected locally")
            await self._send_error(msg.from_peer, f"Peer {msg.to_peer} not available")
    
    async def _send_error(self, peer_id: str, error: str):
        """Send error message to peer"""
        if peer_id in self.connections:
            msg = SignalingMessage(
                type="error",
                from_peer="server",
                to_peer=peer_id,
                data={"error": error}
            )
            try:
                await self.connections[peer_id].send_text(msg.to_json())
            except Exception:
                pass
