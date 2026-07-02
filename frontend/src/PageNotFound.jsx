import React from 'react'
import "./PageNotFound.css";

const PageNotFound = () => {
  return (
    <div className="not-found-container">
      <h1>404</h1>
      <h2>Page Not Found</h2>
      <p>Oops! The page you're looking for doesn't exist.</p>
      <a href="/" className="home-link">Go to Homepage</a>
    </div>
  )
}

export default PageNotFound