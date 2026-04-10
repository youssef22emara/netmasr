const API_BASE = '/api/complaints';

const NetraAPI = {
    submitComplaint: async (data) => {
        try {
            const response = await fetch(API_BASE, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            return await response.json();
        } catch (error) {
            console.error('API Error:', error);
            return { success: false, error: error.message };
        }
    },
    trackComplaint: async (id) => {
        try {
            const response = await fetch(`${API_BASE}/track/${id}`);
            return await response.json();
        } catch (error) {
            console.error('API Error:', error);
            return { success: false, error: error.message };
        }
    },
    getStats: async () => {
        try {
            const response = await fetch(`${API_BASE}/stats`);
            return await response.json();
        } catch (error) {
            console.error('API Error:', error);
            return { success: false, error: error.message };
        }
    }
};

window.NetraAPI = NetraAPI;
