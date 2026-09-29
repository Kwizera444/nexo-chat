import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import {
  ArrowDownToLine, ArrowLeft, ArrowUpRight, Bell, Bookmark, Check, CheckCheck,
  ChevronDown, ChevronRight, CircleHelp, Compass, Image, LogOut, Menu, MessageCircle,
  Mic, MoreHorizontal, Paperclip, Phone, Plus, Search, Send, Settings, ShieldCheck,
  Smile, Sparkles, Sun, Moon, UserRound, Users, Video, X, Heart, Repeat2, Camera,
  Eye, EyeOff, Globe2, Hash, LockKeyhole, Mail, MonitorUp, Pencil, Play, WandSparkles,
} from 'lucide-react';

const API = '';
const me = { id: 'maya', name: 'Maya Chen', handle: 'mayac', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=160&h=160&fit=crop&crop=faces', color: '#ed7958', bio: 'Collecting little moments and big ideas.' };
const initialPeople = [
  { id: 'leo', name: 'Leo Park', handle: 'leopark', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&h=120&fit=crop&crop=faces', online: true, note: 'at the studio' },
  { id: 'nia', name: 'Nia Flores', handle: 'niaflores', avatar: 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=120&h=120&fit=crop&crop=faces', online: true, note: 'coffee run?' },
  { id: 'eli', name: 'Eli Brooks', handle: 'elibrooks', avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=120&h=120&fit=crop&crop=faces', online: false, note: 'in a meeting' },
  { id: 'sana', name: 'Sana Ito', handle: 'sanaito', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120&h=120&fit=crop&crop=faces', online: true, note: 'on the move' },
  { id: 'jules', name: 'Jules Rivera', handle: 'julesr', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&h=120&fit=crop&crop=faces', online: false, note: 'around later' },
];
const storyPeople = [
  { id: 'nia', name: 'Nia', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=520&h=760&fit=crop', avatar: initialPeople[1].avatar, seen: false, caption: 'Slow mornings, softer light.' },
  { id: 'leo', name: 'Leo', image: 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=520&h=760&fit=crop', avatar: initialPeople[0].avatar, seen: false, caption: 'New corner of the studio.' },
  { id: 'sana', name: 'Sana', image: 'https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?w=520&h=760&fit=crop', avatar: initialPeople[3].avatar, seen: true, caption: 'A little room to breathe.' },
  { id: 'eli', name: 'Eli', image: 'https://images.unsplash.com/photo-1500534623283-312aade485b7?w=520&h=760&fit=crop', avatar: initialPeople[2].avatar, seen: true, caption: 'Out past the last train.' },
];
const seedPosts = [
  { id: 'p1', author: initialPeople[1], time: '18 min ago', body: 'A tiny reminder to step outside between the tabs and the to-dos. The whole day looked different after ten minutes in the sun. ☀️', image: 'https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?w=1000&h=680&fit=crop', likes: 28, comments: ['This light is everything.', 'Needed this nudge today.'], liked: false, reposted: false },
  { id: 'p2', author: initialPeople[0], time: '1 hr ago', body: 'Finished setting up the new studio nook. Come by for a coffee and a very opinionated playlist 🎛️', image: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=1000&h=680&fit=crop', likes: 46, comments: ['That desk setup!'], liked: true, reposted: false },
  { id: 'p3', author: initialPeople[3], time: '3 hrs ago', body: 'What if we made more plans that start with “let’s see where we end up”?', image: '', likes: 17, comments: [], liked: false, reposted: false },
];
const seedMessages = {
  leo: [{ from: 'leo', text: 'I finally got the studio lights working ✨', time: '10:42 AM' }, { from: 'me', text: 'Okay, show me everything.', time: '10:44 AM' }, { from: 'leo', text: 'Video tour later today?', time: '10:45 AM' }],
  nia: [{ from: 'nia', text: 'Saved you the sunny seat.', time: '9:18 AM' }, { from: 'me', text: 'On my way! ☕', time: '9:21 AM' }],
  eli: [{ from: 'eli', text: 'Did you see the draft I sent?', time: 'Yesterday' }],
  sana: [{ from: 'sana', text: 'This reminded me of you', time: 'Yesterday' }],
  jules: [{ from: 'jules', text: 'Sunday market?', time: 'Mon' }],
  ai: [{ from: 'ai', text: 'Hey Maya! I’m Nexo, your AI companion. What’s on your mind?', time: 'Now' }],
};
const photo = (seed) => `https://images.unsplash.com/${seed}?w=500&h=360&fit=crop`;
const jsonGet = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } };
async function readApiJson(response) {
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.toLowerCase().includes('application/json')) {
    throw new Error('The app server returned an unexpected response. Run `npm run dev` in the project folder, then try again.');
  }
  let data;
  try { data = await response.json(); }
  catch { throw new Error('The app server returned incomplete JSON. Check the server and try again.'); }
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status}).`);
  return data;
}
async function uploadImage(dataUrl, token) {
  if (!dataUrl?.startsWith('data:image/')) return dataUrl;
  const blob = await (await fetch(dataUrl)).blob();
  const form = new FormData(); form.append('file', blob, `nexo-${Date.now()}.jpg`);
  const response = await fetch('/api/media', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form });
  const data = await readApiJson(response);
  return data.url;
}

function Avatar({ person, size = 'md', ring = false, online = false }) {
  return <span className={`avatar avatar-${size} ${ring ? 'avatar-ring' : ''} ${online ? 'avatar-online' : ''}`}><img src={person?.avatar || me.avatar} alt="" /></span>;
}

function AuthGate({ onEnter }) {
  const [mode, setMode] = useState('signup');
  const [phase, setPhase] = useState('credentials');
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', code: '' });
  const [challenge, setChallenge] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const change = (key, value) => setForm((old) => ({ ...old, [key]: value }));
  const submit = async (event) => {
    event.preventDefault(); setError(''); setBusy(true);
    try {
      const response = await fetch(`${API}/api/auth/${mode}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const data = await readApiJson(response);
      setChallenge(data); setPhase('otp');
    } catch (e) { setError(e.message || 'The server is not available. Try demo mode.'); }
    finally { setBusy(false); }
  };
  const verify = async (event) => {
    event.preventDefault(); setError(''); setBusy(true);
    try {
      const response = await fetch(`${API}/api/auth/verify`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ challengeId: challenge?.challengeId, code: form.code }) });
      const data = await readApiJson(response);
      localStorage.setItem('nexo-token', data.token);
      localStorage.setItem('nexo-user', JSON.stringify(data.user));
      onEnter({ token: data.token, user: data.user });
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };
  return <main className="auth-shell">
    <div className="auth-art">
      <div className="auth-brand"><span className="brand-mark">n</span><span>NEXO</span></div>
      <div className="auth-art-copy"><p className="eyebrow">A little closer, every day</p><h1>Your people.<br /><em>Your place.</em></h1><p>Make room for the conversations, tiny updates, and people that make a day feel like yours.</p></div>
      <div className="auth-photo" style={{ backgroundImage: `url(${photo('photo-1529156069898-49953e39b3ac')})` }}><span>Good things happen in good company.</span></div>
      <div className="auth-art-foot"><span>01 — 05</span><span>Made for being together</span></div>
    </div>
    <div className="auth-panel">
      <div className="auth-top"><span>Already part of Nexo?</span><button className="text-action" onClick={() => { setMode(mode === 'signup' ? 'login' : 'signup'); setPhase('credentials'); setError(''); }}>{mode === 'signup' ? 'Sign in' : 'Create account'} <ArrowUpRight size={15} /></button></div>
      <div className="auth-form-wrap">
        {phase === 'credentials' ? <>
          <span className="eyebrow">{mode === 'signup' ? 'Start with your people' : 'Good to have you back'}</span>
          <h2>{mode === 'signup' ? 'Make yourself at home.' : 'Welcome back.'}</h2>
          <p className="muted">{mode === 'signup' ? 'A few details and you’re in.' : 'Sign in to pick up where you left off.'}</p>
          <form onSubmit={submit} className="auth-form">
            {mode === 'signup' && <label>Your name<input required autoComplete="name" placeholder="e.g. Maya Chen" value={form.name} onChange={(e) => change('name', e.target.value)} /></label>}
            <label>Email address<span className="field-icon"><Mail size={16} /><input required type="email" autoComplete="email" placeholder="you@example.com" value={form.email} onChange={(e) => change('email', e.target.value)} /></span></label>
            <label>Password<span className="field-icon"><LockKeyhole size={16} /><input required minLength={8} type={show ? 'text' : 'password'} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} placeholder="At least 8 characters" value={form.password} onChange={(e) => change('password', e.target.value)} /><button type="button" className="eye-button" onClick={() => setShow(!show)} aria-label={show ? 'Hide password' : 'Show password'}>{show ? <EyeOff size={17} /> : <Eye size={17} />}</button></span></label>
            <button className="primary-button auth-submit" disabled={busy}>{busy ? 'One moment…' : mode === 'signup' ? 'Create account' : 'Continue with email'}<ArrowUpRight size={17} /></button>
          </form>
          {error && <p className="form-error">{error}</p>}
          <p className="legal-note"><ShieldCheck size={14} /> Your password is protected. We’ll email you a one-time verification code.</p>
          <button className="demo-link" onClick={() => onEnter({ demo: true, user: me })}>Explore the app <ChevronRight size={15} /></button>
        </> : <>
          <button className="back-link" onClick={() => setPhase('credentials')}><ArrowLeft size={16} /> Back</button>
          <span className="eyebrow">One last step</span><h2>Check your inbox.</h2>
          <p className="muted">Enter the 6-digit code sent to <strong>{form.email}</strong>.</p>
          <form onSubmit={verify} className="auth-form"><label>Verification code<input className="otp-input" autoFocus required inputMode="numeric" maxLength={6} placeholder="000000" value={form.code} onChange={(e) => change('code', e.target.value.replace(/\D/g, ''))} /></label><button className="primary-button auth-submit" disabled={busy}>{busy ? 'Verifying…' : 'Verify and continue'}<ArrowUpRight size={17} /></button></form>
          {challenge?.devCode && <p className="dev-code">Local development code: <strong>{challenge.devCode}</strong></p>}
          {error && <p className="form-error">{error}</p>}
        </>}
      </div>
      <div className="auth-foot"><span>© 2026 Nexo</span><button onClick={() => alert('Nexo keeps your conversations private and your people close.')}><CircleHelp size={14} /> Help</button></div>
    </div>
  </main>;
}

