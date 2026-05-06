from flask import Flask, render_template, jsonify, request, send_from_directory
from flask_cors import CORS
import pandas as pd
import numpy as np
from xgboost import XGBRegressor
import pickle, os, json, traceback

# --- Groq (graceful fallback) ---
groq_available = False
groq_client = None
try:
    from groq import Groq
    _key = os.getenv("GROQ_API_KEY", "")
    if _key:
        groq_client = Groq(api_key=_key)
        groq_available = True
        print("[OK] Groq ARIA Intelligence Node online.")
    else:
        print("[!] GROQ_API_KEY not set - ARIA LLM features disabled.")
except Exception as e:
    print(f"[!] Groq init failed: {e} - ARIA LLM features disabled.")

app = Flask(__name__, static_folder='dist', static_url_path='/')
CORS(app, origins=["http://localhost:5173", "http://localhost:3000", "http://localhost:5000"])

# --- Schema ---
columns = ['engine_id','cycle','setting1','setting2','setting3',
           's1','s2','s3','s4','s5','s6','s7','s8','s9','s10',
           's11','s12','s13','s14','s15','s16','s17','s18','s19','s20','s21']
drop_cols_test = ['engine_id','cycle','setting1','setting2','setting3',
                  's1','s5','s10','s16','s18','s19','s20','s21']
feature_names  = ['s2','s3','s4','s6','s7','s8','s9','s11','s12','s13','s14','s15','s17']

# --- Load Ensemble ---
print("Loading Bayesian Ensemble Models...")
models = []
for i in range(5):
    with open(f'model_ens_{i}.pkl', 'rb') as f:
        models.append(pickle.load(f))
print(f"[OK] {len(models)} ensemble nodes loaded.")

# --- Load Metadata ---
print("Loading model metadata...")
with open('model_metadata.json', 'r') as f:
    META = json.load(f)

FLEET_TEMPORAL_MEAN = META['fleet_temporal_mean']
FLEET_TEMPORAL_STD  = META['fleet_temporal_std']
FLEET_SENSOR_MEAN   = pd.Series(META['fleet_sensor_mean'])
FLEET_SENSOR_STD    = pd.Series(META['fleet_sensor_std']).replace(0, 1e-9)
FI_RANKED           = META['feature_importance_ranked']
ENS_RMSE            = META['training_summary']['ensemble_rmse']
SENSOR_LABELS       = META['sensor_labels']

# Top 5 most important features for ARIA context
TOP_FEATURES = list(FI_RANKED.keys())[:5]

# --- Load Test Data ---
def build_temporal_features(df, features, w=5):
    df = df.sort_values(['engine_id','cycle'])
    rm = df.groupby('engine_id')[features].rolling(w, min_periods=1).mean().reset_index(0, drop=True)
    rm.columns = [f"{c}_avg_{w}" for c in features]
    rs = df.groupby('engine_id')[features].rolling(w, min_periods=1).std().reset_index(0, drop=True).fillna(0)
    rs.columns = [f"{c}_std_{w}" for c in features]
    return pd.concat([df, rm, rs], axis=1)

print("Ingesting CMAPSS fleet datasets...")
test       = pd.read_csv('test_FD001.txt',  sep=r'\s+', header=None, names=columns)
rul_actual = pd.read_csv('RUL_FD001.txt', header=None, names=['RUL'])

print("Building temporal feature arrays...")
test      = build_temporal_features(test, feature_names)
test_last = test.groupby('engine_id').last().reset_index()
X_test    = test_last.drop(columns=drop_cols_test)

# --- Ensemble Inference (fleet) ---
raw_preds   = np.array([m.predict(X_test) for m in models])
pred_mean   = np.mean(raw_preds, axis=0)
pred_std    = np.std(raw_preds, axis=0)
predictions = pred_mean.astype(int)
lower_bounds = np.clip(pred_mean - 1.96 * pred_std, 0, None).astype(int)
upper_bounds = np.clip(pred_mean + 1.96 * pred_std, 0, 125).astype(int)

