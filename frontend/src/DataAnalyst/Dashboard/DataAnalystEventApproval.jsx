import React, { useEffect, useState, useCallback } from 'react';
import { MdOutlineVisibility, MdEdit, MdCheck } from 'react-icons/md';
import { FiRefreshCw, FiX } from 'react-icons/fi';

const STATUS_OPTIONS = ['Pending', 'Approved by DAA', 'Rejected'];

const badge = (status) => {
  const s = (status || 'Pending').toLowerCase();
  const map = {
    pending:          { bg: 'var(--bg-card-2)', color: 'var(--text-muted)', border: '1px solid var(--border-color)' },
    'approved by daa':{ bg: 'var(--text-main)', color: 'var(--bg-main)', border: 'none' },
    approved:         { bg: 'var(--text-main)', color: 'var(--bg-main)', border: 'none' },
    'form submitted': { bg: 'var(--bg-card-2)', color: 'var(--text-main)', border: '1px solid var(--border-color)' },
    rejected:         { bg: 'var(--bg-card-2)', color: 'var(--text-muted)', border: '1px dashed var(--border-color)' },
  };
  const style = map[s] || map.pending;
  return (
    <span style={{ ...style, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, display: 'inline-block' }}>
      {status || 'Pending'}
    </span>
  );
};

