import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ActivityIndicator, Text } from 'react-native';
import MapView, { Marker, Callout, PROVIDER_DEFAULT } from 'react-native-maps';
import { useLocalSearchParams } from 'expo-router';
import { malariaService } from '../../services/malariaService';

// Fallback coordinates to place pins accurately in Ethiopia
const DISTRICT_COORDS: any = {
  "Bole": { latitude: 8.9806, longitude: 38.7891 },
  "Arada": { latitude: 9.0350, longitude: 38.7520 },
  "Adama": { latitude: 8.5414, longitude: 39.2689 },
  "Bahir Dar": { latitude: 11.5950, longitude: 37.3908 },
  "Hawassa": { latitude: 7.0621, longitude: 38.4777 }
};

export default function MapScreen() {
  const params = useLocalSearchParams();
  const [markers, setMarkers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [region, setRegion] = useState({
    latitude: 9.03,
    longitude: 38.74,
    latitudeDelta: 0.2,
    longitudeDelta: 0.2,
  });

  const loadMapMarkers = async () => {
    try {
      setLoading(true);
      // We use the Alerts endpoint because we KNOW it works (Status 200)
      const response = await malariaService.getAlerts();
      const alertList = response.alerts || [];
      
      console.log("MAP: Successfully loaded " + alertList.length + " markers from Alerts.");
      setMarkers(alertList);
    } catch (error) {
      console.error("Map Load Error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadMapMarkers(); }, []);

  // Fly to District when triggered by Alerts tab
  useEffect(() => {
    if (params.district_name) {
      const name = params.district_name as string;
      // Extract first word (e.g., "Addis Ababa Bole" -> "Bole")
      const cityKey = Object.keys(DISTRICT_COORDS).find(key => name.includes(key)) || "Arada";
      
      const coords = DISTRICT_COORDS[cityKey];
      if (coords) {
        setRegion({
          ...coords,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        });
      }
    }
  }, [params.district_name]);

  const getMarkerColor = (risk: string) => {
    const r = risk?.toLowerCase();
    if (r === 'high' || r === 'very_high') return 'red';
    if (r === 'moderate') return 'orange';
    return 'green';
  };

  return (
    <View style={styles.container}>
      <MapView 
        style={styles.map} 
        provider={PROVIDER_DEFAULT}
        region={region}
        onRegionChangeComplete={setRegion}
      >
        {markers.map((item: any, index: number) => {
          // Find coordinates based on the district name in the alert
          const cityKey = Object.keys(DISTRICT_COORDS).find(key => item.district_name.includes(key)) || "Arada";
          const coords = DISTRICT_COORDS[cityKey];

          // Add a tiny random offset so markers for the same city don't stack perfectly
          const finalCoords = {
            latitude: coords.latitude + (index * 0.002),
            longitude: coords.longitude + (index * 0.002),
          };

          return (
            <Marker
              key={item.id || index}
              coordinate={finalCoords}
              pinColor={getMarkerColor(item.risk_level)}
            >
              <Callout>
                <View style={styles.callout}>
                  <Text style={styles.calloutTitle}>{item.district_name}</Text>
                  <Text style={{ fontWeight: 'bold', color: getMarkerColor(item.risk_level), fontSize: 12 }}>
                    RISK: {item.risk_level?.toUpperCase()}
                  </Text>
                  <Text style={styles.calloutMessage}>{item.message}</Text>
                </View>
              </Callout>
            </Marker>
          );
        })}
      </MapView>
      
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#0284c7" />
          <Text style={{marginTop: 10, color: '#0284c7', fontWeight: 'bold'}}>Syncing Risk Map...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { width: '100%', height: '100%' },
  loadingOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.6)' },
  callout: { padding: 10, maxWidth: 200 },
  calloutTitle: { fontWeight: 'bold', fontSize: 15, color: '#0f172a' },
  calloutMessage: { fontSize: 12, color: '#64748b', marginTop: 5 }
});