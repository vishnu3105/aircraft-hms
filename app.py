from flask import Flask, render_template, jsonify, request
import pandas as pd
import numpy as np
from xgboost import XGBRegressor
import pickle
import os
from groq import Groq

groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))

app = Flask(__name__)

# Column names
columns = ['engine_id', 'cycle', 'setting1', 'setting2', 'setting3',
           's1','s2','s3','s4','s5','s6','s7','s8','s9','s10',
           's11','s12','s13','s14','s15','s16','s17','s18','s19','s20','s21']

drop_cols_train = ['engine_id', 'cycle', 'max_cycle', 'setting1', 'setting2', 'setting3',
             's1', 's5', 's10', 's16', 's18', 's19', 's20', 's21']

drop_cols_test = ['engine_id', 'cycle', 'setting1', 'setting2', 'setting3',
             's1', 's5', 's10', 's16', 's18', 's19', 's20', 's21']

feature_names = ['s2','s3','s4','s6','s7','s8','s9','s11','s12','s13','s14','s15','s17']

# Load pre-trained Ensemble Decision Trees
print("Loading Bayesian Ensemble Models...")
models = []
for i in range(5):
    with open(f'model_ens_{i}.pkl', 'rb') as f:
        models.append(pickle.load(f))

# Load test data for the dashboard
def build_temporal_features(df, features, w=5):
    df = df.sort_values(['engine_id', 'cycle'])
    roll_mean = df.groupby('engine_id')[features].rolling(w, min_periods=1).mean().reset_index(0, drop=True)
    roll_mean.columns = [f"{c}_avg_{w}" for c in features]
    roll_std = df.groupby('engine_id')[features].rolling(w, min_periods=1).std().reset_index(0, drop=True).fillna(0)
    roll_std.columns = [f"{c}_std_{w}" for c in features]
    return pd.concat([df, roll_mean, roll_std], axis=1)

print("Ingesting CMAPSS fleet datasets...")
test = pd.read_csv('test_FD001.txt', sep=r'\s+', header=None, names=columns)
rul_actual = pd.read_csv('RUL_FD001.txt', header=None, names=['RUL'])

print("Calculating fleet-wide Temporal Feature arrays...")
test = build_temporal_features(test, feature_names)

test_last = test.groupby('engine_id').last().reset_index()
X_test = test_last.drop(columns=drop_cols_test)

# Evaluate UQ (Uncertainty Quantification) using Ensemble Variance
raw_preds = np.array([m.predict(X_test) for m in models])
pred_mean = np.mean(raw_preds, axis=0)
pred_std = np.std(raw_preds, axis=0)

predictions = pred_mean.astype(int)
lower_bounds = np.clip(pred_mean - (1.96 * pred_std), 0, None).astype(int)
upper_bounds = np.clip(pred_mean + (1.96 * pred_std), 0, 125).astype(int)

# Global fleet baselines for Z-Score Anomaly detection
fleet_mean = X_test.mean()
fleet_std = X_test.std().replace(0, 1e-9)

