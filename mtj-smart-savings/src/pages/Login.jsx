import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../supabase';
import { Html5QrcodeScanner } from 'html5-qrcode';
import Layout from '../components/Layout';
import '../styles/forms.css';

export default function Login() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const scannerRef = useRef(null);

  useEffect(() => {
    if (showScanner) {
      const scanner = new Html5QrcodeScanner("qr-reader", { fps: 10, qrbox: { width: 250, height: 250 } });
      scanner.render(onScanSuccess, onScanFailure);
      scannerRef.current = scanner;
    }
    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(error => console.error("Failed to clear scanner", error));
      }
    };
  }, [showScanner]);

  async function onScanSuccess(decodedText) {
    try {
      const data = JSON.parse(decodedText);
      // Security check: QR must be less than 60 seconds old
      if (Date.now() - data.exp > 60000) {
        return alert('⚠️ QR Code expired. Please generate a new one.');
      }
      setPhone(data.phone);
      setPin(data.pin);
      setShowScanner(false);
      
      // Auto-submit after scanning
      setTimeout(() => {
        handleLoginDirect(data.phone, data.pin);
      }, 500);
    } catch (err) {
      alert('Invalid QR Code');
    }
  }

  function onScanFailure(error) {
    // console.warn(`Code scan error = ${error}`);
  }

  async function handleLogin(e) {
    e.preventDefault();
    handleLoginDirect(phone, pin);
  }

  async function handleLoginDirect(loginPhone, loginPin) {
    setLoading(true);
    setError('');
    try {
      const cleanPhone = loginPhone.replace(/\s/g, '');
      const hiddenEmail = `${cleanPhone}@mtj.app`;
      const hiddenPassword = loginPin + '_mtj_secret_salt';

      const { error } = await supabase.auth.signInWithPassword({
        email: hiddenEmail,
        password: hiddenPassword,
      });

      if (error) throw error;
      navigate('/dashboard'); 
    } catch (err) {
      setError('Invalid Phone Number or PIN.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Layout>
      <div className="auth-container">
        <div className="auth-header">
          <h1>MTJ Smart Savings</h1>
          <p>Welcome back! Please login to your account.</p>
        </div>

        {error && <div className="alert error">{error}</div>}

        {!showScanner ? (
          <>
            <form onSubmit={handleLogin} className="card-form">
              <label>
                Phone Number
                <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="e.g. 08012345678" required />
              </label>
              <label>
                4-Digit PIN
                <input type="password" inputMode="numeric" pattern="[0-9]*" maxLength={4} value={pin} onChange={e => setPin(e.target.value)} placeholder="****" required style={{ letterSpacing: '8px', fontSize: '20px', textAlign: 'center' }} />
              </label>
              <button type="submit" disabled={loading} style={{ marginTop: '10px' }}>
                {loading ? 'Logging in...' : 'Login'}
              </button>
            </form>

            <div style={{ textAlign: 'center', margin: '20px 0' }}>
              <p style={{ fontSize: '12px', color: 'var(--muted)' }}>— OR —</p>
              <button className="outline" onClick={() => setShowScanner(true)} style={{ width: '100%' }}>
                📷 Scan QR to Login
              </button>
            </div>
          </>
        ) : (
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <h3>Scan Member's Login QR</h3>
            <div id="qr-reader" style={{ width: '100%', maxWidth: '300px', margin: '0 auto' }}></div>
            <button className="outline" onClick={() => setShowScanner(false)} style={{ marginTop: '20px', width: '100%' }}>
              Cancel Scanner
            </button>
          </div>
        )}

        <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '14px' }}>
          Don't have an account? <Link to="/register" style={{ color: 'var(--brand)', fontWeight: 'bold' }}>Create one</Link>
        </p>
      </div>
    </Layout>
  );
}