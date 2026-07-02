import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import styles from './ApprovalModals.module.css';
import ErrorBoundary from './ErrorBoundary';
import ApprovalPdfModal from './ApprovalPdfModal';

const ProposeNewEventForm = () => {
    const [userDetails, setUserDetails] = useState(null);
    const [entityDetails, setEntityDetails] = useState(null);
    const [loadingDetails, setLoadingDetails] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        entryReceivedDate: '',
        entryRegNum: '',
        entryActivityId: '',
        entryEntityType: '',
        entryEntityName: '',
        entryEventName: '',
        entryEventType: '',
        entryEventCategory: '',
        entryOrganizedBy: '',
        entryVenue: '',
        entryDateTime: '',
        entryTechSkill: '',
        entryOtherSkill: '',
        entrySdg: '',
        entryUgc: '',
        entryEventMode: '',
        entryOutcome: '',
        entryParticipantsCount: '',
        entryDescription: '',
        entryCoordName: '',
        entryCoordEid: '',
        entryCoordEmail: '',
        entryCoordDesignation: '',
        entryCoordContact: '',
        entryPartInternal: false,
        entryPartNational: false,
        entryPartInterdept: false,
        entryFundCentral: false,
        entryFundDept: false,
        entryGuestName: '',
        entryGuestAffil: '',
        entryGuestSubject: '',
        entrySection: '',
        entryBudgApproved: '',
        entryBudgUsed: '0',
        entryBudgBalance: '',
        entryBudgSponsor: '',
        entryBudgRequired: '',
        entryDocDetails: false,
        entryDocGuest: false,
        entryDocBudget: false
    });

    const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
    const [pdfFormData, setPdfFormData] = useState(null);

    useEffect(() => {
        const fetchDetails = async () => {
            try {
                const storedUser = localStorage.getItem('user');
                if (storedUser) {
                    const parsedUser = JSON.parse(storedUser);
                    setUserDetails(parsedUser);

                    let role = parsedUser.role_name || '';
                    let defaultEntityType = 'Club';
                    let detailsUrl = '';

                    if (role === 'Department') {
                        defaultEntityType = 'Departmental Society';
                        detailsUrl = 'https://approval-portals.onrender.com/api/department-details';
                    } else if (role === 'Professional Society') {
                        defaultEntityType = 'Professional Society';
                        detailsUrl = 'https://approval-portals.onrender.com/api/professional-details';
                    } else if (role === 'Community') {
                        defaultEntityType = 'Community';
                        detailsUrl = 'https://approval-portals.onrender.com/api/community-details';
                    } else {
                        defaultEntityType = 'Club';
                        detailsUrl = 'https://approval-portals.onrender.com/api/club-details';
                    }

                    // Set default fields based on user details
                    setFormData(prev => ({
                        ...prev,
                        entryEntityType: defaultEntityType,
                        entryEntityName: parsedUser.name || '',
                        entryCoordDesignation: role === 'Club' ? 'Faculty Champion' : ''
                    }));

                    if (detailsUrl) {
                        const res = await fetch(detailsUrl);
                        if (res.ok) {
                            const data = await res.json();
                            if (data && data.details) {
                                const myDetails = data.details.find(
                                    item => item['Registration Name'] === parsedUser.name || item['Club Name'] === parsedUser.name
                                );
                                if (myDetails) {
                                    setEntityDetails(myDetails);
                                    
                                    const approved = myDetails['approved_budget'] ? parseFloat(myDetails['approved_budget']) : 0;
                                    const spent = myDetails['spent_budget'] ? parseFloat(myDetails['spent_budget']) : 0;
                                    const balance = approved - spent;

                                    setFormData(prev => ({
                                        ...prev,
                                        entryRegNum: myDetails['Registration Code'] || parsedUser.registration_code || '',
                                        entryOrganizedBy: myDetails['Cluster / Department'] || myDetails['department_mapped'] || '',
                                        entryCoordName: myDetails['Faculty Champion'] || '',
                                        entryCoordEid: myDetails['Employee ID'] || '',
                                        entryCoordEmail: myDetails['Email ID'] || '',
                                        entryCoordContact: myDetails['Contact Number'] || '',
                                        entryBudgApproved: myDetails['approved_budget'] != null ? String(myDetails['approved_budget']) : '',
                                        entryBudgUsed: String(spent),
                                        entryBudgBalance: myDetails['approved_budget'] != null ? String(balance) : '',
                                        // Specific design constraint: except club in every entity dashboard designation remains empty
                                        entryCoordDesignation: role === 'Club' ? 'Faculty Champion' : ''
                                    }));
                                }
                            }
                        }
                    }
                }
            } catch (err) {
                console.error('Error fetching details:', err);
            } finally {
                setLoadingDetails(false);
            }
        };

        fetchDetails();
    }, []);

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

            // Designation must remain empty for all entities except Club
            const role = userDetails?.role_name || '';
            if (role !== 'Club') {
                updated.entryCoordDesignation = '';
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

    const handleSubmit = async (e) => {
        e.preventDefault();

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

        // Mandatory fields check (excluding specified optional fields)
        const optionalFields = [
            'entryGuestName', 'entryGuestAffil', 'entryGuestSubject', 
            'entrySection', 'entryActivityId', 'entryReceivedDate', 
            'entryBudgSponsor', 'entryTechSkill', 'entryOtherSkill',
            'entrySdg', 'entryUgc', 'entryOutcome', 'entryParticipantsCount',
            'entryDescription', 'entryBudgRequired'
        ];

        for (const [key, value] of Object.entries(formData)) {
            if (typeof value === 'string' && !optionalFields.includes(key)) {
                if (!value || value.trim() === '') {
                    const readableKey = key.replace('entry', '').replace(/([A-Z])/g, ' $1').trim();
                    alert(`Please fill all compulsory fields before proceeding. Missing: ${readableKey}`);
                    return;
                }
            }
        }

        setIsSubmitting(true);

        try {
            // Update budget
            try {
                await fetch('https://approval-portals.onrender.com/api/clubs/update-budget', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        registration_code: formData.entryRegNum,
                        approved_budget: formData.entryBudgApproved,
                        required_budget: formData.entryBudgRequired
                    })
                });
            } catch (error) {
                console.error('Failed to update budget:', error);
            }

            // Submit proposed event
            const res = await fetch('https://approval-portals.onrender.com/api/propose-new-event', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                alert('Event proposed successfully! Generating PDF...');
                setPdfFormData(formData);
                setIsPdfModalOpen(true);
            } else {
                const errData = await res.json();
                alert('Failed to propose event: ' + (errData.error || 'Unknown error'));
            }
        } catch (error) {
            console.error('Submission error:', error);
            alert('An error occurred during submission.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loadingDetails) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '30vh' }}>
                <div style={{ width: '30px', height: '30px', border: '3px solid rgba(79, 70, 229, 0.3)', borderTopColor: '#4F46E5', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            </div>
        );
    }

    const isClub = userDetails?.role_name === 'Club';

    return (
        <div style={{ maxWidth: '900px', margin: '0 auto', animation: 'fadeIn 0.5s ease-out' }}>
            <h2 style={{ fontSize: '1.8rem', color: 'var(--text-main)', marginBottom: '2rem', borderBottom: '2px solid var(--border-color)', paddingBottom: '0.75rem', fontWeight: 800 }}>Propose New Event</h2>
            
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div className={styles.formGrid}>
                    <div className={styles.formGroup}>
                        <label>Received Date (Office Use Only)</label>
                        <input type="text" name="entryReceivedDate" value={formData.entryReceivedDate} onChange={handleChange} disabled placeholder="(only for office use)" />
                    </div>
                    <div className={styles.formGroup}>
                        <label>Registration Entity Number <span style={{color: 'red'}}>*</span></label>
                        <input type="text" name="entryRegNum" value={formData.entryRegNum} onChange={handleChange} required />
                    </div>
                    <div className={styles.formGroup}>
                        <label>Activity ID</label>
                        <input type="text" name="entryActivityId" value={formData.entryActivityId} onChange={handleChange} disabled placeholder="Lock (Fill in Past Events tab only)" />
                    </div>
                    <div className={styles.formGroup}>
                        <label>Entity Type <span style={{color: 'red'}}>*</span></label>
                        <select name="entryEntityType" value={formData.entryEntityType} onChange={handleChange} required>
                            <option value="">-- Select --</option>
                            <option value="Club">Club</option>
                            <option value="Community">Community</option>
                            <option value="Departmental Society">Departmental Society</option>
                            <option value="Professional Society">Professional Society</option>
                        </select>
                    </div>
                    <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                        <label>Entity Name <span style={{color: 'red'}}>*</span></label>
                        <input type="text" name="entryEntityName" value={formData.entryEntityName} onChange={handleChange} required />
                    </div>
                </div>

                <h3 style={{ margin: '1.5rem 0 0.5rem 0', color: 'var(--text-main)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', fontWeight: 700 }}>Event Information</h3>
                
                <div className={styles.formGrid}>
                    <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                        <label>Event Name <span style={{color: 'red'}}>*</span></label>
                        <input type="text" name="entryEventName" value={formData.entryEventName} onChange={handleChange} required />
                    </div>
                    
                    <div className={styles.formGroup}>
                        <label>Event Type <span style={{color: 'red'}}>*</span></label>
                        <select name="entryEventType" value={formData.entryEventType} onChange={handleChange} required>
                            <option value="">-- Select --</option>
                            <option value="Regular">Regular</option>
                            <option value="Core">Core</option>
                            <option value="Flagship">Flagship</option>
                        </select>
                    </div>
                    
                    <div className={styles.formGroup}>
                        <label>Event Category <span style={{color: 'red'}}>*</span></label>
                        <input type="text" name="entryEventCategory" value={formData.entryEventCategory} onChange={handleChange} required />
                    </div>

                    <div className={styles.formGroup}>
                        <label>Event Organized By <span style={{color: 'red'}}>*</span></label>
                        <input type="text" name="entryOrganizedBy" value={formData.entryOrganizedBy} onChange={handleChange} required />
                    </div>
                    
                    <div className={styles.formGroup}>
                        <label>Venue <span style={{color: 'red'}}>*</span></label>
                        <input type="text" name="entryVenue" value={formData.entryVenue} onChange={handleChange} required />
                    </div>

                    <div className={styles.formGroup}>
                        <label>Date & Time <span style={{color: 'red'}}>*</span></label>
                        <input type="datetime-local" name="entryDateTime" value={formData.entryDateTime} onChange={handleChange} required />
                    </div>
                    
                    <div className={styles.formGroup}>
                        <label>Tech Skill</label>
                        <input type="text" name="entryTechSkill" value={formData.entryTechSkill} onChange={handleChange} />
                    </div>

                    <div className={styles.formGroup}>
                        <label>Other Skill</label>
                        <input type="text" name="entryOtherSkill" value={formData.entryOtherSkill} onChange={handleChange} />
                    </div>
                    
                    <div className={styles.formGroup}>
                        <label>SDG</label>
                        <input type="text" name="entrySdg" value={formData.entrySdg} onChange={handleChange} />
                    </div>

                    <div className={styles.formGroup}>
                        <label>UGC Aligned Primary Graduate Attribute</label>
                        <select name="entryUgc" value={formData.entryUgc} onChange={handleChange}>
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
                        <select name="entryEventMode" value={formData.entryEventMode} onChange={handleChange} required>
                            <option value="">-- Select --</option>
                            <option value="Online">Online</option>
                            <option value="Offline">Offline</option>
                            <option value="Hybrid">Hybrid</option>
                        </select>
                    </div>

                    <div className={styles.formGroup}>
                        <label>Outcome of Activity</label>
                        <input type="text" name="entryOutcome" value={formData.entryOutcome} onChange={handleChange} />
                    </div>
                    
                    <div className={styles.formGroup}>
                        <label>Expected Participants Count</label>
                        <input type="number" name="entryParticipantsCount" value={formData.entryParticipantsCount} onChange={handleChange} />
                    </div>

                    <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                        <label>Brief Description</label>
                        <textarea rows="4" name="entryDescription" value={formData.entryDescription} onChange={handleChange} />
                    </div>
                </div>

                <h3 style={{ margin: '1.5rem 0 0.5rem 0', color: 'var(--text-main)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', fontWeight: 700 }}>Coordinator Details</h3>
                
                <div className={styles.formGrid}>
                    <div className={styles.formGroup}>
                        <label>Coordinator / Advisor Name <span style={{color: 'red'}}>*</span></label>
                        <input type="text" name="entryCoordName" value={formData.entryCoordName} onChange={handleChange} required />
                    </div>
                    <div className={styles.formGroup}>
                        <label>EID <span style={{color: 'red'}}>*</span></label>
                        <input type="text" name="entryCoordEid" value={formData.entryCoordEid} onChange={handleChange} required />
                    </div>
                    <div className={styles.formGroup}>
                        <label>Email ID <span style={{color: 'red'}}>*</span></label>
                        <input type="email" name="entryCoordEmail" value={formData.entryCoordEmail} onChange={handleChange} required />
                    </div>
                    <div className={styles.formGroup}>
                        <label>Designation {isClub && <span style={{color: 'red'}}>*</span>}</label>
                        <input 
                            type="text" 
                            name="entryCoordDesignation" 
                            value={formData.entryCoordDesignation} 
                            onChange={handleChange} 
                            disabled={!isClub} 
                            placeholder={!isClub ? "(Designation empty except for Clubs)" : "Designation"}
                            required={isClub}
                        />
                    </div>
                    <div className={styles.formGroup}>
                        <label>Contact Number <span style={{color: 'red'}}>*</span></label>
                        <input type="text" name="entryCoordContact" value={formData.entryCoordContact} onChange={handleChange} required />
                    </div>
                    <div className={styles.formGroup}>
                        <label>Participants Type <span style={{color: 'red'}}>*</span></label>
                        <div style={{ display: 'flex', gap: '15px', paddingTop: '5px' }}>
                            <label className={styles.checkboxContainer}>
                                <input type="checkbox" name="entryPartInternal" checked={formData.entryPartInternal} onChange={handleChange} /> 
                                Internal
                            </label>
                            <label className={styles.checkboxContainer}>
                                <input type="checkbox" name="entryPartNational" checked={formData.entryPartNational} onChange={handleChange} /> 
                                National
                            </label>
                            <label className={styles.checkboxContainer}>
                                <input type="checkbox" name="entryPartInterdept" checked={formData.entryPartInterdept} onChange={handleChange} /> 
                                Interdept
                            </label>
                        </div>
                    </div>
                </div>

                <h3 style={{ margin: '1.5rem 0 0.5rem 0', color: 'var(--text-main)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', fontWeight: 700 }}>Funding & Guest Details</h3>
                
                <div className={styles.formGrid}>
                    <div className={styles.formGroup}>
                        <label>Source of Fund <span style={{color: 'red'}}>*</span></label>
                        <div style={{ display: 'flex', gap: '15px', paddingTop: '5px' }}>
                            <label className={styles.checkboxContainer}>
                                <input type="checkbox" name="entryFundCentral" checked={formData.entryFundCentral} onChange={handleChange} /> 
                                Central
                            </label>
                            <label className={styles.checkboxContainer}>
                                <input type="checkbox" name="entryFundDept" checked={formData.entryFundDept} onChange={handleChange} /> 
                                Dept
                            </label>
                        </div>
                    </div>
                    <div className={styles.formGroup}>
                        <label>Guest Name</label>
                        <input type="text" name="entryGuestName" value={formData.entryGuestName} onChange={handleChange} />
                    </div>
                    <div className={styles.formGroup}>
                        <label>Guest Affiliation / Designation</label>
                        <input type="text" name="entryGuestAffil" value={formData.entryGuestAffil} onChange={handleChange} />
                    </div>
                    <div className={styles.formGroup}>
                        <label>Guest Subject</label>
                        <input type="text" name="entryGuestSubject" value={formData.entryGuestSubject} onChange={handleChange} />
                    </div>
                    <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                        <label>Section [Applicable only when the whole class is participating]</label>
                        <input type="text" name="entrySection" value={formData.entrySection} onChange={handleChange} />
                    </div>
                </div>

                <h3 style={{ margin: '1.5rem 0 0.5rem 0', color: 'var(--text-main)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', fontWeight: 700 }}>Budget Details</h3>
                
                <div className={styles.formGrid}>
                    <div className={styles.formGroup}>
                        <label>Approved Departmental Budget for Current AY <span style={{color: 'red'}}>*</span></label>
                        <input 
                            type="text" 
                            name="entryBudgApproved" 
                            value={formData.entryBudgApproved} 
                            onChange={handleChange} 
                            required
                        />
                    </div>
                    <div className={styles.formGroup}>
                        <label>Budget Used/Spent Till Date <span style={{color: 'red'}}>*</span></label>
                        <input 
                            type="text" 
                            name="entryBudgUsed" 
                            value={formData.entryBudgUsed} 
                            readOnly
                        />
                    </div>
                    <div className={styles.formGroup}>
                        <label>Balance Budget Available <span style={{color: 'red'}}>*</span></label>
                        <input 
                            type="text" 
                            name="entryBudgBalance" 
                            value={formData.entryBudgBalance} 
                            readOnly
                        />
                    </div>
                    <div className={styles.formGroup}>
                        <label>Sponsorship Amount (If Any)</label>
                        <input type="text" name="entryBudgSponsor" value={formData.entryBudgSponsor} onChange={handleChange} />
                    </div>
                    <div className={styles.formGroup}>
                        <label>Budget Required for the Activity/Event <span style={{color: 'red'}}>*</span></label>
                        <input type="text" name="entryBudgRequired" value={formData.entryBudgRequired} onChange={handleChange} required />
                    </div>
                </div>

                <h3 style={{ margin: '1.5rem 0 0.5rem 0', color: 'var(--text-main)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', fontWeight: 700 }}>Required Documents</h3>
                
                <div className={styles.formGroup}>
                    <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', marginBottom: '10px' }}>
                        <label className={styles.checkboxContainer}>
                            <input type="checkbox" name="entryDocDetails" checked={formData.entryDocDetails} onChange={handleChange} /> 
                            M2M
                        </label>
                        <label className={styles.checkboxContainer}>
                            <input type="checkbox" name="entryDocGuest" checked={formData.entryDocGuest} onChange={handleChange} /> 
                            Guest List & Profile
                        </label>
                        <label className={styles.checkboxContainer}>
                            <input type="checkbox" name="entryDocBudget" checked={formData.entryDocBudget} onChange={handleChange} /> 
                            Budget Summary
                        </label>
                    </div>

                    {formData.entryDocDetails && (
                        <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                            <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--text-muted)' }}>Upload M2M in pdf format only (size under 1 MB)</span>
                            <input 
                                type="file" 
                                accept=".pdf" 
                                onChange={(e) => handleFileChange(e, 'docDetailsFile')} 
                                style={{
                                    display: 'block',
                                    width: '100%',
                                    padding: '8px',
                                    border: '2px solid var(--border-color)',
                                    borderRadius: '10px',
                                    background: 'var(--bg-input)',
                                    color: 'var(--text-main)'
                                }}
                            />
                        </div>
                    )}

                    {formData.entryDocGuest && (
                        <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                            <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--text-muted)' }}>Upload Guest List & Profile in pdf format only (size under 1 MB)</span>
                            <input 
                                type="file" 
                                accept=".pdf" 
                                onChange={(e) => handleFileChange(e, 'docGuestFile')} 
                                style={{
                                    display: 'block',
                                    width: '100%',
                                    padding: '8px',
                                    border: '2px solid var(--border-color)',
                                    borderRadius: '10px',
                                    background: 'var(--bg-input)',
                                    color: 'var(--text-main)'
                                }}
                            />
                        </div>
                    )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2rem', gap: '1rem' }}>
                    <button 
                        type="submit" 
                        className={styles.submitBtn} 
                        style={{ padding: '0.85rem 2rem', fontSize: '1rem' }}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? 'Proposing...' : 'Propose & Preview PDF'}
                    </button>
                </div>
            </form>

            {isPdfModalOpen && createPortal(
                <ErrorBoundary>
                    <ApprovalPdfModal
                        formData={pdfFormData}
                        onClose={() => setIsPdfModalOpen(false)}
                    />
                </ErrorBoundary>,
                document.body
            )}
        </div>
    );
};

export default ProposeNewEventForm;
