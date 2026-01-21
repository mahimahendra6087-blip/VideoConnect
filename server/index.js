const mongoose = require('mongoose');
const express = require('express');
const http = require('http');
const authRoutes = require('./routes/auth');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const socket = require("socket.io");
const { networkInterfaces } = require('os');
const nets = networkInterfaces();
const localIps = [];
for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
        if (net.family === 'IPv4' && !net.internal) localIps.push(`http://${net.address}:5173`);
    }
}

const allowedOrigins = [
    "http://localhost:5173",
    "https://colink.netlify.app",
    "https://colinkk.onrender.com",
    "https://colink-1.onrender.com",
    process.env.ALLOWED_ORIGIN,
    ...localIps
].filter(Boolean);

const io = socket(server, {
    cors: {
        origin: allowedOrigins,
        methods: ["GET", "POST"]
    }
});

app.use(require('cors')({
    origin: allowedOrigins,
    methods: ["GET", "POST", "OPTIONS"],
    credentials: true
}));
app.use(express.json());

const MONGO_URI = process.env.MONGO_URI;
global.isDemoMode = false;

mongoose.connect(MONGO_URI, {
    serverSelectionTimeoutMS: 5000,
})
    .then(() => {
        console.log("✅ MongoDB connected successfully");
        global.isDemoMode = false;
    })
    .catch(err => {
        console.error("❌ MongoDB Connection Error:", err.message);
        console.log("⚠️ Switching to DEMO MODE (In-Memory Storage) for this session.");
        global.isDemoMode = true;
    });

app.use('/api/auth', authRoutes);

app.get('/', (req, res) => {
    res.send(`
        <div style="font-family: sans-serif; text-align: center; margin-top: 50px;">
            <h1 style="color: #1a73e8;">CoLink Backend is Live! 🚀</h1>
            <p>The video conferencing server is running successfully.</p>
            <p>Frontend should connect to this URL.</p>
            <div style="margin-top: 20px; color: #5f6368;">Version 1.0.4</div>
        </div>
    `);
});

app.get('/health', (req, res) => {
    res.status(200).send('Server is healthy');
});

const PORT = process.env.PORT || 5000;

const users = {}; // roomID -> [socketID]
const socketToRoom = {}; // socketID -> roomID

io.on('connection', socket => {
    socket.on("join room", roomID => {
        if (users[roomID]) {
            const length = users[roomID].length;
            if (length === 4) {
                socket.emit("room full");
                return;
            }
            users[roomID].push(socket.id);
        } else {
            users[roomID] = [socket.id];
        }
        socketToRoom[socket.id] = roomID;
        const usersInThisRoom = users[roomID].filter(id => id !== socket.id);
        socket.emit("all users", usersInThisRoom);
    });

    socket.on("sending signal", payload => {
        io.to(payload.userToSignal).emit('user joined', { signal: payload.signal, callerID: payload.callerID });
    });

    socket.on("returning signal", payload => {
        io.to(payload.callerID).emit('receiving returned signal', { signal: payload.signal, id: socket.id });
    });

    // Chat feature
    socket.on("send message", (payload) => {
        const roomID = socketToRoom[socket.id];
        if (users[roomID]) {
            users[roomID].forEach(userId => {
                if (userId !== socket.id) {
                    io.to(userId).emit("receive message", { message: payload.message, sender: payload.sender });
                }
            });
        }
    });

    socket.on('disconnect', () => {
        const roomID = socketToRoom[socket.id];
        let room = users[roomID];
        if (room) {
            room = room.filter(id => id !== socket.id);
            users[roomID] = room;
            room.forEach(id => {
                io.to(id).emit("user left", socket.id);
            });
        }
    });
});

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);

    // Log Network IPs
    const { networkInterfaces } = require('os');
    const nets = networkInterfaces();
    const results = Object.create(null);

    for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
            if (net.family === 'IPv4' && !net.internal) {
                if (!results[name]) {
                    results[name] = [];
                }
                results[name].push(net.address);
            }
        }
    }

    console.log("Available on Network:");
    Object.keys(results).forEach(name => {
        results[name].forEach(ip => {
            console.log(`  http://${ip}:${PORT}`);
        });
    });
});
