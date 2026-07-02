import React, { useState, useEffect } from 'react';
import styles from './ApprovalModals.module.css';

const ApprovalDataEntryModal = ({ event, clubRecord, role, onClose, onPreviewPdf, onSubmitSuccess }) => {
    const [formData, setFormData] = useState({});

    useEffect(() => {
        if (event) {
            const venueStr = String(event['Proposed Venue'] || '').toLowerCase();
            const isOnline = venueStr.includes('online') || venueStr.includes('virtual') || venueStr.includes('zoom') || venueStr.includes('webex') || venueStr.includes('meet');
            const sponsorStr = String(event['Industry Association / Sponsorship'] || '');
            const isSponsorTBD = sponsorStr.toLowerCase().includes('tbd') || sponsorStr.toLowerCase().includes('none');

            let defaultEntityType = 'Club';
            if (role === 'Department') defaultEntityType = 'Departmental Society';
            if (role === 'Professional Society') defaultEntityType = 'Professional Society';

            const userDetails = JSON.parse(localStorage.getItem('user') || '{}');
            
            // Format DD-MM-YYYY, DD/MM/YYYY, or YYYY-MM-DD to YYYY-MM-DD for datetime-local input
            let formattedDate = '';
            const rawDate = String(event['Proposed Date'] || '').trim();
            if (rawDate) {
                if (/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
                    formattedDate = `${rawDate}T00:00`;
                } else {
                    const cleanDate = rawDate.split('to')[0].trim();
                    const parts = cleanDate.split(/[-/]/);
                    if (parts.length === 3) {
                        if (parts[0].length === 4) {
                            // Assuming YYYY-MM-DD or YYYY/MM/DD
                            formattedDate = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}T00:00`;
                        } else {
                            // Assuming DD-MM-YYYY or DD/MM/YYYY
                            formattedDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}T00:00`;
                        }
                    }
                }
            }

            const initialData = {
                entryReceivedDate: '',
                entryRegNum: clubRecord?.['Registration Code'] || userDetails?.registration_code || '',
                entryActivityId: '',
                entryEntityType: defaultEntityType,
                entryEntityName: event['Entity Name'] || event['ENTITY NAME'] || event['Club Name'] || clubRecord?.['Registration Name'] || event['Club name'] || '',
                entryEventName: event['Event Name'] || '',
                
                entryEventType: (() => {
                    const typeStr = String(event['Event/activity Type'] || event['Event  Type'] || event['Event Type'] || '').toLowerCase();
                    if (typeStr.includes('regular')) return 'Regular';
                    if (typeStr.includes('core') || typeStr.includes('star')) return 'Core';
                    if (typeStr.includes('flagship')) return 'Flagship';
                    return '';
                })(),
                
                entryEventCategory: event['Type of Activity'] || event['Category of Activity'] || '',
                entryOrganizedBy: clubRecord?.['Cluster / Department'] || event['Department Name'] || event['DEPARTMENT'] || event['Club Name'] || event['Club name'] || '',
                entryVenue: event['Proposed Venue'] || event['VENUE'] || '',
                entryDateTime: formattedDate || rawDate,
                entryTechSkill: '',
                entryOtherSkill: '',
                entrySdg: '',
                entryUgc: '',
                
                entryEventMode: isOnline ? 'Online' : (venueStr ? 'Offline' : ''),
                entryOutcome: event['Excepted Outcome'] || event['OUTCOME OF ACTIVITY'] || '',
                entryParticipantsCount: (parseInt(event['Internal'] || event['PARTICIPANTS'] || '0') + parseInt(event['External'] || '0')) || '',
                entryDescription: event['Descrptions'] || event['Description (minimum in 100 words)'] || '',

                entryCoordName: clubRecord?.['Faculty Champion'] || '',
                entryCoordEid: clubRecord?.['Employee ID'] || '',
                entryCoordEmail: clubRecord?.['Email ID'] || '',
                entryCoordDesignation: (clubRecord && role === 'Club') ? 'Faculty Champion' : '',
                entryCoordContact: clubRecord?.['Contact Number'] || '',

                entryPartInternal: parseInt(event['Internal'] || '0') > 0,
                entryPartNational: false,
                entryPartInterdept: false,

                entryFundCentral: String(event['Source of Fund'] || event['Source of Fund '] || event['SOURCE OF FUND'] || event['Proposed Budget'] || '').toLowerCase().includes('central'),
                entryFundDept: (() => {
                    const fundStr = String(event['Source of Fund'] || event['Source of Fund '] || event['SOURCE OF FUND'] || event['Proposed Budget'] || '').toLowerCase();
                    return fundStr.includes('dept') || fundStr.includes('depart') || fundStr.includes('department');
                })(),
                
                entryGuestName: event['Proposed Collaboration Partner'] || event['GUEST NAME [AFFILIATION/DESIGNATION]'] || '',
                entryGuestAffil: '',
                entryGuestSubject: '',
                entrySection: '',

                entryBudgApproved: clubRecord?.approved_budget != null && clubRecord?.approved_budget !== '' && parseFloat(clubRecord.approved_budget) > 0 ? String(clubRecord.approved_budget) : '',
                entryBudgUsed: clubRecord?.spent_budget !== null && clubRecord?.spent_budget !== undefined ? String(clubRecord.spent_budget) : '0',
                entryBudgBalance: clubRecord?.approved_budget && parseFloat(clubRecord.approved_budget) > 0 ? String(parseFloat(clubRecord.approved_budget) - parseFloat(clubRecord.spent_budget || 0)) : '',
                entryBudgSponsor: isSponsorTBD ? '' : sponsorStr,
                entryBudgRequired: event['Mention Proposed Budget [ in Numbers]'] || event['BUDGET USED'] || '',

                entryDocDetails: false,
                entryDocGuest: false,
                entryDocBudget: true,
            };
            setFormData(initialData);
        }
    }, [event, clubRecord, role]);

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

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => {
            const updated = {
                ...prev,
                [name]: type === 'checkbox' ? checked : value
            };

            // Clear uploaded file if document checkbox is unchecked
            if (name === 'entryDocDetails' && !checked) {
                delete updated.docDetailsFile;
            }
            if (name === 'entryDocGuest' && !checked) {
                delete updated.docGuestFile;
            }
            if (name === 'entryDocBudget' && !checked) {
                delete updated.docBudgetFile;
            }

            // Dynamically calculate balance if approved budget is edited
            if (name === 'entryBudgApproved') {
                const approved = parseFloat(value) || 0;
                const spent = parseFloat(updated.entryBudgUsed) || 0;
                updated.entryBudgBalance = String(approved - spent);
            }

            return updated;
        });
    };

    const handleFileChange = (e, fieldName) => {
        const file = e.target.files[0];
        if (file) {
            if (file.type !== 'application/pdf') {
                alert('Please select a PDF file only.');
                e.target.value = ''; // Reset input
                setFormData(prev => {
                    const updated = { ...prev };
                    delete updated[fieldName];
                    return updated;
                });
                return;
            }
            if (file.size > 1024 * 1024) {
                alert('File size must be under 1 MB.');
                e.target.value = ''; // Reset input
                setFormData(prev => {
                    const updated = { ...prev };
                    delete updated[fieldName];
                    return updated;
                });
                return;
            }
            const reader = new FileReader();
            reader.onload = () => {
                setFormData(prev => ({
                    ...prev,
                    [fieldName]: reader.result
                }));
            };
            reader.readAsDataURL(file);
        } else {
            setFormData(prev => {
                const updated = { ...prev };
                delete updated[fieldName];
                return updated;
            });
        }
    };

    const handlePreviewClick = async () => {
        // Validate compulsory fields
        const optionalFields = [
            'entryGuestName', 'entryGuestAffil', 'entryGuestSubject', 
            'entrySection', 'entryActivityId', 'entryReceivedDate', 
            'entryBudgSponsor', 'entryTechSkill', 'entryOtherSkill',
            'entrySdg', 'entryUgc', 'entryOutcome', 'entryParticipantsCount',
            'entryDescription', 'entryBudgRequired'
        ];
        
        // Validate Participant Type: at least one of entryPartInternal, entryPartNational, entryPartInterdept must be true
        if (!formData.entryPartInternal && !formData.entryPartNational && !formData.entryPartInterdept) {
            alert('Please select at least one Participant Type.');
            return;
        }

        // Validate Source of Fund: at least one of entryFundCentral, entryFundDept must be true
        if (!formData.entryFundCentral && !formData.entryFundDept) {
            alert('Please select at least one Source of Fund.');
            return;
        }

        for (const [key, value] of Object.entries(formData)) {
            // Only validate string fields (skip booleans like checkboxes)
            if (typeof value === 'string' && !optionalFields.includes(key)) {
                if (!value || value.trim() === '') {
                    // Convert camelCase key to a readable format
                    const readableKey = key.replace('entry', '').replace(/([A-Z])/g, ' $1').trim();
                    alert(`Please fill all compulsory fields before proceeding. Missing: ${readableKey}`);
                    return; // Prevent submission
                }
            }
        }

        // Automatically save the approved budget (if new) and increment spent budget
        try {
            await fetch('https://approval-portals.onrender.com/api/clubs/update-budget', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    registration_code: clubRecord['Registration Code'],
                    approved_budget: formData.entryBudgApproved,
                    required_budget: formData.entryBudgRequired
                })
            });
        } catch (error) {
            console.error('Failed to update budget:', error);
        }

        // Save complete form responses to the dedicated Google Sheet
        try {
            const res = await fetch('https://approval-portals.onrender.com/api/approval-forms/submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            if (res.ok && onSubmitSuccess) {
                onSubmitSuccess(formData.entryEventName);
            }
        } catch (error) {
            console.error('Failed to submit form responses:', error);
        }

        onPreviewPdf(formData);
    };

    return (
        <div className={styles.modalOverlay}>
            <div className={styles.modalContent}>
                <h2>Verify & Fill <span style={{color: 'var(--primary)'}}>Approval Form</span></h2>
                <div className={styles.formGrid}>
                    <div className={styles.formGroup}>
                        <label>Received Date</label>
                        <input type="text" name="entryReceivedDate" value={formData.entryReceivedDate || ''} onChange={handleChange} disabled placeholder="(only for office use)" />
                    </div>
                    <div className={styles.formGroup}>
                        <label>Registration Entity Number <span style={{color: 'red'}}>*</span></label>
                        <input type="text" name="entryRegNum" value={formData.entryRegNum || ''} onChange={handleChange} />
                    </div>
                    <div className={styles.formGroup}>
                        <label>Activity ID</label>
                        <input type="text" name="entryActivityId" value={formData.entryActivityId || ''} onChange={handleChange} disabled placeholder="Lock (Fill in Past Events tab only)" />
                    </div>
                    <div className={styles.formGroup}>
                        <label>Entity Type <span style={{color: 'red'}}>*</span></label>
                        <select name="entryEntityType" value={formData.entryEntityType || ''} onChange={handleChange}>
                            <option>Club</option>
                            <option>Community</option>
                            <option>Departmental Society</option>
                            <option>Professional Society</option>
                        </select>
                    </div>

                    <div className={styles.formGroup}>
                        <label>Entity Name <span style={{color: 'red'}}>*</span></label>
                        <input type="text" name="entryEntityName" value={formData.entryEntityName || ''} onChange={handleChange} />
                    </div>
                    <div className={styles.formGroup}>
                        <label>Event Name <span style={{color: 'red'}}>*</span></label>
                        <input type="text" name="entryEventName" value={formData.entryEventName || ''} onChange={handleChange} />
                    </div>

                    <div className={styles.formGroup}>
                        <label>Event Type <span style={{color: 'red'}}>*</span></label>
                        <select name="entryEventType" value={formData.entryEventType || ''} onChange={handleChange}>
                            <option value="">-- Select --</option>
                            <option>Regular</option>
                            <option>Core</option>
                            <option>Flagship</option>
                        </select>
                    </div>
                    <div className={styles.formGroup}>
                        <label>Event Category <span style={{color: 'red'}}>*</span></label>
                        <input type="text" name="entryEventCategory" value={formData.entryEventCategory || ''} onChange={handleChange} />
                    </div>

                    <div className={styles.formGroup}>
                        <label>Event Organized By <span style={{color: 'red'}}>*</span></label>
                        <input type="text" name="entryOrganizedBy" value={formData.entryOrganizedBy || ''} onChange={handleChange} />
                    </div>
                    <div className={styles.formGroup}>
                        <label>Venue <span style={{color: 'red'}}>*</span></label>
                        <input type="text" name="entryVenue" value={formData.entryVenue || ''} onChange={handleChange} />
                    </div>

                    <div className={styles.formGroup}>
                        <label>Date & Time <span style={{color: 'red'}}>*</span></label>
                        <input type="datetime-local" name="entryDateTime" value={formData.entryDateTime || ''} onChange={handleChange} />
                    </div>
                    <div className={styles.formGroup}>
                        <label>Tech Skill <span style={{color: 'red'}}>*</span></label>
                        <input type="text" name="entryTechSkill" value={formData.entryTechSkill || ''} onChange={handleChange} />
                    </div>

                    <div className={styles.formGroup}>
                        <label>Other Skill <span style={{color: 'red'}}>*</span></label>
                        <input type="text" name="entryOtherSkill" value={formData.entryOtherSkill || ''} onChange={handleChange} />
                    </div>
                    <div className={styles.formGroup}>
                        <label>SDG <span style={{color: 'red'}}>*</span></label>
                        <input type="text" name="entrySdg" value={formData.entrySdg || ''} onChange={handleChange} />
                    </div>

                    <div className={styles.formGroup}>
                        <label>UGC Aligned Primary Graduate Attribute <span style={{color: 'red'}}>*</span></label>
                        <select name="entryUgc" value={formData.entryUgc || ''} onChange={handleChange}>
                            <option value="">-- Select --</option>
                            <option value="1. Digital and Technological Skills">1. Digital and Technological Skills</option>
                            <option value="2. Complex Problem-Solving">2. Complex Problem-Solving</option>
                            <option value="3. Disciplinary Knowledge">3. Disciplinary Knowledge</option>
                            <option value="4. Communication Skills">4. Communication Skills</option>
                            <option value="5. Critical Thinking">5. Critical Thinking</option>
                            <option value="6. Environmental Awareness and Action">6. Environmental Awareness and Action</option>
                            <option value="7. Analytical Reasoning/Thinking">7. Analytical Reasoning/Thinking</option>
                            <option value="8. Multicultural Competence and Inclusive Spirit">8. Multicultural Competence and Inclusive Spirit</option>
                            <option value="9. Research-Related Skills">9. Research-Related Skills</option>
                            <option value="10. Coordinating/Collaborating with Others">10. Coordinating/Collaborating with Others</option>
                            <option value="11. Leadership Readiness/Qualities">11. Leadership Readiness/Qualities</option>
                            <option value="12. Creativity">12. Creativity</option>
                            <option value="13. Empathy">13. Empathy</option>
                            <option value="14. Community Engagement and Service">14. Community Engagement and Service</option>
                            <option value="15. Autonomy, Responsibility, and Accountability">15. Autonomy, Responsibility, and Accountability</option>
                            <option value="16. Value Inculcation">16. Value Inculcation</option>
                            <option value="17. Learning How to Learn Skills (Lifelong Learning)">17. Learning How to Learn Skills (Lifelong Learning)</option>
                        </select>
                    </div>
                    <div className={styles.formGroup}>
                        <label>Event Mode <span style={{color: 'red'}}>*</span></label>
                        <select name="entryEventMode" value={formData.entryEventMode || ''} onChange={handleChange}>
                            <option value="">-- Select --</option>
                            <option>Online</option>
                            <option>Offline</option>
                            <option>Hybrid</option>
                        </select>
                    </div>

                    <div className={styles.formGroup}>
                        <label>Outcome of Activity (Auto-filled) <span style={{color: 'red'}}>*</span></label>
                        <input type="text" name="entryOutcome" value={formData.entryOutcome || ''} onChange={handleChange} />
                    </div>
                    <div className={styles.formGroup}>
                        <label>Expected Participants Count (Auto-filled) <span style={{color: 'red'}}>*</span></label>
                        <input type="text" name="entryParticipantsCount" value={formData.entryParticipantsCount || ''} onChange={handleChange} />
                    </div>

                    <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                        <label>Brief Description (Auto-filled) <span style={{color: 'red'}}>*</span></label>
                        <textarea rows="4" name="entryDescription" value={formData.entryDescription || ''} onChange={handleChange} />
                    </div>

                    <h3>Coordinator Details</h3>
                    
                    <div className={styles.formGroup}>
                        <label>Coordinator / Advisor Name <span style={{color: 'red'}}>*</span></label>
                        <input type="text" name="entryCoordName" value={formData.entryCoordName || ''} onChange={handleChange} />
                    </div>
                    <div className={styles.formGroup}>
                        <label>EID <span style={{color: 'red'}}>*</span></label>
                        <input type="text" name="entryCoordEid" value={formData.entryCoordEid || ''} onChange={handleChange} />
                    </div>
                    <div className={styles.formGroup}>
                        <label>Email ID <span style={{color: 'red'}}>*</span></label>
                        <input type="text" name="entryCoordEmail" value={formData.entryCoordEmail || ''} onChange={handleChange} />
                    </div>
                    <div className={styles.formGroup}>
                        <label>Designation <span style={{color: 'red'}}>*</span></label>
                        <input type="text" name="entryCoordDesignation" value={formData.entryCoordDesignation || ''} onChange={handleChange} />
                    </div>
                    <div className={styles.formGroup}>
                        <label>Contact Number <span style={{color: 'red'}}>*</span></label>
                        <input type="text" name="entryCoordContact" value={formData.entryCoordContact || ''} onChange={handleChange} />
                    </div>
                    <div className={styles.formGroup}>
                        <label>Participants Type <span style={{color: 'red'}}>*</span></label>
                        <div style={{ display: 'flex', gap: '15px', paddingTop: '5px' }}>
                            <label className={styles.checkboxContainer}>
                                <input type="checkbox" name="entryPartInternal" checked={formData.entryPartInternal || false} onChange={handleChange} /> 
                                Internal
                            </label>
                            <label className={styles.checkboxContainer}>
                                <input type="checkbox" name="entryPartNational" checked={formData.entryPartNational || false} onChange={handleChange} /> 
                                National
                            </label>
                            <label className={styles.checkboxContainer}>
                                <input type="checkbox" name="entryPartInterdept" checked={formData.entryPartInterdept || false} onChange={handleChange} /> 
                                Interdept
                            </label>
                        </div>
                    </div>

                    <h3>Funding & Guest Details</h3>

                    <div className={styles.formGroup}>
                        <label>Source of Fund <span style={{color: 'red'}}>*</span></label>
                        <div style={{ display: 'flex', gap: '15px', paddingTop: '5px' }}>
                            <label className={styles.checkboxContainer}>
                                <input type="checkbox" name="entryFundCentral" checked={formData.entryFundCentral || false} onChange={handleChange} /> 
                                Central
                            </label>
                            <label className={styles.checkboxContainer}>
                                <input type="checkbox" name="entryFundDept" checked={formData.entryFundDept || false} onChange={handleChange} /> 
                                Dept
                            </label>
                        </div>
                    </div>
                    <div className={styles.formGroup}>
                        <label>Guest Name</label>
                        <input type="text" name="entryGuestName" value={formData.entryGuestName || ''} onChange={handleChange} />
                    </div>
                    <div className={styles.formGroup}>
                        <label>Guest Affiliation / Designation</label>
                        <input type="text" name="entryGuestAffil" value={formData.entryGuestAffil || ''} onChange={handleChange} />
                    </div>
                    <div className={styles.formGroup}>
                        <label>Guest Subject</label>
                        <input type="text" name="entryGuestSubject" value={formData.entryGuestSubject || ''} onChange={handleChange} />
                    </div>
                    <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                        <label>Section [Applicable only when the whole class is participating]</label>
                        <input type="text" name="entrySection" value={formData.entrySection || ''} onChange={handleChange} />
                    </div>

                    <h3>Budget Details</h3>
                    <div className={styles.formGroup}>
                        <label>Approved Departmental Budget for Current AY [26–27 (for Activities/Events)] <span style={{color: 'red'}}>*</span></label>
                        <input 
                            type="text" 
                            name="entryBudgApproved" 
                            value={formData.entryBudgApproved || ''} 
                            onChange={handleChange} 
                            readOnly={clubRecord?.approved_budget != null && clubRecord?.approved_budget !== '' && parseFloat(clubRecord.approved_budget) > 0}
                        />
                    </div>
                    <div className={styles.formGroup}>
                        <label>Budget Used/Spent Till Date [AY 2026-2027] <span style={{color: 'red'}}>*</span></label>
                        <input 
                            type="text" 
                            name="entryBudgUsed" 
                            value={formData.entryBudgUsed || ''} 
                            readOnly
                        />
                    </div>
                    <div className={styles.formGroup}>
                        <label>Balance Budget Available <span style={{color: 'red'}}>*</span></label>
                        <input 
                            type="text" 
                            name="entryBudgBalance" 
                            value={formData.entryBudgBalance || ''} 
                            readOnly
                        />
                    </div>
                    <div className={styles.formGroup}>
                        <label>Sponsorship Amount (If Any) <span style={{color: 'red'}}>*</span></label>
                        <input type="text" name="entryBudgSponsor" value={formData.entryBudgSponsor || ''} onChange={handleChange} />
                    </div>
                    <div className={styles.formGroup}>
                        <label>Budget Required for the Activity/Event <span style={{color: 'red'}}>*</span></label>
                        <input type="text" name="entryBudgRequired" value={formData.entryBudgRequired || ''} onChange={handleChange} />
                    </div>

                    <h3>Required Documents</h3>
                    <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                        <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', marginBottom: '10px' }}>
                            <label className={styles.checkboxContainer}>
                                <input type="checkbox" name="entryDocDetails" checked={formData.entryDocDetails || false} onChange={handleChange} /> 
                                M2M
                            </label>
                            <label className={styles.checkboxContainer}>
                                <input type="checkbox" name="entryDocGuest" checked={formData.entryDocGuest || false} onChange={handleChange} /> 
                                Guest List & Profile
                            </label>
                            <label className={styles.checkboxContainer}>
                                <input type="checkbox" name="entryDocBudget" checked={formData.entryDocBudget || false} onChange={handleChange} /> 
                                Budget Summary
                            </label>
                        </div>
                        
                        {formData.entryDocDetails && (
                            <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                <span style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>Upload M2M in pdf format only (size under 1 MB)</span>
                                <input 
                                    type="file" 
                                    accept=".pdf" 
                                    onChange={(e) => handleFileChange(e, 'docDetailsFile')} 
                                    style={{
                                        display: 'block',
                                        width: '100%',
                                        padding: '8px',
                                        border: '1px solid #ccc',
                                        borderRadius: '4px',
                                        background: '#1e293b',
                                        color: '#ffffff'
                                    }}
                                />
                            </div>
                        )}
                        {formData.entryDocGuest && (
                            <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                <span style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>Upload Guest List & Profile in pdf format only (size under 1 MB)</span>
                                <input 
                                    type="file" 
                                    accept=".pdf" 
                                    onChange={(e) => handleFileChange(e, 'docGuestFile')} 
                                    style={{
                                        display: 'block',
                                        width: '100%',
                                        padding: '8px',
                                        border: '1px solid #ccc',
                                        borderRadius: '4px',
                                        background: '#1e293b',
                                        color: '#ffffff'
                                    }}
                                />
                            </div>
                        )}
                    </div>

                </div>
                <div className={styles.modalActions}>
                    <button className={`${styles.navBtn} ${styles.cancelBtn}`} onClick={onClose}>Cancel</button>
                    <button className={`${styles.navBtn} ${styles.submitBtn}`} onClick={handlePreviewClick}>Preview & Generate PDF</button>
                </div>
            </div>
        </div>
    );
};

export default ApprovalDataEntryModal;
