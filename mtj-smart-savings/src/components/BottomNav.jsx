import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/nav.css';

export default function BottomNav() {
  const { profile } = useAuth();
  const location = useLocation();
  if (['/login', '/register'].some(p => location.pathname.startsWith(p))) return null;

  const userLinks = [
    { to: '/dashboard', icon: '🏠', label: 'Home' },
    { to: '/history', icon: '📜', label: 'History' },
    { to: '/tx/deposit', icon: '💵', label: 'Deposit' },
    { to: '/rotations', icon: '🔄', label: 'Rotation' },
    { to: '/card', icon: '💳', label: 'Card' },
  ];
  const agentLinks = [
    { to: '/agent', icon: '🏪', label: 'Dashboard' },
    { to: '/tx/deposit', icon: '💵', label: 'Collect' },
    { to: '/tx/withdraw', icon: '📤', label: 'Pay Out' },
    { to: '/earnings', icon: '💰', label: 'Earnings' },
  ];
  const links = profile && profile.role === 'agent' ? agentLinks : userLinks;

  return (
    <nav className="bottom-nav">
      {links.map(link => (
        <NavLink key={link.to} to={link.to} className={({ isActive }) => 'nav-item ' + (isActive ? 'active' : '')}>
          <span className="nav-icon">{link.icon}</span>
          <span className="nav-label">{link.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
