
import React, { useEffect, useRef, useState } from "react";
import io from "socket.io-client";
import Peer from "simple-peer";
import { useParams, useNavigate } from "react-router-dom";
import {
    FaMicrophone, FaMicrophoneSlash,
    FaVideo, FaVideoSlash,
    FaPhoneSlash,
    FaCommentAlt, FaUserFriends,
    FaDesktop, FaInfoCircle,
    FaLanguage
} from "react-icons/fa";
import { MdOutlineScreenShare, MdOutlineStopScreenShare } from "react-icons/md";

const Video = ({ stream, userName }) => {
    const ref = useRef();

    useEffect(() => {
        if (stream && ref.current) {
            console.log(`🎥 Setting stream for ${userName}`);
            ref.current.srcObject = stream;

            // Explicitly try to play to handle autoplay restrictions
            const playPromise = ref.current.play();
            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    console.log("Autoplay prevented or interrupted:", error);
                });
            }
        } else if (!stream) {
            console.log(`⏳ Waiting for stream for ${userName}`);
        }
    }, [stream, userName]);

    return (
        <div className="video-card">
            <video
                playsInline
                autoPlay
                ref={ref}
                className="remote-video"
            />
            {!stream && <div className="video-placeholder">Connecting...</div>}
            <div className="user-name">{userName}</div>
        </div>
    );
};

