import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView, 
  TouchableOpacity, 
  SafeAreaView, 
  StatusBar, 
  Alert,
  ActivityIndicator
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function App() {
  const [isOnline, setIsOnline] = useState(true);
  const [offlineQueue, setOfflineQueue] = useState<any[]>([]);
  const [currentStopIndex, setCurrentStopIndex] = useState(0);
  const [stops, setStops] = useState([
    { id: "s1", bin_id: "BIN-BLR-001", address: "100ft Rd, Koramangala 4th Block", fill: 94.5, type: "plastic", status: "pending", traffic: "heavy" },
    { id: "s2", bin_id: "BIN-BLR-002", address: "80ft Rd, 6th Block", fill: 88.0, type: "organic", status: "pending", traffic: "moderate" },
    { id: "s3", bin_id: "BIN-BLR-003", address: "Sony World Junction", fill: 78.4, type: "mixed", status: "pending", traffic: "free" },
    { id: "s4", bin_id: "BIN-BLR-004", address: "Forum Mall Promenade", fill: 45.2, type: "glass", status: "pending", traffic: "free" },
    { id: "s5", bin_id: "BIN-BLR-006", address: "12th Main Rd, Indiranagar", fill: 96.0, type: "mixed", status: "pending", traffic: "heavy" }
  ]);
  const [lastScanResult, setLastScanResult] = useState<any>(null);

  // Load offline queue from local device storage on startup
  useEffect(() => {
    async function loadStorage() {
      try {
        const storedQueue = await AsyncStorage.getItem('@offline_queue');
        if (storedQueue) setOfflineQueue(JSON.parse(storedQueue));
      } catch (e) {
        console.log("Storage load error", e);
      }
    }
    loadStorage();
  }, []);

  const handleCollect = async (stopId: string) => {
    const updated = stops.map(s => s.id === stopId ? { ...s, status: "collected" } : s);
    setStops(updated);
    setCurrentStopIndex(prev => Math.min(prev + 1, stops.length - 1));

    const action = { type: "COLLECT_BIN", stopId, timestamp: new Date().toISOString() };
    if (!isOnline) {
      const newQueue = [...offlineQueue, action];
      setOfflineQueue(newQueue);
      await AsyncStorage.setItem('@offline_queue', JSON.stringify(newQueue));
      Alert.alert("Offline Mode", "Action queued locally on device. Will auto-sync when online.");
    } else {
      Alert.alert("Success", "Bin verified & marked collected in central manifest.");
    }
  };

  const handleSimulateScan = () => {
    setLastScanResult({
      category: "Plastic (PET Polyethylene)",
      confidence: "94.2%",
      hazard: false,
      recyclability: "85%"
    });
    Alert.alert("YOLOv8 Edge Inference", "Waste Classified: Plastic (PET)\nRecyclability: 85%\nHazard Flag: False\nInference Time: 18ms (INT8 ONNX)");
  };

  const handleReportDumping = async () => {
    const report = {
      type: "DUMPING_REPORT",
      lat: 12.9380,
      lng: 77.6255,
      severity: "high",
      timestamp: new Date().toISOString()
    };
    if (!isOnline) {
      const newQueue = [...offlineQueue, report];
      setOfflineQueue(newQueue);
      await AsyncStorage.setItem('@offline_queue', JSON.stringify(newQueue));
      Alert.alert("Queued Offline", "GPS Dumping incident recorded. Will sync to Inspector SLA queue.");
    } else {
      Alert.alert("Report Sent", "Geotagged dumping ticket dispatched to Municipal Inspector priority queue.");
    }
  };

  const currentStop = stops[currentStopIndex];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>EcoRoute Pilot</Text>
          <Text style={styles.subtitle}>TRUCK-01 • Rajesh Kumar (EV Pilot)</Text>
        </View>
        <TouchableOpacity 
          style={[styles.statusBadge, { backgroundColor: isOnline ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)' }]}
          onPress={() => setIsOnline(!isOnline)}
        >
          <Text style={[styles.statusText, { color: isOnline ? '#34d399' : '#f87171' }]}>
            {isOnline ? '● Online' : '○ Offline'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Offline sync banner */}
      {offlineQueue.length > 0 && (
        <View style={styles.syncBanner}>
          <Text style={styles.syncText}>
            📦 {offlineQueue.length} action(s) stored locally in offline queue
          </Text>
        </View>
      )}

      {/* Active Navigation Card */}
      <View style={styles.activeCard}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardHeaderSmall}>NEXT OPTIMIZED TARGET ({currentStopIndex + 1}/{stops.length})</Text>
          <Text style={[styles.trafficBadge, { 
            backgroundColor: currentStop.traffic === 'heavy' ? 'rgba(244, 63, 94, 0.2)' : 'rgba(16, 185, 129, 0.2)',
            color: currentStop.traffic === 'heavy' ? '#f43f5e' : '#10b981'
          }]}>
            {currentStop.traffic === 'heavy' ? '⚠️ Heavy Traffic (+6m)' : '✓ Free Flow'}
          </Text>
        </View>

        <Text style={styles.binId}>{currentStop.bin_id}</Text>
        <Text style={styles.address}>{currentStop.address}</Text>

        <View style={styles.metaRow}>
          <View style={styles.metaCol}>
            <Text style={styles.metaLabel}>Fill Level</Text>
            <Text style={[styles.metaValue, { color: currentStop.fill >= 85 ? '#f43f5e' : '#f59e0b' }]}>
              {currentStop.fill}%
            </Text>
          </View>
          <View style={styles.metaCol}>
            <Text style={styles.metaLabel}>Category</Text>
            <Text style={styles.metaValue}>{currentStop.type.toUpperCase()}</Text>
          </View>
          <View style={styles.metaCol}>
            <Text style={styles.metaLabel}>ETA</Text>
            <Text style={[styles.metaValue, { color: '#38bdf8' }]}>4 Mins</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonRow}>
          <TouchableOpacity 
            style={styles.collectButton} 
            onPress={() => handleCollect(currentStop.id)}
          >
            <Text style={styles.buttonText}>✓ Mark Bin Collected</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Driver Quick Utilities */}
      <View style={styles.toolsRow}>
        <TouchableOpacity style={styles.toolCard} onPress={handleSimulateScan}>
          <Text style={styles.toolIcon}>📷</Text>
          <Text style={styles.toolTitle}>Scan Waste</Text>
          <Text style={styles.toolDesc}>YOLOv8 Edge CV</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.toolCard} onPress={handleReportDumping}>
          <Text style={styles.toolIcon}>🚨</Text>
          <Text style={styles.toolTitle}>Report Dumping</Text>
          <Text style={styles.toolDesc}>1-Tap GPS Ticket</Text>
        </TouchableOpacity>
      </View>

      {/* Stops Manifest */}
      <Text style={styles.sectionTitle}>Today&apos;s Stop Manifest</Text>
      <ScrollView style={styles.list}>
        {stops.map((item, index) => (
          <View key={item.id} style={[styles.stopItem, item.status === 'collected' && styles.stopItemDone]}>
            <View style={styles.stopNum}>
              <Text style={styles.stopNumText}>{index + 1}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.stopTitle}>{item.bin_id} ({item.fill}%)</Text>
              <Text style={styles.stopSub}>{item.address}</Text>
            </View>
            <Text style={[styles.stopStatus, { color: item.status === 'collected' ? '#10b981' : '#94a3b8' }]}>
              {item.status === 'collected' ? '✓ Done' : 'Pending'}
            </Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090d16',
    paddingHorizontal: 16
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 12
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff'
  },
  subtitle: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold'
  },
  syncBanner: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    padding: 8,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)'
  },
  syncText: {
    color: '#38bdf8',
    fontSize: 11,
    textAlign: 'center',
    fontWeight: '600'
  },
  activeCard: {
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1f293d',
    marginBottom: 12
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  cardHeaderSmall: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#10b981',
    letterSpacing: 0.5
  },
  trafficBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    fontSize: 10,
    fontWeight: 'bold'
  },
  binId: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff'
  },
  address: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
    marginBottom: 12
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#0d1322',
    padding: 10,
    borderRadius: 10,
    marginBottom: 12
  },
  metaCol: {
    alignItems: 'center'
  },
  metaLabel: {
    fontSize: 10,
    color: '#64748b'
  },
  metaValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 2
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8
  },
  collectButton: {
    flex: 1,
    backgroundColor: '#10b981',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center'
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 13
  },
  toolsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12
  },
  toolCard: {
    flex: 1,
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1f293d'
  },
  toolIcon: {
    fontSize: 20,
    marginBottom: 4
  },
  toolTitle: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 12
  },
  toolDesc: {
    color: '#64748b',
    fontSize: 10,
    marginTop: 1
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#cbd5e1',
    marginBottom: 8
  },
  list: {
    flex: 1
  },
  stopItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111827',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1f293d',
    marginBottom: 6
  },
  stopItemDone: {
    opacity: 0.5
  },
  stopNum: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: '#1f293d',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10
  },
  stopNumText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold'
  },
  stopTitle: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600'
  },
  stopSub: {
    color: '#64748b',
    fontSize: 10
  },
  stopStatus: {
    fontSize: 11,
    fontWeight: 'bold'
  }
});
