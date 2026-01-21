# LITERATURE REVIEW AND SYSTEM COMPARISON

This document provides a technical literature review for the **CoLink** project, contrasting it with existing solutions and highlighting the advantages of the proposed system.

---

## 1. What is a Literature Review?
In the context of an engineering or computer science project, a **Literature Review** is a comprehensive survey of existing research, technologies, and academic papers related to the project's domain. Its purpose is to:
- Establish the current "state-of-the-art" in the field.
- Identify the limitations and gaps in existing solutions.
- Provide a theoretical foundation for the methodologies used in the project (e.g., WebRTC protocols, signaling mechanisms).
- Justify the need for the proposed system.

---

## 2. Review of Existing Systems
The market is dominated by several major video conferencing platforms. Below is an analysis of the most common "Existing Systems":

### 2.1 Zoom / Microsoft Teams (Enterprise SFU/MCU Models)
These platforms primarily use **Selective Forwarding Units (SFU)** or **Multipoint Control Units (MCU)**.
- **How they work**: Every participant sends their video/audio stream to a central server. The server then processes these streams and forwards them to other participants.
- **Target**: Large-scale enterprise meetings with hundreds of participants.

### 2.2 Skype (Hybrid P2P)
One of the earliest pioneers, Skype shifted from a pure Peer-to-Peer (P2P) model to a cloud-based infrastructure to handle mobile devices and unreliable networks better.

### 2.3 Google Meet (Web-based SFU)
A browser-native application that eliminates the need for installation but still relies heavily on Google's cloud infrastructure for media processing.

---

## 3. Disadvantages of Existing Systems
While powerful, existing systems have several drawbacks that **CoLink** aims to address:

1.  **Complexity and "Bloat"**: Most enterprise tools (Teams, Zoom) come with a heavy installation footprint or complex user interfaces that can be overwhelming for simple, quick meetings.
2.  **Server Dependency & Latency**: Because media is routed through a central server (SFU/MCU), there is an inherent "middle-man" delay. If the server is physically far from the users, latency increases.
3.  **Privacy Concerns**: In centralized models, the service provider's servers have access to the media packets. Even with encryption, the metadata and routing information are tracked centrally.
4.  **Resource Intensity**: MCU-based systems require massive server-side CPU power to transcode and mix video streams, making them expensive to maintain.
5.  **Cost Barriers**: Many professional features (meeting duration, number of participants, recording) are locked behind expensive subscription tiers.
6.  **Generic UI/UX**: Existing tools often prioritize utility over aesthetics, leading to a "boring" or corporate-standard interface.

---

## 4. Proposed System: CoLink (Advantages)
The proposed system, **CoLink**, utilizes a **Mesh-network P2P architecture** powered by **WebRTC**. Below are its core advantages:

1.  **Zero Server Media Load**: Unlike SFUs, CoLink uses the server only for "Signaling" (connecting users). Once connected, the actual video/audio flows directly between participants' browsers. This makes the system extremely cost-effective to host.
2.  **Ultra-Low Latency**: Since media packets take the shortest possible path (Direct P2P), the latency is the lowest theoretically possible, providing a "real-time" feel that server-based systems struggle to match in small groups.
3.  **Privacy by Design**: Because media streams never touch the server, no one—not even the site administrator—can "man-in-the-middle" the conversation. The connection is encrypted end-to-end via DTLS/SRTP.
4.  **No Installation Required**: Being built on native WebRTC, it runs directly in any modern web browser. Users can join a meeting with a simple link without downloading `.exe` or `.app` files.
5.  **Premium Aesthetics (Glassmorphism)**: The system implements a modern, translucent UI design that provides a superior user experience compared to the standard corporate look of existing tools.
6.  **Lightweight & Fast**: By stripping away enterprise bloat (like heavy project management tools or enterprise directories), CoLink remains fast, focused, and efficient for its primary purpose: communication.
7.  **Scalable Signaling**: Since the server doesn't process video, a single small server can handle signaling for thousands of concurrent rooms simultaneously.

---

## 5. Summary Comparison

| Feature | Existing Systems (Zoom/Teams) | Proposed System (CoLink) |
| :--- | :--- | :--- |
| **Architecture** | SFU / MCU (Centralized) | Mesh / P2P (Decentralized) |
| **Privacy** | High (Server-mediated) | Maximum (Direct Peer-to-Peer) |
| **Latency** | Moderate (Server hop) | Minimal (Direct Path) |
| **Installation** | Required (usually) | Not Required (Browser-based) |
| **UI Design** | Corporate / Standard | Modern / Glassmorphism |
| **Server Cost** | Very High | Negligible |

---
**Prepared By:** [User Name]
**Project:** CoLink Final Year Project
**Section:** Literature Review & System Analysis
