import { useEffect, useState } from 'react';
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
                <div className="stat-card gold">
          <small>Lifetime Earnings</small>
          <h3>₦{stats.earnings.toLocaleString()}</h3>
          <button 
            onClick={async () => {
              const amount = prompt("Enter amount to withdraw:");
              if (!amount) return;
              const phone = prompt("Enter your OPay Phone Number:");
              if (!phone) return;
              
              await supabase.from('agent_payouts').insert({
                agent_id: user.id,
                amount: Number(amount),
                opay_phone: phone,
                status: 'pending'
              });
              alert("✅ Payout request sent to Admin!");
            }}
            className="mini"
            style={{marginTop: '8px'}}
          >
            💸 Request Payout
          </button>
        </div>
      </section>
            <section className="agent-actions">
        <button onClick={() => navigate('/register-member')} style={{background: '#f5a623'}}>📝 Register New Member</button>
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
}
