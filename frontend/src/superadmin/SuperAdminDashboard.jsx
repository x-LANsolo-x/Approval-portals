import React, { useState, useEffect, useCallback } from 'react';
import styles from './SuperAdminDashboard.module.css';
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const API = import.meta.env.VITE_API_URL || 'https://approval-portals.onrender.com';

const CHART_COLORS = ['#ffffff','#a1a1aa','#71717a','#52525b','#3f3f46','#27272a'];
const TYPE_COLORS  = { Club:'#ffffff', Department:'#a1a1aa', 'Professional Society':'#71717a', Community:'#52525b' };

function getStatusClass(status='') {
  const s = status.toLowerCase();
  if (s.includes('approv')) return styles.statusApproved;
  if (s.includes('reject')) return styles.statusRejected;
  if (s.includes('submit') || s.includes('form')) return styles.statusSubmitted;
  return styles.statusPending;
}

function getBadgeClass(type='') {
  if (type === 'Club') return styles.badgeClub;
  if (type === 'Department') return styles.badgeDept;
  if (type === 'Professional Society') return styles.badgeProf;
  return styles.badgeComm;
}

function fmt(n) { return Number(n||0).toLocaleString('en-IN'); }

// ── KPI Card ────────────────────────────────────────────────
function KPICard({ icon, label, value, sub }) {
  return (
    <div className={styles.kpiCard}>
      <div className={styles.kpiIcon}>{icon}</div>
      <div className={styles.kpiLabel}>{label}</div>
      <div className={styles.kpiValue}>{value}</div>
      {sub && <div className={styles.kpiSub}>{sub}</div>}
    </div>
  );
}

