import React, { useState, useEffect } from "react";
import { NavLink } from "react-router-dom";
import { Tooltip } from "antd";

import {
  FaBars,
  FaTimes,
} from "react-icons/fa";

import {
  MdOutlineDashboardCustomize,
  MdEmojiEvents,
  MdCalendarMonth,
  MdAddCircle,
  MdHistory,
  MdSettings
} from "react-icons/md";
import { FaUserTie } from "react-icons/fa6";
import { FiLogOut, FiSun, FiMoon } from "react-icons/fi";
import styles from "./Sidebar.module.css";

const routes = [
  {
    path: "/club-dashboard",
    name: "Dashboard",
    icon: <MdOutlineDashboardCustomize />,
    allowedRoles: ["Club"],
  },
  {
    path: "/data-analyst-dashboard",
    name: "Dashboard",
    icon: <MdOutlineDashboardCustomize />,
    allowedRoles: ["Data Analyst", "Data analyst"],
  },
  {
    path: "/department-dashboard",
    name: "Dashboard",
    icon: <MdOutlineDashboardCustomize />,
    allowedRoles: ["Department"],
  },
  {
    path: "/professional-dashboard",
    name: "Dashboard",
    icon: <MdOutlineDashboardCustomize />,
    allowedRoles: ["Professional Society"],
  },
  {
    path: "/community-dashboard",
    name: "Dashboard",
    icon: <MdOutlineDashboardCustomize />,
    allowedRoles: ["Community"],
  },
  {
    path: "/proposed-calendar",
    name: "Proposed Calendar",
    icon: <MdCalendarMonth />,
    allowedRoles: ["Club", "Department", "Professional Society", "Community"],
  },
  {
    path: "/propose-event",
    name: "Propose New Event",
    icon: <MdAddCircle />,
    allowedRoles: ["Club", "Department", "Professional Society", "Community"],
  },
  {
    path: "/past-events",
    name: "Past Events",
    icon: <MdHistory />,
    allowedRoles: ["Club", "Department", "Professional Society", "Community"],
  },
  {
    path: "/event-publication",
    name: "Event Publication",
    icon: <MdEmojiEvents />,
    allowedRoles: ["Club", "Department", "Professional Society", "Community"],
  },
  {
    path: "/club-profile",
    name: "Entity Profile",
    icon: <FaUserTie />,
    allowedRoles: ["Club", "Department", "Professional Society", "Community"],
  },
  {
    path: "/settings",
    name: "Settings",
    icon: <MdSettings />,
    allowedRoles: ["Club", "Department", "Professional Society", "Community", "Data Analyst", "Data analyst"],
  },
];

const SideBar = ({ onLogout, theme, toggleTheme }) => {
  const [isOpen, setIsOpen] = useState(true);
  const [userRole, setUserRole] = useState("");
  const [userName, setUserName] = useState("");
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    setUserRole(user?.role_name || "");
    setUserName(user?.user_name || user?.name || "");

    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const filteredRoutes = routes.filter((route) =>
    route.allowedRoles?.includes(userRole)
  );

  const toggle = () => setIsOpen(!isOpen);

  if (isMobile) {
    return null; // Handle mobile differently or hide for now
  }

  return (
    <div className={styles.mainContainer}>
      <div className={`${styles.sidebar} ${isOpen ? styles.open : ""}`}>
        <div className={styles.sidebarHeader}>
          {/* Left: icon + welcome text (only when open) */}
          <div className={styles.headerLeft}>
            <div className={styles.logoIcon}><MdEmojiEvents /></div>
            {isOpen && (
              <div className={styles.logoText}>
                <span className={styles.welcomeLabel}>Welcome</span>
                <span className={styles.welcomeName}>{userName || 'Entity'}</span>
              </div>
            )}
          </div>
          {/* Right: toggle button always visible */}
          <button className={styles.toggleButton} onClick={toggle} title={isOpen ? 'Collapse' : 'Expand'}>
            {isOpen ? <FaTimes /> : <FaBars />}
          </button>
        </div>

        <div className={styles.routesContainer}>
          {filteredRoutes.map((route, index) => (
            <Tooltip title={!isOpen ? route.name : ""} placement="right" key={index}>
              <NavLink
                to={route.path}
                className={({ isActive }) =>
                  `${styles.navLink} ${isActive ? styles.activeLink : ""}`
                }
              >
                <div className={styles.iconWrapper}>
                  {route.icon}
                </div>
                {isOpen && (
                  <div className={styles.linkText}>
                    {route.name}
                  </div>
                )}
              </NavLink>
            </Tooltip>
          ))}
        </div>


      </div>
    </div>
  );
};

export default SideBar;

