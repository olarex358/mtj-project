const fs = require('fs');
const path = require('path');

const projectName = 'mtj-smart-savings';
const root = path.join(__dirname, projectName);

function writeFile(filePath, content) {
  const fullPath = path.join(root, filePath);
  const dir = path.dirname(fullPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(fullPath, content.trim() + '\n');
  console.log('✅ Created: ' + filePath);
}

console.log('🚀 Generating ' + projectName + '...\n');

// 1. Root Files
writeFile('package.json', JSON.stringify({
  "name": "mtj-smart-savings",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.39.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.21.0",
    "qrcode.react": "^3.1.0",
    "idb-keyval": "^6.2.1"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.2.1",
    "vite": "^5.0.0",
    "vite-plugin-pwa": "^0.17.4"
  }
}, null, 2));

writeFile('vite.config.js', `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'MTJ Smart Savings',
        short_name: 'MTJ Savings',
        description: 'Save Today. Secure Tomorrow.',
        theme_color: '#0a6e3a',
        background_color: '#f5f7f6',
        display: 'standalone',
        start_url: '/',
        icons: [{ src: '/icon-192.png', sizes: '192x192', type: 'image/png' }]
      },
      workbox: {
        runtimeCaching: [{
          urlPattern: /^https:\\/\\/.*\\.supabase\\.co\\/.*/i,
          handler: 'NetworkFirst',
          options: { cacheName: 'supabase-api', expiration: { maxEntries: 50 } }
        }]
      }
    })
  ]
});`);

writeFile('.env.example', `VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_VAPID_PUBLIC_KEY=your_vapid_public_key`);

writeFile('index.html', `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <title>MTJ Smart Savings</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>`);

// 2. Source Files
writeFile('src/main.jsx', `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { startSyncListener } from './lib/sync';
import './styles/global.css';

startSyncListener();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);`);

writeFile('src/supabase.js', `import { createClient } from '@supabase/supabase-js';
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);`);

writeFile('src/lib/ledger.js', `import { supabase } from '../supabase';

export async function recordEntry({ walletId, userId, agentId, type, amount, direction, reference, note }) {
  const { data, error } = await supabase
    .from('ledger_entries')
    .insert({ wallet_id: walletId, user_id: userId, agent_id: agentId || null, type, amount, direction, reference: reference || null, note: note || null })
    .select().single();
  if (error) throw error;
  return data;
}

export async function getWalletBalance(walletId) {
  const { data, error } = await supabase.rpc('wallet_balance', { p_wallet_id: walletId });
  if (error) throw error;
  return Number(data);
}`);

writeFile('src/lib/offline.js', `import { openDB } from 'idb-keyval';

const DB_NAME = 'mtj-offline';
const STORE = 'queue';

async function getDB() {
  return openDB(DB_NAME, 1, { upgrade(db) { if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true }); } });
}

export async function queueTransaction(txn) {
  const db = await getDB();
  const entry = { ...txn, localId: crypto.randomUUID(), createdAt: Date.now(), status: 'queued', retries: 0 };
  const tx = db.transaction(STORE, 'readwrite');
  return new Promise((resolve, reject) => {
    const req = tx.objectStore(STORE).add(entry);
    req.onsuccess = () => resolve({ localId: entry.localId, id: req.result });
    req.onerror = () => reject(req.error);
  });
}

export async function getQueue() { const db = await getDB(); return db.getAll(STORE); }
export async function markSynced(id) {
  const db = await getDB(); const tx = db.transaction(STORE, 'readwrite');
  const req = tx.objectStore(STORE).get(id);
  req.onsuccess = () => { if (req.result) tx.objectStore(STORE).put({ ...req.result, status: 'synced', syncedAt: Date.now() }); };
}
export async function markFailed(id, error) {
  const db = await getDB(); const tx = db.transaction(STORE, 'readwrite');
  const req = tx.objectStore(STORE).get(id);
  req.onsuccess = () => { if (req.result) tx.objectStore(STORE).put({ ...req.result, status: 'failed', error: error ? error.message : 'Unknown', retries: (req.result.retries || 0) + 1 }); };
}
export async function getQueueCount() { const all = await getQueue(); return all.filter(x => x.status !== 'synced').length; }`);

writeFile('src/lib/sync.js', `import { getQueue, markSynced, markFailed } from './offline';
import { supabase } from '../supabase';

let syncing = false;
export async function syncQueue({ onProgress } = {}) {
  if (syncing || !navigator.onLine) return;
  syncing = true;
  try {
    const queue = await getQueue();
    const pending = queue.filter(x => x.status !== 'synced' && x.retries < 5);
    if (pending.length === 0) return { synced: 0 };
    let synced = 0, failed = 0;
    for (const item of pending) {
      try {
        if (onProgress) onProgress({ current: synced + failed + 1, total: pending.length });
        const { data: wallet } = await supabase.from('wallets').select('id').eq('user_id', item.userId).eq('type', item.walletType).single();
        if (!wallet) { await markFailed(item.id, { message: 'Wallet not found' }); failed++; continue; }
        const { error } = await supabase.from('ledger_entries').insert({
          wallet_id: wallet.id, user_id: item.userId, agent_id: item.agentId || null,
          type: item.type, amount: item.amount, direction: item.direction,
          reference: item.reference, note: item.note ? item.note + ' [synced]' : 'Synced'
        });
        if (error) throw error;
        await markSynced(item.id);
        synced++;
      } catch (err) { await markFailed(item.id, err); failed++; }
    }
    return { synced, failed };
  } finally { syncing = false; }
}

export function startSyncListener() {
  window.addEventListener('online', () => syncQueue());
  setInterval(() => { if (navigator.onLine) syncQueue(); }, 30000);
}`);

writeFile('src/lib/opay.js', `export const MTJ_TREASURY = { phoneNumber: '08012345678', accountName: 'MTJ Multipurpose Global Services' };
export function buildOPayTransferLink({ amount, note }) {
  return 'https://openapp.opaymobile.com/opayweb/#/transfer?phone=' + MTJ_TREASURY.phoneNumber + '&amount=' + amount + '&note=' + encodeURIComponent(note || 'MTJ Remittance');
}
export function openOPayRemit(amount, reference) {
  window.location.href = 'opay://transfer?phone=' + MTJ_TREASURY.phoneNumber + '&amount=' + amount;
  setTimeout(() => window.open(buildOPayTransferLink({ amount, note: 'Remit ' + reference }), '_blank'), 1500);
}
export function openOPayBusinessDashboard() { window.open('https://business.opayweb.com/transactions', '_blank'); }
export function buildOPayPayoutLink({ phone, amount, name }) {
  return 'https://openapp.opaymobile.com/opayweb/#/transfer?phone=' + phone + '&amount=' + amount + '&name=' + encodeURIComponent(name || '');
}`);

writeFile('src/lib/remittance.js', `import { supabase } from '../supabase';
import { openOPayRemit } from './opay';

export async function initiateRemittance(agentId, amount) {
  const reference = 'RMT-' + Date.now().toString(36).toUpperCase();
  const { data, error } = await supabase.from('remittances').insert({ agent_id: agentId, amount: Number(amount), expected_amount: Number(amount), status: 'pending' }).select().single();
  if (error) throw error;
  openOPayRemit(amount, reference);
  return { ...data, reference };
}

export async function submitOPayReference(remittanceId, opayReference) {
  await supabase.from('remittances').update({ opay_reference: opayReference, status: 'awaiting_confirmation' }).eq('id', remittanceId);
}

export async function confirmRemittance(remittanceId, adminId, actualAmount, note) {
  const { data: rem } = await supabase.from('remittances').select('*').eq('id', remittanceId).single();
  await supabase.from('remittances').update({
    status: 'settled', confirmed_by: adminId, confirmed_at: new Date().toISOString(),
    actual_amount: actualAmount !== undefined ? actualAmount : rem.expected_amount, admin_note: note || null,
    mismatch_reason: (actualAmount !== undefined && actualAmount !== rem.expected_amount) ? 'Amount mismatch' : null
  }).eq('id', remittanceId);
}

export async function rejectRemittance(remittanceId, reason) {
  await supabase.from('remittances').update({ status: 'rejected', mismatch_reason: reason }).eq('id', remittanceId);
}`);

writeFile('src/context/AuthContext.jsx', `import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../supabase';

const AuthContext = createContext(null);
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session ? session.user : null);
      if (session && session.user) loadProfile(session.user.id);
      else setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session ? session.user : null);
      if (session && session.user) loadProfile(session.user.id);
      else { setProfile(null); setLoading(false); }
    });
    return () => { if (sub && sub.subscription) sub.subscription.unsubscribe(); };
  }, []);

  async function loadProfile(uid) {
    const { data } = await supabase.from('profiles').select('*').eq('id', uid).single();
    setProfile(data);
    setLoading(false);
  }

  return <AuthContext.Provider value={{ user, profile, loading, reloadProfile: () => user ? loadProfile(user.id) : null }}>{children}</AuthContext.Provider>;
}
export const useAuth = () => useContext(AuthContext);`);

writeFile('src/components/ProtectedRoute.jsx', `import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, allowAgent, allowAdmin }) {
  const { user, profile, loading } = useAuth();
  if (loading) return <div className="loading">Loading…</div>;
  if (!user) return <Navigate to="/login" />;
  if (profile && profile.role === 'admin' && !allowAdmin) return <Navigate to="/admin" />;
  if (profile && profile.role === 'agent' && !allowAgent && !allowAdmin) return <Navigate to="/agent" />;
  return children;
}`);

writeFile('src/components/Layout.jsx', `import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import BottomNav from './BottomNav';

export default function Layout({ children }) {
  const navigate = useNavigate();
  async function logout() { await supabase.auth.signOut(); navigate('/login'); }
  return (
    <div style={{ minHeight: '100vh', maxWidth: 480, margin: '0 auto', background: 'var(--bg)', paddingBottom: 80 }}>
      {children}
      <div style={{ padding: 24, textAlign: 'center' }}>
        <button className="outline" onClick={logout}>Sign Out</button>
      </div>
      <BottomNav />
    </div>
  );
}`);

writeFile('src/components/BottomNav.jsx', `import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/nav.css';

export default function BottomNav() {
  const { profile } = useAuth();
  const location = useLocation();
  if (['/login', '/register'].some(p => location.pathname.startsWith(p))) return null;

  const userLinks = [
    { to: '/dashboard', icon: '🏠', label: 'Home' },
    { to: '/history', icon: '📜', label: 'History' },
    { to: '/tx/deposit', icon: '💵', label: 'Deposit' },
    { to: '/rotations', icon: '🔄', label: 'Rotation' },
    { to: '/card', icon: '💳', label: 'Card' },
  ];
  const agentLinks = [
    { to: '/agent', icon: '🏪', label: 'Dashboard' },
    { to: '/tx/deposit', icon: '💵', label: 'Collect' },
    { to: '/tx/withdraw', icon: '📤', label: 'Pay Out' },
    { to: '/earnings', icon: '💰', label: 'Earnings' },
  ];
  const links = profile && profile.role === 'agent' ? agentLinks : userLinks;

  return (
    <nav className="bottom-nav">
      {links.map(link => (
        <NavLink key={link.to} to={link.to} className={({ isActive }) => 'nav-item ' + (isActive ? 'active' : '')}>
          <span className="nav-icon">{link.icon}</span>
          <span className="nav-label">{link.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}`);

writeFile('src/components/OnlineStatus.jsx', `import { useEffect, useState } from 'react';
import { syncQueue } from '../lib/sync';
import '../styles/status.css';

export default function OnlineStatus({ pendingCount = 0 }) {
  const [online, setOnline] = useState(navigator.onLine);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  async function forceSync() {
    setSyncing(true);
    try { await syncQueue(); } finally { setSyncing(false); }
  }

  if (online && pendingCount === 0) return null;

  return (
    <div className={'status-bar ' + (online ? 'online' : 'offline')}>
      <div className="status-content">
        {online ? (
          <React.Fragment>
            <span className="dot"></span>
            <span>{pendingCount} transaction(s) syncing</span>
            <button className="sync-btn" onClick={forceSync} disabled={syncing}>{syncing ? 'Syncing…' : 'Sync now'}</button>
          </React.Fragment>
        ) : (
          <React.Fragment>
            <span className="dot"></span>
            <span>Offline · Transactions will queue and sync automatically</span>
          </React.Fragment>
        )}
      </div>
    </div>
  );
}`);

writeFile('src/components/WalletCard.jsx', `import { useNavigate } from 'react-router-dom';
import '../styles/cards.css';

const LABELS = { daily: '💰 Daily Savings', rotation: '🔄 Rotation', target: '🎯 Target', loan: '💳 Loan', rewards: '🎁 Rewards' };

export default function WalletCard({ wallet }) {
  const navigate = useNavigate();
  const pct = wallet.target_amount ? Math.min(100, (Number(wallet.balance) / Number(wallet.target_amount)) * 100) : null;
  return (
    <div className="wallet-card" onClick={() => wallet.type === 'target' && wallet.target_id && navigate('/target/' + wallet.target_id)}
         style={{ cursor: wallet.type === 'target' && wallet.target_id ? 'pointer' : 'default' }}>
      <span>{LABELS[wallet.type]}</span>
      <h3>₦ {Number(wallet.balance || 0).toLocaleString('en-NG')}</h3>
      {pct !== null && (
        <React.Fragment>
          <div style={{ height: 4, background: 'rgba(255,255,255,.25)', borderRadius: 2, marginTop: 8 }}>
            <div style={{ height: '100%', width: pct + '%', background: 'var(--accent)', borderRadius: 2 }} />
          </div>
          <small>{pct.toFixed(0)}% of ₦{Number(wallet.target_amount).toLocaleString('en-NG')}</small>
        </React.Fragment>
      )}
    </div>
  );
}`);

writeFile('src/components/QRCard.jsx', `import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';
import '../styles/qrcard.css';

export default function QRCard() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);

  useEffect(() => { load(); }, [user]);
  async function load() {
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    setProfile(data);
  }
  async function freezeToggle() {
    const next = !profile.card_frozen;
    await supabase.from('profiles').update({ card_frozen: next }).eq('id', user.id);
    setProfile({ ...profile, card_frozen: next });
  }
  function print() { window.print(); }
  if (!profile) return null;

  return (
    <div className="qrcard-wrap">
      <div className={'qrcard ' + (profile.card_frozen ? 'frozen' : '')} id="printable-card">
        <div className="qrcard-top">
          <div><h2>MTJ Smart Savings</h2><small>Member Card</small></div>
          <div className="chip"></div>
        </div>
        <div className="qrcard-qr">
          <QRCodeSVG value={profile.card_qr_token} size={140} level="H" bgColor="#ffffff" fgColor="#064425" />
        </div>
        <div className="qrcard-info">
          <strong>{profile.full_name}</strong>
          <small>{profile.phone}</small>
          <code>{profile.card_qr_token}</code>
        </div>
        <div className="qrcard-footer">
          <span>Save Today · Secure Tomorrow</span>
          {profile.card_frozen && <span className="frozen-badge">❄ FROZEN</span>}
        </div>
      </div>
      <div className="card-controls">
        <button onClick={print}>🖨 Print Card</button>
        <button onClick={freezeToggle} className="outline">{profile.card_frozen ? '🔓 Unfreeze' : '❄ Freeze'}</button>
      </div>
    </div>
  );
}`);

// 3. Pages
writeFile('src/pages/Login.jsx', `import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import '../styles/auth.css';

export default function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      const { error: err } = await supabase.auth.signInWithPassword({ email: form.email.trim(), password: form.password });
      if (err) throw err;
      navigate('/');
    } catch (err) { setError(err.message === 'Invalid login credentials' ? 'Wrong email or password.' : err.message); }
    finally { setLoading(false); }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="brand-badge">MTJ</div>
        <h1>Welcome Back</h1>
        <p className="sub">Save Today. Secure Tomorrow.</p>
        <form onSubmit={handleSubmit}>
          <label>Email <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required /></label>
          <label>Password <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required /></label>
          {error && <div className="alert error">{error}</div>}
          <button type="submit" disabled={loading}>{loading ? 'Signing in…' : 'Sign In'}</button>
        </form>
        <p className="auth-link">New here? <Link to="/register">Create an account</Link></p>
      </div>
    </div>
  );
}`);

writeFile('src/pages/Register.jsx', `import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import '../styles/auth.css';

function generateQRToken() { return 'MTJ-' + Math.random().toString(36).slice(2, 10).toUpperCase() + '-' + Date.now().toString(36).toUpperCase(); }
function hashPin(pin) { return btoa('mtj_salt_' + pin); }

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ full_name: '', phone: '', email: '', password: '', pin: '', pinConfirm: '', role: 'user' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault(); setError(''); setLoading(true);
    if (form.pin !== form.pinConfirm) { setError('PINs do not match'); setLoading(false); return; }
    if (!/^\\d{4}$/.test(form.pin)) { setError('PIN must be exactly 4 digits'); setLoading(false); return; }
    try {
      const { data: auth, error: authErr } = await supabase.auth.signUp({ email: form.email, password: form.password });
      if (authErr) throw authErr;
      const userId = auth.user.id;
      await supabase.from('profiles').insert({ id: userId, full_name: form.full_name, phone: form.phone, role: form.role, pin_hash: hashPin(form.pin), card_qr_token: generateQRToken() });
      const types = ['daily','rotation','target','loan','rewards'];
      await supabase.from('wallets').insert(types.map(t => ({ user_id: userId, type: t })));
      alert('Account created! Please check your email to confirm.');
      navigate('/login');
    } catch (err) { setError(err.message || 'Registration failed'); }
    finally { setLoading(false); }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="brand-badge">MTJ</div>
        <h1>Join MTJ Smart Savings</h1>
        <p className="sub">Save Today. Secure Tomorrow.</p>
        <form onSubmit={handleSubmit}>
          <label>Full Name <input value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})} required /></label>
          <label>Phone <input value={form.phone} placeholder="08012345678" onChange={e => setForm({...form, phone: e.target.value})} required /></label>
          <label>Email <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required /></label>
          <label>Password <input type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} minLength={6} required /></label>
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px'}}>
            <label>4-Digit PIN <input type="password" maxLength={4} value={form.pin} onChange={e => setForm({...form, pin: e.target.value.replace(/\\D/g,'')})} required /></label>
            <label>Confirm PIN <input type="password" maxLength={4} value={form.pinConfirm} onChange={e => setForm({...form, pinConfirm: e.target.value.replace(/\\D/g,'')})} required /></label>
          </div>
          <label>I am a… <select value={form.role} onChange={e => setForm({...form, role: e.target.value})}><option value="user">Member</option><option value="agent">MTJ Smart Agent</option></select></label>
          {error && <div className="alert error">{error}</div>}
          <button type="submit" disabled={loading}>{loading ? 'Creating account…' : 'Create Account'}</button>
        </form>
        <p className="auth-link">Already have an account? <Link to="/login">Sign in</Link></p>
      </div>
    </div>
  );
}`);

writeFile('src/pages/UserDashboard.jsx', `import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';
import { getWalletBalance } from '../lib/ledger';
import Layout from '../components/Layout';
import WalletCard from '../components/WalletCard';
import '../styles/dashboard.css';

export default function UserDashboard() {
  const { user } = useAuth();
  const [wallets, setWallets] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  async function load() {
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    if (data) {
      const { data: walletsData } = await supabase.from('wallets').select('*').eq('user_id', user.id);
      let rows = walletsData || [];
      if (rows.length === 0) {
        const types = ['daily','rotation','target','loan','rewards'];
        const { data: created } = await supabase.from('wallets').insert(types.map(t => ({ user_id: user.id, type: t }))).select();
        rows = created;
      }
      const withBalances = await Promise.all(rows.map(async w => ({ ...w, balance: await getWalletBalance(w.id) })));
      setWallets(withBalances);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, [user]);
  const total = wallets.reduce((s, w) => s + Number(w.balance || 0), 0);

  if (loading) return <Layout><div className="loading">Loading…</div></Layout>;

  return (
    <Layout>
      <header className="dash-header">
        <div><h1>MTJ Smart Savings</h1><p className="tagline">Save Today. Secure Tomorrow.</p></div>
      </header>
      <section className="balance-hero">
        <span>Total Savings</span>
        <h2>₦ {total.toLocaleString('en-NG', { minimumFractionDigits: 2 })}</h2>
        <div className="quick-actions">
          <button onClick={() => navigate('/tx/deposit')}>Deposit</button>
          <button className="outline" onClick={() => navigate('/tx/withdraw')}>Withdraw</button>
        </div>
      </section>
      <section className="wallets-grid">
        {wallets.map(w => <WalletCard key={w.id} wallet={w} />)}
      </section>
      <nav className="quick-nav">
        <Link to="/target">🎯 Target Savings</Link>
        <Link to="/rotations">🔄 Rotations</Link>
        <Link to="/card">💳 My QR Card</Link>
      </nav>
    </Layout>
  );
}`);

writeFile('src/pages/AgentDashboard.jsx', `import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';
import { initiateRemittance, submitOPayReference } from '../lib/remittance';
import Layout from '../components/Layout';
import OnlineStatus from '../components/OnlineStatus';
import '../styles/dashboard.css';
import '../styles/agent.css';

function today() { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString(); }

export default function AgentDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ collections: 0, withdrawals: 0, remittance: 0, earnings: 0 });
  const [remitStep, setRemitStep] = useState(0);
  const [activeRemit, setActiveRemit] = useState(null);
  const [opayRef, setOpayRef] = useState('');

  async function loadStats() {
    const startOfDay = today();
    const { data: txns } = await supabase.from('ledger_entries').select('type, amount, direction, created_at').eq('agent_id', user.id).gte('created_at', startOfDay).order('created_at', { ascending: false });
    let collections = 0, withdrawals = 0, earnings = 0;
    (txns || []).forEach(t => {
      if (t.type === 'deposit' && t.direction === 'credit') collections += Number(t.amount);
      if (t.type === 'withdrawal' && t.direction === 'debit') withdrawals += Number(t.amount);
      if (t.type === 'agent_commission') earnings += Number(t.amount);
    });
    const { data: settled } = await supabase.from('remittances').select('amount').eq('agent_id', user.id).eq('status', 'settled');
    const totalSettled = (settled || []).reduce((s, r) => s + Number(r.amount), 0);
    setStats({ collections, withdrawals, remittance: collections - totalSettled, earnings });
  }

  useEffect(() => { loadStats(); }, [user]);

  async function startRemit() {
    if (stats.remittance <= 0) return alert('Nothing to remit.');
    const rem = await initiateRemittance(user.id, stats.remittance);
    setActiveRemit(rem);
    setRemitStep(1);
  }

  async function submitRef() {
    if (!/^[A-Za-z0-9]{6,}$/.test(opayRef)) return alert('Enter valid OPay reference.');
    await submitOPayReference(activeRemit.id, opayRef);
    setRemitStep(2);
    loadStats();
  }

  return (
    <Layout>
      <OnlineStatus pendingCount={0} />
      <header className="agent-header"><div><h1>Agent Portal</h1><p className="tagline">MTJ Smart Agent · Live</p></div></header>
      <section className="stats-grid">
        <div className="stat-card green"><small>Today's Collections</small><h3>₦{stats.collections.toLocaleString()}</h3></div>
        <div className="stat-card orange"><small>Today's Withdrawals</small><h3>₦{stats.withdrawals.toLocaleString()}</h3></div>
        <div className="stat-card blue"><small>Pending Remittance</small><h3>₦{stats.remittance.toLocaleString()}</h3>
          <button onClick={startRemit} className="mini">Remit via OPay</button></div>
        <div className="stat-card gold"><small>Lifetime Earnings</small><h3>₦{stats.earnings.toLocaleString()}</h3></div>
      </section>
      <section className="agent-actions">
        <button onClick={() => navigate('/tx/deposit')}>💵 Collect Savings</button>
        <button className="outline" onClick={() => navigate('/tx/withdraw')}>📤 Process Withdrawal</button>
      </section>

      {remitStep > 0 && (
        <div className="modal-backdrop" onClick={() => setRemitStep(0)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            {remitStep === 1 && (
              <React.Fragment>
                <h3>📤 Complete Transfer in OPay</h3>
                <p>Send exactly:</p>
                <div className="amount-display">₦{Number(activeRemit.amount).toLocaleString()}</div>
                <p className="subtle">To: <strong>MTJ Multipurpose Global Services</strong><br/>Ref: <code>{activeRemit.reference}</code></p>
                <label style={{marginTop:16, display:'block'}}>Paste OPay Transaction ID<input value={opayRef} onChange={e => setOpayRef(e.target.value)} placeholder="e.g. 2406021234567890" /></label>
                <div className="modal-actions"><button className="outline" onClick={() => setRemitStep(0)}>Cancel</button><button onClick={submitRef}>I've Sent It</button></div>
              </React.Fragment>
            )}
            {remitStep === 2 && (
              <React.Fragment>
                <h3>⏳ Awaiting Confirmation</h3>
                <p>Your remittance has been submitted. MTJ admin will verify within 24 hours.</p>
                <p className="subtle">Ref: <code>{activeRemit.reference}</code><br/>OPay ID: <code>{opayRef}</code></p>
                <button onClick={() => setRemitStep(0)} style={{width:'100%'}}>Done</button>
              </React.Fragment>
            )}
          </div>
        </div>
      )}
    </Layout>
  );
}`);

