import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'antd/dist/reset.css'
import App from './App.jsx'

// Redirect API calls to local server when running on localhost
const originalFetch = window.fetch;
window.fetch = function (input, init) {
  if (typeof input === "string" && input.includes("https://approval-portals.onrender.com")) {
    const localBase = (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
      ? "http://127.0.0.1:8000"
      : "https://approval-portals.onrender.com";
    input = input.replace("https://approval-portals.onrender.com", localBase);
  }
  return originalFetch(input, init);
};

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
