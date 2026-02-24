import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/router';
import io, { Socket } from 'socket.io-client';
import YouTube from 'react-youtube';
import { Camera, CameraOff, Mic, MicOff, Send, PlayCircle, PauseCircle, Heart } from 'lucide-react';
import { extractYouTubeId } from '@/utils/extractYouTubeId';

let socket: Socket;

// Helper to generate random IDs for emojis
const generateId = () => Math.random().toString(36).substr(2, 9);

interface Reaction {
    id: string;
    emoji: string;
    x: number;
}

export default function Room() {
    const router = useRouter();
    const { id: roomId } = router.query;

    const [connected, setConnected] = useState(false);
    const [messages, setMessages] = useState<{ sender: string, text: string }[]>([]);
    const [chatInput, setChatInput] = useState('');

    const [videoLinkInput, setVideoLinkInput] = useState('');
    const [videoId, setVideoId] = useState<string | null>('jf2gOSORoqU');
    const [isPlaying, setIsPlaying] = useState(false);
    const [copied, setCopied] = useState(false);

    // Emoji Reactions State
    const [reactions, setReactions] = useState<Reaction[]>([]);

    // Media states
    const [cameraOn, setCameraOn] = useState(false);
    const [micOn, setMicOn] = useState(false);
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);

    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);
    const playerRef = useRef<any>(null);

    // WebRTC ref
    const peerConnectionRef = useRef<RTCPeerConnection | null>(null);

    useEffect(() => {
        // Save state helper
        const saveState = () => {
            const saved = { videoId, messages };
            localStorage.setItem('movieNightRoomState', JSON.stringify(saved));
        };
        saveState();
    }, [videoId, messages]);

    useEffect(() => {
        socketInitializer();
        return () => {
            if (socket) socket.disconnect();
            if (peerConnectionRef.current) {
                peerConnectionRef.current.close();
            }
        };
    }, []);

    const initWebRTC = () => {
        if (peerConnectionRef.current) return;

        const pc = new RTCPeerConnection({
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:global.stun.twilio.com:3478' }
            ]
        });

        pc.onicecandidate = (event) => {
            if (event.candidate && socket) {
                socket.emit('webrtc-ice-candidate', { roomId, candidate: event.candidate });
            }
        };

        pc.ontrack = (event) => {
            if (remoteVideoRef.current && event.streams[0]) {
                remoteVideoRef.current.srcObject = event.streams[0];
            }
        };

        peerConnectionRef.current = pc;
    };

    const socketInitializer = async () => {
        await fetch('/api/socket');
        socket = io({ path: '/api/socket' });

        socket.on('connect', () => {
            setConnected(true);
            if (roomId) socket.emit('join-room', roomId);
            initWebRTC(); // ensure PC is ready
        });

        socket.on('receive-message', (data) => setMessages((prev) => [...prev, data]));
        socket.on('video-change', (data) => setVideoId(data.videoId));
        socket.on('emoji-reaction', (data) => handleIncomingReaction(data.emoji));

        socket.on('video-state', (data) => {
            if (!playerRef.current) return;
            const player = playerRef.current;
            if (data.type === 'play') {
                setIsPlaying(true);
                player.playVideo();
            } else if (data.type === 'pause') {
                setIsPlaying(false);
                player.pauseVideo();
            } else if (data.type === 'seek') {
                player.seekTo(data.time, true);
            }
        });

        socket.on('webrtc-offer', async (data) => {
            if (!peerConnectionRef.current) initWebRTC();
            const pc = peerConnectionRef.current!;
            await pc.setRemoteDescription(new RTCSessionDescription(data.signal));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            socket.emit('webrtc-answer', { roomId, signal: answer });
        });

        socket.on('webrtc-answer', async (data) => {
            if (!peerConnectionRef.current) return;
            const pc = peerConnectionRef.current;
            await pc.setRemoteDescription(new RTCSessionDescription(data.signal));
        });

        socket.on('webrtc-ice-candidate', async (data) => {
            if (!peerConnectionRef.current) return;
            try {
                await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
            } catch (e) {
                console.error("Error adding received ice candidate", e);
            }
        });
    };

    const makeCall = async () => {
        if (!peerConnectionRef.current) return;
        const pc = peerConnectionRef.current;
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('webrtc-offer', { roomId, signal: offer });
    };

    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (!chatInput.trim()) return;
        const msg = { roomId, sender: 'You', text: chatInput };
        socket.emit('send-message', msg);
        setChatInput('');
    };

    const handleLinkSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const extractedId = extractYouTubeId(videoLinkInput);
        if (extractedId) {
            setVideoId(extractedId);
            socket.emit('video-change', { roomId, videoId: extractedId });
            setVideoLinkInput('');
        } else {
            alert("Invalid YouTube link");
        }
    };

    const triggerReaction = (emoji: string) => {
        socket.emit('emoji-reaction', { roomId, emoji });
        handleIncomingReaction(emoji);
    };

    const handleIncomingReaction = useCallback((emoji: string) => {
        const id = generateId();
        const x = Math.floor(Math.random() * 80) + 10; // 10% to 90% across screen
        setReactions(prev => [...prev, { id, emoji, x }]);
        setTimeout(() => {
            setReactions(prev => prev.filter(r => r.id !== id));
        }, 4000); // Remove after animation finishes
    }, []);

    const updateMedia = async (useVideo: boolean, useAudio: boolean) => {
        try {
            if (localStream) {
                localStream.getTracks().forEach(track => track.stop());
            }

            if (!useVideo && !useAudio) {
                setLocalStream(null);
                return;
            }

            const stream = await navigator.mediaDevices.getUserMedia({ video: useVideo, audio: useAudio });
            setLocalStream(stream);

            if (localVideoRef.current) {
                localVideoRef.current.srcObject = stream;
            }

            if (!peerConnectionRef.current) initWebRTC();
            const pc = peerConnectionRef.current!;

            // Clear old senders
            pc.getSenders().forEach(sender => pc.removeTrack(sender));
            stream.getTracks().forEach(track => pc.addTrack(track, stream));

            makeCall(); // Initiate negotiation

        } catch (err) {
            console.error("Media error", err);
        }
    };

    const toggleCamera = () => {
        const newState = !cameraOn;
        setCameraOn(newState);
        updateMedia(newState, micOn);
    };

    const toggleMic = () => {
        const newState = !micOn;
        setMicOn(newState);
        updateMedia(cameraOn, newState);
    };

    const onReady = (event: any) => {
        playerRef.current = event.target;
    };

    const onPlay = () => {
        setIsPlaying(true);
        if (playerRef.current) {
            socket.emit('video-state', { roomId, type: 'play', time: playerRef.current.getCurrentTime() });
        }
    };

    const onPause = () => {
        setIsPlaying(false);
        if (playerRef.current) {
            socket.emit('video-state', { roomId, type: 'pause', time: playerRef.current.getCurrentTime() });
        }
    };

    const copyInviteLink = () => {
        const url = window.location.origin + router.asPath;
        navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
    };

    return (
        <div className="min-h-screen p-4 md:p-8 flex flex-col items-center relative overflow-hidden">
            {/* Floating Emojis Overlay */}
            {reactions.map((reaction) => (
                <div
                    key={reaction.id}
                    className="absolute bottom-[-10%] text-5xl md:text-6xl animate-float-up pointer-events-none z-50 drop-shadow-lg"
                    style={{ left: `${reaction.x}%` }}
                >
                    {reaction.emoji}
                </div>
            ))}

            {/* Share Link Button */}
            <div className="absolute top-4 right-4 md:top-8 md:right-8 z-10">
                <button
                    onClick={copyInviteLink}
                    className="flexItemsCenter gap-2 px-4 py-2 bg-white/80 backdrop-blur-md rounded-xl text-pink-600 font-medium shadow-sm hover:shadow-md transition-all border border-pink-100"
                >
                    {copied ? '✅ Link Copied!' : '🔗 Invite Sargam'}
                </button>
            </div>

            {/* Header */}
            <div className="text-center w-full max-w-4xl mb-8 space-y-4">
                <h1 className="text-2xl font-medium text-pink-500">Toh phir fix? 🙂</h1>
                <h2 className="text-3xl font-bold text-gray-800">**Movie: Jab We Met 🤍**</h2>
                <p className="text-gray-600 font-medium italic bg-white/60 p-4 rounded-xl inline-block shadow-sm">
                    "Yaar, hum bhi toh train mein mile the na? weh wali hi dekhte hai, irl ho jayega"
                </p>
            </div>

            <div className="flex flex-col lg:flex-row gap-6 w-full max-w-6xl h-[70vh] z-10">
                {/* Main Video Area */}
                <div className="flex-1 flex flex-col gap-4">
                    <div className="glass-card flex-1 rounded-3xl overflow-hidden relative flex flex-col bg-black shadow-2xl">
                        {videoId ? (
                            <YouTube
                                videoId={videoId}
                                opts={{ width: '100%', height: '100%', playerVars: { autoplay: 1 } }}
                                onReady={onReady}
                                onPlay={onPlay}
                                onPause={onPause}
                                className="absolute inset-0 w-full h-full"
                                iframeClassName="w-full h-full"
                            />
                        ) : (
                            <div className="flex-1 flex items-center justify-center flex-col p-8 text-white/70">
                                <p className="mb-4 text-xl font-medium">No video selected</p>
                                <form onSubmit={handleLinkSubmit} className="flex gap-2 w-full max-w-md">
                                    <input
                                        type="text"
                                        value={videoLinkInput}
                                        onChange={e => setVideoLinkInput(e.target.value)}
                                        placeholder="Link paste kar (YouTube URL)"
                                        className="flex-1 p-3 rounded-xl bg-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-pink-400"
                                    />
                                    <button type="submit" className="bg-pink-500 hover:bg-pink-600 text-white px-6 rounded-xl transition-colors font-medium">
                                        Play
                                    </button>
                                </form>
                            </div>
                        )}
                    </div>

                    {/* Controls Bar */}
                    <div className="glass-card p-4 rounded-2xl flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <button onClick={() => playerRef.current?.playVideo()} className="p-3 bg-blue-100 hover:bg-blue-200 text-blue-600 rounded-full transition-all hover:scale-105 shadow-sm" title="Play Server-Sync">
                                <PlayCircle size={24} />
                            </button>
                            <button onClick={() => playerRef.current?.pauseVideo()} className="p-3 bg-pink-100 hover:bg-pink-200 text-pink-600 rounded-full transition-all hover:scale-105 shadow-sm" title="Pause Server-Sync">
                                <PauseCircle size={24} />
                            </button>
                            <span className="hidden sm:inline text-sm font-medium text-gray-500 ml-2">Sync Controls</span>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-pink-500 mr-2 uppercase tracking-tight">Interactive</span>
                            <button onClick={() => triggerReaction('💖')} className="p-3 bg-pink-50 hover:bg-pink-100 text-pink-500 rounded-full transition-all hover:scale-110 shadow-sm border border-pink-100" title="Send Heart">
                                <Heart size={24} fill="currentColor" />
                            </button>
                            <button onClick={() => triggerReaction('😂')} className="p-3 text-2xl hover:scale-110 transition-transform" title="Laugh">
                                😂
                            </button>
                            <button onClick={() => triggerReaction('🍿')} className="p-3 text-2xl hover:scale-110 transition-transform" title="Popcorn">
                                🍿
                            </button>
                        </div>
                    </div>
                </div>

                {/* Sidebar */}
                <div className="w-full lg:w-80 flex flex-col gap-4 h-full">
                    {/* WebRTC Video Feeds */}
                    <div className="flex gap-3 h-40 lg:h-48">
                        <div className="flex-1 bg-gray-900 rounded-2xl overflow-hidden glass-card relative border border-pink-200 shadow-md group">
                            <video ref={localVideoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                                <button onClick={toggleCamera} className={`p-3 rounded-full transition-colors ${cameraOn ? 'bg-pink-500 text-white shadow-md' : 'bg-white/20 text-white hover:bg-white/40'}`}>
                                    {cameraOn ? <Camera size={20} /> : <CameraOff size={20} />}
                                </button>
                                <button onClick={toggleMic} className={`p-3 rounded-full transition-colors ${micOn ? 'bg-blue-500 text-white shadow-md' : 'bg-white/20 text-white hover:bg-white/40'}`}>
                                    {micOn ? <Mic size={20} /> : <MicOff size={20} />}
                                </button>
                            </div>
                            <span className="absolute bottom-2 left-2 text-xs bg-black/60 backdrop-blur-sm text-white px-2 py-1 rounded-md font-medium">Tu</span>
                        </div>
                        <div className="flex-1 bg-gray-900 rounded-2xl overflow-hidden glass-card relative border border-blue-200 shadow-md">
                            <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
                            <span className="absolute bottom-2 left-2 text-xs bg-black/60 backdrop-blur-sm text-white px-2 py-1 rounded-md font-medium">Main</span>
                        </div>
                    </div>

                    {/* Chat Box */}
                    <div className="glass-card flex-1 rounded-3xl p-4 flex flex-col shadow-lg border border-white/50 bg-white/60">
                        <div className="flex flex-col gap-3 flex-1 overflow-y-auto mb-4 p-2 custom-scrollbar">
                            {messages.length === 0 && (
                                <p className="text-gray-400 text-center text-sm m-auto">Room is quiet... say hi!</p>
                            )}
                            {messages.map((msg, i) => (
                                <div key={i} className={`flex ${msg.sender === 'You' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`px-4 py-2 rounded-2xl max-w-[85%] text-sm ${msg.sender === 'You' ? 'bg-gradient-to-r from-pink-400 to-pink-500 text-white shadow-md' : 'bg-white text-gray-800 shadow-sm border border-gray-100'}`}>
                                        {msg.text}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <form onSubmit={handleSendMessage} className="flex gap-2">
                            <input
                                value={chatInput}
                                onChange={e => setChatInput(e.target.value)}
                                placeholder="Type a message..."
                                className="flex-1 p-3 rounded-xl border border-pink-100 focus:outline-none focus:ring-2 focus:ring-pink-300 bg-white shadow-inner"
                            />
                            <button type="submit" className="bg-pink-500 hover:bg-pink-600 text-white p-3 rounded-xl transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5">
                                <Send size={20} />
                            </button>
                        </form>
                    </div>
                </div>
            </div>

            <style jsx>{`
                @keyframes float-up {
                    0% { transform: translateY(0) scale(0.5); opacity: 0; }
                    10% { opacity: 1; transform: translateY(-5vh) scale(1.2); }
                    50% { opacity: 0.8; }
                    100% { transform: translateY(-60vh) scale(0.8) rotate(15deg); opacity: 0; }
                }
                .animate-float-up {
                    animation: float-up 3s ease-in-out forwards;
                }
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background-color: #fbcfe8;
                    border-radius: 20px;
                }
            `}</style>
        </div>
    );
}
