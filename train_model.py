import pandas as pd
import numpy as np
from xgboost import XGBRegressor
from sklearn.metrics import mean_squared_error
import pickle

columns = ['engine_id', 'cycle', 'setting1', 'setting2', 'setting3',
           's1','s2','s3','s4','s5','s6','s7','s8','s9','s10',
           's11','s12','s13','s14','s15','s16','s17','s18','s19','s20','s21']

train = pd.read_csv('train_FD001.txt', sep='\s+', header=None, names=columns)
test = pd.read_csv('test_FD001.txt', sep='\s+', header=None, names=columns)
rul = pd.read_csv('RUL_FD001.txt', header=None, names=['RUL'])

# Calculate RUL
max_cycles = train.groupby('engine_id')['cycle'].max().reset_index()
max_cycles.columns = ['engine_id', 'max_cycle']
train = train.merge(max_cycles, on='engine_id')
train['RUL'] = train['max_cycle'] - train['cycle']

# Cap RUL at 125
train['RUL'] = train['RUL'].clip(upper=125)

# Drop useless columns
drop_cols = ['engine_id', 'cycle', 'max_cycle', 'setting1', 'setting2', 'setting3',
             's1', 's5', 's10', 's16', 's18', 's19', 's20', 's21']
train = train.drop(columns=drop_cols)

X_train = train.drop(columns=['RUL'])
y_train = train['RUL']

# Test data
test_last = test.groupby('engine_id').last().reset_index()
X_test = test_last.drop(columns=['engine_id', 'cycle', 'setting1', 'setting2', 'setting3',
                                  's1', 's5', 's10', 's16', 's18', 's19', 's20', 's21'])
y_test = rul['RUL']

# Train XGBoost
print("Training XGBoost model...")
model = XGBRegressor(
    n_estimators=500,
    learning_rate=0.01,
    max_depth=6,
    subsample=0.8,
    colsample_bytree=0.8,
    random_state=42
)
model.fit(X_train, y_train)
print("Done!")

# Evaluate
preds = model.predict(X_test)
rmse = np.sqrt(mean_squared_error(y_test, preds))
print(f"RMSE: {rmse:.2f}")
print(f"Sample predictions: {preds[:5].astype(int)}")
print(f"Actual RUL:         {y_test[:5].values}")

# Save
with open('model.pkl', 'wb') as f:
    pickle.dump(model, f)
print("Model saved!")