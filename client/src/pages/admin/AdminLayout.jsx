import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, NavLink } from 'react-router-dom';
import AdminSidebar, { ADMIN_NAV_ITEMS } from '../../components/admin/AdminSidebar';
import { Menu, X, Shield, ChevronRight } from 'lucide-react';

export default function AdminLayout() {
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const location = useLocation();

  // Close drawer on route change
  useEffect(() => {
    setMobileDrawerOpen(false);
  }, [location.pathname]);

  // Prevent background scroll when mobile drawer is open
  useEffect(() => {
    if (mobileDrawerOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [mobileDrawerOpen]);

  // Find active tab info for mobile header
  const currentTab = ADMIN_NAV_ITEMS.find((item) =>
    item.path === '/admin' ? location.pathname === '/admin' : location.pathname.startsWith(item.path)
  ) || { label: 'Admin Portal', icon: Shield };

  const CurrentIcon = currentTab.icon;

  return (
    <div className="container-fluid px-2 px-sm-3 px-md-4 py-3 py-md-4">
      {/* Mobile Top Navigation Bar (visible only on < lg screens) */}
      <div className="d-lg-none mb-3">
        <div className="im-glass p-3 rounded-4 border border-secondary border-opacity-25 d-flex align-items-center justify-content-between mb-2">
          <div className="d-flex align-items-center gap-2">
            <div className="p-2 rounded-3 bg-danger bg-opacity-25 text-danger d-flex align-items-center justify-content-center">
              <CurrentIcon size={20} />
            </div>
            <div>
              <div className="text-secondary small" style={{ fontSize: '11px', letterSpacing: '0.5px' }}>
                ADMIN SECTION
              </div>
              <h6 className="fw-bold text-light m-0">{currentTab.label}</h6>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setMobileDrawerOpen(true)}
            className="btn btn-outline-danger btn-sm d-flex align-items-center gap-1.5 px-3 py-1.5 rounded-pill"
            aria-label="Open Admin Menu"
          >
            <Menu size={16} />
            <span className="fw-medium small">All Sections</span>
          </button>
        </div>

        {/* Horizontal Quick-Tabs Pill Bar */}
        <div className="admin-mobile-tabs px-1 py-1">
          {ADMIN_NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.path === '/admin'
                ? location.pathname === '/admin'
                : location.pathname.startsWith(item.path);

            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/admin'}
                className={`btn btn-sm rounded-pill px-3 py-1.5 d-inline-flex align-items-center gap-2 flex-shrink-0 transition text-decoration-none ${
                  isActive
                    ? 'btn-danger shadow-sm fw-semibold'
                    : 'btn-dark border border-secondary text-secondary hover-text-white'
                }`}
                style={{ fontSize: '12px' }}
              >
                <Icon size={14} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </div>
      </div>

      {/* Mobile Drawer Backdrop */}
      {mobileDrawerOpen && (
        <div
          className="admin-drawer-backdrop"
          onClick={() => setMobileDrawerOpen(false)}
        />
      )}

      {/* Mobile Offcanvas Drawer */}
      <div
        className="admin-mobile-drawer"
        style={{
          transform: mobileDrawerOpen ? 'translateX(0)' : 'translateX(-100%)',
        }}
      >
        <div className="p-3 border-bottom border-secondary border-opacity-25 d-flex align-items-center justify-content-between">
          <div className="d-flex align-items-center gap-2">
            <Shield size={20} className="text-danger" />
            <span className="fw-bold text-light">Admin Menu</span>
          </div>
          <button
            type="button"
            onClick={() => setMobileDrawerOpen(false)}
            className="btn btn-sm btn-link text-secondary p-1"
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-2 flex-grow-1 overflow-y-auto">
          <AdminSidebar onItemClick={() => setMobileDrawerOpen(false)} isDrawer />
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="row g-3 g-md-4">
        {/* Desktop Sidebar Column */}
        <div className="d-none d-lg-block col-lg-3 col-xl-2">
          <div className="sticky-top" style={{ top: '80px', zIndex: 10 }}>
            <AdminSidebar />
          </div>
        </div>

        {/* Content Column */}
        <div className="col-12 col-lg-9 col-xl-10">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
