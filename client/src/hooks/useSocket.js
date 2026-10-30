import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5001';

/**
 * Socket.io hook for show-specific seat state updates with a polling fallback.
 * @param {string} showId
 * @param {Object} eventHandlers - { onSeatsHeld, onSeatsReleased, onSeatsBooked, onPollRefresh }
 */
export function useSocket(showId, eventHandlers = {}) {
  const socketRef = useRef(null);
  const handlersRef = useRef(eventHandlers);
  handlersRef.current = eventHandlers;

  useEffect(() => {
    if (!showId) return;

    // Initialize socket connection
    const socket = io(SOCKET_URL, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join:show', showId);
    });

    socket.on('seats:held', (data) => handlersRef.current.onSeatsHeld?.(data));
    socket.on('seats:released', (data) => handlersRef.current.onSeatsReleased?.(data));
    socket.on('seats:booked', (data) => handlersRef.current.onSeatsBooked?.(data));

    // 10s Polling fallback to guarantee state synchronization
    const pollInterval = setInterval(() => {
      handlersRef.current.onPollRefresh?.();
    }, 10000);

    return () => {
      clearInterval(pollInterval);
      if (socket) {
        socket.emit('leave:show', showId);
        socket.disconnect();
      }
    };
  }, [showId]);

  return socketRef.current;
}
