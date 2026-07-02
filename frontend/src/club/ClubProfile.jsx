import React, { useEffect, useState } from 'react';
import styles from './ClubProfile.module.css';

const ClubProfile = () => {
  const [userDetails, setUserDetails] = useState(null);
  const [clubData, setClubData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchClubData = async () => {
      try {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          setUserDetails(parsedUser);
          
          const res = await fetch("http://localhost:8000/api/club-details");
          if (!res.ok) {
            throw new Error('Failed to fetch club details');
          }
          const data = await res.json();
          
          if (data && data.details) {
            const myClub = data.details.find(
              club => club['Registration Name'] === parsedUser.name || club['Club Name'] === parsedUser.name
            );
            if (myClub) {
              setClubData(myClub);
            } else {
              setError('Club details not found.');
            }
          }
        }
      } catch (err) {
        console.error('Error fetching club data:', err);
        setError('Failed to load club profile.');
      } finally {
        setLoading(false);
      }
    };

    fetchClubData();
  }, []);

  if (loading) {
    return <div className={styles.loadingContainer}>Loading Profile...</div>;
  }

  if (error) {
    return <div className={styles.errorContainer}>{error}</div>;
  }

  if (!clubData) {
    return <div className={styles.errorContainer}>No profile data available.</div>;
  }

  return (
    <div className={styles.profileContainer}>
      <div className={styles.headerCard}>
        <h1 className={styles.clubName}>{clubData['Registration Name'] || clubData['Club Name']}</h1>
        <div className={styles.badge}>{clubData['Cluster / Department']}</div>
      </div>

      <div className={styles.gridContainer}>
        {/* Basic Info */}
        <div className={styles.infoCard}>
          <h3><i className="fa fa-info-circle"></i> Basic Information</h3>
          <ul className={styles.infoList}>
            <li>
              <span className={styles.label}>Registration Code</span>
              <span className={styles.value}>{clubData['Registration Code'] || 'N/A'}</span>
            </li>
            <li>
              <span className={styles.label}>Faculty Champion</span>
              <span className={styles.value}>{clubData['Faculty Champion'] || 'N/A'}</span>
            </li>
            <li>
              <span className={styles.label}>Contact Number</span>
              <span className={styles.value}>{clubData['Contact Number'] || 'N/A'}</span>
            </li>
            <li>
              <span className={styles.label}>Email ID</span>
              <span className={styles.value}>{clubData['Email ID'] || 'N/A'}</span>
            </li>
          </ul>
        </div>

        {/* Budget Info */}
        <div className={styles.infoCard}>
          <h3><i className="fa fa-rupee"></i> Budget Summary</h3>
          <div className={styles.budgetOverview}>
            <div className={styles.budgetBox}>
              <span className={styles.budgetLabel}>Approved Budget</span>
              <span className={styles.budgetValue}>₹ {clubData.approved_budget || '0'}</span>
            </div>
            <div className={styles.budgetBox}>
              <span className={styles.budgetLabel}>Spent Budget</span>
              <span className={styles.budgetValue}>₹ {clubData.spent_budget || '0'}</span>
            </div>
          </div>
        </div>

        {/* Secretary Info */}
        <div className={styles.infoCard}>
          <h3><i className="fa fa-user"></i> Secretary Information</h3>
          <ul className={styles.infoList}>
            <li>
              <span className={styles.label}>Secretary Name</span>
              <span className={styles.value}>{clubData['Secretary'] || 'N/A'}</span>
            </li>
            <li>
              <span className={styles.label}>Sec. UID</span>
              <span className={styles.value}>{clubData['Sec. UID'] || 'N/A'}</span>
            </li>
            <li>
              <span className={styles.label}>Secretary Email</span>
              <span className={styles.value}>{clubData['Secretary Email'] || 'N/A'}</span>
            </li>
            <li>
              <span className={styles.label}>Secretary Contact</span>
              <span className={styles.value}>{clubData['Secretary Contact'] || 'N/A'}</span>
            </li>
          </ul>
        </div>

        {/* Joint Secretary Info */}
        <div className={styles.infoCard}>
          <h3><i className="fa fa-users"></i> Joint Secretary Information</h3>
          <ul className={styles.infoList}>
            <li>
              <span className={styles.label}>Jt. Secretary Name</span>
              <span className={styles.value}>{clubData['Jt. SECRETARY'] || 'N/A'}</span>
            </li>
            <li>
              <span className={styles.label}>Jt. Sec. UID</span>
              <span className={styles.value}>{clubData['Jt. SEC. UID'] || 'N/A'}</span>
            </li>
            <li>
              <span className={styles.label}>Jt. Sec Email</span>
              <span className={styles.value}>{clubData['Jt. SEC EMAIL'] || 'N/A'}</span>
            </li>
            <li>
              <span className={styles.label}>Jt. Sec Contact</span>
              <span className={styles.value}>{clubData['Jt. SEC CONTACT'] || 'N/A'}</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ClubProfile;