function PostCard({ post, onLike, onRepost, onComment, onSave, saved, currentUser }) {
  const [commenting, setCommenting] = useState(false);
  const [comment, setComment] = useState('');
  const submitComment = (e) => { e.preventDefault(); if (comment.trim()) { onComment(post.id, comment.trim()); setComment(''); } };
  return <article className="post-card">
    <div className="post-top"><Avatar person={post.author} /><div className="post-author"><strong>{post.author.name}</strong><span>@{post.author.handle} <i>·</i> {post.time}</span></div><button className="icon-button post-more" aria-label="More options"><MoreHorizontal size={20} /></button></div>
    <p className="post-copy">{post.body}</p>
    {post.image && <img className="post-image" src={post.image} alt="Post attachment" />}
    <div className="post-counts"><span>{post.likes + (post.liked ? 1 : 0)} appreciations</span><button onClick={() => setCommenting(!commenting)}>{post.comments.length} replies</button></div>
    <div className="post-actions"><button className={post.liked ? 'liked' : ''} onClick={() => onLike(post.id)}><Heart size={18} fill={post.liked ? 'currentColor' : 'none'} /> Appreciate</button><button className={post.reposted ? 'reposted' : ''} onClick={() => onRepost(post.id)}><Repeat2 size={18} /> Repost</button><button onClick={() => setCommenting(!commenting)}><MessageCircle size={18} /> Reply</button><button className={`save-action ${saved ? 'saved' : ''}`} aria-label={saved ? 'Remove bookmark' : 'Bookmark post'} onClick={() => onSave(post.id)}><Bookmark size={18} fill={saved ? 'currentColor' : 'none'} /></button></div>
    {commenting && <div className="comments-area">{post.comments.map((item, index) => { const text = typeof item === 'string' ? item : item.text; const author = typeof item === 'string' ? (index % 2 ? currentUser : post.author) : item.author || currentUser; return <p key={`${post.id}-${index}`}><Avatar person={author} size="xs" /><span><strong>{author.name}</strong>{text}</span></p>; })}<form onSubmit={submitComment}><Avatar person={currentUser} size="xs" /><input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Write a thoughtful reply…" /><button aria-label="Send reply"><Send size={16} /></button></form></div>}
  </article>;
}

function StoryViewer({ story, onClose, onDownload }) {
  if (!story) return null;
  return <div className="modal-scrim story-scrim" onClick={onClose}><div className="story-viewer" onClick={(e) => e.stopPropagation()} style={{ backgroundImage: `linear-gradient(0deg, rgba(16,27,25,.65), transparent 44%), url(${story.image})` }}>
    <div className="story-progress"><span /></div><div className="story-viewer-top"><Avatar person={{ avatar: story.avatar }} size="sm" /><strong>{story.name}</strong><span>Today</span><button className="story-download" onClick={() => onDownload(story)} aria-label="Download status"><ArrowDownToLine size={18} /></button><button onClick={onClose} aria-label="Close story"><X size={19} /></button></div>
    <p className="story-caption">{story.caption}</p><div className="story-reply"><input placeholder={`Reply to ${story.name}…`} /><button aria-label="Send reply"><Send size={17} /></button></div>
  </div></div>;
}

function Composer({ user, onPost, onStory }) {
  const [text, setText] = useState('');
  const [image, setImage] = useState('');
  const fileRef = useRef(null);
  const addImage = (file) => { if (!file) return; const reader = new FileReader(); reader.onload = () => setImage(String(reader.result)); reader.readAsDataURL(file); };
  const submit = (e) => { e.preventDefault(); if (text.trim() || image) { onPost(text.trim(), image); setText(''); setImage(''); } };
  return <form className="composer" onSubmit={submit}><div className="composer-row"><Avatar person={user} size="md" /><textarea rows="2" value={text} onChange={(e) => setText(e.target.value)} placeholder="What’s making your day?" /></div>{image && <div className="composer-attachment"><img src={image} alt="Your attachment" /><button type="button" className="icon-button" onClick={() => setImage('')} aria-label="Remove image"><X size={16} /></button></div>}<div className="composer-foot"><div className="composer-tools"><button type="button" onClick={() => fileRef.current?.click()}><Image size={17} /> Photo</button><button type="button" onClick={onStory}><Plus size={17} /> Status</button><input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => addImage(e.target.files?.[0])} /></div><button className="primary-button post-button" disabled={!text.trim() && !image}>Share <ArrowUpRight size={16} /></button></div></form>;
}

