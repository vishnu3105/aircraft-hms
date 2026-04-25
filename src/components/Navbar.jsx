import React from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Link } from 'react-router-dom';

export default function Navbar() {
  const { scrollY } = useScroll();
  const opacity = useTransform(scrollY, [0, 50], [0, 1]);
  
  return (
    <motion.nav 
      className="glass-nav"
      style={{ 
        opacity,
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '1rem 2rem',
      }}
    >
      <div 
        className="font-syne" 
        style={{ color: 'var(--accent-primary)', fontSize: '1.5rem', fontWeight: 800, textTransform: 'uppercase' }}
      >
        ARIA
      </div>
      
      <div style={{ display: 'flex', gap: '2rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
        {['Defence', 'Commercial', 'Research', 'Technology', 'Demo'].map(item => (
          <a key={item} href={`#${item.toLowerCase()}`} style={{ color: 'inherit', textDecoration: 'none', transition: 'color 0.3s' }} onMouseOver={e => e.target.style.color = 'var(--text-primary)'} onMouseOut={e => e.target.style.color = 'var(--text-secondary)'}>
            {item}
          </a>
        ))}
      </div>
    </motion.nav>
  );
}
