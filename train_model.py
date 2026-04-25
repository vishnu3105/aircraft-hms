import pandas as pd
import numpy as np
from xgboost import XGBRegressor
from sklearn.metrics import mean_squared_error
import pickle

columns = ['engine_id', 'cycle', 'setting1', 'setting2', 'setting3',
           's1','s2','s3','s4','s5','s6','s7','s8','s9','s10',
           's11','s12','s13','s14','s15','s16','s17','s18','s19','s20','s21']

drop_cols_train = ['engine_id', 'cycle', 'max_cycle', 'setting1', 'setting2', 'setting3',
             's1', 's5', 's10', 's16', 's18', 's19', 's20', 's21']

drop_cols_test = ['engine_id', 'cycle', 'setting1', 'setting2', 'setting3',
             's1', 's5', 's10', 's16', 's18', 's19', 's20', 's21']

feature_names = ['s2','s3','s4','s6','s7','s8','s9','s11','s12','s13','s14','s15','s17']

def build_temporal_features(df, features, w=5):
    """Engineers sliding window averages and volatility (rate of change)"""
    df = df.sort_values(['engine_id', 'cycle'])
    roll_mean = df.groupby('engine_id')[features].rolling(w, min_periods=1).mean().reset_index(0, drop=True)
    roll_mean.columns = [f"{c}_avg_{w}" for c in features]
    roll_std = df.groupby('engine_id')[features].rolling(w, min_periods=1).std().reset_index(0, drop=True).fillna(0)
    roll_std.columns = [f"{c}_std_{w}" for c in features]
    return pd.concat([df, roll_mean, roll_std], axis=1)

print("Ingesting CMAPSS datasets...")
train = pd.read_csv('train_FD001.txt', sep=r'\s+', header=None, names=columns)
test = pd.read_csv('test_FD001.txt', sep=r'\s+', header=None, names=columns)
rul_actual = pd.read_csv('RUL_FD001.txt', header=None, names=['RUL'])

print("Engineering temporal memory arrays (5-cycle windows)...")
train = build_temporal_features(train, feature_names)
test = build_temporal_features(test, feature_names)

max_cycles = train.groupby('engine_id')['cycle'].max().reset_index()
max_cycles.columns = ['engine_id', 'max_cycle']
train = train.merge(max_cycles, on='engine_id')
train['RUL'] = train['max_cycle'] - train['cycle']
train['RUL'] = train['RUL'].clip(upper=125)
train = train.drop(columns=drop_cols_train)

X_train = train.drop(columns=['RUL'])
y_train = train['RUL']

test_last = test.groupby('engine_id').last().reset_index()
X_test = test_last.drop(columns=drop_cols_test)

# Train an ENSEMBLE of 5 diverse models for Bayesian Uncertainty
print("Training Ensemble Architecture (5 Models) for True Variance...")
models = []
for i in range(5):
    print(f"Training Node {i+1}/5...")
    m = XGBRegressor(
        n_estimators=150, max_depth=4, learning_rate=0.05,
        subsample=0.8, colsample_bytree=0.8, # Bagging & Feature subsetting
        random_state=42 + i
    )
    m.fit(X_train, y_train)
    models.append(m)
    with open(f'model_ens_{i}.pkl', 'wb') as f:
        pickle.dump(m, f)

# Evaluate Mean RMSE
from sklearn.metrics import mean_squared_error
preds = np.mean([m.predict(X_test) for m in models], axis=0)
rmse = np.sqrt(mean_squared_error(rul_actual['RUL'], preds))
print(f"Ensemble RMSE: {rmse:.2f}")

print("Ensemble models generated and serialized!")