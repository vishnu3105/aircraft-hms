import React from 'react';

export default function BottomSections() {
  return (
    <div style={{ backgroundColor: 'var(--bg-primary)', position: 'relative', zIndex: 10 }}>
      {/* Stats Bar */}
      <div className="font-mono bg-grid" style={{ 
        width: '100%', 
        padding: '1.5rem', 
        borderTop: '1px solid rgba(255,107,0,0.1)', 
        borderBottom: '1px solid rgba(255,107,0,0.1)',
        display: 'flex',
        justifyContent: 'center',
        gap: '2rem',
        color: 'var(--text-muted)',
        fontSize: '0.9rem',
        flexWrap: 'wrap'
      }}>
        <span>MODEL: XGBoost</span>
        <span style={{color: 'var(--accent-primary)'}}>|</span>
        <span>DATASET: NASA CMAPSS FD001</span>
        <span style={{color: 'var(--accent-primary)'}}>|</span>
        <span>RMSE: 18.06 cycles</span>
        <span style={{color: 'var(--accent-primary)'}}>|</span>
        <span>CONFIDENCE: 95% CI</span>
        <span style={{color: 'var(--accent-primary)'}}>|</span>
        <span>AI: LLaMA 3.3 70B</span>
      </div>

      {/* Use Cases */}
      <div style={{ padding: '6rem 2rem', maxWidth: '1200px', margin: '0 auto' }}>
        <h3 className="font-syne" style={{ fontSize: '2.5rem', marginBottom: '3rem', textAlign: 'center' }}>FIELD DEPLOYMENT</h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
          {/* Card 1 */}
          <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '2rem', borderLeft: '4px solid var(--accent-primary)', position: 'relative', overflow: 'hidden' }}>
            <h4 className="font-syne" style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>Defence Aviation</h4>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '2rem' }}>Pre-sortie engine clearance for fighter aircraft. ARIA delivers flight or no-fly verdicts before each mission.</p>
            <div className="font-mono" style={{ color: 'var(--accent-primary)', fontSize: '0.8rem' }}>TAG: IAF · HAL · DRDO</div>
          </div>

          {/* Card 2 */}
          <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '2rem', borderLeft: '4px solid var(--accent-secondary)', position: 'relative', overflow: 'hidden' }}>
            <h4 className="font-syne" style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>Commercial MRO</h4>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '2rem' }}>Fleet-wide predictive maintenance. Reduce unplanned groundings by catching degradation before failure.</p>
            <div className="font-mono" style={{ color: 'var(--accent-secondary)', fontSize: '0.8rem' }}>TAG: Air India · IndiGo · SpiceJet</div>
          </div>

          {/* Card 3 */}
          <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '2rem', borderLeft: '4px solid var(--glow-deep)', position: 'relative', overflow: 'hidden' }}>
            <h4 className="font-syne" style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>Aerospace Research</h4>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '2rem' }}>Built on NASA CMAPSS turbofan data. XGBoost achieving RMSE 18.06. Open for academic collaboration.</p>
            <div className="font-mono" style={{ color: 'var(--glow-deep)', fontSize: '0.8rem' }}>TAG: NASA · IIT · NIT</div>
          </div>
        </div>
      </div>

      {/* How ARIA Works */}
      <div style={{ padding: '6rem 2rem', backgroundColor: 'var(--bg-secondary)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <h3 className="font-syne" style={{ fontSize: '2.5rem', marginBottom: '4rem', textAlign: 'center' }}>SYSTEM ARCHITECTURE</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '2rem' }}>
            
            <div style={{ backgroundColor: 'var(--bg-primary)', padding: '2rem', borderTop: '2px solid var(--accent-primary)', position: 'relative' }}>
              <div className="font-mono" style={{ color: 'var(--accent-primary)', fontSize: '1.2rem', marginBottom: '1rem' }}>01 / TELEMETRY ACQUISITION</div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6 }}>High-frequency sampling of 21 operational parameters including HPC outlet temp, bypass ratio, and fuel flow directly from FADEC arrays.</p>
            </div>

            <div style={{ backgroundColor: 'var(--bg-primary)', padding: '2rem', borderTop: '2px solid var(--accent-secondary)', position: 'relative' }}>
              <div className="font-mono" style={{ color: 'var(--accent-secondary)', fontSize: '1.2rem', marginBottom: '1rem' }}>02 / XG-BOOST PROGNOSTICS</div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6 }}>Gradient-boosted decision trees calculating asset degradation trajectories and yielding continuous Remaining Useful Life (RUL) metrics.</p>
            </div>

            <div style={{ backgroundColor: 'var(--bg-primary)', padding: '2rem', borderTop: '2px solid var(--glow-deep)', position: 'relative' }}>
              <div className="font-mono" style={{ color: 'var(--glow-deep)', fontSize: '1.2rem', marginBottom: '1rem' }}>03 / STATISTICAL ANOMALY</div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6 }}>Z-score base-lining across fleet historical datasets to identify multi-variate deviations before mechanical failure thresholds.</p>
            </div>

            <div style={{ backgroundColor: 'var(--bg-primary)', padding: '2rem', borderTop: '2px solid var(--accent-primary)', position: 'relative' }}>
              <div className="font-mono" style={{ color: 'var(--accent-primary)', fontSize: '1.2rem', marginBottom: '1rem' }}>04 / LLM DIAGNOSTICS</div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6 }}>LLaMA 3.3 extrapolating numeric findings into actionable plain-english maintenance mandates for pre-flight MRO teams.</p>
            </div>

          </div>
        </div>
      </div>

      {/* Terminal Section */}
      <div style={{ padding: '8rem 2rem', maxWidth: '1000px', margin: '0 auto' }}>
        <h3 className="font-syne" style={{ fontSize: '2.5rem', marginBottom: '3rem', textAlign: 'center' }}>LIVE FEED</h3>
        
        <div className="font-mono" style={{ 
          backgroundColor: '#080810', 
          border: '1px solid rgba(255,107,0,0.2)', 
          padding: '2rem', 
          borderRadius: '4px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
          lineHeight: 1.8,
          fontSize: '0.95rem',
          color: 'var(--text-secondary)'
        }}>
          <div><span style={{color: 'var(--accent-primary)'}}>ARIA &gt;</span> Analyzing Engine 034...</div>
          <div><span style={{color: 'var(--accent-primary)'}}>ARIA &gt;</span> <span style={{color: '#ff3b30', fontWeight: 'bold'}}>CRITICAL — RUL: 23 cycles [CI: 14–32]</span></div>
          <div><span style={{color: 'var(--accent-primary)'}}>ARIA &gt;</span> HPC Outlet Temp trending +1.2°C/cycle over 8 cycles.</div>
          <div><span style={{color: 'var(--accent-primary)'}}>ARIA &gt;</span> Core Speed declining 0.3% — compressor fouling suspected.</div>
          <div style={{marginTop: '1rem'}}><span style={{color: 'var(--accent-primary)'}}>ARIA &gt;</span> <span style={{color: '#ff3b30', fontWeight: 'bold'}}>VERDICT: GROUND ENGINE. Borescope HPC stages 3–5.</span></div>
          <div style={{marginTop: '1rem'}}><span className="blink" style={{color: 'var(--accent-primary)'}}>_</span></div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ padding: '6rem 2rem', textAlign: 'center', borderTop: '1px solid rgba(255,107,0,0.1)' }}>
        <h2 className="font-syne" style={{ fontSize: '2.5rem', marginBottom: '2rem', color: 'var(--text-primary)' }}>Hear only what ARIA tells you.</h2>
        <button className="btn-primary" style={{ marginBottom: '4rem', fontSize: '1rem', padding: '1rem 3rem' }}>Enter Demo →</button>
        
        <div className="font-mono" style={{ 
          color: 'var(--text-muted)', 
          fontSize: '0.85rem', 
          lineHeight: 1.8,
          maxWidth: '800px',
          margin: '0 auto',
          textAlign: 'center'
        }}>
          <div>Built on NASA Commercial Modular Aero-Propulsion System Simulation (CMAPSS)</div>
          <div>Model accuracy validated against ground truth RUL values</div>
          <div>Anomaly detection using z-score statistical analysis</div>
          <div>AI analysis powered by LLaMA 3.3 70B via Groq API</div>
          <div style={{ marginTop: '1.5rem', color: 'var(--text-secondary)' }}>Developed at Tamil Nadu, India &middot; 2026</div>
        </div>
      </div>
      
      <style>{`
        @keyframes blinker {
          50% { opacity: 0; }
        }
        .blink {
          animation: blinker 1s linear infinite;
        }
      `}</style>
    </div>
  );
}
