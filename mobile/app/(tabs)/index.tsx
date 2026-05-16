import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, 
  Dimensions, ActivityIndicator, RefreshControl 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LineChart } from 'react-native-chart-kit';
import { useAuth } from '../../context/AuthContext';
import { malariaService } from '../../services/malariaService';
import * as Notifications from 'expo-notifications';

export default function DashboardScreen() {
  const router = useRouter();
  const { signOut } = useAuth();
  const screenWidth = Dimensions.get("window").width;

  const [stats, setStats] = useState({ total_cases: 0, total_deaths: 0, active_alerts: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [dynamicChartData, setDynamicChartData] = useState({
    labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
    datasets: [{
      data: [0, 0, 0, 0, 0, 0],
      color: (opacity = 1) => `rgba(2, 132, 199, ${opacity})`,
      strokeWidth: 3
    }],
    legend: ["Reported Cases"]
  });

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
            color: (opacity = 1) => `rgba(2, 132, 199, ${opacity})`,
            strokeWidth: 3
          }],
          legend: ["Monthly Case Trends"]
        });
      }

      if (summary?.active_alerts > 0) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "🚨 Malaria Alert!",
            body: `System detected ${summary.active_alerts} active outbreaks. Check the alerts tab.`,
            sound: true,
          },
          trigger: null,
        });
      }
    } catch (error) {
      console.error("Dashboard Fetch Error:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, []);

  const chartConfig = {
    backgroundColor: "#ffffff",
    backgroundGradientFrom: "#ffffff",
    backgroundGradientTo: "#ffffff",
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(2, 132, 199, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(100, 116, 139, ${opacity})`,
    style: { borderRadius: 16 },
    propsForDots: { r: "5", strokeWidth: "2", stroke: "#0284c7" }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0284c7" />
        <Text style={{ marginTop: 10, color: '#64748b' }}>Connecting to MalaSafe Cloud...</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container} 
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello Admin,</Text>
          <Text style={styles.subGreeting}>Surveillance System</Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={async () => { await signOut(); router.replace('/(auth)/'); }}>
          <Ionicons name="log-out-outline" size={22} color="#ef4444" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statusCard}>
        <View style={styles.statusInfo}>
          <Text style={styles.statusTitle}>System Status</Text>
          <Text style={styles.statusLevel}>{stats.active_alerts > 0 ? 'ACTIVE ALERTS' : 'SYSTEM CLEAR'}</Text>
          <Text style={styles.statusArea}>Monitoring {stats.total_cases} Live Cases</Text>
        </View>
        <Ionicons name={stats.active_alerts > 0 ? "warning" : "shield-checkmark"} size={60} color="white" />
      </View>

      <Text style={styles.sectionTitle}>Case Distribution Trends</Text>
      <View style={styles.chartContainer}>
        <LineChart data={dynamicChartData} width={screenWidth - 40} height={200} chartConfig={chartConfig} bezier style={styles.chartStyle} />
      </View>

      <View style={styles.statsGrid}>
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>{stats.total_cases}</Text>
          <Text style={styles.statLabel}>Total Cases</Text>
        </View>
        <View style={[styles.statBox, { borderLeftColor: '#ef4444', borderLeftWidth: 4 }]}>
          <Text style={[styles.statNumber, { color: '#ef4444' }]}>{stats.total_deaths}</Text>
          <Text style={styles.statLabel}>Deaths</Text>
        </View>
        <View style={[styles.statBox, { borderLeftColor: '#f59e0b', borderLeftWidth: 4 }]}>
          <Text style={[styles.statNumber, { color: '#f59e0b' }]}>{stats.active_alerts}</Text>
          <Text style={styles.statLabel}>Alerts</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/(tabs)/map')}>
        <Ionicons name="map" size={24} color="white" style={{ marginRight: 10 }} />
        <Text style={styles.btnText}>Open Risk Map</Text>
      </TouchableOpacity>
      <View style={{ height: 50 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', paddingHorizontal: 20 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 50, marginBottom: 20 },
  greeting: { fontSize: 22, fontWeight: 'bold', color: '#0f172a' },
  subGreeting: { fontSize: 14, color: '#64748b' },
  logoutBtn: { alignItems: 'center', backgroundColor: '#fee2e2', padding: 8, borderRadius: 10 },
  logoutText: { fontSize: 10, color: '#ef4444', fontWeight: 'bold' },
  statusCard: { backgroundColor: '#0284c7', borderRadius: 20, padding: 20, flexDirection: 'row', alignItems: 'center', marginBottom: 25 },
  statusInfo: { flex: 1 },
  statusTitle: { color: 'white', opacity: 0.8, fontSize: 12 },
  statusLevel: { color: 'white', fontSize: 22, fontWeight: 'bold' },
  statusArea: { color: 'white', fontSize: 14, marginTop: 4 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1e293b', marginBottom: 15 },
  chartContainer: { backgroundColor: 'white', borderRadius: 16, paddingVertical: 15, marginBottom: 25, alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
  chartStyle: { borderRadius: 16 },
  statsGrid: { flexDirection: 'row', gap: 10, marginBottom: 25 },
  statBox: { flex: 1, backgroundColor: 'white', padding: 15, borderRadius: 12, alignItems: 'center' },
  statNumber: { fontSize: 18, fontWeight: 'bold', color: '#0f172a' },
  statLabel: { fontSize: 10, color: '#64748b', marginTop: 4 },
  actionBtn: { backgroundColor: '#0f172a', flexDirection: 'row', padding: 16, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  btnText: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});