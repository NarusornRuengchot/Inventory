import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { Order } from '@/context/InventoryContext';
import { customAlert } from '@/utils/alert';

const API_BASE_URL = 'http://119.59.102.161:3024/api';

export default function OrdersScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const router = useRouter();
  const { token, user, isAdmin, isLoading: authLoading } = useAuth();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // State for rejection modal
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [adminNote, setAdminNote] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Filter
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
    }
  }, [authLoading, user]);

  // Fetch orders from API
  const fetchOrders = useCallback(async () => {
    if (!token) return;
    try {
      const resp = await fetch(`${API_BASE_URL}/orders`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!resp.ok) {
        const errJson = await resp.json().catch(() => ({}));
        throw new Error(errJson.error || `HTTP error ${resp.status}`);
      }
      const data = await resp.json();
      setOrders(data);
    } catch (e: any) {
      console.error('Fetch orders error:', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrders();
  };

  // Approve order
  const handleApprove = async (order: Order) => {
    customAlert(
      'Confirm Approval',
      `Approve purchase order for ${order.model_year} ${order.brand} ${order.model} by ${order.buyer_name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: async () => {
            setActionLoading(true);
            try {
              const resp = await fetch(`${API_BASE_URL}/orders/${order.id}`, {
                method: 'PATCH',
                headers: {
                  Authorization: `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ status: 'approved' }),
              });
              const data = await resp.json();
              if (!resp.ok) throw new Error(data.error);
              customAlert('Success', 'Order approved successfully. Car status changed to Sold.');
              fetchOrders();
            } catch (e: any) {
              customAlert('Error', e.message);
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  // Open rejection modal
  const handleOpenRejectModal = (order: Order) => {
    setSelectedOrder(order);
    setAdminNote('');
    setRejectModalVisible(true);
  };

  // Confirm rejection
  const handleReject = async () => {
    if (!selectedOrder) return;
    setActionLoading(true);
    try {
      const resp = await fetch(`${API_BASE_URL}/orders/${selectedOrder.id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'rejected', admin_note: adminNote.trim() || null }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error);
      setRejectModalVisible(false);
      customAlert('Success', 'Order rejected. Car status returned to Available.');
      fetchOrders();
    } catch (e: any) {
      customAlert('Error', e.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Filter orders
  const filteredOrders = filterStatus === 'all'
    ? orders
    : orders.filter((o) => o.status === filterStatus);

  const pendingCount = orders.filter((o) => o.status === 'pending').length;

  const getStatusColor = (status: Order['status']) => {
    switch (status) {
      case 'pending':  return { bg: '#FEF3C7', text: '#D97706' };
      case 'approved': return { bg: '#D1FAE5', text: '#059669' };
      case 'rejected': return { bg: '#FEE2E2', text: '#DC2626' };
    }
  };

  const statusLabel = (status: Order['status']) => {
    switch (status) {
      case 'pending':  return '⏳ Pending';
      case 'approved': return '✅ Approved';
      case 'rejected': return '❌ Rejected';
    }
  };

  if (authLoading || (!user && !authLoading)) {
    return (
      <View style={[styles.center, { backgroundColor: isDark ? '#0F1117' : '#F5F5F5' }]}>
        <ActivityIndicator size="large" color="#8B5CF6" />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#0F1117' : '#F5F5F5' }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: isDark ? '#1A1D27' : '#FFFFFF', borderBottomColor: isDark ? '#2A2D3A' : '#EEEEEE' }]}>
        <View>
          <Text style={[styles.headerTitle, { color: isDark ? '#FFFFFF' : '#111827' }]}>
            {isAdmin ? '📋 Order Management' : '📦 My Orders'}
          </Text>
          <Text style={[styles.headerSub, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
            {isAdmin
              ? (pendingCount > 0 ? `${pendingCount} order${pendingCount > 1 ? 's' : ''} awaiting approval` : 'No pending orders')
              : 'Track your car purchase order status'}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.refreshBtn}
          onPress={onRefresh}
        >
          <Text style={{ fontSize: 20 }}>🔄</Text>
        </TouchableOpacity>
      </View>

      {/* Filter tabs */}
      <View style={[styles.filterRow, { backgroundColor: isDark ? '#1A1D27' : '#FFFFFF', borderBottomColor: isDark ? '#2A2D3A' : '#EEEEEE' }]}>
        {(['all', 'pending', 'approved', 'rejected'] as const).map((s) => (
          <TouchableOpacity
            key={s}
            style={[styles.filterTab, filterStatus === s && styles.filterTabActive]}
            onPress={() => setFilterStatus(s)}
          >
            <Text style={[
              styles.filterTabText,
              { color: filterStatus === s ? '#8B5CF6' : (isDark ? '#9CA3AF' : '#6B7280') }
            ]}>
              {s === 'all'
                ? 'All'
                : s === 'pending'
                ? `⏳ Pending ${isAdmin ? `(${pendingCount})` : ''}`
                : s === 'approved'
                ? '✅ Approved'
                : '❌ Rejected'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Orders List */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#8B5CF6" />
          <Text style={{ color: isDark ? '#9CA3AF' : '#6B7280', marginTop: 12 }}>Loading orders...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#8B5CF6" />}
        >
          {filteredOrders.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={{ fontSize: 48 }}>📭</Text>
              <Text style={[styles.emptyText, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
                {isAdmin ? 'No orders found' : 'You have no orders yet'}
              </Text>
            </View>
          ) : (
            filteredOrders.map((order) => {
              const statusColors = getStatusColor(order.status);
              return (
                <View
                  key={order.id}
                  style={[styles.orderCard, {
                    backgroundColor: isDark ? '#1A1D27' : '#FFFFFF',
                    borderColor: isDark ? '#2A2D3A' : '#E5E7EB',
                    borderLeftColor: order.status === 'pending' ? '#F59E0B' : order.status === 'approved' ? '#10B981' : '#EF4444',
                  }]}
                >
                  {/* Card Header */}
                  <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.cardCarName, { color: isDark ? '#FFFFFF' : '#111827' }]}>
                        {order.model_year} {order.brand} {order.model}
                      </Text>
                      <Text style={[styles.cardPrice, { color: '#8B5CF6' }]}>
                        ฿{Number(order.selling_price).toLocaleString('th-TH')}
                      </Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: statusColors.bg }]}>
                      <Text style={[styles.statusBadgeText, { color: statusColors.text }]}>
                        {statusLabel(order.status)}
                      </Text>
                    </View>
                  </View>

                  {/* Buyer Info */}
                  <View style={[styles.divider, { borderColor: isDark ? '#2A2D3A' : '#F3F4F6' }]} />
                  <View style={styles.buyerSection}>
                    <Text style={[styles.sectionLabel, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
                      {isAdmin ? 'BUYER INFORMATION' : 'ORDER DETAILS'}
                    </Text>
                    <View style={styles.infoRow}>
                      <Text style={[styles.infoLabel, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>👤 Name</Text>
                      <Text style={[styles.infoValue, { color: isDark ? '#FFFFFF' : '#111827' }]}>{order.buyer_name}</Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={[styles.infoLabel, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>📱 Phone</Text>
                      <Text style={[styles.infoValue, { color: isDark ? '#FFFFFF' : '#111827' }]}>{order.buyer_phone}</Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={[styles.infoLabel, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>🏠 Address</Text>
                      <Text style={[styles.infoValue, { color: isDark ? '#FFFFFF' : '#111827', flex: 1 }]} numberOfLines={2}>{order.buyer_address}</Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={[styles.infoLabel, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>🚗 Delivery</Text>
                      <View style={[styles.deliveryBadge, { backgroundColor: order.delivery_type === 'pickup' ? '#EDE9FE' : '#DBEAFE' }]}>
                        <Text style={[styles.deliveryBadgeText, { color: order.delivery_type === 'pickup' ? '#7C3AED' : '#1D4ED8' }]}>
                          {order.delivery_type === 'pickup' ? '🏛 Pickup at Office' : '🚚 Home Delivery'}
                        </Text>
                      </View>
                    </View>
                    {isAdmin && order.buyer_username && (
                      <View style={styles.infoRow}>
                        <Text style={[styles.infoLabel, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>🔑 User</Text>
                        <Text style={[styles.infoValue, { color: isDark ? '#FFFFFF' : '#111827' }]}>{order.buyer_username}</Text>
                      </View>
                    )}
                    <View style={styles.infoRow}>
                      <Text style={[styles.infoLabel, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>📅 Ordered</Text>
                      <Text style={[styles.infoValue, { color: isDark ? '#FFFFFF' : '#111827' }]}>
                        {new Date(order.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </View>
                    {order.admin_note && (
                      <View style={[styles.adminNoteBox, { backgroundColor: isDark ? '#1F2937' : '#FEF3C7' }]}>
                        <Text style={[styles.adminNoteText, { color: isDark ? '#FCD34D' : '#92400E' }]}>
                          💬 Note: {order.admin_note}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Status Banner for User */}
                  {!isAdmin && (
                    <View style={[
                      styles.adminNoteBox,
                      {
                        backgroundColor: order.status === 'approved'
                          ? (isDark ? '#064E3B' : '#D1FAE5')
                          : order.status === 'rejected'
                          ? (isDark ? '#7F1D1D' : '#FEE2E2')
                          : (isDark ? '#78350F' : '#FEF3C7'),
                        marginTop: 12,
                      }
                    ]}>
                      <Text style={[
                        styles.adminNoteText,
                        {
                          color: order.status === 'approved'
                            ? (isDark ? '#6EE7B7' : '#065F46')
                            : order.status === 'rejected'
                            ? (isDark ? '#FCA5A5' : '#991B1B')
                            : (isDark ? '#FDE68A' : '#92400E')
                        }
                      ]}>
                        {order.status === 'approved' && '🎉 Order Approved! Our team will contact you soon for pickup/delivery.'}
                        {order.status === 'pending' && '⏳ Order is being reviewed by our admin team.'}
                        {order.status === 'rejected' && '❌ This order was rejected. Please contact us for more information.'}
                      </Text>
                    </View>
                  )}

                  {/* Action Buttons — Admin only for Pending */}
                  {isAdmin && order.status === 'pending' && (
                    <View style={styles.actionRow}>
                      <TouchableOpacity
                        style={[styles.actionBtn, styles.rejectBtn]}
                        onPress={() => handleOpenRejectModal(order)}
                        disabled={actionLoading}
                      >
                        <Text style={styles.actionBtnText}>✕ Reject</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionBtn, styles.approveBtn]}
                        onPress={() => handleApprove(order)}
                        disabled={actionLoading}
                      >
                        <Text style={styles.actionBtnText}>✓ Approve</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      {/* Reject Modal */}
      <Modal
        animationType="slide"
        transparent
        visible={rejectModalVisible}
        onRequestClose={() => setRejectModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: isDark ? '#1A1D27' : '#FFFFFF' }]}>
            <Text style={[styles.modalTitle, { color: isDark ? '#FFFFFF' : '#111827' }]}>✕ Reject Order</Text>
            {selectedOrder && (
              <Text style={[styles.modalSub, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
                {selectedOrder.model_year} {selectedOrder.brand} {selectedOrder.model} — {selectedOrder.buyer_name}
              </Text>
            )}
            <Text style={[styles.modalLabel, { color: isDark ? '#9CA3AF' : '#555' }]}>Admin Note (Optional)</Text>
            <TextInput
              style={[styles.modalInput, {
                borderColor: isDark ? '#374151' : '#E5E7EB',
                color: isDark ? '#FFFFFF' : '#111827',
                backgroundColor: isDark ? '#111827' : '#F9FAFB',
              }]}
              value={adminNote}
              onChangeText={setAdminNote}
              placeholder="Reason for rejection..."
              placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
              multiline
              numberOfLines={3}
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: isDark ? '#374151' : '#F3F4F6' }]}
                onPress={() => setRejectModalVisible(false)}
                disabled={actionLoading}
              >
                <Text style={[styles.modalBtnText, { color: isDark ? '#FFFFFF' : '#374151' }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: '#EF4444', opacity: actionLoading ? 0.7 : 1 }]}
                onPress={handleReject}
                disabled={actionLoading}
              >
                <Text style={[styles.modalBtnText, { color: '#FFFFFF' }]}>
                  {actionLoading ? 'Saving...' : '✕ Confirm Reject'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 22, fontWeight: '800' },
  headerSub: { fontSize: 13, marginTop: 2 },
  refreshBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 4,
    borderBottomWidth: 1,
    maxWidth: 900,
    width: '100%',
    alignSelf: 'center',
  },
  filterTab: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    borderRadius: 8,
  },
  filterTabActive: {
    backgroundColor: 'rgba(139,92,246,0.12)',
  },
  filterTabText: { fontSize: 11, fontWeight: '700' },
  scrollContent: {
    padding: 16,
    gap: 14,
    maxWidth: 900,
    width: '100%',
    alignSelf: 'center',
  },
  emptyState: { flex: 1, alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyText: { fontSize: 16, fontWeight: '600' },
  // Order Card
  orderCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderLeftWidth: 4,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    gap: 12,
  },
  cardCarName: { fontSize: 15, fontWeight: '800', marginBottom: 2 },
  cardPrice: { fontSize: 14, fontWeight: '700' },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  statusBadgeText: { fontSize: 11, fontWeight: '700' },
  divider: { borderTopWidth: 1, marginHorizontal: 16 },
  buyerSection: { padding: 16, gap: 8 },
  sectionLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  infoLabel: { fontSize: 13, width: 80, flexShrink: 0 },
  infoValue: { fontSize: 13, fontWeight: '600', flex: 1 },
  deliveryBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 },
  deliveryBadgeText: { fontSize: 12, fontWeight: '700' },
  adminNoteBox: { borderRadius: 8, padding: 10, marginTop: 4 },
  adminNoteText: { fontSize: 13, fontStyle: 'italic' },
  // Action buttons
  actionRow: { flexDirection: 'row', gap: 10, padding: 16, paddingTop: 4 },
  actionBtn: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  approveBtn: { backgroundColor: '#10B981' },
  rejectBtn: { backgroundColor: '#EF4444' },
  actionBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  // Reject Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalBox: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    gap: 14,
  },
  modalTitle: { fontSize: 18, fontWeight: '800' },
  modalSub: { fontSize: 13, marginTop: -6 },
  modalLabel: { fontSize: 13, fontWeight: '600' },
  modalInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalBtns: { flexDirection: 'row', gap: 12, marginTop: 4 },
  modalBtn: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBtnText: { fontSize: 14, fontWeight: '700' },
});
