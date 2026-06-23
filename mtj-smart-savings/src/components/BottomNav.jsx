import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function BottomNav() {
  const { profile } = useAuth();
  const location = useLocation();

  // Hide on login/register
  if (['/login', '/register'].some(p => location.pathname.startsWith(p))) return null;

  const navStyle = {
    position: 'fixed', bottom: 0, left: 0, right: 0, background: 'white',
    borderTop: '1px solid #F3F4F6', display: 'flex', justifyContent: 'space-around',
    padding: '12px 0 24px 0', boxShadow: '0 -4px 20px rgba(0,0,0,0.05)', zIndex: 1000,
  };

  const linkStyle = (isActive) => ({
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
    textDecoration: 'none', color: isActive ? '#00B875' : '#9CA3AF',
    fontSize: '10px', fontWeight: isActive ? '700' : '500', flex: 1,
  });

  const userLinks = [
    { to: '/dashboard', icon: '🏠', label: 'Home' },
    { to: '/history', icon: '📜', label: 'History' },
    { to: '/rotations', icon: '🔄', label: 'Esusu' },
    { to: '/card', icon: '💳', label: 'Card' },
  ];

  const agentLinks = [
    { to: '/agent', icon: '🏪', label: 'Home' },
    { to: '/tx/deposit', icon: '💵', label: 'Collect' },
    { to: '/agent/scan-qr', icon: '📷', label: 'Scan' },
    { to: '/earnings', icon: '💰', label: 'Earnings' },
  ];

  const links = profile?.role === 'agent' ? agentLinks : userLinks;

  return (
    <nav style={navStyle}>
      {links.map(link => (
        <NavLink key={link.to} to={link.to} style={({ isActive }) => linkStyle(isActive)}>
          <span style={{ fontSize: '20px' }}>{link.icon}</span>
          <span>{link.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}