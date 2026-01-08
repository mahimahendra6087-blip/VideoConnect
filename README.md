# Antigravity Meet - Real-Time Video Conferencing

A premium real-time video conferencing application built with React, WebRTC, and Socket.io.

## Features
- **Real-time Video & Audio**: Low latency peer-to-peer communication using WebRTC.
- **Group Calling**: Support for multiple users in a single room (Mesh architecture).
- **Chat System**: Real-time text messaging during calls.
- **Controls**: Mute/Unmute audio, Toggle Video, Leave Room.
- **Premium UI**: Glassmorphism design, dark mode, and responsive layout.

## Technologies
- **Frontend**: React, Vite, CSS (Glassmorphism), Simple-Peer.
- **Backend**: Node.js, Express, Socket.io.

## Setup & Running

### Prerequisites
- Node.js installed.

### Installation

1.  **Install Server Dependencies**:
    ```bash
    cd server
    npm install
    ```
2.  **Install Client Dependencies**:
    ```bash
    cd client
    npm install
    ```

### Running the Application

1.  **Start the Server**:
    ```bash
    cd server
    npm start
    ```
    Server runs on `http://localhost:5000`.

2.  **Start the Client** (in a new terminal):
    ```bash
    cd client
    npm run dev
    ```
    Client runs on `http://localhost:5173`.

## Deployment
- **Frontend**: Can be deployed to Vercel/Netlify.
- **Backend**: Can be deployed to Render/Railway/Heroku.
- *Note*: For production, update the Socket.io connection URL in `client/src/routes/Room.jsx` to the deployed server URL.
