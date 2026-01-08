# How to Join the Meeting

Since you are running this app on your own computer (locally), here is how to share it.

## 1. People on the SAME WiFi
If your friend is in the **same room** or connected to the **same WiFi** as you:

1.  Tell them to open this link on their phone or laptop:
    👉 **http://10.90.142.144:5173**

2.  They will see the Login Page.
3.  They can click **"Sign Up"** (or "Register") to create a user.
4.  Once logged in, they enter the **Meeting Code** you give them to join your video call.

## 2. People in OTHER Locations (Different WiFi)
If your friend is in a **different house** or city, they **CANNOT** use the link above.
To share with them, you must **Deploy** the app to the public internet (like a real website).

**Common ways to deploy:**
-   **Frontend**: Vercel, Netlify (Free)
-   **Backend**: Render, Railway, Heroku (Free tiers available)
-   **Temporary**: Use a tool like **Ngrok**.

### Using Ngrok (Easiest way for quick testing)
1.  Download Ngrok.
2.  Run `ngrok http 5173`.
3.  It will give you a link like `https://random-name.ngrok-free.app`.
4.  Send that link to your friend anywhere in the world.

---

## Troubleshooting
-   **"Site can't be reached"**: Check if your Windows Firewall is blocking the connection. You might need to turn it off temporarily to test.
-   **Server Error**: Make sure your backend (black terminal window) is running. (It is currently running!)
