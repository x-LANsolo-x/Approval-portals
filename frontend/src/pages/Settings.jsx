import React, { useState, useEffect } from "react";
import styles from "./Settings.module.css";
import { FiLock, FiEye, FiEyeOff, FiSave } from "react-icons/fi";
import Swal from "sweetalert2";
import { API_BASE } from "../config/apiClient";

const Settings = () => {
  const [user, setUser] = useState(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);

      if (!parsedUser.email && !parsedUser.login_id) {
        fetch(`${API_BASE}/api/all-credentials`)
          .then((res) => res.json())
          .then((data) => {
            if (Array.isArray(data)) {
              const matched = data.find(
                (item) =>
                  item.name === parsedUser.name &&
                  (item.type === parsedUser.role_name || item.type === parsedUser.role)
              );
              if (matched && matched.login_id) {
                const updatedUser = {
                  ...parsedUser,
                  email: matched.login_id,
                  login_id: matched.login_id,
                };
                setUser(updatedUser);
                localStorage.setItem("user", JSON.stringify(updatedUser));
              }
            }
          })
          .catch((err) => console.error("Error resolving login id:", err));
      }
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!currentPassword || !newPassword || !confirmPassword) {
      Swal.fire({
        title: "Validation Error",
        text: "Please fill in all fields.",
        icon: "warning",
        confirmButtonText: "OK",
        buttonsStyling: false,
        customClass: {
          confirmButton: styles.swalButton
        }
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      Swal.fire({
        title: "Validation Error",
        text: "New passwords do not match.",
        icon: "warning",
        confirmButtonText: "OK",
        buttonsStyling: false,
        customClass: {
          confirmButton: styles.swalButton
        }
      });
      return;
    }

    if (newPassword.length < 4) {
      Swal.fire({
        title: "Validation Error",
        text: "New password must be at least 4 characters long.",
        icon: "warning",
        confirmButtonText: "OK",
        buttonsStyling: false,
        customClass: {
          confirmButton: styles.swalButton
        }
      });
      return;
    }

    const email = user?.email || user?.login_id;
    if (!email) {
      Swal.fire({
        title: "Session Error",
        text: "Unable to identify your login account. Please log out and log in again.",
        icon: "error",
        confirmButtonText: "OK",
        buttonsStyling: false,
        customClass: {
          confirmButton: styles.swalButton
        }
      });
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/auth/change-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to update password");
      }

      Swal.fire({
        title: "Success!",
        text: "Your password has been changed successfully. Please use your new password next time you log in.",
        icon: "success",
        confirmButtonText: "Awesome",
        buttonsStyling: false,
        customClass: {
          confirmButton: styles.swalButton
        }
      });

      // Clear input fields
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      console.error("Change password error:", err);
      Swal.fire({
        title: "Error",
        text: err.message || "An unexpected error occurred. Please try again.",
        icon: "error",
        confirmButtonText: "OK",
        buttonsStyling: false,
        customClass: {
          confirmButton: styles.swalButton
        }
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.settingsContainer}>
      <div className={styles.headerCard}>
        <h1 className={styles.title}>Account Settings</h1>
        <p className={styles.subtitle}>Manage your profile configuration and security preferences</p>
      </div>

      <div className={styles.gridContainer}>
        {/* Settings Card */}
        <div className={styles.settingsCard}>
          <h3>
            <FiLock className={styles.iconHeader} /> Security & Password
          </h3>
          <p className={styles.sectionDesc}>
            Change the password for <strong>{user?.name || "your account"}</strong> ({user?.email || user?.login_id || "N/A"})
          </p>

          <form onSubmit={handleSubmit} className={styles.form}>
            {/* Current Password */}
            <div className={styles.formGroup}>
              <label htmlFor="currentPassword">Current Password</label>
              <div className={styles.inputWrapper}>
                <span className={styles.inputIcon}><FiLock /></span>
                <input
                  id="currentPassword"
                  type={showCurrent ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  className={styles.formInput}
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  className={styles.passwordToggle}
                  aria-label="Toggle password visibility"
                >
                  {showCurrent ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div className={styles.formGroup}>
              <label htmlFor="newPassword">New Password</label>
              <div className={styles.inputWrapper}>
                <span className={styles.inputIcon}><FiLock /></span>
                <input
                  id="newPassword"
                  type={showNew ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  className={styles.formInput}
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className={styles.passwordToggle}
                  aria-label="Toggle password visibility"
                >
                  {showNew ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>
            </div>

            {/* Confirm New Password */}
            <div className={styles.formGroup}>
              <label htmlFor="confirmPassword">Confirm New Password</label>
              <div className={styles.inputWrapper}>
                <span className={styles.inputIcon}><FiLock /></span>
                <input
                  id="confirmPassword"
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className={styles.formInput}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className={styles.passwordToggle}
                  aria-label="Toggle password visibility"
                >
                  {showConfirm ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className={styles.formActions}>
              <button
                type="submit"
                disabled={isLoading}
                className={styles.submitBtn}
              >
                {isLoading ? (
                  <>
                    <span className={styles.spinner}></span> Updating...
                  </>
                ) : (
                  <>
                    <FiSave className={styles.btnIcon} /> Save Password
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Profile Summary Card */}
        <div className={styles.infoCard}>
          <h3>Profile Overview</h3>
          <ul className={styles.infoList}>
            <li>
              <span className={styles.label}>Account Name</span>
              <span className={styles.value}>{user?.name || "N/A"}</span>
            </li>
            <li>
              <span className={styles.label}>Login Email</span>
              <span className={styles.value}>{user?.email || user?.login_id || "N/A"}</span>
            </li>
            <li>
              <span className={styles.label}>Role / Entity Type</span>
              <span className={styles.value}>{user?.role_name || user?.role || "N/A"}</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Settings;
