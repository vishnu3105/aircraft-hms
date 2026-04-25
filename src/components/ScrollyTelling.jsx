import React, { useRef, useState, useEffect } from 'react';
import { motion, useScroll, useMotionValueEvent } from 'framer-motion';
import { Link } from 'react-router-dom';
import CanvasSequence from './CanvasSequence';

export default function ScrollyTelling() {
  const containerRef = useRef(null);
  
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  const [progress, setProgress] = useState(0);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    setProgress(latest);
  });

  // Replaced complex useTransform opacities with robust viewport intersection motion
  // Ensures elements strictly respect their vertical scroll positions without colliding.

  return (
    <div ref={containerRef} style={{ position: 'relative', backgroundColor: '#050508' }}>
      {/* Sticky Canvas Container */}
      <div style={{ position: 'sticky', top: 0, height: '100vh', overflow: 'hidden' }}>
        <CanvasSequence scrollProgress={progress} />
        <div className="glow-orange" style={{ opacity: progress * 0.8 }} />
      </div>

      {/* Storytelling Overlays (Physical Flow - 500vh Total) */}
      <div style={{ position: 'relative', zIndex: 10, marginTop: '-100vh' }}>
        
        {/* Beat 1: Intro */}
        <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '2rem' }}>
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            viewport={{ once: false, amount: 0.5, margin: "-10% 0px -10% 0px" }}
            transition={{ duration: 0.8 }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', gap: '1rem', marginBottom: '1rem' }}>
              <h1 className="font-syne" style={{ fontSize: isMobile ? '4rem' : '6rem', color: 'var(--accent-primary)', textShadow: '0 0 60px rgba(255,107,0,0.4)', lineHeight: 1, margin: 0 }}>ARIA</h1>
              <div className="font-mono" style={{ color: 'var(--text-primary)', border: '1px solid rgba(240,237,232,0.4)', padding: '0.25rem 0.75rem', fontSize: '0.85rem', marginTop: isMobile ? '0.2rem' : '0.5rem', borderRadius: '20px', letterSpacing: '0.05em', backgroundColor: 'rgba(255,255,255,0.05)' }}>BETA</div>
            </div>
            <h2 style={{ fontSize: isMobile ? '1.5rem' : '2.2rem', fontWeight: 500, marginBottom: '1.5rem', color: 'var(--text-primary)' }}>The AI that decides if your engine flies tomorrow.</h2>
            <p style={{ maxWidth: '600px', fontSize: isMobile ? '1rem' : '1.1rem', color: 'var(--text-secondary)', lineHeight: 1.6, margin: '0 auto' }}>Real-time engine health monitoring powered by XGBoost ML and large language models. Built for aerospace engineers who need answers before the next sortie.</p>
          </motion.div>
        </div>

        {/* Beat 2: Left Side */}
        <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingLeft: isMobile ? '2rem' : '10vw', paddingRight: isMobile ? '2rem' : '10vw', textAlign: isMobile ? 'center' : 'left' }}>
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            viewport={{ once: false, amount: 0.5, margin: "-10% 0px -10% 0px" }}
            transition={{ duration: 0.8 }}
            style={{ maxWidth: isMobile ? '100%' : '45vw', margin: isMobile ? '0 auto' : '0' }}
          >
            <h2 className="font-syne text-gradient" style={{ fontSize: isMobile ? '2.5rem' : '3.5rem', marginBottom: '1.5rem', lineHeight: 1.1 }}>Precision engineered<br/>for zero failure tolerance.</h2>
            <p style={{ fontSize: isMobile ? '1rem' : '1.2rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>13 sensor parameters analyzed per engine cycle. XGBoost ML model predicts Remaining Useful Life with 95% confidence interval. No guesswork. No surprises.</p>
          </motion.div>
        </div>

        {/* Beat 3: Right Side */}
        <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: isMobile ? 'center' : 'flex-end', paddingRight: isMobile ? '2rem' : '10vw', paddingLeft: isMobile ? '2rem' : '10vw', textAlign: isMobile ? 'center' : 'right' }}>
          <motion.div 
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 50 }}
            viewport={{ once: false, amount: 0.5, margin: "-10% 0px -10% 0px" }}
            transition={{ duration: 0.8 }}
            style={{ maxWidth: isMobile ? '100%' : '45vw', margin: isMobile ? '0 auto' : '0' }}
          >
            <h2 className="font-syne" style={{ fontSize: isMobile ? '2.5rem' : '3.5rem', marginBottom: '1.5rem', color: 'var(--accent-primary)', lineHeight: 1.1 }}>ARIA detects what humans miss.</h2>
            <ul style={{ listStyle: 'none', padding: 0, fontSize: isMobile ? '1rem' : '1.2rem', color: 'var(--text-secondary)', lineHeight: 2, textAlign: isMobile ? 'left' : 'right' }} className="font-mono">
              <li><span style={{color: 'var(--accent-secondary)'}}>&gt;</span> HPC outlet temp trending +1.2°C per cycle.</li>
              <li><span style={{color: 'var(--accent-secondary)'}}>&gt;</span> Core speed declining — compressor fouling.</li>
              <li><span style={{color: 'var(--accent-secondary)'}}>&gt;</span> Fleet-wide anomalies flagged routinely.</li>
            </ul>
          </motion.div>
        </div>

        {/* Beat 4: Center Dramatic */}
        <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: isMobile ? '2rem' : '0' }}>
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            viewport={{ once: false, amount: 0.5, margin: "-10% 0px -10% 0px" }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="font-syne text-gradient" style={{ fontSize: isMobile ? '3rem' : '4.5rem', marginBottom: '1.5rem', lineHeight: 1 }}>Every engine.<br/>Every cycle.<br/>Every decision.</h2>
            <div className="font-mono" style={{ backgroundColor: 'rgba(5,5,8,0.7)', border: '1px solid rgba(255,107,0,0.3)', padding: '0.75rem 2rem', borderRadius: '4px', marginBottom: '2rem', color: 'var(--accent-secondary)', fontSize: isMobile ? '0.7rem' : '0.9rem', backdropFilter: 'blur(4px)', display: 'inline-block' }}>
              RMSE: 18.06 cycles &middot; NASA CMAPSS{isMobile ? <br/> : ' \u00B7 '}XGBoost &middot; LLaMA 3.3 70B
            </div>
            <p style={{ maxWidth: '700px', fontSize: isMobile ? '1rem' : '1.2rem', color: 'var(--text-secondary)', lineHeight: 1.6, margin: '0 auto' }}>Fleet health scored. Maintenance scheduled. Pre-sortie clearance issued. ARIA handles the analysis so engineers handle the mission.</p>
          </motion.div>
        </div>

        {/* Beat 5: Final CTA */}
        <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: isMobile ? '2rem' : '0' }}>
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            viewport={{ once: false, amount: 0.5, margin: "-10% 0px -10% 0px" }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="font-syne text-gradient" style={{ fontSize: isMobile ? '2.5rem' : '4rem', marginBottom: '1rem' }}>Ready to let ARIA analyze your fleet?</h2>
            <p style={{ fontSize: isMobile ? '1rem' : '1.2rem', color: 'var(--text-secondary)', marginBottom: '2.5rem' }}>Try the live demo with NASA CMAPSS dataset. No signup required.</p>
            <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '1.5rem', justifyContent: 'center', width: '100%' }}>
              <Link to="/demo" style={{ width: isMobile ? '100%' : 'auto' }}>
                <button className="btn-primary" style={{ fontSize: '1rem', padding: '1rem 2.5rem', width: '100%' }}>Enter Demo →</button>
              </Link>
              <button className="btn-ghost" style={{ fontSize: '1rem', padding: '1rem 2.5rem', width: isMobile ? '100%' : 'auto' }}>View Research</button>
            </div>
          </motion.div>
        </div>
        
      </div>
    </div>
  );
}
