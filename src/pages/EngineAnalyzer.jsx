import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { demoApi } from '../api/demoApi';

export default function EngineAnalyzer() {
  const [sensors, setSensors] = useState(Array(13).fill(0));
  const [result, setResult] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);

  // default mock values for an average NASA dataset engine
  const defaultSensors = [
    642.15, 1589.70, 1400.60, 21.61, 553.36, 2388.06, 9046.19, 
    47.20, 521.90, 2388.02, 8140.00, 8.44, 39.00
  ];

  const handlePredict = async () => {
    setLoading(true);
    setResult(null);
    setAnalysis(null);
    try {
      const predRes = await demoApi.predictEngine(sensors);
      setResult(predRes);
      
      if (predRes.status === 'sensor_failure') {
         setAnalysis("ML PREDICTION ABORTED. Diagnostics isolated to hardware instrumentation layer. Ground crew dispatch requested for sensor replacement.");
      } else {
         const analysisRes = await demoApi.analyzeEngine(predRes.rul, predRes.status, sensors);
         setAnalysis(analysisRes.analysis);
      }
    } catch (err) {
      console.error(err);
      setResult({ rul: 0, status: 'error' });
      setAnalysis("FLASK BACKEND OFFLINE. Cannot perform ML prediction.");
    } finally {
      setLoading(false);
    }
  };

  const loadDefaults = () => setSensors([...defaultSensors]);
  const loadCritical = () => {
    const critical = [...defaultSensors];
    critical[1] += 50; 
    critical[2] += 100; 
    critical[6] -= 200; 
    setSensors(critical);
  };
  
  const loadSensorFault = () => {
    const fault = [...defaultSensors];
    fault[0] = 2000; // Fake Fan Inlet Temp (s2) much hotter than Compressor (s3)
    setSensors(fault);
  }

  const featureNames = ['s2 - Fan Inlet T', 's3 - LPC Outlet T', 's4 - HPC Outlet T', 's6 - Total Hyd Pr', 's7 - Fan Speed', 's8 - Bypass Ratio', 's9 - Bleed Enthalpy', 's11 - HPC Outlet P', 's12 - Fan Sp Ratio', 's13 - Core Speed', 's14 - Eng Pr Ratio', 's15 - Coolant Bleed', 's17 - Turbine In T'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', backgroundColor: '#0a0a0c', color: '#e0e0e0', overflow: 'hidden', fontFamily: 'monospace' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '1px solid #2a2a2e', padding: '1.5rem', flexShrink: 0, backgroundColor: '#0d0d0f' }}>
        <div>
          <div style={{ color: '#666', fontSize: '0.75rem', marginBottom: '0.2rem' }}>ISOLATED PROGNOSTIC OVERRIDE</div>
          <div style={{ fontSize: '1.5rem', color: '#fff', letterSpacing: '0.05em' }}>
            SINGLE ENGINE ANALYZER
          </div>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
          <button onClick={loadDefaults} style={{ fontSize: '0.75rem', padding: '0.4rem 0.8rem', backgroundColor: '#141416', border: '1px solid #34c759', color: '#34c759', cursor: 'pointer', outline: 'none' }}>[NOMINAL]</button>
          <button onClick={loadCritical} style={{ fontSize: '0.75rem', padding: '0.4rem 0.8rem', backgroundColor: '#141416', border: '1px solid #ffaa00', color: '#ffaa00', cursor: 'pointer', outline: 'none' }}>[CRITICAL]</button>
          <button onClick={loadSensorFault} style={{ fontSize: '0.75rem', padding: '0.4rem 0.8rem', backgroundColor: '#141416', border: '1px solid #ff00ff', color: '#ff00ff', cursor: 'pointer', outline: 'none' }}>[TRIGGER SENSOR FAULT]</button>
          <Link to="/demo" style={{ color: '#888', textDecoration: 'none', fontSize: '0.75rem', border: '1px solid #2a2a2e', padding: '0.4rem 0.8rem', backgroundColor: '#141416', marginLeft: '1rem' }}>
             &larr; ABORT DISCONNECT
          </Link>
        </div>
      </div>

      <div style={{ padding: '2rem', display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '2rem', flex: 1, backgroundColor: '#0a0a0c', overflowY: 'auto' }}>
        
        {/* Sensor Inputs */}
        <div style={{ backgroundColor: '#0d0d0f', border: '1px solid #2a2a2e', padding: '2rem', display: 'flex', flexDirection: 'column' }}>
          <div style={{ color: '#888', fontSize: '0.75rem', marginBottom: '1.5rem' }}>MANUAL TELEMETRY PARAMETERS (13)</div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
            {sensors.map((val, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column' }}>
                <label style={{ fontSize: '0.65rem', color: '#666', marginBottom: '0.3rem' }}>{featureNames[i]}</label>
                <input 
                  type="number" 
                  value={val}
                  onChange={e => {
                    const newSensors = [...sensors];
                    newSensors[i] = parseFloat(e.target.value) || 0;
                    setSensors(newSensors);
                  }}
                  style={{
                    backgroundColor: '#141416',
                    border: '1px solid #2a2a2e',
                    color: '#fff',
                    padding: '0.6rem',
                    fontFamily: 'monospace',
                    fontSize: '0.8rem',
                    outline: 'none',
                    width: '100%',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            ))}
          </div>

          <button 
            onClick={handlePredict} 
            disabled={loading}
            style={{ 
              width: '100%', 
              padding: '1rem', 
              backgroundColor: '#e0e0e0', 
              color: '#000', 
              border: 'none', 
              cursor: loading ? 'wait' : 'pointer', 
              fontWeight: 'bold', 
              fontSize: '0.85rem', 
              fontFamily: 'monospace',
              marginTop: 'auto'
            }}
          >
            {loading ? 'EXECUTING PREDICTION...' : 'RUN ML INFERENCE'}
          </button>
        </div>

        {/* Results Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          <div style={{ backgroundColor: '#0d0d0f', border: '1px solid #2a2a2e', padding: '2rem', display: 'flex', flexDirection: 'column' }}>
            <div style={{ color: '#888', fontSize: '0.75rem', marginBottom: '1.5rem' }}>DIAGNOSTIC OUTPUT</div>
            
            <div style={{ 
              backgroundColor: '#141416', 
              border: '1px solid #2a2a2e', 
              borderLeft: result?.status === 'sensor_failure' ? '4px solid #ff00ff' : result?.status === 'critical' ? '4px solid #ff3b30' : result?.status === 'warning' ? '4px solid #ffaa00' : result?.status === 'healthy' ? '4px solid #34c759' : '1px solid #2a2a2e',
              padding: '2rem',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: result?.status === 'sensor_failure' ? 'flex-start' : 'center',
              minHeight: '160px'
            }}>
              {!result && !loading && (
                <div style={{ color: '#666', fontSize: '0.85rem', alignSelf: 'center' }}>AWAITING SENSOR INGESTION</div>
              )}
              {loading && (
                <div style={{ color: '#888', fontSize: '0.85rem', alignSelf: 'center' }}>COMPUTING RUL BOUNDS...</div>
              )}
              {result && !loading && result.status === 'sensor_failure' && (
                <>
                  <div style={{ color: '#ff00ff', fontSize: '0.8rem', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '1rem' }}>
                    [INSTRUMENTATION OFFLINE]
                  </div>
                  <div style={{ color: '#e0e0e0', fontSize: '0.9rem', lineHeight: 1.6, paddingBottom: '0.5rem' }}>
                    {result.diagnostic}
                  </div>
                  <div style={{ color: '#666', fontSize: '0.75rem', marginTop: '1rem' }}>
                    ML PREDICTION HALTED. FIX SENSOR TO RESUME PROGNOSTICS.
                  </div>
                </>
              )}
              {result && !loading && result.status !== 'sensor_failure' && (
                <>
                  <div style={{ color: '#666', fontSize: '0.75rem', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
                    PREDICTED STATUS: <span style={{ color: result.status === 'critical' ? '#ff3b30' : result.status === 'warning' ? '#ffaa00' : '#34c759', fontWeight: 'bold' }}>{result.status}</span>
                  </div>
                  <div style={{ fontSize: '3rem', color: result.status === 'critical' ? '#ff3b30' : result.status === 'warning' ? '#ffaa00' : '#34c759', lineHeight: 1 }}>
                    {result.rul} <span style={{ fontSize: '1.2rem', color: '#666' }}>CYCLES</span>
                  </div>
                  {(result.lower_bound !== undefined && result.upper_bound !== undefined) && (
                    <div style={{ color: '#aaa', fontSize: '0.85rem', marginTop: '1rem' }}>
                       CI [10th/90th]: {result.lower_bound} — {result.upper_bound}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          <div style={{ backgroundColor: '#0d0d0f', border: '1px solid #2a2a2e', padding: '2rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={{ color: '#888', fontSize: '0.75rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: '6px', height: '6px', backgroundColor: '#fff', borderRadius: '50%' }}></div>
              ARIA INTELLIGENCE NODE (LLaMA 3.3)
            </div>
            
            <div style={{ 
              backgroundColor: '#141416', 
              border: '1px solid #2a2a2e', 
              padding: '1.5rem',
              flex: 1,
              color: '#ccc',
              fontSize: '0.8rem',
              lineHeight: 1.6,
              whiteSpace: 'pre-wrap',
              overflowY: 'auto'
            }}>
              {!analysis && !loading && <span style={{ color: '#666' }}>&gt; No diagnostic analysis available.</span>}
              {loading && <span style={{ color: '#888' }}>&gt; _</span>}
              {analysis && <span style={{ color: '#fff' }}>&gt; {analysis}</span>}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
