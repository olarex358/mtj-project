import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';
import { recordEntry, getWalletBalance } from '../lib/ledger';
import Layout from '../components/Layout';
import '../styles/target.css';

export default function TargetDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [goal, setGoal] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [balance, setBalance] = useState(0);
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { load(); }, [id, user]);

  async function load() {
    const { data: g } = await supabase.from('target_savings').select('*').eq('id', id).eq('user_id', user.id).single();
    setGoal(g);
    if (g) {
      const { data: w } = await supabase.from('wallets').select('*').eq('target_id', g.id).single();
      setWallet(w);
      if (w) setBalance(await getWalletBalance(w.id));
    }
  }

  if (!goal) return <Layout><div className="loading">Loading…</div></Layout>;

  const pct = Math.min(100, (balance / goal.goal_amount) * 100);
  const maturityDate = new Date(goal.start_date);
  maturityDate.setMonth(maturityDate.getMonth() + (goal.duration_months || 0));
  const isMatured = new Date() >= maturityDate;
  const daysLeft = Math.max(0, Math.ceil((maturityDate - new Date()) / 86400000));
  const earlyFeePct = isMatured ? 0 : 5; // 5% penalty if early

  async function contribute(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await recordEntry({
        walletId: wallet.id, userId: user.id,
        type: 'deposit', amount: Number(amount), direction: 'credit',
        note: `Target: ${goal.title}`,
      });
      setAmount('');
      setBalance(await getWalletBalance(wallet.id));
      alert('✅ Contribution added!');
    } catch (err) { alert(err.message); }
    finally { setBusy(false); }
  }

  async function withdraw() {
    if (balance <= 0) return;
    const fee = balance * (earlyFeePct / 100);
    const net = balance - fee;
    const warn = earlyFeePct > 0
      ? `Early access fee: ${earlyFeePct}% (₦${fee.toFixed(0)}). You'll receive ₦${net.toFixed(0)}.`
      : 'Full amount will be withdrawn (goal matured).';

    if (!confirm(`Withdraw from "${goal.title}"?\n\n${warn}\n\nContinue?`)) return;

    setBusy(true);
    try {
      if (earlyFeePct > 0) {
        await recordEntry({ walletId: wallet.id, userId: user.id, type: 'early_access_fee', amount: fee, direction: 'debit', note: 'Early withdrawal fee' });
      }
      await recordEntry({ walletId: wallet.id, userId: user.id, type: 'withdrawal', amount: net, direction: 'debit', note: 'Target withdrawal' });
      setBalance(await getWalletBalance(wallet.id));
      alert('✅ Withdrawn successfully!');
    } catch (err) { alert(err.message); }
    finally { setBusy(false); }
  }

  return (
    <Layout>
      <header className="target-header" style={{ background: `linear-gradient(135deg, var(--brand), var(--brand-dark))`, color: 'white' }}>
        <button className="back-btn" onClick={() => navigate(-1)}>← Back</button>
        <h1>🎯 {goal.title}</h1>
        <p className="tagline">{isMatured ? '🎉 Goal matured!' : `${daysLeft} days to go`}</p>
      </header>

      <section className="target-progress-card">
        <div className="progress-stats">
          <div><small>Saved</small><h2>₦{balance.toLocaleString()}</h2></div>
          <div className="right"><small>Target</small><h3>₦{Number(goal.goal_amount).toLocaleString()}</h3></div>
        </div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${pct}%` }}><span>{pct.toFixed(0)}%</span></div>
        </div>
        {earlyFeePct > 0 && <div className="fee-notice">⚠️ Early withdrawal fee: <strong>{earlyFeePct}%</strong></div>}
      </section>

      <form onSubmit={contribute} className="card-form">
        <label>Add to this goal (₦)
          <input type="number" value={amount} onChange={e => setAmount(e.target.value)} min="1" required placeholder="e.g. 5000" />
        </label>
        <button type="submit" disabled={busy}>{busy ? 'Saving…' : '💰 Contribute'}</button>
      </form>

      <section style={{padding: '0 16px 24px'}}>
        <button className="outline" style={{width: '100%'}} onClick={withdraw} disabled={busy || balance <= 0}>
          📤 Withdraw {earlyFeePct > 0 ? `(−${earlyFeePct}% fee)` : '(No fee)'}
        </button>
      </section>
    </Layout>
  );
}