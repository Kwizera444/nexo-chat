import 'dotenv/config';
import express from 'express';
import http from 'node:http';
import { Server as SocketServer } from 'socket.io';
import nodemailer from 'nodemailer';
import multer from 'multer';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes, randomInt, scrypt as scryptCallback, timingSafeEqual, createHmac } from 'node:crypto';
import { promisify } from 'node:util';
import { existsSync, mkdirSync, readFileSync, writeFileSync, renameSync } from 'node:fs';

const scrypt = promisify(scryptCallback);
const root = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(root, 'data');
const uploadDir = path.join(root, 'uploads');
const storePath = path.join(dataDir, 'store.json');
mkdirSync(dataDir, { recursive: true });
mkdirSync(uploadDir, { recursive: true });
if (!existsSync(storePath)) writeFileSync(storePath, JSON.stringify({ users: [], challenges: [], posts: [], messages: [], statuses: [] }, null, 2));
let store = JSON.parse(readFileSync(storePath, 'utf8'));
const persist = () => { const temp = `${storePath}.tmp`; writeFileSync(temp, JSON.stringify(store, null, 2)); renameSync(temp, storePath); };
const app = express();
const server = http.createServer(app);
const io = new SocketServer(server, { cors: { origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' } });
const socketsByUser = new Map();
const dev = process.env.NODE_ENV !== 'production';
const otpThrottle = new Map();
app.use(express.json({ limit: '8mb' }));
app.use('/uploads', express.static(uploadDir, { maxAge: '1d' }));
app.use(express.static(path.resolve(root, '../dist')));
const getAiSettings = () => {
  const provider = process.env.AI_PROVIDER || (process.env.NEBIUS_API_KEY ? 'nebius' : 'openai');
  return provider === 'nebius'
    ? { provider, apiKey: process.env.NEBIUS_API_KEY, endpoint: process.env.NEBIUS_BASE_URL || 'https://api.tokenfactory.nebius.com/v1', model: process.env.NEBIUS_MODEL }
    : { provider: 'openai', apiKey: process.env.OPENAI_API_KEY, endpoint: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1', model: process.env.OPENAI_MODEL || 'gpt-4o-mini' };
};

const safeUser = (user) => ({ id: user.id, name: user.name, email: user.email, handle: user.handle, avatar: user.avatar || '', cover: user.cover || '', bio: user.bio || '', verified: user.verified, createdAt: user.createdAt });
const publicUser = (user) => { const { email: _email, ...profile } = safeUser(user); return profile; };
const makeToken = (user) => {
  const payload = Buffer.from(JSON.stringify({ sub: user.id, exp: Date.now() + 7 * 24 * 60 * 60 * 1000 })).toString('base64url');
  const signature = createHmac('sha256', process.env.SESSION_SECRET).update(payload).digest('base64url');
  return `${payload}.${signature}`;
};
const findTokenUser = (token) => {
  if (!token || !process.env.SESSION_SECRET) return null;
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return null;
  const expected = createHmac('sha256', process.env.SESSION_SECRET).update(payload).digest();
  let supplied;
  try { supplied = Buffer.from(signature, 'base64url'); } catch { return null; }
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return null;
  try { const data = JSON.parse(Buffer.from(payload, 'base64url').toString()); return data.exp > Date.now() ? store.users.find((user) => user.id === data.sub) || null : null; } catch { return null; }
};
const auth = (req, res, next) => {
  const user = findTokenUser(req.headers.authorization?.replace(/^Bearer\s+/i, ''));
  if (!user) return res.status(401).json({ error: 'Please sign in again to continue.' });
  req.user = user;
  next();
};
const signUpSchema = (body) => typeof body.name === 'string' && body.name.trim().length >= 2 && body.name.trim().length <= 60 && typeof body.email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email) && typeof body.password === 'string' && body.password.length >= 8 && body.password.length <= 128;
const rateLimitOtp = (email) => { const now = Date.now(); const prior = otpThrottle.get(email) || []; const recent = prior.filter((stamp) => now - stamp < 15 * 60_000); if (recent.length >= 5) return false; recent.push(now); otpThrottle.set(email, recent); return true; };
const mailer = process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS ? nodemailer.createTransport({ host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT || 587), secure: process.env.SMTP_SECURE === 'true', auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } }) : null;
const issueChallenge = async (user, purpose, res) => {
  const email = user.email.toLowerCase();
  if (!rateLimitOtp(email)) return res.status(429).json({ error: 'Too many codes requested. Try again in 15 minutes.' });
  const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
  const challenge = { id: randomBytes(24).toString('hex'), userId: user.id, purpose, codeHash: createHmac('sha256', process.env.SESSION_SECRET).update(code).digest('hex'), expiresAt: Date.now() + 10 * 60_000, attempts: 0 };
  store.challenges = store.challenges.filter((item) => item.expiresAt > Date.now());
  store.challenges.push(challenge); persist();
  if (mailer) {
    try { await mailer.sendMail({ from: process.env.EMAIL_FROM || process.env.SMTP_USER, to: user.email, subject: 'Your Nexo verification code', text: `Your Nexo verification code is ${code}. It expires in 10 minutes. If you did not request this, you can ignore this email.` }); }
    catch (error) { console.error('Email delivery failed:', error.message); store.challenges = store.challenges.filter((item) => item.id !== challenge.id); if (purpose === 'signup') store.users = store.users.filter((item) => item.id !== user.id); persist(); return res.status(502).json({ error: 'We could not deliver your verification code. Check email settings and try again.' }); }
  } else if (dev) console.info(`[Nexo local OTP] ${email}: ${code}`);
  else return res.status(503).json({ error: 'Email delivery is not configured. Add SMTP settings before enabling sign-in.' });
  return res.json({ challengeId: challenge.id, email: user.email, ...(dev && !mailer ? { devCode: code } : {}) });
};

app.get('/api/health', (_req, res) => { const ai = getAiSettings(); res.json({ ok: true, aiConfigured: Boolean(ai.apiKey && ai.model), aiProvider: ai.provider, emailConfigured: Boolean(mailer) }); });
app.post('/api/auth/signup', async (req, res) => {
  const body = req.body || {};
  if (!signUpSchema(body)) return res.status(400).json({ error: 'Enter a name, valid email, and password with at least 8 characters.' });
  const email = body.email.trim().toLowerCase();
  if (store.users.some((user) => user.email === email)) return res.status(409).json({ error: 'An account with that email already exists. Sign in instead.' });
  const salt = randomBytes(16).toString('hex');
  const passwordHash = (await scrypt(body.password, salt, 64)).toString('hex');
  const baseHandle = email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20) || 'friend';
  const handle = `${baseHandle}${randomInt(10, 99)}`;
  const user = { id: randomBytes(16).toString('hex'), name: body.name.trim(), email, handle, avatar: '', cover: '', bio: '', salt, passwordHash, verified: false, createdAt: new Date().toISOString() };
  store.users.push(user);
  try { await issueChallenge(user, 'signup', res); }
  catch (error) { store.users = store.users.filter((item) => item.id !== user.id); persist(); console.error(error); if (!res.headersSent) res.status(500).json({ error: 'Could not create the account.' }); }
});
app.post('/api/auth/login', async (req, res) => {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  const user = store.users.find((item) => item.email === email);
  if (!user || !user.verified) return res.status(401).json({ error: 'No verified account found for that email.' });
  const candidate = (await scrypt(password, user.salt, 64));
  const expected = Buffer.from(user.passwordHash, 'hex');
  if (candidate.length !== expected.length || !timingSafeEqual(candidate, expected)) return res.status(401).json({ error: 'Email or password is incorrect.' });
  return issueChallenge(user, 'login', res);
});
app.post('/api/auth/verify', (req, res) => {
  const { challengeId, code } = req.body || {};
  const challenge = store.challenges.find((item) => item.id === challengeId && item.expiresAt > Date.now());
  if (!challenge) return res.status(400).json({ error: 'That code has expired. Request a new one.' });
  if (challenge.attempts >= 5) { store.challenges = store.challenges.filter((item) => item.id !== challenge.id); persist(); return res.status(429).json({ error: 'Too many attempts. Request a new code.' }); }
  challenge.attempts += 1;
  const candidate = createHmac('sha256', process.env.SESSION_SECRET).update(String(code || '')).digest('hex');
  const expectedCode = Buffer.from(challenge.codeHash, 'hex'); const suppliedCode = Buffer.from(candidate, 'hex');
  if (expectedCode.length !== suppliedCode.length || !timingSafeEqual(expectedCode, suppliedCode)) { persist(); return res.status(400).json({ error: 'That code does not match. Try again.' }); }
  const user = store.users.find((item) => item.id === challenge.userId);
  if (!user) return res.status(400).json({ error: 'This account could not be found.' });
  user.verified = true;
  store.challenges = store.challenges.filter((item) => item.id !== challenge.id);
  persist();
  return res.json({ token: makeToken(user), user: safeUser(user) });
});
app.get('/api/me', auth, (req, res) => res.json({ user: safeUser(req.user) }));
app.patch('/api/me', auth, (req, res) => {
  const { name, bio, avatar, cover } = req.body || {};
  if (typeof name === 'string') { if (name.trim().length < 2 || name.trim().length > 60) return res.status(400).json({ error: 'Name must be 2 to 60 characters.' }); req.user.name = name.trim(); }
  if (typeof bio === 'string') req.user.bio = bio.slice(0, 140);
  if (typeof avatar === 'string' && (avatar.startsWith('data:image/') || avatar.startsWith('/uploads/'))) req.user.avatar = avatar;
  if (typeof cover === 'string' && (cover.startsWith('data:image/') || cover.startsWith('/uploads/'))) req.user.cover = cover;
  persist(); res.json({ user: safeUser(req.user) });
});
app.get('/api/users', auth, (_req, res) => res.json(store.users.filter((user) => user.verified).map((user) => ({ ...publicUser(user), online: socketsByUser.has(user.id) }))));
app.get('/api/calls/ice-servers', auth, (_req, res) => {
  const iceServers = [{ urls: 'stun:stun.l.google.com:19302' }];
  if (process.env.TURN_URL && process.env.TURN_USERNAME && process.env.TURN_CREDENTIAL) iceServers.push({ urls: process.env.TURN_URL.split(',').map((url) => url.trim()), username: process.env.TURN_USERNAME, credential: process.env.TURN_CREDENTIAL });
  res.json({ iceServers });
});

