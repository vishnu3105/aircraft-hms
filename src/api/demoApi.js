const BASE_URL = '/api';

function checkResponse(res) {
  if (!res.ok) {
    return res.json().catch(() => ({})).then(body => {
      throw new Error(body.error || `HTTP ${res.status}`);
    });
  }
  return res.json();
}

export const demoApi = {
  getEngines: async () => {
    const res = await fetch(`${BASE_URL}/engines`);
    return checkResponse(res);
  },
  getAnomalies: async () => {
    const res = await fetch(`${BASE_URL}/anomalies`);
    return checkResponse(res);
  },
  getFleetAlert: async () => {
    const res = await fetch(`${BASE_URL}/fleet_alert`);
    return checkResponse(res);
  },
  getMetadata: async () => {
    const res = await fetch(`${BASE_URL}/metadata`);
    return checkResponse(res);
  },
  predictEngine: async (sensors) => {
    const res = await fetch(`${BASE_URL}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sensors })
    });
    return checkResponse(res);
  },
  analyzeEngine: async (rul, status, sensors) => {
    const res = await fetch(`${BASE_URL}/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rul, status, sensors })
    });
    return checkResponse(res);
  },
  chatWithAria: async (message, session_id) => {
    const res = await fetch(`${BASE_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, session_id })
    });
    return checkResponse(res);
  },
  resetChat: async (session_id) => {
    const res = await fetch(`${BASE_URL}/reset_chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id })
    });
    return checkResponse(res);
  }
};
