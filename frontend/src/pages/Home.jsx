import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './Home.module.css';

export default function Home({ theme, toggleTheme }) {
  const navigate = useNavigate();

  // Apply theme to body
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const features = [
    {
      icon: "⚡",
      title: "Streamlined Approvals",
      desc: "Submit, track, and manage event proposals seamlessly with real-time updates and notifications."
    },
    {
      icon: "💰",
      title: "Budget Tracking",
      desc: "Comprehensive visibility into your allocated, spent, and remaining budget across all activities."
    },
    {
      icon: "📊",
      title: "Data Analytics",
      desc: "Interactive dashboards and insights providing a bird's eye view of all co-curricular activities."
    }
  ];

  return (
    <div className={styles.homeContainer}>
      <div className={styles.backgroundPattern} />

      <nav className={styles.navbar}>
        <div className={styles.logo}>
          <div className={styles.logoIcon}>OAA</div>
          <span>Event Approvals Portal</span>
        </div>
        <div className={styles.navLinks}>
          <button className={styles.themeToggle} onClick={toggleTheme}>
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          <button className={styles.loginBtn} onClick={() => navigate('/login')}>
            Login
          </button>
        </div>
      </nav>

      <main className={styles.hero}>
        <div className={styles.heroBadge}>Co-Curricular Student Clubs - Chandigarh University</div>
        <h1 className={styles.heroTitle}>
          Empowering Campus Life & Events
        </h1>
        <p className={styles.heroSubtitle}>
          The unified platform for managing cultural activities, live concerts, and club events at Chandigarh University. Streamline your event proposals and get real-time approvals from the Office of Academic Affairs.
        </p>
        <button className={styles.ctaButton} onClick={() => navigate('/login')}>
          Access Portal
          <span className={styles.ctaIcon}>→</span>
        </button>
      </main>

      <section className={styles.featuresSection}>
        <div className={styles.featuresGrid}>
          {features.map((feature, idx) => (
            <div key={idx} className={styles.featureCard}>
              <div className={styles.featureIcon}>{feature.icon}</div>
              <h3>{feature.title}</h3>
              <p>{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className={styles.footer}>
        © {new Date().getFullYear()} Chandigarh University - Office of Academic Affairs. All rights reserved.
      </footer>
    </div>
  );
}
