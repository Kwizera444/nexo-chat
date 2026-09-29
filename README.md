# Nexo

Nexo is a React social chat app with a Node/Express API and Socket.IO. It includes email/password accounts, one-time email verification, profiles, a persistent feed, statuses, direct messages, voice notes, AI chat, and browser-based video calls.

## Run locally

1. Install Node.js 20 or later.
2. Run `npm install`.
3. Run `npm run dev`.
4. Open `http://localhost:5173`.

Choose **Explore the app** to browse with local sample content. To test the real account flow locally, create an account. When SMTP is not configured, the API prints a six-digit verification code in the server terminal and shows it in the local development screen. Local accounts and uploads are stored in `server/data` and `server/uploads`.

## Connect services

Copy `.env.example` to `.env`, then set a long random `SESSION_SECRET`.

- For Render Free, configure `RESEND_API_KEY` and `RESEND_FROM` to deliver signup and login codes over HTTPS. `RESEND_FROM` must be an address on a domain verified with Resend. Render Free blocks outbound SMTP ports 25, 465, and 587.
- On hosts that permit SMTP, configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, and `EMAIL_FROM`. In production, email delivery must be configured; development-only codes are never returned in production.
- Set `AI_PROVIDER=nebius`, then configure `NEBIUS_API_KEY` and `NEBIUS_MODEL` to use Nebius Token Factory for the Nexo AI conversation. The default endpoint is `https://api.tokenfactory.nebius.com/v1/`. Set the model ID available in your Nebius account. An optional OpenAI-compatible provider is available through `OPENAI_API_KEY`, `OPENAI_BASE_URL`, and `OPENAI_MODEL` with `AI_PROVIDER=openai`.
- Video calls use browser WebRTC, camera/microphone permissions, and a public STUN server. Configure `TURN_URL`, `TURN_USERNAME`, and `TURN_CREDENTIAL` in a restrictive or production network so calls can relay through a TURN server.
- Set `NODE_ENV=production` and `PORT` for deployment. Run `npm run build` before `npm start`; the API serves the production client from `dist`.

Use HTTPS in deployment for camera, microphone, and secure session handling. Keep `.env`, user data, and uploaded files private. The included JSON store is designed for a single-process starter deployment; move the store to a transactional database and uploads to private object storage before scaling to multiple instances.

## Deploy to Render

The included `render.yaml` defines a free Node web service that builds the client, starts the API, and checks `/api/health`. Create a Render Blueprint from this GitHub repository to launch it. The free service can sleep when idle, and its filesystem is ephemeral: accounts, posts, and uploads may be lost when the service restarts or redeploys. Use a paid persistent disk or migrate to a managed database and object storage before relying on it for real users.

After deployment, add `RESEND_API_KEY` and `RESEND_FROM` in the Render service environment to enable email OTP delivery, and add `NEBIUS_API_KEY` and `NEBIUS_MODEL` to enable AI replies. Never commit these credentials.

## Included workflows

- Signup and login with hashed passwords and expiring, attempt-limited email codes
- User profiles with uploaded profile and cover images
- Shared posts, comments, likes, reposts, saved posts, and 24-hour statuses
- Persistent one-to-one text and voice messages with Socket.IO delivery
- WebRTC audio and video calls with recipient acceptance, mute, camera, and screen-share controls
- AI chat through an optional OpenAI-compatible provider
- Responsive feed, discovery, settings, dark mode, and accent colors
