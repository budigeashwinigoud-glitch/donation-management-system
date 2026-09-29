import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import AppShell from './layouts/AppShell.jsx';
import LoginPage from './pages/LoginPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import DonorsPage from './pages/DonorsPage.jsx';
import CampaignsPage from './pages/CampaignsPage.jsx';
import DonationsPage from './pages/DonationsPage.jsx';
import BeneficiariesPage from './pages/BeneficiariesPage.jsx';
import AllocationsPage from './pages/AllocationsPage.jsx';
import ReportsPage from './pages/ReportsPage.jsx';

function ProtectedRoutes() {
  const { user } = useAuth();
  return user ? <Outlet /> : <Navigate to="/login" replace />;
}

function LoginRoute() {
  const { user } = useAuth();
  return user ? <Navigate to="/" replace /> : <LoginPage />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginRoute />} />
      <Route element={<ProtectedRoutes />}>
        <Route element={<AppShell />}>
          <Route index element={<DashboardPage />} />
          <Route path="donors" element={<DonorsPage />} />
          <Route path="campaigns" element={<CampaignsPage />} />
          <Route path="donations" element={<DonationsPage />} />
          <Route path="beneficiaries" element={<BeneficiariesPage />} />
          <Route path="allocations" element={<AllocationsPage />} />
          <Route path="reports" element={<ReportsPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}