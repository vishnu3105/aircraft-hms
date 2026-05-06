import requests

BASE = 'http://127.0.0.1:5000'

print("=" * 60)
print("ARIA API SMOKE TEST")
print("=" * 60)

# /engines
r = requests.get(BASE + '/engines')
assert r.status_code == 200
engines = r.json()
e0 = engines[0]
e13 = engines[12]  # FD-013 — was hardcoded fault
e66 = engines[65]  # FD-066 — was hardcoded fault
print("[/engines] Count:", len(engines))
print("  FD-001: RUL=" + str(e0['predicted_rul']) + ", verdict=" + str(e0['unified_verdict']) + ", arb=" + str(e0['arbitration_score']))
print("  FD-013 (was fake fault): status=" + str(e13['status']) + " (should NOT be sensor_failure)")
print("  FD-066 (was fake fault): status=" + str(e66['status']) + " (should NOT be sensor_failure)")
assert e13['status'] != 'sensor_failure', "BUG: FD-013 still hardcoded fault!"
assert e66['status'] != 'sensor_failure', "BUG: FD-066 still hardcoded fault!"
print("  [PASS] No hardcoded faults in fleet data")

# /anomalies
r = requests.get(BASE + '/anomalies')
assert r.status_code == 200
anom = r.json()
a0 = anom[0]
print("[/anomalies] Top: Engine " + str(a0['engine_id']) + ", sensors=" + str(a0['flagged_sensors']) + ", max_z=" + str(a0['max_z']))

# /metadata
r = requests.get(BASE + '/metadata')
assert r.status_code == 200
meta = r.json()
print("[/metadata] Ensemble RMSE=" + str(meta['ensemble_rmse']) + ", nodes=" + str(len(meta['ensemble_nodes'])))

# /predict valid
sensors = [642.15, 1589.70, 1400.60, 21.61, 553.36, 2388.06, 9046.19, 47.20, 521.90, 2388.02, 8140.00, 8.44, 39.00]
r = requests.post(BASE + '/predict', json={'sensors': sensors})
assert r.status_code == 200
p = r.json()
print("[/predict valid] RUL=" + str(p['rul']) + ", status=" + str(p['status']) + ", verdict=" + str(p['unified_verdict']) + ", arb=" + str(p['arbitration_score']))
print("  CI=[" + str(p['lower_bound']) + "-" + str(p['upper_bound']) + "], std=" + str(p['ens_std']))

# /predict sensor fault (negative value)
sensors_fault = [642.15, -0.05, 1400.60, 21.61, 553.36, 2388.06, 9046.19, 47.20, 521.90, 2388.02, 8140.00, 8.44, 39.00]
r = requests.post(BASE + '/predict', json={'sensors': sensors_fault})
assert r.status_code == 200
p = r.json()
assert p['status'] == 'sensor_failure'
print("[/predict fault] status=" + p['status'] + ", diag=" + p['diagnostic'][:80] + "...")

# /predict thermo mismatch (s2 > s3)
sensors_thermo = [2000.0, 1589.70, 1400.60, 21.61, 553.36, 2388.06, 9046.19, 47.20, 521.90, 2388.02, 8140.00, 8.44, 39.00]
r = requests.post(BASE + '/predict', json={'sensors': sensors_thermo})
p = r.json()
assert p['status'] == 'sensor_failure'
print("[/predict thermo] status=" + p['status'] + " [PASS]")

# /predict bad input (missing field)
r = requests.post(BASE + '/predict', json={'wrong': 1})
assert r.status_code == 400
print("[/predict bad input] HTTP=" + str(r.status_code) + ", error=" + r.json()['error'] + " [PASS]")

# /predict wrong length
r = requests.post(BASE + '/predict', json={'sensors': [1.0, 2.0, 3.0]})
assert r.status_code == 400
print("[/predict wrong len] HTTP=" + str(r.status_code) + " [PASS]")

# /reset_chat per-session
r = requests.post(BASE + '/reset_chat', json={'session_id': 'test-abc-123'})
assert r.status_code == 200
resp = r.json()
assert resp['session_id'] == 'test-abc-123'
print("[/reset_chat] status=" + resp['status'] + ", session=" + resp['session_id'] + " [PASS]")

print()
print("=" * 60)
print("ALL TESTS PASSED")
print("=" * 60)
