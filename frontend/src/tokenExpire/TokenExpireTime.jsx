import { useEffect, useState } from "react";
import Swal from "sweetalert2";

const TokenExpireTime = ({ onLogout }) => {
  const [timeLeft, setTimeLeft] = useState(null);
  const [userDataDet, setUserDataDet] = useState([]);

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem("user"));
    setUserDataDet(userData)
    if (!userData || !userData.token_expiration_time) {
      onLogout();
      return;
    }

    // Convert expiration time to milliseconds
    const expirationTime = new Date(userData.token_expiration_time).getTime();
    const currentTime = new Date().getTime();
    const timeRemaining = expirationTime - currentTime;

    if (timeRemaining <= 0) {
      window.location.href = "/login"
      localStorage.clear();
      Swal.fire({
        title: "Session Expired",
        text: "Your session has expired. Please login again.",
        icon: "warning",
        confirmButtonColor: "#3085d6",
        confirmButtonText: "OK",
      });
    } else {
      setTimeLeft(timeRemaining);

      // Start an interval to update countdown every second
      const timer = setInterval(() => {
        const newTimeLeft = expirationTime - new Date().getTime();
        if (newTimeLeft <= 0) {
          clearInterval(timer);
          // onLogout();
        } else {
          setTimeLeft(newTimeLeft);
        }
      }, 1000);

      return () => clearInterval(timer);
    }
  }, []);

  // Convert milliseconds to minutes and seconds
  const formatTime = (ms) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  };

  return (
    <div>
      {userDataDet && userDataDet?.token_expiration_time ? (
        <>
          <div style={{ color: "red" }}>
            Session expires in: {timeLeft ? formatTime(timeLeft) : "Expired"}
          </div>
        </>
      ) : (
        ""
      )}
    </div>
  );
};

export default TokenExpireTime;
