import pandas as pd
import numpy as np
from xgboost import XGBRegressor
from sklearn.metrics import mean_squared_error
import pickle
import json

# ─────────────────────────────────────────────
# SCHEMA
# ─────────────────────────────────────────────
columns = ['engine_id', 'cycle', 'setting1', 'setting2', 'setting3',
           's1','s2','s3','s4','s5','s6','s7','s8','s9','s10',
           's11','s12','s13','s14','s15','s16','s17','s18','s19','s20','s21']

drop_cols_train = ['engine_id', 'cycle', 'max_cycle', 'setting1', 'setting2', 'setting3',
             's1', 's5', 's10', 's16', 's18', 's19', 's20', 's21']

drop_cols_test = ['engine_id', 'cycle', 'setting1', 'setting2', 'setting3',
             's1', 's5', 's10', 's16', 's18', 's19', 's20', 's21']

feature_names = ['s2','s3','s4','s6','s7','s8','s9','s11','s12','s13','s14','s15','s17']

# ─────────────────────────────────────────────
# SENSOR METADATA (for ARIA system intelligence)
# ─────────────────────────────────────────────
SENSOR_LABELS = {
    's2':  'T24 — Fan Inlet Temperature (°R)',
    's3':  'T30 — LPC Outlet Temperature (°R)',
    's4':  'T50 — HPC Outlet Temperature (°R)',
    's6':  'P30 — Total Hydraulic Pressure (psia)',
    's7':  'Nf  — Physical Fan Speed (rpm)',
    's8':  'Nc  — Physical Core Speed (rpm) [Bypass Ratio proxy]',
    's9':  'epr — Engine Pressure Ratio',
    's11': 'Ps30 — HPC Outlet Static Pressure (psia)',
    's12': 'phi — Fuel-Air Ratio (pps/psi)',
    's13': 'NRf — Corrected Fan Speed',
    's14': 'NRc — Corrected Core Speed',
    's15': 'BPR — Bypass Ratio',
    's17': 'bleed — HPT Coolant Bleed',
}

# ─────────────────────────────────────────────
# TEMPORAL FEATURE ENGINEERING
# ─────────────────────────────────────────────
def build_temporal_features(df, features, w=5):
    """5-cycle sliding window: rolling mean (trend) + rolling std (volatility)"""
    df = df.sort_values(['engine_id', 'cycle'])
    roll_mean = (df.groupby('engine_id')[features]
                 .rolling(w, min_periods=1).mean()
                 .reset_index(0, drop=True))
    roll_mean.columns = [f"{c}_avg_{w}" for c in features]
    roll_std = (df.groupby('engine_id')[features]
                .rolling(w, min_periods=1).std()
                .reset_index(0, drop=True).fillna(0))
    roll_std.columns = [f"{c}_std_{w}" for c in features]
    return pd.concat([df, roll_mean, roll_std], axis=1)

# ---------------------------------------------
# DATA INGESTION
# ---------------------------------------------
print("=" * 60)
print("ARIA ML TRAINING PIPELINE - DIVERSE ENSEMBLE")
print("=" * 60)
print("\n[1/6] Ingesting NASA CMAPSS FD001 datasets...")
train = pd.read_csv('train_FD001.txt', sep=r'\s+', header=None, names=columns)
test  = pd.read_csv('test_FD001.txt',  sep=r'\s+', header=None, names=columns)
rul_actual = pd.read_csv('RUL_FD001.txt', header=None, names=['RUL'])

# ─────────────────────────────────────────────
# FEATURE ENGINEERING
# ─────────────────────────────────────────────
print("[2/6] Engineering 5-cycle temporal memory arrays...")
train = build_temporal_features(train, feature_names)
test  = build_temporal_features(test,  feature_names)

max_cycles = train.groupby('engine_id')['cycle'].max().reset_index()
max_cycles.columns = ['engine_id', 'max_cycle']
train = train.merge(max_cycles, on='engine_id')
train['RUL'] = train['max_cycle'] - train['cycle']
train['RUL'] = train['RUL'].clip(upper=125)
train = train.drop(columns=drop_cols_train)

X_train = train.drop(columns=['RUL'])
y_train  = train['RUL']

test_last = test.groupby('engine_id').last().reset_index()
X_test    = test_last.drop(columns=drop_cols_test)