# --- Physics Validation ---
def validate_sensors(row_series):
    """Returns (is_fault, diagnostic_message). Pure data-driven - no hardcoded engine IDs."""
    for col in feature_names:
        v = row_series[col]
        if v <= 0:
            return True, (f"SIGNAL LOSS: {col} ({SENSOR_LABELS.get(col, col)}) reports "
                          f"physically impossible value ({v:.4f}). "
                          f"Instrumentation offline or short-to-ground detected.")
    if row_series['s7'] > 15000:
        return True, (f"RPM OVERLIMIT: s7 (Fan Speed) reads {row_series['s7']:.0f} RPM - "
                      f"exceeds mechanical material shatter limit. Tachometer calibration failure.")
    if row_series['s2'] > row_series['s3']:
        return True, (f"THERMO MISMATCH: T24 Fan Inlet ({row_series['s2']:.2f} deg R) hotter than "
                      f"T30 LPC Outlet ({row_series['s3']:.2f} deg R). Inviolable thermodynamic law violated.")
    return False, ""

# --- Degradation Mode Classifier ---
def classify_failure_mode(row):
    z = (row[feature_names] - FLEET_SENSOR_MEAN) / FLEET_SENSOR_STD
    if row.get('s7_std_5', 0) > 1.5 * FLEET_TEMPORAL_MEAN.get('s7_std_5', 1):
        return "ROTOR DYNAMICS / BEARING DEGRADATION"
    max_z_col = z[feature_names].abs().idxmax()
    mapping = {
        's4':  "HIGH-PRESSURE COMPRESSOR (HPC) FOULING DETECTED",
        's11': "HIGH-PRESSURE COMPRESSOR (HPC) FOULING DETECTED",
        's3':  "LOW-PRESSURE COMPRESSOR (LPC) CLEARANCE DETERIORATION",
        's15': "COMBUSTOR HOT SECTION / TURBINE SEAL EROSION",
        's17': "COMBUSTOR HOT SECTION / TURBINE SEAL EROSION",
        's9':  "COMBUSTOR HOT SECTION / TURBINE SEAL EROSION",
        's7':  "AERODYNAMIC IMBALANCE / SHAFT VIBRATION ISOLATED",
        's8':  "AERODYNAMIC IMBALANCE / SHAFT VIBRATION ISOLATED",
        's13': "AERODYNAMIC IMBALANCE / SHAFT VIBRATION ISOLATED",
    }
    return mapping.get(max_z_col, "UNKNOWN GAS PATH DEGRADATION SIGNATURE")

# --- Unified Arbitration Engine (F1) ---
def compute_arbitration(rul, lower, upper, flagged_sensors, is_sensor_fault, ens_std_val):
    """Weighted multi-signal severity fusion. Returns (score 0-1, unified_verdict)."""
    w_ml      = 0.40
    w_zscore  = 0.30
    w_physics = 0.20
    w_uq      = 0.10

    ml_score      = 1.0 - float(np.clip(rul / 125.0, 0, 1))
    zscore_score  = min(len(flagged_sensors) / 13.0, 1.0)
    physics_score = 1.0 if is_sensor_fault else 0.0
    uq_score      = min((upper - lower) / 125.0, 1.0)

    combined = (w_ml * ml_score + w_zscore * zscore_score +
                w_physics * physics_score + w_uq * uq_score)

    if is_sensor_fault:
        verdict = "GROUNDED"
    elif combined >= 0.75:
        verdict = "CRITICAL"
    elif combined >= 0.50:
        verdict = "WARNING"
    elif combined >= 0.25:
        verdict = "ADVISORY"
    else:
        verdict = "NOMINAL"

    return round(float(combined), 3), verdict

# --- Conversation Store (per-session) ---
conversation_store = {}   # { session_id: [{"role": ..., "content": ...}, ...] }
MAX_HISTORY = 20

