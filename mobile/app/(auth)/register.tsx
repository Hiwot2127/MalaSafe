import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import apiClient from '../../services/api';

export default function RegisterScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleRegister = async () => {
    if (!name || !email || !password) {
      Alert.alert("Error", "Please fill all fields");
      return;
    }
    try {
      setLoading(true);
      await apiClient.post('/auth/mobile-register', {
        full_name: name,
        email: email.toLowerCase().trim(),
        password: password
      });
      Alert.alert("Success", "Account created! Please login.", [{ text: "OK", onPress: () => router.push('/') }]);
    } catch (error: any) {
      Alert.alert("Registration Failed", "Email might already be in use.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.inner}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
        <Ionicons name="arrow-back" size={28} color="#0284c7" />
      </TouchableOpacity>
      <Text style={styles.title}>Join MalaSafe</Text>
      <Text style={styles.subtitle}>Help us protect Ethiopia from Malaria</Text>
      
      <View style={styles.inputWrapper}><Ionicons name="person-outline" size={20} color="#64748b" /><TextInput style={styles.input} placeholder="Full Name" value={name} onChangeText={setName}/></View>
      <View style={styles.inputWrapper}><Ionicons name="mail-outline" size={20} color="#64748b" /><TextInput style={styles.input} placeholder="Email" value={email} onChangeText={setEmail} keyboardType="email-address" /></View>
      <View style={styles.inputWrapper}><Ionicons name="lock-closed-outline" size={20} color="#64748b" /><TextInput style={styles.input} placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry /></View>

      <TouchableOpacity style={styles.regBtn} onPress={handleRegister} disabled={loading}>
        {loading ? <ActivityIndicator color="white" /> : <Text style={styles.regBtnText}>Create Account</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  inner: { padding: 30, justifyContent: 'center', flexGrow: 1 },
  backBtn: { marginBottom: 20 },
  title: { fontSize: 32, fontWeight: 'bold', color: '#0f172a' },
  subtitle: { fontSize: 16, color: '#64748b', marginBottom: 40 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderRadius: 15, paddingHorizontal: 15, height: 60, marginBottom: 15, borderWidth: 1, borderColor: '#e2e8f0' },
  input: { flex: 1, marginLeft: 10, fontSize: 16 },
  regBtn: { backgroundColor: '#0284c7', height: 60, borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginTop: 10 },
  regBtnText: { color: 'white', fontSize: 18, fontWeight: 'bold' }
});