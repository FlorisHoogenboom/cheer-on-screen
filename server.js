const express = require('express');
const http = require('http');
const path = require('path');
const { WebSocketServer } = require('ws');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ noServer: true });

const PORT = process.env.PORT || 3000;

// State
let currentMessage = null;
const displayClients = new Set();

// Serve static files (display/ and control/ directories each have index.html)
app.use(express.static(path.join(__dirname, 'public')));

// WebSocket upgrade handling
server.on('upgrade', (req, socket, head) => {
  const pathname = new URL(req.url, `http://localhost:${PORT}`).pathname;

  if (pathname === '/ws/display' || pathname === '/ws/control') {
    wss.handleUpgrade(req, socket, head, (ws) => {
      ws.role = pathname === '/ws/display' ? 'display' : 'control';
      wss.emit('connection', ws, req);
    });
  } else {
    socket.destroy();
  }
});

// WebSocket connections
wss.on('connection', (ws) => {
  if (ws.role === 'display') {
    displayClients.add(ws);
    // Send current state to newly connected display
    ws.send(JSON.stringify({ type: 'state', currentMessage }));
  }

  ws.on('message', (data) => {
    let msg;
    try {
      msg = JSON.parse(data);
    } catch {
      return;
    }

    if (ws.role === 'control') {
      if (msg.type === 'cheer') {
        currentMessage = { text: msg.text, animation: msg.animation, theme: msg.theme };
        broadcast({ type: 'cheer', ...currentMessage });
      } else if (msg.type === 'clear') {
        currentMessage = null;
        broadcast({ type: 'clear' });
      }
    }
  });

  ws.on('close', () => {
    displayClients.delete(ws);
  });
});

function broadcast(msg) {
  const payload = JSON.stringify(msg);
  for (const client of displayClients) {
    if (client.readyState === 1) {
      client.send(payload);
    }
  }
}

server.listen(PORT, () => {
  console.log(`Cheer-on-Screen running at http://localhost:${PORT}`);
  console.log(`  Display: http://localhost:${PORT}/display`);
  console.log(`  Control: http://localhost:${PORT}/control`);
});
