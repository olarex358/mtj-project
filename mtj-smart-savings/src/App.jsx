import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import BottomNav from './components/BottomNav';

import Login from './pages/Login';
import Register from './pages/Register';
import UserDashboard from './pages/UserDashboard';
import AgentDashboard from './pages/AgentDashboard';
import AdminDashboard from './pages/AdminDashboard';
import TargetSavings from './pages/TargetSavings';
import Rotations from './pages/Rotations';
import TransactionHistory from './pages/TransactionHistory';
import AgentEarnings from './pages/AgentEarnings';
import Transaction from './pages/Transaction';
import QRCard from './components/QRCard';
import ProtectedRoute from './components/ProtectedRoute';
import RegisterMember from './pages/RegisterMember';
import FindAgent from './pages/FindAgent';
import AgentScanQR from './pages/AgentScanQR';

function RoleRouter() {
  const { profile, loading } = useAuth();
  if (loading) return <div style={{padding: '20px', textAlign: 'center'}}>Loading...</div>;
  if (!profile) return <Navigate to="/login" />;
  if (profile.role === 'admin') return <Navigate to="/admin" />;
  if (profile.role === 'agent') return <Navigate to="/agent" />;
  return <Navigate to="/dashboard" />;
}

// Wrapper to add BottomNav and padding for User/Agent pages
function AppLayout({ children }) {
  return (
    <>
      <div style={{ paddingBottom: '80px' }}>{children}</div>
      <BottomNav />
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/" element={<RoleRouter />} />
          
          {/* User Routes */}
          <Route path="/dashboard" element={<AppLayout><ProtectedRoute><UserDashboard /></ProtectedRoute></AppLayout>} />
          <Route path="/target" element={<AppLayout><ProtectedRoute><TargetSavings /></ProtectedRoute></AppLayout>} />
          <Route path="/rotations" element={<AppLayout><ProtectedRoute><Rotations /></ProtectedRoute></AppLayout>} />
          <Route path="/history" element={<AppLayout><ProtectedRoute><TransactionHistory /></ProtectedRoute></AppLayout>} />
          <Route path="/card" element={<AppLayout><ProtectedRoute><QRCard /></ProtectedRoute></AppLayout>} />
          <Route path="/find-agent" element={<AppLayout><ProtectedRoute><FindAgent /></ProtectedRoute></AppLayout>} />
          
          {/* Agent Routes */}
          <Route path="/agent" element={<AppLayout><ProtectedRoute allowAgent><AgentDashboard /></ProtectedRoute></AppLayout>} />
          <Route path="/earnings" element={<AppLayout><ProtectedRoute allowAgent><AgentEarnings /></ProtectedRoute></AppLayout>} />
          <Route path="/register-member" element={<AppLayout><ProtectedRoute allowAgent><RegisterMember /></ProtectedRoute></AppLayout>} />
          <Route path="/tx/:type" element={<AppLayout><ProtectedRoute allowAgent><Transaction /></ProtectedRoute></AppLayout>} />
          <Route path="/agent/scan-qr" element={<AppLayout><ProtectedRoute allowAgent><AgentScanQR /></ProtectedRoute></AppLayout>} />
          
          {/* Admin Routes (No BottomNav) */}
          <Route path="/admin" element={<ProtectedRoute allowAdmin><AdminDashboard /></ProtectedRoute>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}