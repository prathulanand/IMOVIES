import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Film,
  Building,
  Monitor,
  CalendarDays,
  Ticket,
  ScanLine,
  CreditCard,
  Users,
  Tag,
  BarChart3,
  History,
  Settings,
  MessageSquare,
} from 'lucide-react';

export const ADMIN_NAV_ITEMS = [
  { label: 'Dashboard', path: '/admin', icon: LayoutDashboard },
  { label: 'Movies', path: '/admin/movies', icon: Film },
  { label: 'Theatres', path: '/admin/theatres', icon: Building },
  { label: 'Screens & Layouts', path: '/admin/screens', icon: Monitor },
  { label: 'Shows', path: '/admin/shows', icon: CalendarDays },
  { label: 'Bookings', path: '/admin/bookings', icon: Ticket },
  { label: 'Verify Ticket', path: '/admin/verify-ticket', icon: ScanLine },
  { label: 'Payments', path: '/admin/payments', icon: CreditCard },
  { label: 'Users', path: '/admin/users', icon: Users },
  { label: 'Reviews', path: '/admin/reviews', icon: MessageSquare },
  { label: 'Coupons', path: '/admin/coupons', icon: Tag },
  { label: 'Reports', path: '/admin/reports', icon: BarChart3 },
  { label: 'Audit Logs', path: '/admin/audit-logs', icon: History },
  { label: 'Settings', path: '/admin/settings', icon: Settings },
];

export default function AdminSidebar({ onItemClick, isDrawer = false }) {
  return (
    <aside
      className={`p-3 d-flex flex-column h-100 ${
        isDrawer ? 'bg-transparent' : 'im-glass rounded-4'
      }`}
      style={!isDrawer ? { minWidth: '220px', border: '1px solid var(--border-subtle)' } : {}}
    >
      <div className="small fw-bold text-uppercase text-secondary px-3 mb-3 d-flex align-items-center justify-content-between" style={{ letterSpacing: '1px' }}>
        <span>Administration</span>
        <span className="badge bg-danger bg-opacity-25 text-danger px-2 py-0.5 rounded-pill" style={{ fontSize: '10px' }}>
          Portal
        </span>
      </div>
      <nav className="nav flex-column gap-1">
        {ADMIN_NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/admin'}
              onClick={onItemClick}
              className={({ isActive }) =>
                `nav-link d-flex align-items-center gap-3 px-3 py-2 rounded-3 text-secondary transition ${
                  isActive
                    ? 'bg-danger text-white fw-semibold shadow-sm'
                    : 'hover-bg-dark hover-text-white'
                }`
              }
            >
              <Icon size={18} className="flex-shrink-0" />
              <span className="text-truncate">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}
