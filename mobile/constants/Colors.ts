import { useColorScheme } from 'react-native';

export const Theme = {
  light: {
    primary: '#6366f1', // Indigo from Web UI
    secondary: '#8b5cf6', // Purple gradient
    background: '#ffffff',
    surface: '#f8fafc',
    text: '#0f172a',
    subtext: '#64748b',
    border: '#e2e8f0',
    card: '#ffffff',
    error: '#ef4444',
    success: '#22c55e',
  },
  dark: {
    primary: '#818cf8',
    secondary: '#a78bfa',
    background: '#0f172a',
    surface: '#1e293b',
    text: '#f8fafc',
    subtext: '#94a3b8',
    border: '#334155',
    card: '#1e293b',
    error: '#f87171',
    success: '#4ade80',
  }
};

export function useTheme() {
  const scheme = useColorScheme();
  return scheme === 'dark' ? Theme.dark : Theme.light;
}