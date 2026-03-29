import { WebSocketServer } from 'ws';
import 'dotenv/config';
import { handleRegistration } from './commands/handleRegistration.js';
import { handleCreateGame } from './commands/handleCreateGame.js';
import type { AuthedWebSocket } from './types/types.js';
import { handleJoinGame } from './commands/handleJoinGame.js';
import { handleStartGame } from './commands/handleStartGame.js';
import { handleAnswer } from './commands/handleAnswer.js';
import { handleClientDisconnect } from './game/handleDisconnect.js';

const serverHandler = (ws: AuthedWebSocket) => {
  console.log('Client connected');
      
  ws.on('message', (rawData) => {
    let msg;

    try {
      msg = JSON.parse(rawData.toString());
    } catch (err) {
      ws.send(JSON.stringify({ id: 0, error: 'Invalid JSON' }));
      return;
    }

    switch (msg.type) {
      case 'reg':
        handleRegistration(ws, msg.data);
        break;
      case 'create_game':
        handleCreateGame(ws, msg.data);
        break;
      case 'join_game':
        handleJoinGame(ws, msg.data);
        break;
      case 'start_game':
        handleStartGame(ws, msg.data);
        break;
      case 'answer':
        handleAnswer(ws, msg.data);
        break;
      default:
        ws.send(JSON.stringify({ id: 0, error: 'Unknown command' }));
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
    handleClientDisconnect(ws);
  });
}

export const startServer = () => {
    const wss = new WebSocketServer({ port: Number(process.env.PORT) });

    wss.on('connection', serverHandler);
      
    console.log(`WebSocket server running on ws://localhost:${process.env.PORT}`);
}