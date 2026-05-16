import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, Text, StyleSheet, FlatList, TouchableOpacity, 
  ActivityIndicator, RefreshControl 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { malariaService } from '../../services/malariaService';

export default function AlertsScreen() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  const loadAlerts = async () => {
    try {
      setLoading(true);
      const response = await malariaService.getAlerts();
      
      // FIXED: Specifically target the "alerts" key from your teammate's backend
      const actualList = response.alerts || []; 
      setAlerts(actualList);
    } catch (error) {
      console.error("Alerts fetch error:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadAlerts(); }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadAlerts();
  }, []);

  const renderAlertItem = ({ item }: { item: any }) => {
    const isHigh = item.risk_level === 'high' || item.risk_level === 'very_high';
    const accentColor = isHigh ? '#ef4444' : '#f59e0b';

    return (
      <View style={[styles.alertCard, { borderLeftColor: accentColor }]}>
        <View style={styles.alertHeader}>
          <View style={[styles.typeBadge, { backgroundColor: accentColor }]}>
            <Text style={styles.typeText}>{item.risk_level?.toUpperCase()}</Text>
          </View>
          <Text style={styles.timeText}>LIVE</Text>
        </View>

        <Text style={styles.alertTitle}>{item.district_name} District Alert</Text>
        <Text style={styles.descriptionText}>{item.message}</Text>
        
        <TouchableOpacity 
          style={styles.actionLink} 
          onPress={() => {
            // Send the district name to the Map screen
            router.push({
              pathname: '/(tabs)/map',
              params: { district_name: item.district_name }
            });
          }}
        >
          <Text style={styles.actionText}>Investigate {item.district_name}</Text>
          <Ionicons name="arrow-forward" size={16} color="#0284c7" />
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color="#0284c7" />
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.topHeader}>
        <Text style={styles.mainTitle}>System Notifications</Text>
        <Text style={styles.subTitle}>Autonomous alerts from the AI Engine</Text>
      </View>
      <FlatList
        data={alerts}
        keyExtractor={(item, index) => item.id?.toString() || index.toString()}
        renderItem={renderAlertItem}
        contentContainerStyle={{ padding: 20 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.center}>
            <Ionicons name="checkmark-circle-outline" size={60} color="#cbd5e1" />
            <Text style={styles.emptyText}>All systems clear. No alerts found.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 100 },
  topHeader: { padding: 20, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#e2e8f0', paddingTop: 60 },
  mainTitle: { fontSize: 22, fontWeight: 'bold', color: '#1e293b' },
  subTitle: { fontSize: 14, color: '#64748b' },
  alertCard: { backgroundColor: 'white', borderRadius: 15, padding: 18, marginBottom: 15, borderLeftWidth: 6, elevation: 4, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5 },
  alertHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  typeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  typeText: { color: 'white', fontSize: 10, fontWeight: '900' },
  timeText: { fontSize: 10, color: '#94a3b8', fontWeight: 'bold' },
  alertTitle: { fontSize: 16, fontWeight: 'bold', color: '#1e293b' },
  descriptionText: { fontSize: 14, color: '#475569', marginTop: 8, lineHeight: 20 },
  actionLink: { flexDirection: 'row', alignItems: 'center', marginTop: 15, borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 12 },
  actionText: { fontWeight: 'bold', color: '#0284c7', marginRight: 5, fontSize: 14 },
  emptyText: { color: '#94a3b8', fontSize: 16, marginTop: 10 }
});