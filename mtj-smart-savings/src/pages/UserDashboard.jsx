import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';
import { getWalletBalance } from '../lib/ledger';
import Layout from '../components/Layout';
import WalletCard from '../components/WalletCard';
import { getTrustTier } from '../lib/trustScore';
import TransactionQR from '../components/TransactionQR';
import ChangePIN from '../components/ChangePIN';

export default function UserDashboard() {
  const { user, profile, refreshProfile } = useAuth();
  const [wallets, setWallets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showQRModal, setShowQRModal] = useState(null);
  const [showChangePIN, setShowChangePIN] = useState(false);
  const navigate = useNavigate();

  async function load() {
    if (!user) return;
    const { data: walletsData } = await supabase.from('wallets').select('*').eq('user_id', user.id);
    let rows = walletsData || [];
    if (rows.length === 0) {
      const types = ['daily', 'rotation', 'target', 'loan', 'rewards'];
      const { data: created } = await supabase.from('wallets').insert(types.map(t => ({ user_id: user.id, type: t }))).select();
      rows = created;
    }
    const withBalances = await Promise.all(rows.map(async w => ({ ...w, balance: await getWalletBalance(w.id) })));
    setWallets(withBalances);
    setLoading(false);
  }

  useEffect(() => { load(); }, [user]);

  const total = wallets.reduce((s, w) => s + Number(w.balance || 0), 0);
  const tier = getTrustTier(profile?.trust_score || 50);

  if (loading) return <Layout><div style={{padding: '40px', textAlign: 'center'}}>Loading...</div></Layout>;

  return (
    <Layout>
      {/* Green Header */}
      <div style={{ background: 'linear-gradient(135deg, #00B875 0%, #008F5D 100%)', padding: '24px 20px 40px', color: 'white', borderBottomLeftRadius: '24px', borderBottomRightRadius: '24px' }}>
        <h1 style={{ margin: 0, fontSize: '14px', fontWeight: '500', opacity: 0.9 }}>Total Savings</h1>
        <h2 style={{ margin: '8px 0 20px 0', fontSize: '32px', fontWeight: '700' }}>₦{total.toLocaleString('en-NG', { minimumFractionDigits: 2 })}</h2>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={() => setShowQRModal('deposit')} style={{ flex: 1, padding: '14px', background: 'white', color: '#00B875', border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: '700', cursor: 'pointer' }}>💵 Deposit</button>
          <button onClick={() => setShowQRModal('withdraw')} style={{ flex: 1, padding: '14px', background: 'rgba(255,255,255,0.2)', color: 'white', border: '1px solid rgba(255,255,255,0.4)', borderRadius: '12px', fontSize: '15px', fontWeight: '700', cursor: 'pointer' }}>📤 Withdraw</button>
        </div>
      </div>

      <div style={{ padding: '0 16px', marginTop: '-20px' }}>
        {/* Trust Score */}
        <div style={{ background: 'white', padding: '16px', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <small style={{ color: '#6B7280', textTransform: 'uppercase', fontSize: '11px', fontWeight: '600' }}>MTJ Trust Score</small>
            <h3 style={{ margin: '4px 0 0 0', color: '#111827', fontSize: '18px' }}>{tier.icon} {profile?.trust_score || 50}/100 <span style={{ fontSize: '13px', color: tier.color, marginLeft: '8px' }}>{tier.name}</span></h3>
          </div>
        </div>

        {/* Pending Card */}
        {profile?.card_status === 'pending' && (
          <div style={{ background: '#FFFBEB', borderLeft: '4px solid #F59E0B', padding: '14px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <div style={{ fontSize: '24px' }}>📦</div>
            <div><strong style={{ color: '#92400E', display: 'block', fontSize: '13px' }}>Your MTJ Card is Being Prepared</strong><small style={{ color: '#A16207', fontSize: '12px' }}>You can still save using your Digital Card!</small></div>
          </div>
        )}

        {/* Savings Lock */}
        <div style={{ background: 'white', padding: '16px', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div><strong style={{ color: '#111827', fontSize: '14px' }}>🔒 Lock Daily Savings</strong><p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#6B7280' }}>Prevent impulsive withdrawals.</p></div>
          <label style={{ position: 'relative', display: 'inline-block', width: '44px', height: '24px' }}>
            <input type="checkbox" checked={profile?.savings_locked || false} onChange={async (e) => {
              await supabase.from('profiles').update({ savings_locked: e.target.checked }).eq('id', user.id);
              await refreshProfile(); // Instant update, no reload!
            }} style={{ opacity: 0, width: 0, height: 0 }} />
            <span style={{ position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: profile?.savings_locked ? '#00B875' : '#ccc', transition: '.4s', borderRadius: '24px' }}></span>
            <span style={{ position: 'absolute', content: '""', height: '18px', width: '18px', left: profile?.savings_locked ? '22px' : '3px', bottom: '3px', backgroundColor: 'white', transition: '.4s', borderRadius: '50%' }}></span>
          </label>
        </div>

        {/* Change PIN */}
        <div style={{ background: 'white', padding: '16px', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', marginBottom: '16px' }}>
          <button onClick={() => setShowChangePIN(true)} style={{ width: '100%', padding: '14px', background: '#F4F6F8', color: '#111827', border: '1px solid #E5E7EB', borderRadius: '10px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', display: 'flex', justifyContent: 'space-between' }}><span> Change My PIN</span><span style={{ color: '#00B875' }}>→</span></button>
        </div>

        {/* Wallets */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '20px' }}>{wallets.map(w => <WalletCard key={w.id} wallet={w} />)}</div>

        {/* Quick Nav */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', overflowX: 'auto', paddingBottom: '10px' }}>
          <button onClick={() => navigate('/target')} style={{ flex: '0 0 auto', padding: '12px 20px', background: 'white', border: '1px solid #E5E7EB', borderRadius: '12px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>🎯 Target</button>
          <button onClick={() => navigate('/rotations')} style={{ flex: '0 0 auto', padding: '12px 20px', background: 'white', border: '1px solid #E5E7EB', borderRadius: '12px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>🔄 Esusu</button>
          <button onClick={() => navigate('/card')} style={{ flex: '0 0 auto', padding: '12px 20px', background: 'white', border: '1px solid #E5E7EB', borderRadius: '12px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>💳 My QR</button>
        </div>
      </div>

      {showQRModal && <TransactionQR type={showQRModal} onClose={() => setShowQRModal(null)} />}
      {showChangePIN && <ChangePIN onClose={() => setShowChangePIN(false)} />}
    </Layout>
  );
}