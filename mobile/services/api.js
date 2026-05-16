import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// UPDATE THIS LINE to .1.4
const BASE_URL = 'http://192.168.1.4:8000/api/v1'; 

const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
});

apiClient.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('userToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default apiClient;