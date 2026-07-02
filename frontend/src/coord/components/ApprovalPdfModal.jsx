import React, { useRef, useState, useEffect } from 'react';
import html2pdf from 'html2pdf.js';
import { PDFDocument } from 'pdf-lib';
import styles from './ApprovalModals.module.css';

const ApprovalPdfModal = ({ formData, onClose }) => {
    const pdfContainerRef = useRef(null);
    const [isGenerating, setIsGenerating] = useState(false);

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

    if (!formData) return null;

    const handleGeneratePdf = () => {
        setIsGenerating(true);
        const element = pdfContainerRef.current;
        
        const opt = {
            margin:       0,
            filename:     'Event_Approval_Form.pdf',
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 2, useCORS: true },
            jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        // Temporary styles for modal to avoid cropping
        const originalOverflow = element.parentElement.style.overflowY;
        const originalPosition = element.parentElement.style.position;
        const originalHeight = element.parentElement.style.height;
        
        element.parentElement.style.overflowY = 'visible';
        element.parentElement.style.position = 'absolute';
        element.parentElement.style.height = 'auto';
        
        const originalGap = element.style.gap;
        element.style.gap = '0px';

        html2pdf().set(opt).from(element).toPdf().get('pdf').output('arraybuffer').then(async (pdfBuffer) => {
            const uploads = [];
            if (formData.entryDocDetails && formData.docDetailsFile) {
                uploads.push(formData.docDetailsFile);
            }
            if (formData.entryDocGuest && formData.docGuestFile) {
                uploads.push(formData.docGuestFile);
            }

            let finalPdfBytes = new Uint8Array(pdfBuffer);
            if (uploads.length > 0) {
                try {
                    const mergedPdf = await PDFDocument.create();
                    
                    const mainPdf = await PDFDocument.load(pdfBuffer);
                    const mainPages = await mergedPdf.copyPages(mainPdf, mainPdf.getPageIndices());
                    mainPages.forEach((page) => mergedPdf.addPage(page));
                    
                    for (const base64Str of uploads) {
                        const cleanBase64 = base64Str.includes('base64,') 
                            ? base64Str.split('base64,')[1] 
                            : base64Str;
                        const uploadedPdfBytes = Uint8Array.from(atob(cleanBase64), c => c.charCodeAt(0));
                        const uploadedPdf = await PDFDocument.load(uploadedPdfBytes);
                        const uploadedPages = await mergedPdf.copyPages(uploadedPdf, uploadedPdf.getPageIndices());
                        uploadedPages.forEach((page) => mergedPdf.addPage(page));
                    }
                    
                    finalPdfBytes = await mergedPdf.save();
                } catch (mergeErr) {
                    console.error('Error merging PDFs:', mergeErr);
                    alert('Failed to merge uploaded documents into the PDF. Downloading main form only.');
                }
            }

            const blob = new Blob([finalPdfBytes], { type: 'application/pdf' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = 'Event_Approval_Form.pdf';
            link.click();
            URL.revokeObjectURL(link.href);

            setIsGenerating(false);
            element.style.gap = originalGap;
            element.parentElement.style.overflowY = originalOverflow;
            element.parentElement.style.position = originalPosition;
            element.parentElement.style.height = originalHeight;
        }).catch(err => {
            console.error('PDF Generation Error:', err);
            setIsGenerating(false);
            element.style.gap = originalGap;
            element.parentElement.style.overflowY = originalOverflow;
            element.parentElement.style.position = originalPosition;
            element.parentElement.style.height = originalHeight;
        });
    };

    return (
        <div className={styles.approvalModalOverlay}>
            <div className={styles.approvalModalContent} style={{ position: 'relative' }}>
                <div className={styles.approvalControls}>
                    <button className={styles.navBtn} onClick={onClose} style={{ borderColor: '#ccc', color: '#ccc' }}>Cancel</button>
                    <button className={styles.navBtn} onClick={handleGeneratePdf} style={{ borderColor: '#ffaa00', color: '#ffaa00' }} disabled={isGenerating}>
                        {isGenerating ? 'Generating...' : 'Generate & Download PDF'}
                    </button>
                </div>

                <div id="pdfContainer" ref={pdfContainerRef} className={styles.pdfContainer}>
                    {/* PAGE 1 */}
                    <div className={styles.a4Document}>
                        <div className={styles.docHeaderLogos}>
                            <div style={{ flex: 1, textAlign: 'left' }}><img src="/cu-logo.png" alt="CU Logo" className={styles.docLogo} /></div>
                            <div style={{ flex: 1, textAlign: 'center' }}><img src="/naac-logo.png" alt="NAAC A+" className={styles.docLogo} /></div>
                            <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
                                <div style={{ position: 'relative', top: '-6px', display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '60px', fontFamily: 'Arial, Helvetica, sans-serif', lineHeight: 1.1 }}>
                                    <div style={{ color: '#e31837', fontSize: '24px', fontWeight: 'bold', textAlign: 'left', marginBottom: '2px' }}>Office of</div>
                                    <div style={{ color: '#000000', fontSize: '24px', fontWeight: 'bold', textAlign: 'left' }}>Academic Affairs</div>
                                </div>
                            </div>
                        </div>

                        <div className={styles.docTitle} style={{ marginBottom: formData.entryFundCentral ? '5px' : '20px' }}>
                            CO-CURRICULAR ACTIVITY / EVENT APPROVAL FORM
                        </div>
                        {formData.entryFundCentral && (
                            <div style={{ textAlign: 'center', fontSize: '12pt', fontWeight: 'normal', color: '#000000', marginBottom: '15px' }}>
                                (This form is only applicable for OAA budget events)
                            </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
                            <div className={styles.formRow}>
                                <span className={styles.formLabel}>Received Date (For Office Use):</span>
                                <span className={styles.pdfValue} style={{ width: '150px' }}>{formData.entryReceivedDate}</span>
                            </div>
                        </div>

                        <div className={styles.grid2Col}>
                            <div className={styles.formRow}>
                                <span className={styles.formLabel}>Registration Entity Number:</span>
                                <span className={styles.pdfValue}>{formData.entryRegNum}</span>
                            </div>
                            <div className={styles.formRow}>
                                <span className={styles.formLabel}>Activity ID <span style={{ fontSize: '8pt', fontWeight: 'normal' }}>(After CUIMS Punching)</span>:</span>
                                <span className={styles.pdfValue}>{formData.entryActivityId}</span>
                            </div>
                        </div>

                        <div className={styles.formRow} style={{ marginTop: '5px', alignItems: 'center', gap: '10px' }}>
                            <span className={styles.formLabel}>Entity Type:</span>
                            <label className={styles.checkboxItem}><input type="checkbox" checked={formData.entryEntityType === 'Club'} readOnly /> Club</label>
                            <label className={styles.checkboxItem}><input type="checkbox" checked={formData.entryEntityType === 'Community'} readOnly /> Community</label>
                            <label className={styles.checkboxItem}><input type="checkbox" checked={formData.entryEntityType === 'Departmental Society'} readOnly /> Departmental Society</label>
                            <label className={styles.checkboxItem}><input type="checkbox" checked={formData.entryEntityType === 'Professional Society'} readOnly /> Professional Society</label>
                        </div>

                        <div className={styles.formRow} style={{ marginTop: '5px' }}>
                            <span className={styles.formLabel}>Entity Name:</span>
                            <span className={styles.pdfValue}>{formData.entryEntityName}</span>
                        </div>

                        <div className={styles.sectionDivider}>EVENT INFORMATION</div>

                        <div className={styles.formRow}>
                            <span className={styles.formLabel}>Event Name:</span>
                            <div className={styles.pdfValue} style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{formData.entryEventName}</div>
                        </div>

                        <div className={styles.grid2Col}>
                            <div className={styles.formRow} style={{ alignItems: 'center', gap: '10px' }}>
                                <span className={styles.formLabel}>Event Type:</span>
                                <label className={styles.checkboxItem}><input type="checkbox" checked={formData.entryEventType === 'Regular'} readOnly /> Regular</label>
                                <label className={styles.checkboxItem}><input type="checkbox" checked={formData.entryEventType === 'Core'} readOnly /> Core</label>
                                <label className={styles.checkboxItem}><input type="checkbox" checked={formData.entryEventType === 'Flagship'} readOnly /> Flagship</label>
                            </div>
                            <div className={styles.formRow}>
                                <span className={styles.formLabel}>Event Category:</span>
                                <span className={styles.pdfValue}>{formData.entryEventCategory}</span>
                            </div>
                        </div>

                        <div className={styles.formRow}>
                            <span className={styles.formLabel}>Event Organized By (Dept./Inst./Club):</span>
                            <span className={styles.pdfValue}>{formData.entryOrganizedBy}</span>
                        </div>

                        <div className={styles.grid2Col}>
                            <div className={styles.formRow}>
                                <span className={styles.formLabel}>Venue:</span>
                                <div className={styles.pdfValue} style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{formData.entryVenue}</div>
                            </div>
                            <div className={styles.formRow}>
                                <span className={styles.formLabel}>Date & Time:</span>
                                <span className={styles.pdfValue}>{formData.entryDateTime}</span>
                            </div>
                        </div>

                        <div className={styles.grid2Col}>
                            <div className={styles.formRow}>
                                <span className={styles.formLabel}>Tech Skill:</span>
                                <span className={styles.pdfValue}>{formData.entryTechSkill}</span>
                            </div>
                            <div className={styles.formRow}>
                                <span className={styles.formLabel}>Other Skill:</span>
                                <span className={styles.pdfValue}>{formData.entryOtherSkill}</span>
                            </div>
                        </div>

                        <div className={styles.grid2Col}>
                            <div className={styles.formRow}>
                                <span className={styles.formLabel}>SDG:</span>
                                <span className={styles.pdfValue}>{formData.entrySdg}</span>
                            </div>
                            <div className={styles.formRow}>
                                <span className={styles.formLabel}>UGC Aligned Primary Graduate Attribute:</span>
                                <span className={styles.pdfValue}>{formData.entryUgc}</span>
                            </div>
                        </div>

                        <div className={styles.grid2Col}>
                            <div className={styles.formRow} style={{ alignItems: 'center', gap: '10px' }}>
                                <span className={styles.formLabel}>Event Mode:</span>
                                <label className={styles.checkboxItem}><input type="checkbox" checked={formData.entryEventMode === 'Online'} readOnly /> Online</label>
                                <label className={styles.checkboxItem}><input type="checkbox" checked={formData.entryEventMode === 'Offline'} readOnly /> Offline</label>
                                <label className={styles.checkboxItem}><input type="checkbox" checked={formData.entryEventMode === 'Hybrid'} readOnly /> Hybrid</label>
                            </div>
                            <div className={styles.formRow}>
                                <span className={styles.formLabel}>Outcome of Activity:</span>
                                <div className={styles.pdfValue} style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{formData.entryOutcome}</div>
                            </div>
                        </div>

                        <div className={styles.sectionDivider}>COORDINATOR DETAILS</div>

                        <div className={styles.grid2Col}>
                            <div className={styles.formRow}>
                                <span className={styles.formLabel}>Coordinator / Advisor Name:</span>
                                <span className={styles.pdfValue}>{formData.entryCoordName}</span>
                            </div>
                            <div className={styles.formRow}>
                                <span className={styles.formLabel}>EID:</span>
                                <span className={styles.pdfValue}>{formData.entryCoordEid}</span>
                            </div>
                        </div>

                        <div className={styles.grid2Col}>
                            <div className={styles.formRow}>
                                <span className={styles.formLabel}>Email ID:</span>
                                <span className={styles.pdfValue}>{formData.entryCoordEmail}</span>
                            </div>
                            <div className={styles.formRow}>
                                <span className={styles.formLabel}>Designation:</span>
                                <span className={styles.pdfValue}>{formData.entryCoordDesignation}</span>
                            </div>
                        </div>

                        <div className={styles.formRow}>
                            <span className={styles.formLabel}>Contact Number:</span>
                            <span className={styles.pdfValue}>{formData.entryCoordContact}</span>
                        </div>

                        <div className={styles.sectionDivider}>PARTICIPANTS</div>

                        <div className={styles.grid2Col}>
                            <div className={styles.formRow} style={{ alignItems: 'center', gap: '10px' }}>
                                <span className={styles.formLabel}>Type:</span>
                                <label className={styles.checkboxItem}><input type="checkbox" checked={formData.entryPartInternal} readOnly /> Internal</label>
                                <label className={styles.checkboxItem}><input type="checkbox" checked={formData.entryPartNational} readOnly /> National</label>
                                <label className={styles.checkboxItem}><input type="checkbox" checked={formData.entryPartInterdept} readOnly /> Interdepartmental</label>
                            </div>
                            <div className={styles.formRow}>
                                <span className={styles.formLabel}>Expected Participants Count:</span>
                                <span className={styles.pdfValue}>{formData.entryParticipantsCount}</span>
                            </div>
                        </div>

                        <div className={styles.sectionDivider}>BRIEF DESCRIPTION OF EVENT</div>

                        <div style={{ minHeight: '60px' }}>
                            <div className={styles.pdfValue} style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', display: formData.entryDescription ? 'block' : 'none' }}>
                                {formData.entryDescription}
                            </div>
                            {!formData.entryDescription && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', paddingTop: '15px', marginBottom: '15px' }}>
                                    <div style={{ borderBottom: '1px solid #000' }}></div>
                                    <div style={{ borderBottom: '1px solid #000' }}></div>
                                    <div style={{ borderBottom: '1px solid #000' }}></div>
                                    <div style={{ borderBottom: '1px solid #000' }}></div>
                                </div>
                            )}
                        </div>

                        <div className={styles.sectionDivider}>REVIEW BY OAA</div>
                        <div style={{ marginTop: '20px', marginBottom: '20px' }}>
                            <div style={{ borderBottom: '1px solid #000', width: '100%', height: '20px' }}></div>
                        </div>

                    </div> {/* End Page 1 */}

                    {/* PAGE 2 */}
                    <div className={styles.a4Document}>
                        <div className={styles.docHeaderLogos}>
                            <div style={{ flex: 1, textAlign: 'left' }}><img src="/cu-logo.png" alt="CU Logo" className={styles.docLogo} /></div>
                            <div style={{ flex: 1, textAlign: 'center' }}><img src="/naac-logo.png" alt="NAAC A+" className={styles.docLogo} /></div>
                            <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
                                <div style={{ position: 'relative', top: '-6px', display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '60px', fontFamily: 'Arial, Helvetica, sans-serif', lineHeight: 1.1 }}>
                                    <div style={{ color: '#e31837', fontSize: '24px', fontWeight: 'bold', textAlign: 'left', marginBottom: '2px' }}>Office of</div>
                                    <div style={{ color: '#000000', fontSize: '24px', fontWeight: 'bold', textAlign: 'left' }}>Academic Affairs</div>
                                </div>
                            </div>
                        </div>

                        <div className={styles.grid2Col}>
                            <div>
                                <div className={styles.sectionDivider} style={{ marginTop: 0 }}>FUNDING INFORMATION</div>
                                <div className={styles.formRow} style={{ marginTop: '10px', alignItems: 'center', gap: '10px' }}>
                                    <span className={styles.formLabel}>Source of Fund:</span>
                                    <label className={styles.checkboxItem}><input type="checkbox" checked={formData.entryFundCentral} readOnly /> Central</label>
                                    <label className={styles.checkboxItem}><input type="checkbox" checked={formData.entryFundDept} readOnly /> Department</label>
                                </div>

                                <div className={styles.sectionDivider} style={{ marginTop: '20px' }}>GUEST DETAILS</div>
                                <div className={styles.formRow}>
                                    <span className={styles.formLabel}>Guest Name:</span>
                                    <span className={styles.pdfValue}>{formData.entryGuestName}</span>
                                </div>
                                <div className={styles.formRow}>
                                    <span className={styles.formLabel}>Affiliation / Designation:</span>
                                    <span className={styles.pdfValue}>{formData.entryGuestAffil}</span>
                                </div>
                                <div className={styles.formRow}>
                                    <span className={styles.formLabel}>Subject:</span>
                                    <span className={styles.pdfValue}>{formData.entryGuestSubject}</span>
                                </div>

                                <div className={styles.sectionDivider} style={{ marginTop: '20px' }}>SECTION</div>
                                <div style={{ textAlign: 'center', fontSize: '8pt', fontStyle: 'italic', marginTop: '-5px', marginBottom: '10px', color: '#555' }}>
                                    [Applicable only when the whole class is participating]
                                </div>
                                <div className={styles.formRow}>
                                    <span className={styles.pdfValue} style={{ width: '100%' }}>{formData.entrySection}</span>
                                </div>
                            </div>

                            <div>
                                <div className={styles.sectionDivider} style={{ marginTop: 0 }}>BUDGET DETAILS</div>
                                <table className={styles.budgetTable}>
                                    <tbody>
                                        <tr>
                                            <th>Particulars</th>
                                            <th>Amount (in Rupees)</th>
                                        </tr>
                                        <tr>
                                            <td>Approved Departmental Budget for Current AY [26–27 (for Activities/Events)]</td>
                                            <td><span className={styles.pdfValue} style={{ border: 'none' }}>{formData.entryBudgApproved}</span></td>
                                        </tr>
                                        <tr>
                                            <td>Budget Used/Spent Till Date [AY 2026-2027]</td>
                                            <td><span className={styles.pdfValue} style={{ border: 'none' }}>{formData.entryBudgUsed}</span></td>
                                        </tr>
                                        <tr>
                                            <td>Balance Budget Available</td>
                                            <td><span className={styles.pdfValue} style={{ border: 'none' }}>{formData.entryBudgBalance}</span></td>
                                        </tr>
                                        <tr>
                                            <td>Sponsorship Amount (If Any)</td>
                                            <td><span className={styles.pdfValue} style={{ border: 'none' }}>{formData.entryBudgSponsor}</span></td>
                                        </tr>
                                        <tr>
                                            <td>Budget Required for the Activity/Event</td>
                                            <td><span className={styles.pdfValue} style={{ border: 'none' }}>{formData.entryBudgRequired}</span></td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className={styles.sectionDivider}>REQUIRED DOCUMENTS</div>

                        <div className={styles.formRow} style={{ justifyContent: 'space-around', marginTop: '10px' }}>
                            <label className={styles.checkboxItem}><input type="checkbox" checked={formData.entryDocDetails} readOnly /> M2M</label>
                            <label className={styles.checkboxItem}><input type="checkbox" checked={formData.entryDocGuest} readOnly /> Guest List & Profile</label>
                            <label className={styles.checkboxItem}><input type="checkbox" checked={formData.entryDocBudget} readOnly /> <span>Budget Summary</span></label>
                        </div>

                        <div className={styles.sectionDivider}>OFFICE BEARER</div>
                        
                        <div className={styles.signaturesRow}>
                            <div className={styles.signatureBlock}>
                                <div className={styles.signatureLine}>Faculty champion/Chapter advisor</div>
                            </div>
                            <div className={styles.signatureBlock} style={{ width: '25%' }}>
                                <div className={styles.signatureLine}>Co-Curricular Coordinator<br />/Branch Counsellor</div>
                            </div>
                            <div className={styles.signatureBlock}>
                                <div className={styles.signatureLine}>HoD</div>
                            </div>
                            <div className={styles.signatureBlock} style={{ width: '25%' }}>
                                <div className={styles.signatureLine}>PVC- Academic Affair<br />[Associate/Assistant Dean]</div>
                            </div>
                        </div>

                        <div className={styles.sectionDivider}>CU ACADEMIC LEADER</div>

                        <div>
                            <div className={styles.signaturesRow} style={{ justifyContent: 'space-around' }}>
                                <div className={styles.signatureBlock} style={{ width: '30%' }}>
                                    <div className={styles.signatureLine}>Associate Director / Director<br />/Principal/Dean</div>
                                </div>
                                <div className={styles.signatureBlock} style={{ width: '30%' }}>
                                    <div className={styles.signatureLine}>Executive Director</div>
                                </div>
                            </div>
                            <div className={styles.signaturesRow} style={{ justifyContent: 'space-around', marginTop: '20px' }}>
                                <div className={styles.signatureBlock} style={{ width: '30%' }}>
                                    <div className={styles.signatureLine}>Pro Vice Chancellor<br />(Academic Affairs)</div>
                                </div>
                                <div className={styles.signatureBlock} style={{ width: '30%' }}>
                                    <div className={styles.signatureLine}>Pro Vice Chancellor</div>
                                </div>
                            </div>
                        </div>

                    </div> {/* End Page 2 */}

                    {/* PAGE 3 */}
                    <div className={styles.a4Document}>
                        <div className={styles.docHeaderLogos}>
                            <div style={{ flex: 1, textAlign: 'left' }}><img src="/cu-logo.png" alt="CU Logo" className={styles.docLogo} /></div>
                            <div style={{ flex: 1, textAlign: 'center' }}><img src="/naac-logo.png" alt="NAAC A+" className={styles.docLogo} /></div>
                            <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
                                <div style={{ position: 'relative', top: '-6px', display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '60px', fontFamily: 'Arial, Helvetica, sans-serif', lineHeight: 1.1 }}>
                                    <div style={{ color: '#e31837', fontSize: '24px', fontWeight: 'bold', textAlign: 'left', marginBottom: '2px' }}>Office of</div>
                                    <div style={{ color: '#000000', fontSize: '24px', fontWeight: 'bold', textAlign: 'left' }}>Academic Affairs</div>
                                </div>
                            </div>
                        </div>

                        <h2 style={{ textAlign: 'center', fontFamily: '"Times New Roman", Times, serif', marginBottom: '30px', fontSize: '16pt' }}>Detailed Budget Requirement for Activity/Event</h2>

                        <table className={styles.budgetTable} style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr>
                                    <th style={{ width: '8%' }}>Sr. No.</th>
                                    <th style={{ width: '22%' }}>Department</th>
                                    <th style={{ width: '40%' }}>Item</th>
                                    <th style={{ width: '15%' }}>Quantity</th>
                                    <th style={{ width: '15%' }}>Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {[...Array(15)].map((_, i) => (
                                    <tr key={i}>
                                        <td style={{ textAlign: 'center', height: '35px' }}>{i + 1}</td>
                                        <td></td><td></td><td></td><td></td>
                                    </tr>
                                ))}
                                <tr>
                                    <td colSpan="4" style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '14pt', height: '40px' }}>Total</td>
                                    <td></td>
                                </tr>
                                <tr>
                                    <td colSpan="2" style={{ fontWeight: 'bold', textAlign: 'center', height: '60px' }}>Total Amount<br />[In Words]</td>
                                    <td colSpan="3"></td>
                                </tr>
                            </tbody>
                        </table>

                        <div className={styles.signaturesRow} style={{ justifyContent: 'space-around', marginTop: '60px' }}>
                            <div className={styles.signatureBlock} style={{ width: '30%' }}>
                                <div className={styles.signatureLine}>Faculty champion/Chapter advisor</div>
                            </div>
                            <div className={styles.signatureBlock} style={{ width: '30%' }}>
                                <div className={styles.signatureLine}>HoD</div>
                            </div>
                        </div>
                    </div> {/* End Page 3 */}

                </div> {/* End pdfContainer */}
            </div>
        </div>
    );
};

export default ApprovalPdfModal;
