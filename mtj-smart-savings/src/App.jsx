import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import UserDashboard from './pages/UserDashboard';
import AgentDashboard from './pages/AgentDashboard';
import AdminDashboard from './pages/AdminDashboard';
import TargetSavings from './pages/TargetSavings';
import TargetDetail from './pages/TargetDetail';
import Rotations from './pages/Rotations';
import TransactionHistory from './pages/TransactionHistory';
import AgentEarnings from './pages/AgentEarnings';
import Transaction from './pages/Transaction';
import QRCard from './components/QRCard';
import ProtectedRoute from './components/ProtectedRoute';
import RegisterMember from './pages/RegisterMember';
import AdminCardQueue from './pages/AdminCardQueue';
import AdminEsusuManager from './pages/AdminEsusuManager';
import AdminTreasury from './pages/AdminTreasury';
import AdminPayouts from './pages/AdminPayouts';
import AdminReconciliation from './pages/AdminReconciliation';
import CreateEsusuGroup from './pages/CreateEsusuGroup';
import AgentDailyRoute from './pages/AgentDailyRoute';
import KYCUpgrade from './pages/KYCUpgrade';

function RoleRouter() {
  const { profile, loading } = useAuth();
  if (loading) return <div className="loading">Loading…</div>;
  if (!profile) return <Navigate to="/login" />;
  if (profile.role === 'admin') return <Navigate to="/admin" />;
  if (profile.role === 'agent') return <Navigate to="/agent" />;
  return <Navigate to="/dashboard" />;
}

export default function App() {
  return (
    <AuthProvider>
      {/* Added future flags to silence React Router v7 warnings */}
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/" element={<RoleRouter />} />
          
          {/* User Routes */}
          <Route path="/dashboard" element={<ProtectedRoute><UserDashboard /></ProtectedRoute>} />
          <Route path="/target" element={<ProtectedRoute><TargetSavings /></ProtectedRoute>} />
          <Route path="/target/:id" element={<ProtectedRoute><TargetDetail /></ProtectedRoute>} />
          <Route path="/rotations" element={<ProtectedRoute><Rotations /></ProtectedRoute>} />
          <Route path="/history" element={<ProtectedRoute><TransactionHistory /></ProtectedRoute>} />
          <Route path="/card" element={<ProtectedRoute><QRCard /></ProtectedRoute>} />
          
          {/* Agent Routes */}
          <Route path="/agent" element={<ProtectedRoute allowAgent><AgentDashboard /></ProtectedRoute>} />
          <Route path="/earnings" element={<ProtectedRoute allowAgent><AgentEarnings /></ProtectedRoute>} />
                    {/* Agent Registration Route */}
          <Route path="/register-member" element={<ProtectedRoute allowAgent><RegisterMember /></ProtectedRoute>} />
          {/* Shared Transaction Route (Agent only for now) */}
          <Route path="/tx/:type" element={<ProtectedRoute allowAgent><Transaction /></ProtectedRoute>} />
          
          {/* Admin Routes */}
          <Route path="/admin" element={<ProtectedRoute allowAdmin><AdminDashboard /></ProtectedRoute>} />
                    {/* Admin Sub-Pages */}
                              {/* New Phase 2 Routes */}
          <Route path="/create-esusu" element={<ProtectedRoute allowAdmin allowAgent><CreateEsusuGroup /></ProtectedRoute>} />
          <Route path="/daily-route" element={<ProtectedRoute allowAgent><AgentDailyRoute /></ProtectedRoute>} />
          <Route path="/kyc-upgrade" element={<ProtectedRoute><KYCUpgrade /></ProtectedRoute>} />
                    <Route path="/create-esusu" element={<ProtectedRoute allowAdmin allowAgent><CreateEsusuGroup /></ProtectedRoute>} />
          <Route path="/admin/cards" element={<ProtectedRoute allowAdmin><AdminCardQueue /></ProtectedRoute>} />
          <Route path="/admin/esusu" element={<ProtectedRoute allowAdmin><AdminEsusuManager /></ProtectedRoute>} />
          <Route path="/admin/treasury" element={<ProtectedRoute allowAdmin><AdminTreasury /></ProtectedRoute>} />
          <Route path="/admin/payouts" element={<ProtectedRoute allowAdmin><AdminPayouts /></ProtectedRoute>} />
          <Route path="/admin/reconcile" element={<ProtectedRoute allowAdmin><AdminReconciliation /></ProtectedRoute>} />
        </Routes>
        
      </BrowserRouter>
    </AuthProvider>
  );
}