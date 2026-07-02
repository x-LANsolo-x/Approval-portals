import React, { useState, useEffect } from 'react';
import { 
    ResponsiveContainer, 
    BarChart, 
    Bar, 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip as ChartTooltip, 
    Legend, 
    PieChart, 
    Pie, 
    Cell, 
    AreaChart, 
    Area 
} from 'recharts';
import { motion } from 'framer-motion';
import { 
    MdEventAvailable, 
    MdPendingActions, 
    MdOutlineCancel, 
    MdAttachMoney, 
    MdTimeline,
    MdAnalytics
} from 'react-icons/md';

const EntityMetricsDashboard = () => {
    const [events, setEvents] = useState([]);
    const [entityDetails, setEntityDetails] = useState(null);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const storedUser = localStorage.getItem('user');
                if (!storedUser) return;
                const parsedUser = JSON.parse(storedUser);
                setUser(parsedUser);

                const role = parsedUser.role_name || '';
                const clubName = parsedUser.name || '';

                // Define endpoint for details
                let detailsUrl = 'https://approval-portals.onrender.com/api/club-details';
                if (role === 'Department') {
                    detailsUrl = 'https://approval-portals.onrender.com/api/department-details';
                } else if (role === 'Professional Society') {
                    detailsUrl = 'https://approval-portals.onrender.com/api/professional-details';
                } else if (role === 'Community') {
                    detailsUrl = 'https://approval-portals.onrender.com/api/community-details';
                }

                // Fetch details and events in parallel
                const eventsUrl = `https://approval-portals.onrender.com/api/events?role=${encodeURIComponent(role)}&club=${encodeURIComponent(clubName)}`;
                const [detailsRes, eventsRes] = await Promise.all([
                    fetch(detailsUrl),
                    fetch(eventsUrl)
                ]);

                if (detailsRes.ok && eventsRes.ok) {
                    const detailsData = await detailsRes.json();
                    const eventsData = await eventsRes.json();

                    setEvents(eventsData.events || []);

                    const myDetails = detailsData.details?.find(
                        item => item['Registration Name'] === parsedUser.name || item['Club Name'] === parsedUser.name
                    );
                    if (myDetails) {
                        setEntityDetails(myDetails);
                    }
                }
            } catch (error) {
                console.error("Failed to load dashboard data", error);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, []);

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
                <div style={{ width: '45px', height: '45px', border: '3px solid var(--border-color)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            </div>
        );
    }

    // Process data for charts
    const totalEvents = events.length;
    
    let approvedCount = 0;
    let pendingCount = 0;
    let rejectedCount = 0;

    events.forEach(ev => {
        const status = (ev['STATUS OF ACTIVITY/EVENT'] || ev['status'] || '').toLowerCase().trim();
        if (status.includes('approve')) {
            approvedCount++;
        } else if (status.includes('reject')) {
            rejectedCount++;
        } else {
            pendingCount++;
        }
    });

    const statusData = [
        { name: 'Approved', value: approvedCount, color: '#10B981' },
        { name: 'Pending', value: pendingCount, color: '#F5A623' },
        { name: 'Rejected', value: rejectedCount, color: '#C8102E' }
    ].filter(d => d.value > 0);

    // Budget breakdown
    const approvedBudget = entityDetails?.approved_budget ? parseFloat(entityDetails.approved_budget) : 0;
    const spentBudget = entityDetails?.spent_budget ? parseFloat(entityDetails.spent_budget) : 0;
    const balanceBudget = approvedBudget - spentBudget;

    const budgetData = [
        { name: 'Approved Budget', amount: approvedBudget, fill: '#003087' },
        { name: 'Spent Budget', amount: spentBudget, fill: '#C8102E' },
        { name: 'Balance Available', amount: balanceBudget, fill: '#F5A623' }
    ];

    // Events by Category
    const categoryCounts = {};
    events.forEach(ev => {
        const cat = ev['Type of Activity'] || ev['EventType'] || ev['entryEventType'] || 'General';
        categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    });

    const categoryData = Object.entries(categoryCounts).map(([name, count]) => ({
        name,
        count
    }));

    // Events by Mode
    let onlineCount = 0;
    let offlineCount = 0;
    let hybridCount = 0;

    events.forEach(ev => {
        const mode = (ev['Event Mode'] || ev['entryEventMode'] || '').toLowerCase().trim();
        if (mode.includes('online')) onlineCount++;
        else if (mode.includes('hybrid')) hybridCount++;
        else offlineCount++;
    });

    const modeData = [
        { name: 'Online', value: onlineCount, color: '#3B82F6' },
        { name: 'Offline', value: offlineCount, color: '#8B5CF6' },
        { name: 'Hybrid', value: hybridCount, color: '#F43F5E' }
    ].filter(d => d.value > 0);

    // Recent proposals
    const recentProposals = [...events]
        .slice(-5)
        .reverse();

    const containerVariants = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 80 } }
    };

    return (
        <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="show"
            style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}
        >
            {/* Header Glass Card */}
            <motion.div variants={itemVariants} className="glass-panel" style={{ padding: '2.5rem', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', right: '-40px', top: '-40px', fontSize: '10rem', opacity: 0.04, color: 'var(--primary)', pointerEvents: 'none' }}>
                    <MdAnalytics />
                </div>
                <h1 style={{ margin: 0, fontSize: '2.5rem', color: 'var(--text-main)', fontWeight: 800 }}>
                    {user?.name || 'Dashboard'} Analytics
                </h1>
                <p style={{ margin: '0.5rem 0 0 0', color: 'var(--text-muted)', fontSize: '1.1rem' }}>
                    Real-time operational overview, proposed budget allocations, and event execution analytics.
                </p>
            </motion.div>

            {/* Quick Metrics Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem' }}>
                <motion.div variants={itemVariants} className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                    <div style={{ padding: '1rem', borderRadius: '12px', background: 'rgba(99, 102, 241, 0.15)', color: '#6366F1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <MdTimeline size={28} />
                    </div>
                    <div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Proposed</div>
                        <div style={{ color: 'var(--text-main)', fontSize: '1.75rem', fontWeight: 800, marginTop: '0.25rem' }}>{totalEvents}</div>
                    </div>
                </motion.div>

                <motion.div variants={itemVariants} className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                    <div style={{ padding: '1rem', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.15)', color: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <MdEventAvailable size={28} />
                    </div>
                    <div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Approved Events</div>
                        <div style={{ color: 'var(--text-main)', fontSize: '1.75rem', fontWeight: 800, marginTop: '0.25rem' }}>{approvedCount}</div>
                    </div>
                </motion.div>

                <motion.div variants={itemVariants} className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                    <div style={{ padding: '1rem', borderRadius: '12px', background: 'rgba(245, 158, 11, 0.15)', color: '#F59E0B', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <MdPendingActions size={28} />
                    </div>
                    <div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pending Approval</div>
                        <div style={{ color: 'var(--text-main)', fontSize: '1.75rem', fontWeight: 800, marginTop: '0.25rem' }}>{pendingCount}</div>
                    </div>
                </motion.div>

                <motion.div variants={itemVariants} className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                    <div style={{ padding: '1rem', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.15)', color: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <MdOutlineCancel size={28} />
                    </div>
                    <div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Rejected Proposals</div>
                        <div style={{ color: 'var(--text-main)', fontSize: '1.75rem', fontWeight: 800, marginTop: '0.25rem' }}>{rejectedCount}</div>
                    </div>
                </motion.div>
            </div>

            {/* Graphical Analytics Charts */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem' }}>
                {/* Budget Utilization Chart */}
                <motion.div variants={itemVariants} className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-main)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <MdAttachMoney size={22} style={{ color: 'var(--primary)' }} />
                        Budget Allocation & Spent (₹)
                    </h3>
                    <div style={{ width: '100%', height: 300 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={budgetData} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.08)" />
                                <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                                <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                                <ChartTooltip 
                                    contentStyle={{ background: 'var(--bg-modal)', borderColor: 'var(--border-color)', borderRadius: '8px', color: 'var(--text-main)' }}
                                    formatter={(value) => [`₹${value.toLocaleString()}`, 'Amount']}
                                />
                                <Bar dataKey="amount" radius={[8, 8, 0, 0]}>
                                    {budgetData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.fill} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>

                {/* Event Status Distribution (Pie Chart) */}
                <motion.div variants={itemVariants} className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-main)', fontWeight: 700 }}>
                        Proposal Status Breakdown
                    </h3>
                    <div style={{ width: '100%', height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {statusData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={statusData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={90}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {statusData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <ChartTooltip 
                                        contentStyle={{ background: 'var(--bg-modal)', borderColor: 'var(--border-color)', borderRadius: '8px', color: 'var(--text-main)' }}
                                    />
                                    <Legend 
                                        verticalAlign="bottom" 
                                        height={36} 
                                        formatter={(value) => <span style={{ color: 'var(--text-main)', fontSize: '0.9rem' }}>{value}</span>}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>No status data available.</div>
                        )}
                    </div>
                </motion.div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem' }}>
                {/* Event Category count */}
                <motion.div variants={itemVariants} className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-main)', fontWeight: 700 }}>
                        Events by Category
                    </h3>
                    <div style={{ width: '100%', height: 300 }}>
                        {categoryData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={categoryData} margin={{ top: 20, right: 20, left: -20, bottom: 5 }}>
                                    <defs>
                                        <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.4}/>
                                            <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.08)" />
                                    <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                                    <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                                    <ChartTooltip contentStyle={{ background: 'var(--bg-modal)', borderColor: 'var(--border-color)', borderRadius: '8px', color: 'var(--text-main)' }} />
                                    <Area type="monotone" dataKey="count" stroke="var(--primary)" fillOpacity={1} fill="url(#colorCount)" strokeWidth={2} />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>No category data available</div>
                        )}
                    </div>
                </motion.div>

                {/* Event Mode distribution */}
                <motion.div variants={itemVariants} className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-main)', fontWeight: 700 }}>
                        Event Modes Distribution
                    </h3>
                    <div style={{ width: '100%', height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {modeData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={modeData}
                                        cx="50%"
                                        cy="50%"
                                        outerRadius={80}
                                        fill="#8884d8"
                                        dataKey="value"
                                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                    >
                                        {modeData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <ChartTooltip contentStyle={{ background: 'var(--bg-modal)', borderColor: 'var(--border-color)', borderRadius: '8px', color: 'var(--text-main)' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>No mode data available.</div>
                        )}
                    </div>
                </motion.div>
            </div>

            {/* Recent Proposals Table */}
            <motion.div variants={itemVariants} className="glass-panel" style={{ padding: '2rem' }}>
                <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1.2rem', color: 'var(--text-main)', fontWeight: 700 }}>
                    Recent Event Proposals
                </h3>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
                        <thead>
                            <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                <th style={{ padding: '0.75rem 1rem' }}>Event Name</th>
                                <th style={{ padding: '0.75rem 1rem' }}>Venue</th>
                                <th style={{ padding: '0.75rem 1rem' }}>Date & Time</th>
                                <th style={{ padding: '0.75rem 1rem' }}>Required Budget</th>
                                <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {recentProposals.length > 0 ? (
                                recentProposals.map((ev, idx) => {
                                    const status = (ev['STATUS OF ACTIVITY/EVENT'] || ev['status'] || 'Pending').trim();
                                    const statusLower = status.toLowerCase();
                                    let badgeColor = '#F59E0B';
                                    let badgeBg = 'rgba(245, 158, 11, 0.15)';
                                    
                                    if (statusLower.includes('approve')) {
                                        badgeColor = '#10B981';
                                        badgeBg = 'rgba(10, 185, 129, 0.15)';
                                    } else if (statusLower.includes('reject')) {
                                        badgeColor = '#EF4444';
                                        badgeBg = 'rgba(239, 68, 68, 0.15)';
                                    }

                                    return (
                                        <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-main)', fontSize: '0.95rem' }}>
                                            <td style={{ padding: '1rem', fontWeight: 600 }}>{ev['Event Name']}</td>
                                            <td style={{ padding: '1rem' }}>{ev['Proposed Venue'] || ev['VENUE'] || 'N/A'}</td>
                                            <td style={{ padding: '1rem' }}>{ev['Proposed Date'] || ev['Proposed Date & Time'] || 'N/A'}</td>
                                            <td style={{ padding: '1rem' }}>₹{(parseFloat(ev['Mention Proposed Budget [ in Numbers]'] || ev['BUDGET USED'] || 0)).toLocaleString()}</td>
                                            <td style={{ padding: '1rem' }}>
                                                <span style={{ 
                                                    display: 'inline-block', 
                                                    padding: '0.25rem 0.75rem', 
                                                    borderRadius: '20px', 
                                                    fontSize: '0.8rem', 
                                                    fontWeight: '700', 
                                                    color: badgeColor, 
                                                    backgroundColor: badgeBg 
                                                }}>
                                                    {status}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                        No recent event proposals found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </motion.div>
        </motion.div>
    );
};

export default EntityMetricsDashboard;
