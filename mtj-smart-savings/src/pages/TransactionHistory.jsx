import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';

export default function TransactionHistory() {
  const { user } = useAuth();
  const [txns, setTxns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('ledger_entries').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(50);
      setTxns(data || []);
      setLoading(false);
    }
    load();
  }, [user]);

  return (
    <Layout>
      <div style={{ padding: '24px 20px' }}>
        <h1 style={{ margin: '0 0 20px 0', color: '#111827', fontSize: '22px' }}>📜 Transaction History</h1>
        {loading ? <p style={{textAlign: 'center', color: '#6B7280'}}>Loading...</p> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {txns.length === 0 && <p style={{textAlign: 'center', color: '#6B7280', marginTop: '40px'}}>No transactions yet.</p>}
            {txns.map(t => (
              <div key={t.id} style={{ background: 'white', padding: '16px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: '600', color: '#111827', fontSize: '14px', textTransform: 'capitalize' }}>{t.type.replace('_', ' ')}</div>
                  <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>{new Date(t.created_at).toLocaleDateString()} · {new Date(t.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                </div>
                <div style={{ fontWeight: '700', fontSize: '15px', color: t.direction === 'credit' ? '#00B875' : '#EF4444' }}>
                  {t.direction === 'credit' ? '+' : '-'}₦{Number(t.amount).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}