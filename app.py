from flask import Flask, render_template, jsonify, request
import pandas as pd
import numpy as np
from xgboost import XGBRegressor
import pickle
import os
from groq import Groq
<<<<<<< HEAD
groq_client = Groq(api_key="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")

=======
>>>>>>> 75de74b (use env variable for api key)

import os
groq_client = Groq(api_key=os.environ.get("GROQ_API_KEY"))
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

# Load and train
print("Loading data and training model...")
train = pd.read_csv('train_FD001.txt', sep=r'\s+', header=None, names=columns)
test = pd.read_csv('test_FD001.txt', sep=r'\s+', header=None, names=columns)
rul_actual = pd.read_csv('RUL_FD001.txt', header=None, names=['RUL'])

max_cycles = train.groupby('engine_id')['cycle'].max().reset_index()
max_cycles.columns = ['engine_id', 'max_cycle']
train = train.merge(max_cycles, on='engine_id')
train['RUL'] = train['max_cycle'] - train['cycle']
train['RUL'] = train['RUL'].clip(upper=125)
train = train.drop(columns=drop_cols_train)

X_train = train.drop(columns=['RUL'])
y_train = train['RUL']

model = XGBRegressor(n_estimators=200, learning_rate=0.05, random_state=42)
model.fit(X_train, y_train)
print("Model trained!")

# Predictions for dashboard
test_last = test.groupby('engine_id').last().reset_index()
X_test = test_last.drop(columns=drop_cols_test)
predictions = model.predict(X_test).astype(int)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/engines')
def engines():
    data = []
    for i, (pred, actual) in enumerate(zip(predictions, rul_actual['RUL'])):
        if pred <= 30:
            status = 'critical'
        elif pred <= 80:
            status = 'warning'
        else:
            status = 'healthy'
        data.append({
            'engine_id': i + 1,
            'predicted_rul': int(pred),
            'actual_rul': int(actual),
            'status': status
        })
    return jsonify(data)

@app.route('/predict', methods=['POST'])
def predict():
    data = request.get_json()
    sensors = data['sensors']
    input_df = pd.DataFrame([sensors], columns=feature_names)
    prediction = int(model.predict(input_df)[0])

    if prediction <= 30:
        status = 'critical'
    elif prediction <= 80:
        status = 'warning'
    else:
        status = 'healthy'

    return jsonify({'rul': prediction, 'status': status})

@app.route('/analyze', methods=['POST'])
<<<<<<< HEAD
=======

@app.route('/analyze', methods=['POST'])
>>>>>>> 75de74b (use env variable for api key)
def analyze():
    data = request.get_json()
    rul = data['rul']
    status = data['status']
    sensors = data['sensors']
    
<<<<<<< HEAD
    prompt = f"""You are ARIA — Aircraft Risk Intelligence Analyst. You speak like a sharp, confident AI system. Direct. No fluff. Think Jarvis meets a fighter pilot.

Engine {data.get('engine_id', 'Unknown')} just came in for analysis.

Data:
- RUL: {rul} cycles remaining
- Status: {status.upper()}
- Exhaust temp (s4): {sensors[2]}
- Fan speed (s7): {sensors[4]}  
- Pressure ratio (s3): {sensors[1]}
- Core speed (s11): {sensors[7]}

Give a 3 line verdict:
Line 1 — What's happening to this engine right now (specific, technical)
Line 2 — How serious is it and why
Line 3 — Exact action required. No maybe. No suggest. Command.

Sound like the engine's life depends on this analysis. Because it does."""

    response = groq_client.chat.completions.create(
        model="llama-3.3-70b-versatile",    
=======
    prompt = f"""You are an aircraft engine health analyst. Analyze this engine data and explain in 2-3 sentences what's happening and what action to take.

Engine Data:
- Remaining Useful Life: {rul} cycles
- Status: {status}
- Key sensors: s2={sensors[0]}, s3={sensors[1]}, s4={sensors[2]}, s7={sensors[4]}, s11={sensors[7]}

Be specific, technical but understandable. Sound like a real aviation engineer."""

    response = groq_client.chat.completions.create(
        model="llama-3.3-70b-versatile",
>>>>>>> 75de74b (use env variable for api key)
        messages=[{"role": "user", "content": prompt}],
        max_tokens=150
    )
    
    analysis = response.choices[0].message.content
    return jsonify({'analysis': analysis})
<<<<<<< HEAD


=======
>>>>>>> 75de74b (use env variable for api key)
if __name__ == '__main__':
    app.run(debug=False)