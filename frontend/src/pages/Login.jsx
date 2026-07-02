"use client";

import { useState, useEffect } from "react";
import { Modal } from "antd";
import styles from "./Login.module.css";
import {
  FiMail,
  FiLock,
  FiEye,
  FiEyeOff,
  FiArrowRight,
  FiX,
  FiCheck,
  FiAlertCircle,
  FiShield,
  FiZap,
  FiActivity,
  FiSun,
  FiMoon
} from "react-icons/fi";
import { MdOutlineAutoAwesome } from "react-icons/md";
import apiClient from "../config/apiClient";

const Notification = ({ type, message, description, onClose }) => {
  const getIcon = () => {
    switch (type) {
      case "success":
        return <FiCheck />;
      case "error":
        return <FiAlertCircle />;
      default:
        return <FiAlertCircle />;
    }
  };

  return (
    <div className={`${styles.notification} ${styles[`notification-${type}`]}`}>
      <div className={styles.notificationIcon}>{getIcon()}</div>
      <div className={styles.notificationContent}>
        <h4 className={styles.notificationTitle}>{message}</h4>
        <p className={styles.notificationDescription}>{description}</p>
      </div>
      <button className={styles.notificationClose} onClick={onClose}>
        <FiX />
      </button>
    </div>
  );
};

