import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function PreventionScreen() {
  const { woredaName, riskLevel } = useLocalSearchParams();
  const router = useRouter();

  // Content based on Risk Level
  const getGuidanceContent = () => {
    if (riskLevel === 'High') {
      return {
        color: '#ef4444',
        icon: 'warning',
        tips: [
          'Sleep under a Long-Lasting Insecticidal Net (LLIN).',
          'Use Indoor Residual Spraying (IRS) if available.',
          'Wear long sleeves and trousers after sunset.',
          'Visit a health facility immediately if you have a fever.'
        ]
      };
    } else if (riskLevel === 'Medium') {
      return {
        color: '#f59e0b',
        icon: 'alert-circle',
        tips: [
          'Ensure mosquito nets are used every night.',
          'Remove standing water around your home.',
          'Use insect repellent on exposed skin.'
        ]
      };
    } else {
      return {
        color: '#22c55e',
        icon: 'checkmark-circle',
        tips: [
          'Standard precautions are sufficient.',
          'Continue using mosquito nets.',
          'Keep your environment clean.'
        ]
      };
    }
  };

  const content = getGuidanceContent();

  return (
    <ScrollView style={styles.container}>
      <View style={[styles.header, { backgroundColor: content.color }]}>
        <Ionicons name={content.icon as any} size={60} color="white" />
        <Text style={styles.headerTitle}>{woredaName}</Text>
        <Text style={styles.headerSubtitle}>{riskLevel} Risk Level</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionTitle}>Recommended Actions:</Text>
        {content.tips.map((tip, index) => (
          <View key={index} style={styles.tipCard}>
            <Ionicons name="shield-checkmark" size={24} color={content.color} />
            <Text style={styles.tipText}>{tip}</Text>
          </View>
        ))}

        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Back to Map</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { padding: 40, alignItems: 'center', borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: 'white', marginTop: 10 },
  headerSubtitle: { fontSize: 18, color: 'white', opacity: 0.9 },
  content: { padding: 20 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 15, color: '#1e293b' },
  tipCard: { flexDirection: 'row', backgroundColor: 'white', padding: 15, borderRadius: 12, marginBottom: 10, alignItems: 'center', elevation: 2 },
  tipText: { marginLeft: 15, fontSize: 16, color: '#475569', flex: 1 },
  backButton: { marginTop: 20, padding: 15, backgroundColor: '#64748b', borderRadius: 10, alignItems: 'center' },
  backButtonText: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});