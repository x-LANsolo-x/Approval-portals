import React, { useState, useEffect, useCallback } from 'react';
import styles from './DAProposedCalendar.module.css';
import { FiDownload, FiEye, FiCheckCircle } from 'react-icons/fi';
import { FaCar, FaUtensils, FaTools, FaGraduationCap } from 'react-icons/fa';
import EventDetailsModal from '../../coord/components/EventDetailsModal';

const DAProposedCalendar = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [approveMsg, setApproveMsg] = useState('');

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [eventTypeFilter, setEventTypeFilter] = useState('All');
  const [entityTypeFilter, setEntityTypeFilter] = useState('All');

  const departmentStats = React.useMemo(() => {
    const stats = {};
    data.forEach(ev => {
      const deptName = ev.entity_name || 'Unknown';
      if (!stats[deptName]) stats[deptName] = { count: 0, totalBudget: 0 };
      stats[deptName].count += 1;
      const budgetStr = (ev.proposed_budget || '').toString().replace(/[^0-9]/g, '');
      const budget = parseInt(budgetStr, 10);
      if (!isNaN(budget)) stats[deptName].totalBudget += budget;
    });
    return Object.entries(stats)
      .map(([name, s]) => ({ name, ...s }))
      .sort((a, b) => b.count - a.count);
  }, [data]);

  const fetchCalendar = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('https://approval-portals.onrender.com/api/all-proposed-calendar');
      const result = await res.json();
      const transformed = (result.events || []).map((ev, i) => ({
        pc_id: i + 1,
        event_name: ev['Event Name'] || 'Untitled Event',
        description: ev['Briefly elaborate about the outcome of the event'] || ev['Descrptions'] || 'No description',
        activity_type: ev['Type of Activity'] || ev['Event/activity Type'] || 'REGULAR',
        event_type: ev['Event/activity Type'] || ev['Type of Activity'] || 'Regular',
        proposed_budget: ev['Mention Proposed Budget [ in Numbers]'] || 0,
        status: ev['Status'] || ev['STATUS OF ACTIVITY/EVENT'] || ev['FINAL STATUS'] || 'Pending',
        entity_name: ev['Club Name'] || ev['Entity Name'] || ev['entity_name'] || 'Unknown Entity',
        entity_type: ev['EntityType'] || ev['entity_type'] || 'Unknown',
        originalData: ev,
      }));
      setData(transformed);
    } catch (err) {
      console.error('Error fetching calendar:', err);
      setData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCalendar(); }, [fetchCalendar]);
  useEffect(() => { setCurrentPage(1); }, [searchTerm, statusFilter, eventTypeFilter, entityTypeFilter]);

  const getBadgeClass = (status) => {
    const s = (status || '').toLowerCase();
    if (s.includes('approved') || s === 'form submitted') return styles.badgeApproved;
    if (s === 'rejected') return styles.badgeRejected;
    if (s === 'submitted') return styles.badgeSubmitted;
    return styles.badgePending;
  };

  const filteredData = data.filter(ev => {
    const matchSearch = (ev.event_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (ev.entity_name || '').toLowerCase().includes(searchTerm.toLowerCase());
    const evStatus = (ev.status || 'Pending').toLowerCase();
    const matchStatus = statusFilter === 'All' || evStatus.includes(statusFilter.toLowerCase());
    const eType = (ev.event_type || 'Regular').toLowerCase().trim();
    const matchType = eventTypeFilter === 'All' || eType === eventTypeFilter.toLowerCase();
    const entType = (ev.entity_type || '').toLowerCase();
    const matchEntity = entityTypeFilter === 'All' || entType.includes(entityTypeFilter.toLowerCase());
    return matchSearch && matchStatus && matchType && matchEntity;
  });

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIdx = (currentPage - 1) * itemsPerPage;
  const currentData = filteredData.slice(startIdx, startIdx + itemsPerPage);

  const handleApprove = async (event) => {
    try {
      const res = await fetch('https://approval-portals.onrender.com/api/update-master-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventName: event.event_name,
          entityName: event.entity_name,
          newStatus: 'Approved by DAA',
        }),
      });
      if (!res.ok) throw new Error();
      setApproveMsg('✅ Event approved successfully!');
      setTimeout(() => setApproveMsg(''), 3000);
      fetchCalendar();
    } catch {
      setApproveMsg('❌ Failed to approve event.');
      setTimeout(() => setApproveMsg(''), 3000);
    }
  };

  const handleExport = () => {
    const headers = ['S.No', 'Event Name', 'Event Type', 'Activity Type', 'Budget', 'Status', 'Entity'];
    const rows = filteredData.map((ev, i) => [
      i + 1, ev.event_name, ev.event_type, ev.activity_type, ev.proposed_budget, ev.status, ev.entity_name
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'proposed_calendar.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={styles.container}>

      {approveMsg && (
        <div style={{ padding: '10px 16px', marginBottom: 16, borderRadius: 8,
          background: approveMsg.startsWith('✅') ? '#d1fae5' : '#fee2e2',
          color: approveMsg.startsWith('✅') ? '#059669' : '#dc2626',
          fontWeight: 600, fontSize: 14 }}>
          {approveMsg}
        </div>
      )}

      {/* ── Table Section ─────────────────────────────────────── */}
      <div className={styles.section}>
        <div className={styles.header}>
          <h2 className={styles.headerTitle}>📅 All Proposed Events</h2>
          <button className={styles.exportBtn} onClick={handleExport}>
            <FiDownload /> Export CSV
          </button>
        </div>

        {/* Filters */}
        <div style={{ padding: '14px 20px', display: 'flex', gap: 12, borderBottom: '1px solid var(--glass-border, #f3f4f6)', background: 'var(--surface, #fafafa)', alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Search by event or entity…"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ padding: '7px 12px', border: '1px solid var(--glass-border, #e5e7eb)', borderRadius: 6, fontSize: 13, minWidth: 220, outline: 'none', background: 'var(--glass-bg, white)', color: 'var(--text-main)' }}
          />
          {[
            { val: statusFilter, set: setStatusFilter, opts: ['All', 'Pending', 'Approved by DAA', 'Approved', 'Form Submitted', 'Rejected'], label: 'Status' },
            { val: eventTypeFilter, set: setEventTypeFilter, opts: ['All', 'Regular', 'Core', 'Flagship'], label: 'Event Type' },
            { val: entityTypeFilter, set: setEntityTypeFilter, opts: ['All', 'Club', 'Department', 'Professional Society', 'Community'], label: 'Entity Type' },
          ].map(({ val, set, opts, label }) => (
            <select key={label} value={val} onChange={e => set(e.target.value)}
              style={{ padding: '7px 12px', border: '1px solid var(--glass-border, #e5e7eb)', borderRadius: 6, fontSize: 13, outline: 'none', background: 'var(--glass-bg, white)', color: 'var(--text-main)' }}>
              {opts.map(o => <option key={o}>{o}</option>)}
            </select>
          ))}
          <span style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--text-muted)', fontWeight: 600 }}>
            {filteredData.length} / {data.length} events
          </span>
        </div>

        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>S.No</th>
                <th>Event Name</th>
                <th>Event Type</th>
                <th>Activity Type</th>
                <th>Budget</th>
                <th>Status</th>
                <th>Entity</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Loading…</td></tr>
              ) : currentData.length === 0 ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No events found.</td></tr>
              ) : currentData.map((ev, i) => (
                <tr key={ev.pc_id || i}>
                  <td className={styles.sno}>{(startIdx + i + 1).toString().padStart(2, '0')}</td>
                  <td>
                    <p className={styles.eventName}>{ev.event_name}</p>
                    <p className={styles.eventSub}>{(ev.description || '').substring(0, 35)}{ev.description?.length > 35 ? '…' : ''}</p>
                  </td>
                  <td style={{ fontWeight: 700, fontSize: 12, color: 'var(--text-main)' }}>
                    {(ev.event_type || 'Regular').trim().toUpperCase()}
                  </td>
                  <td className={styles.activityType}>{((ev.activity_type || 'REGULAR').substring(0, 22) + (ev.activity_type?.length > 22 ? '…' : '')).toUpperCase()}</td>
                  <td className={styles.budget}>₹{ev.proposed_budget || 0}</td>
                  <td><span className={`${styles.badge} ${getBadgeClass(ev.status)}`}>{ev.status || 'Pending'}</span></td>
                  <td className={styles.entityText}>{ev.entity_name}</td>
                  <td style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <button className={styles.actionBtn} title="View Details" onClick={() => { setSelectedEvent(ev.originalData); setIsDetailsModalOpen(true); }}>
                      <FiEye />
                    </button>
                    {!['approved by daa', 'form submitted', 'approved'].includes((ev.status || '').toLowerCase()) && (
                      <button className={styles.actionBtn} title="Approve" style={{ color: 'var(--text-main)', borderColor: 'var(--border-color)' }} onClick={() => handleApprove(ev)}>
                        <FiCheckCircle />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className={styles.paginationContainer}>
          <div className={styles.paginationInfo}>
            Showing {data.length === 0 ? 0 : startIdx + 1}–{Math.min(startIdx + itemsPerPage, filteredData.length)} of {filteredData.length} entries
          </div>
          <div className={styles.paginationControls}>
            <div className={styles.rowsPerPage}>
              <span className={styles.rowsLabel}>Rows:</span>
              <select className={styles.rowsSelect} value={itemsPerPage} onChange={e => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}>
                {[25, 50, 100].map(n => <option key={n}>{n}</option>)}
              </select>
            </div>
            <div className={styles.pageButtons}>
              <button className={styles.pageBtn} disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>Prev</button>
              <span className={styles.pageText}>Page {currentPage} / {totalPages || 1}</span>
              <button className={styles.pageBtn} disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)}>Next</button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Analytics Section ─────────────────────────────────── */}
      <div className={styles.section}>
        <div className={styles.chartHeader}>
          <h2 className={styles.chartTitle}>📊 Entity-wise Analytics</h2>
          <div className={styles.filters}>
            <div className={styles.filterGroup}>
              <span className={styles.filterLabel}>Showing Top</span>
              <select className={styles.filterSelect}>
                <option>6 Entities</option>
              </select>
            </div>
            <div className={styles.filterGroup}>
              <span className={styles.filterLabel}>Metric</span>
              <select className={styles.filterSelect}>
                <option>Event Count</option>
              </select>
            </div>
          </div>
        </div>
        <div className={styles.chartContainer}>
          {departmentStats.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>No data</div>
          ) : departmentStats.slice(0, 6).map((stat, idx) => {
            const maxCount = departmentStats[0].count;
            const height = maxCount > 0 ? (stat.count / maxCount) * 260 : 0;
            const colors = ['var(--primary)', 'var(--text-muted)', 'var(--border-color)', 'var(--text-main)', 'var(--bg-card-2)', '#a6a6a6'];
            return (
              <div className={styles.barGroup} key={idx}>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-main)' }}>{stat.count}</span>
                <div className={styles.bar} style={{ height: `${height}px`, background: colors[idx % colors.length] }} title={`${stat.count} events`} />
                <span className={styles.barLabel}>{stat.name.length > 12 ? stat.name.substring(0, 12) + '…' : stat.name}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Summary Cards ─────────────────────────────────────── */}
      <div className={styles.summaryHeader}>
        <FiEye className={styles.summaryIcon} />
        <h2 className={styles.summaryTitle}>Entity Budget Summary (Top 4)</h2>
      </div>
      <div className={styles.summaryGrid}>
        {departmentStats.slice(0, 4).map((stat, idx) => {
          const icons = [FaCar, FaUtensils, FaTools, FaGraduationCap];
          const Icon = icons[idx % icons.length];
          const colors = ['var(--primary)', 'var(--text-muted)', 'var(--text-main)', '#a6a6a6'];
          const maxBudget = Math.max(...departmentStats.map(s => s.totalBudget));
          const fill = maxBudget > 0 ? (stat.totalBudget / maxBudget) * 100 : 0;
          const avg = stat.count > 0 ? Math.round(stat.totalBudget / stat.count) : 0;
          return (
            <div className={styles.summaryCard} key={idx}>
              <div className={styles.cardHeader}>
                <h3 className={styles.cardTitle}>{stat.name.length > 18 ? stat.name.substring(0, 18) + '…' : stat.name}</h3>
                <Icon className={styles.cardIcon} />
              </div>
              <div className={styles.statRow}>
                <span className={styles.statLabel}>Events:</span>
                <span className={styles.statValue}>{stat.count}</span>
              </div>
              <div className={styles.statRow}>
                <span className={styles.statLabel}>Total Budget:</span>
                <span className={styles.statValueGreen}>₹{stat.totalBudget.toLocaleString()}</span>
              </div>
              <div className={styles.statRow}>
                <span className={styles.statLabel}>Avg Budget:</span>
                <span className={styles.statValue}>₹{avg.toLocaleString()}</span>
              </div>
              <div className={styles.progressBar}>
                <div className={styles.progressFill} style={{ width: `${fill}%`, backgroundColor: colors[idx % colors.length] }} />
              </div>
            </div>
          );
        })}
      </div>

      <div className={styles.footer}>© 2026 OAA Event Approvals — Data Analyst Portal</div>

      {isDetailsModalOpen && (
        <EventDetailsModal event={selectedEvent} onClose={() => setIsDetailsModalOpen(false)} />
      )}
    </div>
  );
};

export default DAProposedCalendar;
