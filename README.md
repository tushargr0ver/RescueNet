<p align="center">
  <img src="demo.webp" alt="RescueNet Demo" width="700"/>
</p>

<h1 align="center">📡 RescueNet</h1>
<p align="center">
  <strong>P2P Chat Without Internet</strong><br>
  Secure messaging on your local network using WebRTC
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react" alt="React"/>
  <img src="https://img.shields.io/badge/FastAPI-0.128-009688?style=flat-square&logo=fastapi" alt="FastAPI"/>
  <img src="https://img.shields.io/badge/WebRTC-P2P-333333?style=flat-square&logo=webrtc" alt="WebRTC"/>
  <img src="https://img.shields.io/badge/License-MIT-blue?style=flat-square" alt="License"/>
</p>

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🔒 **Encrypted** | End-to-end encryption via WebRTC DataChannels |
| 📡 **No Internet** | Works entirely on local network |
| 🔍 **Auto Discovery** | mDNS finds nearby devices automatically |
| ⚡ **Direct P2P** | Messages bypass server after handshake |

---

## 🏗️ Architecture

```
┌────────────────────────────────────────────────────────────┐
│                      Local Network                          │
│                                                             │
│   ┌─────────────┐    mDNS Discovery    ┌─────────────┐     │
│   │  Device A   │◄────────────────────►│  Device B   │     │
│   │             │                       │             │     │
│   │  ┌───────┐  │  WebSocket Signaling │  ┌───────┐  │     │
│   │  │ React │◄─┼──────────────────────┼─►│ React │  │     │
│   │  └───┬───┘  │                       │  └───┬───┘  │     │
│   │      │      │   WebRTC DataChannel  │      │      │     │
│   │      └──────┼───────────────────────┼──────┘      │     │
│   │  ┌───────┐  │      (Direct P2P)     │  ┌───────┐  │     │
│   │  │FastAPI│  │                       │  │FastAPI│  │     │
│   │  └───────┘  │                       │  └───────┘  │     │
│   └─────────────┘                       └─────────────┘     │
│                                                             │
└────────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start

### Prerequisites
- Python 3.11+ with [uv](https://github.com/astral-sh/uv)
- [Bun](https://bun.sh/) (or Node.js)

### 1. Clone & Start Backend
```bash
git clone https://github.com/tushargr0ver/RescueNet.git
cd RescueNet/backend
uv sync
uv run uvicorn main:app --host 0.0.0.0 --port 8000
```

### 2. Start Frontend
```bash
cd frontend
bun install
bun run dev --host
```

### 3. Connect Devices
Open `http://<your-ip>:5173` on devices connected to the **same network**.

---

## 📁 Structure

```
RescueNet/
├── backend/
│   ├── main.py          # FastAPI server
│   ├── discovery.py     # mDNS peer discovery
│   └── signaling.py     # WebRTC signaling
└── frontend/
    └── src/
        ├── App.jsx
        ├── hooks/
        │   ├── useSignaling.js
        │   └── useWebRTC.js
        └── components/
            ├── PeerList.jsx
            └── ChatWindow.jsx
```

---

## 📜 License

MIT © [tushargr0ver](https://github.com/tushargr0ver)
