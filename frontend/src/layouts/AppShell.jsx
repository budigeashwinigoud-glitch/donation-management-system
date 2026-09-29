import { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Activity, ArrowUpRight, CircleDollarSign, HandCoins, HeartHandshake, LayoutDashboard, LogOut, Menu, Users, WalletCards, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { titleCase } from '../utils/format.js';

const navigation = [
  { to: '/', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/donors', label: 'Donors', icon: Users },
  { to: '/campaigns', label: 'Campaigns', icon: HeartHandshake },
  { to: '/donations', label: 'Donations', icon: CircleDollarSign },
  { to: '/beneficiaries', label: 'Beneficiaries', icon: HandCoins },
  { to: '/allocations', label: 'Allocations', icon: WalletCards },
  { to: '/reports', label: 'Reports', icon: Activity },
];

const pageNames = {
  '/': 'Overview', '/donors': 'Donors', '/campaigns': 'Campaigns',
  '/donations': 'Donations', '/beneficiaries': 'Beneficiaries',
  '/allocations': 'Allocations', '/reports': 'Reports',
};

export default function AppShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const title = pageNames[location.pathname] || 'Overview';

  function signOut() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="app-frame">
      <aside className={`sidebar ${menuOpen ? 'sidebar-open' : ''}`}>
        <div className="brand-lockup"><span className="brand-mark"><HeartHandshake size={20} /></span><span>kindred<span className="brand-period">.</span><small>DONATION OFFICE</small></span></div>
        <div className="sidebar-label">WORKSPACE</div>
        <nav className="primary-nav" aria-label="Main navigation">
          {navigation.map(({ to, label, icon: Icon, end }) => <NavLink key={to} to={to} end={end} onClick={() => setMenuOpen(false)} className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`}><Icon size={18} strokeWidth={1.8} /><span>{label}</span>{label === 'Reports' && <ArrowUpRight className="nav-trailing" size={14} />}</NavLink>)}
        </nav>
        <div className="sidebar-bottom"><span className="connection-dot" /> Donation office</div>
      </aside>

      {menuOpen && <button aria-label="Close navigation" className="mobile-scrim" onClick={() => setMenuOpen(false)} />}
      <div className="workspace">
        <header className="topbar">
          <button className="mobile-menu icon-button" aria-label={menuOpen ? 'Close menu' : 'Open menu'} onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X size={19} /> : <Menu size={19} />}</button>
          <div className="breadcrumb"><span>Workspace</span><span className="breadcrumb-slash">/</span><strong>{title}</strong></div>
          <div className="topbar-user"><div className="user-copy"><strong>{user?.full_name}</strong><span>{titleCase(user?.role)}</span></div><div className="avatar">{user?.full_name?.trim()?.charAt(0)?.toUpperCase() || 'U'}</div><button className="icon-button signout-button" title="Sign out" aria-label="Sign out" onClick={signOut}><LogOut size={17} /></button></div>
        </header>
        <main className="main-content"><Outlet /></main>
        <footer className="page-footer"><span>Kindred Donation Office</span></footer>
      </div>
    </div>
  );
}