import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, allowAgent, allowAdmin }) {
  const { user, profile, loading } = useAuth();
  
  if (loading) return <div className="loading">Loading…</div>;
  if (!user) return <Navigate to="/login" />;
  
  // If user is an admin, they can access admin routes
  if (profile?.role === 'admin' && !allowAdmin) {
    // If they are trying to access a normal user/agent route, send them to admin dashboard
    return <Navigate to="/admin" />;
  }
  
  // If user is an agent, they can access agent routes
  if (profile?.role === 'agent' && !allowAgent && !allowAdmin) {
    return <Navigate to="/agent" />;
  }
  
  return children;
}