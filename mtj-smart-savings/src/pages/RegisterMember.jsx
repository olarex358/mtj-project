import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';
import { recordRegistrationSplit } from '../lib/ledger';
import Layout from '../components/Layout';

export default function RegisterMember() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ 
    fullName: '', 
    phone: '',
    pin: '' // NEW: PIN field
  });
  const [photo, setPhoto] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [whatsappLink, setWhatsappLink] = useState('');

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
      
      // Validate PIN (must be 4 digits)
      if (!/^\d{4}$/.test(formData.pin)) {
        throw new Error('PIN must be exactly 4 digits');
      }

      // Create hidden email and password for Supabase
      const hiddenEmail = `${cleanPhone}@mtj.app`;
      const hiddenPassword = formData.pin + '_mtj_secret_salt';

      // 1. Create Auth User
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

      // 2. Generate QR Token
      const qrToken = 'MTJ-' + Math.random().toString(36).substring(2, 10).toUpperCase();

      // 3. Create Profile
      const { error: profileErr } = await supabase.from('profiles').insert({
        id: newUserId,
        full_name: formData.fullName,
        phone: cleanPhone,
        role: 'user',
        pin_hash: btoa(formData.pin), // Store 4-digit PIN hash
        card_qr_token: qrToken,
        card_status: 'pending',
        trust_score: 50,
        referred_by_agent_id: user.id,
        photo_url: photo,
      });
      if (profileErr) throw profileErr;

      // 4. Create 5 Wallets
      const walletTypes = ['daily', 'rotation', 'target', 'loan', 'rewards'];
      const { data: newWallets } = await supabase
        .from('wallets')
        .insert(walletTypes.map(t => ({ user_id: newUserId, type: t })))
        .select();

      const dailyWalletId = newWallets.find(w => w.type === 'daily').id;

      // 5. Get Agent's Rewards Wallet ID
      const { data: agentWallets } = await supabase
        .from('wallets')
        .select('id')
        .eq('user_id', user.id)
        .eq('type', 'rewards')
        .single();

      // 6. Execute the ₦400 Split
      await recordRegistrationSplit(newUserId, user.id, dailyWalletId, agentWallets.id);

      // 7. Generate WhatsApp Deep Link
      const message = `Welcome to MTJ Smart Savings! 🟢\n\nName: ${formData.fullName}\nYour Login Phone: ${cleanPhone}\nYour 4-Digit PIN: ${formData.pin}\n\nTotal Paid: 400. Your physical QR card is being prepared. Save Today, Secure Tomorrow!`;
      const waLink = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;

      setSuccessMsg(`✅ Member registered! PIN: ${formData.pin}`);
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
        <div style={{ padding: '24px', textAlign: 'center' }}>
          <h2 style={{ color: '#00B875', marginBottom: '16px' }}>Registration Successful!</h2>
          <p style={{ marginBottom: '20px', color: '#666' }}>{successMsg}</p>
          
          <div style={{ background: '#F4F6F8', padding: '16px', borderRadius: '12px', marginBottom: '20px' }}>
            <p style={{ margin: '8px 0', fontSize: '14px' }}>
              <strong>Login Phone:</strong> {formData.phone.replace(/\s/g, '')}
            </p>
            <p style={{ margin: '8px 0', fontSize: '14px' }}>
              <strong>PIN:</strong> <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#00B875', letterSpacing: '8px' }}>{formData.pin}</span>
            </p>
          </div>

          <a href={whatsappLink} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
            <button style={{ width: '100%', padding: '14px', background: '#25D366', color: 'white', border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: '700', cursor: 'pointer', marginBottom: '10px' }}>
              📲 Send WhatsApp Receipt
            </button>
          </a>
          
          <button 
            onClick={() => {
              setFormData({ fullName: '', phone: '', pin: '' });
              setPhoto(null);
              setSuccessMsg('');
              navigate('/agent');
            }} 
            style={{ width: '100%', padding: '14px', background: 'white', color: '#00B875', border: '2px solid #00B875', borderRadius: '12px', fontSize: '15px', fontWeight: '700', cursor: 'pointer' }}
          >
            ✅ Register Another Member
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div style={{ padding: '20px' }}>
        <h2 style={{ margin: '0 0 20px 0', color: '#111827', fontSize: '22px' }}>📝 Register New Member</h2>
        
        <div style={{ background: '#F0FDF4', border: '1px solid #86EFAC', padding: '14px', borderRadius: '12px', marginBottom: '20px' }}>
          <p style={{ margin: 0, fontSize: '13px', color: '#166534', fontWeight: '600' }}>
            💰 Collect <strong>₦400</strong> from member before submitting.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '600', color: '#374151' }}>
              Full Name
            </label>
            <input 
              value={formData.fullName} 
              onChange={e => setFormData({...formData, fullName: e.target.value})} 
              required 
              placeholder="e.g. Adebayo Johnson"
              style={{ width: '100%', padding: '12px', border: '1.5px solid #E5E7EB', borderRadius: '8px', fontSize: '15px', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '600', color: '#374151' }}>
              Phone Number
            </label>
            <input 
              value={formData.phone} 
              onChange={e => setFormData({...formData, phone: e.target.value})} 
              required 
              placeholder="e.g. 08012345678"
              type="tel"
              style={{ width: '100%', padding: '12px', border: '1.5px solid #E5E7EB', borderRadius: '8px', fontSize: '15px', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '600', color: '#374151' }}>
              Set 4-Digit PIN <span style={{ color: '#6B7280', fontWeight: '400' }}>(Member will use this to login)</span>
            </label>
            <input 
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={4}
              value={formData.pin} 
              onChange={e => setFormData({...formData, pin: e.target.value})} 
              required 
              placeholder="****"
              style={{ 
                width: '100%', 
                padding: '12px', 
                border: '1.5px solid #E5E7EB', 
                borderRadius: '8px', 
                fontSize: '24px', 
                letterSpacing: '12px',
                textAlign: 'center',
                boxSizing: 'border-box',
                fontWeight: '700',
                color: '#00B875'
              }}
            />
            <p style={{ margin: '6px 0 0 0', fontSize: '12px', color: '#6B7280' }}>
              Enter a 4-digit number the member can remember
            </p>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '600', color: '#374151' }}>
              Capture Member Photo (For ID Card)
            </label>
            <input 
              type="file" 
              accept="image/*" 
              capture="environment" 
              onChange={handlePhotoChange} 
              required 
              style={{ width: '100%', padding: '10px', border: '1.5px solid #E5E7EB', borderRadius: '8px', fontSize: '13px', boxSizing: 'border-box' }}
            />
            {photo && (
              <img src={photo} alt="Preview" style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '12px', marginTop: '10px', border: '2px solid #00B875' }} />
            )}
          </div>

          <button 
            type="submit" 
            disabled={loading} 
            style={{ 
              width: '100%', 
              padding: '16px', 
              background: '#00B875', 
              color: 'white', 
              border: 'none', 
              borderRadius: '12px', 
              fontSize: '16px', 
              fontWeight: '700', 
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1
            }}
          >
            {loading ? 'Registering...' : 'Complete Registration & Split ₦400'}
          </button>
        </form>
      </div>
    </Layout>
  );
}