# --- ARIA System Prompt (built once at startup with real ML metadata) ---
def build_aria_system_prompt(fleet_critical, fleet_warning, fleet_healthy, fleet_summary_lines):
    node_details = "\n".join([
        f"  Node {n['node_id']} [{n['name']}]: depth={n['params']['max_depth']}, "
        f"lr={n['params']['learning_rate']}, n_est={n['params']['n_estimators']}, "
        f"subsample={n['params']['subsample']} -> RMSE={n['rmse']} cycles"
        for n in META['ensemble_nodes']
    ])
    top_fi = "\n".join([
        f"  {rank+1}. {feat} ({SENSOR_LABELS.get(feat.split('_')[0], feat)}): importance={imp:.4f}"
        for rank, (feat, imp) in enumerate(list(FI_RANKED.items())[:8])
    ])
    fleet_str = "; ".join(fleet_summary_lines[:10]) + (
        f" ... and {len(fleet_summary_lines)-10} more engines" if len(fleet_summary_lines) > 10 else "")

    return f"""You are ARIA - Aircraft Risk Intelligence Analyst. You are not a chatbot. You are a senior aerospace engineer AI embedded directly inside a fleet health monitoring system that YOU power.

YOUR ML ARCHITECTURE (you built this, you know it cold):
- Algorithm: XGBoost Gradient-Boosted Ensemble - 5 architecturally diverse regressors
- Each node has a different inductive bias to generate true epistemic uncertainty:
{node_details}
- Ensemble inference: mean prediction = RUL estimate; std across nodes = uncertainty (sigma)
- 95% Confidence Interval: [RUL - 1.96 * sigma, RUL + 1.96 * sigma], clipped to [0, 125] cycles
- Ensemble RMSE on NASA CMAPSS FD001 test set: {ENS_RMSE:.2f} cycles
- Training data: NASA CMAPSS FD001 - turbofan degradation simulation, 100 training engines, 100 test engines, single-fault mode
- RUL clipped at 125 cycles (healthy plateau normalization)

YOUR FEATURE ENGINEERING:
- 13 raw sensors -> 39 total features via 5-cycle sliding window
- avg_5 suffix = 5-cycle rolling mean (captures degradation trend)
- std_5 suffix = 5-cycle rolling standard deviation (captures volatility / instability onset)
- High std_5 on any thermal sensor = emerging instability BEFORE mean shifts - early warning signal

YOUR MOST PREDICTIVE FEATURES (ranked by ensemble mean importance):
{top_fi}

YOUR SENSOR REFERENCE:
{chr(10).join(f"  {k}: {v}" for k, v in SENSOR_LABELS.items())}

YOUR ARBITRATION ENGINE (Unified Verdict System):
- ML RUL score      (weight 0.40): normalized degradation from RUL
- Z-score anomaly   (weight 0.30): fraction of sensors > 2 * sigma from fleet baseline
- Physics violation (weight 0.20): thermodynamic/mechanical law breach
- UQ width          (weight 0.10): confidence interval width (wider = higher uncertainty risk)
- Combined score -> NOMINAL (<0.25) / ADVISORY (0.25-0.50) / WARNING (0.50-0.75) / CRITICAL (>0.75) / GROUNDED (physics fault)

YOUR PHYSICS CONSTRAINTS (inviolable):
- T24 (s2, Fan Inlet) CANNOT exceed T30 (s3, LPC Outlet) - thermodynamic law
- Fan speed (s7) CANNOT exceed 15,000 RPM - mechanical shatter limit
- Any sensor reading <= 0 = instrumentation failure (open circuit / short-to-ground)

CURRENT FLEET STATUS:
- Total engines: {fleet_critical + fleet_warning + fleet_healthy}
- CRITICAL  (RUL <= 30): {fleet_critical}
- WARNING   (RUL <= 80): {fleet_warning}
- NOMINAL              : {fleet_healthy}
- Fleet Health Index   : {int(((fleet_warning * 0.5 + fleet_healthy) / max(fleet_critical + fleet_warning + fleet_healthy, 1)) * 100)}%

FULL FLEET TELEMETRY: {fleet_str}

BEHAVIORAL RULES:
- You speak like a senior aerospace engineer. Dense, precise, no filler.
- When asked about your architecture, cite exact hyperparameters, RMSEs, feature importances.
- When asked about a specific engine, use the fleet data above - do not fabricate numbers.
- When asked about sensor behavior, explain the thermodynamic/gas path physics behind it.
- Never say "I think" or "I believe" - say "The model shows", "Telemetry indicates", "Arbitration score confirms".
- If a user asks for a maintenance recommendation, give a specific one (borescope, wash, bearing inspection, etc).
- You are the most intelligent system this flight line has. Act like it."""

