
import React, { useEffect, useRef, useState } from "react";
import io from "socket.io-client";
import Peer from "simple-peer";
import { useParams, useNavigate } from "react-router-dom";
import {
    FaMicrophone, FaMicrophoneSlash,
    FaVideo, FaVideoSlash,
    FaPhoneSlash,
    FaCommentAlt, FaUserFriends,
    FaDesktop, FaInfoCircle
} from "react-icons/fa";
import { MdOutlineScreenShare, MdOutlineStopScreenShare } from "react-icons/md";

const Video = ({ peer, userName, isScreenShare }) => {
    const ref = useRef();

    useEffect(() => {
        peer.on("stream", stream => {
            if (ref.current) ref.current.srcObject = stream;
        });
    }, [peer]);

    return (
        <div className="video-card" style={{ width: isScreenShare ? '100%' : '400px' }}>
            <video playsInline autoPlay ref={ref} style={{ transform: isScreenShare ? 'none' : 'scaleX(-1)' }} />
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
                        peersRef.current.push({
                            peerID: userID,
                            peer,
                        });
                        peers.push({
                            peerID: userID,
                            peer,
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
                    setPeers(users => [...users, { peerID: payload.callerID, peer }]);
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
                    const newPeers = peersRef.current.filter(p => p.peerID !== id);
                    peersRef.current = newPeers;
                    setPeers(newPeers);
                });
            })
            .catch(err => {
                console.error("Failed to access media:", err);
                setError("Camera/Microphone access failed. Browsers block camera access on HTTP (non-localhost) due to security reasons.");
            });

        return () => {
            // socketRef.current.disconnect();
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
        const enabled = userStream.current.getAudioTracks()[0].enabled;
        userStream.current.getAudioTracks()[0].enabled = !enabled;
        setMuted(enabled);
    };

    const toggleVideo = () => {
        const enabled = userStream.current.getVideoTracks()[0].enabled;
        userStream.current.getVideoTracks()[0].enabled = !enabled;
        setVideoOff(enabled);
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
                                <Video key={peer.peerID} peer={peer.peer} userName={`User ${peer.peerID.substr(0, 4)} `} />
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
