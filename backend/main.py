"""
RescueNet P2P Chat - Main FastAPI Application
Local network peer-to-peer chat without internet
"""

import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from discovery import DiscoveryService
from signaling import SignalingServer


# Global services
discovery: DiscoveryService | None = None
signaling = SignalingServer()
main_loop: asyncio.AbstractEventLoop | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan - start/stop discovery service"""
    global discovery, main_loop
    
    # Store the main event loop for callbacks from other threads
    main_loop = asyncio.get_running_loop()
    
    # Start discovery service
    discovery = DiscoveryService(port=8000)
    discovery.set_peers_changed_callback(on_peers_changed)
    signaling.set_get_peers_callback(lambda: discovery.get_peers() if discovery else [])
    
    await discovery.start()
    
    yield
    
    # Cleanup
    await discovery.stop()


def on_peers_changed():
    """Callback when peer list changes - notify all connected clients"""
    if main_loop is not None:
        # Schedule the coroutine on the main event loop from this thread
        main_loop.call_soon_threadsafe(
            lambda: main_loop.create_task(signaling.broadcast_peer_list())
        )


app = FastAPI(
    title="RescueNet P2P Chat",
    description="Local network peer-to-peer chat without internet",
    version="1.0.0",
    lifespan=lifespan
)

# CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "RescueNet P2P Chat",
        "peer_id": discovery.peer_id if discovery else None,
        "device_name": discovery.device_name if discovery else None
    }


@app.get("/peers")
async def get_peers():
    """Get list of discovered peers on the network"""
    if not discovery:
        return JSONResponse(
            status_code=503,
            content={"error": "Discovery service not available"}
        )
    
    peers = discovery.get_peers()
    return {
        "self": {
            "peer_id": discovery.peer_id,
            "name": discovery.device_name
        },
        "peers": [p.to_dict() for p in peers]
    }


@app.websocket("/ws/{peer_id}")
async def websocket_endpoint(websocket: WebSocket, peer_id: str):
    """
    WebSocket endpoint for signaling.
    Clients connect here to exchange WebRTC signaling messages.
    """
    await signaling.connect(peer_id, websocket)
    
    try:
        while True:
            message = await websocket.receive_text()
            await signaling.handle_message(peer_id, message)
    except WebSocketDisconnect:
        await signaling.disconnect(peer_id)
    except Exception as e:
        print(f"[WebSocket] Error with {peer_id}: {e}")
        await signaling.disconnect(peer_id)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )
