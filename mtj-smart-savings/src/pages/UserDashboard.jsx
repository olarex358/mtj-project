import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';
import { getWalletBalance } from '../lib/ledger';
import Layout from '../components/Layout';
import WalletCard from '../components/WalletCard';
import '../styles/dashboard.css';
import { calculateTrustScore, getTrustTier } from '../lib/trustScore';

export default function UserDashboard() {
  const { user, profile } = useAuth();
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

            {/* Login QR Section */}
      <section style={{ padding: '0 16px 16px' }}>
        <div style={{ background: 'white', padding: '16px', borderRadius: '12px', boxShadow: 'var(--shadow)', textAlign: 'center' }}>
          <h3 style={{ margin: '0 0 10px 0', color: 'var(--brand-dark)' }}>Quick Login QR</h3>
          <p style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '15px' }}>
            Show this to an agent to log in without typing your PIN.
          </p>
          <button 
            onClick={() => {
              const qrData = JSON.stringify({
                phone: profile.phone,
                pin: atob(profile.pin_hash), // Decode the PIN
                exp: Date.now() // Expiration timestamp
              });
              alert(`Your Login QR Data:\n${qrData}\n\n(Note: In the final app, this will display as a visual QR code using qrcode.react)`);
              // We will add the visual QR component in the next step if you like this flow!
            }}
            style={{ background: 'var(--brand)', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 'bold' }}
          >
            📱 Generate Login QR
          </button>
        </div>
      </section>
            {/* Trust Score Card */}
      <section style={{ padding: '0 16px 16px' }}>
        <div style={{ background: 'white', padding: '16px', borderRadius: '12px', boxShadow: 'var(--shadow)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <small style={{ color: 'var(--muted)', textTransform: 'uppercase', fontSize: '11px' }}>MTJ Trust Score</small>
            <h3 style={{ margin: '4px 0', color: 'var(--brand-dark)' }}>
              {getTrustTier(profile.trust_score || 50).icon} {profile.trust_score || 50}/100 
              <span style={{ fontSize: '14px', color: getTrustTier(profile.trust_score || 50).color, marginLeft: '8px' }}>
                {getTrustTier(profile.trust_score || 50).name}
              </span>
            </h3>
          </div>
          <button 
            className="outline" 
            style={{ padding: '6px 12px', fontSize: '12px' }}
            onClick={async () => {
              const newScore = await calculateTrustScore(user.id);
              alert(`Score recalculated: ${newScore}`);
              window.location.reload();
            }}
          >
            🔄 Refresh
          </button>
        </div>
      </section>

            {/* Pending Card Banner */}
      {profile.card_status === 'pending' && (
        <section style={{ padding: '0 16px 16px' }}>
          <div style={{ background: '#fff8e1', borderLeft: '4px solid #f5a623', padding: '16px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ fontSize: '24px' }}>📦</div>
            <div>
              <strong style={{ color: '#b7791f', display: 'block', fontSize: '14px' }}>Your MTJ Card is Being Prepared</strong>
              <small style={{ color: '#7a5a00', fontSize: '12px' }}>
                Your physical photo ID is in the printing queue. You can still save using your Digital Card in the app!
              </small>
            </div>
          </div>
        </section>
      )}
            {/* Savings Lock Toggle */}
      <section style={{padding: '0 16px 16px'}}>
        <div style={{background: 'white', padding: '16px', borderRadius: '12px', boxShadow: 'var(--shadow)', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
          <div>
            <strong>🔒 Lock Daily Savings</strong>
            <p style={{margin: 0, fontSize: '12px', color: 'var(--muted)'}}>Prevent impulsive withdrawals.</p>
          </div>
          <label className="switch">
            <input type="checkbox" checked={profile?.savings_locked || false} onChange={async (e) => {
              await supabase.from('profiles').update({ savings_locked: e.target.checked }).eq('id', user.id);
              alert(e.target.checked ? 'Savings Locked!' : 'Savings Unlocked');
              window.location.reload();
            }} />
            <span className="slider round"></span>
          </label>
        </div>
      </section>

      {/* Referral Section */}
      <section style={{padding: '0 16px 16px'}}>
        <div style={{background: 'linear-gradient(135deg, #f5a623, #b7791f)', color: 'white', padding: '16px', borderRadius: '12px'}}>
          <h3 style={{margin: '0 0 8px 0'}}>Invite Friends & Earn Trust Points</h3>
          <p style={{margin: '0 0 12px 0', fontSize: '13px'}}>Your Code: <strong>{profile?.referral_code || 'Loading...'}</strong></p>
          <button onClick={() => navigator.clipboard.writeText(`Join MTJ Smart Savings using my code ${profile?.referral_code}!`)} style={{background: 'white', color: '#b7791f', border: 'none', padding: '8px 16px', borderRadius: '20px', fontWeight: 'bold'}}>
            📋 Copy Code
          </button>
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
}
