import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';
import { getWalletBalance } from '../lib/ledger';
import Layout from '../components/Layout';
import '../styles/earnings.css';

export default function AgentEarnings() {
  const { user } = useAuth();
  const [wallet, setWallet] = useState(null);
  const [balance, setBalance] = useState(0);
  const [history, setHistory] = useState([]);

  useEffect(() => { load(); }, [user]);

  async function load() {
    const { data: w } = await supabase.from('wallets').select('*').eq('user_id', user.id).eq('type', 'rewards').single();
    setWallet(w);
    if (w) {
      setBalance(await getWalletBalance(w.id));
      const { data } = await supabase.from('ledger_entries').select('*').eq('wallet_id', w.id).order('created_at', { ascending: false }).limit(30);
      setHistory(data || []);
    }
  }

  return (
    <Layout>
      <header className="earnings-header">
        <h1>💰 My Earnings</h1>
        <p className="tagline">Commission from collections</p>
      </header>

      <section className="balance-hero">
        <span>Available Balance</span>
        <h2>₦{balance.toLocaleString('en-NG', { minimumFractionDigits: 2 })}</h2>
        <button onClick={() => alert('Payout request sent to admin!')}>📤 Request Payout</button>
        <p className="hint">Minimum ₦500 · Processed within 24h</p>
      </section>

      <section className="earnings-history">
        <h3>Recent Earnings</h3>
        {history.length === 0 ? <p className="empty">No earnings yet.</p> : (
          <ul>
            {history.map(h => (
              <li key={h.id}>
                <div>
                  <strong>{h.type.replace(/_/g, ' ')}</strong>
                  <small>{new Date(h.created_at).toLocaleDateString()}</small>
                </div>
                <span className={h.direction === 'credit' ? 'in' : 'out'}>
                  {h.direction === 'credit' ? '+' : '−'}₦{Number(h.amount).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </Layout>
  );
}