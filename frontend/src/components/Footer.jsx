import React, { useState, useEffect } from "react";
import "./Footer.css";

const Footer = ({ theme = "default"}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.innerHeight + window.scrollY;
      const bodyHeight = document.body.offsetHeight;
      const offset = 100; // Adjust this value to control when the footer appears

      if (scrollPosition > bodyHeight - offset) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <footer style={{fontSize:"18px", fontWeight:"bold", letterSpacing:"1px", color:"white"}} className={`footer ${isVisible ? "visible" : ""} theme-${theme}`}>
      <div className="footer-content">
        <p style={{fontSize:"18px", fontWeight:"bold", letterSpacing:"1px", color:"white"}}>&copy; 2023 Curriculum Portal.</p>
        <nav>
          <a href="#">Privacy Policy</a>
          <a href="#">Terms of Service</a>
          <a href="#">Contact Us</a>
        </nav>
      </div>
    </footer>
  );
};

export default Footer;