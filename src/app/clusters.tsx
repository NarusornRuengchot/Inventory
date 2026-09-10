import { TopNavigation } from '@/components/top-navigation';
import { useAuth } from '@/context/AuthContext';
import { Car, useInventory } from '@/context/InventoryContext';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  Dimensions,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  View,
} from 'react-native';

interface ClusterInfo {
  id: number;
  name: string;
  badgeName: string;
  color: string;
  accentBg: string;
  profile: string;
  cars: Car[];
  minPrice: number;
  maxPrice: number;
  avgPrice: number;
  avgMileage: number;
}

// -------------------------------------------------------------
// Pure TypeScript K-Means & Elbow Method Implementation
// -------------------------------------------------------------
function runKMeans(cars: Car[], k: number) {
  if (!cars || cars.length === 0) return { clusters: [], inertias: [] };

  const validCars = cars.filter((c) => Number(c.selling_price) > 0);
  if (validCars.length < k) return { clusters: [], inertias: [] };

  const prices = validCars.map((c) => Number(c.selling_price));
  const meanPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
  const stdPrice =
    Math.sqrt(prices.reduce((a, b) => a + Math.pow(b - meanPrice, 2), 0) / prices.length) || 1;

  const normalized = validCars.map((c) => ({
    car: c,
    price: Number(c.selling_price),
    normPrice: (Number(c.selling_price) - meanPrice) / stdPrice,
  }));

  // Helper for single K-Means run
  const computeSingleKMeans = (targetK: number) => {
    // Sort and pick initial centroids based on percentiles
    const sorted = [...normalized].sort((a, b) => a.normPrice - b.normPrice);
    let centroids = Array.from({ length: targetK }, (_, i) => {
      const idx = Math.floor((i / (targetK - 1 || 1)) * (sorted.length - 1));
      return sorted[idx].normPrice;
    });

    let assignments = new Array(sorted.length).fill(0);
    let iterations = 0;
    let changed = true;

    while (changed && iterations < 20) {
      changed = false;
      iterations++;

      // Assign to nearest centroid
      for (let i = 0; i < normalized.length; i++) {
        let minDist = Infinity;
        let bestCluster = 0;
        for (let c = 0; c < targetK; c++) {
          const dist = Math.abs(normalized[i].normPrice - centroids[c]);
          if (dist < minDist) {
            minDist = dist;
            bestCluster = c;
          }
        }
        if (assignments[i] !== bestCluster) {
          assignments[i] = bestCluster;
          changed = true;
        }
      }

      // Recompute centroids
      for (let c = 0; c < targetK; c++) {
        const clusterMembers = normalized.filter((_, idx) => assignments[idx] === c);
        if (clusterMembers.length > 0) {
          centroids[c] =
            clusterMembers.reduce((sum, item) => sum + item.normPrice, 0) / clusterMembers.length;
        }
      }
    }

    // Calculate Inertia (Within-Cluster Sum of Squares)
    let inertia = 0;
    for (let i = 0; i < normalized.length; i++) {
      const c = assignments[i];
      inertia += Math.pow(normalized[i].normPrice - centroids[c], 2);
    }

    return { assignments, centroids, inertia };
  };

  // 1. Calculate inertias for Elbow Method (k = 1 to 7)
  const inertias: { k: number; inertia: number }[] = [];
  const maxK = Math.min(7, validCars.length);
  for (let testK = 1; testK <= maxK; testK++) {
    const res = computeSingleKMeans(testK);
    inertias.push({ k: testK, inertia: Number(res.inertia.toFixed(4)) });
  }

  // 2. Compute clusters for chosen k
  const targetResult = computeSingleKMeans(k);

  // Group cars by cluster and sort by average price
  const grouped: { clusterIndex: number; cars: Car[]; avgPrice: number }[] = [];
  for (let c = 0; c < k; c++) {
    const clusterCars = normalized
      .filter((_, idx) => targetResult.assignments[idx] === c)
      .map((item) => item.car);

    const avg =
      clusterCars.length > 0
        ? clusterCars.reduce((s, car) => s + Number(car.selling_price), 0) / clusterCars.length
        : 0;

    grouped.push({ clusterIndex: c, cars: clusterCars, avgPrice: avg });
  }

  // Sort groups in ascending price order (0: Budget, 1: Mid, 2: Premium)
  grouped.sort((a, b) => a.avgPrice - b.avgPrice);

  const clusterMetaDef = [
    {
      name: 'Budget / Economy (รถราคาประหยัด)',
      badgeName: 'Budget',
      color: '#10b981',
      accentBg: 'rgba(16, 185, 129, 0.12)',
      profile: 'รถราคาเข้าถึงง่าย ซื้อง่ายขายคล่อง เหมาะกับผู้เริ่มต้นทำงานหรืออีโคคาร์',
    },
    {
      name: 'Mid-Range / Family (รถยอดนิยมระดับกลาง)',
      badgeName: 'Mid-Range',
      color: '#f59e0b',
      accentBg: 'rgba(245, 158, 11, 0.12)',
      profile: 'รถ C-Segment, SUV, รถกระบะใช้งานอเนกประสงค์ สมรรถนะสูง',
    },
    {
      name: 'Premium / Luxury (รถพรีเมียม / รถสะสม)',
      badgeName: 'Premium',
      color: '#8b5cf6',
      accentBg: 'rgba(139, 92, 246, 0.12)',
      profile: 'รถระดับบน สมรรถนะสูง แบรนด์ยุโรปหรูหรา หรือรถสปอร์ตหายาก',
    },
    {
      name: 'Supercar / Ultra-Luxury',
      badgeName: 'Ultra',
      color: '#ec4899',
      accentBg: 'rgba(236, 72, 153, 0.12)',
      profile: 'รถกลุ่มพิเศษที่มีมูลค่าสูงมากเป็นพิเศษ',
    },
  ];

  const clusterResults: ClusterInfo[] = grouped.map((g, sortedIdx) => {
    const pricesInCluster = g.cars.map((c) => Number(c.selling_price));
    const mileagesInCluster = g.cars.map((c) => Number(c.mileage || 0));
    const meta = clusterMetaDef[Math.min(sortedIdx, clusterMetaDef.length - 1)];

    return {
      id: sortedIdx,
      name: `Cluster ${sortedIdx}: ${meta.name}`,
      badgeName: meta.badgeName,
      color: meta.color,
      accentBg: meta.accentBg,
      profile: meta.profile,
      cars: g.cars.sort((a, b) => Number(a.selling_price) - Number(b.selling_price)),
      minPrice: pricesInCluster.length > 0 ? Math.min(...pricesInCluster) : 0,
      maxPrice: pricesInCluster.length > 0 ? Math.max(...pricesInCluster) : 0,
      avgPrice: g.avgPrice,
      avgMileage:
        mileagesInCluster.length > 0
          ? Math.round(mileagesInCluster.reduce((a, b) => a + b, 0) / mileagesInCluster.length)
          : 0,
    };
  });

  return { clusters: clusterResults, inertias };
}

