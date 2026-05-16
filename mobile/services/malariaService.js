import apiClient from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const malariaService = {
  // Get Dashboard Stats with Caching
  getDashboardStats: async () => {
    try {
      const response = await apiClient.get('/analytics/dashboard');
      // Save to cache for offline use
      await AsyncStorage.setItem('cached_dashboard', JSON.stringify(response.data));
      return response.data;
    } catch (error) {
      console.log("Service: Dashboard offline, loading cache...");
      const cached = await AsyncStorage.getItem('cached_dashboard');
      if (cached) return JSON.parse(cached);
      throw error;
    }
  },

  // Get Risk Map Data with Caching
  getRiskMap: async () => {
    try {
      const response = await apiClient.get('/maps/risk');
      await AsyncStorage.setItem('cached_risk_map', JSON.stringify(response.data));
      return response.data;
    } catch (error) {
      const cached = await AsyncStorage.getItem('cached_risk_map');
      if (cached) return JSON.parse(cached);
      throw error;
    }
  },

  // Get Alerts with Caching
  getAlerts: async () => {
    try {
      const response = await apiClient.get('/alerts');
      await AsyncStorage.setItem('cached_alerts', JSON.stringify(response.data));
      return response.data;
    } catch (error) {
      console.log("Service: Alerts offline, loading cache...");
      const cached = await AsyncStorage.getItem('cached_alerts');
      if (cached) return JSON.parse(cached);
      throw error;
    }
  }
};