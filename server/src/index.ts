import uWS from 'uWebSockets.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { RoomManager } from './network/RoomManager.js';
import type { ClientMessage, ServerMessage } from './types/protocol.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DIST_DIR = path.resolve(__dirname, '../../dist');

const PORT = parseInt(process.env.PORT || '3000', 10);

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
  // Broadcast to room topic
  (roomId: string, message: ServerMessage) => {
    const payload = JSON.stringify(message);
    app.publish(`room:${roomId}`, payload, false);
  },
  // Send direct to single client
  (clientId: string, message: ServerMessage) => {
    const socket = clientSockets.get(clientId);
    if (socket) {
      socket.send(JSON.stringify(message), false);
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
    const data = ws.getUserData();
    clientSockets.set(data.id, ws);
    // Subscribe to client's own direct message topic
    ws.subscribe(`direct:${data.id}`);

    // Send available room list on connection
    ws.send(
      JSON.stringify({
        type: 'ROOM_LIST',
        rooms: roomManager.getRoomList(),
      })
    );
  },

  message: (ws, message, _isBinary) => {
    const data = ws.getUserData();
    try {
      const text = Buffer.from(message).toString('utf-8');
      const msg = JSON.parse(text) as ClientMessage;

      // Handle topic subscription if joining/creating room
      if (msg.type === 'CREATE_ROOM' || msg.type === 'JOIN_ROOM') {
        // Unsubscribe old room if any
        if (data.subscribedRoom) {
          ws.unsubscribe(`room:${data.subscribedRoom}`);
        }
      }

      roomManager.handleClientMessage(data.id, msg);

      // If room was joined, subscribe to room topic
      if (msg.type === 'JOIN_ROOM') {
        data.subscribedRoom = msg.roomId;
        ws.subscribe(`room:${msg.roomId}`);
      }
    } catch (err) {
      console.error('Error handling websocket message:', err);
    }
  },

  close: (ws, _code, _message) => {
    const data = ws.getUserData();
    clientSockets.delete(data.id);
    if (data.subscribedRoom) {
      ws.unsubscribe(`room:${data.subscribedRoom}`);
    }
    roomManager.handleClientDisconnect(data.id);
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
