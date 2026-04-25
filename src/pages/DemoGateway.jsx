import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function DemoGateway() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', backgroundColor: '#0a0a0c', color: '#e0e0e0', overflow: 'hidden', fontFamily: 'monospace' }}>
      
      {/* Header section similar to Fleet Dashboard */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '1px solid #2a2a2e', padding: '1.5rem', flexShrink: 0, backgroundColor: '#0d0d0f' }}>
        <div>
          <div style={{ color: '#666', fontSize: '0.75rem', marginBottom: '0.2rem' }}>ARIA ROOT DIRECTORY</div>
          <div style={{ fontSize: '1.5rem', color: '#fff', letterSpacing: '0.05em' }}>
            DEMONSTRATION TERMINAL
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
           <Link to="/" style={{ color: '#888', textDecoration: 'none', fontSize: '0.75rem', border: '1px solid #2a2a2e', padding: '0.4rem 0.8rem', backgroundColor: '#141416', transition: 'background-color 0.2s', ...{ ':hover': { backgroundColor: '#202024' } } }}>
             &larr; ABORT DISCONNECT
           </Link>
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        
        <div style={{ width: '100%', maxWidth: '800px' }}>
          <div style={{ color: '#888', fontSize: '0.8rem', marginBottom: '2rem', textAlign: 'left', borderBottom: '1px solid #2a2a2e', paddingBottom: '0.5rem' }}>
            [SYS] SELECT OPERATIONAL PROTOCOL TO INITIATE DIAGNOSTICS
          </div>

          <div style={{ display: 'flex', gap: '1.5rem', width: '100%', alignItems: 'stretch' }}>
            
            <Link to="/demo/fleet" style={{ textDecoration: 'none', flex: 1, display: 'flex' }}>
              <motion.div whileHover={{ backgroundColor: '#141416', borderColor: '#ffaa00' }} transition={{ duration: 0.2 }} style={{ backgroundColor: '#0d0d0f', border: '1px solid #2a2a2e', padding: '2rem', cursor: 'pointer', display: 'flex', flexDirection: 'column', borderLeft: '3px solid #ffaa00', width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                   <div style={{ fontSize: '0.8rem', color: '#ffaa00', fontWeight: 'bold' }}>PROTOCOL 01</div>
                   <div style={{ fontSize: '0.65rem', color: '#666', border: '1px solid #2a2a2e', padding: '0.2rem 0.4rem' }}>BATCH TELEMETRY</div>
                </div>
                <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem', color: '#fff', letterSpacing: '0.05em' }}>NASA Fleet Dashboard</h3>
                <p style={{ color: '#888', fontSize: '0.8rem', lineHeight: 1.6, flex: 1, margin: 0 }}>Ingest batch telemetry from the CMAPSS dataset. View entire fleet anomalous deviations in a real-time tracking interface, monitoring multi-sensor trajectory patterns.</p>
                
                <div style={{ marginTop: '2rem', fontSize: '0.75rem', color: '#666', borderTop: '1px dashed #2a2a2e', paddingTop: '1rem', textAlign: 'right' }}>
                  &gt; EXECUTE INITIATE
                </div>
              </motion.div>
            </Link>

            <Link to="/demo/analyzer" style={{ textDecoration: 'none', flex: 1, display: 'flex' }}>
              <motion.div whileHover={{ backgroundColor: '#141416', borderColor: '#3bc7ff' }} transition={{ duration: 0.2 }} style={{ backgroundColor: '#0d0d0f', border: '1px solid #2a2a2e', padding: '2rem', cursor: 'pointer', display: 'flex', flexDirection: 'column', borderLeft: '3px solid #3bc7ff', width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                   <div style={{ fontSize: '0.8rem', color: '#3bc7ff', fontWeight: 'bold' }}>PROTOCOL 02</div>
                   <div style={{ fontSize: '0.65rem', color: '#666', border: '1px solid #2a2a2e', padding: '0.2rem 0.4rem' }}>ISOLATED PROGNOSTIC</div>
                </div>
                <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem', color: '#fff', letterSpacing: '0.05em' }}>Single Engine Analyzer</h3>
                <p style={{ color: '#888', fontSize: '0.8rem', lineHeight: 1.6, flex: 1, margin: 0 }}>Manual telemetry input override. Provide 13 critical thermal/rotor variables to perform isolated ML prognostics and LLM diagnostics on a single turbofan asset.</p>

                <div style={{ marginTop: '2rem', fontSize: '0.75rem', color: '#666', borderTop: '1px dashed #2a2a2e', paddingTop: '1rem', textAlign: 'right' }}>
                  &gt; EXECUTE INITIATE
                </div>
              </motion.div>
            </Link>
            
          </div>
        </div>

      </div>
    </div>
  );
}
