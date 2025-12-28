import express, { Request, Response } from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import path from 'path';

// Minimal service stubs for now; real logic will be wired later
export const app = express();
const server = http.createServer(app);
export const io = new SocketIOServer(server, { cors: { origin: '*' } });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

// Serve static frontend during development if needed
const frontendPath = path.join(__dirname, '..', 'public');
app.use('/public', express.static(frontendPath));

io.on('connection', (socket) => {
  console.log('Socket connected:', socket.id);
  socket.on('disconnect', () => console.log('Socket disconnected:', socket.id));
});

export function startServer(port: number = 3001) {
  server.listen(port, () => {
    console.log(`Server listening on http://localhost:${port}`);
  });
}
