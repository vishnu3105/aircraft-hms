from flask import Flask, render_template, jsonify
import pandas as pd
import numpy as np
import pickle

app = Flask(__name__)

# Load model
with open('model.pkl', 'rb') as f:
    model = pickle.load(f)

# Load test data
columns = ['engine_id', 'cycle', 'setting1', 'setting2', 'setting3',
           's1','s2','s3','s4','s5','s6','s7','s8','s9','s10',
           's11','s12','s13','s14','s15','s16','s17','s18','s19','s20','s21']

test = pd.read_csv('test_FD001.txt', sep='\s+', header=None, names=columns)
rul_actual = pd.read_csv('RUL_FD001.txt', header=None, names=['RUL'])

drop_cols = ['engine_id', 'cycle', 'setting1', 'setting2', 'setting3',
             's1', 's5', 's10', 's16', 's18', 's19', 's20', 's21']

test_last = test.groupby('engine_id').last().reset_index()
X_test = test_last.drop(columns=drop_cols)
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
    from flask import request
    data = request.get_json()
    sensors = data['sensors']
    prediction = model.predict([sensors])[0]
    prediction = int(prediction)
    
    if prediction <= 30:
        status = 'critical'
    elif prediction <= 80:
        status = 'warning'
    else:
        status = 'healthy'
    
    return jsonify({
        'rul': prediction,
        'status': status
    })

if __name__ == '__main__':
    app.run(debug=False)

