const BASE_URL = '/api';

export const demoApi = {
  getEngines: async () => {
    const res = await fetch(`${BASE_URL}/engines`);
    return await res.json();
  },
  getAnomalies: async () => {
    const res = await fetch(`${BASE_URL}/anomalies`);
    return await res.json();
  },
  getFleetAlert: async () => {
    const res = await fetch(`${BASE_URL}/fleet_alert`);
    return await res.json();
  },
  predictEngine: async (sensors) => {
    const res = await fetch(`${BASE_URL}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sensors })
    });
    return await res.json();
  },
  analyzeEngine: async (rul, status, sensors) => {
    const res = await fetch(`${BASE_URL}/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rul, status, sensors })
    });
    return await res.json();
  },
  chatWithAria: async (message) => {
    const res = await fetch(`${BASE_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message })
    });
    return await res.json();
  },
  resetChat: async () => {
    const res = await fetch(`${BASE_URL}/reset_chat`, { method: 'POST' });
    return await res.json();
  }
};
