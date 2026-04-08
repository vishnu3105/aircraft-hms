## Dataset

NASA CMAPSS (Commercial Modular Aero-Propulsion System Simulation)
- 100 test engines
- 20,631 training sensor readings
- 21 sensors per reading

## Tech Stack

| Layer | Technology |
|---|---|
| ML Model | Random Forest (scikit-learn) |
| Dataset | NASA CMAPSS FD001 |
| Backend | Python + Flask |
| Frontend | HTML + CSS + JS |

## Results

| Metric | Value |
|---|---|
| Model | Random Forest |
| RMSE | 33.97 cycles |
| Engines monitored | 100 |

## How to Run

```bash
pip install pandas numpy scikit-learn flask
python train_model.py
python app.py
```

Open `http://localhost:5000`

## Built By

Vishnu · Tamil Nadu, India · 2026
