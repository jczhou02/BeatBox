import { io } from 'socket.io-client';

let socket;

export function initializeSocket() {
    if (!socket) {
        console.log('Initializing new Socket.io client...');
        socket = io(process.env.NEXT_PUBLIC_SOCKET_SERVER || 'http://localhost:3000', {path: '/api/socket'});

        socket.on('connect', () => {
            console.log('Connected to Socket.io server');
        });

        socket.on('disconnect', () => {
            console.log('Disconnected from Socket.io server');
        });
    }
    return socket;
}

export function getSocket() {
    if (!socket) {
        console.log('Socket.io client not initialized. Please call initializeSocket() first.');
    }
    return socket;
}