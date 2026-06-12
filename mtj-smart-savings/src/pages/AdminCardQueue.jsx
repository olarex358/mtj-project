import React, { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import Layout from '../components/Layout';
import '../styles/admin.css';

export default function AdminCardQueue() {
  const [pendingCards, setPendingCards] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadCards(); }, []);

  async function loadCards() {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('card_status', 'pending')
      .eq('role', 'user')
      .order('created_at', { ascending: true });
    setPendingCards(data || []);
    setLoading(false);
  }

  async function markAsPrinted(memberId) {
    await supabase.from('profiles').update({ card_status: 'printed' }).eq('id', memberId);
    loadCards();
  }

  function printCard(member) {
    // Opens a new window with just the card for printing
    const printWindow = window.open('', '', 'width=400,height=250');
    printWindow.document.write(`
      <html>
        <head>
          <title>MTJ Card - ${member.full_name}</title>
          <style>
            body { font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #f0f0f0; }
            .card { width: 350px; height: 220px; background: linear-gradient(135deg, #0a6e3a, #064425); color: white; border-radius: 15px; padding: 20px; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; box-shadow: 0 10px 20px rgba(0,0,0,0.2); }
            .header { display: flex; justify-content: space-between; align-items: center; }
            .header h2 { margin: 0; font-size: 18px; }
            .header small { opacity: 0.8; font-size: 10px; }
            .body { display: flex; gap: 15px; align-items: center; }
            .photo { width: 70px; height: 70px; border-radius: 50%; background: #fff; object-fit: cover; border: 2px solid #f5a623; }
            .info h3 { margin: 0 0 5px 0; font-size: 16px; }
            .info p { margin: 2px 0; font-size: 12px; opacity: 0.9; }
            .footer { text-align: center; font-size: 10px; opacity: 0.7; border-top: 1px solid rgba(255,255,255,0.2); padding-top: 8px; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="header">
              <div><h2>MTJ Smart Savings</h2><small>Official Member ID</small></div>
            </div>
            <div class="body">
              ${member.photo_url ? `<img src="${member.photo_url}" class="photo" />` : '<div class="photo"></div>'}
              <div class="info">
                <h3>${member.full_name}</h3>
                <p>📱 ${member.phone}</p>
                <p> ${member.card_qr_token}</p>
              </div>
            </div>
            <div class="footer">Save Today. Secure Tomorrow. | Support: 0800-MTJ-SAVE</div>
          </div>
          <script>window.onload = () => window.print();</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }

  if (loading) return <Layout><div className="loading">Loading Queue...</div></Layout>;

  return (
    <div className="view-section">
      <h2>🖨️ Card Printing Queue</h2>
      <p style={{color: 'var(--muted)', marginBottom: '20px'}}>Members waiting for their physical photo ID cards.</p>
      
      {pendingCards.length === 0 ? (
        <p>🎉 No pending cards! All members have received their IDs.</p>
      ) : (
        <div style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
          {pendingCards.map(member => (
            <div key={member.id} style={{background: '#f9f9f9', padding: '16px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #eee'}}>
              <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
                {member.photo_url && <img src={member.photo_url} alt="Member" style={{width: '50px', height: '50px', borderRadius: '50%', objectFit: 'cover'}} />}
                <div>
                  <strong style={{display: 'block'}}>{member.full_name}</strong>
                  <small style={{color: 'var(--muted)'}}>{member.phone} · {member.card_qr_token}</small>
                </div>
              </div>
              <div style={{display: 'flex', gap: '8px'}}>
                <button onClick={() => printCard(member)} style={{padding: '8px 12px', fontSize: '12px'}}>🖨️ Print</button>
                <button className="outline" onClick={() => markAsPrinted(member.id)} style={{padding: '8px 12px', fontSize: '12px'}}>✅ Mark Printed</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}