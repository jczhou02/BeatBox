import { initializeSocket } from '@/app/utils/socket/socket'; // Socket.io client
import React, { useEffect, useState } from 'react';

export default function MultiBattlePage({session, type}) {
    const [socket, setSocket] = useState(null);
    const [roomId, setRoomId] = useState(null);
    const [players, setPlayers] = useState([]);
    const [status, setStatus] = useState('waiting');

    useEffect(() => {
        const socketInstance = initializeSocket();
        setSocket(socketInstance);

        socketInstance.on('room:ready', (data) => {
            console.log('Room is ready:', data);
            setPlayers(data.players);
            setStatus('ready');
        });
        return () => {
            socketInstance.disconnect();
        };
    }, []);
    
    useEffect(() => {
        if(!type || !socket || !session) return;
        const username = session.user.name;
        console.log('Creating room for ', username,' of type: ', type);
        socket.emit('room:create', { username, type }, (response) => {
            console.log('Room created:', response);
            setRoomId(response.roomId);
            setStatus(response.status); 
        });
    },[session, socket]);

    return (
        <div>
            {status === 'waiting' && (
                <p className='mt-4 text-yellow-500'>Waiting for opponent...</p>
            )}
            {status === 'ready' && (
                <div className="mt-4 text-green-500">
                    <p>Room Ready!</p>
                    <p>Room ID: {roomId}</p>
                    <p>Players: {players.join(', ')}</p>
                </div>
            )}
        </div>
    );
}