// ── Overview Tab ─────────────────────────────────────────────
function OverviewTab({ stats }) {
  if (!stats) return <div className={styles.loadingBox}><div className={styles.spinner}/> Loading analytics…</div>;

  const statusData = Object.entries(stats.events?.by_status || {}).map(([name, value]) => ({ name, value }));
  const typeData   = Object.entries(stats.events?.by_type   || {}).map(([name, value]) => ({ name, value }));
  const entityData = Object.entries(stats.events?.by_entity || {}).map(([name, value]) => ({ name, value })).slice(0,10);
  const budgetByType = stats.budget?.by_type || {};
  const budgetTypeData = Object.entries(budgetByType).map(([name, b]) => ({
    name, approved: b.approved, spent: b.spent
  }));

  return (
    <div className={styles.tabContent}>
      <div className={styles.kpiGrid}>
        <KPICard icon="🏛️" label="Total Entities"    value={stats.entities?.total || 0} sub={`${stats.entities?.clubs||0} clubs · ${stats.entities?.departments||0} depts · ${stats.entities?.professional_societies||0} pro soc · ${stats.entities?.communities||0} community`} />
        <KPICard icon="📅" label="Total Events"      value={fmt(stats.events?.total)} sub="All proposals on record" />
        <KPICard icon="✅" label="Approved"           value={fmt(statusData.find(s=>s.name.toLowerCase().includes('approv'))?.value||0)} />
        <KPICard icon="⏳" label="Pending / Submitted" value={fmt(statusData.filter(s=>!s.name.toLowerCase().includes('approv')&&!s.name.toLowerCase().includes('reject')).reduce((a,b)=>a+b.value,0))} />
        <KPICard icon="💰" label="Total Budget Allocated" value={`₹${fmt(stats.budget?.total_approved)}`} sub={`₹${fmt(stats.budget?.total_spent)} spent`} />
        <KPICard icon="📊" label="Budget Utilisation" value={`${stats.budget?.utilization_pct||0}%`} sub="Spent vs allocated" />
      </div>

      <div className={styles.chartsGrid}>
        {/* Events by Status */}
        <div className={styles.chartCard}>
          <p className={styles.chartTitle}>Events by Approval Status</p>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({name,percent})=>`${name} ${(percent*100).toFixed(0)}%`}>
                {statusData.map((_,i)=><Cell key={i} fill={CHART_COLORS[i%CHART_COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{background:'var(--bg-card)',border:'1px solid var(--border-color)',color:'var(--text-main)'}} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Budget by type */}
        <div className={styles.chartCard}>
          <p className={styles.chartTitle}>Budget: Allocated vs Spent by Entity Type</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={budgetTypeData} margin={{top:0,right:10,left:0,bottom:0}}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
              <XAxis dataKey="name" tick={{fill:'var(--text-muted)',fontSize:10}} />
              <YAxis tick={{fill:'var(--text-muted)',fontSize:10}} tickFormatter={v=>`₹${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={v=>`₹${fmt(v)}`} contentStyle={{background:'var(--bg-card)',border:'1px solid var(--border-color)',color:'var(--text-main)'}} />
              <Legend wrapperStyle={{fontSize:'0.75rem',color:'var(--text-muted)'}} />
              <Bar dataKey="approved" name="Allocated" fill="#ffffff" radius={[4,4,0,0]} />
              <Bar dataKey="spent"    name="Spent"     fill="#71717a" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Events by Type */}
        <div className={styles.chartCard}>
          <p className={styles.chartTitle}>Events by Category / Type</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={typeData.slice(0,10)} layout="vertical" margin={{top:0,right:20,left:80,bottom:0}}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
              <XAxis type="number" tick={{fill:'var(--text-muted)',fontSize:10}} />
              <YAxis dataKey="name" type="category" tick={{fill:'var(--text-muted)',fontSize:10}} width={75} />
              <Tooltip contentStyle={{background:'var(--bg-card)',border:'1px solid var(--border-color)',color:'var(--text-main)'}} />
              <Bar dataKey="value" name="Events" fill="#ffffff" radius={[0,4,4,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top Entities by Events */}
        <div className={styles.chartCard}>
          <p className={styles.chartTitle}>Top 10 Active Entities (by Event Count)</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={entityData} layout="vertical" margin={{top:0,right:20,left:110,bottom:0}}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
              <XAxis type="number" tick={{fill:'var(--text-muted)',fontSize:10}} />
              <YAxis dataKey="name" type="category" tick={{fill:'var(--text-muted)',fontSize:9}} width={105} />
              <Tooltip contentStyle={{background:'var(--bg-card)',border:'1px solid var(--border-color)',color:'var(--text-main)'}} />
              <Bar dataKey="value" name="Events" fill="#a1a1aa" radius={[0,4,4,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

// ── Events Tab ───────────────────────────────────────────────
function EventsTab() {
  const [events, setEvents]     = useState([]);
  const [total, setTotal]       = useState(0);
  const [loading, setLoading]   = useState(false);
  const [page, setPage]         = useState(1);
  const [search, setSearch]     = useState('');
  const [entityType, setEntityType] = useState('');
  const [status, setStatus]     = useState('');

  const PAGE_SIZE = 50;

  const load = useCallback(async (p=1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: p, page_size: PAGE_SIZE });
      if (search)     params.append('search', search);
      if (entityType) params.append('entity_type', entityType);
      if (status)     params.append('status', status);
      const res  = await fetch(`${API}/api/superadmin/events?${params}`);
      const data = await res.json();
      setEvents(data.events || []);
      setTotal(data.total || 0);
      setPage(p);
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  }, [search, entityType, status]);

  useEffect(() => { load(1); }, []);

  const cols = ['Club Name','Event Name','Type of Event','Date & Time of Activity/Event','STATUS OF ACTIVITY/EVENT','_entity_type'];

  return (
    <div className={styles.tabContent}>
      <div className={styles.filtersBar}>
        <input className={styles.filterInput} placeholder="🔍  Search events, clubs, types…" value={search} onChange={e=>setSearch(e.target.value)} onKeyDown={e=>e.key==='Enter'&&load(1)} />
        <select className={styles.filterSelect} value={entityType} onChange={e=>setEntityType(e.target.value)}>
          <option value="">All Entity Types</option>
          <option>Club</option><option>Department</option>
        </select>
        <select className={styles.filterSelect} value={status} onChange={e=>setStatus(e.target.value)}>
          <option value="">All Statuses</option>
          <option value="Approved">Approved</option>
          <option value="Form Submitted">Form Submitted</option>
          <option value="Pending">Pending</option>
          <option value="Rejected">Rejected</option>
        </select>
        <button className={styles.filterBtn} onClick={()=>load(1)}>Apply Filters</button>
        <button className={`${styles.filterBtn} ${styles.filterBtnSecondary}`} onClick={()=>{setSearch('');setEntityType('');setStatus('');setTimeout(()=>load(1),0);}}>Reset</button>
        <span style={{marginLeft:'auto',color:'var(--text-muted)',fontSize:'0.8rem',fontWeight:600}}>{total} results</span>
      </div>
      {loading ? (
        <div className={styles.loadingBox}><div className={styles.spinner}/>Loading events…</div>
      ) : (
        <>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead><tr>
                {['Entity Type','Club / Entity','Event Name','Type','Date','Status'].map(h=><th key={h}>{h}</th>)}
              </tr></thead>
              <tbody>
                {events.length === 0 ? (
                  <tr><td colSpan={6} className={styles.emptyBox}>No events found</td></tr>
                ) : events.map((ev,i) => {
                  const name   = ev['Club Name'] || ev['CLUB NAME'] || '—';
                  const evName = ev['Event Name'] || ev['EVENT NAME'] || ev['Name of the Event/Activity'] || '—';
                  const type   = ev['Type of Event'] || ev['EVENT TYPE'] || '—';
                  const date   = ev['Date & Time of Activity/Event'] || ev['Date'] || '—';
                  const s      = ev['STATUS OF ACTIVITY/EVENT'] || ev['STATUS'] || 'Pending';
                  const eType  = ev['_entity_type'] || '—';
                  return (
                    <tr key={i}>
                      <td><span className={`${styles.badge} ${getBadgeClass(eType)}`}>{eType}</span></td>
                      <td style={{fontWeight:600}}>{name}</td>
                      <td>{evName}</td>
                      <td style={{color:'var(--text-muted)'}}>{type}</td>
                      <td style={{color:'var(--text-muted)',whiteSpace:'nowrap'}}>{date}</td>
                      <td><span className={`${styles.badge} ${getStatusClass(s)}`}>{s}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className={styles.pagination}>
            <button className={styles.pageBtn} disabled={page<=1} onClick={()=>load(page-1)}>← Prev</button>
            <span>Page {page} of {Math.max(1,Math.ceil(total/PAGE_SIZE))}</span>
            <button className={styles.pageBtn} disabled={page>=Math.ceil(total/PAGE_SIZE)} onClick={()=>load(page+1)}>Next →</button>
          </div>
        </>
      )}
    </div>
  );
}

// ── Entities Tab ─────────────────────────────────────────────
function EntitiesTab() {
  const [entities, setEntities] = useState([]);
  const [total, setTotal]       = useState(0);
  const [loading, setLoading]   = useState(false);
  const [search, setSearch]     = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search)     params.append('search', search);
      if (typeFilter) params.append('type', typeFilter);
      const res  = await fetch(`${API}/api/superadmin/entities?${params}`);
      const data = await res.json();
      setEntities(data.entities || []);
      setTotal(data.total || 0);
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  }, [search, typeFilter]);

  useEffect(() => { load(); }, []);

  return (
    <div className={styles.tabContent}>
      <div className={styles.filtersBar}>
        <input className={styles.filterInput} placeholder="🔍  Search by name, login ID, faculty…" value={search} onChange={e=>setSearch(e.target.value)} onKeyDown={e=>e.key==='Enter'&&load()} />
        <select className={styles.filterSelect} value={typeFilter} onChange={e=>setTypeFilter(e.target.value)}>
          <option value="">All Types</option>
          <option>Club</option><option>Department</option>
          <option>Professional Society</option><option>Community</option>
        </select>
        <button className={styles.filterBtn} onClick={load}>Apply</button>
        <button className={`${styles.filterBtn} ${styles.filterBtnSecondary}`} onClick={()=>{setSearch('');setTypeFilter('');setTimeout(load,0);}}>Reset</button>
        <span style={{marginLeft:'auto',color:'var(--text-muted)',fontSize:'0.8rem',fontWeight:600}}>{total} entities</span>
      </div>
      {loading ? (
        <div className={styles.loadingBox}><div className={styles.spinner}/>Loading entities…</div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead><tr>
              {['Type','Name','Reg. Code','Login ID','Faculty Champion','Secretary','Budget Alloc.','Budget Spent','Balance','Utilisation'].map(h=><th key={h}>{h}</th>)}
            </tr></thead>
            <tbody>
              {entities.length === 0 ? (
                <tr><td colSpan={10} className={styles.emptyBox}>No entities found</td></tr>
              ) : entities.map((e,i) => {
                const pct = e.approved_budget > 0 ? Math.min(100, Math.round((e.spent_budget/e.approved_budget)*100)) : 0;
                return (
                  <tr key={i}>
                    <td><span className={`${styles.badge} ${getBadgeClass(e.type)}`}>{e.type}</span></td>
                    <td style={{fontWeight:700,minWidth:160}}>{e.name}</td>
                    <td style={{color:'var(--text-muted)',fontSize:'0.78rem'}}>{e.registration_code||'—'}</td>
                    <td style={{color:'var(--text-muted)',fontSize:'0.78rem'}}>{e.login_id||'—'}</td>
                    <td>{e.faculty_champion||'—'}</td>
                    <td>{e.secretary||'—'}</td>
                    <td style={{fontWeight:600}}>₹{fmt(e.approved_budget)}</td>
                    <td style={{fontWeight:600}}>₹{fmt(e.spent_budget)}</td>
                    <td style={{fontWeight:600,color: e.balance_budget>=0?'inherit':'#ef4444'}}>₹{fmt(e.balance_budget)}</td>
                    <td style={{minWidth:100}}>
                      <div style={{display:'flex',alignItems:'center',gap:'0.4rem'}}>
                        <div className={styles.budgetBar} style={{flex:1}}>
                          <div className={styles.budgetFill} style={{width:`${pct}%`}}/>
                        </div>
                        <span style={{fontSize:'0.72rem',color:'var(--text-muted)',fontWeight:700,whiteSpace:'nowrap'}}>{pct}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Budget Tab ───────────────────────────────────────────────
function BudgetTab() {
  const [data, setData]     = useState([]);
  const [loading, setLoading] = useState(false);
  const [typeFilter, setTypeFilter] = useState('');

  useEffect(() => {
    setLoading(true);
    fetch(`${API}/api/superadmin/budget`)
      .then(r=>r.json())
      .then(d=>setData(d.budget_data||[]))
      .catch(console.error)
      .finally(()=>setLoading(false));
  }, []);

  const filtered = typeFilter ? data.filter(d=>d.type===typeFilter) : data;
  const topData  = [...filtered].sort((a,b)=>b.approved-a.approved).slice(0,20);

  const pieData = ['Club','Department','Professional Society','Community'].map(t=>({
    name: t,
    value: data.filter(d=>d.type===t).reduce((a,b)=>a+b.approved,0)
  })).filter(d=>d.value>0);

  return (
    <div className={styles.tabContent}>
      <div className={styles.filtersBar}>
        <select className={styles.filterSelect} value={typeFilter} onChange={e=>setTypeFilter(e.target.value)}>
          <option value="">All Entity Types</option>
          <option>Club</option><option>Department</option>
          <option>Professional Society</option><option>Community</option>
        </select>
      </div>
      {loading ? <div className={styles.loadingBox}><div className={styles.spinner}/>Loading…</div> : (
        <>
          <div className={styles.chartsGrid}>
            <div className={styles.chartCard}>
              <p className={styles.chartTitle}>Budget Distribution by Entity Type</p>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90}
                    label={({name,percent})=>`${name.split(' ')[0]} ${(percent*100).toFixed(0)}%`}>
                    {pieData.map((_,i)=><Cell key={i} fill={CHART_COLORS[i%CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={v=>`₹${fmt(v)}`} contentStyle={{background:'var(--bg-card)',border:'1px solid var(--border-color)',color:'var(--text-main)'}} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className={styles.chartCard}>
              <p className={styles.chartTitle}>Top Entities — Allocated vs Spent</p>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={topData.slice(0,8)} margin={{top:0,right:10,left:10,bottom:40}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                  <XAxis dataKey="name" tick={{fill:'var(--text-muted)',fontSize:8}} angle={-35} textAnchor="end" interval={0} />
                  <YAxis tick={{fill:'var(--text-muted)',fontSize:9}} tickFormatter={v=>`₹${(v/1000).toFixed(0)}k`} />
                  <Tooltip formatter={v=>`₹${fmt(v)}`} contentStyle={{background:'var(--bg-card)',border:'1px solid var(--border-color)',color:'var(--text-main)'}} />
                  <Legend wrapperStyle={{fontSize:'0.75rem',color:'var(--text-muted)'}} />
                  <Bar dataKey="approved" name="Allocated" fill="#ffffff" radius={[3,3,0,0]} />
                  <Bar dataKey="spent"    name="Spent"     fill="#71717a" radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead><tr>
                {['Type','Entity Name','Allocated (₹)','Spent (₹)','Balance (₹)','Utilisation'].map(h=><th key={h}>{h}</th>)}
              </tr></thead>
              <tbody>
                {filtered.length===0 ? (
                  <tr><td colSpan={6} className={styles.emptyBox}>No budget data</td></tr>
                ) : filtered.map((d,i)=>{
                  const pct = d.approved>0 ? Math.min(100,Math.round((d.spent/d.approved)*100)) : 0;
                  return (
                    <tr key={i}>
                      <td><span className={`${styles.badge} ${getBadgeClass(d.type)}`}>{d.type}</span></td>
                      <td style={{fontWeight:600}}>{d.name}</td>
                      <td>₹{fmt(d.approved)}</td>
                      <td>₹{fmt(d.spent)}</td>
                      <td style={{color:d.balance>=0?'inherit':'#ef4444'}}>₹{fmt(d.balance)}</td>
                      <td style={{minWidth:120}}>
                        <div style={{display:'flex',alignItems:'center',gap:'0.5rem'}}>
                          <div className={styles.budgetBar} style={{flex:1}}>
                            <div className={styles.budgetFill} style={{width:`${pct}%`}}/>
                          </div>
                          <span style={{fontSize:'0.72rem',color:'var(--text-muted)',fontWeight:700}}>{pct}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

// ── Users Tab ────────────────────────────────────────────────
function UsersTab() {
  const [users, setUsers]       = useState([]);
  const [loading, setLoading]   = useState(false);
  const [search, setSearch]     = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [showPasswords, setShowPasswords] = useState({});

  useEffect(() => {
    setLoading(true);
    fetch(`${API}/api/superadmin/users`)
      .then(r => r.json())
      .then(d => setUsers(d.users || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = users.filter(u => {
    const matchRole = !roleFilter || u.entity_type === roleFilter || u.role === roleFilter;
    const matchSearch = !search || JSON.stringify(u).toLowerCase().includes(search.toLowerCase());
    return matchRole && matchSearch;
  });

  // Separate roles-table users (privileged) from entity users
  const privileged = filtered.filter(u => u.source === 'roles');
  const entityUsers = filtered.filter(u => u.source !== 'roles');

  return (
    <div className={styles.tabContent}>
      {/* Privileged Accounts (roles table) */}
      <p className={styles.sectionTitle}>Portal Admin Accounts (Roles Table)</p>
      <div className={styles.tableWrap} style={{marginBottom:'1.5rem'}}>
        <table className={styles.table}>
          <thead><tr>
            {['ID','Name','Login ID','Role / Portal Access'].map(h => <th key={h}>{h}</th>)}
          </tr></thead>
          <tbody>
            {privileged.length === 0 ? (
              <tr><td colSpan={4} className={styles.emptyBox}>No admin accounts found</td></tr>
            ) : privileged.map((u, i) => (
              <tr key={i}>
                <td style={{color:'var(--text-muted)',fontSize:'0.8rem'}}>{u.id || '—'}</td>
                <td style={{fontWeight:700}}>{u.name}</td>
                <td>
                  <code style={{
                    background:'var(--bg-card-2)',
                    padding:'0.2rem 0.6rem',
                    borderRadius:6,
                    fontSize:'0.82rem',
                    fontFamily:'monospace',
                    color:'var(--text-main)',
                    border:'1px solid var(--border-color)'
                  }}>{u.login_id || '—'}</code>
                </td>
                <td><span className={`${styles.badge} ${getBadgeClass(u.role)}`}>{u.role}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Entity Users */}
      <p className={styles.sectionTitle}>Entity Users (All Portals)</p>
      <div className={styles.filtersBar}>
        <input className={styles.filterInput} placeholder="🔍  Search name, login ID, cluster…" value={search} onChange={e => setSearch(e.target.value)} />
        <select className={styles.filterSelect} value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
          <option value="">All Types</option>
          <option>Club</option><option>Department</option>
          <option>Professional Society</option><option>Community</option>
        </select>
        <button className={`${styles.filterBtn} ${styles.filterBtnSecondary}`} onClick={() => { setSearch(''); setRoleFilter(''); }}>
          Reset
        </button>
        <span style={{marginLeft:'auto',color:'var(--text-muted)',fontSize:'0.8rem',fontWeight:600}}>{entityUsers.length} users</span>
      </div>
      {loading ? (
        <div className={styles.loadingBox}><div className={styles.spinner}/>Loading users…</div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead><tr>
              {['Type','Name','Reg. Code','Login ID','Cluster / Dept','Contact'].map(h => <th key={h}>{h}</th>)}
            </tr></thead>
            <tbody>
              {entityUsers.length === 0 ? (
                <tr><td colSpan={6} className={styles.emptyBox}>No users found</td></tr>
              ) : entityUsers.map((u, i) => (
                <tr key={i}>
                  <td><span className={`${styles.badge} ${getBadgeClass(u.entity_type)}`}>{u.entity_type}</span></td>
                  <td style={{fontWeight:600,minWidth:160}}>{u.name}</td>
                  <td style={{color:'var(--text-muted)',fontSize:'0.78rem'}}>{u.registration_code || '—'}</td>
                  <td>
                    <code style={{
                      background:'var(--bg-card-2)',
                      padding:'0.2rem 0.5rem',
                      borderRadius:5,
                      fontSize:'0.78rem',
                      fontFamily:'monospace',
                      color:'var(--text-main)',
                      border:'1px solid var(--border-color)'
                    }}>{u.login_id || '—'}</code>
                  </td>
                  <td style={{color:'var(--text-muted)'}}>{u.cluster || '—'}</td>
                  <td style={{color:'var(--text-muted)'}}>{u.contact || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Main Dashboard ───────────────────────────────────────────
const TABS = [
  { id:'overview',  label:'Overview',          icon:'📊' },
  { id:'events',    label:'All Events',         icon:'📅' },
  { id:'entities',  label:'Entity Management',  icon:'🏛️' },
  { id:'budget',    label:'Budget Analysis',    icon:'💰' },
  { id:'users',     label:'User Accounts',      icon:'👥' },
];

export default function SuperAdminDashboard({ onLogout, theme, toggleTheme }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats]         = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);

  useEffect(() => {
    setStatsLoading(true);
    fetch(`${API}/api/superadmin/stats`)
      .then(r=>r.json())
      .then(setStats)
      .catch(console.error)
      .finally(()=>setStatsLoading(false));
  }, []);

  const TAB_TITLES = { overview:'Dashboard Overview', events:'All Events', entities:'Entity Management', budget:'Budget Analysis', users:'User Accounts' };

  return (
    <div className={styles.wrapper}>
      {/* Sidebar */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarLogo}>
          <p className={styles.sidebarLogoTitle}>OAA Portal</p>
          <span className={styles.sidebarBadge}>Super Admin</span>
        </div>
        <nav className={styles.sidebarNav}>
          {TABS.map(tab => (
            <button key={tab.id}
              className={`${styles.navItem} ${activeTab===tab.id ? styles.navItemActive : ''}`}
              onClick={() => setActiveTab(tab.id)}>
              <span className={styles.navIcon}>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
        <div className={styles.sidebarFooter}>
          <button className={styles.logoutBtn} onClick={onLogout}>⏏ Logout</button>
        </div>
      </aside>

      {/* Main */}
      <main className={styles.main}>
        <header className={styles.topbar}>
          <h1 className={styles.topbarTitle}>{TAB_TITLES[activeTab]}</h1>
          <div className={styles.topbarRight}>
            <button onClick={toggleTheme} style={{background:'none',border:'2px solid var(--border-color)',borderRadius:8,padding:'0.4rem 0.8rem',cursor:'pointer',color:'var(--text-main)',fontWeight:700,fontSize:'0.8rem'}}>
              {theme==='dark' ? '☀ Light' : '🌙 Dark'}
            </button>
            <span className={styles.topbarUser}>👤 Super Admin</span>
          </div>
        </header>

        <div className={styles.content}>
          {activeTab==='overview'  && <OverviewTab stats={stats} />}
          {activeTab==='events'    && <EventsTab />}
          {activeTab==='entities'  && <EntitiesTab />}
          {activeTab==='budget'    && <BudgetTab />}
          {activeTab==='users'     && <UsersTab />}
        </div>
      </main>
    </div>
  );
}
