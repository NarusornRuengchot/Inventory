import { TopNavigation } from '@/components/top-navigation';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
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

// ─────────────────────────────────────────────────────────────────────
// Group Members Config — ดึง API จากสมาชิก 5 คน
// ─────────────────────────────────────────────────────────────────────
const GROUP_MEMBERS = [
  { name: 'BM', api_url: 'http://119.59.102.161:3024/api/products' },
  { name: 'Boat', api_url: 'http://119.59.102.161:3047/api/products' },
  { name: 'Oun', api_url: 'http://119.59.102.161:3049/api/products' },
  { name: 'Ohm', api_url: 'http://119.59.102.161:3059/api/products' },
  { name: 'Arnat', api_url: 'http://119.59.102.161:3051/api/products' },
];

// ─────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────
interface GroupProduct {
  id: number | string;
  name: string;
  price: number;
  stock: number;
  source: string;
}

interface MemberStatus {
  name: string;
  status: 'pending' | 'success' | 'error';
  count: number;
  error?: string;
}

interface GroupClusterInfo {
  id: number;
  title: string;
  badgeName: string;
  color: string;
  accentBg: string;
  products: GroupProduct[];
  minPrice: number;
  maxPrice: number;
  avgPrice: number;
}

// ─────────────────────────────────────────────────────────────────────
// K-Means 1D (price) — Pure TypeScript
// ─────────────────────────────────────────────────────────────────────
function runGroupKMeans(products: GroupProduct[], k: number) {
  if (!products || products.length < k) return { clusters: [] as GroupClusterInfo[], inertias: [] as { k: number; inertia: number }[] };

  const prices = products.map((p) => p.price);
  const meanP = prices.reduce((a, b) => a + b, 0) / prices.length;
  const stdP = Math.sqrt(prices.reduce((a, b) => a + Math.pow(b - meanP, 2), 0) / prices.length) || 1;

  const items = products.map((p) => ({ product: p, normPrice: (p.price - meanP) / stdP }));

  const computeKM = (targetK: number) => {
    const sorted = [...items].sort((a, b) => a.normPrice - b.normPrice);
    let centroids = Array.from({ length: targetK }, (_, i) => {
      const idx = Math.floor((i / (targetK - 1 || 1)) * (sorted.length - 1));
      return sorted[idx].normPrice;
    });

    let assignments = new Array(items.length).fill(0);
    let iterations = 0;
    let changed = true;

    while (changed && iterations < 25) {
      changed = false;
      iterations++;
      for (let i = 0; i < items.length; i++) {
        let minDist = Infinity;
        let best = 0;
        for (let c = 0; c < targetK; c++) {
          const d = Math.abs(items[i].normPrice - centroids[c]);
          if (d < minDist) { minDist = d; best = c; }
        }
        if (assignments[i] !== best) { assignments[i] = best; changed = true; }
      }
      for (let c = 0; c < targetK; c++) {
        const members = items.filter((_, idx) => assignments[idx] === c);
        if (members.length > 0) centroids[c] = members.reduce((s, m) => s + m.normPrice, 0) / members.length;
      }
    }

    let inertia = 0;
    for (let i = 0; i < items.length; i++) inertia += Math.pow(items[i].normPrice - centroids[assignments[i]], 2);
    return { assignments, inertia };
  };

  // Elbow (1..7)
  const maxK = Math.min(7, products.length);
  const inertias: { k: number; inertia: number }[] = [];
  for (let t = 1; t <= maxK; t++) {
    const r = computeKM(t);
    inertias.push({ k: t, inertia: Number(r.inertia.toFixed(4)) });
  }

  // K-Means with chosen k
  const result = computeKM(k);

  // Group & sort by avg price
  const grouped: { idx: number; products: GroupProduct[]; avgPrice: number }[] = [];
  for (let c = 0; c < k; c++) {
    const members = items.filter((_, i) => result.assignments[i] === c).map((m) => m.product);
    const avg = members.length > 0 ? members.reduce((s, p) => s + p.price, 0) / members.length : 0;
    grouped.push({ idx: c, products: members, avgPrice: avg });
  }
  grouped.sort((a, b) => a.avgPrice - b.avgPrice);

  const metaDef = [
    { title: 'Budget (สินค้าราคาประหยัด)', badgeName: 'Budget', color: '#10b981', accentBg: 'rgba(16,185,129,0.12)' },
    { title: 'Mid-Range (สินค้าราคากลาง)', badgeName: 'Mid-Range', color: '#f59e0b', accentBg: 'rgba(245,158,11,0.12)' },
    { title: 'Premium (สินค้าราคาสูง)', badgeName: 'Premium', color: '#8b5cf6', accentBg: 'rgba(139,92,246,0.12)' },
    { title: 'Ultra-Premium', badgeName: 'Ultra', color: '#ec4899', accentBg: 'rgba(236,72,153,0.12)' },
    { title: 'Exclusive', badgeName: 'Exclusive', color: '#ef4444', accentBg: 'rgba(239,68,68,0.12)' },
  ];

  const clusters: GroupClusterInfo[] = grouped.map((g, sIdx) => {
    const meta = metaDef[Math.min(sIdx, metaDef.length - 1)];
    const pricesList = g.products.map((p) => p.price);
    return {
      id: sIdx,
      title: `Cluster ${sIdx}: ${meta.title}`,
      badgeName: meta.badgeName,
      color: meta.color,
      accentBg: meta.accentBg,
      products: g.products.sort((a, b) => a.price - b.price),
      minPrice: pricesList.length > 0 ? Math.min(...pricesList) : 0,
      maxPrice: pricesList.length > 0 ? Math.max(...pricesList) : 0,
      avgPrice: g.avgPrice,
    };
  });

  return { clusters, inertias };
}

