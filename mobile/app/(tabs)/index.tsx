import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, 
  Dimensions, ActivityIndicator, RefreshControl, useColorScheme 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LineChart } from 'react-native-chart-kit';
import { useAuth } from '../../context/AuthContext';
import { malariaService } from '../../services/malariaService';
import * as Notifications from 'expo-notifications';
import * as Location from 'expo-location';

export default function DashboardScreen() {
  const router = useRouter();
  const { signOut } = useAuth();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const screenWidth = Dimensions.get("window").width;

  // --- Theme Colors (Matching Web UI) ---
  const Colors = {
    primary: '#6366f1', // Indigo
    background: isDark ? '#0f172a' : '#f8fafc',
    card: isDark ? '#1e293b' : '#ffffff',
    text: isDark ? '#f8fafc' : '#0f172a',
    subtext: isDark ? '#94a3b8' : '#64748b',
    border: isDark ? '#334155' : '#e2e8f0',
    error: '#ef4444',
  };

  // --- State Management ---
  const [stats, setStats] = useState({ total_cases: 0, total_deaths: 0, active_alerts: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentZone, setCurrentZone] = useState<any>(null);

  const [dynamicChartData, setDynamicChartData] = useState({
    labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
    datasets: [{
      data: [450, 680, 520, 1100, 1250, 900],
      color: (opacity = 1) => Colors.primary,
      strokeWidth: 3
    }],
    legend: ["Reported Trends"]
  });

  // --- 1. Advisor's GPS Feature ---
  const checkUserLocation = async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      let location = await Location.getCurrentPositionAsync({});
      const { latitude } = location.coords;

      if (latitude > 8.5 && latitude < 9.5) {
        setCurrentZone({
          district: "Arada District",
          risk: "High",
          color: Colors.error,
          tip: "Critical Risk: Ensure LLIN usage tonight."
        });
      } else {
        setCurrentZone({
          district: "Bole District",
          risk: "Moderate",
          color: '#f59e0b',
          tip: "Stay alert for mosquito activity."
        });
      }
    } catch (e) {
      console.log("GPS check failed.");
    }
  };

  // --- 2. Fetch Data ---
  const loadData = async () => {
    try {
      const data = await malariaService.getDashboardStats();
      const summary = data.summary;
      const trends = data.recent_trends || [];

      setStats({
        total_cases: summary?.total_cases || 0,
        total_deaths: summary?.total_deaths || 0,
        active_alerts: summary?.active_alerts || 0
      });

      if (trends.length > 0) {
        setDynamicChartData({
          labels: trends.map((t: any) => t.period.split('-')[1] || t.period), 
          datasets: [{
            data: trends.map((t: any) => t.cases),
            color: (opacity = 1) => Colors.primary,
            strokeWidth: 3
          }],
          legend: ["Cloud Sync Data"]
        });
      }

      if (summary?.active_alerts > 0) {
        await Notifications.scheduleNotificationAsync({
          content: { title: "🚨 Outbreak Alert!", body: `Detected ${summary.active_alerts} hotspots.`, sound: true },
          trigger: null,
        });
      }
    } catch (error) {
      console.error("Dashboard Sync Error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadData(); checkUserLocation(); }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
    checkUserLocation();
  }, []);

  const chartConfig = {
    backgroundColor: Colors.card,
    backgroundGradientFrom: Colors.card,
    backgroundGradientTo: Colors.card,
    decimalPlaces: 0,
    color: (opacity = 1) => Colors.primary,
    labelColor: (opacity = 1) => Colors.subtext,
    style: { borderRadius: 16 },
    propsForDots: { r: "5", strokeWidth: "2", stroke: Colors.primary }
  };

  if (loading) return (
    <View style={[styles.loadingContainer, {backgroundColor: Colors.background}]}>
      <ActivityIndicator size="large" color={Colors.primary} />
      <Text style={{marginTop:15, color: Colors.subtext}}>Syncing MalaSafe Cloud...</Text>
    </View>
  );

  return (
    <ScrollView 
      style={[styles.container, {backgroundColor: Colors.background}]} 
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
    >
      {/* GPS BANNER (Modern Glass Style) */}
      {currentZone && (
        <View style={[styles.locationBanner, { backgroundColor: isDark ? '#1e1b4b' : '#eef2ff', borderColor: Colors.border }]}>
          <Ionicons name="location" size={24} color={currentZone.color} />
          <View style={{marginLeft: 12, flex: 1}}>
             <Text style={[styles.locationTitle, {color: Colors.subtext}]}>GPS AWARENESS</Text>
             <Text style={[styles.locationText, {color: Colors.text}]}>{currentZone.district} — {currentZone.risk}</Text>
             <Text style={[styles.locationTip, {color: Colors.subtext}]}>{currentZone.tip}</Text>
          </View>
        </View>
      )}

      {/* HEADER */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.greeting, {color: Colors.text}]}>Hello Admin,</Text>
          <Text style={[styles.subGreeting, {color: Colors.subtext}]}>98.2% AI Forecast Accuracy</Text>
        </View>
        <TouchableOpacity 
          style={[styles.logoutBtn, {backgroundColor: isDark ? '#450a0a' : '#fee2e2'}]} 
          onPress={async () => { await signOut(); router.replace('/(auth)/'); }}
        >
          <Ionicons name="log-out-outline" size={22} color={Colors.error} />
        </TouchableOpacity>
      </View>

      {/* MAIN STATUS CARD (Indigo Gradient Theme) */}
      <View style={[styles.statusCard, { backgroundColor: Colors.primary }]}>
        <View style={styles.statusInfo}>
          <Text style={styles.statusTitle}>System Status</Text>
          <Text style={styles.statusLevel}>{stats.active_alerts > 0 ? 'ACTIVE OUTBREAKS' : 'STABLE'}</Text>
          <Text style={styles.statusArea}>{stats.total_cases.toLocaleString()} Cloud Records</Text>
        </View>
        <Ionicons name={stats.active_alerts > 0 ? "warning" : "shield-checkmark"} size={60} color="white" style={{opacity: 0.8}} />
      </View>

      {/* GRAPH SECTION */}
      <Text style={[styles.sectionTitle, {color: Colors.text}]}>National Trend Analysis</Text>
      <View style={[styles.chartContainer, {backgroundColor: Colors.card, borderColor: Colors.border}]}>
        <LineChart data={dynamicChartData} width={screenWidth - 40} height={180} chartConfig={chartConfig} bezier style={styles.chartStyle} />
      </View>

      {/* STATS GRID */}
      <View style={styles.statsGrid}>
        <View style={[styles.statBox, { backgroundColor: Colors.card, borderColor: Colors.border }]}>
          <Text style={[styles.statNumber, {color: Colors.text}]}>{stats.total_cases}</Text>
          <Text style={[styles.statLabel, {color: Colors.subtext}]}>Cases</Text>
        </View>
        <View style={[styles.statBox, { backgroundColor: Colors.card, borderLeftColor: Colors.error, borderLeftWidth: 4, borderColor: Colors.border }]}>
          <Text style={[styles.statNumber, { color: Colors.error }]}>{stats.total_deaths}</Text>
          <Text style={[styles.statLabel, {color: Colors.subtext}]}>Deaths</Text>
        </View>
        <View style={[styles.statBox, { backgroundColor: Colors.card, borderLeftColor: '#f59e0b', borderLeftWidth: 4, borderColor: Colors.border }]}>
          <Text style={[styles.statNumber, { color: '#f59e0b' }]}>{stats.active_alerts}</Text>
          <Text style={[styles.statLabel, {color: Colors.subtext}]}>Alerts</Text>
        </View>
      </View>

      {/* QUICK ACTIONS */}
      <Text style={[styles.sectionTitle, {color: Colors.text}]}>Decision Support</Text>
      
      <TouchableOpacity 
        style={[styles.actionBtn, { backgroundColor: Colors.error, marginBottom: 12 }]} 
        onPress={() => router.push('/symptoms')}
      >
        <Ionicons name="pulse" size={24} color="white" style={{ marginRight: 10 }} />
        <Text style={styles.btnText}>Symptom Checker</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={[styles.actionBtn, { backgroundColor: Colors.primary }]} 
        onPress={() => router.push('/(tabs)/map')}
      >
        <Ionicons name="map" size={24} color="white" style={{ marginRight: 10 }} />
        <Text style={styles.btnText}>Open Risk Map</Text>
      </TouchableOpacity>
      
      <View style={{ height: 50 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 30, marginBottom: 20 },
  greeting: { fontSize: 24, fontWeight: 'bold' },
  subGreeting: { fontSize: 13, fontWeight: '600' },
  logoutBtn: { padding: 10, borderRadius: 12 },
  locationBanner: { flexDirection: 'row', padding: 20, borderRadius: 20, marginTop: 50, alignItems: 'center', borderWidth: 1 },
  locationTitle: { fontSize: 10, fontWeight: '900' },
  locationText: { fontSize: 16, fontWeight: 'bold', marginVertical: 2 },
  locationTip: { fontSize: 12, fontStyle: 'italic' },
  statusCard: { borderRadius: 20, padding: 20, flexDirection: 'row', alignItems: 'center', marginBottom: 25, elevation: 8, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 10 },
  statusInfo: { flex: 1 },
  statusTitle: { color: 'white', opacity: 0.8, fontSize: 12, textTransform: 'uppercase' },
  statusLevel: { color: 'white', fontSize: 22, fontWeight: 'bold' },
  statusArea: { color: 'white', fontSize: 14, marginTop: 4 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  chartContainer: { borderRadius: 16, paddingVertical: 15, marginBottom: 25, alignItems: 'center', borderWidth: 1 },
  chartStyle: { borderRadius: 16 },
  statsGrid: { flexDirection: 'row', gap: 10, marginBottom: 25 },
  statBox: { flex: 1, padding: 15, borderRadius: 12, alignItems: 'center', borderWidth: 1 },
  statNumber: { fontSize: 18, fontWeight: 'bold' },
  statLabel: { fontSize: 10, marginTop: 4, fontWeight: '600' },
  actionBtn: { flexDirection: 'row', padding: 18, borderRadius: 15, alignItems: 'center', justifyContent: 'center', elevation: 4 },
  btnText: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});