import React, { useState } from 'react';
import { MdSearch, MdNotifications, MdAccountCircle } from 'react-icons/md';
import { FiLogOut } from 'react-icons/fi';
import styles from './TopBar.module.css';

const TopBar = ({ user, theme, toggleTheme, onLogout }) => {
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearchSubmit = (e) => {
    e.preventDefault();
  };

  return (
    <header className={styles.topbarContainer} role="banner">
      <div className={styles.topRow}>
        {/* Search Centric Component */}
        <form className={styles.searchBar} onSubmit={handleSearchSubmit} role="search">
          <MdSearch className={styles.searchIcon} />
          <input
            type="search"
            placeholder="Search notices, faculty, departments, courses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search site content"
          />
        </form>

        {/* Action Widgets */}
        <div className={styles.widgets}>

          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className={styles.iconWidget}
            aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            title="Toggle Theme"
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>

          {/* Notifications */}
          <div className={styles.iconWidget} role="button" tabIndex={0} aria-label="Notifications" title="Notifications">
            <MdNotifications />
            <span className={styles.badge} aria-hidden="true" />
          </div>

          {/* User profile capsule */}
          <div className={styles.userProfile}>
            <MdAccountCircle className={styles.profileIcon} />
            <div className={styles.userInfo}>
              <span className={styles.userName}>{user?.name || 'Portal User'}</span>
              <span className={styles.userRole}>{user?.role_name || 'Coordinator'}</span>
            </div>
          </div>

          {/* Logout Button */}
          <button
            onClick={onLogout}
            className={styles.iconWidget}
            aria-label="Logout"
            title="Logout"
            style={{ color: 'var(--primary)' }}
          >
            <FiLogOut />
          </button>
        </div>
      </div>


    </header>
  );
};

export default TopBar;