const publicPost = (post, userId) => ({ id: post.id, author: publicUser(store.users.find((user) => user.id === post.author.id) || post.author), time: post.time, createdAt: post.createdAt, body: post.body, image: post.image, comments: post.comments.map((comment) => ({ id: comment.id, author: publicUser(comment.author), text: comment.text, createdAt: comment.createdAt })), likes: post.likes.length - Number(post.likes.includes(userId)), liked: post.likes.includes(userId), reposted: post.reposts.includes(userId), saved: post.saves.includes(userId) });
const broadcastPostUpdate = (post) => { for (const [userId, sockets] of socketsByUser) for (const socket of sockets) socket.emit('feed:update', publicPost(post, userId)); };
app.get('/api/posts', auth, (req, res) => res.json(store.posts.filter((post) => !post.hidden).map((post) => publicPost(post, req.user.id)).sort((a, b) => b.createdAt.localeCompare(a.createdAt))));
app.post('/api/posts', auth, (req, res) => {
  const { body, image } = req.body || {};
  if (!(typeof body === 'string' && body.trim()) && !(typeof image === 'string' && (image.startsWith('data:image/') || image.startsWith('/uploads/')))) return res.status(400).json({ error: 'Add some text or a photo before sharing.' });
  const post = { id: randomBytes(12).toString('hex'), author: safeUser(req.user), time: 'just now', createdAt: new Date().toISOString(), body: String(body || '').trim().slice(0, 2000), image: typeof image === 'string' ? image : '', likes: [], reposts: [], saves: [], comments: [] };
  store.posts.push(post); persist(); io.emit('feed:new', publicPost(post, req.user.id)); res.status(201).json(publicPost(post, req.user.id));
});
app.patch('/api/posts/:id', auth, (req, res) => {
  const post = store.posts.find((item) => item.id === req.params.id);
  if (!post) return res.status(404).json({ error: 'That post is no longer available.' });
  const action = req.body?.action;
  if (action === 'like') post.likes = post.likes.includes(req.user.id) ? post.likes.filter((id) => id !== req.user.id) : [...post.likes, req.user.id];
  else if (action === 'repost') post.reposts = post.reposts.includes(req.user.id) ? post.reposts.filter((id) => id !== req.user.id) : [...post.reposts, req.user.id];
  else if (action === 'save') post.saves = post.saves.includes(req.user.id) ? post.saves.filter((id) => id !== req.user.id) : [...post.saves, req.user.id];
  else if (action === 'comment' && typeof req.body.text === 'string' && req.body.text.trim()) post.comments.push({ id: randomBytes(8).toString('hex'), author: publicUser(req.user), text: req.body.text.trim().slice(0, 800), createdAt: new Date().toISOString() });
  else return res.status(400).json({ error: 'Unknown post action.' });
  persist(); broadcastPostUpdate(post); res.json(publicPost(post, req.user.id));
});

