import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';
import { recordRegistrationSplit } from '../lib/ledger';
import Layout from '../components/Layout';
import '../styles/forms.css';

export default function RegisterMember() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ fullName: '', phone: '' });
  const [photo, setPhoto] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [whatsappLink, setWhatsappLink] = useState('');
  const [newPin, setNewPin] = useState('');

  // Handle photo capture
  function handlePhotoChange(e) {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setPhoto(reader.result);
      reader.readAsDataURL(file);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);

    try {
      const cleanPhone = formData.phone.replace(/\s/g, '');
      
      // 1. Generate a random 4-digit PIN for the new member
      const generatedPin = Math.floor(1000 + Math.random() * 9000).toString();
      setNewPin(generatedPin);

      // 2. Create the "Hidden Email" and "Hidden Password" for Supabase
      const hiddenEmail = `${cleanPhone}@mtj.app`;
      const hiddenPassword = generatedPin + '_mtj_secret_salt'; // Supabase needs 6+ chars

      // 3. Create Auth User
      const { data: authData, error: authErr } = await supabase.auth.signUp({
        email: hiddenEmail,
        password: hiddenPassword,
        options: {
          data: {
            full_name: formData.fullName,
            phone: cleanPhone
          }
        }
      });
      if (authErr) throw authErr;

      const newUserId = authData.user.id;

      // 4. Generate QR Token
      const qrToken = 'MTJ-' + Math.random().toString(36).substring(2, 10).toUpperCase();

      // 5. Create Profile
      const { error: profileErr } = await supabase.from('profiles').insert({
        id: newUserId,
        full_name: formData.fullName,
        phone: cleanPhone,
        role: 'user',
        pin_hash: btoa(generatedPin), // Store 4-digit PIN hash
        card_qr_token: qrToken,
        card_status: 'pending',
        trust_score: 50,
        referred_by_agent_id: user.id,
        photo_url: photo,
      });
      if (profileErr) throw profileErr;

      // 6. Create 5 Wallets
      const walletTypes = ['daily', 'rotation', 'target', 'loan', 'rewards'];
      const { data: newWallets } = await supabase
        .from('wallets')
        .insert(walletTypes.map(t => ({ user_id: newUserId, type: t })))
        .select();

      const dailyWalletId = newWallets.find(w => w.type === 'daily').id;

      // 7. Get Agent's Rewards Wallet ID
      const { data: agentWallets } = await supabase
        .from('wallets')
        .select('id')
        .eq('user_id', user.id)
        .eq('type', 'rewards')
        .single();

      // 8. Execute the 400 Split
      await recordRegistrationSplit(newUserId, user.id, dailyWalletId, agentWallets.id);

      // 9. Generate WhatsApp Deep Link
      const message = `Welcome to MTJ Smart Savings! 🟢\n\nName: ${formData.fullName}\nYour Login Phone: ${cleanPhone}\nYour 4-Digit PIN: ${generatedPin}\n\nTotal Paid: 400. Your physical QR card is being prepared. Save Today, Secure Tomorrow!`;
      const waLink = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;

      setSuccessMsg(`✅ Member registered! Default PIN: ${generatedPin}`);
      setWhatsappLink(waLink);
      
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  if (successMsg) {
    return (
      <Layout>
        <div className="card-form" style={{textAlign: 'center'}}>
          <h2 style={{color: 'var(--brand-dark)'}}>Registration Successful!</h2>
          <p>{successMsg}</p>
          <a href={whatsappLink} target="_blank" rel="noopener noreferrer">
            <button style={{width: '100%', marginTop: '16px'}}>📲 Send WhatsApp Receipt</button>
          </a>
          <button className="outline" style={{width: '100%', marginTop: '10px'}} onClick={() => navigate('/agent')}>
            Back to Dashboard
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <h2 style={{ padding: '24px 16px 8px', color: 'var(--brand-dark)' }}>📝 Register New Member</h2>
      
      <form onSubmit={handleSubmit} className="card-form">
        <div style={{background: '#e8f8ef', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px', color: '#064425'}}>
          💰 Collect <strong>₦400</strong> from member before submitting.
        </div>

        <label>
          Full Name
          <input 
            value={formData.fullName} 
            onChange={e => setFormData({...formData, fullName: e.target.value})} 
            required 
            placeholder="e.g. Adebayo Johnson"
          />
        </label>

        <label>
          Phone Number
          <input 
            value={formData.phone} 
            onChange={e => setFormData({...formData, phone: e.target.value})} 
            required 
            placeholder="e.g. 08012345678"
          />
        </label>

        <label>
          Capture Member Photo (For ID Card)
          <input 
            type="file" 
            accept="image/*" 
            capture="environment" 
            onChange={handlePhotoChange} 
            required 
            style={{padding: '8px'}}
          />
          {photo && <img src={photo} alt="Preview" style={{width: '80px', height: '80px', objectFit: 'cover', borderRadius: '8px', marginTop: '8px'}} />}
        </label>

        <button type="submit" disabled={loading} style={{marginTop: '10px'}}>
          {loading ? 'Registering...' : 'Complete Registration & Split ₦400'}
        </button>
      </form>
    </Layout>
  );
}