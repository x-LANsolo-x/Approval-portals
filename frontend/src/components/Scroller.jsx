import React, { useState, useEffect } from "react";
import { FaArrowUp, FaArrowDown } from 'react-icons/fa';

import "./Scroller.css";

const Scroller = () => {
  const [scrollDirection, setScrollDirection] = useState(null); // 'up', 'down', or null
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      const viewportHeight = window.innerHeight;
      const totalHeight = document.body.scrollHeight;

      if (totalHeight > viewportHeight) {
        if (scrollPosition + viewportHeight >= totalHeight - 1) {
          // At the bottom, show "up" arrow
          setScrollDirection("up");
        } else if (scrollPosition === 0) {
          // At the top, show "down" arrow
          setScrollDirection("down");
        } else if (scrollPosition > lastScrollY) {
          // Scrolling down
          setScrollDirection("down");
        } else if (scrollPosition < lastScrollY) {
          // Scrolling up
          setScrollDirection("up");
        }
      } else {
        setScrollDirection(null); // Page not scrollable
      }

      setLastScrollY(scrollPosition);
    };

    window.addEventListener("scroll", handleScroll);
    handleScroll(); // Initial check

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [lastScrollY]);

  const scrollToBottom = () => {
    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
   <></>
  );
};

export default Scroller;
