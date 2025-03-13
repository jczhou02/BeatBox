import { Server } from 'socket.io';

const rooms = {};

export default function handler(req, res) {
    console.log('Socket.io API handler called. Incoming request:', req.method, req.url);
    res.status(200).json({message: 'Socket API handler working!'});
    if (!res.socket.server.io) {
        console.log('New Socket.io server...');
        const io = new Server(res.socket.server, {path: '/api/socket'});
        res.socket.server.io = io;

        io.on('connection', (socket) => {
            console.log('New client connected', socket.id);
            socket.on('room:create', (data, callback) => {
                const {username, type} = data;
                if (type === 'friend') {
                    const roomId = `room-${socket.id}`;
                    rooms[roomId] = {id: roomId, players: [username], open: true};
                    socket.join(roomId);
                    console.log('Private Room created for friend: ', roomId);
                    callback({roomId, status: 'waiting'});
                }
                else if (type === 'stranger') {
                    const openRoom = Object.values(rooms).find(room => room.open);
                    if (openRoom) {
                        openRoom.players.push(username);
                        openRoom.open = false;
                        socket.join(openRoom.id);
                        console.log('Public Room joined: ', openRoom.id);
                        io.to(openRoom.id).emit('room:ready', {roomId: openRoom.id, players: openRoom.players});
                        callback({roomId: openRoom.id, status: 'ready'});
                    } else {
                        const roomId = `room-${socket.id}`;
                        rooms[roomId] = {id: roomId, players: [username], open: true};
                        socket.join(roomId);
                        console.log('Public Room created for stranger: ', roomId);
                        callback({roomId, status: 'waiting'});
                    }
                }
            });
            socket.on('room:update', (roomId, data) => {
                console.log('Room ${roomId} updated with data: ', data);
                io.to(roomId).emit('room:updated', data);
            });

            socket.on('disconnect', () => {
                console.log('Client disconnected', socket.id);
                for (const [roomId, room] of Object.entries(rooms)) {
                    if (room.players.includes(socket.id)) {
                        room.players = room.players.filter(player => player !== socket.id);
                        if (room.players.length === 0) {
                            delete rooms[roomId];
                            console.log('Room ${roomId} deleted');
                        } else {
                            room.open = true;
                            console.log('Room ${roomId} reopened');
                        }
                    }
                }
            });
        });
    }
    res.end();
}