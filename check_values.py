import pandas as pd

columns = ['engine_id', 'cycle', 'setting1', 'setting2', 'setting3',
           's1','s2','s3','s4','s5','s6','s7','s8','s9','s10',
           's11','s12','s13','s14','s15','s16','s17','s18','s19','s20','s21']

train = pd.read_csv('train_FD001.txt', sep='\s+', header=None, names=columns)

max_cycles = train.groupby('engine_id')['cycle'].max().reset_index()
max_cycles.columns = ['engine_id', 'max_cycle']
train = train.merge(max_cycles, on='engine_id')
train['RUL'] = train['max_cycle'] - train['cycle']

features = ['s2','s3','s4','s6','s7','s8','s9','s11','s12','s13','s14','s15','s17']

healthy = train[train['RUL'] > 150].iloc[0][features].tolist()
warning = train[(train['RUL'] > 30) & (train['RUL'] <= 80)].iloc[0][features].tolist()
critical = train[train['RUL'] <= 20].iloc[0][features].tolist()

print("healthy:", healthy)
print("warning:", warning)
print("critical:", critical)