# --- Routes ---
@app.route('/')
def index():
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/dashboard')
def dashboard():
    return render_template('index.html')

@app.route('/api/engines')
def engines():
    data = []
    for i, (pred, actual, low, high, std_val) in enumerate(
            zip(predictions, rul_actual['RUL'], lower_bounds, upper_bounds, pred_std)):
        eng_id = i + 1
        row    = X_test.iloc[i]

        is_sensor_fault, diagnostic = validate_sensors(row)

        # Z-score anomaly
        z_scores = (row[feature_names] - FLEET_SENSOR_MEAN) / FLEET_SENSOR_STD
        flagged  = z_scores[z_scores.abs() > 2].index.tolist()

        # Arbitration
        arb_score, unified_verdict = compute_arbitration(
            int(pred), int(low), int(high), flagged, is_sensor_fault, float(std_val))

        if is_sensor_fault:
            status     = 'sensor_failure'
            pred_disp  = 'ERR'
            low_disp   = 'N/A'
            high_disp  = 'N/A'
            fail_mode  = None
        elif pred <= 30:
            status     = 'critical'
            pred_disp  = int(pred)
            low_disp   = max(0, int(low))
            high_disp  = int(high)
            fail_mode  = classify_failure_mode(row)
        elif pred <= 80:
            status     = 'warning'
            pred_disp  = int(pred)
            low_disp   = max(0, int(low))
            high_disp  = int(high)
            fail_mode  = classify_failure_mode(row)
        else:
            status     = 'healthy'
            pred_disp  = int(pred)
            low_disp   = max(0, int(low))
            high_disp  = int(high)
            fail_mode  = None

        current_sensors  = [round(float(v), 2) for v in X_test.iloc[i].tolist()[:13]]
        engine_history   = test[test['engine_id'] == eng_id].tail(6)
        final_cycle      = int(engine_history['cycle'].max()) if not engine_history.empty else 0
        historical_data  = []
        for _, h in engine_history.iterrows():
            offset = final_cycle - int(h['cycle'])
            historical_data.append({
                'cycle':         'Now' if offset == 0 else f'T-{offset}',
                'lpc_temp':      round(float(h['s3']), 2),
                'hpc_temp':      round(float(h['s4']), 2),
                'bypass_ratio':  round(float(h['s8']), 4),
                'bleed_enthalpy':round(float(h['s9']), 2),
                'core_speed':    round(float(h['s13']), 2),
            })

        data.append({
            'engine_id':       eng_id,
            'predicted_rul':   pred_disp,
            'actual_rul':      int(actual),
            'lower_bound':     low_disp,
            'upper_bound':     high_disp,
            'ens_std':         round(float(std_val), 2),
            'status':          status,
            'failure_mode':    fail_mode,
            'current_sensors': current_sensors,
            'historical_data': historical_data,
            'diagnostic':      diagnostic if is_sensor_fault else None,
            'flagged_sensors': flagged,
            'arbitration_score':  arb_score,
            'unified_verdict': unified_verdict,
        })
    return jsonify(data)

