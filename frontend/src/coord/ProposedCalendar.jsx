import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import EventDetailsModal from "./components/EventDetailsModal";
import ApprovalDataEntryModal from "./components/ApprovalDataEntryModal";
import ApprovalPdfModal from "./components/ApprovalPdfModal";
import ErrorBoundary from "./components/ErrorBoundary";

const ProposedCalendar = () => {
    const [events, setEvents] = useState([]);
    const [clubDetails, setClubDetails] = useState([]);
    const [loading, setLoading] = useState(true);
    const [lastRefreshed, setLastRefreshed] = useState(null);
    
    // Modals state
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [isDataEntryModalOpen, setIsDataEntryModalOpen] = useState(false);
    const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
    
    const [formData, setFormData] = useState(null);
    const [userClub, setUserClub] = useState("");
    const [userRole, setUserRole] = useState("");

    useEffect(() => {
        try {
            const userData = JSON.parse(localStorage.getItem("user"));
            if (userData) {
                const club = userData.department_name || userData.club_name || "";
                const role = userData.role_name || "";
                setUserClub(club);
                setUserRole(role);
            }
        } catch(e) {
            console.error("Failed to parse user data", e);
        }
    }, []);

    const fetchData = async (role, club) => {
        const resolvedRole = role ?? userRole;
        const resolvedClub = club ?? userClub;
        if (!resolvedRole) return;

        setLoading(true);
        try {
            let eventsUrl = `https://approval-portals.onrender.com/api/events`;
            const params = new URLSearchParams();
            if (resolvedClub) params.append("club", resolvedClub);
            if (resolvedRole) params.append("role", resolvedRole);
            if (params.toString()) eventsUrl += `?${params.toString()}`;
            
            let detailsUrl = `https://approval-portals.onrender.com/api/club-details`;
            if (resolvedRole === 'Department') {
                detailsUrl = `https://approval-portals.onrender.com/api/department-details`;
            } else if (resolvedRole === 'Professional Society') {
                detailsUrl = `https://approval-portals.onrender.com/api/professional-details`;
            } else if (resolvedRole === 'Community') {
                detailsUrl = `https://approval-portals.onrender.com/api/community-details`;
            }
            
            const [eventsRes, clubsRes] = await Promise.all([
                fetch(eventsUrl),
                fetch(detailsUrl)
            ]);
            const eventsData = await eventsRes.json();
            const clubsData = await clubsRes.json();
            
            setEvents(eventsData.events || []);
            setClubDetails(clubsData.details || []);
            setLastRefreshed(new Date());
        } catch (err) {
            console.error("Failed to load events", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (userRole) {
            fetchData(userRole, userClub);
        }
    }, [userRole, userClub]);

    // Auto-refresh every 30 seconds to pick up DA approval/rejection decisions
    useEffect(() => {
        if (!userRole) return;
        const interval = setInterval(() => {
            fetchData(userRole, userClub);
        }, 30000);
        return () => clearInterval(interval);
    }, [userRole, userClub]);


    const getClubRecord = (clubName) => {
        if (!clubName) return null;
        return clubDetails.find(club => {
            return club['Club Name'] && String(club['Club Name']).trim().toLowerCase() === String(clubName).trim().toLowerCase();
        });
    };

    const handleDetailsClick = (ev) => {
        setSelectedEvent(ev);
        setIsDetailsModalOpen(true);
    };

    const handleApprovalFormClick = (ev) => {
        setSelectedEvent(ev);
        setIsDataEntryModalOpen(true);
    };

    const handlePreviewPdf = (data) => {
        setFormData(data);
        setIsDataEntryModalOpen(false);
        setIsPdfModalOpen(true);
    };

    // Optimistic update: immediately flip the event status in local state
    const handleSubmitSuccess = (submittedEventName) => {
        setEvents(prev => prev.map(ev => {
            const evName = (ev['Event Name'] || ev['Event Name '] || ev['EVENT NAME'] || '').trim().toLowerCase();
            if (evName === submittedEventName.trim().toLowerCase()) {
                return { ...ev, 'STATUS OF ACTIVITY/EVENT': 'Form Submitted' };
            }
            return ev;
        }));
    };

    return (
        <div style={{ padding: '1rem 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <h2 style={{ fontSize: '1.75rem', fontWeight: '900', color: 'var(--text-main)', margin: 0, textTransform: 'uppercase', letterSpacing: '-0.5px' }}>PROPOSED EVENTS</h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    {lastRefreshed && (
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: '600' }}>
                            Updated {lastRefreshed.toLocaleTimeString()}
                        </span>
                    )}
                    <button
                        onClick={() => fetchData(userRole, userClub)}
                        disabled={loading}
                        style={{
                            padding: '0.4rem 0.9rem',
                            fontSize: '0.75rem',
                            border: '2px solid #000000',
                            color: 'var(--bg-main)',
                            background: loading ? 'var(--text-muted)' : 'var(--text-main)',
                            borderRadius: '8px',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            fontWeight: '800',
                            textTransform: 'uppercase',
                            boxShadow: '2px 2px 0px #000000',
                        }}
                    >
                        ↻ Refresh
                    </button>
                </div>
            </div>
            
            <p style={{ color: 'var(--text-muted)', marginTop: '-1rem', marginBottom: '2rem', textTransform: 'uppercase', fontSize: '0.8rem', fontWeight: '700', letterSpacing: '0.5px' }}>Notice: All events require a 5-day prior notice for approval.</p>
            
            <div className="glass-panel" style={{ overflowX: 'auto', marginBottom: '2rem' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead style={{ background: 'rgba(0, 0, 0, 0.25)', borderBottom: '3px solid #000000' }}>
                        <tr>
                            <th style={{ padding: '1.2rem 1rem', color: 'var(--text-main)', fontWeight: '900', textTransform: 'uppercase', fontSize: '0.85rem', letterSpacing: '0.5px' }}>Event Name</th>
                            <th style={{ padding: '1.2rem 1rem', color: 'var(--text-main)', fontWeight: '900', textTransform: 'uppercase', fontSize: '0.85rem', letterSpacing: '0.5px' }}>Event Category</th>
                            <th style={{ padding: '1.2rem 1rem', color: 'var(--text-main)', fontWeight: '900', textTransform: 'uppercase', fontSize: '0.85rem', letterSpacing: '0.5px' }}>Proposed Date</th>
                            <th style={{ padding: '1.2rem 1rem', color: 'var(--text-main)', fontWeight: '900', textTransform: 'uppercase', fontSize: '0.85rem', letterSpacing: '0.5px' }}>Budget Required</th>
                            <th style={{ padding: '1.2rem 1rem', color: 'var(--text-main)', fontWeight: '900', textTransform: 'uppercase', fontSize: '0.85rem', letterSpacing: '0.5px' }}>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan="5" style={{ textAlign: 'center', padding: '3rem 1.5rem', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', fontSize: '0.9rem' }}>Loading live events...</td>
                            </tr>
                        ) : events.length === 0 ? (
                            <tr>
                                <td colSpan="5" style={{ textAlign: 'center', padding: '3rem 1.5rem', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', fontSize: '0.9rem' }}>No events found.</td>
                            </tr>
                        ) : (
                            events.map((ev, index) => {
                                const status = String(ev['STATUS OF ACTIVITY/EVENT'] || ev['STATUS'] || ev['Status'] || '').trim().toLowerCase();
                                const isFormSubmitted = status === 'form submitted';
                                const isFullyApproved = status === 'approved' || status === 'approved by daa';
                                const isRejected = status === 'rejected';

                                return (
                                <tr key={index} style={{ borderBottom: '2px solid #000000', transition: 'background 0.3s ease' }}>
                                    <td style={{ padding: '1.2rem 1rem', color: 'var(--text-main)', fontWeight: '600' }}>{ev['Event Name'] || ev['Event Name '] || ev['EVENT NAME'] || 'N/A'}</td>
                                    <td style={{ padding: '1.2rem 1rem', color: 'var(--text-main)' }}>{ev['Type of Activity'] || ev['Type of Activity '] || ev['TYPE OF EVENT/ACTIVITY'] || ev['Event  Type'] || ev['Category of Activity'] || 'N/A'}</td>
                                    <td style={{ padding: '1.2rem 1rem', color: 'var(--text-main)' }}>{ev['Proposed Date'] || ev['Proposed Date '] || ev['PROPOSED DATE'] || 'N/A'}</td>
                                    <td style={{ padding: '1.2rem 1rem', color: 'var(--text-main)' }}>{ev['Mention Proposed Budget [ in Numbers]'] || ev['Proposed Budget'] || ev['BUDGET USED'] || 'N/A'}</td>
                                    <td style={{ padding: '1.2rem 1rem', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                                        <button 
                                            onClick={() => handleDetailsClick(ev)}
                                            style={{ 
                                                padding: '0.5rem 1rem', 
                                                fontSize: '0.8rem', 
                                                border: '2px solid #000000', 
                                                color: 'var(--bg-main)', 
                                                background: 'var(--text-main)', 
                                                borderRadius: '10px', 
                                                cursor: 'pointer', 
                                                fontWeight: '800',
                                                textTransform: 'uppercase',
                                                boxShadow: '2px 2px 0px #000000, inset 1px 1px 3px rgba(255,255,255,0.1), inset -1px -1px 3px rgba(0,0,0,0.2)',
                                                transition: 'all 0.1s ease'
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.transform = 'translate(-1px, -1px)';
                                                e.currentTarget.style.boxShadow = '3px 3px 0px #000000, inset 1px 1px 3px rgba(255,255,255,0.1), inset -1px -1px 3px rgba(0,0,0,0.2)';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.transform = 'none';
                                                e.currentTarget.style.boxShadow = '2px 2px 0px #000000, inset 1px 1px 3px rgba(255,255,255,0.1), inset -1px -1px 3px rgba(0,0,0,0.2)';
                                            }}
                                            onMouseDown={(e) => {
                                                e.currentTarget.style.transform = 'translate(2px, 2px)';
                                                e.currentTarget.style.boxShadow = '0px 0px 0px #000000';
                                            }}
                                            onMouseUp={(e) => {
                                                e.currentTarget.style.transform = 'translate(-1px, -1px)';
                                                e.currentTarget.style.boxShadow = '3px 3px 0px #000000';
                                            }}
                                        >
                                            Details
                                        </button>
                                        {isFullyApproved ? (
                                            <span style={{ 
                                                padding: '0.5rem 1rem', 
                                                fontSize: '0.8rem', 
                                                color: '#ffffff', 
                                                background: 'linear-gradient(135deg, #059669 0%, #10B981 100%)', 
                                                border: '2px solid #000000', 
                                                borderRadius: '10px', 
                                                fontWeight: '900',
                                                textTransform: 'uppercase',
                                                boxShadow: '2px 2px 0px #000000'
                                            }}>
                                                ✓ Approved
                                            </span>
                                        ) : isRejected ? (
                                            <span style={{ 
                                                padding: '0.5rem 1rem', 
                                                fontSize: '0.8rem', 
                                                color: '#ffffff', 
                                                background: 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)', 
                                                border: '2px solid #000000', 
                                                borderRadius: '10px', 
                                                fontWeight: '900',
                                                textTransform: 'uppercase',
                                                boxShadow: '2px 2px 0px #000000'
                                            }}>
                                                ✗ Rejected
                                            </span>
                                        ) : isFormSubmitted ? (
                                            <span style={{ 
                                                padding: '0.5rem 1rem', 
                                                fontSize: '0.8rem', 
                                                color: '#000000', 
                                                background: 'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)', 
                                                border: '2px solid #000000', 
                                                borderRadius: '10px', 
                                                fontWeight: '900',
                                                textTransform: 'uppercase',
                                                boxShadow: '2px 2px 0px #000000'
                                            }}>
                                                ⏳ Waiting for Approval
                                            </span>
                                        ) : (
                                            <button 
                                                onClick={() => handleApprovalFormClick(ev)}
                                                style={{ 
                                                    padding: '0.5rem 1rem', 
                                                    fontSize: '0.8rem', 
                                                    border: '2px solid #000000', 
                                                    color: '#ffffff', 
                                                    background: 'linear-gradient(135deg, var(--primary) 0%, #8b5cf6 50%, var(--secondary) 100%)', 
                                                    backgroundSize: '200% 200%',
                                                    animation: 'shiftGradient 6s infinite alternate ease-in-out',
                                                    borderRadius: '10px', 
                                                    cursor: 'pointer', 
                                                    fontWeight: '800',
                                                    textTransform: 'uppercase',
                                                    boxShadow: '2px 2px 0px #000000, inset 1px 1px 3px rgba(255,255,255,0.2), inset -1px -1px 3px rgba(0,0,0,0.3)',
                                                    transition: 'all 0.1s ease'
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.transform = 'translate(-1px, -1px)';
                                                    e.currentTarget.style.boxShadow = '3px 3px 0px #000000, inset 1px 1px 3px rgba(255,255,255,0.2), inset -1px -1px 3px rgba(0,0,0,0.3)';
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.transform = 'none';
                                                    e.currentTarget.style.boxShadow = '2px 2px 0px #000000, inset 1px 1px 3px rgba(255,255,255,0.2), inset -1px -1px 3px rgba(0,0,0,0.3)';
                                                }}
                                                onMouseDown={(e) => {
                                                    e.currentTarget.style.transform = 'translate(2px, 2px)';
                                                    e.currentTarget.style.boxShadow = '0px 0px 0px #000000';
                                                }}
                                                onMouseUp={(e) => {
                                                    e.currentTarget.style.transform = 'translate(-1px, -1px)';
                                                    e.currentTarget.style.boxShadow = '3px 3px 0px #000000';
                                                }}
                                            >
                                                Approval Form
                                            </button>
                                        )}
                                    </td>
                                </tr>
                                )})
                        )}
                    </tbody>
                </table>
            </div>

            {isDetailsModalOpen && createPortal(
                <EventDetailsModal 
                    event={selectedEvent} 
                    onClose={() => setIsDetailsModalOpen(false)} 
                />,
                document.body
            )}

            {isDataEntryModalOpen && createPortal(
                <ErrorBoundary>
                    <ApprovalDataEntryModal 
                        event={selectedEvent}
                        clubRecord={getClubRecord(userClub || selectedEvent['Club Name'])}
                        role={userRole}
                        onClose={() => setIsDataEntryModalOpen(false)}
                        onPreviewPdf={handlePreviewPdf}
                        onSubmitSuccess={handleSubmitSuccess}
                    />
                </ErrorBoundary>,
                document.body
            )}

            {isPdfModalOpen && createPortal(
                <ApprovalPdfModal
                    formData={formData}
                    onClose={() => {
                        setIsPdfModalOpen(false);
                        fetchData(userRole, userClub);
                    }}
                />,
                document.body
            )}
        </div>
    );
};

export default ProposedCalendar;
