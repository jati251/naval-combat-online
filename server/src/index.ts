import uWS from 'uWebSockets.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { RoomManager } from './network/RoomManager.js';
import { SecurityGuard } from './security/SecurityGuard.js';
import type { ServerMessage } from './types/protocol.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DIST_DIR = path.resolve(__dirname, '../../dist');

const PORT = parseInt(process.env.PORT || '3000', 10);

// Global exception safety to keep game server running uninterrupted
process.on('uncaughtException', (err) => {
  console.error('🛡️ [Server] Uncaught Exception caught safely:', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('🛡️ [Server] Unhandled Rejection caught safely:', reason);
});

interface SocketUserData {
  id: string;
  subscribedRoom?: string;
}

// Map of active client sockets for direct messaging
const clientSockets = new Map<string, uWS.WebSocket<SocketUserData>>();

let app: uWS.TemplatedApp;

try {
  app = uWS.App();
} catch (err) {
  console.error('Failed to initialize uWebSockets.js App:', err);
  process.exit(1);
}

const roomManager = new RoomManager(
  // Broadcast to room topic or global lobby topic
  (topic: string, message: ServerMessage) => {
    try {
      const payload = JSON.stringify(message);
      const targetTopic = topic === 'lobby' ? 'lobby' : `room:${topic}`;
      app.publish(targetTopic, payload, false);
    } catch (err) {
      console.warn(`[Broadcast] Publish to ${topic} failed:`, err);
    }
  },
  // Send direct to single client safely without crashing on dead sockets
  (clientId: string, message: ServerMessage) => {
    const socket = clientSockets.get(clientId);
    if (socket) {
      try {
        socket.send(JSON.stringify(message), false);
      } catch (err) {
        console.warn(`[SendDirect] Failed to send to ${clientId}, removing dead socket:`, err);
        clientSockets.delete(clientId);
      }
    }
  }
);

// Setup WebSocket endpoint
app.ws<SocketUserData>('/ws', {
  compression: uWS.SHARED_COMPRESSOR,
  maxPayloadLength: 16 * 1024,
  idleTimeout: 60,

  upgrade: (res, req, context) => {
    const clientId = 'player-' + Math.random().toString(36).substring(2, 9);
    res.upgrade(
      { id: clientId },
      req.getHeader('sec-websocket-key'),
      req.getHeader('sec-websocket-protocol'),
      req.getHeader('sec-websocket-extensions'),
      context
    );
  },

  open: (ws) => {
    try {
      const data = ws.getUserData();
      clientSockets.set(data.id, ws);
      ws.subscribe(`direct:${data.id}`);
      ws.subscribe('lobby');

      ws.send(
        JSON.stringify({
          type: 'ROOM_LIST',
          rooms: roomManager.getRoomList(),
        })
      );
    } catch (err) {
      console.error('🛡️ [WSOpen] Error during socket open:', err);
    }
  },

  message: (ws, message, _isBinary) => {
    const data = ws.getUserData();

    // Security & Anti-Cheat: Rate limit incoming packets
    const rateAction = SecurityGuard.checkMessageRate(data.id);
    if (rateAction === 'DISCONNECT') {
      try {
        ws.close();
      } catch {
        // Socket may already be closing
      }
      return;
    }
    if (rateAction === 'DROP') {
      return;
    }

    try {
      const text = Buffer.from(message).toString('utf-8');
      const rawMsg = JSON.parse(text);

      // Security & Anti-Cheat: Validate and sanitize client payload
      const msg = SecurityGuard.validateAndSanitize(rawMsg);
      if (!msg) {
        return; // Drop malformed / tampered packet
      }

      // Unsubscribe previous room topic if creating/joining another room
      if (msg.type === 'CREATE_ROOM' || msg.type === 'JOIN_ROOM') {
        if (data.subscribedRoom) {
          try {
            ws.unsubscribe(`room:${data.subscribedRoom}`);
          } catch {
            // Safe ignore
          }
          data.subscribedRoom = undefined;
        }
      }

      const res = roomManager.handleClientMessage(data.id, msg);

      // Subscribe socket to room topic for BOTH CREATE_ROOM and JOIN_ROOM!
      if (res?.joinedRoomId) {
        data.subscribedRoom = res.joinedRoomId;
        try {
          ws.subscribe(`room:${res.joinedRoomId}`);
        } catch {
          // Safe ignore
        }
      }

      if (msg.type === 'LEAVE_ROOM' && data.subscribedRoom) {
        try {
          ws.unsubscribe(`room:${data.subscribedRoom}`);
        } catch {
          // Safe ignore
        }
        data.subscribedRoom = undefined;
      }
    } catch (err) {
      console.error('🛡️ [WSMessage] Error handling websocket message:', err);
    }
  },

  close: (ws, _code, _message) => {
    try {
      const data = ws.getUserData();
      clientSockets.delete(data.id);
      SecurityGuard.removeClient(data.id);
      // Note: In uWS, closing sockets are automatically purged from pub/sub topics.
      roomManager.handleClientDisconnect(data.id);
    } catch (err) {
      console.error('🛡️ [WSClose] Error during socket close handling:', err);
    }
  },
});

// Health check endpoint for Kubernetes
app.get('/healthz', (res) => {
  res.writeHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ status: 'ok', uptime: process.uptime() }));
});

// API room list endpoint
app.get('/api/rooms', (res) => {
  res.writeHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(roomManager.getRoomList()));
});

// Static MIME dictionary
const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.json': 'application/json',
  '.wasm': 'application/wasm',
};

// Static file fallback router
app.get('/*', (res, req) => {
  res.onAborted(() => {
    (res as unknown as { aborted: boolean }).aborted = true;
  });

  const urlPath = req.getUrl();
  let filePath = path.join(DIST_DIR, urlPath === '/' ? 'index.html' : urlPath);

  // Check if file exists, else fallback to index.html for SPA
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(DIST_DIR, 'index.html');
  }

  if (!fs.existsSync(filePath)) {
    res.writeStatus('404 Not Found');
    res.end('Vite frontend build not found. Please run `npm run build:client`.');
    return;
  }

  try {
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    const content = fs.readFileSync(filePath);

    res.writeHeader('Content-Type', contentType);
    // Cache static hashed assets for 1 year
    if (urlPath.startsWith('/assets/')) {
      res.writeHeader('Cache-Control', 'public, max-age=31536000, immutable');
    }
    res.end(content);
  } catch (e) {
    if (!(res as unknown as { aborted: boolean }).aborted) {
      res.writeStatus('500 Internal Server Error');
      res.end('Failed to read file: ' + (e as Error).message);
    }
  }
});

// Start listening
app.listen(PORT, (token) => {
  if (token) {
    console.log(`⚓ [Naval Combat Online] uWebSockets.js Server running on port ${PORT}`);
    console.log(`🌊 WebSocket URL: ws://localhost:${PORT}/ws`);
  } else {
    console.error(`❌ Failed to listen on port ${PORT}`);
    process.exit(1);
  }
});
