import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function SymptomsScreen() {
  const router = useRouter();

  const symptoms = [
    { title: "High Fever", icon: "thermometer", desc: "Sudden increase in body temperature." },
    { title: "Chills", icon: "snow", desc: "Feeling very cold and shaking." },
    { title: "Headache", icon: "headset", desc: "Severe pain in the forehead or temples." },
    { title: "Nausea", icon: "water", desc: "Feeling like you might vomit." },
    { title: "Muscle Pain", icon: "body", desc: "Aching throughout the body." }
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Symptom Checker</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionTitle}>Are you feeling unwell?</Text>
        <Text style={styles.sectionSubtitle}>If you experience any of these common Malaria symptoms, please take action immediately.</Text>

        {/* Symptoms List */}
        {symptoms.map((item, index) => (
          <View key={index} style={styles.symptomCard}>
            <View style={styles.iconCircle}>
              <Ionicons name={item.icon as any} size={24} color="#0284c7" />
            </View>
            <View style={{ flex: 1, marginLeft: 15 }}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardDesc}>{item.desc}</Text>
            </View>
          </View>
        ))}

        {/* Action Advice Box */}
        <View style={styles.adviceBox}>
          <View style={styles.adviceHeader}>
            <Ionicons name="medical" size={24} color="#ef4444" />
            <Text style={styles.adviceTitle}>Recommended Actions:</Text>
          </View>
          
          <Text style={styles.adviceText}>• Go to the nearest Health Center immediately.</Text>
          <Text style={styles.adviceText}>• Ask for a Malaria Rapid Diagnostic Test (RDT).</Text>
          <Text style={styles.adviceText}>• Do not buy medicine from local shops without a test.</Text>
          <Text style={styles.adviceText}>• Keep yourself hydrated while traveling to the clinic.</Text>
        </View>

        <TouchableOpacity style={styles.doneBtn} onPress={() => router.back()}>
          <Text style={styles.doneBtnText}>I Understand</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { backgroundColor: '#0284c7', padding: 25, paddingTop: 60, flexDirection: 'row', alignItems: 'center' },
  backBtn: { marginRight: 15 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: 'white' },
  content: { padding: 20 },
  sectionTitle: { fontSize: 24, fontWeight: 'bold', color: '#0f172a' },
  sectionSubtitle: { fontSize: 15, color: '#64748b', marginVertical: 10, lineHeight: 22 },
  symptomCard: { flexDirection: 'row', backgroundColor: 'white', padding: 15, borderRadius: 15, marginBottom: 12, alignItems: 'center', elevation: 2 },
  iconCircle: { backgroundColor: '#f0f9ff', padding: 10, borderRadius: 12 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#1e293b' },
  cardDesc: { fontSize: 13, color: '#64748b' },
  adviceBox: { backgroundColor: '#fff1f2', padding: 20, borderRadius: 20, marginTop: 20, borderWidth: 1, borderColor: '#fecaca' },
  adviceHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  adviceTitle: { fontSize: 18, fontWeight: 'bold', color: '#991b1b', marginLeft: 10 },
  adviceText: { fontSize: 15, color: '#991b1b', marginBottom: 8, lineHeight: 22, fontWeight: '500' },
  doneBtn: { backgroundColor: '#0f172a', padding: 18, borderRadius: 15, alignItems: 'center', marginTop: 30 },
  doneBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});