const Room = () => {
    const [peers, setPeers] = useState([]);
    const socketRef = useRef();
    const userVideo = useRef();
    const userStream = useRef();
    const screnStreamRef = useRef();
    const peersRef = useRef([]);
    const { roomID } = useParams();
    const navigate = useNavigate();

    // States
    const [muted, setMuted] = useState(false);
    const [videoOff, setVideoOff] = useState(false);
    const [isScreenSharing, setIsScreenSharing] = useState(false);

    // UI States
    const [sidebarMode, setSidebarMode] = useState("none"); // "none", "chat", "people"

    // Chat
    const [messages, setMessages] = useState([]);
    const [msgInput, setMsgInput] = useState("");

    // Translation & Captions
    const [isTranslating, setIsTranslating] = useState(false);
    const [teluguTranscript, setTeluguTranscript] = useState("");
    const [captions, setCaptions] = useState("");
    const [remoteCaptions, setRemoteCaptions] = useState(null); // { sender, translation, telugu }
    const recognitionRef = useRef(null);

    const [error, setError] = useState("");

    useEffect(() => {
        // Use environment variable for production, fallback to relative for development proxy
        const socketUrl = import.meta.env.VITE_SERVER_URL || "/";
        socketRef.current = io.connect(socketUrl);

        navigator.mediaDevices.getUserMedia({ video: true, audio: true })
            .then(stream => {
                userStream.current = stream;
                if (userVideo.current) {
                    userVideo.current.srcObject = stream;
                }

                socketRef.current.emit("join room", roomID);

                socketRef.current.on("all users", users => {
                    const peers = [];
                    users.forEach(userID => {
                        const peer = createPeer(userID, socketRef.current.id, stream);

                        // Track signals in Ref
                        peersRef.current.push({
                            peerID: userID,
                            peer,
                        });

                        // Add to local list for initial state
                        peers.push({
                            peerID: userID,
                            peer,
                            stream: null
                        });

                        // Important: Listen for stream
                        peer.on("stream", remoteStream => {
                            console.log(`📡 Received stream from ${userID}`);
                            setPeers(allPeers => {
                                return allPeers.map(p => {
                                    if (p.peerID === userID) {
                                        return { ...p, stream: remoteStream };
                                    }
                                    return p;
                                });
                            });
                        });
                    });
                    setPeers(peers);
                });

                socketRef.current.on("user joined", payload => {
                    const peer = addPeer(payload.signal, payload.callerID, stream);

                    peersRef.current.push({
                        peerID: payload.callerID,
                        peer,
                    });

                    // Initialize the new peer in state
                    const peerObj = {
                        peerID: payload.callerID,
                        peer,
                        stream: null
                    };

                    setPeers(users => [...users, peerObj]);

                    peer.on("stream", remoteStream => {
                        console.log(`📡 Received stream from joined user ${payload.callerID}`);
                        setPeers(allPeers => {
                            return allPeers.map(p => {
                                if (p.peerID === payload.callerID) {
                                    return { ...p, stream: remoteStream };
                                }
                                return p;
                            });
                        });
                    });
                });

                socketRef.current.on("receiving returned signal", payload => {
                    const item = peersRef.current.find(p => p.peerID === payload.id);
                    if (item) item.peer.signal(payload.signal);
                });

                socketRef.current.on("connect", () => {
                    console.log("✅ Socket connected:", socketRef.current.id);
                });

                socketRef.current.on("connect_error", (err) => {
                    console.error("❌ Socket Connection Error:", err.message);
                });

                socketRef.current.on("receive message", payload => {
                    console.log("📥 Message received:", payload);
                    setMessages(prev => [...prev, { body: payload.message, sender: "User", time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
                    setSidebarMode(current => current === 'none' ? 'chat' : current);
                });

                socketRef.current.on("user left", id => {
                    console.log("👋 User left:", id);
                    const peerObj = peersRef.current.find(p => p.peerID === id);
                    if (peerObj) peerObj.peer.destroy();

                    peersRef.current = peersRef.current.filter(p => p.peerID !== id);
                    setPeers(prev => prev.filter(p => p.peerID !== id));
                });

                socketRef.current.on("receive translation", payload => {
                    console.log("📥 Translation received:", payload);
                    setRemoteCaptions(payload);
                    // Clear after 5 seconds of inactivity
                    setTimeout(() => {
                        setRemoteCaptions(current => (current && current.sender === payload.sender) ? null : current);
                    }, 5000);
                });
            })
            .catch(err => {
                console.error("Failed to access media:", err);
                setError("Camera/Microphone access failed. Browsers block camera access on HTTP (non-localhost) due to security reasons.");
            });

        return () => {
            if (socketRef.current) socketRef.current.disconnect();
        };
    }, []);

    if (error) {
        return (
            <div style={{
                height: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#202124',
                color: 'white',
                flexDirection: 'column',
                gap: '20px',
                fontFamily: 'Google Sans, Roboto, sans-serif'
            }}>
                <h2 style={{ fontSize: '2rem' }}>Access Denied</h2>
                <div style={{ maxWidth: '600px', textAlign: 'center', lineHeight: '1.6', color: '#bdc1c6' }}>
                    <p>{error}</p>
                    <p style={{ marginTop: '15px' }}>To test on other devices in your local network, you must:</p>
                    <div style={{ background: '#303134', padding: '20px', borderRadius: '8px', textAlign: 'left', marginTop: '15px' }}>
                        <p style={{ color: '#8ab4f8', fontWeight: 'bold', marginBottom: '10px' }}>Quick Fix (Chrome/Edge):</p>
                        <ol style={{ paddingLeft: '20px', margin: 0 }}>
                            <li>Go to <code>chrome://flags/#unsafely-treat-insecure-origin-as-secure</code></li>
                            <li>Enable the flag.</li>
                            <li>Add <code>http://{window.location.hostname}:5173</code> to the text box.</li>
                            <li>Relaunch browser.</li>
                        </ol>
                    </div>
                </div>
                <button onClick={() => window.location.href = '/'} style={{
                    padding: '12px 24px',
                    background: '#8ab4f8',
                    color: '#202124',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    marginTop: '20px'
                }}>Go Back</button>
            </div>
        );
    }

    function createPeer(userToSignal, callerID, stream) {
        const peer = new Peer({
            initiator: true,
            trickle: false,
            stream,
        });

        peer.on("signal", signal => {
            socketRef.current.emit("sending signal", { userToSignal, callerID, signal });
        });

        return peer;
    }

    function addPeer(incomingSignal, callerID, stream) {
        const peer = new Peer({
            initiator: false,
            trickle: false,
            stream,
        });

        peer.on("signal", signal => {
            socketRef.current.emit("returning signal", { signal, callerID });
        });

        peer.signal(incomingSignal);

        return peer;
    }

    const toggleAudio = () => {
        if (userStream.current) {
            const audioTrack = userStream.current.getAudioTracks()[0];
            if (audioTrack) {
                const newEnabledState = !audioTrack.enabled;
                audioTrack.enabled = newEnabledState;
                setMuted(!newEnabledState);
                console.log(`🎤 Microphone ${newEnabledState ? 'Enabled' : 'Disabled'}`);
            } else {
                alert("No microphone track found!");
            }
        }
    };

    const toggleVideo = () => {
        if (userStream.current) {
            const videoTrack = userStream.current.getVideoTracks()[0];
            if (videoTrack) {
                const newEnabledState = !videoTrack.enabled;
                videoTrack.enabled = newEnabledState;
                setVideoOff(!newEnabledState);
                console.log(`📹 Camera ${newEnabledState ? 'Enabled' : 'Disabled'}`);
            } else {
                alert("No video track found!");
            }
        }
    };

    // Screen Sharing Logic
    const toggleScreenShare = () => {
        if (isScreenSharing) {
            // Stop sharing
            // Replace screen track with video track
            const videoTrack = userStream.current.getVideoTracks()[0];

            // For all peers, replace their stream track
            peersRef.current.forEach(({ peer }) => {
                // peer.replaceTrack(oldTrack, newTrack, stream)
                // Need to monitor which track is currently being sent. SimplePeer makes this tricky.
                // Brute force: renegotiate? Or just use replaceTrack if supported.

                // Hacky way for Mesh: It's hard to reliably switch tracks in SimplePeer without renegotiation or knowing the exact track reference.
                // We'll try to find the sender.
                const sender = peer._pc.getSenders().find(s => s.track.kind === 'video');
                if (sender) sender.replaceTrack(videoTrack);
            });

            if (userVideo.current) userVideo.current.srcObject = userStream.current;

            screnStreamRef.current.getTracks().forEach(track => track.stop());
            setIsScreenSharing(false);
        } else {
            navigator.mediaDevices.getDisplayMedia({ cursor: true }).then(stream => {
                const screenTrack = stream.getVideoTracks()[0];
                screnStreamRef.current = stream;

                peersRef.current.forEach(({ peer }) => {
                    const sender = peer._pc.getSenders().find(s => s.track.kind === 'video');
                    if (sender) sender.replaceTrack(screenTrack);
                });

                screenTrack.onended = () => {
                    toggleScreenShare(); // Handle "Stop sharing" browser UI button
                };

                if (userVideo.current) userVideo.current.srcObject = stream;
                setIsScreenSharing(true);
            });
        }
    };

    const hangUp = () => {
        socketRef.current.disconnect();
        window.location.href = "/";
    };

    const [showInfo, setShowInfo] = useState(false);

    const copyToClipboard = () => {
        const text = `Join my meeting: ${window.location.href}\nOr use code: ${roomID}`;
        navigator.clipboard.writeText(text);
        alert("Joining info copied to clipboard!");
    };

    const sendMessage = (e) => {
        if (e && e.key !== 'Enter') return;

        if (msgInput.trim()) {
            const msg = { message: msgInput, sender: socketRef.current.id };
            socketRef.current.emit("send message", msg);
            console.log("📤 Message sent:", msg);
            setMessages(prev => [...prev, { body: msgInput, sender: "You", time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
            setMsgInput("");
        }
    };

    // Speech Translation Logic
    useEffect(() => {
        if (isTranslating) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (!SpeechRecognition) {
                alert("Speech Recognition is not supported in this browser. Please use Chrome.");
                setIsTranslating(false);
                return;
            }

            const recognition = new SpeechRecognition();
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.lang = 'te-IN'; // Telugu

            recognition.onresult = async (event) => {
                let interimTranscript = '';
                let finalTranscript = '';

                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        finalTranscript += event.results[i][0].transcript;
                    } else {
                        interimTranscript += event.results[i][0].transcript;
                    }
                }

                const currentTelugu = finalTranscript || interimTranscript;
                setTeluguTranscript(currentTelugu);

                if (finalTranscript) {
                    // Translate final transcript
                    try {
                        const response = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(finalTranscript)}&langpair=te|en`);
                        const data = await response.json();
                        const translation = data.responseData.translatedText;
                        setCaptions(translation);

                        // Broadcast translation to others
                        socketRef.current.emit("send translation", {
                            translation,
                            telugu: finalTranscript,
                            sender: socketRef.current.id
                        });

                        // Clear local captions after a delay
                        setTimeout(() => {
                            setCaptions("");
                            setTeluguTranscript("");
                        }, 5000);
                    } catch (err) {
                        console.error("Translation Error:", err);
                    }
                }
            };

            recognition.onerror = (event) => {
                console.error("Speech Recognition Error:", event.error);
                if (event.error === 'no-speech') {
                    // It's okay, just keep going if possible
                } else {
                    setIsTranslating(false);
                }
            };

            recognition.onend = () => {
                if (isTranslating) recognition.start(); // Keep it alive
            };

            recognition.start();
            recognitionRef.current = recognition;
        } else {
            if (recognitionRef.current) {
                recognitionRef.current.stop();
                recognitionRef.current = null;
            }
            setCaptions("");
            setTeluguTranscript("");
        }

        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
        };
    }, [isTranslating]);

    const toggleTranslation = () => {
        setIsTranslating(!isTranslating);
    };

    return (
        <div className="room-container">
            {showInfo && (
                <div style={{
                    position: 'absolute',
                    top: '20px',
                    left: '20px',
                    background: 'white',
                    color: '#202124',
                    padding: '20px',
                    borderRadius: '8px',
                    zIndex: 100,
                    boxShadow: '0 1px 2px 0 rgba(60,64,67,0.3), 0 2px 6px 2px rgba(60,64,67,0.15)',
                    width: '300px'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                        <h3 style={{ fontSize: '1.125rem', fontWeight: '400' }}>Your meeting's ready</h3>
                        <button onClick={() => setShowInfo(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}>×</button>
                    </div>
                    <p style={{ marginBottom: '15px', fontSize: '0.9rem', color: '#5f6368' }}>Share this meeting link with others you want in the meeting</p>
                    <div style={{ background: '#f1f3f4', padding: '10px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '15px' }}>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.9rem' }}>{window.location.href}</span>
                        <button onClick={copyToClipboard} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#1a73e8' }}>
                            <i className="material-icons" style={{ fontSize: '18px' }}>content_copy</i>
                        </button>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', color: '#3c4043' }}>
                        <i className="material-icons" style={{ fontSize: '18px' }}>security</i>
                        <span>People who use this meeting link must get your permission to join.</span>
                    </div>
                    <button onClick={copyToClipboard} style={{
                        marginTop: '20px',
                        width: '100%',
                        background: '#1a73e8',
                        color: 'white',
                        border: 'none',
                        padding: '10px 24px',
                        borderRadius: '4px',
                        fontWeight: '500',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px'
                    }}>
                        <i className="material-icons" style={{ fontSize: '18px' }}>content_copy</i>
                        Copy joining info
                    </button>
                </div>
            )}

            {isTranslating && (teluguTranscript || captions) && (
                <div className="captions-overlay">
                    <div className="captions-content">
                        <div className="captions-sender">You (Telugu ➔ English)</div>
                        {teluguTranscript && <div className="telugu-captions">{teluguTranscript}</div>}
                        {captions && <div className="english-captions">{captions}</div>}
                    </div>
                </div>
            )}

            {remoteCaptions && (
                <div className="captions-overlay remote">
                    <div className="captions-content">
                        <div className="captions-sender">User {remoteCaptions.sender.substr(0, 4)} (Telugu ➔ English)</div>
                        <div className="telugu-captions">{remoteCaptions.telugu}</div>
                        <div className="english-captions">{remoteCaptions.translation}</div>
                    </div>
                </div>
            )}

            <div className="main-area">
                <div className="video-grid-container">
                    <div className="video-grid">
                        <div className="video-card">
                            <video
                                muted
                                ref={userVideo}
                                autoPlay
                                playsInline
                                style={{ transform: isScreenSharing ? 'none' : 'scaleX(-1)' }}
                            />
                            <div className="user-name">You {isScreenSharing && '(Presenting)'}</div>
                        </div>
                        {peers.map((peer) => {
                            return (
                                <Video key={peer.peerID} stream={peer.stream} userName={`User ${peer.peerID.substr(0, 4)} `} />
                            );
                        })}
                    </div>
                </div>

                {sidebarMode !== "none" && (
                    <div className="sidebar">
                        <div className="sidebar-header">
                            <div>{sidebarMode === 'chat' ? 'In-call messages' : 'People'}</div>
                            <button className="btn-link" onClick={() => setSidebarMode('none')}>×</button>
                        </div>
                        <div className="sidebar-content">
                            {sidebarMode === 'chat' && (
                                <>
                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                        {messages.map((m, i) => (
                                            <div key={i} className="chat-msg">
                                                <div className="chat-meta">
                                                    <strong>{m.sender}</strong>
                                                    <span>{m.time}</span>
                                                </div>
                                                <div className="chat-text">{m.body}</div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="chat-input-area" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <input
                                            className="chat-input"
                                            placeholder="Send a message to everyone"
                                            value={msgInput}
                                            onChange={(e) => setMsgInput(e.target.value)}
                                            onKeyDown={sendMessage}
                                            style={{ flex: 1 }}
                                        />
                                        <button onClick={() => sendMessage()} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#1a73e8', display: 'flex', alignItems: 'center' }}>
                                            <i className="material-icons">send</i>
                                        </button>
                                    </div>
                                </>
                            )}

                            {sidebarMode === 'people' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#8ab4f8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>You</div>
                                        <div>You</div>
                                    </div>
                                    {peers.map(p => (
                                        <div key={p.peerID} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#5f6368', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>?</div>
                                            <div>User {p.peerID.substr(0, 4)}</div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <div className="bottom-bar">
                <div className="footer-left">
                    {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} | {roomID}
                </div>

                <div className="footer-center">
                    <button className={`round-btn ${muted ? 'active' : ''}`} onClick={toggleAudio}>
                        {muted ? <FaMicrophoneSlash /> : <FaMicrophone />}
                    </button>
                    <button className={`round-btn ${videoOff ? 'active' : ''}`} onClick={toggleVideo}>
                        {videoOff ? <FaVideoSlash /> : <FaVideo />}
                    </button>

                    <button className={`round-btn bg-red`} onClick={hangUp} style={{ margin: '0 10px' }}>
                        <FaPhoneSlash />
                    </button>

                    <button className={`round-btn ${isScreenSharing ? 'blue-active' : ''}`} onClick={toggleScreenShare} title="Present now">
                        {isScreenSharing ? <MdOutlineStopScreenShare /> : <MdOutlineScreenShare />}
                    </button>
                    <button className={`round-btn ${isTranslating ? 'blue-active' : ''}`} onClick={toggleTranslation} title="Translate Telugu to English">
                        <FaLanguage />
                    </button>
                    {!muted && (
                        <div style={{
                            position: 'absolute',
                            bottom: '85px',
                            background: '#34a853',
                            height: '4px',
                            width: '4px',
                            borderRadius: '50%',
                            boxShadow: '0 0 10px #34a853'
                        }}></div>
                    )}
                    <button className="round-btn" onClick={() => setShowInfo(!showInfo)}>
                        <FaInfoCircle />
                    </button>
                </div>

                <div className="footer-right">
                    <button className={`round-btn ${sidebarMode === 'people' ? 'blue-active' : ''}`} onClick={() => setSidebarMode(sidebarMode === 'people' ? 'none' : 'people')}>
                        <FaUserFriends />
                    </button>
                    <button className={`round-btn ${sidebarMode === 'chat' ? 'blue-active' : ''}`} onClick={() => setSidebarMode(sidebarMode === 'chat' ? 'none' : 'chat')}>
                        <FaCommentAlt />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Room;
