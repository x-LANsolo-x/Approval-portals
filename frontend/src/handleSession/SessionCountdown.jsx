import React, { useState, useEffect } from 'react';
import './SessionCountdown.css';

const SessionCountdown = ({ expirationTime }) => {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      const expiration = new Date(expirationTime);
      const difference = expiration - now;

      if (difference > 0) {
        const hours = Math.floor(difference / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);

        setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
      } else {
        setTimeLeft('Session Expired');
      }
    };

    const timer = setInterval(calculateTimeLeft, 1000);
    calculateTimeLeft(); // Call immediately to set initial state

    return () => clearInterval(timer);
  }, [expirationTime]);

  return (
    <div className="session-countdown">
      <span>Session expires in: </span>
      <span className="countdown-timer">{timeLeft}</span>
    </div>
  );
};

export default SessionCountdown;