writeFile('src/pages/Transaction.jsx', `import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { recordEntry } from '../lib/ledger';
import { queueTransaction } from '../lib/offline';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import OnlineStatus from '../components/OnlineStatus';
import '../styles/forms.css';

export default function Transaction() {
  const { type } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [qrToken, setQrToken] = useState('');
  const [amount, setAmount] = useState('');
  const [pin, setPin] = useState('');
  const [targetWallet, setTargetWallet] = useState('daily');
  const [status, setStatus] = useState({ msg: '', type: '' });
  const [profile, setProfile] = useState(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  async function handleScan() {
    const { data } = await supabase.from('profiles').select('id,card_frozen,failed_pin_attempts,full_name').eq('card_qr_token', qrToken).single();
    if (!data) return setStatus({ msg: '❌ Invalid QR card', type: 'error' });
    if (data.card_frozen) return setStatus({ msg: '❄ Card is frozen', type: 'error' });
    if (data.failed_pin_attempts >= 3) return setStatus({ msg: '🔒 Card locked', type: 'error' });
    setProfile(data);
    setStatus({ msg: '', type: '' });
    setStep(2);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (type === 'withdraw' && !isOnline) return setStatus({ msg: '⚠️ PIN verification requires internet.', type: 'error' });

    if (type === 'withdraw') {
      const { data: prof } = await supabase.from('profiles').select('pin_hash,failed_pin_attempts').eq('card_qr_token', qrToken).single();
      if (btoa(pin) !== prof.pin_hash) {
        await supabase.from('profiles').update({ failed_pin_attempts: (prof.failed_pin_attempts || 0) + 1 }).eq('card_qr_token', qrToken);
        return setStatus({ msg: '❌ Incorrect PIN', type: 'error' });
      }
    }

    const txn = { userId: profile.id, agentId: user.id, walletType: targetWallet, type: type === 'deposit' ? 'deposit' : 'withdrawal', amount: Number(amount), direction: type === 'deposit' ? 'credit' : 'debit', reference: qrToken, note: type + ' via QR' };

    try {
      if (isOnline) {
        const { data: wallet } = await supabase.from('wallets').select('id').eq('user_id', profile.id).eq('type', targetWallet).single();
        await recordEntry({ ...txn, walletId: wallet.id });
        setStatus({ msg: '✅ ' + (type === 'deposit' ? 'Deposit' : 'Withdrawal') + ' successful', type: 'success' });
      } else {
        await queueTransaction(txn);
        setStatus({ msg: '⏳ Saved offline. Will sync when online.', type: 'success' });
      }
      setTimeout(() => navigate(-1), 1500);
    } catch (err) {
      setStatus({ msg: err.message, type: 'error' });
    }
  }

  return (
    <Layout>
      <OnlineStatus />
      <h2 style={{ padding: '24px 16px 8px' }}>{type === 'deposit' ? '💵 Deposit' : '📤 Withdraw'}</h2>
      {status.msg && <div className={'alert ' + status.type}>{status.msg}</div>}
      <form onSubmit={handleSubmit} className="card-form">
        {step === 1 && (
          <React.Fragment>
            <label>Scan User QR Card<input value={qrToken} onChange={e => setQrToken(e.target.value)} placeholder="Scan or paste QR token" required /></label>
            <button type="button" onClick={handleScan}>Verify Card →</button>
          </React.Fragment>
        )}
        {step === 2 && (
          <React.Fragment>
            <div className="profile-chip">👤 {profile ? profile.full_name : ''}</div>
            <label>Wallet Type<select value={targetWallet} onChange={e => setTargetWallet(e.target.value)}><option value="daily">Daily Savings</option><option value="rotation">Rotation</option><option value="target">Target</option></select></label>
            <label>Amount (₦)<input type="number" value={amount} onChange={e => setAmount(e.target.value)} required min="1" placeholder="e.g. 1000" /></label>
            {type === 'withdraw' && <label>User PIN<input type="password" maxLength={4} value={pin} onChange={e => setPin(e.target.value)} required /></label>}
            <button type="submit">{isOnline ? 'Confirm ' + type : '💾 Save Offline (will sync later)'}</button>
          </React.Fragment>
        )}
      </form>
    </Layout>
  );
}`);

// Add placeholder files for remaining pages to prevent build errors
['TargetSavings', 'TargetDetail', 'Rotations', 'TransactionHistory', 'AgentEarnings', 'AdminDashboard'].forEach(page => {
  writeFile('src/pages/' + page + '.jsx', `import Layout from '../components/Layout';
export default function ${page}() {
  return <Layout><div style={{padding: 24}}><h2>${page}</h2><p>Module ready for expansion.</p></div></Layout>;
}`);
});