// ─────────────────────────────────────────────────────────────────────
// SCREEN
// ─────────────────────────────────────────────────────────────────────
export default function GroupClustersScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { user, isAdmin } = useAuth();

  const [allProducts, setAllProducts] = useState<GroupProduct[]>([]);
  const [memberStatuses, setMemberStatuses] = useState<MemberStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedK, setSelectedK] = useState(3);
  const [activeTab, setActiveTab] = useState<'overview' | 'scatter' | 'members' | 'table'>('overview');
  const [selectedClusterFilter, setSelectedClusterFilter] = useState<number | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // ─── Chart Display Controls ───
  const [chartScale, setChartScale] = useState<'log' | 'linear'>('log');
  const [chartViewMode, setChartViewMode] = useState<'cluster' | 'member' | '2d'>('cluster');
  const [selectedProduct, setSelectedProduct] = useState<(GroupProduct & { clusterBadge: string; clusterColor: string; clusterId: number }) | null>(null);
  const [highlightClusterId, setHighlightClusterId] = useState<number | 'all'>('all');

  const themeStyles = {
    container: isDark ? '#000000' : '#f8f9fa',
    cardBg: isDark ? '#141416' : '#ffffff',
    border: isDark ? '#26272b' : '#e5e7eb',
    text: isDark ? '#ffffff' : '#111827',
    textSecondary: isDark ? '#9ca3af' : '#6b7280',
    highlight: isDark ? '#1e293b' : '#f1f5f9',
  };

  // ─── Fetch from all members ───
  const fetchAllMembers = useCallback(async () => {
    setIsLoading(true);
    const statuses: MemberStatus[] = GROUP_MEMBERS.map((m) => ({ name: m.name, status: 'pending' as const, count: 0 }));
    setMemberStatuses([...statuses]);

    const collected: GroupProduct[] = [];

    await Promise.allSettled(
      GROUP_MEMBERS.map(async (member, idx) => {
        try {
          const res = await fetch(member.api_url, { signal: AbortSignal.timeout(8000) });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const raw = await res.json();

          // รองรับทั้ง response แบบ Array ตรงๆ และแบบ { items: [...] }
          let data: any[];
          if (Array.isArray(raw)) {
            data = raw;
          } else if (raw && typeof raw === 'object' && Array.isArray(raw.items)) {
            data = raw.items;
          } else if (raw && typeof raw === 'object' && Array.isArray(raw.data)) {
            data = raw.data;
          } else {
            data = [];
          }

          const normalized: GroupProduct[] = data.map((p: any) => ({
            id: p.id ?? p.car_id ?? p.product_id ?? 0,
            name: p.name ?? (`${p.brand || ''} ${p.model || ''}`.trim() || 'Unknown'),
            price: Number(p.price ?? p.selling_price ?? 0),
            stock: Number(p.stock ?? p.quantity ?? 0),
            source: member.name,
          }));

          collected.push(...normalized);
          statuses[idx] = { name: member.name, status: 'success', count: normalized.length };
        } catch (e: any) {
          statuses[idx] = { name: member.name, status: 'error', count: 0, error: e.message || 'Unknown error' };
        }
        setMemberStatuses([...statuses]);
      })
    );

    setAllProducts(collected);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchAllMembers();
  }, [fetchAllMembers]);

  // K-Means
  const { clusters, inertias } = useMemo(() => runGroupKMeans(allProducts, selectedK), [allProducts, selectedK]);

  // Price statistics and scale mapper
  const priceStats = useMemo(() => {
    const validPrices = allProducts.map((p) => p.price).filter((pr) => pr > 0);
    const minP = validPrices.length > 0 ? Math.min(...validPrices) : 100;
    const maxP = validPrices.length > 0 ? Math.max(...validPrices) : 10000000;
    const minLog = Math.floor(Math.log10(Math.max(10, minP))); // e.g. 2 for 100
    const maxLog = Math.ceil(Math.log10(Math.max(100, maxP)));  // e.g. 7 for 10M
    const spanLog = Math.max(1, maxLog - minLog);
    return { minP, maxP, minLog, maxLog, spanLog };
  }, [allProducts]);

  const getXPercent = useCallback(
    (price: number) => {
      if (chartScale === 'log') {
        const pClamped = Math.max(1, price);
        const logVal = Math.log10(pClamped);
        const ratio = (logVal - priceStats.minLog) / priceStats.spanLog;
        return Math.max(2, Math.min(97, ratio * 94 + 2));
      } else {
        const ratio = price / (priceStats.maxP || 1);
        return Math.max(2, Math.min(97, ratio * 94 + 2));
      }
    },
    [chartScale, priceStats]
  );

  const chartTicks = useMemo(() => {
    if (chartScale === 'log') {
      const ticks: { val: number; label: string; pct: number }[] = [];
      for (let p = priceStats.minLog; p <= priceStats.maxLog; p++) {
        const val = Math.pow(10, p);
        let label = '';
        if (val >= 1e6) label = `${(val / 1e6).toFixed(0)}M`;
        else if (val >= 1e3) label = `${(val / 1e3).toFixed(0)}k`;
        else label = `${val}฿`;

        const ratio = (p - priceStats.minLog) / priceStats.spanLog;
        const pct = Math.max(2, Math.min(97, ratio * 94 + 2));
        ticks.push({ val, label, pct });
      }
      return ticks;
    } else {
      const steps = [0, 0.2, 0.4, 0.6, 0.8, 1.0];
      return steps.map((sVal) => {
        const val = Math.round(sVal * priceStats.maxP);
        let label = '';
        if (val >= 1e6) label = `${(val / 1e6).toFixed(1)}M`;
        else if (val >= 1e3) label = `${(val / 1e3).toFixed(0)}k`;
        else label = `${val}฿`;
        const pct = Math.max(2, Math.min(97, sVal * 94 + 2));
        return { val, label, pct };
      });
    }
  }, [chartScale, priceStats]);

  // Source summary
  const sourceSummary = useMemo(() => {
    const map: Record<string, number> = {};
    allProducts.forEach((p) => { map[p.source] = (map[p.source] || 0) + 1; });
    return Object.entries(map).map(([source, count]) => ({ source, count }));
  }, [allProducts]);

  // Filtered products for table
  const displayedProducts = useMemo(() => {
    let list = clusters.flatMap((c) =>
      c.products.map((p) => ({ ...p, clusterId: c.id, clusterBadge: c.badgeName, clusterColor: c.color }))
    );
    if (selectedClusterFilter !== 'all') list = list.filter((p) => p.clusterId === selectedClusterFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(q) || p.source.toLowerCase().includes(q));
    }
    return list;
  }, [clusters, selectedClusterFilter, searchQuery]);

  // ─── Guard: Admin only ───
  if (!isAdmin) {
    return (
      <SafeAreaView style={[s.container, { backgroundColor: themeStyles.container }]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        {Platform.OS !== 'web' && <TopNavigation activeTab="group-clusters" />}
        <View style={s.guardContainer}>
          <Text style={s.guardEmoji}>🔒</Text>
          <Text style={[s.guardTitle, { color: themeStyles.text }]}>Admin Access Required</Text>
          <Text style={[s.guardSub, { color: themeStyles.textSecondary }]}>
            หน้านี้สงวนสิทธิ์เฉพาะ Admin สำหรับวิเคราะห์ข้อมูลรวมของกลุ่ม
          </Text>
          <TouchableOpacity style={s.guardBtn} onPress={() => router.push(user ? '/' : '/login')}>
            <Text style={s.guardBtnText}>{user ? 'กลับสู่หน้าหลัก' : 'เข้าสู่ระบบ Admin'}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[s.container, { backgroundColor: themeStyles.container }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      {Platform.OS !== 'web' && <TopNavigation activeTab="group-clusters" />}

      <ScrollView contentContainerStyle={s.scrollContent}>
        {/* ─── Hero Banner ─── */}
        <View style={[s.heroCard, { backgroundColor: themeStyles.cardBg, borderColor: themeStyles.border }]}>
          <View style={s.heroTop}>
            <View style={s.pillRow}>
              <View style={s.groupPill}>
                <Text style={s.groupPillText}>👥 Group Analysis</Text>
              </View>
              <View style={s.aiPill}>
                <Text style={s.aiPillText}>🤖 K-Means ML</Text>
              </View>
              <View style={s.adminPill}>
                <Text style={s.adminPillText}>👑 Admin</Text>
              </View>
            </View>
            <TouchableOpacity style={s.refreshBtn} onPress={fetchAllMembers} disabled={isLoading}>
              <Text style={s.refreshBtnText}>{isLoading ? '⏳ กำลังดึงข้อมูล...' : '🔄 ดึงข้อมูลใหม่'}</Text>
            </TouchableOpacity>
          </View>

          <Text style={[s.heroTitle, { color: themeStyles.text }]}>Group K-Means Clustering</Text>
          <Text style={[s.heroSubtitle, { color: themeStyles.textSecondary }]}>
            รวมข้อมูลสินค้าจากสมาชิกทั้ง {GROUP_MEMBERS.length} คนในกลุ่ม แล้วจัดกลุ่มด้วย K-Means Clustering
          </Text>

          {/* Quick Stats */}
          <View style={s.statsRow}>
            <View style={[s.statBox, { backgroundColor: themeStyles.highlight, borderColor: themeStyles.border }]}>
              <Text style={[s.statNum, { color: themeStyles.text }]}>{GROUP_MEMBERS.length}</Text>
              <Text style={[s.statLabel, { color: themeStyles.textSecondary }]}>สมาชิกในกลุ่ม</Text>
            </View>
            <View style={[s.statBox, { backgroundColor: themeStyles.highlight, borderColor: themeStyles.border }]}>
              <Text style={[s.statNum, { color: '#10b981' }]}>{allProducts.length}</Text>
              <Text style={[s.statLabel, { color: themeStyles.textSecondary }]}>สินค้ารวม</Text>
            </View>
            <View style={[s.statBox, { backgroundColor: themeStyles.highlight, borderColor: themeStyles.border }]}>
              <Text style={[s.statNum, { color: '#2563eb' }]}>{selectedK}</Text>
              <Text style={[s.statLabel, { color: themeStyles.textSecondary }]}>จำนวนกลุ่ม (k)</Text>
            </View>
            <View style={[s.statBox, { backgroundColor: themeStyles.highlight, borderColor: themeStyles.border }]}>
              <Text style={[s.statNum, { color: '#8b5cf6' }]}>{memberStatuses.filter((m) => m.status === 'success').length}</Text>
              <Text style={[s.statLabel, { color: themeStyles.textSecondary }]}>เชื่อมต่อสำเร็จ</Text>
            </View>
          </View>

          {/* K Selector */}
          <View style={s.kSelectorContainer}>
            <Text style={[s.kLabel, { color: themeStyles.text }]}>เลือก k:</Text>
            <View style={s.kBtnsRow}>
              {[2, 3, 4, 5].map((k) => (
                <TouchableOpacity
                  key={k}
                  style={[s.kBtn, selectedK === k ? s.kBtnActive : { borderColor: themeStyles.border, backgroundColor: themeStyles.highlight }]}
                  onPress={() => setSelectedK(k)}
                >
                  <Text style={[s.kBtnText, selectedK === k ? s.kBtnTextActive : { color: themeStyles.text }]}>
                    k = {k} {k === 3 ? '★' : ''}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* ─── Loading Indicator ─── */}
        {isLoading && (
          <View style={[s.loadingCard, { backgroundColor: themeStyles.cardBg, borderColor: themeStyles.border }]}>
            <ActivityIndicator size="large" color="#2563eb" />
            <Text style={[s.loadingText, { color: themeStyles.text }]}>กำลังดึงข้อมูลจาก API ของสมาชิก...</Text>
            <View style={{ marginTop: 12, gap: 6 }}>
              {memberStatuses.map((m, i) => (
                <View key={i} style={s.statusRow}>
                  <Text style={{ fontSize: 14 }}>
                    {m.status === 'pending' ? '⏳' : m.status === 'success' ? '✅' : '❌'}
                  </Text>
                  <Text style={[s.statusName, { color: themeStyles.text }]}>{m.name}</Text>
                  {m.status === 'success' && (
                    <Text style={[s.statusCount, { color: '#10b981' }]}>{m.count} รายการ</Text>
                  )}
                  {m.status === 'error' && (
                    <Text style={[s.statusCount, { color: '#ef4444' }]}>{m.error}</Text>
                  )}
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ─── Tab Switcher ─── */}
        {!isLoading && (
          <View style={[s.tabBar, { borderColor: themeStyles.border, backgroundColor: themeStyles.cardBg }]}>
            {(['overview', 'scatter', 'members', 'table'] as const).map((tab) => {
              const tabLabels = {
                overview: '📊 สรุปภาพรวม',
                scatter: '🎯 Price Distribution',
                members: '👥 สถานะสมาชิก',
                table: '📋 รายชื่อสินค้า',
              };
              return (
                <TouchableOpacity
                  key={tab}
                  style={[s.tabItem, activeTab === tab && s.tabItemActive]}
                  onPress={() => setActiveTab(tab)}
                >
                  <Text style={[s.tabItemText, activeTab === tab ? s.tabItemTextActive : { color: themeStyles.textSecondary }]}>
                    {tabLabels[tab]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* ─── VIEW 1: OVERVIEW — Cluster Cards ─── */}
        {!isLoading && activeTab === 'overview' && (
          <View style={s.section}>
            <Text style={[s.sectionTitle, { color: themeStyles.text }]}>
              ผลการจัดกลุ่มสินค้ารวมทั้งกลุ่ม (Group Cluster Characteristics)
            </Text>

            <View style={s.clusterCardsContainer}>
              {clusters.map((c) => (
                <View key={c.id} style={[s.clusterCard, { backgroundColor: themeStyles.cardBg, borderColor: c.color, borderTopWidth: 5 }]}>
                  <View style={s.clusterCardHeader}>
                    <View style={[s.clusterBadge, { backgroundColor: c.accentBg }]}>
                      <Text style={[s.clusterBadgeText, { color: c.color }]}>{c.badgeName}</Text>
                    </View>
                    <Text style={[s.clusterCount, { color: c.color }]}>{c.products.length} รายการ</Text>
                  </View>

                  <Text style={[s.clusterTitle, { color: themeStyles.text }]}>{c.title}</Text>

                  <View style={[s.clusterMetrics, { backgroundColor: themeStyles.highlight, borderColor: themeStyles.border }]}>
                    <View style={s.metricRow}>
                      <Text style={[s.metricLabel, { color: themeStyles.textSecondary }]}>ช่วงราคา:</Text>
                      <Text style={[s.metricVal, { color: themeStyles.text }]}>
                        {c.minPrice.toLocaleString()} - {c.maxPrice.toLocaleString()} ฿
                      </Text>
                    </View>
                    <View style={s.metricRow}>
                      <Text style={[s.metricLabel, { color: themeStyles.textSecondary }]}>ราคาเฉลี่ย:</Text>
                      <Text style={[s.metricVal, { color: c.color, fontWeight: '700' }]}>
                        {Math.round(c.avgPrice).toLocaleString()} ฿
                      </Text>
                    </View>
                  </View>

                  {/* Source Breakdown */}
                  <Text style={[s.sourceBreakHeader, { color: themeStyles.textSecondary }]}>แหล่งที่มา:</Text>
                  <View style={s.sourceChipsRow}>
                    {(() => {
                      const srcMap: Record<string, number> = {};
                      c.products.forEach((p) => { srcMap[p.source] = (srcMap[p.source] || 0) + 1; });
                      return Object.entries(srcMap).map(([src, cnt]) => (
                        <View key={src} style={[s.sourceChip, { backgroundColor: themeStyles.highlight, borderColor: themeStyles.border }]}>
                          <Text style={[s.sourceChipText, { color: themeStyles.text }]}>{src}: {cnt}</Text>
                        </View>
                      ));
                    })()}
                  </View>

                  {/* Sample items */}
                  <Text style={[s.sampleHeader, { color: themeStyles.textSecondary }]}>ตัวอย่างสินค้า:</Text>
                  <View style={s.sampleChips}>
                    {c.products.slice(0, 4).map((p, idx) => (
                      <View key={idx} style={[s.sampleChip, { backgroundColor: themeStyles.highlight, borderColor: themeStyles.border }]}>
                        <Text style={[s.sampleChipText, { color: themeStyles.text }]} numberOfLines={1}>{p.name}</Text>
                      </View>
                    ))}
                    {c.products.length > 4 && (
                      <Text style={[s.moreText, { color: themeStyles.textSecondary }]}>+{c.products.length - 4} อื่นๆ</Text>
                    )}
                  </View>
                </View>
              ))}
            </View>

            {/* Elbow Chart */}
            {inertias.length > 0 && (
              <View style={[s.elbowCard, { backgroundColor: themeStyles.cardBg, borderColor: themeStyles.border }]}>
                <Text style={[s.sectionTitle, { color: themeStyles.text }]}>กราฟ Elbow Method (ข้อมูลรวมทั้งกลุ่ม)</Text>
                <View style={[s.chartBox, { backgroundColor: themeStyles.highlight, borderColor: themeStyles.border }]}>
                  <View style={s.elbowBarsRow}>
                    {inertias.map((item) => {
                      const maxInertia = Math.max(...inertias.map((i) => i.inertia)) || 1;
                      const heightPercent = Math.max(8, (item.inertia / maxInertia) * 100);
                      const isElbow = item.k === 3;
                      return (
                        <View key={item.k} style={s.elbowBarCol}>
                          <Text style={[s.barValueText, { color: isElbow ? '#dc2626' : themeStyles.textSecondary, fontWeight: isElbow ? '700' : '500' }]}>
                            {item.inertia.toFixed(1)}
                          </Text>
                          <View style={s.barTrack}>
                            <View style={[s.barFill, { height: `${heightPercent}%`, backgroundColor: isElbow ? '#dc2626' : '#2563eb' }]} />
                          </View>
                          <View style={[s.kBadgeElbow, isElbow && s.kBadgeElbowActive]}>
                            <Text style={[s.kBadgeElbowText, isElbow && s.kBadgeElbowTextActive]}>k={item.k}</Text>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                </View>
              </View>
            )}
          </View>
        )}

        {/* ─── VIEW 2: SCATTER — Price Distribution ─── */}
        {!isLoading && activeTab === 'scatter' && (
          <View style={s.section}>
            <View style={[s.elbowCard, { backgroundColor: themeStyles.cardBg, borderColor: themeStyles.border }]}>
              {/* Header */}
              <View style={s.chartHeaderRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[s.sectionTitle, { color: themeStyles.text }]}>🎯 Price Distribution & K-Means Clusters</Text>
                  <Text style={[s.sectionSubtitle, { color: themeStyles.textSecondary, marginBottom: 8 }]}>
                    แสดงการกระจายตัวของราคาสินค้าจากสมาชิกทั้ง {GROUP_MEMBERS.length} คน พร้อมตำแหน่งจุดศูนย์กลาง (Centroid) ของแต่ละกลุ่ม
                  </Text>
                </View>
              </View>

              {/* Toolbar: Scale toggle & View Mode */}
              <View style={[s.chartToolbar, { backgroundColor: themeStyles.highlight, borderColor: themeStyles.border }]}>
                {/* Scale Switch */}
                <View style={s.toolbarGroup}>
                  <Text style={[s.toolbarLabel, { color: themeStyles.textSecondary }]}>สเกลแกนราคา:</Text>
                  <View style={s.toggleBtnGroup}>
                    <TouchableOpacity
                      style={[s.toggleBtn, chartScale === 'log' && s.toggleBtnActive]}
                      onPress={() => setChartScale('log')}
                    >
                      <Text style={[s.toggleBtnText, chartScale === 'log' && s.toggleBtnTextActive]}>
                        ✨ Log Scale (แนะนำ)
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[s.toggleBtn, chartScale === 'linear' && s.toggleBtnActive]}
                      onPress={() => setChartScale('linear')}
                    >
                      <Text style={[s.toggleBtnText, chartScale === 'linear' && s.toggleBtnTextActive]}>
                        📏 Linear Scale
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* View Mode */}
                <View style={s.toolbarGroup}>
                  <Text style={[s.toolbarLabel, { color: themeStyles.textSecondary }]}>มุมมอง:</Text>
                  <View style={s.toggleBtnGroup}>
                    <TouchableOpacity
                      style={[s.toggleBtn, chartViewMode === 'cluster' && s.toggleBtnActive]}
                      onPress={() => setChartViewMode('cluster')}
                    >
                      <Text style={[s.toggleBtnText, chartViewMode === 'cluster' && s.toggleBtnTextActive]}>
                        🎯 ตาม Cluster
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[s.toggleBtn, chartViewMode === 'member' && s.toggleBtnActive]}
                      onPress={() => setChartViewMode('member')}
                    >
                      <Text style={[s.toggleBtnText, chartViewMode === 'member' && s.toggleBtnTextActive]}>
                        👥 ตามสมาชิก
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[s.toggleBtn, chartViewMode === '2d' && s.toggleBtnActive]}
                      onPress={() => setChartViewMode('2d')}
                    >
                      <Text style={[s.toggleBtnText, chartViewMode === '2d' && s.toggleBtnTextActive]}>
                        📊 2D (ราคา x สต็อก)
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {/* Explanatory hint banner */}
              <View style={[s.chartHintBox, { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.12)' : 'rgba(59, 130, 246, 0.08)', borderColor: '#3b82f6' }]}>
                <Text style={[s.chartHintText, { color: isDark ? '#93c5fd' : '#1d4ed8' }]}>
                  {chartScale === 'log'
                    ? '💡 โหมด Log Scale: ขยายช่วงราคาตั้งแต่หลักร้อย (สินค้าเพื่อน) ถึง 10 ล้านบาท (รถยนต์) ทำให้มองเห็นจุดสินค้าทุกชิ้นชัดเจน ไม่เบียดซ้าย'
                    : 'ℹ️ โหมด Linear Scale: แสดงสเกลราคาเชิงเส้น 0 ถึง 10 ล้านบาทตามจริง'}
                </Text>
              </View>

              {/* Cluster Summary Pills (clickable to filter/highlight) */}
              <View style={s.clusterSummaryRow}>
                {clusters.map((c) => {
                  const isHighlighted = highlightClusterId === c.id;
                  return (
                    <TouchableOpacity
                      key={c.id}
                      onPress={() => setHighlightClusterId(isHighlighted ? 'all' : c.id)}
                      style={[
                        s.clusterSummaryPill,
                        {
                          borderColor: c.color,
                          backgroundColor: isHighlighted ? c.color : (isDark ? '#1a1a24' : '#ffffff'),
                        },
                      ]}
                    >
                      <View style={[s.clusterPillDot, { backgroundColor: isHighlighted ? '#ffffff' : c.color }]} />
                      <Text style={[s.clusterPillTitle, { color: isHighlighted ? '#ffffff' : themeStyles.text }]}>
                        {c.badgeName}:
                      </Text>
                      <Text style={[s.clusterPillCount, { color: isHighlighted ? '#ffffff' : c.color }]}>
                        {c.products.length} ชิ้น
                      </Text>
                      <Text style={[s.clusterPillRange, { color: isHighlighted ? '#f3f4f6' : themeStyles.textSecondary }]}>
                        ({c.minPrice >= 1e6 ? `${(c.minPrice/1e6).toFixed(1)}M` : `${c.minPrice.toLocaleString()}฿`} - {c.maxPrice >= 1e6 ? `${(c.maxPrice/1e6).toFixed(1)}M` : `${c.maxPrice.toLocaleString()}฿`})
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* ─── GRAPH CANVAS ─── */}
              {/* MODE 1: CLUSTER LANES */}
              {chartViewMode === 'cluster' && (
                <View style={[s.chartCanvas, { backgroundColor: isDark ? '#0b0f19' : '#f8fafc', borderColor: themeStyles.border }]}>
                  {chartTicks.map((tick) => (
                    <View
                      key={`grid-${tick.val}`}
                      style={[
                        s.chartGridLine,
                        { left: `${tick.pct}%`, borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' },
                      ]}
                    />
                  ))}

                  {clusters.map((c) => {
                    const isFaded = highlightClusterId !== 'all' && highlightClusterId !== c.id;
                    const centroidPct = getXPercent(c.avgPrice);
                    const minPct = getXPercent(c.minPrice);
                    const maxPct = getXPercent(c.maxPrice);

                    return (
                      <View key={c.id} style={[s.clusterLane, isFaded && { opacity: 0.25 }]}>
                        <View style={s.laneHeader}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <View style={[s.laneBadge, { backgroundColor: c.accentBg, borderColor: c.color }]}>
                              <Text style={[s.laneBadgeText, { color: c.color }]}>{c.badgeName}</Text>
                            </View>
                            <Text style={[s.laneCountText, { color: themeStyles.textSecondary }]}>
                              {c.products.length} รายการ
                            </Text>
                          </View>
                          <Text style={[s.laneRangeText, { color: themeStyles.textSecondary }]}>
                            ช่วง: {c.minPrice.toLocaleString()} - {c.maxPrice.toLocaleString()} ฿  (Centroid μ = {Math.round(c.avgPrice).toLocaleString()} ฿)
                          </Text>
                        </View>

                        <View style={[s.laneTrack, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }]}>
                          {/* Span range highlight */}
                          <View
                            style={[
                              s.clusterSpanBar,
                              {
                                left: `${minPct}%`,
                                width: `${Math.max(2, maxPct - minPct)}%`,
                                backgroundColor: c.color,
                                opacity: isDark ? 0.22 : 0.16,
                              },
                            ]}
                          />

                          {/* Centroid line */}
                          <View style={[s.centroidMarkerLine, { left: `${centroidPct}%`, borderLeftColor: c.color }]}>
                            <View style={[s.centroidTag, { backgroundColor: c.color }]}>
                              <Text style={s.centroidTagText}>μ</Text>
                            </View>
                          </View>

                          {/* Products */}
                          {c.products.map((p, pIdx) => {
                            const xPct = getXPercent(p.price);
                            const jitterY = (pIdx % 5 - 2) * 5;
                            const isSelected = selectedProduct?.name === p.name && selectedProduct?.price === p.price;

                            return (
                              <TouchableOpacity
                                key={`${c.id}-${pIdx}`}
                                activeOpacity={0.7}
                                onPress={() =>
                                  setSelectedProduct({
                                    ...p,
                                    clusterBadge: c.badgeName,
                                    clusterColor: c.color,
                                    clusterId: c.id,
                                  })
                                }
                                style={[
                                  s.scatterDotInteractive,
                                  {
                                    left: `${xPct}%`,
                                    top: 17 + jitterY,
                                    backgroundColor: c.color,
                                    borderColor: isSelected ? '#ffffff' : (isDark ? '#1f2937' : '#ffffff'),
                                    borderWidth: isSelected ? 3 : 2,
                                    transform: [{ scale: isSelected ? 1.5 : 1 }],
                                    zIndex: isSelected ? 50 : 10,
                                  },
                                ]}
                              />
                            );
                          })}
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}

              {/* MODE 2: MEMBER LANES */}
              {chartViewMode === 'member' && (
                <View style={[s.chartCanvas, { backgroundColor: isDark ? '#0b0f19' : '#f8fafc', borderColor: themeStyles.border }]}>
                  {chartTicks.map((tick) => (
                    <View
                      key={`grid-m-${tick.val}`}
                      style={[
                        s.chartGridLine,
                        { left: `${tick.pct}%`, borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' },
                      ]}
                    />
                  ))}

                  {GROUP_MEMBERS.map((m) => {
                    const mProducts = allProducts.filter((p) => p.source === m.name);
                    return (
                      <View key={m.name} style={s.clusterLane}>
                        <View style={s.laneHeader}>
                          <Text style={[s.laneMemberName, { color: themeStyles.text }]}>
                            👤 {m.name} {m.name === 'BM' ? '(เจ้าของโปรเจกต์)' : ''}
                          </Text>
                          <Text style={[s.laneCountText, { color: themeStyles.textSecondary }]}>
                            {mProducts.length} รายการ
                          </Text>
                        </View>

                        <View style={[s.laneTrack, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }]}>
                          {mProducts.map((p, pIdx) => {
                            const xPct = getXPercent(p.price);
                            const cluster = clusters.find((c) => c.products.some((cp) => cp.name === p.name && cp.price === p.price)) || clusters[0];
                            const jitterY = (pIdx % 5 - 2) * 5;
                            const isSelected = selectedProduct?.name === p.name && selectedProduct?.price === p.price;

                            return (
                              <TouchableOpacity
                                key={`${m.name}-${pIdx}`}
                                activeOpacity={0.7}
                                onPress={() =>
                                  setSelectedProduct({
                                    ...p,
                                    clusterBadge: cluster?.badgeName || '',
                                    clusterColor: cluster?.color || '#3b82f6',
                                    clusterId: cluster?.id ?? 0,
                                  })
                                }
                                style={[
                                  s.scatterDotInteractive,
                                  {
                                    left: `${xPct}%`,
                                    top: 17 + jitterY,
                                    backgroundColor: cluster?.color || '#3b82f6',
                                    borderColor: isSelected ? '#ffffff' : (isDark ? '#1f2937' : '#ffffff'),
                                    borderWidth: isSelected ? 3 : 2,
                                    transform: [{ scale: isSelected ? 1.5 : 1 }],
                                    zIndex: isSelected ? 50 : 10,
                                  },
                                ]}
                              />
                            );
                          })}
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}

              {/* MODE 3: 2D PRICE VS STOCK */}
              {chartViewMode === '2d' && (
                <View style={[s.chartCanvas2D, { backgroundColor: isDark ? '#0b0f19' : '#f8fafc', borderColor: themeStyles.border }]}>
                  {chartTicks.map((tick) => (
                    <View
                      key={`grid-2d-${tick.val}`}
                      style={[
                        s.chartGridLine,
                        { left: `${tick.pct}%`, borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' },
                      ]}
                    />
                  ))}
                  {[0, 25, 50, 75, 100].map((st) => (
                    <View
                      key={`grid-st-${st}`}
                      style={[
                        s.chartHorizontalGridLine,
                        { bottom: `${st}%`, borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' },
                      ]}
                    />
                  ))}

                  {clusters.map((c) => {
                    const maxStock = Math.max(...allProducts.map((p) => p.stock), 10);
                    return c.products.map((p, pIdx) => {
                      const xPct = getXPercent(p.price);
                      const yPct = Math.min(94, Math.max(6, (p.stock / maxStock) * 88 + 6));
                      const isSelected = selectedProduct?.name === p.name && selectedProduct?.price === p.price;

                      return (
                        <TouchableOpacity
                          key={`2d-${c.id}-${pIdx}`}
                          activeOpacity={0.7}
                          onPress={() =>
                            setSelectedProduct({
                              ...p,
                              clusterBadge: c.badgeName,
                              clusterColor: c.color,
                              clusterId: c.id,
                            })
                          }
                          style={[
                            s.scatterDotInteractive,
                            {
                              left: `${xPct}%`,
                              bottom: `${yPct}%`,
                              backgroundColor: c.color,
                              borderColor: isSelected ? '#ffffff' : (isDark ? '#1f2937' : '#ffffff'),
                              borderWidth: isSelected ? 3 : 2,
                              transform: [{ scale: isSelected ? 1.6 : 1 }],
                              zIndex: isSelected ? 50 : 10,
                            },
                          ]}
                        />
                      );
                    });
                  })}
                  <Text style={[s.yAxisTitle, { color: themeStyles.textSecondary }]}>⬆ จำนวนสต็อก (Stock)</Text>
                </View>
              )}

              {/* X-Axis Ticks */}
              <View style={s.xAxisTicksContainer}>
                {chartTicks.map((tick) => (
                  <View key={`tick-${tick.val}`} style={[s.tickMarkerWrap, { left: `${tick.pct}%` }]}>
                    <View style={[s.tickMarkerPipe, { backgroundColor: themeStyles.border }]} />
                    <Text style={[s.xTickText, { color: themeStyles.textSecondary }]}>{tick.label}</Text>
                  </View>
                ))}
              </View>
              <Text style={[s.xAxisTitle, { color: themeStyles.textSecondary }]}>
                {chartScale === 'log' ? 'ราคา (บาท, สเกล Logarithmic log₁₀) ➔' : 'ราคา (บาท, สเกล Linear) ➔'}
              </Text>

              {/* Selected Product Inspector */}
              {selectedProduct ? (
                <View style={[s.inspectorCard, { backgroundColor: themeStyles.highlight, borderColor: selectedProduct.clusterColor }]}>
                  <View style={s.inspectorHeader}>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <View style={[s.clusterBadge, { backgroundColor: `${selectedProduct.clusterColor}26`, borderColor: selectedProduct.clusterColor, borderWidth: 1 }]}>
                          <Text style={[s.clusterBadgeText, { color: selectedProduct.clusterColor }]}>{selectedProduct.clusterBadge}</Text>
                        </View>
                        <Text style={[s.inspectorSource, { color: themeStyles.textSecondary }]}>
                          👤 ผู้ขาย: <Text style={{ color: themeStyles.text, fontWeight: '700' }}>{selectedProduct.source}</Text>
                        </Text>
                      </View>
                      <Text style={[s.inspectorTitle, { color: themeStyles.text }]}>{selectedProduct.name}</Text>
                    </View>
                    <TouchableOpacity onPress={() => setSelectedProduct(null)} style={s.inspectorCloseBtn}>
                      <Text style={{ color: themeStyles.textSecondary, fontSize: 18, fontWeight: '700' }}>✕</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={s.inspectorDetailsRow}>
                    <View style={s.inspectorDetailItem}>
                      <Text style={[s.inspectorDetailLabel, { color: themeStyles.textSecondary }]}>ราคาขาย</Text>
                      <Text style={[s.inspectorDetailVal, { color: selectedProduct.clusterColor, fontWeight: '800' }]}>
                        ฿{selectedProduct.price.toLocaleString()}
                      </Text>
                    </View>
                    <View style={s.inspectorDetailItem}>
                      <Text style={[s.inspectorDetailLabel, { color: themeStyles.textSecondary }]}>จำนวนในสต็อก</Text>
                      <Text style={[s.inspectorDetailVal, { color: themeStyles.text }]}>
                        {selectedProduct.stock} ชิ้น / คัน
                      </Text>
                    </View>
                    <View style={s.inspectorDetailItem}>
                      <Text style={[s.inspectorDetailLabel, { color: themeStyles.textSecondary }]}>ค่าเฉลี่ยของกลุ่ม (μ)</Text>
                      <Text style={[s.inspectorDetailVal, { color: themeStyles.text }]}>
                        ฿{Math.round(clusters[selectedProduct.clusterId]?.avgPrice || 0).toLocaleString()}
                      </Text>
                    </View>
                  </View>
                </View>
              ) : (
                <View style={[s.clickHintBanner, { borderColor: themeStyles.border }]}>
                  <Text style={[s.clickHintText, { color: themeStyles.textSecondary }]}>
                    👆 คลิกที่จุดสินค้าบนกราฟเพื่อดูรายละเอียด ชื่อสินค้า, ราคา, สต็อก และผู้ขาย
                  </Text>
                </View>
              )}

              {/* Stacked Source Bar */}
              <Text style={[s.sectionTitle, { color: themeStyles.text, marginTop: 24 }]}>สัดส่วนสินค้าจากแต่ละสมาชิก</Text>
              <View style={s.stackedBarContainer}>
                {clusters.map((c) => (
                  <View key={c.id} style={s.stackedBarRow}>
                    <Text style={[s.stackedBarLabel, { color: c.color }]}>{c.badgeName}</Text>
                    <View style={[s.stackedBarTrack, { borderColor: themeStyles.border }]}>
                      {(() => {
                        const srcMap: Record<string, number> = {};
                        c.products.forEach((p) => { srcMap[p.source] = (srcMap[p.source] || 0) + 1; });
                        const total = c.products.length || 1;
                        const barColors = ['#60a5fa', '#34d399', '#fbbf24', '#f87171', '#a78bfa'];
                        return Object.entries(srcMap).map(([src, cnt], i) => (
                          <View
                            key={src}
                            style={[s.stackedBarSegment, { width: `${(cnt / total) * 100}%`, backgroundColor: barColors[i % barColors.length] }]}
                          >
                            {cnt / total > 0.15 && (
                              <Text style={s.stackedBarSegText} numberOfLines={1}>{cnt}</Text>
                            )}
                          </View>
                        ));
                      })()}
                    </View>
                    <Text style={[s.stackedBarTotal, { color: themeStyles.textSecondary }]}>{c.products.length}</Text>
                  </View>
                ))}
                {/* Color Legend */}
                <View style={s.barLegendRow}>
                  {sourceSummary.map((item, i) => {
                    const barColors = ['#60a5fa', '#34d399', '#fbbf24', '#f87171', '#a78bfa'];
                    return (
                      <View key={item.source} style={s.barLegendItem}>
                        <View style={[s.barLegendDot, { backgroundColor: barColors[i % barColors.length] }]} />
                        <Text style={[s.barLegendText, { color: themeStyles.text }]}>{item.source} ({item.count})</Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            </View>
          </View>
        )}

        {/* ─── VIEW 3: MEMBERS — Status ─── */}
        {!isLoading && activeTab === 'members' && (
          <View style={s.section}>
            <Text style={[s.sectionTitle, { color: themeStyles.text }]}>สถานะการเชื่อมต่อ API ของสมาชิก</Text>
            <View style={{ gap: 12 }}>
              {memberStatuses.map((m, i) => (
                <View key={i} style={[s.memberCard, { backgroundColor: themeStyles.cardBg, borderColor: m.status === 'success' ? '#10b981' : m.status === 'error' ? '#ef4444' : themeStyles.border }]}>
                  <View style={s.memberCardHeader}>
                    <Text style={{ fontSize: 24 }}>
                      {m.status === 'success' ? '✅' : m.status === 'error' ? '❌' : '⏳'}
                    </Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.memberName, { color: themeStyles.text }]}>{m.name}</Text>
                      <Text style={[s.memberUrl, { color: themeStyles.textSecondary }]}>{GROUP_MEMBERS[i].api_url}</Text>
                    </View>
                  </View>
                  <View style={s.memberMeta}>
                    {m.status === 'success' && (
                      <View style={s.memberSuccessPill}>
                        <Text style={s.memberSuccessText}>✓ {m.count} สินค้า</Text>
                      </View>
                    )}
                    {m.status === 'error' && (
                      <View style={s.memberErrorPill}>
                        <Text style={s.memberErrorText}>✗ {m.error}</Text>
                      </View>
                    )}
                  </View>

                  {/* Source contribution in this member */}
                  {m.status === 'success' && (
                    <View style={[s.memberContrib, { borderColor: themeStyles.border }]}>
                      <Text style={[s.memberContribTitle, { color: themeStyles.textSecondary }]}>การกระจายใน Cluster:</Text>
                      <View style={s.memberContribChips}>
                        {clusters.map((c) => {
                          const count = c.products.filter((p) => p.source === m.name).length;
                          return count > 0 ? (
                            <View key={c.id} style={[s.memberContribChip, { borderColor: c.color, backgroundColor: c.accentBg }]}>
                              <Text style={[s.memberContribChipText, { color: c.color }]}>{c.badgeName}: {count}</Text>
                            </View>
                          ) : null;
                        })}
                      </View>
                    </View>
                  )}
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ─── VIEW 4: TABLE — Product List ─── */}
        {!isLoading && activeTab === 'table' && (
          <View style={s.section}>
            {/* Filters */}
            <View style={[s.filterCard, { backgroundColor: themeStyles.cardBg, borderColor: themeStyles.border }]}>
              <TextInput
                style={[s.searchInput, { backgroundColor: themeStyles.highlight, color: themeStyles.text, borderColor: themeStyles.border }]}
                placeholder="🔍 ค้นหาสินค้า หรือชื่อสมาชิก..."
                placeholderTextColor={themeStyles.textSecondary}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              <View style={s.filterPillsRow}>
                <TouchableOpacity
                  style={[s.filterPill, selectedClusterFilter === 'all' && s.filterPillActive]}
                  onPress={() => setSelectedClusterFilter('all')}
                >
                  <Text style={[s.filterPillText, selectedClusterFilter === 'all' && s.filterPillTextActive]}>
                    ทั้งหมด ({allProducts.length})
                  </Text>
                </TouchableOpacity>
                {clusters.map((c) => (
                  <TouchableOpacity
                    key={c.id}
                    style={[s.filterPill, selectedClusterFilter === c.id && { backgroundColor: c.color, borderColor: c.color }]}
                    onPress={() => setSelectedClusterFilter(c.id)}
                  >
                    <Text style={[s.filterPillText, selectedClusterFilter === c.id && { color: '#fff', fontWeight: '700' }]}>
                      {c.badgeName} ({c.products.length})
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Table */}
            <View style={[s.tableCard, { backgroundColor: themeStyles.cardBg, borderColor: themeStyles.border }]}>
              <View style={[s.tableHeader, { backgroundColor: themeStyles.highlight, borderColor: themeStyles.border }]}>
                <Text style={[s.thCol, { flex: 2, color: themeStyles.textSecondary }]}>สินค้า</Text>
                <Text style={[s.thCol, { flex: 1.2, color: themeStyles.textSecondary }]}>ราคา</Text>
                <Text style={[s.thCol, { flex: 1, color: themeStyles.textSecondary }]}>จาก</Text>
                <Text style={[s.thCol, { flex: 0.8, color: themeStyles.textSecondary }]}>กลุ่ม</Text>
              </View>

              {displayedProducts.map((item, idx) => (
                <View
                  key={`${item.id}-${idx}`}
                  style={[s.tableRow, { borderColor: themeStyles.border }, idx % 2 === 1 && { backgroundColor: themeStyles.highlight }]}
                >
                  <View style={[s.tdCol, { flex: 2 }]}>
                    <Text style={[s.tdName, { color: themeStyles.text }]} numberOfLines={1}>{item.name}</Text>
                  </View>
                  <View style={[s.tdCol, { flex: 1.2 }]}>
                    <Text style={[s.tdPrice, { color: themeStyles.text }]}>{item.price.toLocaleString()} ฿</Text>
                  </View>
                  <View style={[s.tdCol, { flex: 1 }]}>
                    <Text style={[s.tdSource, { color: themeStyles.textSecondary }]} numberOfLines={1}>{item.source}</Text>
                  </View>
                  <View style={[s.tdCol, { flex: 0.8 }]}>
                    <View style={[s.rowBadge, { backgroundColor: `${item.clusterColor}22`, borderColor: item.clusterColor }]}>
                      <Text style={[s.rowBadgeText, { color: item.clusterColor }]}>{item.clusterBadge}</Text>
                    </View>
                  </View>
                </View>
              ))}

              {displayedProducts.length === 0 && (
                <View style={s.emptyTable}>
                  <Text style={[s.emptyText, { color: themeStyles.textSecondary }]}>ไม่พบข้อมูลสินค้าในเงื่อนไขนี้</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* ─── Architecture Reference ─── */}
        <View style={[s.archCard, { backgroundColor: themeStyles.cardBg, borderColor: themeStyles.border }]}>
          <Text style={[s.archTitle, { color: themeStyles.text }]}>🛠️ ระบบ Group Aggregator</Text>
          <Text style={[s.archDesc, { color: themeStyles.textSecondary }]}>
            หน้านี้ดึงข้อมูลแบบ Real-time จาก API ของสมาชิกทั้ง {GROUP_MEMBERS.length} คน พร้อมทำ K-Means Clustering ในเบราว์เซอร์
          </Text>
          <View style={s.codeBox}>
            <Text style={s.codeText}>
              • เบราว์เซอร์ดึง API ของสมาชิกทุกคนผ่าน fetch(){'\n'}
              • สคริปต์ Python เสริม: python group-aggregator/aggregator.py{'\n'}
              • ผลลัพธ์ CSV: group-aggregator/group_clustered.csv
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40, maxWidth: 1200, width: '100%', alignSelf: 'center' },

  // Guard
  guardContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30 },
  guardEmoji: { fontSize: 54, marginBottom: 16 },
  guardTitle: { fontSize: 22, fontWeight: '700', marginBottom: 8 },
  guardSub: { fontSize: 14, textAlign: 'center', lineHeight: 22, maxWidth: 400, marginBottom: 24 },
  guardBtn: { backgroundColor: '#2563eb', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10 },
  guardBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },

  // Hero
  heroCard: { padding: 20, borderRadius: 16, borderWidth: 1, marginBottom: 20 },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 },
  pillRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  groupPill: { backgroundColor: 'rgba(139, 92, 246, 0.15)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  groupPillText: { color: '#8b5cf6', fontSize: 12, fontWeight: '600' },
  aiPill: { backgroundColor: 'rgba(37, 99, 235, 0.15)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  aiPillText: { color: '#2563eb', fontSize: 12, fontWeight: '600' },
  adminPill: { backgroundColor: 'rgba(245, 158, 11, 0.15)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  adminPillText: { color: '#f59e0b', fontSize: 12, fontWeight: '600' },
  refreshBtn: { backgroundColor: 'rgba(107,114,128,0.12)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  refreshBtnText: { fontSize: 13, fontWeight: '500', color: '#2563eb' },
  heroTitle: { fontSize: 24, fontWeight: '800', marginBottom: 6 },
  heroSubtitle: { fontSize: 14, lineHeight: 22, marginBottom: 18 },

  // Stats
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 18, flexWrap: 'wrap' },
  statBox: { flex: 1, minWidth: 120, padding: 14, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
  statNum: { fontSize: 22, fontWeight: '800', marginBottom: 4 },
  statLabel: { fontSize: 11, textAlign: 'center' },

  // K Selector
  kSelectorContainer: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(150,150,150,0.15)' },
  kLabel: { fontSize: 14, fontWeight: '600' },
  kBtnsRow: { flexDirection: 'row', gap: 8 },
  kBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  kBtnActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  kBtnText: { fontSize: 13, fontWeight: '600' },
  kBtnTextActive: { color: '#ffffff' },

  // Loading
  loadingCard: { padding: 24, borderRadius: 16, borderWidth: 1, marginBottom: 20, alignItems: 'center' },
  loadingText: { fontSize: 15, fontWeight: '600', marginTop: 12 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusName: { fontSize: 14, fontWeight: '600', flex: 1 },
  statusCount: { fontSize: 13 },

  // Tab Bar
  tabBar: { flexDirection: 'row', borderRadius: 12, borderWidth: 1, padding: 4, marginBottom: 20, flexWrap: 'wrap', gap: 4 },
  tabItem: { flex: 1, minWidth: 130, paddingVertical: 10, paddingHorizontal: 12, alignItems: 'center', borderRadius: 8 },
  tabItemActive: { backgroundColor: '#8b5cf6' },
  tabItemText: { fontSize: 13, fontWeight: '600' },
  tabItemTextActive: { color: '#ffffff' },

  // Sections
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
  sectionSubtitle: { fontSize: 13, marginBottom: 16 },

  // Cluster Cards
  clusterCardsContainer: { gap: 16, marginBottom: 20 },
  clusterCard: { padding: 18, borderRadius: 14, borderWidth: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  clusterCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  clusterBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  clusterBadgeText: { fontSize: 12, fontWeight: '700' },
  clusterCount: { fontSize: 14, fontWeight: '700' },
  clusterTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
  clusterMetrics: { padding: 12, borderRadius: 10, borderWidth: 1, marginBottom: 12, gap: 6 },
  metricRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  metricLabel: { fontSize: 13 },
  metricVal: { fontSize: 13 },
  sourceBreakHeader: { fontSize: 12, fontWeight: '600', marginBottom: 6 },
  sourceChipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  sourceChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  sourceChipText: { fontSize: 11, fontWeight: '600' },
  sampleHeader: { fontSize: 12, fontWeight: '600', marginBottom: 6 },
  sampleChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  sampleChip: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1 },
  sampleChipText: { fontSize: 11, maxWidth: 200 },
  moreText: { fontSize: 11, alignSelf: 'center', marginLeft: 4 },

  // Elbow
  elbowCard: { padding: 18, borderRadius: 14, borderWidth: 1, marginBottom: 20 },
  chartBox: { padding: 16, borderRadius: 12, borderWidth: 1, marginTop: 12 },
  elbowBarsRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end', height: 180, paddingBottom: 8 },
  elbowBarCol: { alignItems: 'center', flex: 1 },
  barValueText: { fontSize: 10, marginBottom: 4 },
  barTrack: { width: 28, height: 140, backgroundColor: 'rgba(150,150,150,0.08)', borderRadius: 6, justifyContent: 'flex-end', overflow: 'hidden' },
  barFill: { width: '100%', borderRadius: 6 },
  kBadgeElbow: { marginTop: 6, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, backgroundColor: 'rgba(150,150,150,0.1)' },
  kBadgeElbowActive: { backgroundColor: '#dc2626' },
  kBadgeElbowText: { fontSize: 11, fontWeight: '600', color: '#9ca3af' },
  kBadgeElbowTextActive: { color: '#ffffff' },

  // Chart Header & Toolbar
  chartHeaderRow: { marginBottom: 14 },
  chartToolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
    flexWrap: 'wrap',
    gap: 12,
  },
  toolbarGroup: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  toolbarLabel: { fontSize: 13, fontWeight: '600' },
  toggleBtnGroup: { flexDirection: 'row', borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: '#3b82f6' },
  toggleBtn: { paddingVertical: 6, paddingHorizontal: 12, backgroundColor: 'transparent' },
  toggleBtnActive: { backgroundColor: '#3b82f6' },
  toggleBtnText: { fontSize: 12, fontWeight: '600', color: '#3b82f6' },
  toggleBtnTextActive: { color: '#ffffff' },

  chartHintBox: { padding: 10, borderRadius: 8, borderWidth: 1, marginBottom: 14 },
  chartHintText: { fontSize: 12, lineHeight: 18 },

  clusterSummaryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  clusterSummaryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1.5,
  },
  clusterPillDot: { width: 8, height: 8, borderRadius: 4 },
  clusterPillTitle: { fontSize: 12, fontWeight: '700' },
  clusterPillCount: { fontSize: 12, fontWeight: '700' },
  clusterPillRange: { fontSize: 11 },

  // Canvas
  chartCanvas: {
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 6,
    position: 'relative',
    overflow: 'hidden',
    marginBottom: 4,
  },
  chartCanvas2D: {
    height: 320,
    borderRadius: 14,
    borderWidth: 1,
    position: 'relative',
    overflow: 'hidden',
    marginBottom: 4,
  },
  chartGridLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    borderLeftWidth: 1,
    borderStyle: 'dashed',
    zIndex: 1,
  },
  chartHorizontalGridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    borderTopWidth: 1,
    borderStyle: 'dashed',
    zIndex: 1,
  },
  yAxisTitle: {
    position: 'absolute',
    top: 10,
    left: 10,
    fontSize: 11,
    fontWeight: '700',
    zIndex: 10,
  },

  // Lanes
  clusterLane: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150,150,150,0.1)',
  },
  laneHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
    zIndex: 5,
  },
  laneBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, borderWidth: 1 },
  laneBadgeText: { fontSize: 11, fontWeight: '700' },
  laneCountText: { fontSize: 11 },
  laneMemberName: { fontSize: 13, fontWeight: '700' },
  laneRangeText: { fontSize: 11 },
  laneTrack: {
    height: 48,
    borderRadius: 8,
    position: 'relative',
    justifyContent: 'center',
  },
  clusterSpanBar: {
    position: 'absolute',
    top: 6,
    bottom: 6,
    borderRadius: 6,
    zIndex: 2,
  },
  centroidMarkerLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 2,
    borderLeftWidth: 2,
    borderStyle: 'solid',
    zIndex: 8,
    alignItems: 'center',
  },
  centroidTag: {
    position: 'absolute',
    top: -6,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centroidTagText: { color: '#fff', fontSize: 10, fontWeight: '800' },

  scatterDotInteractive: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    marginLeft: -7,
  },

  // X-Axis
  xAxisTicksContainer: {
    height: 28,
    position: 'relative',
    marginTop: 4,
    marginBottom: 2,
  },
  tickMarkerWrap: {
    position: 'absolute',
    alignItems: 'center',
    transform: [{ translateX: -20 }],
    width: 40,
  },
  tickMarkerPipe: { width: 1, height: 5, marginBottom: 2 },
  xTickText: { fontSize: 11, fontWeight: '600', textAlign: 'center' },
  xAxisTitle: { textAlign: 'center', fontSize: 12, fontWeight: '600', marginTop: 2, marginBottom: 14 },

  // Inspector
  inspectorCard: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 2,
    marginTop: 8,
    marginBottom: 16,
  },
  inspectorHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  inspectorTitle: { fontSize: 16, fontWeight: '800' },
  inspectorSource: { fontSize: 12 },
  inspectorCloseBtn: { padding: 4, borderRadius: 6 },
  inspectorDetailsRow: { flexDirection: 'row', gap: 16, flexWrap: 'wrap' },
  inspectorDetailItem: { minWidth: 100 },
  inspectorDetailLabel: { fontSize: 11, marginBottom: 2 },
  inspectorDetailVal: { fontSize: 14, fontWeight: '700' },
  clickHintBanner: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 16,
  },
  clickHintText: { fontSize: 12 },

  // Stacked Bar
  stackedBarContainer: { marginTop: 12, gap: 10 },
  stackedBarRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stackedBarLabel: { width: 70, fontSize: 12, fontWeight: '700', textAlign: 'right' },
  stackedBarTrack: { flex: 1, height: 28, borderRadius: 6, borderWidth: 1, flexDirection: 'row', overflow: 'hidden' },
  stackedBarSegment: { justifyContent: 'center', alignItems: 'center' },
  stackedBarSegText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  stackedBarTotal: { width: 30, fontSize: 12, fontWeight: '600' },
  barLegendRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 8 },
  barLegendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  barLegendDot: { width: 10, height: 10, borderRadius: 5 },
  barLegendText: { fontSize: 11 },

  // Members
  memberCard: { padding: 16, borderRadius: 14, borderWidth: 2 },
  memberCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  memberName: { fontSize: 16, fontWeight: '700' },
  memberUrl: { fontSize: 11, marginTop: 2 },
  memberMeta: { flexDirection: 'row', gap: 8 },
  memberSuccessPill: { backgroundColor: 'rgba(16,185,129,0.15)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  memberSuccessText: { color: '#10b981', fontSize: 13, fontWeight: '600' },
  memberErrorPill: { backgroundColor: 'rgba(239,68,68,0.12)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, flexShrink: 1 },
  memberErrorText: { color: '#ef4444', fontSize: 12 },
  memberContrib: { marginTop: 10, paddingTop: 10, borderTopWidth: 1 },
  memberContribTitle: { fontSize: 12, fontWeight: '600', marginBottom: 6 },
  memberContribChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  memberContribChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  memberContribChipText: { fontSize: 11, fontWeight: '600' },

  // Table
  filterCard: { padding: 16, borderRadius: 14, borderWidth: 1, marginBottom: 16 },
  searchInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, marginBottom: 12 },
  filterPillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  filterPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#9ca3af' },
  filterPillActive: { backgroundColor: '#8b5cf6', borderColor: '#8b5cf6' },
  filterPillText: { fontSize: 12, fontWeight: '600', color: '#9ca3af' },
  filterPillTextActive: { color: '#fff' },
  tableCard: { borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  tableHeader: { flexDirection: 'row', padding: 12, borderBottomWidth: 1 },
  thCol: { fontSize: 12, fontWeight: '700' },
  tableRow: { flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 0.5 },
  tdCol: { justifyContent: 'center' },
  tdName: { fontSize: 13, fontWeight: '600' },
  tdPrice: { fontSize: 13 },
  tdSource: { fontSize: 11 },
  rowBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1, alignSelf: 'flex-start' },
  rowBadgeText: { fontSize: 11, fontWeight: '700' },
  emptyTable: { padding: 24, alignItems: 'center' },
  emptyText: { fontSize: 14 },

  // Architecture
  archCard: { padding: 18, borderRadius: 14, borderWidth: 1, marginBottom: 20 },
  archTitle: { fontSize: 16, fontWeight: '700', marginBottom: 6 },
  archDesc: { fontSize: 13, lineHeight: 20, marginBottom: 10 },
  codeBox: { backgroundColor: 'rgba(37,99,235,0.06)', padding: 12, borderRadius: 8 },
  codeText: { fontSize: 12, fontFamily: Platform.OS === 'web' ? 'monospace' : undefined, color: '#2563eb', lineHeight: 20 },
});
