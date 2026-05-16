import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { MOCK_WOREDAS } from '../../data/mockWoredas';

export default function TravelScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState([]);
  const router = useRouter();

  // Filter woredas as the user types
  const handleSearch = (text: string) => {
    setSearchQuery(text);
    if (text.length > 0) {
      const filtered = MOCK_WOREDAS.filter(item => 
        item.name.toLowerCase().includes(text.toLowerCase())
      );
      setResults(filtered);
    } else {
      setResults([]);
    }
  };

  const renderWoredaItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.card}
      onPress={() => router.push({
        pathname: '/prevention',
        params: { woredaName: item.name, riskLevel: item.riskLevel }
      })}
    >
      <View style={styles.cardInfo}>
        <Text style={styles.cardName}>{item.name}</Text>
        <Text style={[styles.cardRisk, { color: item.riskLevel === 'High' ? '#ef4444' : '#f59e0b' }]}>
          {item.riskLevel} Risk
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={24} color="#cbd5e1" />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Where are you going?</Text>
      <Text style={styles.subHeader}>Check the malaria risk of your destination before you travel.</Text>

      {/* Search Bar Section */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#64748b" style={styles.searchIcon} />
        <TextInput
          style={styles.input}
          placeholder="Search for a Woreda (e.g. Bole, Arada)"
          placeholderTextColor="#94a3b8"
          value={searchQuery}
          onChangeText={handleSearch}
        />
      </View>

      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        renderItem={renderWoredaItem}
        contentContainerStyle={{ paddingBottom: 20 }}
        ListEmptyComponent={
          searchQuery.length > 0 ? (
            /* This is shown when no results match the search */
            <View style={styles.noDataContainer}>
              <Ionicons name="alert-circle-outline" size={60} color="#cbd5e1" />
              <Text style={styles.noDataText}>
                Data for "{searchQuery}" is currently unavailable.
              </Text>
              <Text style={styles.noDataSubText}>
                During this pilot phase, we are only covering specific districts in the region.
              </Text>
            </View>
          ) : (
            /* This is shown when the search bar is empty */
            <View style={styles.placeholderContainer}>
              <Ionicons name="map-outline" size={80} color="#e2e8f0" />
              <Text style={styles.placeholderText}>Type a destination above</Text>
            </View>
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f8fafc', 
    padding: 20 
  },
  header: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    color: '#1e293b', 
    marginTop: 20 
  },
  subHeader: { 
    fontSize: 16, 
    color: '#64748b', 
    marginBottom: 25 
  },
  searchContainer: { 
    flexDirection: 'row', 
    backgroundColor: 'white', 
    borderRadius: 12, 
    paddingHorizontal: 15, 
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 20,
    height: 55,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  searchIcon: { 
    marginRight: 10 
  },
  input: { 
    flex: 1, 
    fontSize: 16,
    color: '#1e293b'
  },
  card: { 
    flexDirection: 'row', 
    backgroundColor: 'white', 
    padding: 20, 
    borderRadius: 15, 
    marginBottom: 12, 
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f1f5f9'
  },
  cardInfo: { 
    flex: 1 
  },
  cardName: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    color: '#1e293b' 
  },
  cardRisk: { 
    fontSize: 14, 
    fontWeight: '600', 
    marginTop: 4 
  },
  placeholderContainer: { 
    alignItems: 'center', 
    marginTop: 80 
  },
  placeholderText: { 
    color: '#94a3b8', 
    marginTop: 10, 
    fontSize: 16 
  },
  noDataContainer: { 
    alignItems: 'center', 
    marginTop: 60,
    paddingHorizontal: 40
  },
  noDataText: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    color: '#475569', 
    textAlign: 'center',
    marginTop: 15
  },
  noDataSubText: { 
    fontSize: 14, 
    color: '#94a3b8', 
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20
  }
});