export default function ClustersScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { user, isAdmin } = useAuth();
  const { cars, setCars } = useInventory();

  const [selectedK, setSelectedK] = useState<number>(3);
  const [activeTab, setActiveTab] = useState<'overview' | 'elbow' | 'scatter' | 'table'>('overview');
  const [selectedClusterFilter, setSelectedClusterFilter] = useState<number | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedCar, setSelectedCar] = useState<Car | null>(null);


  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch('http://119.59.102.161:3024/api/products');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setCars(data);
        }
      }
    } catch (e) {
      console.log('Refresh error:', e);
    } finally {
      setIsRefreshing(false);
    }
  };


  // Run Clustering
  const { clusters, inertias } = useMemo(() => {
    return runKMeans(cars, selectedK);
  }, [cars, selectedK]);

  const themeStyles = {
    container: isDark ? '#000000' : '#f8f9fa',
    cardBg: isDark ? '#141416' : '#ffffff',
    border: isDark ? '#26272b' : '#e5e7eb',
    text: isDark ? '#ffffff' : '#111827',
    textSecondary: isDark ? '#9ca3af' : '#6b7280',
    highlight: isDark ? '#1e293b' : '#f1f5f9',
  };

  // If not admin, show guard screen
  if (!isAdmin) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: themeStyles.container }]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        {Platform.OS !== 'web' && <TopNavigation activeTab="clusters" />}
        <View style={styles.guardContainer}>
          <Text style={styles.guardEmoji}>🔒</Text>
          <Text style={[styles.guardTitle, { color: themeStyles.text }]}>Admin Access Required</Text>
          <Text style={[styles.guardSubtitle, { color: themeStyles.textSecondary }]}>
            หน้านี้สงวนสิทธิ์เฉพาะผู้ดูแลระบบ (Admin) สำหรับการวิเคราะห์สต็อกสินค้าด้วย AI/ML K-Means Clustering
          </Text>
          <TouchableOpacity
            style={styles.guardButton}
            onPress={() => router.push(user ? '/' : '/login')}
          >
            <Text style={styles.guardButtonText}>{user ? 'กลับสู่หน้าหลัก' : 'เข้าสู่ระบบ Admin'}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Filter cars for table
  const displayedCars = useMemo(() => {
    let list = clusters.flatMap((c) =>
      c.cars.map((car) => ({
        ...car,
        clusterId: c.id,
        clusterBadge: c.badgeName,
        clusterColor: c.color,
      }))
    );

    if (selectedClusterFilter !== 'all') {
      list = list.filter((item) => item.clusterId === selectedClusterFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (c) =>
          c.brand.toLowerCase().includes(q) ||
          c.model.toLowerCase().includes(q) ||
          (c.license_plate && c.license_plate.toLowerCase().includes(q))
      );
    }

    return list;
  }, [clusters, selectedClusterFilter, searchQuery]);

  // Inertia Max for Elbow Scaling
  const maxInertia = inertias.length > 0 ? Math.max(...inertias.map((i) => i.inertia)) : 1;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeStyles.container }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      {Platform.OS !== 'web' && <TopNavigation activeTab="clusters" />}

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header Hero Banner */}
        <View style={[styles.heroCard, { backgroundColor: themeStyles.cardBg, borderColor: themeStyles.border }]}>
          <View style={styles.heroTop}>
            <View style={styles.badgeContainer}>
              <View style={styles.aiPill}>
                <Text style={styles.aiPillText}>🤖 AI / ML Analytics</Text>
              </View>
              <View style={styles.adminPill}>
                <Text style={styles.adminPillText}>👑 Admin Only</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.refreshBtn} onPress={handleRefresh} disabled={isRefreshing}>
              <Text style={styles.refreshBtnText}>
                {isRefreshing ? '⏳ กำลังโหลด...' : '🔄 รีเฟรชข้อมูลสด'}
              </Text>
            </TouchableOpacity>

          </View>

          <Text style={[styles.heroTitle, { color: themeStyles.text }]}>
            K-Means Stock Clustering
          </Text>
          <Text style={[styles.heroSubtitle, { color: themeStyles.textSecondary }]}>
            ระบบจัดกลุ่มสินค้าอัตโนมัติตามโครงสร้างรายวิชา Internet Programming (อ.ดร.สมศวุฒิ นิลดำ)
            จำแนกรถยนต์ตามระดับราคาและสมรรถนะ เพื่อการวางกลยุทธ์การขาย
          </Text>

          {/* Quick Stats Grid */}
          <View style={styles.statsRow}>
            <View style={[styles.statBox, { backgroundColor: themeStyles.highlight, borderColor: themeStyles.border }]}>
              <Text style={[styles.statNum, { color: themeStyles.text }]}>{cars.length}</Text>
              <Text style={[styles.statLabel, { color: themeStyles.textSecondary }]}>จำนวนรถทั้งหมด</Text>
            </View>
            <View style={[styles.statBox, { backgroundColor: themeStyles.highlight, borderColor: themeStyles.border }]}>
              <Text style={[styles.statNum, { color: '#2563eb' }]}>{selectedK}</Text>
              <Text style={[styles.statLabel, { color: themeStyles.textSecondary }]}>จำนวนกลุ่ม (k)</Text>
            </View>
            <View style={[styles.statBox, { backgroundColor: themeStyles.highlight, borderColor: themeStyles.border }]}>
              <Text style={[styles.statNum, { color: '#10b981' }]}>k = 3</Text>
              <Text style={[styles.statLabel, { color: themeStyles.textSecondary }]}>จุดศอกที่เหมาะสม (Elbow)</Text>
            </View>
          </View>

          {/* K Selector */}
          <View style={styles.kSelectorContainer}>
            <Text style={[styles.kLabel, { color: themeStyles.text }]}>เลือกจำนวนกลุ่ม (k):</Text>
            <View style={styles.kButtonsRow}>
              {[2, 3, 4, 5].map((k) => (
                <TouchableOpacity
                  key={k}
                  style={[
                    styles.kBtn,
                    selectedK === k ? styles.kBtnActive : { borderColor: themeStyles.border, backgroundColor: themeStyles.highlight },
                  ]}
                  onPress={() => setSelectedK(k)}
                >
                  <Text style={[styles.kBtnText, selectedK === k ? styles.kBtnTextActive : { color: themeStyles.text }]}>
                    k = {k} {k === 3 ? '★' : ''}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Tab Switcher */}
        <View style={[styles.tabBar, { borderColor: themeStyles.border, backgroundColor: themeStyles.cardBg }]}>
          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'overview' && styles.tabItemActive]}
            onPress={() => setActiveTab('overview')}
          >
            <Text style={[styles.tabItemText, activeTab === 'overview' ? styles.tabItemTextActive : { color: themeStyles.textSecondary }]}>
              📊 สรุปภาพรวม
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'elbow' && styles.tabItemActive]}
            onPress={() => setActiveTab('elbow')}
          >
            <Text style={[styles.tabItemText, activeTab === 'elbow' ? styles.tabItemTextActive : { color: themeStyles.textSecondary }]}>
              📈 กราฟ Elbow Curve
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'scatter' && styles.tabItemActive]}
            onPress={() => setActiveTab('scatter')}
          >
            <Text style={[styles.tabItemText, activeTab === 'scatter' ? styles.tabItemTextActive : { color: themeStyles.textSecondary }]}>
              🎯 แผนภูมิ 2D ราคา vs ไมล์
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'table' && styles.tabItemActive]}
            onPress={() => setActiveTab('table')}
          >
            <Text style={[styles.tabItemText, activeTab === 'table' ? styles.tabItemTextActive : { color: themeStyles.textSecondary }]}>
              📋 รายชื่อสินค้าในกลุ่ม
            </Text>
          </TouchableOpacity>
        </View>

        {/* ------------------------------------------------------------- */}
        {/* VIEW 1: OVERVIEW & CLUSTER CARDS                              */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'overview' && (
          <View style={styles.viewSection}>
            <Text style={[styles.sectionTitle, { color: themeStyles.text }]}>
              ผลการจัดกลุ่มสินค้า 3 ระดับ (Cluster Characteristics)
            </Text>

            <View style={styles.clusterCardsContainer}>
              {clusters.map((c) => (
                <View
                  key={c.id}
                  style={[
                    styles.clusterCard,
                    { backgroundColor: themeStyles.cardBg, borderColor: c.color, borderTopWidth: 5 },
                  ]}
                >
                  <View style={styles.clusterCardHeader}>
                    <View style={[styles.clusterBadge, { backgroundColor: c.accentBg }]}>
                      <Text style={[styles.clusterBadgeText, { color: c.color }]}>{c.badgeName}</Text>
                    </View>
                    <Text style={[styles.clusterCount, { color: c.color }]}>{c.cars.length} คัน</Text>
                  </View>

                  <Text style={[styles.clusterTitle, { color: themeStyles.text }]}>{c.name}</Text>
                  <Text style={[styles.clusterProfile, { color: themeStyles.textSecondary }]}>{c.profile}</Text>

                  <View style={[styles.clusterMetrics, { backgroundColor: themeStyles.highlight, borderColor: themeStyles.border }]}>
                    <View style={styles.metricRow}>
                      <Text style={[styles.metricLabel, { color: themeStyles.textSecondary }]}>ช่วงราคา:</Text>
                      <Text style={[styles.metricVal, { color: themeStyles.text }]}>
                        {c.minPrice.toLocaleString()} - {c.maxPrice.toLocaleString()} ฿
                      </Text>
                    </View>
                    <View style={styles.metricRow}>
                      <Text style={[styles.metricLabel, { color: themeStyles.textSecondary }]}>ราคาเฉลี่ย:</Text>
                      <Text style={[styles.metricVal, { color: c.color, fontWeight: '700' }]}>
                        {Math.round(c.avgPrice).toLocaleString()} ฿
                      </Text>
                    </View>
                    <View style={styles.metricRow}>
                      <Text style={[styles.metricLabel, { color: themeStyles.textSecondary }]}>เลขไมล์เฉลี่ย:</Text>
                      <Text style={[styles.metricVal, { color: themeStyles.text }]}>
                        {c.avgMileage.toLocaleString()} กม.
                      </Text>
                    </View>
                  </View>

                  <Text style={[styles.sampleHeader, { color: themeStyles.textSecondary }]}>ตัวอย่างรถในกลุ่มนี้:</Text>
                  <View style={styles.sampleChips}>
                    {c.cars.slice(0, 4).map((car, idx) => (
                      <View key={idx} style={[styles.sampleChip, { backgroundColor: themeStyles.highlight, borderColor: themeStyles.border }]}>
                        <Text style={[styles.sampleChipText, { color: themeStyles.text }]}>
                          {car.brand} {car.model}
                        </Text>
                      </View>
                    ))}
                    {c.cars.length > 4 && (
                      <Text style={[styles.moreText, { color: themeStyles.textSecondary }]}>
                        +{c.cars.length - 4} รุ่นอื่น ๆ
                      </Text>
                    )}
                  </View>
                </View>
              ))}
            </View>

            {/* Slide 10 Insight Summary */}
            <View style={[styles.insightCard, { backgroundColor: themeStyles.cardBg, borderColor: themeStyles.border }]}>
              <Text style={[styles.insightTitle, { color: themeStyles.text }]}>💡 บทวิเคราะห์เชิงธุรกิจ (Cluster Insights)</Text>
              <View style={styles.insightItem}>
                <Text style={styles.insightDot}>🟢</Text>
                <Text style={[styles.insightDesc, { color: themeStyles.textSecondary }]}>
                  <Text style={{ fontWeight: '700', color: themeStyles.text }}>กลุ่ม Budget:</Text> เป็นฐานรายได้หลัก (High Turnover) ควรสต็อกสินค้าสม่ำเสมอ จัดโปรโมชั่นฟรีดาวน์หรือผ่อนต่ำ 5,000-7,000 บ./ด.
                </Text>
              </View>
              <View style={styles.insightItem}>
                <Text style={styles.insightDot}>🟠</Text>
                <Text style={[styles.insightDesc, { color: themeStyles.textSecondary }]}>
                  <Text style={{ fontWeight: '700', color: themeStyles.text }}>กลุ่ม Mid-Range:</Text> มีสัดส่วนกำไรต่อคัน (Margin) สูงสุด ตลาดมีความต้องการคงที่ เหมาะกับการขยายรับประกันศูนย์ 1-2 ปี
                </Text>
              </View>
              <View style={styles.insightItem}>
                <Text style={styles.insightDot}>🟣</Text>
                <Text style={[styles.insightDesc, { color: themeStyles.textSecondary }]}>
                  <Text style={{ fontWeight: '700', color: themeStyles.text }}>กลุ่ม Premium / Collector:</Text> รถพิเศษเฉพาะกลุ่ม (Niche Market) ควรเน้นการตลาดแบบเจาะจงหรือตรวจประวัติรถระดับสากล
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* ------------------------------------------------------------- */}
        {/* VIEW 2: ELBOW METHOD CURVE                                    */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'elbow' && (
          <View style={styles.viewSection}>
            <View style={[styles.elbowCard, { backgroundColor: themeStyles.cardBg, borderColor: themeStyles.border }]}>
              <Text style={[styles.sectionTitle, { color: themeStyles.text }]}>
                กราฟ Elbow Method เพื่อหาค่า k ที่เหมาะสม
              </Text>
              <Text style={[styles.sectionSubtitle, { color: themeStyles.textSecondary }]}>
                วิเคราะห์การลดลงของ Inertia (Within-Cluster Sum of Squares) เมื่อเพิ่มจำนวนกลุ่ม k
              </Text>

              {/* Visual Elbow Curve Chart Container */}
              <View style={[styles.chartBox, { backgroundColor: themeStyles.highlight, borderColor: themeStyles.border }]}>
                <View style={styles.chartHeaderRow}>
                  <Text style={[styles.chartYAxisLabel, { color: themeStyles.textSecondary }]}>Inertia (SSE) ➔</Text>
                  <View style={styles.legendRow}>
                    <View style={[styles.legendDot, { backgroundColor: '#2563eb' }]} />
                    <Text style={[styles.legendText, { color: themeStyles.text }]}>Inertia Curve</Text>
                    <View style={[styles.legendDot, { backgroundColor: '#dc2626', marginLeft: 12 }]} />
                    <Text style={[styles.legendText, { color: themeStyles.text }]}>Elbow Point (k = 3)</Text>
                  </View>
                </View>

                {/* Bars / Point visualization */}
                <View style={styles.elbowBarsRow}>
                  {inertias.map((item) => {
                    const heightPercent = Math.max(8, (item.inertia / (maxInertia || 1)) * 100);
                    const isElbow = item.k === 3;
                    return (
                      <View key={item.k} style={styles.elbowBarCol}>
                        <Text style={[styles.barValueText, { color: isElbow ? '#dc2626' : themeStyles.textSecondary, fontWeight: isElbow ? '700' : '500' }]}>
                          {item.inertia.toFixed(2)}
                        </Text>
                        <View style={styles.barTrack}>
                          <View
                            style={[
                              styles.barFill,
                              {
                                height: `${heightPercent}%`,
                                backgroundColor: isElbow ? '#dc2626' : '#2563eb',
                              },
                            ]}
                          />
                        </View>
                        <View style={[styles.kBadge, isElbow && styles.kBadgeActive]}>
                          <Text style={[styles.kBadgeText, isElbow && styles.kBadgeTextActive]}>
                            k={item.k}
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>

              {/* Explanation Card */}
              <View style={[styles.elbowNoteBox, { backgroundColor: 'rgba(37, 99, 235, 0.08)', borderColor: 'rgba(37, 99, 235, 0.3)' }]}>
                <Text style={styles.elbowNoteTitle}>🎯 สรุปผลทางสถิติ (Mathematical Justification):</Text>
                <Text style={styles.elbowNoteText}>
                  • ที่ k = 1 ➔ 2 ค่า Inertia ลดลงอย่างรวดเร็วจาก {inertias[0]?.inertia.toFixed(2)} สู่ {inertias[1]?.inertia.toFixed(2)}{'\n'}
                  • ที่ k = 2 ➔ 3 เกิดจุดหักงอสำคัญ (Inertia = {inertias[2]?.inertia.toFixed(2)}){'\n'}
                  • หลังจาก k = 3 เป็นต้นไป กราฟเริ่มแบนราบ อัตราการลดลงชะลอตัวลงอย่างมีนัยสำคัญ{'\n'}
                  • <Text style={{ fontWeight: '700' }}>ข้อสรุป:</Text> ค่า <Text style={{ fontWeight: '700', color: '#2563eb' }}>k = 3</Text> เป็นจำนวนกลุ่มที่สมดุลและเหมาะสมที่สุดตามทฤษฎี Elbow Method
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* ------------------------------------------------------------- */}
        {/* VIEW 3: 2D SCATTER PLOT (PRICE VS MILEAGE)                    */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'scatter' && (
          <View style={styles.viewSection}>
            <View style={[styles.elbowCard, { backgroundColor: themeStyles.cardBg, borderColor: themeStyles.border }]}>
              <Text style={[styles.sectionTitle, { color: themeStyles.text }]}>
                แผนภูมิกระจายตัว 2 มิติ: ราคาขาย vs เลขไมล์
              </Text>
              <Text style={[styles.sectionSubtitle, { color: themeStyles.textSecondary }]}>
                เปรียบเทียบตำแหน่งทางการตลาดของรถแต่ละคัน พร้อมสเกลตัวเลขกำกับแกนทั้งสองด้าน
              </Text>

              {/* Scatter Canvas Box */}
              <View style={[styles.scatterContainer, { backgroundColor: themeStyles.cardBg, borderColor: themeStyles.border }]}>
                {/* Legend Row */}
                <View style={styles.scatterLegendRow}>
                  {clusters.map((c) => (
                    <View key={c.id} style={styles.scatterLegendItem}>
                      <View style={[styles.scatterDot, { backgroundColor: c.color }]} />
                      <Text style={[styles.scatterLegendText, { color: themeStyles.text }]}>{c.badgeName}</Text>
                    </View>
                  ))}
                  <Text style={[styles.clickHintText, { color: themeStyles.textSecondary }]}>
                    💡 แตะที่จุดเพื่อดูข้อมูลรถ
                  </Text>
                </View>

                {/* Plot Area with Y-Axis */}
                <View style={styles.chartMainRow}>
                  {/* Y-Axis (Mileage) */}
                  <View style={styles.yAxisColumn}>
                    <Text style={[styles.axisTitleY, { color: themeStyles.textSecondary }]}>เลขไมล์</Text>
                    <View style={styles.yTicksWrapper}>
                      <View style={styles.yTickItem}>
                        <Text style={[styles.tickNumber, { color: themeStyles.textSecondary }]}>100k</Text>
                        <View style={[styles.tickMarkH, { backgroundColor: themeStyles.border }]} />
                      </View>
                      <View style={styles.yTickItem}>
                        <Text style={[styles.tickNumber, { color: themeStyles.textSecondary }]}>75k</Text>
                        <View style={[styles.tickMarkH, { backgroundColor: themeStyles.border }]} />
                      </View>
                      <View style={styles.yTickItem}>
                        <Text style={[styles.tickNumber, { color: themeStyles.textSecondary }]}>50k</Text>
                        <View style={[styles.tickMarkH, { backgroundColor: themeStyles.border }]} />
                      </View>
                      <View style={styles.yTickItem}>
                        <Text style={[styles.tickNumber, { color: themeStyles.textSecondary }]}>25k</Text>
                        <View style={[styles.tickMarkH, { backgroundColor: themeStyles.border }]} />
                      </View>
                      <View style={styles.yTickItem}>
                        <Text style={[styles.tickNumber, { color: themeStyles.textSecondary }]}>0 กม.</Text>
                        <View style={[styles.tickMarkH, { backgroundColor: themeStyles.border }]} />
                      </View>
                    </View>
                  </View>

                  {/* Scatter Canvas Grid Area */}
                  <View style={[styles.scatterPlotArea, { backgroundColor: isDark ? '#111827' : '#f8fafc', borderColor: themeStyles.border }]}>
                    {/* Horizontal Grid lines */}
                    <View style={[styles.gridLineH, { top: '0%', borderColor: isDark ? '#1f2937' : '#e2e8f0' }]} />
                    <View style={[styles.gridLineH, { top: '25%', borderColor: isDark ? '#1f2937' : '#e2e8f0' }]} />
                    <View style={[styles.gridLineH, { top: '50%', borderColor: isDark ? '#1f2937' : '#e2e8f0' }]} />
                    <View style={[styles.gridLineH, { top: '75%', borderColor: isDark ? '#1f2937' : '#e2e8f0' }]} />
                    <View style={[styles.gridLineH, { top: '100%', borderColor: isDark ? '#1f2937' : '#e2e8f0' }]} />

                    {/* Vertical Grid lines */}
                    <View style={[styles.gridLineV, { left: '16.6%', borderColor: isDark ? '#1f2937' : '#e2e8f0' }]} />
                    <View style={[styles.gridLineV, { left: '33.3%', borderColor: isDark ? '#1f2937' : '#e2e8f0' }]} />
                    <View style={[styles.gridLineV, { left: '50.0%', borderColor: isDark ? '#1f2937' : '#e2e8f0' }]} />
                    <View style={[styles.gridLineV, { left: '66.6%', borderColor: isDark ? '#1f2937' : '#e2e8f0' }]} />
                    <View style={[styles.gridLineV, { left: '83.3%', borderColor: isDark ? '#1f2937' : '#e2e8f0' }]} />

                    {/* Scatter Points */}
                    {clusters.flatMap((c) =>
                      c.cars.map((car, idx) => {
                        const price = Number(car.selling_price);
                        const mileage = Number(car.mileage || 0);
                        // Scale price: 0 to 3,000,000 range
                        const priceRatio = Math.min(1, Math.max(0, price / 3000000));
                        const mileageRatio = Math.min(1, Math.max(0, mileage / 100000));
                        const leftPercent = 3 + priceRatio * 91;
                        const bottomPercent = 4 + mileageRatio * 88;
                        const isSelected = selectedCar?.car_id === car.car_id;

                        return (
                          <TouchableOpacity
                            key={`${car.car_id}-${idx}`}
                            activeOpacity={0.8}
                            onPress={() => setSelectedCar(car)}
                            style={[
                              styles.scatterPointTouch,
                              {
                                left: `${leftPercent}%`,
                                bottom: `${bottomPercent}%`,
                              },
                            ]}
                          >
                            <View
                              style={[
                                styles.scatterPointDot,
                                {
                                  backgroundColor: c.color,
                                  borderColor: isSelected ? '#ffffff' : 'rgba(255,255,255,0.8)',
                                  borderWidth: isSelected ? 3 : 1.5,
                                  transform: [{ scale: isSelected ? 1.4 : 1 }],
                                },
                              ]}
                            />
                            {isSelected && (
                              <View style={[styles.activePointBadge, { backgroundColor: c.color }]}>
                                <Text style={styles.activePointBadgeText} numberOfLines={1}>
                                  {car.brand} {car.model}
                                </Text>
                              </View>
                            )}
                          </TouchableOpacity>
                        );
                      })
                    )}
                  </View>
                </View>

                {/* X-Axis (Price) */}
                <View style={styles.xAxisRowContainer}>
                  <View style={styles.xAxisNumbersRow}>
                    <Text style={[styles.tickNumberX, { color: themeStyles.textSecondary }]}>0</Text>
                    <Text style={[styles.tickNumberX, { color: themeStyles.textSecondary }]}>500k</Text>
                    <Text style={[styles.tickNumberX, { color: themeStyles.textSecondary }]}>1.0M</Text>
                    <Text style={[styles.tickNumberX, { color: themeStyles.textSecondary }]}>1.5M</Text>
                    <Text style={[styles.tickNumberX, { color: themeStyles.textSecondary }]}>2.0M</Text>
                    <Text style={[styles.tickNumberX, { color: themeStyles.textSecondary }]}>2.5M</Text>
                    <Text style={[styles.tickNumberX, { color: themeStyles.textSecondary }]}>3.0M+ ฿</Text>
                  </View>
                  <Text style={[styles.axisTitleX, { color: themeStyles.textSecondary }]}>
                    ราคาขาย (บาท) ➔
                  </Text>
                </View>

                {/* Selected Car Info Card */}
                {selectedCar && (
                  <View style={[styles.selectedCarCard, { backgroundColor: themeStyles.highlight, borderColor: themeStyles.border }]}>
                    <View style={styles.selectedCarHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.selectedCarTitle, { color: themeStyles.text }]}>
                          🚗 {selectedCar.brand} {selectedCar.model}
                        </Text>
                        <Text style={[styles.selectedCarSub, { color: themeStyles.textSecondary }]}>
                          ปี {selectedCar.model_year} • ทะเบียน: {selectedCar.license_plate || 'ไม่มีทะเบียน'} • สี: {selectedCar.color || 'N/A'} • เชื้อเพลิง: {selectedCar.fuel_type || 'N/A'}
                        </Text>
                      </View>
                      <TouchableOpacity onPress={() => setSelectedCar(null)} style={styles.closeBtn}>
                        <Text style={{ fontSize: 16, color: themeStyles.textSecondary, fontWeight: '700' }}>✕</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={styles.selectedCarStats}>
                      <View style={styles.selectedStatCol}>
                        <Text style={[styles.selectedStatLabel, { color: themeStyles.textSecondary }]}>ราคาขาย:</Text>
                        <Text style={[styles.selectedStatVal, { color: '#2563eb' }]}>
                          ฿{Number(selectedCar.selling_price).toLocaleString()}
                        </Text>
                      </View>
                      <View style={styles.selectedStatCol}>
                        <Text style={[styles.selectedStatLabel, { color: themeStyles.textSecondary }]}>เลขไมล์สะสม:</Text>
                        <Text style={[styles.selectedStatVal, { color: themeStyles.text }]}>
                          {Number(selectedCar.mileage || 0).toLocaleString()} กม.
                        </Text>
                      </View>
                      <View style={styles.selectedStatCol}>
                        <Text style={[styles.selectedStatLabel, { color: themeStyles.textSecondary }]}>สถานะ:</Text>
                        <Text style={[styles.selectedStatVal, { color: '#10b981' }]}>
                          {selectedCar.status || 'Available'}
                        </Text>
                      </View>
                    </View>
                  </View>
                )}
              </View>
            </View>
          </View>

        )}

        {/* ------------------------------------------------------------- */}
        {/* VIEW 4: CLUSTERED PRODUCT TABLE                               */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'table' && (
          <View style={styles.viewSection}>
            {/* Search & Filter */}
            <View style={[styles.tableFilterCard, { backgroundColor: themeStyles.cardBg, borderColor: themeStyles.border }]}>
              <TextInput
                style={[styles.searchInput, { backgroundColor: themeStyles.highlight, color: themeStyles.text, borderColor: themeStyles.border }]}
                placeholder="🔍 ค้นหายี่ห้อ, รุ่นรถ, ทะเบียน..."
                placeholderTextColor={themeStyles.textSecondary}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />

              <View style={styles.filterPillsRow}>
                <TouchableOpacity
                  style={[styles.filterPill, selectedClusterFilter === 'all' && styles.filterPillActive]}
                  onPress={() => setSelectedClusterFilter('all')}
                >
                  <Text style={[styles.filterPillText, selectedClusterFilter === 'all' && styles.filterPillTextActive]}>
                    ทั้งหมด ({cars.length})
                  </Text>
                </TouchableOpacity>

                {clusters.map((c) => (
                  <TouchableOpacity
                    key={c.id}
                    style={[
                      styles.filterPill,
                      selectedClusterFilter === c.id && { backgroundColor: c.color, borderColor: c.color },
                    ]}
                    onPress={() => setSelectedClusterFilter(c.id)}
                  >
                    <Text
                      style={[
                        styles.filterPillText,
                        selectedClusterFilter === c.id && { color: '#ffffff', fontWeight: '700' },
                      ]}
                    >
                      {c.badgeName} ({c.cars.length})
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* List */}
            <View style={[styles.tableCard, { backgroundColor: themeStyles.cardBg, borderColor: themeStyles.border }]}>
              <View style={[styles.tableHeader, { backgroundColor: themeStyles.highlight, borderColor: themeStyles.border }]}>
                <Text style={[styles.thCol, { flex: 2, color: themeStyles.textSecondary }]}>รุ่นรถยนต์</Text>
                <Text style={[styles.thCol, { flex: 1.2, color: themeStyles.textSecondary }]}>ราคาขาย</Text>
                <Text style={[styles.thCol, { flex: 1, color: themeStyles.textSecondary }]}>เลขไมล์</Text>
                <Text style={[styles.thCol, { flex: 1, color: themeStyles.textSecondary }]}>กลุ่ม AI</Text>
              </View>

              {displayedCars.map((item, idx) => (
                <View
                  key={item.car_id || idx}
                  style={[
                    styles.tableRow,
                    { borderColor: themeStyles.border },
                    idx % 2 === 1 && { backgroundColor: themeStyles.highlight },
                  ]}
                >
                  <View style={[styles.tdCol, { flex: 2 }]}>
                    <Text style={[styles.carNameText, { color: themeStyles.text }]} numberOfLines={1}>
                      {item.brand} {item.model}
                    </Text>
                    <Text style={[styles.carSubText, { color: themeStyles.textSecondary }]}>
                      ปี {item.model_year} • {item.license_plate || 'ไม่มีทะเบียน'}
                    </Text>
                  </View>

                  <View style={[styles.tdCol, { flex: 1.2 }]}>
                    <Text style={[styles.priceText, { color: themeStyles.text }]}>
                      {Number(item.selling_price).toLocaleString()} ฿
                    </Text>
                  </View>

                  <View style={[styles.tdCol, { flex: 1 }]}>
                    <Text style={[styles.mileageText, { color: themeStyles.textSecondary }]}>
                      {Number(item.mileage || 0).toLocaleString()} กม.
                    </Text>
                  </View>

                  <View style={[styles.tdCol, { flex: 1 }]}>
                    <View style={[styles.rowBadge, { backgroundColor: `${item.clusterColor}22`, borderColor: item.clusterColor }]}>
                      <Text style={[styles.rowBadgeText, { color: item.clusterColor }]}>
                        {item.clusterBadge}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}

              {displayedCars.length === 0 && (
                <View style={styles.emptyTable}>
                  <Text style={[styles.emptyText, { color: themeStyles.textSecondary }]}>ไม่พบข้อมูลรถในเงื่อนไขนี้</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Python Architecture Reference Box (Slide 7 & 11) */}
        <View style={[styles.archCard, { backgroundColor: themeStyles.cardBg, borderColor: themeStyles.border }]}>
          <Text style={[styles.archTitle, { color: themeStyles.text }]}>
            🛠️ ระบบบูรณาการ Python Backend & Aggregator
          </Text>
          <Text style={[styles.archDesc, { color: themeStyles.textSecondary }]}>
            ผลการจัดกลุ่มบนหน้านี้ตรงกับการคำนวณผ่านสคริปต์ Data Science ของโปรเจกต์:
          </Text>
          <View style={styles.codeSnippetBox}>
            <Text style={styles.codeSnippetText}>
              • รัน Elbow Curve ใน Terminal: python analysis/elbow_method.py{'\n'}
              • รัน K-Means Export CSV: python analysis/clustering.py{'\n'}
              • ข้อมูลส่วนกลาง Aggregator: GET /api/combined-products (พอร์ต 6000)
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
  },
  guardContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  guardEmoji: {
    fontSize: 54,
    marginBottom: 16,
  },
  guardTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
  },
  guardSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 400,
    marginBottom: 24,
  },
  guardButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  guardButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 15,
  },
  heroCard: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 20,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    flexWrap: 'wrap',
    gap: 8,
  },
  badgeContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  aiPill: {
    backgroundColor: 'rgba(37, 99, 235, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  aiPillText: {
    color: '#2563eb',
    fontSize: 12,
    fontWeight: '600',
  },
  adminPill: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  adminPillText: {
    color: '#f59e0b',
    fontSize: 12,
    fontWeight: '600',
  },
  refreshBtn: {
    backgroundColor: 'rgba(107, 114, 128, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  refreshBtnText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#2563eb',
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 6,
  },
  heroSubtitle: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 18,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 18,
    flexWrap: 'wrap',
  },
  statBox: {
    flex: 1,
    minWidth: 140,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  statNum: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
  },
  kSelectorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(150, 150, 150, 0.15)',
  },
  kLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  kButtonsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  kBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  kBtnActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  kBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  kBtnTextActive: {
    color: '#ffffff',
  },
  tabBar: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    padding: 4,
    marginBottom: 20,
    flexWrap: 'wrap',
    gap: 4,
  },
  tabItem: {
    flex: 1,
    minWidth: 130,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabItemActive: {
    backgroundColor: '#2563eb',
  },
  tabItemText: {
    fontSize: 13,
    fontWeight: '600',
  },
  tabItemTextActive: {
    color: '#ffffff',
  },
  viewSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    marginBottom: 16,
  },
  clusterCardsContainer: {
    gap: 16,
    marginBottom: 20,
  },
  clusterCard: {
    padding: 18,
    borderRadius: 14,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  clusterCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  clusterBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  clusterBadgeText: {
    fontWeight: '700',
    fontSize: 12,
  },
  clusterCount: {
    fontSize: 16,
    fontWeight: '800',
  },
  clusterTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  clusterProfile: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 14,
  },
  clusterMetrics: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 14,
    gap: 8,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metricLabel: {
    fontSize: 13,
  },
  metricVal: {
    fontSize: 13,
    fontWeight: '600',
  },
  sampleHeader: {
    fontSize: 12,
    marginBottom: 6,
  },
  sampleChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    alignItems: 'center',
  },
  sampleChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  sampleChipText: {
    fontSize: 12,
  },
  moreText: {
    fontSize: 11,
    fontStyle: 'italic',
  },
  insightCard: {
    padding: 18,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
  },
  insightTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  insightItem: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
  },
  insightDot: {
    fontSize: 14,
    marginTop: 2,
  },
  insightDesc: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
  },
  elbowCard: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
  },
  chartBox: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  chartHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  chartYAxisLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 4,
  },
  legendText: {
    fontSize: 12,
  },
  elbowBarsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 180,
    paddingTop: 20,
  },
  elbowBarCol: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
  },
  barValueText: {
    fontSize: 10,
    marginBottom: 4,
  },
  barTrack: {
    width: 22,
    height: 120,
    backgroundColor: 'rgba(150, 150, 150, 0.1)',
    borderRadius: 6,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    borderRadius: 6,
  },
  kBadge: {
    marginTop: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  kBadgeActive: {
    backgroundColor: '#dc2626',
  },
  kBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6b7280',
  },
  kBadgeTextActive: {
    color: '#ffffff',
  },
  elbowNoteBox: {
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
  elbowNoteTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2563eb',
    marginBottom: 6,
  },
  elbowNoteText: {
    fontSize: 13,
    lineHeight: 21,
    color: '#1e3a8a',
  },
  scatterContainer: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  scatterLegendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  scatterLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  scatterDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  scatterLegendText: {
    fontSize: 12,
    fontWeight: '600',
  },
  clickHintText: {
    fontSize: 12,
    fontStyle: 'italic',
    marginLeft: 'auto',
  },
  chartMainRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginBottom: 4,
  },
  yAxisColumn: {
    width: 55,
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingRight: 6,
  },
  axisTitleY: {
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 2,
    alignSelf: 'center',
  },
  yTicksWrapper: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingVertical: 2,
  },
  yTickItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tickNumber: {
    fontSize: 11,
    fontWeight: '600',
  },
  tickMarkH: {
    width: 6,
    height: 1.5,
  },
  scatterPlotArea: {
    flex: 1,
    height: 320,
    position: 'relative',
    borderWidth: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  gridLineH: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderBottomWidth: 1,
    borderStyle: 'dashed',
  },
  gridLineV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    borderLeftWidth: 1,
    borderStyle: 'dashed',
  },
  scatterPointTouch: {
    position: 'absolute',
    width: 32,
    height: 32,
    marginLeft: -16,
    marginBottom: -16,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  scatterPointDot: {
    width: 15,
    height: 15,
    borderRadius: 7.5,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  activePointBadge: {
    position: 'absolute',
    bottom: 22,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    zIndex: 20,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  activePointBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
    maxWidth: 110,
  },
  xAxisRowContainer: {
    marginLeft: 55,
    paddingTop: 6,
  },
  xAxisNumbersRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  tickNumberX: {
    fontSize: 11,
    fontWeight: '600',
  },
  axisTitleX: {
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 8,
  },
  selectedCarCard: {
    marginTop: 16,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  selectedCarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  selectedCarTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  selectedCarSub: {
    fontSize: 12,
  },
  closeBtn: {
    padding: 4,
    marginLeft: 8,
  },
  selectedCarStats: {
    flexDirection: 'row',
    gap: 24,
    marginTop: 12,
    flexWrap: 'wrap',
  },
  selectedStatCol: {
    gap: 2,
  },
  selectedStatLabel: {
    fontSize: 11,
  },
  selectedStatVal: {
    fontSize: 14,
    fontWeight: '700',
  },

  tableFilterCard: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 14,
    gap: 10,
  },
  searchInput: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 14,
  },
  filterPillsRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(150, 150, 150, 0.2)',
  },
  filterPillActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6b7280',
  },
  filterPillTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  tableCard: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
  },
  thCol: {
    fontSize: 12,
    fontWeight: '700',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    alignItems: 'center',
  },
  tdCol: {
    justifyContent: 'center',
  },
  carNameText: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  carSubText: {
    fontSize: 11,
  },
  priceText: {
    fontSize: 13,
    fontWeight: '700',
  },
  mileageText: {
    fontSize: 12,
  },
  rowBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  rowBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  emptyTable: {
    padding: 30,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
  },
  archCard: {
    padding: 18,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 10,
    gap: 8,
  },
  archTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  archDesc: {
    fontSize: 13,
    lineHeight: 20,
  },
  codeSnippetBox: {
    backgroundColor: '#0f172a',
    padding: 12,
    borderRadius: 8,
    marginTop: 4,
  },
  codeSnippetText: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: '#38bdf8',
    fontSize: 12,
    lineHeight: 20,
  },
});