const Login = ({ onLogin, theme, toggleTheme }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [isResetting, setIsResetting] = useState(false);
  const [notifications, setNotifications] = useState([]);

  const openNotification = (type, message, description) => {
    const id = Date.now();
    setNotifications((prev) => [...prev, { id, type, message, description }]);
    setTimeout(() => {
      removeNotification(id);
    }, 4000);
  };

  const removeNotification = (id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email || !password) {
      openNotification("error", "Validation Error", "Please fill in all fields");
      return;
    }

    setIsLoading(true);

    try {
      let response;
      const lowerEmail = email.toLowerCase();
      
      if (lowerEmail.endsWith("@cu")) {
          const res = await fetch("http://localhost:8000/api/auth/club-login", {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: lowerEmail, password })
          });
          if (!res.ok) {
              const errData = await res.json();
              throw { response: { data: { message: errData.message || errData.error }, status: res.status } };
          }
          const data = await res.json();
          response = { data };
      } else {
          response = await apiClient.post("login/", {
              user_email: lowerEmail,
              password: password,
          });
      }

      const data = response?.data;
      localStorage.setItem("user", JSON.stringify(data));

      openNotification("success", "Login Successful", "Redirecting...");

      setTimeout(() => {
        onLogin();
        const role = data?.role_name;
        if (role === "Club") {
          window.location.href = "/club-dashboard";
        } else if (role === "Department") {
          window.location.href = "/department-dashboard";
        } else if (role === "Professional Society") {
          window.location.href = "/professional-dashboard";
        } else if (role === "Community") {
          window.location.href = "/community-dashboard";
        } else if (role === "Data Analyst" || role === "Data analyst") {
          window.location.href = "/data-analyst-dashboard";
        } else {
          window.location.href = "/club-dashboard"; 
        }
      }, 1000);
    } catch (err) {
      console.error("Login error:", err);
      openNotification(
        "error",
        "Login Failed",
        err.response?.data?.message || "Invalid credentials"
      );
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!resetEmail) {
      openNotification("error", "Validation Error", "Please enter your email");
      return;
    }
    setIsResetting(true);
    try {
      const response = await apiClient.put(`password_reset/${resetEmail.toLowerCase()}/`);
      if (response.status === 200) {
        openNotification("success", "Password Reset Email Sent", "Check your email for the temporary password.");
        setTimeout(() => setIsModalOpen(false), 1000);
      } else {
        throw new Error("Failed to reset password");
      }
    } catch (error) {
      openNotification("error", "Reset Failed", error.response?.data?.message || "Failed to reset password");
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className={styles.loginContainer}>
      {/* Background Pattern */}
      <div className={styles.backgroundPattern}></div>

      <button 
        onClick={toggleTheme} 
        className={styles.themeToggleBtn}
        title={theme === "light" ? "Switch to Dark Mode" : "Switch to Light Mode"}
      >
        {theme === "light" ? <FiMoon size={20} /> : <FiSun size={20} />}
      </button>

      <div className={styles.notificationsContainer}>
        {notifications.map((notification) => (
          <Notification key={notification.id} {...notification} onClose={() => removeNotification(notification.id)} />
        ))}
      </div>

      <div className={styles.landingGrid}>
        {/* Left Side: Info Section */}
        <div className={styles.infoSection}>
          <div className={styles.brandingBadge}>
            <MdOutlineAutoAwesome size={16} />
            <span>OFFICE OF ACADEMIC AFFAIRS</span>
          </div>

          <h1 className={styles.heroTitle}>
            Co-Curricular <br />
            <span className={styles.highlightText}>Event Approvals</span>
          </h1>
          <p className={styles.heroSubtitle}>
            An official portal for Clubs, Departmental Societies, and Professional Societies to submit and track event applications.
          </p>

          <div className={styles.featureGrid}>
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>
                <FiShield size={22} />
              </div>
              <div className={styles.featureContent}>
                <h4>Secure Login</h4>
                <p>Protected access to your official entity account.</p>
              </div>
            </div>
            
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>
                <FiZap size={22} />
              </div>
              <div className={styles.featureContent}>
                <h4>Application Management</h4>
                <p>Submit and track your event approvals.</p>
              </div>
            </div>
            
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>
                <FiActivity size={22} />
              </div>
              <div className={styles.featureContent}>
                <h4>Dashboard Analytics</h4>
                <p>View your past events and current status.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Login Form */}
        <div className={styles.loginSection}>
          <div className={styles.loginCard}>
            <div className={styles.logoContainer}>
              <div className={styles.logoIconWrapper}>
                <MdOutlineAutoAwesome />
              </div>
              <h1 className={styles.logoText}>OAA PORTALS</h1>
            </div>

            <div className={styles.formHeader}>
              <h2>Sign In</h2>
              <p>Please enter your credentials to access the portal.</p>
            </div>

            <form onSubmit={handleSubmit}>
              <div className={styles.inputGroup}>
                <label className={styles.inputLabel}>Email Address</label>
                <div className={styles.inputWrapper}>
                  <FiMail className={styles.inputIcon} />
                  <input
                    type="email"
                    required
                    className={styles.formInput}
                    placeholder="your.entity@domain.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.inputLabel}>Password</label>
                <div className={styles.inputWrapper}>
                  <FiLock className={styles.inputIcon} />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    className={styles.formInput}
                    placeholder="••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    className={styles.passwordToggle}
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <FiEyeOff /> : <FiEye />}
                  </button>
                </div>
                <button
                  type="button"
                  className={styles.forgotPasswordLink}
                  onClick={() => setIsModalOpen(true)}
                >
                  Forgot Password?
                </button>
              </div>

              <button 
                type="submit" 
                className={styles.submitButton} 
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className={styles.loadingSpinner}></span>
                ) : (
                  <>
                    Sign In
                    <FiArrowRight className={styles.btnArrow} />
                  </>
                )}
              </button>
            </form>
          </div>

          <div className={styles.footer}>
            <span className={styles.footerItem}>© 2026 Office of Academic Affairs</span>
            <span className={styles.footerItem}>Chandigarh University</span>
          </div>
        </div>
      </div>

      <Modal
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
        centered
        className={styles.forgotPasswordModal}
      >
        <div className={styles.modalContent}>
          <h3>Reset Password</h3>
          <p>Enter your entity email to receive a temporary password.</p>
          <div className={styles.inputWrapper} style={{ marginBottom: "1.5rem" }}>
            <FiMail className={styles.inputIcon} />
            <input
              type="email"
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
              placeholder="Email Address"
              className={styles.formInput}
            />
          </div>
          <button onClick={handleResetPassword} disabled={isResetting} className={styles.submitButton} style={{ marginTop: 0 }}>
            {isResetting ? <span className={styles.loadingSpinner}></span> : "Send Reset Email"}
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default Login;