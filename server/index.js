const mongoose = require('mongoose');
const express = require('express');
const http = require('http');
const authRoutes = require('./routes/auth');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const socket = require("socket.io");
const allowedOrigins = [
    "http://localhost:5173",
    "https://colink.netlify.app",
    process.env.ALLOWED_ORIGIN
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

// MongoDB connection disabled for restricted network compatibility (Demo Mode)
/*
mongoose.connect(MONGO_URI)
    .then(() => console.log("MongoDB connected successfully"))
    .catch(err => {
        console.error("MongoDB Connection Error Details:");
        console.error(err);
    });
*/
console.log("⚠️ Running in DEMO MODE (In-Memory Storage) due to network restrictions.");
console.log("   Data will be lost when server restarts.");

app.use('/api/auth', authRoutes);

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