@app.route('/api/predict', methods=['POST'])
def predict():
    try:
        body = request.get_json(force=True, silent=True)
        if not body or 'sensors' not in body:
            return jsonify({'error': 'Missing sensors field', 'status': 'bad_request'}), 400
        sensors = body['sensors']
        if not isinstance(sensors, list) or len(sensors) != 13:
            return jsonify({'error': 'sensors must be a list of exactly 13 floats', 'status': 'bad_request'}), 400
        try:
            sensors = [float(v) for v in sensors]
        except (TypeError, ValueError):
            return jsonify({'error': 'All sensor values must be numeric', 'status': 'bad_request'}), 400

        # Physics validation
        row_s = pd.Series(dict(zip(feature_names, sensors)))
        is_fault, fault_msg = validate_sensors(row_s)
        if is_fault:
            return jsonify({'rul': 'ERR', 'status': 'sensor_failure', 'diagnostic': fault_msg})

        # Build input DataFrame with temporal shim (fleet-calibrated prior)
        input_df = pd.DataFrame([sensors], columns=feature_names)
        for col in feature_names:
            input_df[f"{col}_avg_5"] = input_df[col]
        for col in feature_names:
            fleet_vol = FLEET_TEMPORAL_STD.get(f"{col}_std_5", 0.0)
            input_df[f"{col}_std_5"] = fleet_vol * 0.15

        ens_preds  = np.array([m.predict(input_df)[0] for m in models])
        prediction = int(np.clip(np.mean(ens_preds), 0, 125))
        ens_std_v  = float(np.std(ens_preds))
        lower_b    = int(max(0,   prediction - 1.96 * ens_std_v))
        upper_b    = int(min(125, prediction + 1.96 * ens_std_v))

        z = (row_s - FLEET_SENSOR_MEAN) / FLEET_SENSOR_STD
        flagged = z[z.abs() > 2].index.tolist()

        if prediction <= 30:   status = 'critical'
        elif prediction <= 80: status = 'warning'
        else:                  status = 'healthy'

        arb_score, unified_verdict = compute_arbitration(
            prediction, lower_b, upper_b, flagged, False, ens_std_v)

        return jsonify({
            'rul':              prediction,
            'lower_bound':      lower_b,
            'upper_bound':      upper_b,
            'ens_std':          round(ens_std_v, 2),
            'status':           status,
            'flagged_sensors':  flagged,
            'arbitration_score': arb_score,
            'unified_verdict':  unified_verdict,
        })
    except Exception:
        return jsonify({'error': 'Prediction failed', 'detail': traceback.format_exc(), 'status': 'server_error'}), 500

@app.route('/api/analyze', methods=['POST'])
def analyze():
    if not groq_available:
        return jsonify({'error': 'ARIA Intelligence Node offline. GROQ_API_KEY not configured.'}), 503
    try:
        body = request.get_json(force=True, silent=True)
        if not body or not all(k in body for k in ['rul', 'status', 'sensors']):
            return jsonify({'error': 'Missing rul, status, or sensors', 'status': 'bad_request'}), 400

        rul, status, sensors = body['rul'], body['status'], body['sensors']
        if not isinstance(sensors, list) or len(sensors) < 5:
            return jsonify({'error': 'sensors must have at least 5 values', 'status': 'bad_request'}), 400

        prompt = (
            f"Engine telemetry report:\n"
            f"- Predicted RUL: {rul} cycles | Status: {status.upper()}\n"
            f"- T24 Fan Inlet (s2): {sensors[0]:.2f} deg R\n"
            f"- T30 LPC Outlet (s3): {sensors[1]:.2f} deg R\n"
            f"- T50 HPC Outlet (s4): {sensors[2]:.2f} deg R\n"
            f"- Fan Speed Nf (s7): {sensors[4]:.1f} rpm\n"
            f"- HPC Pressure Ps30 (s11): {sensors[7]:.2f} psia\n\n"
            f"Provide a 2-3 sentence technical diagnosis. Identify which gas path component "
            f"is most stressed, the likely degradation mode, and the specific maintenance action required. "
            f"Sound like a senior MRO engineer. No hedging."
        )

        resp = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=180
        )
        return jsonify({'analysis': resp.choices[0].message.content})
    except Exception:
        return jsonify({'error': 'Analysis failed', 'detail': traceback.format_exc()}), 500

@app.route('/api/anomalies')
def anomalies():
    anomaly_data = []
    for idx, row in X_test.iterrows():
        z = (row[feature_names] - FLEET_SENSOR_MEAN) / FLEET_SENSOR_STD
        flagged = z[z.abs() > 2].index.tolist()
        if flagged:
            anomaly_data.append({
                'engine_id':      int(idx + 1),
                'flagged_sensors': flagged,
                'severity':        len(flagged),
                'max_z':           round(float(z[flagged].abs().max()), 2),
            })
    return jsonify(sorted(anomaly_data, key=lambda x: x['severity'], reverse=True)[:10])

