import React, { useState } from 'react';
import { 
  KeyboardAvoidingView, 
  Platform, 
  StyleSheet, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  View,
  Alert,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext'; 
import apiClient from '../../services/api'; 

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  
  const { signIn } = useAuth();

  const handleLogin = async () => {
  if (!email || !password) {
    Alert.alert("Required", "Please enter credentials");
    return;
  }

  try {
    setIsSubmitting(true);
    
    // 1. Create the payload exactly as the backend LoginRequest expects
    const payload = {
      email: email.trim(), 
      password: password
    };

    console.log("Sending Payload:", payload);

    // 2. Make the call
    const response = await apiClient.post('/auth/login', payload);

    // 3. Handle Success
    const token = response.data.access_token;
    if (token) {
      await signIn(token);
      router.replace('/(tabs)');
    }
  } catch (error: any) {
    // 4. THE DIAGNOSTIC PART
    console.log("Full Error Object:", error);
    
    const serverMessage = error.response?.data?.detail;
    // This will format the error so you can read it on your phone
    const readableError = typeof serverMessage === 'object' 
      ? JSON.stringify(serverMessage) 
      : serverMessage;

    console.log("Server rejected with:", readableError);

    if (error.response?.status === 422) {
      // This alert will now tell us exactly which field is wrong!
      Alert.alert("Backend Validation Error", `The server says: ${readableError}`);
    } else if (error.response?.status === 401) {
      Alert.alert("Login Failed", "Incorrect email or password.");
    } else {
      Alert.alert("Connection Error", "Check if backend is running and IP is correct.");
    }
  } finally {
    setIsSubmitting(false);
  }
};

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
      style={styles.container}
    >
      <View style={styles.inner}>
        {/* LOGO SECTION */}
        <View style={styles.logoContainer}>
          <View style={styles.iconCircle}>
            <Ionicons name="shield-checkmark" size={60} color="white" />
          </View>
          <Text style={styles.title}>MalaSafe</Text>
          <Text style={styles.subtitle}>Ethiopia Malaria AI Response</Text>
        </View>

        {/* INPUT SECTION */}
        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <Ionicons name="mail-outline" size={20} color="#64748b" style={styles.icon} />
            <TextInput 
              style={styles.input}
              placeholder="Admin Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor="#94a3b8"
            />
          </View>

          <View style={styles.inputWrapper}>
            <Ionicons name="lock-closed-outline" size={20} color="#64748b" style={styles.icon} />
            <TextInput 
              style={styles.input}
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholderTextColor="#94a3b8"
            />
          </View>
        </View>

        {/* LOGIN BUTTON */}
        <TouchableOpacity 
          style={[styles.loginBtn, isSubmitting && { opacity: 0.7 }]} 
          onPress={handleLogin}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.loginBtnText}>Login to System</Text>
          )}
        </TouchableOpacity>

        {/* FOOTER */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Official Health Authority Use Only</Text>
          <TouchableOpacity onPress={() => router.push('/register')} style={{marginTop: 10}}>
            <Text style={styles.linkText}>Create Public Account</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  inner: { flex: 1, padding: 30, justifyContent: 'center' },
  logoContainer: { alignItems: 'center', marginBottom: 50 },
  iconCircle: { backgroundColor: '#0284c7', padding: 20, borderRadius: 50, marginBottom: 15 },
  title: { fontSize: 32, fontWeight: 'bold', color: '#0f172a' },
  subtitle: { fontSize: 16, color: '#64748b' },
  inputContainer: { marginBottom: 25 },
  inputWrapper: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: 'white', 
    borderRadius: 15, 
    borderWidth: 1, 
    borderColor: '#e2e8f0', 
    marginBottom: 15, 
    paddingHorizontal: 15,
    height: 60
  },
  icon: { marginRight: 10 },
  input: { flex: 1, fontSize: 16, color: '#1e293b' },
  loginBtn: { 
    backgroundColor: '#0284c7', 
    height: 60, 
    borderRadius: 15, 
    justifyContent: 'center', 
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#0284c7',
    shadowOpacity: 0.3,
    shadowRadius: 10
  },
  loginBtnText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  footer: { alignItems: 'center', marginTop: 40 },
  footerText: { color: '#94a3b8', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 },
  linkText: { color: '#0284c7', fontWeight: 'bold', fontSize: 14 }
});