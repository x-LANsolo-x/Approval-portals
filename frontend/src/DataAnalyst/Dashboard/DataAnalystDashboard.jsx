import React, { useEffect, useState } from 'react';
import DAProposedCalendar from './DAProposedCalendar';
import DataAnalystEventApproval from './DataAnalystEventApproval';
import { MdCalendarMonth, MdFactCheck, MdBarChart } from 'react-icons/md';

const TABS = [
  { key: 'calendar',  label: 'Proposed Calendar', icon: MdCalendarMonth },
  { key: 'approvals', label: 'Event Approvals',    icon: MdFactCheck },
];

const DataAnalystDashboard = () => {
  const [activeTab, setActiveTab] = useState('calendar');
  const [userDetails, setUserDetails] = useState(null);

  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem('user'));
      if (u) setUserDetails(u);
    } catch {}
  }, []);

  return (
    <div style={{ animation: 'fadeIn 0.4s ease-out', padding: '0' }}>

      {/* ── Page Header ───────────────────────────────────── */}
      <div className="glass-panel" style={{ padding: '1.75rem 2rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            width: 48, height: 48, borderRadius: 'var(--clay-radius-sm)',
            background: 'var(--primary-light)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '1px solid var(--border-color)',
          }}>
            <MdBarChart size={26} style={{ color: 'var(--primary)' }} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)' }}>
              Data Analyst Portal
            </h1>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              OAA · Event Approvals Management
            </p>
          </div>
        </div>
        <div style={{
          background: 'var(--bg-card-2)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--clay-radius-sm)',
          padding: '0.5rem 1rem',
          fontSize: '0.875rem',
          fontWeight: 600,
          color: 'var(--text-muted)',
        }}>
          👤 {userDetails?.name || 'Data Analyst'}
        </div>
      </div>

      {/* ── Tab Bar ───────────────────────────────────────── */}
      <div className="glass-panel" style={{ padding: '0 1.5rem', marginBottom: '1.5rem', display: 'flex', gap: 4, borderRadius: 'var(--clay-radius)' }}>
        {TABS.map(({ key, label, icon: Icon }) => {
          const active = activeTab === key;
          return (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              style={{
                background: 'none',
                border: 'none',
                borderBottom: active ? '3px solid var(--primary)' : '3px solid transparent',
                padding: '1rem 1.25rem',
                color: active ? 'var(--primary)' : 'var(--text-muted)',
                fontWeight: active ? 700 : 500,
                fontSize: '0.9rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                transition: 'all 0.2s',
                fontFamily: 'var(--font-family)',
              }}
            >
              <Icon size={18} />
              {label}
            </button>
          );
        })}
      </div>

      {/* ── Content ───────────────────────────────────────── */}
      <div className="glass-panel" style={{ padding: '2rem' }}>
        {activeTab === 'calendar'  && <DAProposedCalendar />}
        {activeTab === 'approvals' && <DataAnalystEventApproval />}
      </div>
    </div>
  );
};

export default DataAnalystDashboard;
