import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import io, { Socket } from 'socket.io-client';
import YouTube from 'react-youtube';
import { Camera, CameraOff, Mic, MicOff, Send, PlayCircle, PauseCircle } from 'lucide-react';
import { extractYouTubeId } from '@/utils/extractYouTubeId';

let socket: Socket;

export default function Room() {
    const router = useRouter();
    const { id: roomId } = router.query;

    const [connected, setConnected] = useState(false);
    const [messages, setMessages] = useState<{ sender: string, text: string }[]>([]);
    const [chatInput, setChatInput] = useState('');

    const [videoLinkInput, setVideoLinkInput] = useState('');
    // Default video ID for "Jab We Met"
    const [videoId, setVideoId] = useState<string | null>('jf2gOSORoqU');
    const [isPlaying, setIsPlaying] = useState(false);
    const [copied, setCopied] = useState(false);

    // Media states
    const [cameraOn, setCameraOn] = useState(false);
    const [micOn, setMicOn] = useState(false);
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);

    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);
    const playerRef = useRef<any>(null);

    useEffect(() => {
        // Save state helper
        const saveState = () => {
            const saved = {
                videoId,
                messages,
            };
            localStorage.setItem('movieNightRoomState', JSON.stringify(saved));
        };
        saveState();
    }, [videoId, messages]);

    useEffect(() => {
        socketInitializer();
        return () => {
            if (socket) socket.disconnect();
        };
    }, []);

    const socketInitializer = async () => {
        // Call the API route to ensure Socket is running
        await fetch('/api/socket');

        socket = io({
            path: '/api/socket',
        });

        socket.on('connect', () => {
            setConnected(true);
            if (roomId) {
                socket.emit('join-room', roomId);
            }
        });

        socket.on('receive-message', (data) => {
            setMessages((prev) => [...prev, data]);
        });

        socket.on('video-change', (data) => {
            setVideoId(data.videoId);
        });

        socket.on('video-state', (data) => {
            if (!playerRef.current) return;
            const player = playerRef.current; // The target is directly saved

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

    const toggleCamera = async () => {
        if (cameraOn) {
            localStream?.getVideoTracks().forEach(track => track.stop());
            setCameraOn(false);
        } else {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: micOn });
                setLocalStream(stream);
                if (localVideoRef.current) localVideoRef.current.srcObject = stream;
                setCameraOn(true);
            } catch (err) {
                console.error("Camera error", err);
            }
        }
    };

    const toggleMic = async () => {
        if (micOn) {
            localStream?.getAudioTracks().forEach(track => track.stop());
            setMicOn(false);
        } else {
            if (localStream) {
                // Already have stream, but didn't request audio initially
                // A bit complex for simple toggle, let's just re-request or assume audio was requested
            } else {
                try {
                    const stream = await navigator.mediaDevices.getUserMedia({ video: cameraOn, audio: true });
                    setLocalStream(stream);
                    if (localVideoRef.current) localVideoRef.current.srcObject = stream;
                } catch (err) {
                    console.error("Mic error", err);
                }
            }
            setMicOn(true);
        }
    };

    // Video Player Handlers
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
        <div className="min-h-screen p-4 md:p-8 flex flex-col items-center relative">
            {/* Share Link Button */}
            <div className="absolute top-4 right-4 md:top-8 md:right-8">
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

            <div className="flex flex-col lg:flex-row gap-6 w-full max-w-6xl h-[70vh]">
                {/* Main Video Area */}
                <div className="flex-1 flex flex-col gap-4">
                    <div className="glass-card flex-1 rounded-3xl overflow-hidden relative flex flex-col bg-black">
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
                    <div className="glass-card p-4 rounded-2xl flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button onClick={() => playerRef.current?.playVideo()} className="p-3 bg-blue-100 hover:bg-blue-200 text-blue-600 rounded-full transition-colors" title="Play Server-Sync">
                                <PlayCircle size={24} />
                            </button>
                            <button onClick={() => playerRef.current?.pauseVideo()} className="p-3 bg-pink-100 hover:bg-pink-200 text-pink-600 rounded-full transition-colors" title="Pause Server-Sync">
                                <PauseCircle size={24} />
                            </button>
                            <span className="text-sm font-medium text-gray-500">Sync Controls</span>
                        </div>

                        <div className="flex items-center gap-4 text-sm font-medium text-gray-700">
                            <span className="bg-white/50 px-3 py-1 rounded-lg">**Camera ON (agar mann ho)**</span>
                            <span className="bg-white/50 px-3 py-1 rounded-lg">**Mic ON**</span>
                            <button onClick={toggleCamera} className={`p-3 rounded-full transition-colors ${cameraOn ? 'bg-pink-500 text-white shadow-md' : 'bg-gray-200 text-gray-600'}`}>
                                {cameraOn ? <Camera size={20} /> : <CameraOff size={20} />}
                            </button>
                            <button onClick={toggleMic} className={`p-3 rounded-full transition-colors ${micOn ? 'bg-blue-500 text-white shadow-md' : 'bg-gray-200 text-gray-600'}`}>
                                {micOn ? <Mic size={20} /> : <MicOff size={20} />}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Sidebar */}
                <div className="w-full lg:w-80 flex flex-col gap-4 h-full">
                    {/* WebRTC Video Feeds */}
                    <div className="flex gap-2">
                        <div className="flex-1 aspect-video bg-gray-900 rounded-2xl overflow-hidden glass-card relative border-2 border-pink-200">
                            <video ref={localVideoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
                            <span className="absolute bottom-2 left-2 text-xs bg-black/50 text-white px-2 py-1 rounded-md">Tu</span>
                        </div>
                        <div className="flex-1 aspect-video bg-gray-900 rounded-2xl overflow-hidden glass-card relative border-2 border-blue-200">
                            <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
                            <span className="absolute bottom-2 left-2 text-xs bg-black/50 text-white px-2 py-1 rounded-md">Main</span>
                        </div>
                    </div>

                    {/* Chat Box */}
                    <div className="glass-card flex-1 rounded-3xl p-4 flex flex-col">
                        <div className="flex flex-col gap-3 flex-1 overflow-y-auto mb-4 p-2">
                            {messages.length === 0 && (
                                <p className="text-gray-400 text-center text-sm m-auto">Room is quiet... say hi!</p>
                            )}
                            {messages.map((msg, i) => (
                                <div key={i} className={`flex ${msg.sender === 'You' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`px-4 py-2 rounded-2xl max-w-[85%] text-sm ${msg.sender === 'You' ? 'bg-pink-500 text-white' : 'bg-white text-gray-800 shadow-sm border border-gray-100'}`}>
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
                                className="flex-1 p-3 rounded-xl border border-pink-100 focus:outline-none focus:ring-2 focus:ring-pink-300 bg-white/80"
                            />
                            <button type="submit" className="bg-pink-400 hover:bg-pink-500 text-white p-3 rounded-xl transition-colors shadow-sm">
                                <Send size={20} />
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
