import { Server as SocketIOServer } from 'socket.io';

let ioInstance = null;

/**
 * Initializes the Socket.io server instance attached to the HTTP server.
 * @param {import('http').Server} httpServer
 * @param {string} clientUrl
 * @returns {SocketIOServer}
 */
export function initSocketIO(httpServer, clientUrl) {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: clientUrl,
      credentials: true,
    },
    pingTimeout: 30000,
    pingInterval: 10000,
  });

  io.on('connection', (socket) => {
    socket.on('join:show', (showId) => {
      if (showId) {
        socket.join(showId.toString());
      }
    });

    socket.on('leave:show', (showId) => {
      if (showId) {
        socket.leave(showId.toString());
      }
    });
  });

  ioInstance = io;
  return io;
}

/**
 * Returns the active Socket.io instance if initialized.
 * @returns {SocketIOServer|null}
 */
export function getIO() {
  return ioInstance;
}

/**
 * Emits an event to a specific show room safely.
 * @param {string|number} showId
 * @param {string} event
 * @param {Object} payload
 */
export function emitToShowRoom(showId, event, payload) {
  if (ioInstance && showId) {
    ioInstance.to(showId.toString()).emit(event, payload);
  }
}