def classify_failure_mode(row):
    """F4. Degradation Mode Classifier based on Gas Path Signatures"""
    z_scores = (row - fleet_mean).abs() / fleet_std
    
    # 1. Mechanical Volatility (Vibration/Speed variance)
    if row['s7_std_5'] > 1.5 * fleet_mean['s7_std_5']:
        return "ROTOR DYNAMICS / BEARING DEGRADATION"
        
    # 2. Thermal / Pressure Signatures
    base_sensors = ['s2','s3','s4','s6','s7','s8','s9','s11','s12','s13','s14','s15','s17']
    z_base = z_scores[base_sensors]
    max_z_col = z_base.idxmax()
    
    if max_z_col in ['s4', 's11']:
        return "HIGH-PRESSURE COMPRESSOR (HPC) FOULING DETECTED"
    elif max_z_col == 's3':
        return "LOW-PRESSURE COMPRESSOR (LPC) CLEARANCE DETERIORATION"
    elif max_z_col in ['s15', 's17', 's9']:
        return "COMBUSTOR HOT SECTION / TURBINE SEAL EROSION"
    elif max_z_col in ['s7', 's8', 's13']:
        return "AERODYNAMIC IMBALANCE / SHAFT VIBRATION ISOLATED"
    
    return "UNKNOWN GAS PATH DEGRADATION SIGNATURE"

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/engines')
def engines():
    data = []
    for i, (pred, actual, low, high) in enumerate(zip(predictions, rul_actual['RUL'], lower_bounds, upper_bounds)):
        eng_id = i + 1
        row = X_test.iloc[i]
        
        is_sensor_fault = False
        diagnostic = ""
        
        # --- Artificial Demonstration Faults ---
        if eng_id == 13: 
            is_sensor_fault = True
            diagnostic = "RPM OVERLIMIT: s7 (Fan Speed) reads 18230 RPM, exceeding mechanical material shatter limits. Tachometer calibration failure."
        if eng_id == 66: 
            is_sensor_fault = True
            diagnostic = "SIGNAL LOSS: s3 reports mathematically impossible sensor telemetry (-0.05). Instrumentation offline or short-to-ground detected."
        # ---------------------------------------

        # Real Diagnostic Rules for all other engines
        if not is_sensor_fault:
            for col in feature_names:
                if row[col] <= 0:
                    is_sensor_fault = True
                    diagnostic = f"SIGNAL LOSS: {col} reports mathematically impossible sensor telemetry ({row[col]}). Instrumentation offline or short-to-ground detected."
            if row['s7'] > 15000 and not is_sensor_fault:
                is_sensor_fault = True
                diagnostic = f"RPM OVERLIMIT: s7 (Fan Speed) reads {row['s7']} RPM, exceeding mechanical material shatter limits. Tachometer calibration failure."
            if row['s2'] > row['s3'] and not is_sensor_fault:
                is_sensor_fault = True
                diagnostic = f"THERMO MISMATCH: s2 (Fan Inlet Temp, {row['s2']}°R) reads hotter than s3 (Compressor Temp, {row['s3']}°R). Inviolable physics broken."
        
        if is_sensor_fault:
            status = 'sensor_failure'
            pred_disp = 'ERR'
            low_disp = 'N/A'
            high_disp = 'N/A'
            failure_mode = None
        elif pred <= 30:
            status = 'critical'
            pred_disp = int(pred)
            low_disp = max(0, int(low))
            high_disp = int(high)
            failure_mode = classify_failure_mode(row)
        elif pred <= 80:
            status = 'warning'
            pred_disp = int(pred)
            low_disp = max(0, int(low))
            high_disp = int(high)
            failure_mode = classify_failure_mode(row)
        else:
            status = 'healthy'
            pred_disp = int(pred)
            low_disp = max(0, int(low))
            high_disp = int(high)
            failure_mode = None
            
        # 1. PURE ML DATA: The exact 13-sensor array passed to XGBoost
        current_sensors = [round(float(v), 2) for v in X_test.iloc[i].tolist()[:13]]
        
        # Override the visual UI array values so the dashboard displays the exact math failure we created
        if eng_id == 13:
            current_sensors[4] = 18230.00
        if eng_id == 66:
            current_sensors[1] = -0.05
        
        # 2. PURE ML HISTORY: Real CMAPSS degradation data over the last 6 cycles
        engine_history = test[test['engine_id'] == eng_id].tail(6)
        final_cycle = int(engine_history['cycle'].max()) if not engine_history.empty else 0
        
        historical_data = []
        for _, h_row in engine_history.iterrows():
            cyc = int(h_row['cycle'])
            offset = final_cycle - cyc
            historical_data.append({
                'cycle': 'Now' if offset == 0 else f'T-{offset}',
                'lpc_temp': round(float(h_row['s3']), 2),
                'hpc_temp': round(float(h_row['s4']), 2),
                'bypass_ratio': round(float(h_row['s8']), 4),
                'bleed_enthalpy': round(float(h_row['s9']), 2),
                'core_speed': round(float(h_row['s13']), 2)
            })
            
        data.append({
            'engine_id': eng_id,
            'predicted_rul': pred_disp,
            'actual_rul': int(actual),
            'lower_bound': low_disp,
            'upper_bound': high_disp,
            'status': status,
            'failure_mode': failure_mode,
            'current_sensors': current_sensors,
            'historical_data': historical_data,
            'diagnostic': diagnostic if is_sensor_fault else None
        })
    return jsonify(data)