app.get('/api/messages', auth, (req, res) => res.json(store.messages.filter((message) => message.from === req.user.id || message.to === req.user.id)));
const deliverMessage = (sender, { to, text, audio }) => {
  if (typeof to !== 'string' || !store.users.some((user) => user.id === to && user.verified) || to === sender.id) return null;
  if (!(typeof text === 'string' && text.trim()) && typeof audio !== 'string') return null;
  const message = { id: randomBytes(12).toString('hex'), from: sender.id, fromName: sender.name, fromAvatar: sender.avatar, to, text: typeof text === 'string' ? text.trim().slice(0, 4000) : '', audio: typeof audio === 'string' && audio.startsWith('/uploads/') ? audio : '', time: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }), createdAt: new Date().toISOString() };
  store.messages.push(message); persist();
  socketsByUser.get(to)?.forEach((socket) => socket.emit('direct:message', message));
  return message;
};
app.post('/api/messages', auth, (req, res) => { const message = deliverMessage(req.user, req.body || {}); if (!message) return res.status(400).json({ error: 'Select a person and add a message.' }); res.status(201).json(message); });

const upload = multer({ dest: uploadDir, limits: { fileSize: 20 * 1024 * 1024 }, fileFilter: (_req, file, callback) => callback(null, /^(image|audio|video)\//.test(file.mimetype)) });
app.post('/api/media', auth, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Choose an image or voice note to upload.' });
  const extension = path.extname(req.file.originalname).replace(/[^.a-zA-Z0-9]/g, '').slice(0, 10);
  const name = `${req.file.filename}${extension}`;
  const target = path.join(uploadDir, name);
  renameSync(req.file.path, target);
  res.status(201).json({ url: `/uploads/${name}`, mimeType: req.file.mimetype });
});

app.get('/api/statuses', auth, (req, res) => res.json(store.statuses.filter((item) => Date.now() - Date.parse(item.createdAt) < 24 * 60 * 60_000)));
app.post('/api/statuses', auth, (req, res) => {
  const { caption, image } = req.body || {};
  if (!(typeof caption === 'string' && caption.trim()) && !(typeof image === 'string' && image)) return res.status(400).json({ error: 'Add a photo or note first.' });
  const status = { id: randomBytes(12).toString('hex'), userId: req.user.id, name: req.user.name, avatar: req.user.avatar, caption: String(caption || '').trim().slice(0, 180), image: typeof image === 'string' ? image : '', createdAt: new Date().toISOString() };
  store.statuses.push(status); persist(); io.emit('status:new', status); res.status(201).json(status);
});

app.post('/api/ai/chat', auth, async (req, res) => {
  const ai = getAiSettings();
  if (!ai.apiKey) return res.status(503).json({ error: 'AI chat is not configured yet. Add NEBIUS_API_KEY to the server environment.' });
  if (!ai.model) return res.status(503).json({ error: `Set ${ai.provider === 'nebius' ? 'NEBIUS_MODEL' : 'OPENAI_MODEL'} to a model available to your provider.` });
  const message = typeof req.body?.message === 'string' ? req.body.message.trim().slice(0, 4000) : '';
  if (!message) return res.status(400).json({ error: 'Write a message for Nexo AI first.' });
  const endpoint = ai.endpoint.replace(/\/$/, '');
  const history = Array.isArray(req.body.history) ? req.body.history.slice(-10).filter((item) => ['me', 'ai'].includes(item.from) && typeof item.text === 'string').map((item) => ({ role: item.from === 'me' ? 'user' : 'assistant', content: item.text.slice(0, 4000) })) : [];
  try {
    const response = await fetch(`${endpoint}/chat/completions`, { method: 'POST', headers: { Authorization: `Bearer ${ai.apiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model: ai.model, messages: [{ role: 'system', content: 'You are Nexo, a warm, thoughtful, concise AI companion inside a close-friends social app. Be helpful, curious, and respectful.' }, ...history, { role: 'user', content: message }], temperature: 0.7 }) });
    const data = await response.json();
    if (!response.ok) return res.status(502).json({ error: data.error?.message || 'The AI provider could not answer right now.' });
    res.json({ reply: data.choices?.[0]?.message?.content || 'I could not put that into words just yet. Try again?' });
  } catch (error) { console.error('AI provider request failed:', error.message); res.status(502).json({ error: 'Could not reach the AI provider. Check the server connection and try again.' }); }
});

io.use((socket, next) => { const user = findTokenUser(socket.handshake.auth?.token); if (!user) return next(new Error('Sign in to connect.')); socket.user = user; next(); });
io.on('connection', (socket) => {
  const userId = socket.user.id;
  if (!socketsByUser.has(userId)) socketsByUser.set(userId, new Set());
  socketsByUser.get(userId).add(socket);
  io.emit('presence:update', { id: userId, online: true });
  socket.on('direct:message', (payload) => { const message = deliverMessage(socket.user, payload || {}); if (message) socket.emit('direct:sent', message); });
  socket.on('call:invite', ({ to, audioOnly }) => { if (!store.users.some((user) => user.id === to && user.verified)) return; socketsByUser.get(to)?.forEach((recipient) => recipient.emit('call:incoming', { from: publicUser(socket.user), audioOnly: Boolean(audioOnly) })); });
  socket.on('call:accept', ({ to }) => socketsByUser.get(to)?.forEach((recipient) => recipient.emit('call:ready', { from: userId })));
  socket.on('call:reject', ({ to }) => socketsByUser.get(to)?.forEach((recipient) => recipient.emit('call:ended', { reason: 'declined' })));
  socket.on('call:signal', ({ to, description, candidate }) => { if (!store.users.some((user) => user.id === to && user.verified)) return; socketsByUser.get(to)?.forEach((recipient) => recipient.emit('call:signal', { from: userId, description, candidate })); });
  socket.on('call:hangup', ({ to }) => socketsByUser.get(to)?.forEach((recipient) => recipient.emit('call:ended', { reason: 'ended' })));
  socket.on('disconnect', () => { socketsByUser.get(userId)?.delete(socket); if (!socketsByUser.get(userId)?.size) { socketsByUser.delete(userId); io.emit('presence:update', { id: userId, online: false }); } });
});
app.get('/{*path}', (req, res, next) => { if (req.path.startsWith('/api/')) return next(); const entry = path.resolve(root, '../dist/index.html'); if (existsSync(entry)) return res.sendFile(entry); res.status(404).send('Build the client with npm run build first.'); });
app.use((error, _req, res, _next) => { console.error(error); res.status(error.status || 500).json({ error: error.message || 'Something went wrong.' }); });

const port = Number(process.env.PORT || 3001);
if (!process.env.SESSION_SECRET) { if (!dev) throw new Error('SESSION_SECRET is required in production.'); process.env.SESSION_SECRET = randomBytes(32).toString('hex'); console.warn('Using a temporary local session secret; sessions will end when the server restarts.'); }
server.listen(port, () => console.log(`Nexo API listening on http://localhost:${port}${dev ? ' (local development)' : ''}`));