// ─── Detail Row helper ──────────────────────────────────────────────────────
const DetailRow = ({ label, value }) => (
  <tr>
    <td style={{ padding: '8px 12px', fontWeight: 600, fontSize: 12, color: 'var(--text-muted)', width: '40%', verticalAlign: 'top', borderBottom: '1px solid var(--border-color)' }}>{label}</td>
    <td style={{ padding: '8px 12px', fontSize: 13, color: 'var(--text-main)', borderBottom: '1px solid var(--border-color)', wordBreak: 'break-word' }}>
      {value ? (
        value === 'Yes' ? <span style={{ color: 'var(--text-main)', fontWeight: 700 }}>✓ Yes</span> :
        value === 'No'  ? <span style={{ color: 'var(--text-muted)', fontWeight: 700 }}>✗ No</span> :
        value
      ) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
    </td>
  </tr>
);

// ─── View Modal ──────────────────────────────────────────────────────────────
const ViewModal = ({ form, onClose }) => {
  if (!form) return null;
  const entries = Object.entries(form).filter(([k]) => k && k.trim() !== '' && k !== 'key' && k !== '_currentStatus');
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--clay-radius)', width: '100%', maxWidth: 860, maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: 'var(--clay-shadow-dark)', border: '1px solid var(--border-color)' }}>
        <div style={{ padding: '16px 24px', background: 'var(--bg-card-2)', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontWeight: 700, color: 'var(--text-main)' }}>Approval Form Details</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 20, cursor: 'pointer' }}><FiX /></button>
        </div>
        <div style={{ overflow: 'auto', padding: '0 8px 16px 8px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              {entries.map(([k, v], i) => <DetailRow key={i} label={k} value={v} />)}
            </tbody>
          </table>
        </div>
        <div style={{ padding: '12px 24px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '8px 20px', cursor: 'pointer', fontSize: 13, borderRadius: 'var(--clay-radius-sm)', border: '1px solid var(--border-color)', background: 'var(--bg-card-2)', color: 'var(--text-main)', fontWeight: 600 }}>Close</button>
        </div>
      </div>
    </div>
  );
};

// ─── Edit Modal ──────────────────────────────────────────────────────────────
const EditModal = ({ form, onClose, onSave }) => {
  const [vals, setVals] = useState({});
  useEffect(() => { if (form) setVals({ ...form }); }, [form]);
  if (!form) return null;
  const entries = Object.entries(form).filter(([k]) => k && k.trim() !== '' && k !== 'key' && k !== '_currentStatus');
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--clay-radius)', width: '100%', maxWidth: 800, maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: 'var(--clay-shadow-dark)', border: '1px solid var(--border-color)' }}>
        <div style={{ padding: '16px 24px', background: 'var(--bg-card-2)', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontWeight: 700, color: 'var(--text-main)' }}>Edit Form Details</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 20, cursor: 'pointer' }}><FiX /></button>
        </div>
        <div style={{ overflow: 'auto', padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {entries.map(([k, v], i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted, #6b7280)' }}>{k}</label>
              <textarea
                rows={1}
                value={vals[k] ?? ''}
                onChange={e => setVals(prev => ({ ...prev, [k]: e.target.value }))}
                style={{ padding: '7px 10px', border: '1px solid var(--glass-border, #e5e7eb)', borderRadius: 6, fontSize: 13, resize: 'vertical', fontFamily: 'inherit', background: 'var(--surface, white)', color: 'var(--text-main)' }}
              />
            </div>
          ))}
        </div>
        <div style={{ padding: '12px 24px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button onClick={onClose} style={{ padding: '8px 20px', cursor: 'pointer', fontSize: 13, borderRadius: 'var(--clay-radius-sm)', border: '1px solid var(--border-color)', background: 'var(--bg-card-2)', color: 'var(--text-main)', fontWeight: 600 }}>Cancel</button>
          <button onClick={() => onSave(vals)} style={{ padding: '8px 20px', cursor: 'pointer', fontSize: 13, borderRadius: 'var(--clay-radius-sm)', border: '1px solid var(--primary)', background: 'var(--primary)', color: 'white', fontWeight: 700 }}>Save Changes</button>
        </div>
      </div>
    </div>
  );
};

// ─── Main Component ──────────────────────────────────────────────────────────
const DataAnalystEventApproval = () => {
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewForm, setViewForm] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [toast, setToast] = useState('');

  const [eventTypeFilter, setEventTypeFilter] = useState('All');
  const [entityTypeFilter, setEntityTypeFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');

  const showToast = (msg, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(''), 3500);
  };

  const fetchForms = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('http://localhost:8000/api/approval-forms');
      if (!res.ok) throw new Error();
      const data = await res.json();
      setForms((data.forms || []).map((f, i) => ({ ...f, key: i })));
    } catch {
      showToast('Failed to load approval forms.', false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchForms(); }, [fetchForms]);

  const handleStatusChange = async (newStatus, record) => {
    const eventName = record['Event Name'] || '';
    const entityName = record['Entity Name'] || '';
    try {
      const res = await fetch('http://localhost:8000/api/update-master-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventName, entityName, newStatus }),
      });
      if (!res.ok) throw new Error();
      setForms(prev => prev.map(f => f.key === record.key ? { ...f, _currentStatus: newStatus } : f));
      showToast(`Status updated to "${newStatus}"`);
    } catch {
      showToast('Error updating status.', false);
    }
  };

  const handleEditSave = (vals) => {
    setForms(prev => prev.map(f => f.key === editForm.key ? { ...f, ...vals } : f));
    showToast('Form updated locally.');
    setEditForm(null);
  };

  const filteredForms = forms.filter(f => {
    const eType  = (f['Event Type'] || 'Regular').toLowerCase();
    const entType = (f['Entity Type'] || f['entity_type'] || '').toLowerCase();
    const status = (f._currentStatus || f['STATUS OF ACTIVITY/EVENT'] || 'Pending').toLowerCase();
    const name   = ((f['Event Name'] || '') + ' ' + (f['Entity Name'] || '')).toLowerCase();

    const mEventType  = eventTypeFilter  === 'All' || eType.includes(eventTypeFilter.toLowerCase());
    const mEntityType = entityTypeFilter === 'All' || entType.includes(entityTypeFilter.toLowerCase());
    const mStatus     = statusFilter     === 'All' || status.includes(statusFilter.toLowerCase());
    const mSearch     = !searchTerm || name.includes(searchTerm.toLowerCase());
    return mEventType && mEntityType && mStatus && mSearch;
  });

  const thStyle = { padding: '12px 16px', background: 'var(--bg-card-2)', color: 'var(--text-muted)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'left', borderBottom: '1px solid var(--border-color)', whiteSpace: 'nowrap' };
  const tdStyle = { padding: '12px 16px', borderBottom: '1px solid var(--border-color)', verticalAlign: 'middle', color: 'var(--text-main)', fontSize: 13 };

  return (
    <div>
      {toast && (
        <div style={{ padding: '10px 16px', marginBottom: 16, borderRadius: 8, background: toast.ok ? '#d1fae5' : '#fee2e2', color: toast.ok ? '#059669' : '#dc2626', fontWeight: 600, fontSize: 14, display: 'flex', justifyContent: 'space-between' }}>
          <span>{toast.msg}</span>
          <FiX style={{ cursor: 'pointer' }} onClick={() => setToast('')} />
        </div>
      )}

      <div className="glass-panel" style={{ padding: '2rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 8 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.4rem', color: 'var(--text-main)', fontWeight: 800 }}>📋 Event Approval Forms</h2>
            <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: 13 }}>
              Review submissions, edit details, and update approval status — syncs to master tracker.
            </p>
          </div>
          <button onClick={fetchForms} className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>
            <FiRefreshCw size={14} /> Refresh
          </button>
        </div>

        {/* ── Filters ── */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 12 }}>
          <input
            type="text"
            placeholder="Search event / entity…"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ padding: '7px 12px', border: '1px solid var(--glass-border, #e5e7eb)', borderRadius: 6, fontSize: 13, minWidth: 200, background: 'var(--surface)', color: 'var(--text-main)', outline: 'none' }}
          />
          {[
            { val: eventTypeFilter,  set: setEventTypeFilter,  opts: ['All', 'Regular', 'Core', 'Flagship'],                              label: 'Event Type' },
            { val: entityTypeFilter, set: setEntityTypeFilter, opts: ['All', 'Club', 'Department', 'Professional Society', 'Community'],  label: 'Entity Type' },
            { val: statusFilter,     set: setStatusFilter,     opts: ['All', 'Pending', 'Approved by DAA', 'Rejected'],                   label: 'Status' },
          ].map(({ val, set, opts, label }) => (
            <select key={label} value={val} onChange={e => set(e.target.value)}
              style={{ padding: '7px 12px', border: '1px solid var(--glass-border, #e5e7eb)', borderRadius: 6, fontSize: 13, background: 'var(--surface)', color: 'var(--text-main)', outline: 'none' }}>
              {opts.map(o => <option key={o}>{o}</option>)}
            </select>
          ))}
          <span style={{ marginLeft: 'auto', alignSelf: 'center', fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>
            {filteredForms.length} / {forms.length} records
          </span>
        </div>
      </div>

      {/* ── Table ── */}
      <div className="glass-panel" style={{ overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                <th style={thStyle}>#</th>
                <th style={thStyle}>Submission Time</th>
                <th style={thStyle}>Entity Name</th>
                <th style={thStyle}>Event Name</th>
                <th style={thStyle}>Event Type</th>
                <th style={thStyle}>Venue</th>
                <th style={thStyle}>Approval Status</th>
                <th style={thStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} style={{ ...tdStyle, textAlign: 'center', padding: '2rem' }}>
                  <div style={{ display: 'inline-block', width: 28, height: 28, border: '3px solid var(--border-color)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                </td></tr>
              ) : filteredForms.length === 0 ? (
                <tr><td colSpan={8} style={{ ...tdStyle, textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No forms found.</td></tr>
              ) : filteredForms.map((f, i) => {
                const ts = Object.values(f)[0];
                const currentStatus = f._currentStatus || f['STATUS OF ACTIVITY/EVENT'] || 'Pending';
                return (
                  <tr key={f.key} style={{ transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-card-2)'} onMouseLeave={e => e.currentTarget.style.background = ''}>
                    <td style={{ ...tdStyle, color: 'var(--text-muted)', fontWeight: 600 }}>{i + 1}</td>
                    <td style={tdStyle}>{ts ? new Date(ts).toLocaleString() : 'N/A'}</td>
                    <td style={{ ...tdStyle, fontWeight: 600 }}>{f['Entity Name'] || '—'}</td>
                    <td style={{ ...tdStyle, fontWeight: 700, maxWidth: 200 }}>{f['Event Name'] || '—'}</td>
                    <td style={tdStyle}>{f['Event Type'] || '—'}</td>
                    <td style={tdStyle}>{f['Venue'] || f['Proposed Venue'] || '—'}</td>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {badge(currentStatus)}
                        <select
                          value={currentStatus}
                          onChange={e => handleStatusChange(e.target.value, f)}
                          style={{ padding: '4px 8px', border: '1px solid var(--border-color)', borderRadius: 6, fontSize: 12, background: 'var(--bg-card)', color: 'var(--text-main)', cursor: 'pointer', outline: 'none' }}
                        >
                          {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
                        </select>
                      </div>
                    </td>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button title="View" onClick={() => setViewForm(f)} style={{ padding: '5px 8px', border: '1px solid var(--border-color)', borderRadius: 6, background: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
                          <MdOutlineVisibility size={16} />
                        </button>
                        <button title="Edit" onClick={() => setEditForm(f)} style={{ padding: '5px 8px', border: '1px solid var(--primary)', borderRadius: 6, background: 'none', cursor: 'pointer', color: 'var(--primary)', display: 'flex', alignItems: 'center' }}>
                          <MdEdit size={16} />
                        </button>
                        {currentStatus.toLowerCase() !== 'approved by daa' && (
                          <button title="Quick Approve" onClick={() => handleStatusChange('Approved by DAA', f)} style={{ padding: '5px 8px', border: '1px solid var(--primary)', borderRadius: 6, background: 'none', cursor: 'pointer', color: 'var(--text-main)', display: 'flex', alignItems: 'center' }}>
                            <MdCheck size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <ViewModal form={viewForm} onClose={() => setViewForm(null)} />
      <EditModal form={editForm} onClose={() => setEditForm(null)} onSave={handleEditSave} />
    </div>
  );
};

export default DataAnalystEventApproval;
