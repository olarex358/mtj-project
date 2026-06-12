import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';
import '../styles/qrcard.css';

export default function QRCard() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);

  useEffect(() => { load(); }, [user]);
  async function load() {
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    setProfile(data);
  }
  async function freezeToggle() {
    const next = !profile.card_frozen;
    await supabase.from('profiles').update({ card_frozen: next }).eq('id', user.id);
    setProfile({ ...profile, card_frozen: next });
  }
  function print() { window.print(); }
  if (!profile) return null;

  return (
    <div className="qrcard-wrap">
      <div className={'qrcard ' + (profile.card_frozen ? 'frozen' : '')} id="printable-card">
        <div className="qrcard-top">
          <div><h2>MTJ Smart Savings</h2><small>Member Card</small></div>
          <div className="chip"></div>
        </div>
        <div className="qrcard-qr">
          <QRCodeSVG value={profile.card_qr_token} size={140} level="H" bgColor="#ffffff" fgColor="#064425" />
        </div>
        <div className="qrcard-info">
          <strong>{profile.full_name}</strong>
          <small>{profile.phone}</small>
          <code>{profile.card_qr_token}</code>
        </div>
        <div className="qrcard-footer">
          <span>Save Today · Secure Tomorrow</span>
          {profile.card_frozen && <span className="frozen-badge">❄ FROZEN</span>}
        </div>
      </div>
      <div className="card-controls">
        <button onClick={print}>🖨 Print Card</button>
        <button onClick={freezeToggle} className="outline">{profile.card_frozen ? '🔓 Unfreeze' : '❄ Freeze'}</button>
      </div>
    </div>
  );
}
