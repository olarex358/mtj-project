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

  // Handle photo capture (converts to Base64 for the pilot)
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
      // 1. Generate a temporary email and password for the new member
      const tempEmail = `${formData.phone.replace(/\s/g, '')}@mtj.app`;
      const tempPassword = 'MTJ' + Math.floor(1000 + Math.random() * 9000); // e.g., MTJ4821

      // 2. Create Auth User
      const { data: authData, error: authErr } = await supabase.auth.signUp({
        email: tempEmail,
        password: tempPassword,
      });
      if (authErr) throw authErr;

      const newUserId = authData.user.id;

      // 3. Generate QR Token
      const qrToken = 'MTJ-' + Math.random().toString(36).substring(2, 10).toUpperCase();

      // 4. Create Profile
      const { error: profileErr } = await supabase.from('profiles').insert({
        id: newUserId,
        full_name: formData.fullName,
        phone: formData.phone,
        role: 'user',
        pin_hash: btoa('0000'), // Default PIN is 0000
        card_qr_token: qrToken,
        card_status: 'pending',
        trust_score: 50,
        referred_by_agent_id: user.id, // Links member to this agent!
        photo_url: photo,
      });
      if (profileErr) throw profileErr;

      // 5. Create 5 Wallets for the new member
      const walletTypes = ['daily', 'rotation', 'target', 'loan', 'rewards'];
      const { data: newWallets } = await supabase
        .from('wallets')
        .insert(walletTypes.map(t => ({ user_id: newUserId, type: t })))
        .select();

      const dailyWalletId = newWallets.find(w => w.type === 'daily').id;

      // 6. Get Agent's Rewards Wallet ID
      const { data: agentWallets } = await supabase
        .from('wallets')
        .select('id')
        .eq('user_id', user.id)
        .eq('type', 'rewards')
        .single();

      // 7. Execute the ₦400 Split (₦200 Agent, ₦200 MTJ)
      await recordRegistrationSplit(newUserId, user.id, dailyWalletId, agentWallets.id);

      // 8. Generate WhatsApp Deep Link for Receipt
      const message = `Welcome to MTJ Smart Savings! 🟢\n\nName: ${formData.fullName}\nCard Fee: ₦200\nFirst Contribution: ₦200\nTotal Paid: 400\n\nYour physical QR card is being prepared. Save Today, Secure Tomorrow!`;
      const waLink = `https://wa.me/${formData.phone.replace(/\s/g, '')}?text=${encodeURIComponent(message)}`;

      setSuccessMsg(`✅ Member registered! Default PIN: 0000`);
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