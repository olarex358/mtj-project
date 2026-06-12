import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import '../styles/history.css';

const TYPE_META = {
  deposit: { icon: '↓', label: 'Deposit', color: 'in' },
  withdrawal: { icon: '↑', label: 'Withdrawal', color: 'out' },
  rotation_contribution: { icon: '🔄', label: 'Rotation Payment', color: 'in' },
  early_access_fee: { icon: '⚠️', label: 'Early Access Fee', color: 'out' },
  agent_commission: { icon: '💰', label: 'Commission', color: 'in' },
};

export default function TransactionHistory() {
  const { user } = useAuth();
  const [entries, setEntries] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: wallets } = await supabase.from('wallets').select('id,type').eq('user_id', user.id);
      const walletIds = wallets?.map(w => w.id) || [];
      const walletTypes = Object.fromEntries(wallets?.map(w => [w.id, w.type]) || []);

      const { data } = await supabase
        .from('ledger_entries')
        .select('*')
        .in('wallet_id', walletIds)
        .order('created_at', { ascending: false })
        .limit(100);

      setEntries((data || []).map(e => ({ ...e, walletType: walletTypes[e.wallet_id] })));
      setLoading(false);
    }
    if (user) load();
  }, [user]);

  const filtered = useMemo(() => {
    if (filter === 'all') return entries;
    if (filter === 'in') return entries.filter(e => e.direction === 'credit');
    if (filter === 'out') return entries.filter(e => e.direction === 'debit');
    return entries;
  }, [entries, filter]);

  const grouped = useMemo(() => {
    const groups = {};
    filtered.forEach(e => {
      const day = new Date(e.created_at).toDateString();
      if (!groups[day]) groups[day] = [];
      groups[day].push(e);
    });
    return groups;
  }, [filtered]);

  if (loading) return <Layout><div className="loading">Loading history…</div></Layout>;

  return (
    <Layout>
      <header className="history-header">
        <h1>📜 History</h1>
        <p className="tagline">Every naira, accounted for.</p>
      </header>

      <div className="filter-bar">
        {['all', 'in', 'out'].map(f => (
          <button key={f} className={filter === f ? 'active' : ''} onClick={() => setFilter(f)}>
            {f === 'all' ? 'All' : f === 'in' ? 'Money In' : 'Money Out'}
          </button>
        ))}
      </div>

      {Object.keys(grouped).length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📭</div>
          <h3>No transactions yet</h3>
        </div>
      ) : (
        <div className="history-list">
          {Object.entries(grouped).map(([day, items]) => (
            <div key={day} className="day-group">
              <h4 className="day-label">{day}</h4>
              {items.map(e => {
                const meta = TYPE_META[e.type] || { icon: '•', label: e.type, color: 'neutral' };
                const isIn = e.direction === 'credit';
                return (
                  <div key={e.id} className={`history-item ${meta.color}`}>
                    <div className="tx-icon">{meta.icon}</div>
                    <div className="tx-body">
                      <strong>{meta.label}</strong>
                      <small>{e.walletType} · {new Date(e.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small>
                    </div>
                    <div className={`tx-amount ${isIn ? 'in' : 'out'}`}>
                      {isIn ? '+' : '−'}₦{Number(e.amount).toLocaleString()}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </Layout>
  );
}