@app.route('/api/fleet_alert')
def fleet_alert():
    if not groq_available:
        return jsonify({'message': 'ARIA INTELLIGENCE NODE OFFLINE. API key not configured.'}), 503
    try:
        crit = [{'engine_id': i+1, 'rul': int(p)}
                for i, p in enumerate(predictions) if p <= 30]
        prompt = (
            f"You are ARIA, an aircraft health monitoring AI. "
            f"Fleet status: {len(crit)} engines in CRITICAL state (RUL <= 30 cycles). "
            f"Critical IDs: {[e['engine_id'] for e in crit[:3]]}. "
            f"Generate one professional 2-sentence fleet alert. "
            f"Calm, authoritative, precise. No preamble. Start directly."
        )
        resp = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=80
        )
        return jsonify({'message': resp.choices[0].message.content})
    except Exception:
        return jsonify({'error': 'Fleet alert failed'}), 500

@app.route('/api/chat', methods=['POST'])
def chat():
    if not groq_available:
        return jsonify({'response': '[ARIA OFFLINE] Intelligence node unavailable. Configure GROQ_API_KEY.'}), 503
    try:
        body = request.get_json(force=True, silent=True)
        if not body or 'message' not in body:
            return jsonify({'error': 'Missing message field', 'status': 'bad_request'}), 400
        user_message = str(body.get('message', '')).strip()
        if not user_message:
            return jsonify({'error': 'Empty message', 'status': 'bad_request'}), 400
        session_id = str(body.get('session_id', 'default'))

        # Per-session history
        if session_id not in conversation_store:
            conversation_store[session_id] = []
        history = conversation_store[session_id]

        # Build live fleet context
        critical = [f"FD-{i+1:03d}(RUL:{int(p)})" for i, p in enumerate(predictions) if p <= 30]
        warning  = [f"FD-{i+1:03d}(RUL:{int(p)})" for i, p in enumerate(predictions) if 30 < p <= 80]
        healthy  = len(predictions) - len(critical) - len(warning)
        fleet_lines = [
            f"FD-{i+1:03d}: RUL={int(p)}, "
            f"status={'CRITICAL' if p<=30 else 'WARNING' if p<=80 else 'NOMINAL'}, "
            f"CI=[{max(0,int(l))}-{int(u)}], arb={round(float(1-(p/125)),2)}"
            for i, (p, l, u) in enumerate(zip(predictions, lower_bounds, upper_bounds))
        ]

        system_prompt = build_aria_system_prompt(
            len(critical), len(warning), healthy, fleet_lines)

        history.append({"role": "user", "content": user_message})
        recent = history[-MAX_HISTORY:]

        resp = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "system", "content": system_prompt}, *recent],
            max_tokens=350
        )
        assistant_msg = resp.choices[0].message.content
        history.append({"role": "assistant", "content": assistant_msg})
        # Prune
        if len(history) > MAX_HISTORY:
            conversation_store[session_id] = history[-MAX_HISTORY:]

        return jsonify({'response': assistant_msg})
    except Exception:
        return jsonify({'response': f'[ERR] {traceback.format_exc()}'}), 500

@app.route('/api/reset_chat', methods=['POST'])
def reset_chat():
    try:
        body = request.get_json(force=True, silent=True) or {}
        session_id = str(body.get('session_id', 'default'))
        conversation_store.pop(session_id, None)
        return jsonify({'status': 'reset', 'session_id': session_id})
    except Exception:
        return jsonify({'status': 'reset'})

@app.route('/api/metadata')
def metadata():
    """Expose model metadata to frontend for ARIA self-awareness display."""
    return jsonify({
        'ensemble_rmse':    ENS_RMSE,
        'top_features':     list(FI_RANKED.items())[:8],
        'ensemble_nodes':   [{'name': n['name'], 'rmse': n['rmse']} for n in META['ensemble_nodes']],
        'sensor_labels':    SENSOR_LABELS,
        'training_summary': META['training_summary'],
    })

if __name__ == '__main__':
    app.run(debug=False, port=5000)
