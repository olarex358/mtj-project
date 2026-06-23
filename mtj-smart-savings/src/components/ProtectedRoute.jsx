import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, allowAgent, allowAdmin }) {
  const { profile, loading } = useAuth();

  if (loading) return <div style={{padding: '40px', textAlign: 'center'}}>Loading...</div>;
  if (!profile) return <Navigate to="/login" />;

  if (allowAdmin && profile.role !== 'admin') return <Navigate to="/dashboard" />;
  if (allowAgent && profile.role !== 'agent' && profile.role !== 'admin') return <Navigate to="/dashboard" />;
  if (!allowAdmin && !allowAgent && profile.role !== 'user') return <Navigate to="/dashboard" />;

  return children;
}