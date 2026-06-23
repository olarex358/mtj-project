import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '../context/AuthContext';
import Layout from './Layout';

export default function QRCard() {
  const { profile } = useAuth();

  return (
    <Layout>
      <div style={{ padding: '24px 20px', textAlign: 'center' }}>
        <h1 style={{ margin: '0 0 8px 0', color: '#111827', fontSize: '22px' }}>💳 My Digital Card</h1>
        <p style={{ color: '#6B7280', fontSize: '14px', marginBottom: '30px' }}>Show this to any MTJ Agent</p>
        
        <div style={{ background: 'white', padding: '24px', borderRadius: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', maxWidth: '320px', margin: '0 auto' }}>
          <div style={{ background: '#F4F6F8', padding: '16px', borderRadius: '12px', marginBottom: '20px', display: 'inline-block' }}>
            <QRCodeSVG value={profile?.card_qr_token || ''} size={180} level="H" includeMargin={true} />
          </div>
          
          <h2 style={{ margin: '0 0 4px 0', color: '#111827', fontSize: '18px' }}>{profile?.full_name}</h2>
          <p style={{ margin: '0 0 16px 0', color: '#6B7280', fontSize: '14px' }}>{profile?.phone}</p>
          
          <div style={{ background: '#F0FDF4', color: '#15803D', padding: '8px', borderRadius: '8px', fontSize: '12px', fontWeight: '600' }}>
            ID: {profile?.card_qr_token}
          </div>
        </div>
      </div>
    </Layout>
  );
}