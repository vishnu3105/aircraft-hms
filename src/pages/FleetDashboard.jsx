import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { demoApi } from '../api/demoApi';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function FleetDashboard() {
  const [engines, setEngines] = useState([]);
  const [anomalies, setAnomalies] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedEngine, setSelectedEngine] = useState(null);
  const [filterState, setFilterState] = useState('ALL'); // ALL, CRITICAL, WARNING
  const [chartMode, setChartMode] = useState('THERMAL'); // THERMAL, ROTOR, AERO

  // Chat state
  const [chatLog, setChatLog] = useState([]);
  const [inputMsg, setInputMsg] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        await demoApi.resetChat();
        const engData = await demoApi.getEngines();
        setEngines(engData);
        if (engData.length > 0) setSelectedEngine(engData[0]);

        const anomData = await demoApi.getAnomalies();
        setAnomalies(anomData);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const currentSensors = selectedEngine?.current_sensors || [];

  useEffect(() => {
    if (!selectedEngine) return;
    const fetchEngineAnalysis = async () => {
      setChatLoading(true);
      const engineStr = `FD-${selectedEngine.engine_id.toString().padStart(3, '0')}`;
      setChatLog([{ role: 'assistant', content: `>> INITIALIZING EXPERT DIAGNOSTIC NODE... [TARGET: ${engineStr}]` }]);

      try {
        const res = await demoApi.analyzeEngine(
          selectedEngine.predicted_rul,
          selectedEngine.status,
          currentSensors
        );
        setChatLog([{ role: 'assistant', content: `[DIAGNOSTIC REPORT]\n\n${res.analysis}` }]);
      } catch (err) {
        setChatLog([{ role: 'assistant', content: '[ERR] DIAGNOSTIC NODE OFFLINE.' }]);
      } finally {
        setChatLoading(false);
      }
    };
    fetchEngineAnalysis();
  }, [selectedEngine?.engine_id]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatLog]);

  const handleSendChat = async (e) => {
    e.preventDefault();
    if (!inputMsg.trim()) return;

    const userText = inputMsg;
    setInputMsg('');
    setChatLog(prev => [...prev, { role: 'user', content: userText }]);
    setChatLoading(true);

    try {
      const engineContext = selectedEngine ? `Engine ${selectedEngine.engine_id}` : 'the fleet';
      const contextualMsg = `[Context: User is asking about ${engineContext}]: ${userText}`;
      
      const res = await demoApi.chatWithAria(contextualMsg);
      setChatLog(prev => [...prev, { role: 'assistant', content: res.response }]);
    } catch (err) {
      setChatLog(prev => [...prev, { role: 'assistant', content: '[ERR] CONNECTION REFUSED.' }]);
    } finally {
      setChatLoading(false);
    }
  };

  const chartData = selectedEngine?.historical_data || [];
  
  const filteredEngines = engines.filter(e => {
    if (filterState === 'CRITICAL') return e.status === 'critical';
    if (filterState === 'WARNING') return e.status === 'warning';
    return true;
  });

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr 340px', height: '100vh', width: '100vw', backgroundColor: '#0d0d0f', color: '#e0e0e0', overflow: 'hidden', fontFamily: 'monospace' }}>
      
      {/* 1. Fleet Sidebar */}
      <div style={{ backgroundColor: '#141416', borderRight: '1px solid #2a2a2e', display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        <div style={{ padding: '1rem', borderBottom: '1px solid #2a2a2e', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <Link to="/demo" style={{ color: '#888', textDecoration: 'none', fontSize: '0.8rem' }}>&larr; BACK</Link>
            <span style={{ fontSize: '0.8rem', color: '#ff3b30' }}>{engines.filter(e => e.status === 'critical').length} CRIT</span>
          </div>
          
          <div style={{ display: 'flex', backgroundColor: '#0d0d0f', border: '1px solid #2a2a2e', borderRadius: '4px', overflow: 'hidden' }}>
            {['ALL', 'CRITICAL', 'WARNING'].map(f => (
              <button 
                key={f} 
                onClick={() => setFilterState(f)}
                style={{ flex: 1, padding: '0.4rem', border: 'none', backgroundColor: filterState === f ? '#e0e0e0' : 'transparent', color: filterState === f ? '#000' : '#888', fontSize: '0.7rem', cursor: 'pointer', fontWeight: 'bold' }}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
        
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading ? <div style={{ padding: '1rem', fontSize: '0.8rem' }}>Awaiting datalink...</div> : filteredEngines.map(eng => (
            <div 
              key={eng.engine_id} 
              onClick={() => setSelectedEngine(eng)}
              style={{ 
                padding: '0.8rem 1rem', 
                borderBottom: '1px solid #1a1a1d',
                cursor: 'pointer',
                backgroundColor: selectedEngine?.engine_id === eng.engine_id ? '#202024' : 'transparent',
                borderLeft: eng.status === 'critical' ? '3px solid #ff3b30' : eng.status === 'warning' ? '3px solid #ffaa00' : '3px solid #34c759'
              }}
            >
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                 <div style={{ fontSize: '0.9rem', color: selectedEngine?.engine_id === eng.engine_id ? '#fff' : '#aaa' }}>FD-{eng.engine_id.toString().padStart(3, '0')}</div>
                 <div style={{ fontSize: '1.25rem', color: eng.status === 'sensor_failure' ? '#ff00ff' : eng.status === 'critical' ? '#ff3b30' : eng.status === 'warning' ? '#ffaa00' : '#34c759', fontWeight: 'bold' }}>
                {eng.status === 'sensor_failure' ? 'ERR' : eng.predicted_rul}
              </div>
               </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Main Analytics View */}
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', backgroundColor: '#0a0a0c' }}>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1.5rem', flex: 1, overflowY: 'auto' }}>
          
          {/* Header Block */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '1px solid #2a2a2e', paddingBottom: '1rem', flexShrink: 0 }}>
            <div>
              <div style={{ color: '#666', fontSize: '0.75rem', marginBottom: '0.2rem' }}>CMAPSS ML DEGRADATION ANALYSIS</div>
              <div style={{ fontSize: '1.5rem', color: '#fff', letterSpacing: '0.05em' }}>
                TARGET: FD-{selectedEngine?.engine_id.toString().padStart(3, '0')}
              </div>
            </div>
            {selectedEngine && (
              <div style={{ textAlign: 'right' }}>
                 <div style={{ color: '#666', fontSize: '0.75rem', marginBottom: '0.2rem' }}>PREDICTED RUL (95% CI)</div>
                 <div style={{ fontSize: '1.5rem', color: selectedEngine.status === 'critical' ? '#ff3b30' : '#fff' }}>
                   {selectedEngine.predicted_rul} <span style={{ fontSize: '1rem', color: '#888' }}>[{selectedEngine.lower_bound} - {selectedEngine.upper_bound}]</span>
                 </div>
              </div>
            )}
          </div>

          {/* Interactive Chart */}
          <div style={{ border: '1px solid #2a2a2e', backgroundColor: '#0d0d0f', padding: '1rem', flexShrink: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ color: '#888', fontSize: '0.75rem' }}>HISTORICAL CYCLE TRAJECTORY</div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {['THERMAL', 'ROTOR', 'AERO'].map(mode => (
                  <button 
                    key={mode} 
                    onClick={() => setChartMode(mode)}
                    style={{ padding: '0.2rem 0.6rem', backgroundColor: chartMode === mode ? '#2a2a2e' : 'transparent', border: '1px solid #2a2a2e', color: chartMode === mode ? '#fff' : '#666', fontSize: '0.7rem', cursor: 'pointer' }}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>
            
            <div style={{ height: '260px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="2 2" stroke="#1a1a1d" />
                  <XAxis dataKey="cycle" stroke="#444" tick={{fontSize: 10}} />
                  <YAxis yAxisId="left" domain={['dataMin - 1', 'dataMax + 1']} hide />
                  <YAxis yAxisId="right" orientation="right" domain={['dataMin - 1', 'dataMax + 1']} hide />
                  <Tooltip contentStyle={{ backgroundColor: '#141416', border: '1px solid #2a2a2e', borderRadius: 0, fontSize: '0.8rem' }} />
                  
                  {chartMode === 'THERMAL' && (
                    <>
                      <Line yAxisId="left" type="monotone" dataKey="lpc_temp" stroke="#e0e0e0" strokeWidth={2} dot={{ r: 2 }} name="LPC Temp (s3)" />
                      <Line yAxisId="right" type="monotone" dataKey="hpc_temp" stroke="#ff3b30" strokeWidth={2} dot={{ r: 2 }} name="HPC Temp (s4)" />
                    </>
                  )}
                  {chartMode === 'ROTOR' && (
                    <Line yAxisId="left" type="monotone" dataKey="core_speed" stroke="#3bc7ff" strokeWidth={2} dot={{ r: 2 }} name="Core Speed (s13)" />
                  )}
                  {chartMode === 'AERO' && (
                    <>
                      <Line yAxisId="left" type="monotone" dataKey="bypass_ratio" stroke="#4cd964" strokeWidth={2} dot={{ r: 2 }} name="Bypass Ratio (s8)" />
                      <Line yAxisId="right" type="monotone" dataKey="bleed_enthalpy" stroke="#ffcc00" strokeWidth={2} dot={{ r: 2 }} name="Bleed Enthalpy (s9)" />
                    </>
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          {/* Visual Gauge HUD */}
          {selectedEngine && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.5rem', flexShrink: 0 }}>
              {[
                { id: 's2', label: 'T24', val: currentSensors[0], min: 641, max: 644 },
                { id: 's3', label: 'LPC (T30)', val: currentSensors[1], min: 1580, max: 1615 },
                { id: 's4', label: 'HPC (T50)', val: currentSensors[2], min: 1390, max: 1435 },
                { id: 's7', label: 'Nf', val: currentSensors[4], min: 550, max: 555 },
                { id: 's11', label: 'Ps30', val: currentSensors[7], min: 46, max: 48.5 }
              ].map((s, idx) => {
                 const pct = Math.max(0, Math.min(100, ((s.val - s.min) / (s.max - s.min)) * 100));
                 const isCrit = pct > 85;
                 
                 return (
                  <div key={idx} style={{ backgroundColor: '#0d0d0f', border: '1px solid #2a2a2e', padding: '0.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.7rem', color: '#888' }}>
                      <span>{s.id}</span>
                      <span>{s.label}</span>
                    </div>
                    <div style={{ fontSize: '1.1rem', color: isCrit ? '#ff3b30' : '#fff', marginBottom: '0.5rem' }}>{s.val?.toFixed(2)}</div>
                    <div style={{ height: '3px', backgroundColor: '#1a1a1d', width: '100%', position: 'relative' }}>
                      <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: `${pct}%`, backgroundColor: isCrit ? '#ff3b30' : '#888' }}></div>
                    </div>
                  </div>
                 );
              })}
            </div>
          )}

          {/* Contextual Engine Diagnostics */}
          <div style={{ flex: 1, border: '1px solid #2a2a2e', backgroundColor: '#0d0d0f', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '0.5rem 1rem', borderBottom: '1px solid #2a2a2e', fontSize: '0.75rem', color: '#888', backgroundColor: '#141416' }}>
              UNIFIED SYSTEM DIAGNOSTIC TRACE
            </div>
            <div style={{ padding: '1rem', flex: 1, overflowY: 'auto' }}>
              {(() => {
                if (!selectedEngine) return null;
                const engineAnom = anomalies.find(a => a.engine_id === selectedEngine.engine_id);
                
                if (selectedEngine.status === 'sensor_failure') {
                  return (
                    <div style={{ color: '#aaa', fontSize: '0.8rem', lineHeight: 1.6 }}>
                      <span style={{ color: '#ff00ff', fontWeight: 'bold' }}>[ERR] INSTRUMENTATION OFFLINE.</span><br/><br/>
                      <span style={{ display: 'block', marginTop: '0.5rem', padding: '0.5rem', backgroundColor: '#1a101a', borderLeft: '2px solid #ff00ff' }}>
                        <strong>FAULT:</strong> {selectedEngine.diagnostic}
                      </span>
                      <br/>ML prognostics aborted. Ground crew dispatch requested to repair hardware sensor.
                    </div>
                  );
                } else if (selectedEngine.status === 'critical') {
                  return (
                    <div style={{ color: '#aaa', fontSize: '0.8rem', lineHeight: 1.6 }}>
                      <span style={{ color: '#ff3b30', fontWeight: 'bold' }}>[ERR] CRITICAL DEGRADATION DETECTED.</span><br/><br/>
                      <span style={{ color: '#fff', backgroundColor: '#331111', padding: '0.2rem 0.4rem', border: '1px solid #ff3b30' }}>
                        COMPONENT ISOLATION: {selectedEngine.failure_mode || 'GAS PATH ANOMALY'}
                      </span><br/><br/>
                      Asset exhibits exponential physical wear according to multi-variate prognostic models. Remaining Useful Life critically low.
                      {engineAnom && (
                         <span style={{ display: 'block', marginTop: '0.5rem', padding: '0.5rem', backgroundColor: '#1a1010', borderLeft: '2px solid #ff3b30' }}>
                           <strong>EVIDENCE:</strong> Statistical bounds exceeded on pathways <span style={{ color: '#fff' }}>{engineAnom.flagged_sensors.join(', ')}</span>. Standard deviation exceeds 2-sigma threshold.
                         </span>
                      )}
                      <br/>Immediate operational suspension requested.
                    </div>
                  );
                } else if (selectedEngine.status === 'warning') {
                  return (
                    <div style={{ color: '#aaa', fontSize: '0.8rem', lineHeight: 1.6 }}>
                      <span style={{ color: '#ffaa00', fontWeight: 'bold' }}>[WARN] DEGRADATION WARNING DETECTED.</span><br/><br/>
                      <span style={{ color: '#fff', backgroundColor: '#332200', padding: '0.2rem 0.4rem', border: '1px solid #ffaa00' }}>
                        COMPONENT ISOLATION: {selectedEngine.failure_mode || 'GAS PATH ANOMALY'}
                      </span><br/><br/>
                      Telemetry registers emerging multi-sensor drift. Predicted lifecycle limits approaching threshold boundaries.
                      {engineAnom && (
                        <span style={{ display: 'block', marginTop: '0.5rem', padding: '0.5rem', backgroundColor: '#1a1810', borderLeft: '2px solid #ffaa00' }}>
                          <strong>NOTE:</strong> Isolated 2-sigma spikes detected on <span style={{ color: '#fff' }}>{engineAnom.flagged_sensors.join(', ')}</span>.
                        </span>
                      )}
                      <br/>Scheduled maintenance cycle advised.
                    </div>
                  );
                } else if (engineAnom) {
                  return (
                    <div style={{ color: '#aaa', fontSize: '0.8rem', lineHeight: 1.6 }}>
                      <span style={{ color: '#ffaa00', fontWeight: 'bold' }}>[NOTE] SENSOR ANOMALY DETECTED.</span><br/><br/>
                      Overall multivariate engine prognostics remain nominal, however, isolated pathways (<span style={{ color: '#fff' }}>{engineAnom.flagged_sensors.join(', ')}</span>) show statistical deviation. Recommend visual inspection during next ground interval.
                    </div>
                  );
                } else {
                  return (
                    <div style={{ color: '#888', fontSize: '0.8rem', lineHeight: 1.6 }}>
                      <span style={{ color: '#34c759', fontWeight: 'bold' }}>[SYS] NOMINAL.</span><br/><br/>
                      Engine parameters within optimal CMAPSS boundaries. Trajectory aligns with healthy fleet models. Zero statistical anomalies detected. Structural integrity verified.
                    </div>
                  );
                }
              })()}
            </div>
          </div>

        </div>
      </div>

      {/* 3. ARIA Terminal (Chatbot) */}
      <div style={{ backgroundColor: '#141416', borderLeft: '1px solid #2a2a2e', display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        <div style={{ padding: '1rem', borderBottom: '1px solid #2a2a2e', flexShrink: 0, backgroundColor: '#0d0d0f' }}>
          <div style={{ fontSize: '0.8rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
            <div style={{ width: '6px', height: '6px', backgroundColor: '#fff', borderRadius: '50%' }}></div>
            ARIA INTELLIGENCE NODE
          </div>
          <div style={{ color: '#666', fontSize: '0.65rem' }}>LLaMA 3.3 70B &middot; ML CONTEXT</div>
        </div>
        
        {/* Chat History */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {chatLog.map((msg, idx) => (
            <div key={idx} style={{ alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '90%' }}>
              <div style={{ fontSize: '0.65rem', color: msg.role === 'user' ? '#666' : '#fff', marginBottom: '0.2rem', textAlign: msg.role === 'user' ? 'right' : 'left' }}>
                {msg.role === 'user' ? 'ENG' : 'ARIA'}
              </div>
              <div style={{ 
                backgroundColor: msg.role === 'user' ? '#202024' : '#0d0d0f', 
                border: '1px solid #2a2a2e', 
                padding: '0.75rem', 
                color: msg.role === 'user' ? '#e0e0e0' : '#ccc',
                fontSize: '0.8rem',
                lineHeight: 1.5,
                whiteSpace: 'pre-wrap'
              }}>
                {msg.content}
              </div>
            </div>
          ))}
          {chatLoading && (
            <div style={{ alignSelf: 'flex-start' }}>
               <div style={{ color: '#fff', fontSize: '0.8rem' }}>Processing...</div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Chat Input */}
        <div style={{ padding: '1rem', borderTop: '1px solid #2a2a2e', backgroundColor: '#0d0d0f', flexShrink: 0 }}>
          <form onSubmit={handleSendChat} style={{ display: 'flex', gap: '0.5rem' }}>
            <input 
              type="text" 
              value={inputMsg}
              onChange={e => setInputMsg(e.target.value)}
              placeholder="Query ARIA..."
              style={{ flex: 1, backgroundColor: '#141416', border: '1px solid #2a2a2e', color: '#fff', padding: '0.6rem', outline: 'none', fontSize: '0.8rem', fontFamily: 'monospace' }}
              disabled={chatLoading}
            />
            <button type="submit" disabled={chatLoading} style={{ backgroundColor: '#e0e0e0', color: '#000', border: 'none', padding: '0 0.8rem', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.8rem', fontFamily: 'monospace' }}>
              EXEC
            </button>
          </form>
        </div>
      </div>

    </div>
  );
}
