import { Server as NetServer } from 'http';
import { NextApiRequest, NextApiResponse } from 'next';
import { Server as ServerIO } from 'socket.io';
import { Socket as NetSocket } from 'net';

export const config = {
    api: {
        bodyParser: false,
    },
};

type NextApiResponseServerIO = NextApiResponse & {
    socket: NetSocket & {
        server: NetServer & {
            io: ServerIO;
        };
    };
};

export default function SocketHandler(req: NextApiRequest, res: NextApiResponseServerIO) {
    if (res.socket?.server?.io) {
        console.log('Socket is already running');
    } else {
        console.log('Socket is initializing');
        if (res.socket?.server) {
            const io = new ServerIO(res.socket.server, {
                path: '/api/socket',
                addTrailingSlash: false,
            });
            res.socket.server.io = io;

            io.on('connection', socket => {
                console.log('New client connected', socket.id);

                socket.on('join-room', (roomId) => {
                    socket.join(roomId);
                    console.log(`User ${socket.id} joined room: ${roomId}`);
                });

                socket.on('send-message', (data) => {
                    io.to(data.roomId).emit('receive-message', data);
                });

                socket.on('video-state', (data) => {
                    // Broadcase play, pause, seek
                    socket.to(data.roomId).emit('video-state', data);
                });

                socket.on('video-change', (data) => {
                    io.to(data.roomId).emit('video-change', data);
                });

                // WebRTC signaling
                socket.on('webrtc-offer', (data) => {
                    socket.to(data.roomId).emit('webrtc-offer', {
                        signal: data.signal,
                        senderId: socket.id
                    });
                });

                socket.on('webrtc-answer', (data) => {
                    socket.to(data.roomId).emit('webrtc-answer', {
                        signal: data.signal,
                        senderId: socket.id
                    });
                });

                socket.on('disconnect', () => {
                    console.log('Client disconnected', socket.id);
                });
            });
        }
    }
    res.end();
}