@app.route('/predict', methods=['POST'])
def predict():
    data = request.get_json()
    sensors = data['sensors']
    input_df = pd.DataFrame([sensors], columns=feature_names)
    
    # -------------------------------------------------------------
    # F2/F3: PRE-IGNITION SENSOR VALIDITY & PHYSICS CONSTRAINTS
    # -------------------------------------------------------------
    row = input_df.iloc[0]
    
    # 1. Absolute Zero / Negative Verification
    for col in feature_names:
        if row[col] <= 0:
            fault_msg = f"SIGNAL LOSS: {col} reports mathematically impossible sensor telemetry ({row[col]}). Instrumentation offline or short-to-ground detected."
            return jsonify({'rul': 'ERR', 'status': 'sensor_failure', 'diagnostic': fault_msg})
            
    # 2. RPM Mechanical Shatter Limit Check
    if row['s7'] > 15000:
        fault_msg = f"RPM OVERLIMIT: s7 (Fan Speed) reads {row['s7']} RPM, exceeding mechanical material shatter limits. Tachometer calibration failure."
        return jsonify({'rul': 'ERR', 'status': 'sensor_failure', 'diagnostic': fault_msg})
        
    # 3. Thermodynamic Inverse Constraints
    # T24 (Fan Inlet) mathematically cannot be hotter than T30 (LPC Compressor Outlet)
    if row['s2'] > row['s3']:
        fault_msg = f"THERMO MISMATCH: s2 (Fan Inlet Temp, {row['s2']}°R) reads hotter than s3 (Compressor Temp, {row['s3']}°R). Inviolable physics broken."
        return jsonify({'rul': 'ERR', 'status': 'sensor_failure', 'diagnostic': fault_msg})
    # -------------------------------------------------------------

    # -------------------------------------------------------------
    # TEMPORAL SHIM COMPUTATION
    # -------------------------------------------------------------
    for col in feature_names:
        input_df[f"{col}_avg_5"] = input_df[col]
    for col in feature_names:
        input_df[f"{col}_std_5"] = 0.0
    # -------------------------------------------------------------

    ens_preds = np.array([m.predict(input_df)[0] for m in models])
    prediction = int(np.mean(ens_preds))
    ens_std = np.std(ens_preds)
    
    lower_b = int(max(0, prediction - (1.96 * ens_std)))
    upper_b = int(min(125, prediction + (1.96 * ens_std)))

    if prediction <= 30:
        status = 'critical'
    elif prediction <= 80:
        status = 'warning'
    else:
        status = 'healthy'

    return jsonify({
        'rul': prediction,
        'lower_bound': lower_b,
        'upper_bound': upper_b,
        'status': status
    })

@app.route('/analyze', methods=['POST'])
def analyze():
    data = request.get_json()
    rul = data['rul']
    status = data['status']
    sensors = data['sensors']
    
    prompt = f"""You are an aircraft engine health analyst. Analyze this engine data and explain in 2-3 sentences what's happening and what action to take.

Engine Data:
- Remaining Useful Life: {rul} cycles
- Status: {status}
- Key sensors: s2={sensors[0]}, s3={sensors[1]}, s4={sensors[2]}, s7={sensors[4]}, s11={sensors[7]}

Be specific, technical but understandable. Sound like a real aviation engineer."""

    response = groq_client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        max_tokens=150
    )
    
    analysis = response.choices[0].message.content
    return jsonify({'analysis': analysis})

@app.route('/anomalies')
def anomalies():
    feature_names = ['s2','s3','s4','s6','s7','s8','s9','s11','s12','s13','s14','s15','s17']
    
    fleet_mean = X_test[feature_names].mean()
    fleet_std = X_test[feature_names].std()
    
    anomaly_data = []
    for idx, row in X_test.iterrows():
        z_scores = (row[feature_names] - fleet_mean) / fleet_std
        flagged = z_scores[z_scores.abs() > 2].index.tolist()
        if flagged:
            anomaly_data.append({
                'engine_id': int(idx + 1),
                'flagged_sensors': flagged,
                'severity': len(flagged)
            })
    
    return jsonify(sorted(anomaly_data, key=lambda x: x['severity'], reverse=True)[:10])

@app.route('/fleet_alert')
def fleet_alert():
    critical_engines = [e for e in [
        {'engine_id': i+1, 'rul': int(pred), 'status': 'critical'} 
        for i, pred in enumerate(predictions) 
        if pred <= 30
    ]]
    
    prompt = f"""You are ARIA, an aircraft health monitoring AI. 
There are {len(critical_engines)} critical engines in the fleet.
Critical engine IDs: {[e['engine_id'] for e in critical_engines[:3]]}

Generate a single professional alert message — max 2 sentences. 
Calm, authoritative female tone. Like an aircraft warning system.
No introduction. Just the alert. Start directly."""

    response = groq_client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        max_tokens=80
    )
    
    return jsonify({'message': response.choices[0].message.content})

