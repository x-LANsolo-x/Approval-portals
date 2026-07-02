import React, { useState, useEffect, useCallback } from 'react';
import { MdHistory, MdEdit, MdCheck, MdClose, MdRefresh, MdOpenInNew } from 'react-icons/md';

const PastEvents = () => {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState('');
    const [userName, setUserName] = useState('');
    const [editingId, setEditingId] = useState(null);     // event index being edited
    const [editValue, setEditValue] = useState('');
    const [savingId, setSavingId] = useState(null);
    const [saveStatus, setSaveStatus] = useState({});     // { idx: 'success'|'error' }
    const [searchQuery, setSearchQuery] = useState('');

    const fetchEvents = useCallback(async (role, name) => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                role: role,
                club: name
            });
            const res = await fetch(`https://approval-portals.onrender.com/api/past-events?${params}`);
            if (res.ok) {
                const data = await res.json();
                setEvents(data.events || []);
            } else {
                setEvents([]);
            }
        } catch (err) {
            console.error('Failed to load past events:', err);
            setEvents([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            const parsed = JSON.parse(storedUser);
            const role = parsed.role_name || '';
            const name = parsed.name || '';
            setUserRole(role);
            setUserName(name);
            fetchEvents(role, name);
        }
    }, [fetchEvents]);

    const handleEditStart = (idx, currentVal) => {
        setEditingId(idx);
        setEditValue(currentVal || '');
    };

    const handleEditCancel = () => {
        setEditingId(null);
        setEditValue('');
    };

    const handleSave = async (idx, event) => {
        const eventName = (
            event['Event Name'] ||
            event['EVENT NAME'] ||
            event['entryEventName'] || ''
        ).trim();

        if (!eventName) {
            alert('Cannot update: event name is missing.');
            return;
        }
        if (!editValue.trim()) {
            alert('Please enter a valid Activity ID.');
            return;
        }

        setSavingId(idx);
        try {
            const res = await fetch('https://approval-portals.onrender.com/api/update-activity-id', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    eventName: eventName,
                    role: userRole,
                    activityId: editValue.trim()
                })
            });

            const data = await res.json();
            if (res.ok && data.success) {
                // Update local state
                setEvents(prev => {
                    const updated = [...prev];
                    updated[idx] = { ...updated[idx], 'Activity ID': editValue.trim() };
                    return updated;
                });
                setSaveStatus(prev => ({ ...prev, [idx]: 'success' }));
                setTimeout(() => setSaveStatus(prev => { const n = { ...prev }; delete n[idx]; return n; }), 3000);
                setEditingId(null);
                setEditValue('');
            } else {
                setSaveStatus(prev => ({ ...prev, [idx]: 'error' }));
                setTimeout(() => setSaveStatus(prev => { const n = { ...prev }; delete n[idx]; return n; }), 4000);
                alert('Failed to update: ' + (data.error || 'Unknown error'));
            }
        } catch (err) {
            console.error('Save error:', err);
            alert('Network error while saving Activity ID.');
        } finally {
            setSavingId(null);
        }
    };

    const getEventName = (ev) => ev['Event Name'] || ev['EVENT NAME'] || ev['entryEventName'] || '–';
    const getVenue = (ev) => ev['Venue'] || ev['VENUE'] || ev['entryVenue'] || ev['Proposed Venue'] || '–';
    const getDate = (ev) => ev['Date & Time'] || ev['Proposed Date'] || ev['entryDateTime'] || ev['PROPOSED DATE'] || '–';
    const getBudget = (ev) => ev['Budget Required'] || ev['BUDGET USED'] || ev['entryBudgRequired'] || ev['Mention Proposed Budget [ in Numbers]'] || '–';
    const getStatus = (ev) => ev['STATUS OF ACTIVITY/EVENT'] || ev['Status'] || ev['status'] || 'Submitted';
    const getActivityId = (ev) => ev['Activity ID'] || ev['activityId'] || ev['entryActivityId'] || '';

    const filtered = events.filter(ev =>
        getEventName(ev).toLowerCase().includes(searchQuery.toLowerCase()) ||
        getVenue(ev).toLowerCase().includes(searchQuery.toLowerCase())
    );

    const statusBadge = (status) => {
        const s = status.toLowerCase();
        if (s.includes('approv')) return { bg: 'rgba(16,185,129,0.15)', color: '#10B981' };
        if (s.includes('reject')) return { bg: 'rgba(239,68,68,0.15)', color: '#EF4444' };
        return { bg: 'rgba(245,158,11,0.15)', color: '#F59E0B' };
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '40vh' }}>
                <div style={{ width: '40px', height: '40px', border: '3px solid var(--border-color)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            </div>
        );
    }

    return (
        <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
            {/* Header */}
            <div className="glass-panel" style={{ padding: '2rem 2.5rem', marginBottom: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ padding: '0.85rem', borderRadius: '14px', background: 'rgba(200, 16, 46, 0.15)', color: 'var(--primary)', display: 'flex' }}>
                        <MdHistory size={28} />
                    </div>
                    <div>
                        <h1 style={{ margin: 0, fontSize: '2rem', color: 'var(--text-main)', fontWeight: 800 }}>Past Events</h1>
                        <p style={{ margin: '0.25rem 0 0', color: 'var(--text-muted)', fontSize: '0.95rem' }}>
                            Events with approval forms submitted · <strong style={{ color: 'var(--text-main)' }}>{events.length}</strong> records
                        </p>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    {/* Search */}
                    <input
                        type="text"
                        placeholder="Search events…"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        style={{
                            padding: '0.6rem 1rem',
                            borderRadius: '10px',
                            border: '1px solid var(--border-color)',
                            background: 'var(--bg-input)',
                            color: 'var(--text-main)',
                            fontSize: '0.9rem',
                            outline: 'none',
                            width: '220px'
                        }}
                    />
                    {/* Refresh */}
                    <button
                        onClick={() => fetchEvents(userRole, userName)}
                        className="glass-panel"
                        style={{ padding: '0.6rem 1rem', display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontWeight: 700, color: 'var(--text-main)', fontSize: '0.9rem' }}
                        title="Refresh"
                    >
                        <MdRefresh size={18} /> Refresh
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="glass-panel" style={{ padding: '1.5rem', overflowX: 'auto' }}>
                {filtered.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-muted)' }}>
                        <MdHistory size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
                        <p style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0 }}>No past events found</p>
                        <p style={{ fontSize: '0.9rem', margin: '0.5rem 0 0' }}>Approval forms you submit will appear here.</p>
                    </div>
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
                        <thead>
                            <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                                {['#', 'Event Name', 'Venue', 'Date & Time', 'Budget (₹)', 'Status', 'Activity ID', 'Action'].map(h => (
                                    <th key={h} style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'left', whiteSpace: 'nowrap' }}>
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((ev, idx) => {
                                const status = getStatus(ev);
                                const badge = statusBadge(status);
                                const actId = getActivityId(ev);
                                const isEditing = editingId === idx;
                                const isSaving = savingId === idx;
                                const saved = saveStatus[idx];

                                return (
                                    <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.15s' }}
                                        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                    >
                                        <td style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600 }}>{idx + 1}</td>

                                        <td style={{ padding: '1rem', color: 'var(--text-main)', fontWeight: 700, maxWidth: '220px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{getEventName(ev)}</span>
                                            </div>
                                        </td>

                                        <td style={{ padding: '1rem', color: 'var(--text-main)', fontSize: '0.9rem', whiteSpace: 'nowrap' }}>{getVenue(ev)}</td>

                                        <td style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>{getDate(ev)}</td>

                                        <td style={{ padding: '1rem', color: 'var(--text-main)', fontSize: '0.9rem' }}>
                                            {getBudget(ev) !== '–' ? `₹${parseFloat(getBudget(ev)).toLocaleString()}` : '–'}
                                        </td>

                                        <td style={{ padding: '1rem' }}>
                                            <span style={{ display: 'inline-block', padding: '0.25rem 0.75rem', borderRadius: '20px', fontSize: '0.78rem', fontWeight: 700, color: badge.color, background: badge.bg, whiteSpace: 'nowrap' }}>
                                                {status}
                                            </span>
                                        </td>

                                        {/* Activity ID cell */}
                                        <td style={{ padding: '1rem', minWidth: '160px' }}>
                                            {isEditing ? (
                                                <input
                                                    type="text"
                                                    value={editValue}
                                                    autoFocus
                                                    onChange={e => setEditValue(e.target.value)}
                                                    onKeyDown={e => {
                                                        if (e.key === 'Enter') handleSave(idx, ev);
                                                        if (e.key === 'Escape') handleEditCancel();
                                                    }}
                                                    placeholder="Enter Activity ID"
                                                    style={{
                                                        width: '100%',
                                                        padding: '0.45rem 0.75rem',
                                                        borderRadius: '8px',
                                                        border: '2px solid var(--primary)',
                                                        background: 'var(--bg-card)',
                                                        color: 'var(--text-main)',
                                                        fontSize: '0.9rem',
                                                        outline: 'none'
                                                    }}
                                                />
                                            ) : (
                                                <span style={{
                                                    display: 'inline-block',
                                                    padding: '0.3rem 0.7rem',
                                                    borderRadius: '8px',
                                                    background: actId ? 'rgba(0, 48, 135, 0.1)' : 'var(--bg-hover)',
                                                    color: actId ? 'var(--secondary)' : 'var(--text-muted)',
                                                    fontSize: '0.88rem',
                                                    fontWeight: actId ? 700 : 400,
                                                    fontFamily: actId ? 'monospace' : 'inherit'
                                                }}>
                                                    {saved === 'success' ? '✓ Saved!' : (actId || 'Not set')}
                                                </span>
                                            )}
                                        </td>

                                        {/* Action buttons */}
                                        <td style={{ padding: '1rem' }}>
                                            {isEditing ? (
                                                <div style={{ display: 'flex', gap: '0.4rem' }}>
                                                    <button
                                                        onClick={() => handleSave(idx, ev)}
                                                        disabled={isSaving}
                                                        title="Save"
                                                        style={{ padding: '0.4rem 0.75rem', borderRadius: '8px', background: '#10B981', border: 'none', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.25rem', opacity: isSaving ? 0.6 : 1 }}
                                                    >
                                                        {isSaving ? '...' : <><MdCheck size={16} /> Save</>}
                                                    </button>
                                                    <button
                                                        onClick={handleEditCancel}
                                                        title="Cancel"
                                                        style={{ padding: '0.4rem 0.75rem', borderRadius: '8px', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                                                    >
                                                        <MdClose size={16} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => handleEditStart(idx, actId)}
                                                    title="Add / Edit Activity ID"
                                                    style={{ padding: '0.4rem 0.85rem', borderRadius: '8px', background: 'rgba(200, 16, 46, 0.1)', border: '1px solid rgba(200, 16, 46, 0.25)', color: 'var(--primary)', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.3rem', transition: 'all 0.2s' }}
                                                >
                                                    <MdEdit size={15} /> {actId ? 'Edit ID' : 'Add ID'}
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>


        </div>
    );
};

export default PastEvents;
