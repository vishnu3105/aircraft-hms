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
| Model | XGBoost Bayesian Ensemble |
| Dataset | NASA CMAPSS FD001 |
| Training samples | 20,631 sensor readings |
| Engines monitored | 100 |
| **RMSE** | **18.65 cycles** |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| ML Model | XGBoost (Diverse Ensemble) |
| Dataset | NASA CMAPSS FD001 |
| Backend | Python + Flask |
| Frontend | React + Vite + Framer Motion |
| Intelligence | LLaMA 3.3 70B (Groq) |
| Deployment | Render / Git |

---

## Project Structure

```
aircraft-hms/
├── src/                # React Frontend source
├── public/             # Static assets
├── app.py              # Flask API + Unified Arbitration Engine
├── train_model.py      # Diverse Ensemble training pipeline
├── model_metadata.json # Exported model performance & features
├── train_FD001.txt     # NASA CMAPSS training data
├── test_FD001.txt      # NASA CMAPSS test data
├── RUL_FD001.txt       # Ground truth RUL labels
├── requirements.txt
├── package.json
└── README.md
```

---

## How It Works

1. **Data ingestion** — loads NASA CMAPSS FD001 (21 sensors, 100 engines, variable-length cycles)
2. **Feature engineering** — computes RUL labels from cycle counts, 5-cycle temporal sliding windows
3. **Training** — fits 5 architecturally diverse XGBoost models for uncertainty quantification
4. **Unified Arbitration** — Fuses ML, Z-scores, and Physics validation into a single verdict
5. **Aria Analysis** — LLM-based technical diagnosis via Groq API
6. **Web UI** — Advanced dashboard with live telemetry and diagnostic trace

---

## Run Locally

```bash
# Clone the repository
git clone https://github.com/vishnu3105/aircraft-hms
cd aircraft-hms

# Start the Backend
pip install -r requirements.txt
python train_model.py     # trains and saves the ensemble
python app.py             # starts the Flask server

# Start the Frontend (in a new terminal)
npm install
npm run dev
```

Open `http://localhost:5173`

---

## Dataset

**NASA CMAPSS (Commercial Modular Aero-Propulsion System Simulation)**
- Simulates turbofan engine degradation under different operating conditions
- FD001 subset: single operating condition, single fault mode
- 21 sensor channels: temperature, pressure, fan speed, core speed, and more
- Ground truth RUL provided for test engines

[Dataset source — NASA Prognostics Data Repository](https://www.nasa.gov/intelligent-systems-division/discovery-and-systems-health/pcoe/pcoe-data-set-repository/)

---

## Built By

**Vishnu N** — B.E. CSE, Sri Sairam Institute of Technology, Chennai  
[LinkedIn](https://www.linkedin.com/in/vishnu-n-7bb753320/) · [GitHub](https://github.com/vishnu3105)
