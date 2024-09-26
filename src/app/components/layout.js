import React from 'react';
import styles from '../styles/Layout.module.css';
import { FaQuestionCircle, FaGamepad, FaChartBar } from 'react-icons/fa';
import Link from 'next/link';

const Layout = ({ children }) => {
  return (
    <div className={styles.container}>
      <nav className={styles.sidenav}>
        <ul className={styles.navList}>
          {/* BeatBox Logo redirects to home */}
          <li className={styles.navHome}>
            <Link href="/home">
              <img src="/beatboxlogofinal_nav.svg" alt="BeatBox" width={120} height={25} />
            </Link>
          </li>

          {/* How to Play with Icon */}
          <li className={styles.navItem}>
            <Link href="/pages/howto" className={styles.navLink}>
              <FaQuestionCircle className={styles.navIcon} />
              <span>How to Play</span>
            </Link>
          </li>

          {/* Battle Link with Icon */}
          <li className={styles.navItem}>
            <Link href="/pages/battle" className={styles.navLink}>
              <FaGamepad className={styles.navIcon} />
              <span>Battle</span>
            </Link>
          </li>

          {/* Statistics Link with Icon */}
          <li className={styles.navItem}>
            <Link href="/pages/statistics" className={styles.navLink}>
              <FaChartBar className={styles.navIcon} />
              <span>Statistics</span>
            </Link>
          </li>
        </ul>
      </nav>

      <main className={styles['main-content']}>
        {children}
      </main>
    </div>
  );
};

export default Layout;
