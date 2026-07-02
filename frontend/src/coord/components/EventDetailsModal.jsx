import React, { useEffect } from 'react';
import styles from './ApprovalModals.module.css';

const EventDetailsModal = ({ event, onClose }) => {
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [onClose]);

    if (!event) return null;

    return (
        <div className={styles.modalOverlay}>
            <div className={styles.modalContent} style={{ maxWidth: '700px' }}>
                <button 
                    onClick={onClose}
                    style={{ position: 'absolute', top: '20px', right: '20px', background: 'transparent', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-main)' }}
                >
                    &times;
                </button>
                <h2>Event <span style={{ color: 'var(--primary)' }}>Details</span></h2>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '15px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.05)', padding: '20px', borderRadius: '12px' }}>
                    {Object.entries(event).map(([key, value]) => {
                        // Skip row index or other internal fields if any
                        if (key === 'row_index') return null;
                        return (
                            <React.Fragment key={key}>
                                <div style={{ fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                                    {key.replace(/_/g, ' ')}
                                </div>
                                <div style={{ color: 'var(--text-main)', wordBreak: 'break-word' }}>
                                    {value || '-'}
                                </div>
                            </React.Fragment>
                        );
                    })}
                </div>
                <div className={styles.modalActions}>
                    <button className={`${styles.navBtn} ${styles.cancelBtn}`} onClick={onClose}>
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EventDetailsModal;