// 4. Styles
const styles = {
  'global.css': `:root { --brand: #0a6e3a; --brand-dark: #064425; --accent: #f5a623; --bg: #f5f7f6; --surface: #ffffff; --text: #1a2e26; --muted: #6b7a74; --danger: #c0392b; --success: #27ae60; --radius: 12px; --shadow: 0 2px 12px rgba(0,0,0,0.06); }
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: 'Inter', system-ui, sans-serif; background: var(--bg); color: var(--text); line-height: 1.5; }
button { background: var(--brand); color: white; border: none; padding: 12px 20px; border-radius: var(--radius); font-weight: 600; cursor: pointer; font-size: 15px; transition: transform .1s, background .2s; }
button:hover { background: var(--brand-dark); }
button.outline { background: transparent; color: var(--brand); border: 2px solid var(--brand); }
.loading { text-align: center; padding: 40px; color: var(--muted); }
.alert { margin: 16px; padding: 12px; border-radius: 8px; font-weight: 600; }
.alert.error { background: #fdecea; color: var(--danger); }
.alert.success { background: #e8f8ef; color: var(--success); }`,

  'auth.css': `.auth-wrap { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; background: linear-gradient(135deg, var(--brand) 0%, var(--brand-dark) 100%); }
.auth-card { background: var(--surface); padding: 32px 24px; border-radius: 16px; width: 100%; max-width: 440px; box-shadow: 0 20px 60px rgba(0,0,0,.2); }
.auth-card h1 { color: var(--brand-dark); font-size: 24px; margin-bottom: 4px; }
.auth-card .sub { color: var(--muted); margin-bottom: 24px; font-size: 14px; }
.auth-card form { display: flex; flex-direction: column; gap: 14px; }
.auth-card label { display: flex; flex-direction: column; gap: 6px; font-size: 13px; font-weight: 600; color: var(--muted); }
.auth-card input, .auth-card select { padding: 12px; border: 1.5px solid #dde3e0; border-radius: 8px; font-size: 15px; color: var(--text); }
.auth-card input:focus { outline: none; border-color: var(--brand); }
.brand-badge { width: 64px; height: 64px; border-radius: 16px; background: linear-gradient(135deg, var(--brand), var(--brand-dark)); color: white; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 20px; margin: 0 auto 20px; }
.auth-link { text-align: center; margin-top: 20px; font-size: 14px; color: var(--muted); }`,

  'dashboard.css': `.dash-header { padding: 24px; background: var(--brand); color: white; }
.dash-header h1 { font-size: 22px; }
.tagline { opacity: .8; font-size: 13px; }
.balance-hero { margin: 16px; padding: 24px; background: var(--surface); border-radius: var(--radius); box-shadow: var(--shadow); }
.balance-hero span { color: var(--muted); font-size: 13px; }
.balance-hero h2 { font-size: 32px; margin: 4px 0 16px; color: var(--brand-dark); }
.quick-actions { display: flex; gap: 12px; }
.wallets-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 12px; padding: 0 16px; }
.quick-nav { display: flex; gap: 10px; padding: 24px 16px; flex-wrap: wrap; justify-content: center; }
.quick-nav a { background: var(--surface); padding: 14px 18px; border-radius: var(--radius); box-shadow: var(--shadow); font-weight: 600; }`,

  'cards.css': `.wallet-card { background: linear-gradient(135deg, var(--brand), var(--brand-dark)); color: white; padding: 18px; border-radius: var(--radius); box-shadow: var(--shadow); }
.wallet-card span { font-size: 12px; text-transform: uppercase; opacity: .8; }
.wallet-card h3 { font-size: 22px; margin: 6px 0 2px; }
.wallet-card small { opacity: .7; }`,

  'forms.css': `.card-form { background: var(--surface); margin: 16px; padding: 20px; border-radius: var(--radius); box-shadow: var(--shadow); display: flex; flex-direction: column; gap: 14px; }
.card-form label { display: flex; flex-direction: column; font-size: 13px; color: var(--muted); gap: 6px; font-weight: 600; }
.card-form input, .card-form select { padding: 12px; border: 1.5px solid #dde3e0; border-radius: 8px; font-size: 15px; color: var(--text); }
.card-form input:focus { outline: none; border-color: var(--brand); }
.profile-chip { background: #e8f8ef; color: var(--brand-dark); padding: 10px; border-radius: 8px; font-weight: 600; text-align: center; }`,

  'agent.css': `.agent-header { padding: 24px; background: linear-gradient(135deg, #0a6e3a, #0a4e29); color: white; }
.stats-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; padding: 16px; }
.stat-card { background: white; padding: 16px; border-radius: 12px; box-shadow: var(--shadow); border-left: 4px solid var(--brand); }
.stat-card small { color: var(--muted); font-size: 12px; text-transform: uppercase; }
.stat-card h3 { font-size: 22px; color: var(--brand-dark); margin: 4px 0; }
.stat-card.green { border-left-color: #27ae60; }
.stat-card.orange { border-left-color: #f39c12; }
.stat-card.blue { border-left-color: #2980b9; }
.stat-card.gold { border-left-color: #f5a623; }
.mini { margin-top: 8px; padding: 6px 12px; font-size: 12px; border-radius: 6px; background: var(--brand); }
.agent-actions { display: flex; gap: 12px; padding: 0 16px 16px; }
.agent-actions button { flex: 1; }
.modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; }
.modal { background: white; border-radius: 16px; padding: 24px; max-width: 400px; width: 100%; box-shadow: 0 20px 60px rgba(0,0,0,0.3); }
.modal h3 { margin-bottom: 12px; color: var(--brand-dark); }
.modal p { color: var(--muted); margin-bottom: 8px; }
.modal .subtle { font-size: 13px; }
.modal code { background: #f0f3f1; padding: 2px 6px; border-radius: 4px; font-size: 12px; }
.amount-display { background: linear-gradient(135deg, var(--brand), var(--brand-dark)); color: white; text-align: center; font-size: 28px; font-weight: 700; padding: 20px; border-radius: 12px; margin: 12px 0; }
.modal-actions { display: flex; gap: 10px; margin-top: 20px; }
.modal-actions button { flex: 1; }`,

  'nav.css': `.bottom-nav { position: fixed; bottom: 0; left: 0; right: 0; background: white; border-top: 1px solid #e5e9e7; display: flex; justify-content: space-around; padding: 8px 4px calc(8px + env(safe-area-inset-bottom)); box-shadow: 0 -4px 20px rgba(0,0,0,0.06); z-index: 100; max-width: 480px; margin: 0 auto; }
.nav-item { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 6px 4px; color: var(--muted); text-decoration: none; font-size: 11px; transition: color .2s; border-radius: 10px; }
.nav-item.active { color: var(--brand); }
.nav-item.active .nav-icon { background: rgba(10,110,58,0.08); transform: scale(1.05); }
.nav-icon { font-size: 22px; width: 40px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 10px; transition: all .2s; }
.nav-label { font-weight: 600; }`,

  'status.css': `.status-bar { padding: 8px 16px; font-size: 12px; font-weight: 600; display: flex; align-items: center; }
.status-bar.online { background: #e8f8ef; color: #27ae60; }
.status-bar.offline { background: #fef3c7; color: #b45309; }
.status-content { display: flex; align-items: center; gap: 8px; width: 100%; justify-content: center; flex-wrap: wrap; }
.dot { width: 8px; height: 8px; border-radius: 50%; background: currentColor; flex-shrink: 0; }
.status-bar.online .dot { animation: pulse 2s infinite; }
@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
.sync-btn { background: rgba(39,174,96,0.15); color: #27ae60; padding: 3px 10px; font-size: 11px; border-radius: 12px; margin-left: auto; }`,

  'qrcard.css': `.qrcard-wrap { padding: 24px 16px; }
.qrcard { background: linear-gradient(135deg, #0a6e3a 0%, #064425 60%, #0a4e29 100%); color: white; padding: 24px; border-radius: 18px; box-shadow: 0 12px 40px rgba(10, 110, 58, 0.3); position: relative; overflow: hidden; }
.qrcard.frozen { filter: grayscale(0.7) brightness(0.85); }
.qrcard-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.qrcard-top h2 { font-size: 18px; letter-spacing: 0.5px; }
.qrcard-top small { opacity: 0.8; font-size: 11px; }
.chip { width: 40px; height: 30px; border-radius: 6px; background: linear-gradient(135deg, #f5a623, #d4880f); }
.qrcard-qr { display: flex; justify-content: center; margin: 20px 0; }
.qrcard-info { text-align: center; margin-bottom: 16px; }
.qrcard-info strong { display: block; font-size: 18px; letter-spacing: 1px; }
.qrcard-info small { opacity: 0.75; font-size: 11px; }
.qrcard-info code { display: block; margin-top: 4px; font-size: 10px; opacity: 0.6; }
.qrcard-footer { display: flex; justify-content: space-between; align-items: center; font-size: 11px; opacity: 0.8; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.15); }
.frozen-badge { background: #3498db; padding: 2px 8px; border-radius: 10px; opacity: 1; }
.card-controls { display: flex; gap: 12px; padding: 16px 0; }
.card-controls button { flex: 1; }
@media print { body * { visibility: hidden; } #printable-card, #printable-card * { visibility: visible; } #printable-card { position: absolute; left: 0; top: 0; width: 85.6mm; height: 53.98mm; box-shadow: none; border: 1px solid #ddd; } .bottom-nav, .card-controls { display: none !important; } }`
};

