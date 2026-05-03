# ARIA — Aircraft Engine RUL Prediction System

![Python](https://img.shields.io/badge/Python-3.10-blue?logo=python)
![scikit-learn](https://img.shields.io/badge/scikit--learn-ML-orange?logo=scikit-learn)
![Flask](https://img.shields.io/badge/Flask-API-black?logo=flask)
![Dataset](https://img.shields.io/badge/Dataset-NASA%20CMAPSS-red)
![Status](https://img.shields.io/badge/Status-Active-brightgreen)

> Predicting how many flight cycles remain before an aircraft engine fails — before it actually does.

---

## What This Does

Aircraft engine failures mid-flight are catastrophic. Scheduled maintenance is expensive and wasteful. ARIA sits in between: it reads 21 sensor streams from a running engine and predicts its **Remaining Useful Life (RUL)** in flight cycles, enabling maintenance teams to act at exactly the right time.

Built on NASA's CMAPSS dataset — the same benchmark used in aerospace ML research.

---

## Results

| Metric | Value |
|--------|-------|
| Model | Random Forest Regressor |
| Dataset | NASA CMAPSS FD001 |
| Training samples | 20,631 sensor readings |
| Engines monitored | 100 |
| **RMSE** | **33.97 cycles** |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| ML Model | Random Forest (scikit-learn) |
| Dataset | NASA CMAPSS FD001 |
| Backend | Python + Flask |
| Frontend | HTML + CSS + JS |
| Deployment | Render (via Procfile) |

---

## Project Structure

```
aircraft-hms/
├── templates/          # Flask web UI
├── train_model.py      # Model training + evaluation
├── app.py              # Flask API + prediction endpoint
├── explore.py          # EDA and sensor analysis
├── check_values.py     # Data validation utilities
├── train_FD001.txt     # NASA CMAPSS training data
├── test_FD001.txt      # NASA CMAPSS test data
├── RUL_FD001.txt       # Ground truth RUL labels
├── requirements.txt
└── README.md
```

---

## How It Works

1. **Data ingestion** — loads NASA CMAPSS FD001 (21 sensors, 100 engines, variable-length cycles)
2. **Feature engineering** — computes RUL labels from cycle counts, normalises sensor readings
3. **Training** — fits a Random Forest Regressor on sensor time series features
4. **Prediction** — Flask API accepts sensor input, returns predicted RUL in cycles
5. **Web UI** — simple dashboard to input readings and view health status

---

## Run Locally

```bash
git clone https://github.com/vishnu3105/aircraft-hms
cd aircraft-hms
pip install -r requirements.txt
python train_model.py     # trains and saves the model
python app.py             # starts the Flask server
```

Open `http://localhost:5000`

---

## Dataset

**NASA CMAPSS (Commercial Modular Aero-Propulsion System Simulation)**
- Simulates turbofan engine degradation under different operating conditions
- FD001 subset: single operating condition, single fault mode
- 21 sensor channels: temperature, pressure, fan speed, core speed, and more
- Ground truth RUL provided for test engines

[Dataset source — NASA Prognostics Data Repository](https://www.nasa.gov/intelligent-systems-division/discovery-and-systems-health/pcoe/pcoe-data-set-repository/)

---

## What's Next

- [ ] Add MLflow experiment tracking
- [ ] Try LSTM for sequence-aware RUL prediction
- [ ] Dockerise for reproducible deployment
- [ ] Add model confidence intervals to predictions

---

## Built By

**Vishnu N** — B.E. CSE, Sri Sairam Institute of Technology, Chennai  
[LinkedIn](https://www.linkedin.com/in/vishnu-n-7bb753320/) · [GitHub](https://github.com/vishnu3105)
