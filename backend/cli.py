#!/usr/bin/env python3
"""
RescueNet CLI Chat Client
Chat via terminal without needing the web UI
"""

import asyncio
import json
import sys
import aioconsole
from websockets.asyncio.client import connect


class CLIChat:
    def __init__(self, server_url: str, username: str):
        self.server_url = server_url
        self.username = username
        self.peer_id = username.lower().replace(" ", "_")[:8]
        self.ws = None
        self.peers = []
        self.connected_peer = None
    
    async def connect(self):
        """Connect to signaling server"""
        ws_url = f"{self.server_url}/ws/{self.peer_id}"
        print(f"🔗 Connecting to {ws_url}...")
        self.ws = await connect(ws_url)
        print(f"✅ Connected as '{self.username}' (ID: {self.peer_id})")
        print("-" * 50)
    
    async def send_message(self, msg_type: str, to_peer: str, data: dict = None):
        """Send a message through the signaling server"""
        message = {
            "type": msg_type,
            "to": to_peer,
            "data": data or {}
        }
        await self.ws.send(json.dumps(message))
    
    async def listen(self):
        """Listen for incoming messages"""
        try:
            async for message in self.ws:
                data = json.loads(message)
                await self.handle_message(data)
        except Exception as e:
            print(f"\n❌ Connection lost: {e}")
    
    async def handle_message(self, msg: dict):
        """Handle incoming signaling messages"""
        msg_type = msg.get("type")
        from_peer = msg.get("from")
        data = msg.get("data", {})
        
        if msg_type == "peer-list":
            self.peers = data.get("peers", [])
            print(f"\n📡 Peers online: {len(self.peers)}")
            for p in self.peers:
                print(f"   • {p['name']} ({p['peer_id']}) - {p['host']}")
            print("> ", end="", flush=True)
        
        elif msg_type == "chat":
            sender_name = data.get("from_name", from_peer)
            text = data.get("text", "")
            print(f"\n💬 {sender_name}: {text}")
            print("> ", end="", flush=True)
        
        elif msg_type == "error":
            print(f"\n⚠️ Error: {data.get('error')}")
            print("> ", end="", flush=True)
    
    async def input_loop(self):
        """Handle user input"""
        print("\nCommands:")
        print("  /peers         - List online peers")
        print("  /chat <id>     - Select peer to chat with")
        print("  /quit          - Exit")
        print("  <message>      - Send message to selected peer")
        print("-" * 50)
        
        while True:
            try:
                line = await aioconsole.ainput("> ")
                line = line.strip()
                
                if not line:
                    continue
                
                if line == "/peers":
                    await self.send_message("get-peers", None)
                
                elif line.startswith("/chat "):
                    peer_id = line[6:].strip()
                    # Find peer
                    peer = next((p for p in self.peers if p["peer_id"] == peer_id), None)
                    if peer:
                        self.connected_peer = peer
                        print(f"💬 Now chatting with {peer['name']}")
                    else:
                        print(f"❌ Peer '{peer_id}' not found. Use /peers to see available peers.")
                
                elif line == "/quit":
                    print("👋 Goodbye!")
                    break
                
                elif line.startswith("/"):
                    print("❓ Unknown command. Use /peers, /chat <id>, or /quit")
                
                else:
                    # Send chat message
                    if self.connected_peer:
                        await self.send_message("chat", self.connected_peer["peer_id"], {
                            "text": line,
                            "from_name": self.username
                        })
                        print(f"📤 You: {line}")
                    else:
                        print("❌ No peer selected. Use /chat <peer_id> first.")
            
            except EOFError:
                break
    
    async def run(self):
        """Main run loop"""
        await self.connect()
        
        # Run listener and input loop concurrently
        listener = asyncio.create_task(self.listen())
        input_task = asyncio.create_task(self.input_loop())
        
        # Wait for input loop to finish
        await input_task
        listener.cancel()
        
        if self.ws:
            await self.ws.close()


async def main():
    print("=" * 50)
    print("       📡 RescueNet CLI Chat")
    print("=" * 50)
    
    # Get server URL
    server = input("Server URL [http://localhost:8000]: ").strip()
    if not server:
        server = "http://localhost:8000"
    
    # Convert to WebSocket URL
    ws_server = server.replace("http://", "ws://").replace("https://", "wss://")
    
    # Get username
    username = input("Your name: ").strip()
    if not username:
        username = "Anonymous"
    
    client = CLIChat(ws_server, username)
    await client.run()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n👋 Goodbye!")
