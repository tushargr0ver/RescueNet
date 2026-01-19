"""
mDNS Service Discovery for P2P Chat
Uses Zeroconf to advertise and discover peers on local network
"""

import asyncio
import socket
import uuid
from dataclasses import dataclass, field
from typing import Callable
from zeroconf import ServiceBrowser, ServiceInfo, ServiceListener, Zeroconf
from zeroconf.asyncio import AsyncZeroconf


SERVICE_TYPE = "_rescuenet-chat._tcp.local."


@dataclass
class Peer:
    """Represents a discovered peer on the network"""
    peer_id: str
    name: str
    host: str
    port: int
    
    def to_dict(self):
        return {
            "peer_id": self.peer_id,
            "name": self.name,
            "host": self.host,
            "port": self.port
        }


class PeerDiscoveryListener(ServiceListener):
    """Listener for mDNS service events"""
    
    def __init__(self, peers: dict, on_change: Callable | None = None):
        self.peers = peers
        self.on_change = on_change
        self.zc: Zeroconf | None = None
    
    def set_zeroconf(self, zc: Zeroconf):
        self.zc = zc
    
    def update_service(self, zc: Zeroconf, type_: str, name: str) -> None:
        """Called when a service is updated"""
        self._resolve_service(zc, type_, name)
    
    def remove_service(self, zc: Zeroconf, type_: str, name: str) -> None:
        """Called when a service is removed"""
        # Extract peer_id from service name
        service_name = name.replace(f".{SERVICE_TYPE}", "")
        if service_name in self.peers:
            del self.peers[service_name]
            if self.on_change:
                self.on_change()
    
    def add_service(self, zc: Zeroconf, type_: str, name: str) -> None:
        """Called when a new service is discovered"""
        self._resolve_service(zc, type_, name)
    
    def _resolve_service(self, zc: Zeroconf, type_: str, name: str):
        """Resolve service details and add to peers"""
        info = zc.get_service_info(type_, name)
        if info:
            peer_id = info.properties.get(b"peer_id", b"").decode()
            peer_name = info.properties.get(b"name", b"Unknown").decode()
            addresses = info.parsed_addresses()
            
            if addresses and peer_id:
                self.peers[peer_id] = Peer(
                    peer_id=peer_id,
                    name=peer_name,
                    host=addresses[0],
                    port=info.port
                )
                if self.on_change:
                    self.on_change()


class DiscoveryService:
    """Manages mDNS service advertisement and discovery"""
    
    def __init__(self, port: int = 8000, device_name: str | None = None):
        self.port = port
        self.peer_id = str(uuid.uuid4())[:8]
        self.device_name = device_name or socket.gethostname()
        self.peers: dict[str, Peer] = {}
        self.zeroconf: AsyncZeroconf | None = None
        self.service_info: ServiceInfo | None = None
        self.browser: ServiceBrowser | None = None
        self._on_peers_changed: Callable | None = None
    
    def set_peers_changed_callback(self, callback: Callable):
        """Set callback for when peers list changes"""
        self._on_peers_changed = callback
    
    async def start(self):
        """Start advertising service and discovering peers"""
        self.zeroconf = AsyncZeroconf()
        
        # Get local IP address
        local_ip = self._get_local_ip()
        
        # Create service info for advertisement
        self.service_info = ServiceInfo(
            SERVICE_TYPE,
            f"{self.peer_id}.{SERVICE_TYPE}",
            addresses=[socket.inet_aton(local_ip)],
            port=self.port,
            properties={
                "peer_id": self.peer_id,
                "name": self.device_name
            }
        )
        
        # Register our service
        await self.zeroconf.async_register_service(self.service_info)
        
        # Start browsing for other services
        listener = PeerDiscoveryListener(self.peers, self._on_peers_changed)
        listener.set_zeroconf(self.zeroconf.zeroconf)
        self.browser = ServiceBrowser(
            self.zeroconf.zeroconf, 
            SERVICE_TYPE, 
            listener
        )
        
        print(f"[Discovery] Started - ID: {self.peer_id}, Name: {self.device_name}")
        print(f"[Discovery] Listening on {local_ip}:{self.port}")
    
    async def stop(self):
        """Stop advertising and discovering"""
        if self.browser:
            self.browser.cancel()
        
        if self.service_info and self.zeroconf:
            await self.zeroconf.async_unregister_service(self.service_info)
        
        if self.zeroconf:
            await self.zeroconf.async_close()
        
        print("[Discovery] Stopped")
    
    def get_peers(self) -> list[Peer]:
        """Get list of discovered peers (excluding self)"""
        return [p for p in self.peers.values() if p.peer_id != self.peer_id]
    
    def _get_local_ip(self) -> str:
        """Get local IP address"""
        try:
            # Create a socket to determine local IP
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            s.connect(("10.255.255.255", 1))
            ip = s.getsockname()[0]
            s.close()
            return ip
        except Exception:
            return "127.0.0.1"
