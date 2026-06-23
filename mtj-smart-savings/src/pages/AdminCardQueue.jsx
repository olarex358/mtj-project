import { useEffect, useState } from 'react';
import { supabase } from '../supabase';

export default function AdminCardQueue() {
  const [queue, setQueue] = useState([]);

  useEffect(() => { load(); }, []);

  async function load() {
    const { data } = await supabase.from('profiles').select('full_name, phone, card_qr_token').eq('card_status', 'pending').order('created_at', { ascending: true });
    setQueue(data || []);
  }

  async function markPrinted(id) {
    await supabase.from('profiles').update({ card_status: 'printed' }).eq('id', id);
    load();
  }

  return (
    <div style={{ padding: '20px' }}>
      <h2 style={{ margin: '0 0 20px 0', color: '#111827', fontSize: '20px' }}>🖨️ Card Printing Queue</h2>
      {queue.length === 0 && <p style={{textAlign: 'center', color: '#6B7280', marginTop: '40px'}}>🎉 All cards are printed!</p>}
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {queue.map(m => (
          <div key={m.id} style={{ background: 'white', padding: '16px', borderRadius: '12px', border: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <strong style={{color: '#111827'}}>{m.full_name}</strong>
              <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#6B7280' }}>{m.phone} · {m.card_qr_token}</p>
            </div>
            <button onClick={() => markPrinted(m.id)} style={{ padding: '8px 16px', background: '#3B82F6', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>Mark Printed</button>
          </div>
        ))}
      </div>
    </div>
  );
}