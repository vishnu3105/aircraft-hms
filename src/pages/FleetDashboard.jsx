import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { demoApi } from '../api/demoApi';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// Generate a stable session ID for this browser session
const SESSION_ID = crypto.randomUUID();

export default function FleetDashboard() {
  const [engines, setEngines]           = useState([]);
  const [anomalies, setAnomalies]       = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);
  const [selectedEngine, setSelectedEngine] = useState(null);
  const [filterState, setFilterState]   = useState('ALL');
  const [chartMode, setChartMode]       = useState('THERMAL');

  // Chat
  const [chatLog, setChatLog]           = useState([]);
  const [inputMsg, setInputMsg]         = useState('');
  const [chatLoading, setChatLoading]   = useState(false);
  const chatEndRef                      = useRef(null);
  const analysisAbortRef                = useRef(null);

  // Load fleet data once
  useEffect(() => {
    const load = async () => {
      try {
        await demoApi.resetChat(SESSION_ID);
        const [engData, anomData] = await Promise.all([
          demoApi.getEngines(),
          demoApi.getAnomalies(),
        ]);
        setEngines(engData);
        if (engData.length > 0) setSelectedEngine(engData[0]);
        setAnomalies(anomData);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // On engine switch: abort previous analysis, reset chat, fetch new analysis
  useEffect(() => {
    if (!selectedEngine) return;

    // Abort any in-flight analysis request
    if (analysisAbortRef.current) analysisAbortRef.current.abort();
    const controller = new AbortController();
    analysisAbortRef.current = controller;

    // Reset server-side session on switch
    demoApi.resetChat(SESSION_ID).catch(() => {});

    const engineStr = `FD-${selectedEngine.engine_id.toString().padStart(3, '0')}`;
    setChatLog([{ role: 'assistant', content: `>> INITIALIZING DIAGNOSTIC NODE... [TARGET: ${engineStr}]` }]);
    setChatLoading(true);

    demoApi.analyzeEngine(
      selectedEngine.predicted_rul,
      selectedEngine.status,
      selectedEngine.current_sensors || []
    ).then(res => {
      if (!controller.signal.aborted) {
        const arb = selectedEngine.arbitration_score;
        const verdict = selectedEngine.unified_verdict;
        const prefix = `[ARBITRATION SCORE: ${arb} → ${verdict}]\n\n[DIAGNOSTIC REPORT]\n\n`;
        setChatLog([{ role: 'assistant', content: prefix + res.analysis }]);
      }
    }).catch(err => {
      if (!controller.signal.aborted) {
        setChatLog([{ role: 'assistant', content: `[ERR] ${err.message || 'DIAGNOSTIC NODE OFFLINE.'}` }]);
      }
    }).finally(() => {
      if (!controller.signal.aborted) setChatLoading(false);
    });

    return () => controller.abort();
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
      const ctx = selectedEngine ? `Engine FD-${selectedEngine.engine_id.toString().padStart(3,'0')}` : 'the fleet';
      const res = await demoApi.chatWithAria(`[Context: ${ctx}]: ${userText}`, SESSION_ID);
      setChatLog(prev => [...prev, { role: 'assistant', content: res.response }]);
    } catch (err) {
      setChatLog(prev => [...prev, { role: 'assistant', content: `[ERR] ${err.message}` }]);
    } finally {
      setChatLoading(false);
    }
  };

  const chartData       = selectedEngine?.historical_data || [];
  const currentSensors  = selectedEngine?.current_sensors || [];
  const filteredEngines = engines.filter(e => {
    if (filterState === 'CRITICAL') return e.status === 'critical';
    if (filterState === 'WARNING')  return e.status === 'warning';
    return true;
  });

  // Sensor gauges — derive ranges from actual fleet data
  const sensorDefs = [
    { id: 's2',  label: 'T24',    val: currentSensors[0],  min: 641,  max: 645  },
    { id: 's3',  label: 'LPC',    val: currentSensors[1],  min: 1570, max: 1620 },
    { id: 's4',  label: 'HPC',    val: currentSensors[2],  min: 1380, max: 1460 },
    { id: 's7',  label: 'Nf',     val: currentSensors[4],  min: 548,  max: 558  },
    { id: 's11', label: 'Ps30',   val: currentSensors[7],  min: 44,   max: 50   },
  ];

  // Arbitration score color
  const arbColor = (score) => {
    if (score >= 0.75) return '#ff3b30';
    if (score >= 0.50) return '#ffaa00';
    if (score >= 0.25) return '#3bc7ff';
    return '#34c759';
  };

  if (error) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: '#0a0a0c', color: '#ff3b30', fontFamily: 'monospace', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ fontSize: '1rem' }}>[ERR] BACKEND CONNECTION FAILED</div>
        <div style={{ fontSize: '0.8rem', color: '#888' }}>{error}</div>
        <Link to="/demo" style={{ color: '#666', fontSize: '0.75rem', marginTop: '1rem' }}>← BACK</Link>
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr 340px', height: '100vh', width: '100vw', backgroundColor: '#0d0d0f', color: '#e0e0e0', overflow: 'hidden', fontFamily: 'monospace' }}>

      {/* ── 1. Fleet Sidebar ── */}
      <div style={{ backgroundColor: '#141416', borderRight: '1px solid #2a2a2e', display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        <div style={{ padding: '1rem', borderBottom: '1px solid #2a2a2e', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <Link to="/demo" style={{ color: '#888', textDecoration: 'none', fontSize: '0.8rem' }}>← BACK</Link>
            <span style={{ fontSize: '0.8rem', color: '#ff3b30' }}>{engines.filter(e => e.status === 'critical').length} CRIT</span>
          </div>
          <div style={{ display: 'flex', backgroundColor: '#0d0d0f', border: '1px solid #2a2a2e', borderRadius: '4px', overflow: 'hidden' }}>
            {['ALL', 'CRITICAL', 'WARNING'].map(f => (
              <button key={f} onClick={() => setFilterState(f)}
                style={{ flex: 1, padding: '0.4rem', border: 'none', backgroundColor: filterState === f ? '#e0e0e0' : 'transparent', color: filterState === f ? '#000' : '#888', fontSize: '0.7rem', cursor: 'pointer', fontWeight: 'bold' }}>
                {f}
              </button>
            ))}
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading
            ? <div style={{ padding: '1rem', fontSize: '0.8rem' }}>Awaiting datalink...</div>
            : filteredEngines.map(eng => (
              <div key={eng.engine_id} onClick={() => setSelectedEngine(eng)}
                style={{ padding: '0.8rem 1rem', borderBottom: '1px solid #1a1a1d', cursor: 'pointer',
                  backgroundColor: selectedEngine?.engine_id === eng.engine_id ? '#202024' : 'transparent',
                  borderLeft: eng.status === 'critical' ? '3px solid #ff3b30' : eng.status === 'warning' ? '3px solid #ffaa00' : eng.status === 'sensor_failure' ? '3px solid #ff00ff' : '3px solid #34c759' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: '0.9rem', color: selectedEngine?.engine_id === eng.engine_id ? '#fff' : '#aaa' }}>
                    FD-{eng.engine_id.toString().padStart(3, '0')}
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 'bold',
                    color: eng.status === 'sensor_failure' ? '#ff00ff' : eng.status === 'critical' ? '#ff3b30' : eng.status === 'warning' ? '#ffaa00' : '#34c759' }}>
                    {eng.status === 'sensor_failure' ? 'ERR' : eng.predicted_rul}
                  </div>
                </div>
                {eng.unified_verdict && eng.unified_verdict !== 'NOMINAL' && (
                  <div style={{ fontSize: '0.6rem', color: arbColor(eng.arbitration_score), marginTop: '0.2rem' }}>
                    ARB: {eng.arbitration_score} → {eng.unified_verdict}
                  </div>
                )}
              </div>
            ))}
        </div>
      </div>

      {/* ── 2. Main Analytics ── */}
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', backgroundColor: '#0a0a0c' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1.5rem', flex: 1, overflowY: 'auto' }}>

          {/* Header */}
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
                  {selectedEngine.predicted_rul}{' '}
                  <span style={{ fontSize: '1rem', color: '#888' }}>
                    [{selectedEngine.lower_bound} – {selectedEngine.upper_bound}]
                  </span>
                </div>
                {selectedEngine.unified_verdict && (
                  <div style={{ fontSize: '0.75rem', marginTop: '0.3rem' }}>
                    <span style={{ color: '#666' }}>ARBITRATION: </span>
                    <span style={{ color: arbColor(selectedEngine.arbitration_score), fontWeight: 'bold' }}>
                      {selectedEngine.arbitration_score} → {selectedEngine.unified_verdict}
                    </span>
                    <span style={{ color: '#555', marginLeft: '0.5rem' }}>
                      σ={selectedEngine.ens_std}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Chart */}
          <div style={{ border: '1px solid #2a2a2e', backgroundColor: '#0d0d0f', padding: '1rem', flexShrink: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ color: '#888', fontSize: '0.75rem' }}>HISTORICAL CYCLE TRAJECTORY</div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {['THERMAL', 'ROTOR', 'AERO'].map(mode => (
                  <button key={mode} onClick={() => setChartMode(mode)}
                    style={{ padding: '0.2rem 0.6rem', backgroundColor: chartMode === mode ? '#2a2a2e' : 'transparent', border: '1px solid #2a2a2e', color: chartMode === mode ? '#fff' : '#666', fontSize: '0.7rem', cursor: 'pointer' }}>
                    {mode}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ height: '220px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="2 2" stroke="#1a1a1d" />
                  <XAxis dataKey="cycle" stroke="#444" tick={{ fontSize: 10 }} />
                  <YAxis yAxisId="l" domain={['dataMin - 1', 'dataMax + 1']} hide />
                  <YAxis yAxisId="r" orientation="right" domain={['dataMin - 1', 'dataMax + 1']} hide />
                  <Tooltip contentStyle={{ backgroundColor: '#141416', border: '1px solid #2a2a2e', borderRadius: 0, fontSize: '0.8rem' }} />
                  {chartMode === 'THERMAL' && (<>
                    <Line yAxisId="l" type="monotone" dataKey="lpc_temp" stroke="#e0e0e0" strokeWidth={2} dot={{ r: 2 }} name="LPC (s3)" />
                    <Line yAxisId="r" type="monotone" dataKey="hpc_temp" stroke="#ff3b30" strokeWidth={2} dot={{ r: 2 }} name="HPC (s4)" />
                  </>)}
                  {chartMode === 'ROTOR' && (
                    <Line yAxisId="l" type="monotone" dataKey="core_speed" stroke="#3bc7ff" strokeWidth={2} dot={{ r: 2 }} name="Core Speed (s13)" />
                  )}
                  {chartMode === 'AERO' && (<>
                    <Line yAxisId="l" type="monotone" dataKey="bypass_ratio" stroke="#4cd964" strokeWidth={2} dot={{ r: 2 }} name="Bypass (s8)" />
                    <Line yAxisId="r" type="monotone" dataKey="bleed_enthalpy" stroke="#ffcc00" strokeWidth={2} dot={{ r: 2 }} name="Bleed (s9)" />
                  </>)}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Sensor Gauges */}
          {selectedEngine && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.5rem', flexShrink: 0 }}>
              {sensorDefs.map((s, idx) => {
                const pct   = Math.max(0, Math.min(100, ((s.val - s.min) / (s.max - s.min)) * 100));
                const isCrit = pct > 85;
                const isFlagged = selectedEngine.flagged_sensors?.includes(s.id);
                return (
                  <div key={idx} style={{ backgroundColor: '#0d0d0f', border: `1px solid ${isFlagged ? '#ffaa00' : '#2a2a2e'}`, padding: '0.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.7rem', color: isFlagged ? '#ffaa00' : '#888' }}>
                      <span>{s.id}</span><span>{s.label}</span>
                    </div>
                    <div style={{ fontSize: '1.1rem', color: isCrit ? '#ff3b30' : isFlagged ? '#ffaa00' : '#fff', marginBottom: '0.5rem' }}>
                      {s.val?.toFixed(2)}
                    </div>
                    <div style={{ height: '3px', backgroundColor: '#1a1a1d', width: '100%', position: 'relative' }}>
                      <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: `${pct}%`, backgroundColor: isCrit ? '#ff3b30' : isFlagged ? '#ffaa00' : '#555' }} />
                    </div>
                    {isFlagged && <div style={{ fontSize: '0.6rem', color: '#ffaa00', marginTop: '0.3rem' }}>2σ ANOMALY</div>}
                  </div>
                );
              })}
            </div>
          )}

          {/* Diagnostic Trace */}
          <div style={{ flex: 1, border: '1px solid #2a2a2e', backgroundColor: '#0d0d0f', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '0.5rem 1rem', borderBottom: '1px solid #2a2a2e', fontSize: '0.75rem', color: '#888', backgroundColor: '#141416', display: 'flex', justifyContent: 'space-between' }}>
              <span>UNIFIED SYSTEM DIAGNOSTIC TRACE</span>
              {selectedEngine?.arbitration_score !== undefined && (
                <span style={{ color: arbColor(selectedEngine.arbitration_score) }}>
                  ARBITRATION: {selectedEngine.arbitration_score} → {selectedEngine.unified_verdict}
                </span>
              )}
            </div>
            <div style={{ padding: '1rem', flex: 1, overflowY: 'auto' }}>
              {(() => {
                if (!selectedEngine) return null;
                const anom = anomalies.find(a => a.engine_id === selectedEngine.engine_id);

                if (selectedEngine.status === 'sensor_failure') return (
                  <div style={{ color: '#aaa', fontSize: '0.8rem', lineHeight: 1.6 }}>
                    <span style={{ color: '#ff00ff', fontWeight: 'bold' }}>[ERR] INSTRUMENTATION OFFLINE.</span><br /><br />
                    <span style={{ display: 'block', padding: '0.5rem', backgroundColor: '#1a101a', borderLeft: '2px solid #ff00ff' }}>
                      <strong>FAULT:</strong> {selectedEngine.diagnostic}
                    </span>
                    <br />ML prognostics aborted. Ground crew dispatch requested.
                  </div>
                );

                if (selectedEngine.status === 'critical') return (
                  <div style={{ color: '#aaa', fontSize: '0.8rem', lineHeight: 1.6 }}>
                    <span style={{ color: '#ff3b30', fontWeight: 'bold' }}>[CRITICAL] DEGRADATION CONFIRMED — ARBITRATION SCORE: {selectedEngine.arbitration_score}</span><br /><br />
                    <span style={{ color: '#fff', backgroundColor: '#331111', padding: '0.2rem 0.4rem', border: '1px solid #ff3b30' }}>
                      COMPONENT ISOLATION: {selectedEngine.failure_mode || 'GAS PATH ANOMALY'}
                    </span><br /><br />
                    Exponential wear trajectory confirmed by multi-variate ensemble. RUL critically low.
                    {anom && (
                      <span style={{ display: 'block', marginTop: '0.5rem', padding: '0.5rem', backgroundColor: '#1a1010', borderLeft: '2px solid #ff3b30' }}>
                        <strong>EVIDENCE:</strong> 2σ breach on {anom.flagged_sensors.join(', ')} (max-Z: {anom.max_z}).
                      </span>
                    )}
                    <br /><strong>VERDICT: IMMEDIATE OPERATIONAL SUSPENSION.</strong>
                  </div>
                );

                if (selectedEngine.status === 'warning') return (
                  <div style={{ color: '#aaa', fontSize: '0.8rem', lineHeight: 1.6 }}>
                    <span style={{ color: '#ffaa00', fontWeight: 'bold' }}>[WARNING] DEGRADATION TRAJECTORY DETECTED — ARBITRATION SCORE: {selectedEngine.arbitration_score}</span><br /><br />
                    <span style={{ color: '#fff', backgroundColor: '#332200', padding: '0.2rem 0.4rem', border: '1px solid #ffaa00' }}>
                      COMPONENT ISOLATION: {selectedEngine.failure_mode || 'GAS PATH ANOMALY'}
                    </span><br /><br />
                    Multi-sensor drift registered. Lifecycle limits approaching threshold boundaries.
                    {anom && (
                      <span style={{ display: 'block', marginTop: '0.5rem', padding: '0.5rem', backgroundColor: '#1a1810', borderLeft: '2px solid #ffaa00' }}>
                        <strong>NOTE:</strong> Isolated 2σ spikes on {anom.flagged_sensors.join(', ')}.
                      </span>
                    )}
                    <br />Scheduled maintenance cycle advised within next operational window.
                  </div>
                );

                if (anom) return (
                  <div style={{ color: '#aaa', fontSize: '0.8rem', lineHeight: 1.6 }}>
                    <span style={{ color: '#3bc7ff', fontWeight: 'bold' }}>[ADVISORY] SENSOR ANOMALY NOTED — ARBITRATION SCORE: {selectedEngine.arbitration_score}</span><br /><br />
                    Overall prognostics nominal. Isolated pathways (<span style={{ color: '#fff' }}>{anom.flagged_sensors.join(', ')}</span>) show statistical deviation. Visual inspection at next ground interval.
                  </div>
                );

                return (
                  <div style={{ color: '#888', fontSize: '0.8rem', lineHeight: 1.6 }}>
                    <span style={{ color: '#34c759', fontWeight: 'bold' }}>[NOMINAL] ALL SYSTEMS CLEAR — ARBITRATION SCORE: {selectedEngine.arbitration_score}</span><br /><br />
                    Parameters within optimal CMAPSS boundaries. Zero statistical anomalies. Structural integrity verified. Ensemble consensus: healthy degradation trajectory.
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      </div>

      {/* ── 3. ARIA Terminal ── */}
      <div style={{ backgroundColor: '#141416', borderLeft: '1px solid #2a2a2e', display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        <div style={{ padding: '1rem', borderBottom: '1px solid #2a2a2e', flexShrink: 0, backgroundColor: '#0d0d0f' }}>
          <div style={{ fontSize: '0.8rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
            <div style={{ width: '6px', height: '6px', backgroundColor: '#34c759', borderRadius: '50%' }} />
            ARIA INTELLIGENCE NODE
          </div>
          <div style={{ color: '#666', fontSize: '0.65rem' }}>LLaMA 3.3 70B · Diverse XGBoost Ensemble · Session: {SESSION_ID.slice(0, 8)}</div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {chatLog.map((msg, idx) => (
            <div key={idx} style={{ alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '95%' }}>
              <div style={{ fontSize: '0.65rem', color: msg.role === 'user' ? '#666' : '#34c759', marginBottom: '0.2rem', textAlign: msg.role === 'user' ? 'right' : 'left' }}>
                {msg.role === 'user' ? 'OPERATOR' : 'ARIA'}
              </div>
              <div style={{ backgroundColor: msg.role === 'user' ? '#202024' : '#0d0d0f', border: '1px solid #2a2a2e', padding: '0.75rem', color: msg.role === 'user' ? '#e0e0e0' : '#ccc', fontSize: '0.8rem', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                {msg.content}
              </div>
            </div>
          ))}
          {chatLoading && (
            <div style={{ alignSelf: 'flex-start', color: '#34c759', fontSize: '0.8rem' }}>Processing...</div>
          )}
          <div ref={chatEndRef} />
        </div>

        <div style={{ padding: '1rem', borderTop: '1px solid #2a2a2e', backgroundColor: '#0d0d0f', flexShrink: 0 }}>
          <form onSubmit={handleSendChat} style={{ display: 'flex', gap: '0.5rem' }}>
            <input type="text" value={inputMsg} onChange={e => setInputMsg(e.target.value)}
              placeholder="Query ARIA..." disabled={chatLoading}
              style={{ flex: 1, backgroundColor: '#141416', border: '1px solid #2a2a2e', color: '#fff', padding: '0.6rem', outline: 'none', fontSize: '0.8rem', fontFamily: 'monospace' }} />
            <button type="submit" disabled={chatLoading}
              style={{ backgroundColor: '#34c759', color: '#000', border: 'none', padding: '0 0.8rem', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.8rem', fontFamily: 'monospace' }}>
              EXEC
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
