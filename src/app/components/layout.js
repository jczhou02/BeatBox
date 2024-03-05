import React from 'react';
import styles from '../styles/Layout.module.css';

const Layout = ({ children }) => {
  return (
    <div className={styles.container}>
      <nav className={styles.sidenav}>
        <ul>
          <li><a href="/">Home</a></li>
          <li><a href="/pages/howto">How to Play</a></li>
          <li><a href="/pages/battle">Battle</a></li>
          {/* Add more navigation links as needed */}
        </ul>
      </nav>
      <main className={styles['main-content']}>
        {children}
      </main>
    </div>
  );
};

export default Layout;
