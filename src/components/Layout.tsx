import { confirmAction } from '../lib/dialogs';
import {
  BookOpen,
  Crown,
  Users,
  ChevronRight,
  CodeXml,
  History,
  LogOut,
  Menu,
  Settings2,
  SlidersHorizontal,
  SquareTerminal,
  Trophy,
  X,
} from 'lucide-react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../auth';

export function Brand() {
  return (
    <div className="brand">
      <span className="brand-icon">
        <CodeXml size={25} />
      </span>
      <span>
        NR <b>Grader</b>
        <small>CODE. LEARN. GROW.</small>
      </span>
    </div>
  );
}
export function Layout() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const links = [
    { to: '/', label: 'Home / อันดับคะแนนรวม', icon: Crown },
    { to: '/problems', label: 'คลังโจทย์', icon: BookOpen },
    { to: '/submissions', label: 'การส่งคำตอบ', icon: History },
    { to: '/competitions', label: 'การแข่งขัน', icon: Trophy },
    { to: '/playground', label: 'Playground', icon: SquareTerminal },
  ];
  const page = location.pathname.startsWith('/admin')
    ? 'ผู้ดูแลระบบ'
    : links.find((l) => (l.to === '/' ? location.pathname === '/' : location.pathname.startsWith(l.to)))
        ?.label || 'พื้นที่ทำงาน';
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        ข้ามไปยังเนื้อหา
      </a>
      {open && <button className="sidebar-shade" aria-label="ปิดเมนูนำทาง" onClick={() => setOpen(false)} />}
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <NavLink to="/" className="brand-link" onClick={() => setOpen(false)}>
          <Brand />
        </NavLink>
        <div className="nav-label">พื้นที่เรียนรู้</div>
        <nav aria-label="เมนูหลัก">
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} end={to === '/'} onClick={() => setOpen(false)}>
              <Icon size={20} />
              <span>{label}</span>
            </NavLink>
          ))}
          {user?.role === 'ADMIN' && (
            <>
              <div className="nav-label">ผู้ดูแลระบบ</div>
              <NavLink to="/admin/problems" onClick={() => setOpen(false)}>
                <Settings2 size={20} />
                จัดการโจทย์
              </NavLink>
              <NavLink to="/admin/competitions" onClick={() => setOpen(false)}>
                <Trophy size={20} />
                จัดการแข่งขัน
              </NavLink>
              <NavLink to="/admin/submissions" onClick={() => setOpen(false)}>
                <History size={20} />
                คำตอบของผู้เรียน
              </NavLink>
              <NavLink to="/admin/members" onClick={() => setOpen(false)}>
                <Users size={20} />
                จัดการสมาชิก
              </NavLink>
              <NavLink to="/admin/settings" onClick={() => setOpen(false)}>
                <SlidersHorizontal size={20} />
                ตั้งค่าระบบ
              </NavLink>
            </>
          )}
        </nav>
        <div className="sidebar-bottom">
          <div className="language-note">
            <CodeXml size={21} />
            <div>
              เริ่มจากโค้ดบรรทัดแรก<small>C++ & Python</small>
            </div>
          </div>
          <div className="profile">
            <span className="avatar">{user?.displayName.slice(0, 1)}</span>
            <div>
              <strong>{user?.displayName}</strong>
              <small>{user?.role === 'ADMIN' ? 'ผู้ดูแลระบบ' : 'ผู้เรียน'}</small>
            </div>
            <button
              aria-label="ออกจากระบบ"
              title="ออกจากระบบ"
              onClick={async () => {
                if (!(await confirmAction('ต้องการออกจากระบบ?', 'ออกจากระบบ'))) return;
                window.google?.accounts.id.disableAutoSelect();
                logout();
              }}
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>
      <div className="app-body">
        <header className="topbar">
          <button
            className="menu-button"
            aria-label={open ? 'ปิดเมนู' : 'เปิดเมนู'}
            aria-expanded={open}
            onClick={() => setOpen(!open)}
          >
            {open ? <X /> : <Menu />}
          </button>
          <span>NR Grader</span>
          <ChevronRight size={14} />
          <strong>{page}</strong>
          <span className="topbar-camp">
            <img src="/posn-logo.webp" alt="ตราสัญลักษณ์ สอวน." />
            <span>ค่ายโอลิมปิกวิชาการ สอวน. ค่าย 1 วิชาคอมพิวเตอร์ โรงเรียนนางรอง</span>
          </span>
        </header>
        <main id="main-content">
          <Outlet />
        </main>
        <footer className="app-footer">
          <span>NR Grader</span>
          <span>พื้นที่ฝึกคิดและเขียนโปรแกรม</span>
        </footer>
      </div>
    </div>
  );
}