conversation_history = []

@app.route('/chat', methods=['POST'])
def chat():
    global conversation_history
    
    data = request.get_json()
    user_message = data['message']
    
    # Build fleet context
    fleet_summary = []
    for i, (pred, low, high) in enumerate(zip(predictions, lower_bounds, upper_bounds)):
        status = 'critical' if pred <= 30 else 'warning' if pred <= 80 else 'healthy'
        fleet_summary.append(f"Engine {i+1}: RUL={pred} cycles, Status={status}, CI=[{max(0,int(low))}-{int(high)}]")
    
    critical_engines = [f"Engine {i+1} (RUL:{pred})" for i, pred in enumerate(predictions) if pred <= 30]
    warning_engines = [f"Engine {i+1} (RUL:{pred})" for i, pred in enumerate(predictions) if 30 < pred <= 80]
    
    system_prompt = f"""You are ARIA — Aircraft Risk Intelligence Analyst. You are an expert aerospace engineer AI embedded in a fleet health monitoring system.

CORE MACHINE LEARNING INTELLIGENCE:
- You are natively powered by an XGBoost Regressor ML backend (n_estimators=200, learning_rate=0.05).
- Trained on NASA's CMAPSS FD001 dataset tracking turbofan degradation.
- You analyze 13 raw telemetry sensors to predict Remaining Useful Life (RUL) bounds.
- UI Graph Knowledge: The user's dashboard currently charts a 'Degradation Trajectory'. It specifically plots LPC Outlet Temp (s3) and HPC Outlet Temp (s4) curving exponentially upwards as the engine's RUL approaches 0.
- Statistical Rigor: You bound predictions using a 95% Confidence Interval (± 1.96 * stdev).
- Anomaly Detection: You strictly flag Z-Score Anomalies when sensors deviate > 2 standard deviations from the fleet mean.

CURRENT FLEET DATA:
- Total engines: {len(predictions)}
- Critical engines (RUL <= 30): {len(critical_engines)} — {', '.join(critical_engines[:3])}
- Warning engines (RUL <= 80): {len(warning_engines)}
- Healthy engines: {len(predictions) - len(critical_engines) - len(warning_engines)}
- Fleet Health Index: {int((sum(predictions) / (len(predictions) * 125)) * 100)}/100

FULL FLEET CONTEXT: {'; '.join(fleet_summary)}

SENSOR REFERENCE:
s2(T24)=Fan Inlet Temp, s3(T30)=LPC Outlet Temp, s4(T50)=HPC Outlet Temp, s6=Total Hyd Press,
s7(Nf)=Fan Speed, s8=Bypass Ratio, s9=Bleed Enthalpy, s11(Ps30)=HPC Outlet Press,
s12=Fan Speed Ratio, s13=Core Speed, s14=Engine Press Ratio, s15=HPT Coolant Bleed, s17=Turbine Inlet Temp

INSTRUCTIONS:
You speak like a sharp, senior aerospace engineer. High-tech, direct, and heavily data-driven. Very intelligent.
If asked about your brain or ML logic, explain your XGBoost architecture and CMAPSS training metrics fluently. 
If asked about the UI trajectory graphs, explain that LPC and HPC temps rise exponentially as turbine friction/degradation increases.
Answer all questions using the factual, mathematically derived REAL fleet data available to you above. Be decisive."""

    # Add user message to history
    conversation_history.append({
        "role": "user",
        "content": user_message
    })
    
    # Keep last 10 messages for memory
    recent_history = conversation_history[-10:]
    
    response = groq_client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": system_prompt},
            *recent_history
        ],
        max_tokens=300
    )
    
    assistant_message = response.choices[0].message.content
    
    # Add response to history
    conversation_history.append({
        "role": "assistant", 
        "content": assistant_message
    })
    
    return jsonify({'response': assistant_message})

@app.route('/reset_chat', methods=['POST'])
def reset_chat():
    global conversation_history
    conversation_history = []
    return jsonify({'status': 'reset'})

if __name__ == '__main__':
    app.run(debug=False)
