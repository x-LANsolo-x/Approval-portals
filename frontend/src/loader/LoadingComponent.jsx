import React from "react";
import styles from "./LoadingComponent.module.css";

const LoadingComponent = () => {
  return (
    <div className={styles.loadingContainer}>
      <div className={styles.loadingContent}>
        <div className={styles.spinner}></div>
        <h2 className={styles.loadingText}>Loading...</h2>
      </div>
    </div>
  );
};

export default LoadingComponent;
