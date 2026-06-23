import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import OnlineStatus from '../components/OnlineStatus';

function today() { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString(); }

export default function AgentDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ collections: 0, withdrawals: 0, remittance: 0, earnings: 0 });

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

  return (
    <Layout>
      <OnlineStatus pendingCount={0} />
      
      {/* OPay-Style Header */}
      <div style={{ background: 'linear-gradient(135deg, #00B875 0%, #008F5D 100%)', padding: '24px 20px 40px', color: 'white', borderBottomLeftRadius: '24px', borderBottomRightRadius: '24px' }}>
        <h1 style={{ margin: 0, fontSize: '22px', fontWeight: '700' }}>Agent Portal</h1>
        <p style={{ margin: '4px 0 0 0', fontSize: '13px', opacity: 0.9 }}>MTJ Smart Agent · Live</p>
      </div>

      <div style={{ padding: '0 16px', marginTop: '-20px' }}>
        
        {/* Primary Action: Scan QR */}
        <button 
          onClick={() => navigate('/agent/scan-qr')}
          style={{ width: '100%', padding: '18px', background: '#F59E0B', color: 'white', border: 'none', borderRadius: '16px', fontSize: '18px', fontWeight: '700', cursor: 'pointer', boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
        >
          📷 Scan Member QR Code
        </button>

        {/* Stats Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '20px' }}>
          <div style={{ background: 'white', padding: '16px', borderRadius: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
            <small style={{ color: '#6B7280', fontSize: '12px', fontWeight: '600' }}>Today's Collections</small>
            <h3 style={{ margin: '8px 0 0 0', color: '#00B875', fontSize: '20px' }}>{stats.collections.toLocaleString()}</h3>
          </div>
          <div style={{ background: 'white', padding: '16px', borderRadius: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
            <small style={{ color: '#6B7280', fontSize: '12px', fontWeight: '600' }}>Today's Withdrawals</small>
            <h3 style={{ margin: '8px 0 0 0', color: '#EF4444', fontSize: '20px' }}>₦{stats.withdrawals.toLocaleString()}</h3>
          </div>
          <div style={{ background: 'white', padding: '16px', borderRadius: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
            <small style={{ color: '#6B7280', fontSize: '12px', fontWeight: '600' }}>Pending Remittance</small>
            <h3 style={{ margin: '8px 0 0 0', color: '#111827', fontSize: '20px' }}>₦{stats.remittance.toLocaleString()}</h3>
          </div>
          <div style={{ background: 'white', padding: '16px', borderRadius: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
            <small style={{ color: '#6B7280', fontSize: '12px', fontWeight: '600' }}>Lifetime Earnings</small>
            <h3 style={{ margin: '8px 0 0 0', color: '#F59E0B', fontSize: '20px' }}>₦{stats.earnings.toLocaleString()}</h3>
            <button 
              onClick={async () => {
                const amount = prompt("Enter amount to withdraw:");
                if (!amount) return;
                const phone = prompt("Enter your OPay Phone Number:");
                if (!phone) return;
                await supabase.from('agent_payouts').insert({ agent_id: user.id, amount: Number(amount), opay_phone: phone, status: 'pending' });
                alert("✅ Payout request sent to Admin!");
              }}
              style={{ marginTop: '8px', width: '100%', padding: '8px', background: '#F4F6F8', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: '600', color: '#00B875', cursor: 'pointer' }}
            >
              💸 Request Payout
            </button>
          </div>
        </div>

        {/* Secondary Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
          <button onClick={() => navigate('/register-member')} style={{ width: '100%', padding: '16px', background: 'white', color: '#111827', border: '1px solid #E5E7EB', borderRadius: '12px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', textAlign: 'left' }}>
            📝 Register New Member
          </button>
          <button onClick={() => navigate('/tx/deposit')} style={{ width: '100%', padding: '16px', background: 'white', color: '#111827', border: '1px solid #E5E7EB', borderRadius: '12px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', textAlign: 'left' }}>
            💵 Manual Deposit (Fallback)
          </button>
          <button onClick={() => navigate('/tx/withdraw')} style={{ width: '100%', padding: '16px', background: 'white', color: '#111827', border: '1px solid #E5E7EB', borderRadius: '12px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', textAlign: 'left' }}>
            📤 Manual Withdrawal (Fallback)
          </button>
        </div>
      </div>
    </Layout>
  );
}