# ─────────────────────────────────────────────
# FLEET TELEMETRY STATISTICS (for temporal shim)
# ─────────────────────────────────────────────
# These are used in /predict to set a calibrated prior for single-point predictions
# avg_5 per sensor = fleet rolling-mean distribution from actual training data
temporal_avg_cols = [f"{c}_avg_5" for c in feature_names]
temporal_std_cols = [f"{c}_std_5" for c in feature_names]

fleet_temporal_mean = X_train[temporal_avg_cols].mean().to_dict()
fleet_temporal_std  = X_train[temporal_std_cols].mean().to_dict()  # avg volatility across fleet

# Raw sensor fleet stats for Z-score anomaly detection
fleet_sensor_mean = X_test[feature_names].mean().to_dict()
fleet_sensor_std  = X_test[feature_names].std().replace(0, 1e-9).to_dict()

print(f"   Training samples : {len(X_train):,}")
print(f"   Test engines     : {len(X_test)}")
print(f"   Features         : {X_train.shape[1]} (13 base + 26 temporal)")

# ─────────────────────────────────────────────
# DIVERSE ENSEMBLE ARCHITECTURE
# ─────────────────────────────────────────────
# 5 models with genuinely different inductive biases:
# Each sees the same data but from a different "angle"
ensemble_configs = [
    {
        'name': 'DeepFastLearner',
        'desc': 'High depth + moderate LR — captures complex non-linear degradation curves',
        'params': dict(n_estimators=300, max_depth=6, learning_rate=0.05,
                       subsample=0.8, colsample_bytree=0.8, min_child_weight=3,
                       reg_alpha=0.1, reg_lambda=1.0, random_state=42)
    },
    {
        'name': 'ShallowSlowLearner',
        'desc': 'Low depth + low LR + high n — biased toward smooth, generalizable trends',
        'params': dict(n_estimators=500, max_depth=3, learning_rate=0.01,
                       subsample=0.7, colsample_bytree=0.6, min_child_weight=5,
                       reg_alpha=0.05, reg_lambda=2.0, random_state=7)
    },
    {
        'name': 'WideAggressive',
        'desc': 'High depth + high LR — captures sharp regime transitions near end-of-life',
        'params': dict(n_estimators=200, max_depth=8, learning_rate=0.10,
                       subsample=0.9, colsample_bytree=0.9, min_child_weight=1,
                       reg_alpha=0.0, reg_lambda=0.5, random_state=123)
    },
    {
        'name': 'RegularizedConservative',
        'desc': 'Heavy regularization + gamma pruning — pessimistic, prevents overconfidence',
        'params': dict(n_estimators=400, max_depth=4, learning_rate=0.02,
                       subsample=0.6, colsample_bytree=0.7, min_child_weight=7,
                       gamma=0.15, reg_alpha=0.3, reg_lambda=3.0, random_state=77)
    },
    {
        'name': 'BalancedPrecision',
        'desc': 'Mid-range all params — anchors the ensemble mean near the true RUL',
        'params': dict(n_estimators=350, max_depth=5, learning_rate=0.03,
                       subsample=0.75, colsample_bytree=0.75, min_child_weight=4,
                       gamma=0.05, reg_alpha=0.15, reg_lambda=1.5, random_state=256)
    },
]

# ─────────────────────────────────────────────
# TRAINING
# ─────────────────────────────────────────────
print(f"\n[3/6] Training Diverse Ensemble (5 architecturally distinct models)...")
print("-" * 60)

models = []
model_metadata_list = []

for i, cfg in enumerate(ensemble_configs):
    print(f"\n  Node {i+1}/5 — {cfg['name']}")
    print(f"  {cfg['desc']}")
    print(f"  Params: depth={cfg['params']['max_depth']}, "
          f"lr={cfg['params']['learning_rate']}, "
          f"n={cfg['params']['n_estimators']}, "
          f"sub={cfg['params']['subsample']}")

    m = XGBRegressor(**cfg['params'])
    m.fit(X_train, y_train,
          eval_set=[(X_test, rul_actual['RUL'])],
          verbose=False)
    models.append(m)

    preds_i = m.predict(X_test)
    rmse_i  = float(np.sqrt(mean_squared_error(rul_actual['RUL'], preds_i)))
    print(f"  [OK] RMSE: {rmse_i:.2f} cycles")

    # Feature importance for this model
    fi = dict(zip(X_train.columns, m.feature_importances_))

    model_metadata_list.append({
        'node_id':     i,
        'name':        cfg['name'],
        'description': cfg['desc'],
        'params':      cfg['params'],
        'rmse':        round(rmse_i, 2),
        'feature_importance': {k: round(float(v), 4) for k, v in fi.items()}
    })

    with open(f'model_ens_{i}.pkl', 'wb') as f:
        pickle.dump(m, f)
    print(f"  -> Serialized: model_ens_{i}.pkl")