for (const [file, content] of Object.entries(styles)) {
  writeFile('src/styles/' + file, content);
}

// 5. Edge Functions (Supabase)
writeFile('supabase/functions/verify-pin/index.ts', `import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { pin, qr_token } = await req.json();
    if (!/^\\d{4}$/.test(pin)) return new Response(JSON.stringify({ ok: false, error: "Invalid PIN format" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
    const { data: profile } = await supabase.from("profiles").select("id, pin_hash, card_frozen, failed_pin_attempts, full_name").eq("card_qr_token", qr_token).single();

    if (!profile) return new Response(JSON.stringify({ ok: false, error: "Card not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (profile.card_frozen) return new Response(JSON.stringify({ ok: false, error: "Card frozen" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if ((profile.failed_pin_attempts || 0) >= 3) return new Response(JSON.stringify({ ok: false, error: "Card locked" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const valid = await bcrypt.compare(pin, profile.pin_hash);
    if (!valid) {
      await supabase.from("profiles").update({ failed_pin_attempts: (profile.failed_pin_attempts || 0) + 1 }).eq("id", profile.id);
      return new Response(JSON.stringify({ ok: false, error: "Incorrect PIN" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (profile.failed_pin_attempts > 0) await supabase.from("profiles").update({ failed_pin_attempts: 0 }).eq("id", profile.id);

    return new Response(JSON.stringify({ ok: true, user_id: profile.id, full_name: profile.full_name }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});`);

console.log('\n🎉 Project generated successfully in: ./' + projectName);
console.log('\n👉 Next steps:');
console.log('   1. cd ' + projectName);
console.log('   2. copy .env.example .env  (and add your Supabase keys)');
console.log('   3. npm install');
console.log('   4. npm run dev');
console.log('\n⚠️  Don\'t forget to run the SQL schema in your Supabase SQL Editor!');