function StatusComposer({ user, onClose, onPublish }) {
  const [caption, setCaption] = useState(''); const [image, setImage] = useState(''); const fileRef = useRef(null);
  const upload = (file) => { if (!file) return; const reader = new FileReader(); reader.onload = () => setImage(String(reader.result)); reader.readAsDataURL(file); };
  return <div className="modal-scrim" onClick={onClose}><section className="modal-card status-modal" onClick={(e) => e.stopPropagation()}><div className="modal-heading"><div><span className="eyebrow">A moment, shared</span><h3>Add to your status</h3></div><button className="icon-button" onClick={onClose} aria-label="Close"><X size={19} /></button></div><div className="status-preview" style={image ? { backgroundImage: `linear-gradient(0deg, rgba(13,27,23,.6), transparent), url(${image})` } : {}}><span><Avatar person={user} size="sm" /> Your status</span><input value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Add a little note…" /></div><div className="modal-actions"><button className="secondary-button" onClick={() => fileRef.current?.click()}><Image size={16} /> Add a photo</button><input ref={fileRef} hidden type="file" accept="image/*" onChange={(e) => upload(e.target.files?.[0])} /><button className="primary-button" disabled={!caption.trim() && !image} onClick={() => onPublish({ id: `mine-${Date.now()}`, name: user.name.split(' ')[0], avatar: user.avatar, image: image || photo('photo-1490750967868-88aa4486c946'), caption: caption || 'A little moment from today.', seen: false, own: true })}>Share status <ArrowUpRight size={16} /></button></div></section></div>;
}

function ChatView({ people, messages, setMessages, user, session, onCall, socket, toast }) {
  const [selected, setSelected] = useState(people[0]?.id || 'ai'); const [text, setText] = useState(''); const [search, setSearch] = useState(''); const [recording, setRecording] = useState(false); const [compactChat, setCompactChat] = useState(false);
  const scrollRef = useRef(null); const recorderRef = useRef(null); const chunksRef = useRef([]);
  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, selected]);
  useEffect(() => { if (!socket) return; const receive = (message) => { setMessages((old) => ({ ...old, [message.from]: [...(old[message.from] || []), message] })); }; socket.on('direct:message', receive); return () => socket.off('direct:message', receive); }, [socket, setMessages]);
  const sendMessage = (event) => { event.preventDefault(); const clean = text.trim(); if (!clean) return; const item = { from: 'me', text: clean, time: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) }; setMessages((old) => ({ ...old, [selected]: [...(old[selected] || []), item] })); if (selected !== 'ai' && !session?.demo) { if (socket?.connected) socket.emit('direct:message', { to: selected, text: clean }); else fetch('/api/messages', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.token}` }, body: JSON.stringify({ to: selected, text: clean }) }).catch(() => toast('Message could not be sent. Check your connection.')); } setText(''); if (selected === 'ai') askAI(clean); };
  const askAI = async (prompt) => { const thinking = { from: 'ai', text: 'One moment…', time: '', pending: true }; setMessages((old) => ({ ...old, ai: [...(old.ai || []), thinking] })); try { if (session?.demo) throw new Error('AI chat is ready for verified accounts once an AI provider is configured on the server.'); const response = await fetch('/api/ai/chat', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(session?.token ? { Authorization: `Bearer ${session.token}` } : {}) }, body: JSON.stringify({ message: prompt, history: (messages.ai || []).slice(-8) }) }); const data = await readApiJson(response); setMessages((old) => ({ ...old, ai: [...old.ai.filter((item) => !item.pending), { from: 'ai', text: data.reply, time: 'Now' }] })); } catch (error) { setMessages((old) => ({ ...old, ai: [...old.ai.filter((item) => !item.pending), { from: 'ai', text: error.message || 'Connect an AI provider in the server settings to get started.', time: 'Now' }] })); } };
  const sendVoice = async (blob) => { let url = URL.createObjectURL(blob); if (session?.token) { try { const data = new FormData(); data.append('file', blob, `voice-${Date.now()}.webm`); const response = await fetch('/api/media', { method: 'POST', headers: { Authorization: `Bearer ${session.token}` }, body: data }); url = (await readApiJson(response)).url; } catch { toast('Voice note saved for this session only.'); } } const item = { from: 'me', audio: url, time: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) }; setMessages((old) => ({ ...old, [selected]: [...(old[selected] || []), item] })); if (socket && !session?.demo) socket.emit('direct:message', { to: selected, audio: url }); };
  const toggleRecord = async () => { if (recording) { recorderRef.current?.stop(); setRecording(false); return; } try { const stream = await navigator.mediaDevices.getUserMedia({ audio: true }); const recorder = new MediaRecorder(stream); chunksRef.current = []; recorder.ondataavailable = (event) => chunksRef.current.push(event.data); recorder.onstop = () => { sendVoice(new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' })); stream.getTracks().forEach((track) => track.stop()); }; recorder.start(); recorderRef.current = recorder; setRecording(true); } catch { toast('Allow microphone access to record a voice note.'); } };
  const person = selected === 'ai' ? { id: 'ai', name: 'Nexo AI', avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=120&h=120&fit=crop&crop=faces', online: true, note: 'always here to help' } : people.find((item) => item.id === selected) || people[0];
  const list = [{ id: 'ai', name: 'Nexo AI', avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=120&h=120&fit=crop&crop=faces', online: true }, ...people].filter((item) => item.name.toLowerCase().includes(search.toLowerCase()));
  return <section className={`chat-layout ${compactChat ? 'chat-detail-open' : ''}`}>
    <aside className="inbox-panel"><div className="inbox-heading"><div><span className="eyebrow">Your corner</span><h2>Messages</h2></div><button className="icon-button" aria-label="New message"><Pencil size={17} /></button></div><label className="search-box"><Search size={16} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Find a conversation" /></label><div className="inbox-filter"><button className="active">All <span>{people.length + 1}</span></button><button>Unread</button><button>Groups</button></div><div className="conversation-list">{list.map((item) => { const latest = messages[item.id]?.at(-1); return <button key={item.id} data-chat-id={item.id} className={`conversation ${selected === item.id ? 'selected' : ''}`} onClick={() => { setSelected(item.id); setCompactChat(true); }}><span className="conversation-avatar"><Avatar person={item} size="md" online={item.online} />{item.id === 'ai' && <span className="ai-badge"><Sparkles size={10} /></span>}</span><span className="conversation-info"><strong>{item.name}</strong><span>{latest?.audio ? 'Voice message' : latest?.text || 'Start a conversation'}</span></span><span className="conversation-meta"><time>{latest?.time === 'Now' ? 'now' : latest?.time || ''}</time>{item.id === 'nia' && <i className="unread-dot" />}</span></button>; })}</div><button className="new-group" onClick={() => toast('Group conversations are coming soon.')}><Users size={17} /> Start a group conversation <Plus size={16} /></button></aside>
    <div className="chat-thread"><header className="thread-header"><button className="icon-button chat-back" onClick={() => setCompactChat(false)} aria-label="Back to messages"><ArrowLeft size={19} /></button><Avatar person={person} size="sm" online={person.online} /><div className="thread-user"><strong>{person.name}</strong><span><i />{person.online ? 'Active now' : person.note || 'Last seen recently'}</span></div><div className="thread-actions"><button className="icon-button" onClick={() => person.id === 'ai' ? toast('Voice calls are for people, not AI.') : onCall({ ...person, audioOnly: true })} aria-label="Voice call"><Phone size={18} /></button><button className="icon-button" onClick={() => person.id === 'ai' ? toast('Video calls are for people, not AI.') : onCall(person)} aria-label="Video call"><Video size={19} /></button><button className="icon-button thread-more" aria-label="Conversation options"><MoreHorizontal size={20} /></button></div></header>
      <div className="thread-date"><span>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span></div><div className="message-stream">{(messages[selected] || []).map((item, index) => <div className={`message-line ${item.from === 'me' ? 'outgoing' : ''} ${item.from === 'ai' ? 'incoming-ai' : ''}`} key={`${selected}-${index}`}><div className="message-avatar">{item.from !== 'me' && <Avatar person={item.from === 'ai' ? person : people.find((p) => p.id === item.from) || person} size="xs" />}</div><div className="message-stack">{item.audio ? <div className="voice-message"><span className="voice-play"><Play size={13} fill="currentColor" /></span><audio src={item.audio} controls /></div> : <div className={`message-bubble ${item.pending ? 'pending' : ''}`}>{item.text}</div>}<time>{item.time}</time></div></div>)}<div ref={scrollRef} /></div>
      <form className="message-composer" onSubmit={sendMessage}><button className="icon-button attach-button" type="button" onClick={() => toast('File sharing is available in verified accounts.')} aria-label="Attach file"><Paperclip size={18} /></button><input value={text} onChange={(e) => setText(e.target.value)} placeholder={`Message ${person.name}…`} /><button className="icon-button" type="button" aria-label="Add emoji" onClick={() => setText((old) => `${old} 😊`)}><Smile size={18} /></button><button className={`icon-button mic-button ${recording ? 'recording' : ''}`} type="button" onClick={toggleRecord} aria-label={recording ? 'Stop recording' : 'Record voice note'}><Mic size={18} /></button><button className="send-button" aria-label="Send message" disabled={!text.trim()}><Send size={17} /></button></form>
    </div>
  </section>;
}

function IncomingCall({ person, onAccept, onDecline }) {
  return <div className="modal-scrim call-scrim"><section className="incoming-call"><Avatar person={person} size="xl" /><span className="eyebrow">INCOMING {person.audioOnly ? 'VOICE' : 'VIDEO'} CALL</span><h2>{person.name}</h2><p>Someone wants to catch up.</p><div><button className="hangup" onClick={onDecline} aria-label="Decline call"><Phone size={19} /></button><button className="accept-call" onClick={onAccept} aria-label="Accept call">{person.audioOnly ? <Phone size={19} /> : <Video size={19} />}</button></div></section></div>;
}

function CallModal({ person, incoming = false, onClose, socket, session, toast }) {
  const [status, setStatus] = useState('Connecting call…'); const [muted, setMuted] = useState(false); const [cameraOff, setCameraOff] = useState(false);
  const [sharing, setSharing] = useState(false);
  const videoRef = useRef(null); const streamRef = useRef(null); const peerRef = useRef(null); const screenTrackRef = useRef(null);
  useEffect(() => {
    let active = true;
    navigator.mediaDevices?.getUserMedia({ video: !person.audioOnly, audio: true }).then(async (stream) => {
      if (!active) { stream.getTracks().forEach((track) => track.stop()); return; }
      streamRef.current = stream; if (videoRef.current) videoRef.current.srcObject = stream;
      if (socket?.connected && !session?.demo && person.id !== 'ai') {
        let iceServers = [{ urls: 'stun:stun.l.google.com:19302' }];
        try { const response = await fetch('/api/calls/ice-servers', { headers: { Authorization: `Bearer ${session.token}` } }); iceServers = (await readApiJson(response)).iceServers || iceServers; } catch {}
        if (!active) { stream.getTracks().forEach((track) => track.stop()); return; }
        const peer = new RTCPeerConnection({ iceServers }); peerRef.current = peer;
        stream.getTracks().forEach((track) => peer.addTrack(track, stream));
        peer.onicecandidate = (event) => { if (event.candidate) socket.emit('call:signal', { to: person.id, candidate: event.candidate }); };
        peer.ontrack = (event) => { const remote = document.getElementById('remote-call-video'); if (remote) remote.srcObject = event.streams[0]; };
        const handleSignal = async ({ description, candidate }) => { if (description) { await peer.setRemoteDescription(description); if (description.type === 'offer') { const answer = await peer.createAnswer(); await peer.setLocalDescription(answer); socket.emit('call:signal', { to: person.id, description: peer.localDescription }); setStatus('In call'); } else setStatus('In call'); } if (candidate) await peer.addIceCandidate(candidate); };
        const handleReady = async () => { const offer = await peer.createOffer(); await peer.setLocalDescription(offer); socket.emit('call:signal', { to: person.id, description: peer.localDescription }); setStatus(`Calling ${person.name}…`); };
        const handleEnded = () => { setStatus('Call ended'); onClose(); };
        socket.on('call:signal', handleSignal); socket.on('call:ready', handleReady); socket.on('call:ended', handleEnded);
        if (incoming) { socket.emit('call:accept', { to: person.id }); setStatus('Connecting…'); } else { socket.emit('call:invite', { to: person.id }); setStatus(`Calling ${person.name}…`); }
        peerRef.current._nexoHandlers = { handleSignal, handleReady, handleEnded };
      } else setStatus(person.id === 'ai' ? 'Video calls are for people, not AI.' : 'Camera ready · waiting for your person');
    }).catch(() => { if (active) setStatus('Allow camera and microphone access to start your call.'); });
    return () => { active = false; streamRef.current?.getTracks().forEach((track) => track.stop()); screenTrackRef.current?.stop(); const handlers = peerRef.current?._nexoHandlers; if (handlers) { socket?.off('call:signal', handlers.handleSignal); socket?.off('call:ready', handlers.handleReady); socket?.off('call:ended', handlers.handleEnded); } peerRef.current?.close(); };
  }, [person, socket, session, incoming, onClose]);
  const toggleTrack = (kind) => { const track = streamRef.current?.getTracks().find((item) => item.kind === kind); if (track) { track.enabled = !track.enabled; if (kind === 'audio') setMuted(!track.enabled); else setCameraOff(!track.enabled); } else toast('Device permission is needed for this control.'); };
  const shareScreen = async () => {
    const sender = peerRef.current?.getSenders().find((item) => item.track?.kind === 'video');
    if (!sender) { toast('Start a video call before sharing your screen.'); return; }
    try {
      const screen = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const track = screen.getVideoTracks()[0]; screenTrackRef.current = track; await sender.replaceTrack(track); setSharing(true);
      track.onended = async () => { const camera = streamRef.current?.getVideoTracks()[0]; if (camera && peerRef.current) await sender.replaceTrack(camera); screenTrackRef.current = null; setSharing(false); };
    } catch { toast('Screen sharing was cancelled or is unavailable.'); }
  };
  const endCall = () => { if (!session?.demo && person.id !== 'ai') socket?.emit('call:hangup', { to: person.id }); onClose(); };
  return <div className="modal-scrim call-scrim"><section className="call-window"><header><div className="call-person"><Avatar person={person} size="sm" /><div><strong>{person.name}</strong><span>{status}</span></div></div><button onClick={endCall} className="icon-button" aria-label="End call"><X size={18} /></button></header><div className={`call-video-area ${person.audioOnly ? 'audio-only' : ''}`}><div className="remote-call-state"><Avatar person={person} size="xl" /><span>{status}</span></div><video id="remote-call-video" autoPlay playsInline className="remote-video" /><video ref={videoRef} autoPlay muted playsInline className="local-video" /></div><footer><button className={muted ? 'control-off' : ''} onClick={() => toggleTrack('audio')} aria-label={muted ? 'Unmute' : 'Mute'}><Mic size={18} /></button>{!person.audioOnly && <button className={cameraOff ? 'control-off' : ''} onClick={() => toggleTrack('video')} aria-label={cameraOff ? 'Turn camera on' : 'Turn camera off'}><Video size={18} /></button>}<button className="hangup" onClick={endCall} aria-label="End call"><Phone size={19} /></button>{!person.audioOnly && <button className={sharing ? 'control-off' : ''} onClick={shareScreen} aria-label={sharing ? 'Stop sharing screen' : 'Share screen'}><MonitorUp size={18} /></button>}</footer></section></div>;
}

function ProfileModal({ user, onClose, onSave }) {
  const [draft, setDraft] = useState({ ...user }); const avatarRef = useRef(null); const coverRef = useRef(null);
  const readImage = (file, key) => { if (!file) return; const reader = new FileReader(); reader.onload = () => setDraft((old) => ({ ...old, [key]: String(reader.result) })); reader.readAsDataURL(file); };
  return <div className="modal-scrim" onClick={onClose}><section className="modal-card profile-modal" onClick={(e) => e.stopPropagation()}><div className="modal-heading"><div><span className="eyebrow">Make it yours</span><h3>Edit profile</h3></div><button className="icon-button" onClick={onClose} aria-label="Close"><X size={19} /></button></div><div className="profile-cover-edit" style={draft.cover ? { backgroundImage: `url(${draft.cover})` } : {}}><button onClick={() => coverRef.current?.click()}><Camera size={15} /> Change cover</button><input ref={coverRef} hidden type="file" accept="image/*" onChange={(e) => readImage(e.target.files?.[0], 'cover')} /><div className="profile-avatar-edit"><Avatar person={draft} size="lg" /><button onClick={() => avatarRef.current?.click()} aria-label="Change profile picture"><Camera size={14} /></button><input ref={avatarRef} hidden type="file" accept="image/*" onChange={(e) => readImage(e.target.files?.[0], 'avatar')} /></div></div><div className="profile-edit-fields"><label>Name<input value={draft.name || ''} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></label><label>About you<textarea rows="3" maxLength="140" value={draft.bio || ''} onChange={(e) => setDraft({ ...draft, bio: e.target.value })} placeholder="A little about yourself" /></label><p>Changes are visible to your people.</p></div><div className="modal-actions"><button className="secondary-button" onClick={onClose}>Cancel</button><button className="primary-button" onClick={() => onSave(draft)}>Save changes <Check size={16} /></button></div></section></div>;
}

function RightRail({ people, onChat, toast }) {
  return <aside className="right-rail"><section className="rail-section"><div className="rail-heading"><h3>Your people</h3><button onClick={() => toast('Showing all your people')}>See all</button></div><div className="people-list">{people.slice(0, 4).map((person) => <button className="person-row" key={person.id} onClick={() => onChat(person.id)}><Avatar person={person} size="sm" online={person.online} /><span><strong>{person.name}</strong><small>{person.online ? person.note : 'Last seen recently'}</small></span><MessageCircle size={17} /></button>)}</div></section><section className="rail-invite"><div className="invite-mark"><Users size={19} /></div><span className="eyebrow">Better together</span><h3>Your circle, just a little bigger.</h3><p>Bring your favorite people into Nexo.</p><button onClick={() => { navigator.clipboard?.writeText(window.location.origin); toast('Invite link copied.'); }}>Invite a friend <ArrowUpRight size={15} /></button></section><section className="rail-section trends-section"><div className="rail-heading"><h3>On your radar</h3><button aria-label="More trends"><MoreHorizontal size={18} /></button></div><button className="trend-row"><span className="trend-topic">TODAY · COMMUNITY</span><strong>#slowmornings</strong><small>128 people talking</small><ChevronRight size={16} /></button><button className="trend-row"><span className="trend-topic">CREATIVE · 2 HOURS AGO</span><strong>Desk reset Sunday</strong><small>43 new posts</small><ChevronRight size={16} /></button><button className="trend-row"><span className="trend-topic">LOCAL · THIS WEEK</span><strong>Little City Market</strong><small>Saturday, 10 am</small><ChevronRight size={16} /></button></section><footer className="rail-footer"><a href="#privacy">Privacy</a><a href="#terms">Terms</a><a href="#about">About</a><span>© 2026 Nexo</span></footer></aside>;
}

function AppWorkspace({ session, onSignOut }) {
  const user = session?.user || me;
  const [view, setView] = useState('feed');
  const [posts, setPosts] = useState(() => session?.demo ? jsonGet('nexo-posts', seedPosts) : []);
  const [messages, setMessages] = useState(() => session?.demo ? jsonGet('nexo-messages', seedMessages) : { ai: seedMessages.ai });
  const [saved, setSaved] = useState(() => session?.demo ? jsonGet('nexo-saved', []) : []);
  const [statuses, setStatuses] = useState(() => session?.demo ? jsonGet('nexo-statuses', []) : []);
  const [profile, setProfile] = useState(() => ({ ...user, ...(session?.demo ? jsonGet('nexo-profile', {}) : {}) }));
  const [theme, setTheme] = useState(() => jsonGet('nexo-theme', { mode: 'light', accent: '#df7457' }));
  const [story, setStory] = useState(null); const [showStatus, setShowStatus] = useState(false); const [showProfile, setShowProfile] = useState(false); const [callPerson, setCallPerson] = useState(null); const [incomingCall, setIncomingCall] = useState(null); const [toastText, setToastText] = useState(''); const [search, setSearch] = useState('');
  const [people, setPeople] = useState(session?.demo ? initialPeople : []); const [socket, setSocket] = useState(null);
  const toast = (message) => { setToastText(message); window.clearTimeout(window.__nexoToast); window.__nexoToast = window.setTimeout(() => setToastText(''), 2800); };
  useEffect(() => { if (session?.demo) localStorage.setItem('nexo-posts', JSON.stringify(posts)); }, [posts, session]);
  useEffect(() => { if (session?.demo) localStorage.setItem('nexo-messages', JSON.stringify(messages)); }, [messages, session]);
  useEffect(() => { if (session?.demo) localStorage.setItem('nexo-saved', JSON.stringify(saved)); }, [saved, session]);
  useEffect(() => { if (session?.demo) localStorage.setItem('nexo-statuses', JSON.stringify(statuses)); }, [statuses, session]);
  useEffect(() => { if (session?.demo) localStorage.setItem('nexo-profile', JSON.stringify(profile)); }, [profile, session]);
  useEffect(() => { localStorage.setItem('nexo-theme', JSON.stringify(theme)); }, [theme]);
  useEffect(() => {
    if (!session?.token) return;
    let active = true;
    const headers = { Authorization: `Bearer ${session.token}` };
    const normalizePost = (post) => ({ ...post, author: { ...post.author, handle: post.author?.handle || 'friend', avatar: post.author?.avatar || initialPeople[0].avatar }, comments: (post.comments || []).map((item) => typeof item === 'string' ? item : { ...item, author: { ...item.author, avatar: item.author?.avatar || initialPeople[1].avatar } }), time: post.time || new Date(post.createdAt).toLocaleDateString() });
    const load = async () => {
      try {
        const [meResponse, peopleResponse, postsResponse, messagesResponse, statusesResponse] = await Promise.all(['/api/me', '/api/users', '/api/posts', '/api/messages', '/api/statuses'].map((url) => fetch(url, { headers })));
        if ([meResponse, peopleResponse, postsResponse, messagesResponse, statusesResponse].some((response) => response.status === 401)) { if (active) onSignOut(); return; }
        const [meData, peopleData, postData, messageData, statusData] = await Promise.all([meResponse, peopleResponse, postsResponse, messagesResponse, statusesResponse].map(readApiJson));
        if (!active) return;
        setProfile(meData.user);
        const nextPeople = peopleData.filter((person) => person.id !== user.id).map((person, index) => ({ ...person, avatar: person.avatar || initialPeople[index % initialPeople.length].avatar, online: Boolean(person.online), note: person.online ? 'around right now' : 'last seen recently' }));
        setPeople(nextPeople);
        setPosts(postData.map(normalizePost));
        setSaved(postData.filter((post) => post.saved).map((post) => post.id));
        const grouped = { ai: seedMessages.ai };
        messageData.forEach((message) => {
          const conversationId = message.from === user.id ? message.to : message.from;
          const normalized = { ...message, from: message.from === user.id ? 'me' : message.from };
          grouped[conversationId] = [...(grouped[conversationId] || []), normalized];
        });
        setMessages(grouped);
        setStatuses(statusData.map((item) => ({ ...item, seen: false, own: item.userId === user.id })));
      } catch (error) { if (active) toast(error.message || 'Could not refresh shared content. Check your connection.'); }
    };
    load();
    const client = io({ auth: { token: session.token } }); setSocket(client);
    client.on('feed:new', (post) => { if (active) setPosts((old) => [normalizePost(post), ...old.filter((item) => item.id !== post.id)]); });
    client.on('feed:update', (post) => { if (active) { const normalized = normalizePost(post); setPosts((old) => old.map((item) => item.id === post.id ? normalized : item)); setSaved((old) => post.saved ? [...new Set([...old, post.id])] : old.filter((id) => id !== post.id)); } });
    client.on('status:new', (item) => { if (active && item.userId !== user.id) setStatuses((old) => [{ ...item, seen: false }, ...old]); });
    client.on('call:incoming', ({ from, audioOnly }) => { if (active) setIncomingCall({ ...from, audioOnly }); });
    client.on('call:ended', ({ reason }) => { if (active && reason === 'declined') toast('Your call was declined.'); });
    client.on('presence:update', ({ id, online }) => { if (active) setPeople((old) => old.map((person) => person.id === id ? { ...person, online, note: online ? 'around right now' : 'last seen recently' } : person)); });
    return () => { active = false; client.disconnect(); };
  }, [session, user.id]);
  useEffect(() => { document.documentElement.dataset.theme = theme.mode; document.documentElement.style.setProperty('--accent', theme.accent); }, [theme]);
  const makePost = async (body, image) => {
    const optimistic = { id: `p-${Date.now()}`, author: { ...profile, handle: profile.handle || 'you' }, time: 'just now', body, image, likes: 0, comments: [], liked: false, reposted: false };
    if (session?.token) {
      try { const uploadedImage = await uploadImage(image, session.token); const response = await fetch('/api/posts', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.token}` }, body: JSON.stringify({ body, image: uploadedImage }) }); const post = await readApiJson(response); setPosts((old) => [{ ...post, author: { ...post.author, avatar: post.author.avatar || profile.avatar } }, ...old]); toast('Your post is out in the world.'); }
      catch (error) { toast(error.message || 'Your post could not be shared.'); }
    } else { setPosts((old) => [optimistic, ...old]); toast('Your post is out in the world.'); }
  };
  const mutatePost = (id, patch) => setPosts((old) => old.map((post) => post.id === id ? { ...post, ...patch(post) } : post));
  const actionLike = (id) => { mutatePost(id, (post) => ({ liked: !post.liked, likes: post.likes + (post.liked ? -1 : 1) })); if (session?.token) fetch(`/api/posts/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.token}` }, body: JSON.stringify({ action: 'like' }) }).catch(() => toast('Like could not be synced.')); };
  const actionRepost = (id) => { mutatePost(id, (post) => ({ reposted: !post.reposted })); if (session?.token) fetch(`/api/posts/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.token}` }, body: JSON.stringify({ action: 'repost' }) }).catch(() => toast('Repost could not be synced.')); toast('Repost added to your feed.'); };
  const actionComment = (id, text) => { mutatePost(id, (post) => ({ comments: [...post.comments, text] })); if (session?.token) fetch(`/api/posts/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.token}` }, body: JSON.stringify({ action: 'comment', text }) }).catch(() => toast('Reply could not be synced.')); };
  const actionSave = (id) => { setSaved((old) => old.includes(id) ? old.filter((item) => item !== id) : [...old, id]); if (session?.token) fetch(`/api/posts/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.token}` }, body: JSON.stringify({ action: 'save' }) }).catch(() => toast('Bookmark could not be synced.')); };
  const publishStatus = async (item) => {
    if (session?.token) {
      try { const image = await uploadImage(item.image, session.token); const response = await fetch('/api/statuses', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.token}` }, body: JSON.stringify({ caption: item.caption, image }) }); await readApiJson(response); }
      catch (error) { toast(error.message || 'Status could not be shared.'); return; }
    }
    setStatuses((old) => [{ ...item, own: true }, ...old]); setShowStatus(false); toast('Your status is live for 24 hours.');
  };
  const downloadStatus = async (item) => { try { const response = await fetch(item.image); const blob = await response.blob(); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `nexo-status-${item.name.toLowerCase()}.jpg`; link.click(); URL.revokeObjectURL(link.href); } catch { window.open(item.image, '_blank', 'noopener'); } };
  const startChat = (id) => { setView('messages'); window.setTimeout(() => document.querySelector(`[data-chat-id="${id}"]`)?.click(), 80); };
  const filteredPosts = posts.filter((post) => `${post.author.name} ${post.body}`.toLowerCase().includes(search.toLowerCase()));
  const nav = [
    { id: 'feed', label: 'Home', icon: Compass }, { id: 'messages', label: 'Messages', icon: MessageCircle },
    { id: 'discover', label: 'Discover', icon: Search }, { id: 'saved', label: 'Saved', icon: Bookmark },
  ];
  return <div className="app-shell" style={{ '--accent': theme.accent }}>
    <aside className="side-nav"><div className="brand-lockup"><span className="brand-mark">n</span><span>NEXO</span><span className="brand-period">.</span></div><button className="mobile-menu icon-button" onClick={() => toast('Use the navigation below to switch views.')} aria-label="Menu"><Menu size={19} /></button><span className="nav-caption">YOUR SPACE</span><nav>{nav.map(({ id, label, icon: Icon, count }) => <button key={id} className={`nav-item ${view === id ? 'active' : ''}`} onClick={() => setView(id)}><Icon size={19} strokeWidth={view === id ? 2.2 : 1.8} /><span>{label}</span>{count && <small>{count}</small>}</button>)}</nav><div className="nav-spacer" /><div className="side-note"><div className="note-icon"><Sparkles size={16} /></div><strong>A softer kind of social.</strong><p>Good conversations live here.</p></div><button className={`nav-item settings-nav ${view === 'settings' ? 'active' : ''}`} onClick={() => setView('settings')}><Settings size={19} /><span>Settings</span></button><button className="profile-shortcut" onClick={() => setShowProfile(true)}><Avatar person={profile} size="sm" /><span><strong>{profile.name}</strong><small>@{profile.handle || 'mayac'}</small></span><MoreHorizontal size={18} /></button></aside>
    <main className="main-column">
      <header className="mobile-header"><div className="brand-lockup"><span className="brand-mark">n</span><span>NEXO</span></div><button className="icon-button" onClick={() => setShowProfile(true)} aria-label="Open profile"><Avatar person={profile} size="xs" /></button></header>
      {view === 'feed' && <>
        <div className="page-heading"><div><span className="eyebrow">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).toUpperCase()}</span><h1>Good morning, {profile.name.split(' ')[0]}<span className="heading-sun">✳</span></h1><p>Your people have been up to things.</p></div><button className="icon-button notification-button" onClick={() => toast('You’re all caught up.')} aria-label="Notifications"><Bell size={19} /><i /></button></div>
        <div className="stories-row"><button className="story-own" onClick={() => setShowStatus(true)}><span className="story-own-avatar"><Avatar person={profile} size="md" /><i><Plus size={13} /></i></span><span>Add to status</span></button>{statuses.filter((item) => item.own).map((item) => <button className="story-item" key={item.id} onClick={() => setStory(item)}><span className={`story-ring ${item.seen ? 'seen' : ''}`}><Avatar person={{ avatar: item.avatar }} size="md" /></span><span>Your status</span></button>)}{storyPeople.map((item) => <button className="story-item" key={item.id} onClick={() => setStory(item)}><span className={`story-ring ${item.seen ? 'seen' : ''}`}><Avatar person={{ avatar: item.avatar }} size="md" /></span><span>{item.name}</span></button>)}<button className="stories-next" aria-label="More statuses"><ChevronRight size={17} /></button></div>
        <Composer user={profile} onPost={makePost} onStory={() => setShowStatus(true)} />
        <div className="feed-sort"><h2>From your circle <span>·</span> <b>{posts.length} updates</b></h2><button onClick={() => setPosts((old) => [...old].reverse())}>Latest <ChevronDown size={15} /></button></div>
        <div className="feed-list">{filteredPosts.map((post) => <PostCard key={post.id} post={post} onLike={actionLike} onRepost={actionRepost} onComment={actionComment} onSave={actionSave} saved={saved.includes(post.id)} currentUser={profile} />)}</div>
      </>}
      {view === 'messages' && <ChatView people={people} messages={messages} setMessages={setMessages} user={profile} session={session} onCall={setCallPerson} socket={socket} toast={toast} />}
      {view === 'discover' && <><div className="page-heading discover-heading"><div><span className="eyebrow">A little outside your circle</span><h1>Find your next thing.</h1><p>People, ideas, and places worth a closer look.</p></div></div><label className="discover-search"><Search size={19} /><input autoFocus value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search posts, people, or a feeling…" /><span>⌘ K</span></label><section className="discover-people"><div className="section-label"><h2>People you may like</h2><button onClick={() => toast('You’re all caught up on suggestions.')}>Refresh <Repeat2 size={15} /></button></div><div className="suggestion-grid">{people.map((person) => <article className="suggestion" key={person.id}><img className="suggestion-cover" src={photo('photo-1519608487953-e999c86e7455')} alt="" /><Avatar person={person} size="lg" /><h3>{person.name}</h3><span>@{person.handle}</span><p>{person.note} · 3 mutual people</p><button className="secondary-button" onClick={() => startChat(person.id)}><MessageCircle size={15} /> Say hello</button></article>)}</div></section><div className="feed-sort"><h2>Things people are sharing</h2><span className="muted">{filteredPosts.length} posts</span></div>{filteredPosts.map((post) => <PostCard key={post.id} post={post} onLike={actionLike} onRepost={actionRepost} onComment={actionComment} onSave={actionSave} saved={saved.includes(post.id)} currentUser={profile} />)}</>}
      {view === 'saved' && <><div className="page-heading"><div><span className="eyebrow">Keep what stays with you</span><h1>Your saved things.</h1><p>Posts you wanted to come back to.</p></div></div>{posts.filter((post) => saved.includes(post.id)).length ? posts.filter((post) => saved.includes(post.id)).map((post) => <PostCard key={post.id} post={post} onLike={actionLike} onRepost={actionRepost} onComment={actionComment} onSave={actionSave} saved currentUser={profile} />) : <div className="empty-state"><span><Bookmark size={22} /></span><h2>A little space for later.</h2><p>Bookmark a post and it’ll be waiting here when you need it.</p><button className="secondary-button" onClick={() => setView('feed')}>Back to your feed <ArrowUpRight size={15} /></button></div>}</>}
      {view === 'settings' && <SettingsView theme={theme} setTheme={setTheme} onProfile={() => setShowProfile(true)} onSignOut={onSignOut} toast={toast} />}
    </main>
    {view !== 'messages' && <RightRail people={people} onChat={startChat} toast={toast} />}
    <nav className="mobile-bottom">{nav.slice(0, 4).map(({ id, label, icon: Icon }) => <button key={id} className={view === id ? 'active' : ''} onClick={() => setView(id)}><Icon size={20} /><span>{label}</span></button>)}</nav>
    {story && <StoryViewer story={story} onClose={() => setStory(null)} onDownload={downloadStatus} />}
    {showStatus && <StatusComposer user={profile} onClose={() => setShowStatus(false)} onPublish={publishStatus} />}
    {showProfile && <ProfileModal user={profile} onClose={() => setShowProfile(false)} onSave={async (next) => { try { let saved = next; if (session?.token) { const avatar = await uploadImage(next.avatar, session.token); const cover = await uploadImage(next.cover, session.token); const response = await fetch('/api/me', { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.token}` }, body: JSON.stringify({ name: next.name, bio: next.bio, avatar, cover }) }); const data = await readApiJson(response); saved = { ...data.user, avatar: data.user.avatar || next.avatar, cover: data.user.cover || next.cover }; } setProfile(saved); setShowProfile(false); toast('Your profile has been updated.'); } catch (error) { toast(error.message || 'Profile could not be updated.'); } }} />}
    {incomingCall && !callPerson && <IncomingCall person={incomingCall} onAccept={() => { setCallPerson({ ...incomingCall, incoming: true }); setIncomingCall(null); }} onDecline={() => { socket?.emit('call:reject', { to: incomingCall.id }); setIncomingCall(null); }} />}
    {callPerson && <CallModal person={callPerson} incoming={callPerson.incoming} onClose={() => setCallPerson(null)} socket={socket} session={session} toast={toast} />}
    {toastText && <div className="toast"><Check size={16} />{toastText}</div>}
  </div>;
}

function SettingsView({ theme, setTheme, onProfile, onSignOut, toast }) {
  const swatches = ['#df7457', '#d1a250', '#4d9a78', '#4e8db1', '#7f83ab'];
  return <section className="settings-view"><div className="page-heading"><div><span className="eyebrow">Your Nexo, your way</span><h1>Settings.</h1><p>Make your space feel like your own.</p></div></div><section className="settings-group"><div className="settings-group-heading"><span className="settings-icon"><UserRound size={18} /></span><div><h2>Your profile</h2><p>The details people see about you.</p></div></div><button className="settings-row" onClick={onProfile}><span><strong>Edit your profile</strong><small>Name, bio, profile photo, and cover image</small></span><ChevronRight size={18} /></button></section><section className="settings-group"><div className="settings-group-heading"><span className="settings-icon"><Sun size={18} /></span><div><h2>Look and feel</h2><p>Choose a palette that feels like you.</p></div></div><div className="settings-row setting-theme-row"><span><strong>Appearance</strong><small>Light or dark, whenever you like</small></span><div className="segmented"><button className={theme.mode === 'light' ? 'selected' : ''} onClick={() => setTheme((old) => ({ ...old, mode: 'light' }))}><Sun size={15} /> Light</button><button className={theme.mode === 'dark' ? 'selected' : ''} onClick={() => setTheme((old) => ({ ...old, mode: 'dark' }))}><Moon size={15} /> Dark</button></div></div><div className="settings-row setting-color-row"><span><strong>Accent color</strong><small>Make the little details yours</small></span><div className="swatches">{swatches.map((color) => <button key={color} aria-label={`Choose accent ${color}`} className={theme.accent === color ? 'picked' : ''} style={{ '--swatch': color }} onClick={() => setTheme((old) => ({ ...old, accent: color }))} />)}</div></div></section><section className="settings-group"><div className="settings-group-heading"><span className="settings-icon"><ShieldCheck size={18} /></span><div><h2>Privacy & safety</h2><p>You should feel good about being here.</p></div></div><button className="settings-row" onClick={() => toast('Your account is protected with email verification.') }><span><strong>Account security</strong><small>Password and email verification</small></span><span className="verified-label"><Check size={14} /> Protected</span></button><button className="settings-row" onClick={() => toast('Notification preferences saved.') }><span><strong>Notifications</strong><small>Replies, messages, and people you follow</small></span><ChevronRight size={18} /></button></section><button className="signout-button" onClick={onSignOut}><LogOut size={17} /> Sign out</button></section>;
}

export default function App() {
  const [session, setSession] = useState(() => { const token = localStorage.getItem('nexo-token'); const user = jsonGet('nexo-user', null); return token && user ? { token, user } : null; });
  const signOut = () => { localStorage.removeItem('nexo-token'); localStorage.removeItem('nexo-user'); setSession(null); };
  if (!session) return <AuthGate onEnter={setSession} />;
  return <AppWorkspace session={session} onSignOut={signOut} />;
}