# ─────────────────────────────────────────────
# ENSEMBLE EVALUATION
# ─────────────────────────────────────────────
print("\n[4/6] Evaluating ensemble performance...")
all_preds = np.array([m.predict(X_test) for m in models])
ens_mean  = np.mean(all_preds, axis=0)
ens_std   = np.std(all_preds, axis=0)
ens_rmse  = float(np.sqrt(mean_squared_error(rul_actual['RUL'], ens_mean)))
avg_ci_width = float(np.mean(ens_std * 2 * 1.96))

print(f"  Ensemble RMSE       : {ens_rmse:.2f} cycles")
print(f"  Per-model RMSEs     : {[m['rmse'] for m in model_metadata_list]}")
print(f"  Avg 95% CI width    : +/-{avg_ci_width/2:.1f} cycles")
print(f"  Model diversity std : {np.mean(ens_std):.2f}")

# ─────────────────────────────────────────────
# AGGREGATE FEATURE IMPORTANCE
# ─────────────────────────────────────────────
print("\n[5/6] Computing aggregate feature importance rankings...")
all_fi = np.array([list(m['feature_importance'].values()) for m in model_metadata_list])
mean_fi = np.mean(all_fi, axis=0)
fi_dict = dict(zip(X_train.columns, mean_fi))
fi_ranked = dict(sorted(fi_dict.items(), key=lambda x: x[1], reverse=True))

print("  Top 10 most predictive features:")
for rank, (feat, importance) in enumerate(list(fi_ranked.items())[:10], 1):
    bar = '#' * int(importance * 100)
    print(f"  {rank:2}. {feat:<15} {importance:.4f}  {bar}")

# ─────────────────────────────────────────────
# EXPORT MODEL METADATA
# ─────────────────────────────────────────────
print("\n[6/6] Exporting model_metadata.json...")

metadata = {
    'training_summary': {
        'dataset':           'NASA CMAPSS FD001',
        'train_engines':     int(train['RUL'].shape[0]),  # rows
        'test_engines':      len(X_test),
        'n_features':        int(X_train.shape[1]),
        'base_features':     feature_names,
        'temporal_window':   5,
        'rul_clip':          125,
        'ensemble_rmse':     round(ens_rmse, 2),
        'avg_ci_width_cycles': round(avg_ci_width, 2),
        'avg_ensemble_std':  round(float(np.mean(ens_std)), 2),
    },
    'ensemble_nodes': model_metadata_list,
    'feature_importance_ranked': {k: round(float(v), 4) for k, v in fi_ranked.items()},
    'sensor_labels': SENSOR_LABELS,

    # Fleet telemetry statistics — used by /predict temporal shim
    'fleet_temporal_mean': {k: round(float(v), 4) for k, v in fleet_temporal_mean.items()},
    'fleet_temporal_std':  {k: round(float(v), 4) for k, v in fleet_temporal_std.items()},

    # Fleet sensor baseline — used by Z-score anomaly detection
    'fleet_sensor_mean': {k: round(float(v), 4) for k, v in fleet_sensor_mean.items()},
    'fleet_sensor_std':  {k: round(float(v), 4) for k, v in fleet_sensor_std.items()},
}

with open('model_metadata.json', 'w') as f:
    json.dump(metadata, f, indent=2)

print("  -> model_metadata.json written.")

print("\n" + "=" * 60)
print("TRAINING COMPLETE")
print(f"  Ensemble RMSE : {ens_rmse:.2f} cycles")
print(f"  5 diverse models serialized: model_ens_0..4.pkl")
print(f"  Metadata exported: model_metadata.json")
print("=" * 60)