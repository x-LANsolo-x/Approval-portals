import React, { useState, useEffect } from 'react';
import styles from './EventPublicationForm.module.css';

const EventPublicationForm = () => {
  const [userDetails, setUserDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [publications, setPublications] = useState([]);
  const [formData, setFormData] = useState({
    event_name: '',
    event_description: '',
    event_date: '',
    event_time: '',
    venue: '',
    registration_link: '',
    poster_base64: ''
  });

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        const user = JSON.parse(storedUser);
        setUserDetails(user);
        fetchPublications(user.login_id);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  }, []);

  const fetchPublications = async (login_id) => {
    try {
      const response = await fetch(`http://localhost:8000/api/event-publication/${login_id}`);
      const data = await response.json();
      if (data.success) {
        setPublications(data.data);
      }
    } catch (error) {
      console.error('Error fetching publications:', error);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, poster_base64: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        ...formData,
        login_id: userDetails?.login_id,
        club_name: userDetails?.name
      };

      const response = await fetch('http://localhost:8000/api/event-publication', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (data.success) {
        alert('Event publication request submitted successfully!');
        setFormData({
          event_name: '',
          event_description: '',
          event_date: '',
          event_time: '',
          venue: '',
          registration_link: '',
          poster_base64: ''
        });
        fetchPublications(userDetails?.login_id);
      } else {
        alert('Failed to submit event publication: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Submit error:', error);
      alert('An error occurred while submitting the form.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.grid}>
        
        {/* Form Section */}
        <div className={styles.formCard}>
          <h2 className={styles.cardTitle}>Submit Event for Publication</h2>
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Event Name *</label>
              <input 
                type="text" 
                name="event_name" 
                value={formData.event_name} 
                onChange={handleChange} 
                required 
                className={styles.input}
              />
            </div>
            
            <div className={styles.formRow}>
              <div className={`${styles.formGroup} ${styles.flex1}`} style={{ flex: 1 }}>
                <label className={styles.label}>Event Date *</label>
                <input 
                  type="date" 
                  name="event_date" 
                  value={formData.event_date} 
                  onChange={handleChange} 
                  required 
                  className={styles.input}
                />
              </div>
              <div className={`${styles.formGroup} ${styles.flex1}`} style={{ flex: 1 }}>
                <label className={styles.label}>Event Time</label>
                <input 
                  type="time" 
                  name="event_time" 
                  value={formData.event_time} 
                  onChange={handleChange} 
                  className={styles.input}
                />
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Venue</label>
              <input 
                type="text" 
                name="venue" 
                value={formData.venue} 
                onChange={handleChange} 
                className={styles.input}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Registration Link</label>
              <input 
                type="url" 
                name="registration_link" 
                value={formData.registration_link} 
                onChange={handleChange} 
                placeholder="https://..."
                className={styles.input}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Poster Upload</label>
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleFileChange} 
                className={styles.fileInput}
              />
              {formData.poster_base64 && (
                <div>
                  <img src={formData.poster_base64} alt="Poster Preview" className={styles.imagePreview} />
                </div>
              )}
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Event Description</label>
              <textarea 
                name="event_description" 
                value={formData.event_description} 
                onChange={handleChange} 
                rows="4"
                className={styles.textarea}
              ></textarea>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className={styles.submitBtn}
            >
              {loading ? 'Submitting...' : 'Submit Publication Request'}
            </button>
          </form>
        </div>

        {/* History Section */}
        <div className={styles.historyCard}>
          <h2 className={styles.cardTitle}>Past Publication Requests</h2>
          {publications.length === 0 ? (
            <p className={styles.emptyText}>No publication requests found.</p>
          ) : (
            <div className={styles.historyList}>
              {publications.map((pub, idx) => (
                <div key={idx} className={styles.historyItem}>
                  <h4>{pub.event_name}</h4>
                  <p className={styles.historyMeta}>
                    <strong>Date:</strong> {pub.event_date} {pub.event_time ? `at ${pub.event_time}` : ''}
                  </p>
                  <p className={styles.historyMeta}>
                    <strong>Venue:</strong> {pub.venue || 'N/A'}
                  </p>
                  <div className={styles.statusBadge}>
                    Status: {pub.status}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default EventPublicationForm;
