import React, { useEffect, useState, useMemo } from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
  Modal,
  useWindowDimensions,
  RefreshControl,
  StyleSheet
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as SecureStore from 'expo-secure-store';

// Dynamic API URL Configuration & Auto-Discovery
const CANDIDATE_SERVERS = [
  'http://192.168.1.9:4000',
  'http://192.168.1.2:4000',
  'http://10.0.2.2:4000',
  'http://localhost:4000'
];

const getApiUrl = () => {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location && window.location.origin && window.location.origin !== 'null') {
    if (window.location.port === '8081') {
      return `${window.location.protocol}//${window.location.hostname}:4000`;
    }
    return window.location.origin;
  }
  const configuredUrl = process.env.EXPO_PUBLIC_API_URL;
  if (configuredUrl) return configuredUrl.replace(/\/+$/, '');
  if (typeof __DEV__ !== 'undefined' && __DEV__) return Platform.OS === 'android' ? 'http://10.0.2.2:4000' : 'http://192.168.1.9:4000';
  return 'http://192.168.1.9:4000';
};

let currentApiUrl = getApiUrl();
const getActiveApi = () => currentApiUrl;
const setActiveApi = (url) => {
  if (!url) return;
  currentApiUrl = url.trim().replace(/\/+$/, '');
};

const API = {
  toString: () => currentApiUrl,
  valueOf: () => currentApiUrl
};

const getSavedServerUrl = async () => {
  try {
    return Platform.OS === 'web'
      ? (typeof window !== 'undefined' ? window.localStorage?.getItem('rentpro_server_url') : null)
      : await SecureStore.getItemAsync('rentpro_server_url');
  } catch {
    return null;
  }
};

const saveServerUrl = async (url) => {
  try {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined') window.localStorage?.setItem('rentpro_server_url', url);
    } else {
      await SecureStore.setItemAsync('rentpro_server_url', url);
    }
  } catch {}
};

const isLocalWebApi = () => {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return false;
  const localHosts = ['localhost', '127.0.0.1'];
  try {
    return localHosts.includes(window.location.hostname) && localHosts.includes(new URL(getActiveApi()).hostname);
  } catch {
    return false;
  }
};

const fetchWithTimeout = async (url, options = {}, timeout = 15000) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('Request timed out. Check network connection and API status.');
    throw error;
  } finally {
    clearTimeout(timer);
  }
};

const money = (n, symbol = '₹') => symbol + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
const monthNow = () => new Date().toISOString().slice(0, 7);

// Enterprise Theme Tokens
const COLORS = {
  navyDark: '#162846',
  slateDark: '#1E293B',
  primaryBlue: '#2563EB',
  skyBlue: '#60A5FA',
  skyLight: '#EFF6FF',
  bgLight: '#F8FAFC',
  cardWhite: '#FFFFFF',
  border: '#E2E8F0',
  borderDark: '#334155',
  textMain: '#0F172A',
  textMuted: '#64748B',
  textSub: '#94A3B8',
  success: '#16A34A',
  successBg: '#DCFCE7',
  warning: '#F59E0B',
  warningBg: '#FEF3C7',
  danger: '#DC2626',
  dangerBg: '#FEE2E2',
  purple: '#7C3AED',
  purpleBg: '#EDE9FE'
};

// Reusable UI Components
function Field({ label, value, onChange, placeholder, keyboardType = 'default', secureTextEntry = false, multiline = false, style }) {
  return (
    <View style={[{ marginBottom: 12 }, style]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={String(value ?? '')}
        onChangeText={onChange}
        placeholder={placeholder || label}
        keyboardType={keyboardType}
        secureTextEntry={secureTextEntry}
        multiline={multiline}
        style={[styles.input, multiline && { height: 70, textAlignVertical: 'top' }]}
        placeholderTextColor="#94A3B8"
      />
    </View>
  );
}

function PrimaryButton({ title, onPress, colors = ['#2563EB', '#1D4ED8'], disabled = false, style, textStyle }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} disabled={disabled} style={style}>
      <LinearGradient colors={disabled ? ['#94A3B8', '#CBD5E1'] : colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.button}>
        <Text style={[styles.buttonText, textStyle]}>{title}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
}

function Badge({ label, type = 'info', style }) {
  const typeMap = {
    success: { bg: COLORS.successBg, text: COLORS.success },
    warning: { bg: COLORS.warningBg, text: '#B45309' },
    danger: { bg: COLORS.dangerBg, text: COLORS.danger },
    purple: { bg: COLORS.purpleBg, text: COLORS.purple },
    info: { bg: COLORS.skyLight, text: COLORS.primaryBlue },
    slate: { bg: '#F1F5F9', text: COLORS.textMuted }
  };
  const c = typeMap[type] || typeMap.info;
  return (
    <View style={[{ backgroundColor: c.bg, paddingHorizontal: 9, paddingVertical: 3, borderRadius: 6, alignSelf: 'flex-start' }, style]}>
      <Text style={{ color: c.text, fontSize: 11, fontWeight: '700', letterSpacing: 0.3 }}>{label}</Text>
    </View>
  );
}

function KpiCard({ title, value, sub, icon, trend, type = 'info', onPress }) {
  return (
    <TouchableOpacity activeOpacity={onPress ? 0.8 : 1} onPress={onPress} style={styles.kpiCard}>
      <View style={styles.rowBetween}>
        <Text style={styles.kpiTitle}>{title}</Text>
        <View style={styles.kpiIconWrapper}>
          <Text style={styles.kpiIcon}>{icon}</Text>
        </View>
      </View>
      <Text style={styles.kpiValue}>{value}</Text>
      {sub ? <Text style={styles.kpiSub}>{sub}</Text> : null}
      {trend ? (
        <View style={[styles.row, { marginTop: 6 }]}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: COLORS.success }}>{trend}</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

export default function App() {
  const { width: windowWidth } = useWindowDimensions();
  const desktop = Platform.OS === 'web' && windowWidth >= 960;

  // Core Navigation & State
  const [tab, setTab] = useState('Dashboard');
  const [portalMode, setPortalMode] = useState('Admin'); // 'Admin' | 'Tenant'
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [month, setMonth] = useState(monthNow());
  const [selectedPropertyFilter, setSelectedPropertyFilter] = useState('All');
  const [globalSearch, setGlobalSearch] = useState('');

  // Domain Collections
  const [dash, setDash] = useState({});
  const [properties, setProperties] = useState([]);
  const [flats, setFlats] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [leases, setLeases] = useState([]);
  const [bills, setBills] = useState([]);
  const [maintenance, setMaintenance] = useState([]);
  const [accountingSummary, setAccountingSummary] = useState({});
  const [transactions, setTransactions] = useState([]);
  const [staff, setStaff] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [settings, setSettings] = useState({
    electricityRate: '8',
    waterRate: '30',
    garbageAmount: '125',
    currencySymbol: '₹',
    propertyName: 'RentPro Enterprise Properties'
  });

  // Action & Modal States
  const [reading, setReading] = useState({});
  const [flatForm, setFlatForm] = useState({ flatNumber: '', tenantName: '', phone: '', monthlyRent: '', electricityReading: '0', waterReading: '0' });
  const [editingFlat, setEditingFlat] = useState(null);
  const [showFlatModal, setShowFlatModal] = useState(false);
  const [showPropertyModal, setShowPropertyModal] = useState(false);
  const [newProperty, setNewProperty] = useState({ name: '', type: 'Residential Complex', address: '', manager: '', totalUnits: '' });
  const [showTenantModal, setShowTenantModal] = useState(false);
  const [newTenant, setNewTenant] = useState({ name: '', email: '', phone: '', flatId: '', emergencyContact: '', vehicle: '' });
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  const [newTicket, setNewTicket] = useState({ title: '', category: 'Plumbing', priority: 'Medium', flatId: '', description: '', assignedTo: '' });
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentBill, setPaymentBill] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [newExpense, setNewExpense] = useState({ category: 'Utilities', description: '', amount: '', vendor: '', paymentMethod: 'Net Banking' });
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);

  // Authentication
  const [authReady, setAuthReady] = useState(false);
  const [authRequired, setAuthRequired] = useState(false);
  const [authConfigError, setAuthConfigError] = useState('');
  const [token, setToken] = useState(null);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [authError, setAuthError] = useState('');

  const [serverUrlInput, setServerUrlInput] = useState(String(getActiveApi()));
  const [isReconnecting, setIsReconnecting] = useState(false);

  const getSavedToken = async () => (Platform.OS === 'web' ? window.sessionStorage.getItem('rentpro-token') : SecureStore.getItemAsync('rentpro-token'));
  const saveToken = async value => (Platform.OS === 'web' ? window.sessionStorage.setItem('rentpro-token', value) : SecureStore.setItemAsync('rentpro-token', value));
  const clearToken = async () => (Platform.OS === 'web' ? window.sessionStorage.removeItem('rentpro-token') : SecureStore.deleteItemAsync('rentpro-token'));

  const initAuth = async (targetUrl = null) => {
    setIsReconnecting(true);
    try {
      if (targetUrl) {
        setActiveApi(targetUrl);
        await saveServerUrl(targetUrl);
      } else {
        const saved = await getSavedServerUrl();
        if (saved) setActiveApi(saved);
      }
      setServerUrlInput(String(getActiveApi()));

      let activeUrl = String(getActiveApi());
      let connectedConfig = null;

      // 1. Try active URL
      try {
        const res = await fetchWithTimeout(`${activeUrl}/api/auth/config`, {}, 3000);
        if (res.ok) connectedConfig = await res.json();
      } catch (e) {
        // 2. If mobile and primary failed, probe known candidates automatically
        if (Platform.OS !== 'web') {
          for (const cand of CANDIDATE_SERVERS) {
            if (cand === activeUrl) continue;
            try {
              const probe = await fetchWithTimeout(`${cand}/api/auth/config`, {}, 1500);
              if (probe.ok) {
                connectedConfig = await probe.json();
                activeUrl = cand;
                setActiveApi(cand);
                await saveServerUrl(cand);
                setServerUrlInput(cand);
                break;
              }
            } catch {}
          }
        }
      }

      if (!connectedConfig) {
        throw new Error(`Cannot reach server at ${activeUrl}. Ensure computer is on Wi-Fi and server is running.`);
      }

      setAuthConfigError('');
      setAuthRequired(Boolean(connectedConfig.enabled));
      if (connectedConfig.enabled) {
        const saved = await getSavedToken();
        if (saved) {
          const check = await fetchWithTimeout(`${activeUrl}/api/flats`, { headers: { Authorization: `Bearer ${saved}` } });
          if (check.ok) setToken(saved);
          else await clearToken();
        }
      }
    } catch (error) {
      setAuthConfigError(error.message || 'Network request failed');
    } finally {
      setIsReconnecting(false);
      setAuthReady(true);
    }
  };

  const autoScanServers = async () => {
    setIsReconnecting(true);
    setAuthConfigError('Scanning network for RentPro server…');
    try {
      for (const cand of CANDIDATE_SERVERS) {
        try {
          const res = await fetchWithTimeout(`${cand}/api/health`, {}, 1500);
          if (res.ok) {
            await initAuth(cand);
            return;
          }
        } catch {}
      }
      throw new Error('No RentPro server detected on known IPs (192.168.1.9, 192.168.1.2, 10.0.2.2). Please enter IP manually.');
    } catch (err) {
      setAuthConfigError(err.message);
    } finally {
      setIsReconnecting(false);
    }
  };

  // Auth Initialization
  useEffect(() => {
    initAuth();
  }, []);

  const api = async (path, opts = {}) => {
    const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(opts.headers || {}) };
    const r = await fetchWithTimeout(API + path, { ...opts, headers });
    if (r.status === 401 && authRequired) {
      setToken(null);
      await clearToken();
    }
    if (!r.ok) {
      let e = {};
      try { e = await r.json(); } catch {}
      throw new Error(e.error || `Request failed (${r.status})`);
    }
    if (r.status === 204) return null;
    return r.json();
  };

  // Master Data Refresh
  const refresh = async () => {
    if (!authReady || (authRequired && !token)) return;
    try {
      const [
        d, f, history, s, propsRes, tenantsRes, leasesRes, mntRes, accSummaryRes, txnsRes, staffRes, vendorsRes, notifsRes, logsRes
      ] = await Promise.all([
        api(`/api/dashboard?month=${month}`).catch(() => ({})),
        api('/api/flats').catch(() => []),
        api('/api/bills').catch(() => []),
        api('/api/settings').catch(() => ({})),
        api('/api/properties').catch(() => []),
        api('/api/tenants').catch(() => []),
        api('/api/leases').catch(() => []),
        api('/api/maintenance').catch(() => []),
        api('/api/accounting/summary').catch(() => ({})),
        api('/api/accounting/transactions').catch(() => []),
        api('/api/staff').catch(() => []),
        api('/api/vendors').catch(() => []),
        api('/api/notifications').catch(() => []),
        api('/api/audit-logs').catch(() => [])
      ]);

      const b = history.filter(x => x.month === month);
      setDash(d);
      setFlats(f);
      setBills(b);
      setProperties(propsRes);
      setTenants(tenantsRes);
      setLeases(leasesRes);
      setMaintenance(mntRes);
      setAccountingSummary(accSummaryRes);
      setTransactions(txnsRes);
      setStaff(staffRes);
      setVendors(vendorsRes);
      setNotifications(notifsRes);
      setAuditLogs(logsRes);

      if (s) {
        setSettings({
          electricityRate: String(s.electricityRate ?? 8),
          waterRate: String(s.waterRate ?? 30),
          garbageAmount: String(s.garbageAmount ?? 125),
          currencySymbol: s.currencySymbol || '₹',
          propertyName: s.propertyName || 'RentPro Enterprise Properties'
        });
      }

      setReading(old => {
        const n = { ...old };
        f.forEach(flat => {
          const prior = [...history].filter(x => x.flatId === flat.id && x.month < month).sort((a, z) => z.month.localeCompare(a.month))[0];
          n[flat.id] ||= {
            electricityPrevious: String(prior ? prior.electricityCurrent : flat.electricityReading),
            electricityCurrent: String(prior ? prior.electricityCurrent : flat.electricityReading),
            waterPrevious: String(prior ? prior.waterCurrent : flat.waterReading),
            waterCurrent: String(prior ? prior.waterCurrent : flat.waterReading),
            otherCharges: '0'
          };
        });
        return n;
      });
    } catch (e) {
      console.error('Refresh error:', e.message);
    }
  };

  useEffect(() => {
    refresh();
  }, [month, authReady, token]);

  const refreshFromGesture = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const login = async () => {
    setBusy(true);
    setAuthError('');
    try {
      const response = await fetchWithTimeout(`${API}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || `Sign in failed (${response.status})`);
      await saveToken(result.token);
      setToken(result.token);
      setLoginPassword('');
    } catch (error) {
      setAuthError(error.message);
    } finally {
      setBusy(false);
    }
  };

  const logout = async () => {
    await clearToken();
    setToken(null);
    setTab('Dashboard');
    setLoginPassword('');
  };

  const action = async (fn, successMsg) => {
    setBusy(true);
    try {
      await fn();
      await refresh();
      if (successMsg) Alert.alert('RentPro Success', successMsg);
    } catch (e) {
      Alert.alert('Action Failed', e.message);
    } finally {
      setBusy(false);
    }
  };

  // --- CRUD Handlers ---
  const saveFlat = () => {
    const { flatNumber, tenantName, phone, monthlyRent, electricityReading, waterReading } = flatForm;
    if (!flatNumber.trim()) { Alert.alert('Validation Error', 'Unit / Flat number is required'); return; }
    if (isNaN(Number(monthlyRent)) || Number(monthlyRent) < 0) { Alert.alert('Validation Error', 'Rent must be positive'); return; }
    const payload = {
      flatNumber: flatNumber.trim(),
      tenantName: tenantName.trim(),
      phone: phone.trim(),
      monthlyRent: Number(monthlyRent),
      electricityReading: Number(electricityReading || 0),
      waterReading: Number(waterReading || 0)
    };
    if (editingFlat) {
      action(() => api(`/api/flats/${editingFlat.id}`, { method: 'PUT', body: JSON.stringify(payload) }), 'Unit details updated successfully');
    } else {
      action(() => api('/api/flats', { method: 'POST', body: JSON.stringify(payload) }), 'New unit registered successfully');
    }
    setShowFlatModal(false);
    setEditingFlat(null);
    setFlatForm({ flatNumber: '', tenantName: '', phone: '', monthlyRent: '', electricityReading: '0', waterReading: '0' });
  };

  const saveProperty = () => {
    if (!newProperty.name.trim()) { Alert.alert('Required', 'Property name is required'); return; }
    action(() => api('/api/properties', { method: 'POST', body: JSON.stringify(newProperty) }), 'Property added to portfolio');
    setShowPropertyModal(false);
    setNewProperty({ name: '', type: 'Residential Complex', address: '', manager: '', totalUnits: '' });
  };

  const saveTenant = () => {
    if (!newTenant.name.trim()) { Alert.alert('Required', 'Tenant full name is required'); return; }
    action(() => api('/api/tenants', { method: 'POST', body: JSON.stringify(newTenant) }), 'Tenant profile registered');
    setShowTenantModal(false);
    setNewTenant({ name: '', email: '', phone: '', flatId: '', emergencyContact: '', vehicle: '' });
  };

  const saveMaintenanceTicket = () => {
    if (!newTicket.title.trim()) { Alert.alert('Required', 'Issue title is required'); return; }
    action(() => api('/api/maintenance', { method: 'POST', body: JSON.stringify(newTicket) }), 'Work order ticket created');
    setShowMaintenanceModal(false);
    setNewTicket({ title: '', category: 'Plumbing', priority: 'Medium', flatId: '', description: '', assignedTo: '' });
  };

  const saveExpense = () => {
    if (!newExpense.amount || isNaN(Number(newExpense.amount))) { Alert.alert('Required', 'Valid expense amount required'); return; }
    action(() => api('/api/accounting/transactions', { method: 'POST', body: JSON.stringify(newExpense) }), 'Expense recorded in general ledger');
    setShowExpenseModal(false);
    setNewExpense({ category: 'Utilities', description: '', amount: '', vendor: '', paymentMethod: 'Net Banking' });
  };

  const generateBills = () => {
    const readings = flats.map(f => {
      const r = reading[f.id] || {};
      return {
        flatId: f.id,
        electricityPrevious: Number(r.electricityPrevious || 0),
        electricityCurrent: Number(r.electricityCurrent || 0),
        waterPrevious: Number(r.waterPrevious || 0),
        waterCurrent: Number(r.waterCurrent || 0),
        otherCharges: Number(r.otherCharges || 0)
      };
    });
    action(() => api('/api/bills/generate', { method: 'POST', body: JSON.stringify({ month, readings }) }), `Invoices generated for cycle ${month}`);
  };

  const recordPayment = () => {
    const amt = Number(paymentAmount);
    if (!paymentBill || !amt || amt <= 0) { Alert.alert('Invalid', 'Enter payment amount greater than zero'); return; }
    if (amt > paymentBill.balance) { Alert.alert('Invalid', 'Amount exceeds outstanding balance'); return; }
    action(
      () => api(`/api/bills/${paymentBill.id}/payment`, {
        method: 'POST',
        body: JSON.stringify({ amount: amt, paymentMethod, paymentDate })
      }),
      'Payment recorded & receipt generated'
    );
    setShowPaymentModal(false);
    setPaymentBill(null);
    setPaymentAmount('');
  };

  const updateWorkOrderStatus = (ticketId, nextStatus) => {
    action(() => api(`/api/maintenance/${ticketId}`, { method: 'PUT', body: JSON.stringify({ status: nextStatus }) }), `Ticket updated to ${nextStatus}`);
  };

  const unreadNotifsCount = useMemo(() => notifications.filter(n => !n.read).length, [notifications]);

  // Sidebar navigation configuration
  const navSections = [
    {
      title: 'OVERVIEW',
      items: [
        { key: 'Dashboard', label: 'Executive Dashboard', icon: '📊' },
        { key: 'Properties', label: 'Properties & Blocks', icon: '🏢' },
        { key: 'Units', label: 'Units & Flats', icon: '▦' }
      ]
    },
    {
      title: 'RESIDENCY',
      items: [
        { key: 'Tenants', label: 'Tenant Lifecycle', icon: '👥' },
        { key: 'Leases', label: 'Lease Agreements', icon: '📜' },
        { key: 'TenantPortal', label: 'Tenant Self-Portal', icon: '👤' }
      ]
    },
    {
      title: 'FINANCE & BILLING',
      items: [
        { key: 'Billing', label: 'Rent Invoicing', icon: '💳' },
        { key: 'Payments', label: 'Collections & Ledger', icon: '📥' },
        { key: 'Accounting', label: 'Accounting & P&L', icon: '📈' }
      ]
    },
    {
      title: 'OPERATIONS',
      items: [
        { key: 'Maintenance', label: 'Work Orders', icon: '🛠️' },
        { key: 'Readings', label: 'Meter Readings', icon: '⚡' },
        { key: 'StaffVendors', label: 'Staff & Vendors', icon: '🤝' }
      ]
    },
    {
      title: 'SYSTEM',
      items: [
        { key: 'Reports', label: 'Reports & Export', icon: '📁' },
        { key: 'Settings', label: 'Tariffs & Settings', icon: '⚙️' }
      ]
    }
  ];

  // --- Auth Screens ---
  if (!authReady) {
    return (
      <SafeAreaView style={styles.centerScreen}>
        <ActivityIndicator size="large" color={COLORS.primaryBlue} />
        <Text style={[styles.subText, { marginTop: 12 }]}>Initializing RentPro Enterprise…</Text>
      </SafeAreaView>
    );
  }

  if (authConfigError) {
    return (
      <SafeAreaView style={styles.centerScreen}>
        <ScrollView contentContainerStyle={{ padding: 20, alignItems: 'center', width: '100%' }}>
          <View style={[styles.card, { width: '100%', maxWidth: 460, padding: 28 }]}>
            <View style={styles.brandRow}>
              <View style={styles.brandBadge}>
                <Text style={{ color: '#fff', fontSize: 18, fontWeight: '900' }}>RP</Text>
              </View>
              <View style={{ marginLeft: 12 }}>
                <Text style={{ fontSize: 24, fontWeight: '900', color: COLORS.navyDark }}>Rent<Text style={{ color: COLORS.primaryBlue }}>Pro</Text></Text>
                <Text style={{ fontSize: 9, fontWeight: '800', color: COLORS.textMuted, letterSpacing: 1.2 }}>SERVER CONNECTION</Text>
              </View>
            </View>

            <View style={{ backgroundColor: '#FEF2F2', padding: 14, borderRadius: 10, marginTop: 20, borderWidth: 1, borderColor: '#FEE2E2' }}>
              <Text style={{ fontWeight: '800', color: COLORS.danger, fontSize: 14 }}>⚠️ Unable to Reach Backend</Text>
              <Text style={{ color: '#991B1B', fontSize: 12, marginTop: 4, lineHeight: 18 }}>
                {authConfigError}
              </Text>
              <Text style={{ color: COLORS.textMuted, fontSize: 11, marginTop: 6 }}>
                Target: {serverUrlInput || String(getActiveApi())}
              </Text>
            </View>

            <Text style={{ fontWeight: '800', color: COLORS.navyDark, fontSize: 13, marginTop: 20, marginBottom: 6 }}>
              Backend Server IP & Port
            </Text>
            <TextInput
              style={{
                backgroundColor: '#F8FAFC',
                borderWidth: 1,
                borderColor: COLORS.border,
                borderRadius: 8,
                padding: 12,
                fontSize: 14,
                color: COLORS.navyDark,
                fontWeight: '600',
                marginBottom: 12
              }}
              value={serverUrlInput}
              onChangeText={setServerUrlInput}
              placeholder="http://192.168.1.9:4000"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Text style={{ fontSize: 12, fontWeight: '700', color: COLORS.textMuted, marginBottom: 8 }}>
              Quick Presets:
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
              <TouchableOpacity
                onPress={() => { setServerUrlInput('http://192.168.1.9:4000'); initAuth('http://192.168.1.9:4000'); }}
                style={{ backgroundColor: '#EFF6FF', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 6, borderWidth: 1, borderColor: '#BFDBFE' }}
              >
                <Text style={{ fontSize: 12, fontWeight: '700', color: COLORS.primaryBlue }}>192.168.1.9:4000 (Current)</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => { setServerUrlInput('http://192.168.1.2:4000'); initAuth('http://192.168.1.2:4000'); }}
                style={{ backgroundColor: '#F1F5F9', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 6, borderWidth: 1, borderColor: '#CBD5E1' }}
              >
                <Text style={{ fontSize: 12, fontWeight: '700', color: COLORS.navyDark }}>192.168.1.2:4000</Text>
              </TouchableOpacity>
            </View>

            <PrimaryButton
              title={isReconnecting ? 'Testing Connection…' : 'Connect & Save'}
              onPress={() => initAuth(serverUrlInput)}
              disabled={isReconnecting}
            />

            <TouchableOpacity
              onPress={autoScanServers}
              disabled={isReconnecting}
              style={{ marginTop: 12, padding: 10, alignItems: 'center' }}
            >
              <Text style={{ color: COLORS.primaryBlue, fontWeight: '700', fontSize: 13 }}>
                🔍 Auto-Scan & Detect Server
              </Text>
            </TouchableOpacity>

            <View style={{ marginTop: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: COLORS.border }}>
              <Text style={{ fontSize: 12, color: COLORS.textMuted, lineHeight: 18, textAlign: 'center' }}>
                💡 Tip: Ensure your mobile phone is connected to your hotspot (iQOO Neo9 Pro) and the RentPro backend is running.
              </Text>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (authRequired && !token) {
    return (
      <SafeAreaView style={styles.centerScreen}>
        <View style={[styles.card, { width: '100%', maxWidth: 420, padding: 32 }]}>
          <View style={styles.brandRow}>
            <View style={styles.brandBadge}>
              <Text style={{ color: '#fff', fontSize: 18, fontWeight: '900' }}>RP</Text>
            </View>
            <View style={{ marginLeft: 12 }}>
              <Text style={{ fontSize: 24, fontWeight: '900', color: COLORS.navyDark }}>Rent<Text style={{ color: COLORS.primaryBlue }}>Pro</Text></Text>
              <Text style={{ fontSize: 9, fontWeight: '800', color: COLORS.textMuted, letterSpacing: 1.2 }}>ENTERPRISE EDITION</Text>
            </View>
          </View>
          <Text style={[styles.heading, { marginTop: 24, fontSize: 20 }]}>Owner Sign In</Text>
          <Text style={[styles.subText, { marginBottom: 20 }]}>Smart Property. Seamless Management.</Text>
          <Field label="Registered Owner Email" value={loginEmail} onChange={setLoginEmail} keyboardType="email-address" />
          <Field label="Password" value={loginPassword} onChange={setLoginPassword} secureTextEntry />
          {authError ? <Text style={{ color: COLORS.danger, marginBottom: 12, fontSize: 13 }}>{authError}</Text> : null}
          <PrimaryButton title={busy ? 'Verifying Credentials…' : 'Sign In to Workspace'} onPress={login} disabled={busy} />
        </View>
      </SafeAreaView>
    );
  }

  // --- Main Application Shell ---
  return (
    <SafeAreaView style={styles.fullScreen}>
      <View style={desktop ? { flex: 1, flexDirection: 'row' } : { flex: 1 }}>
        {/* Navy Enterprise Sidebar (Desktop) */}
        {desktop && (
          <View style={styles.sidebar}>
            {/* Brand Logo & Tagline */}
            <View style={styles.sidebarHeader}>
              <View style={styles.row}>
                <View style={styles.sidebarLogoIcon}>
                  <Text style={{ color: '#fff', fontSize: 16, fontWeight: '900' }}>RP</Text>
                </View>
                <View style={{ marginLeft: 10 }}>
                  <Text style={styles.sidebarBrandTitle}>Rent<Text style={{ color: COLORS.skyBlue }}>Pro</Text></Text>
                  <Text style={styles.sidebarBadge}>ENTERPRISE</Text>
                </View>
              </View>
              <Text style={styles.sidebarTagline}>Smart Property. Seamless Management.</Text>
            </View>

            {/* Navigation Groups */}
            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
              {navSections.map(sec => (
                <View key={sec.title} style={{ marginBottom: 18 }}>
                  <Text style={styles.navSectionHeader}>{sec.title}</Text>
                  {sec.items.map(item => {
                    const active = tab === item.key;
                    return (
                      <TouchableOpacity
                        key={item.key}
                        onPress={() => setTab(item.key)}
                        activeOpacity={0.8}
                        style={[styles.navItem, active && styles.navItemActive]}
                      >
                        <Text style={styles.navItemIcon}>{item.icon}</Text>
                        <Text style={[styles.navItemText, active && styles.navItemTextActive]}>{item.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}
            </ScrollView>

            {/* User Profile / Logout footer */}
            <View style={styles.sidebarFooter}>
              <View style={styles.rowBetween}>
                <View>
                  <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>Property Admin</Text>
                  <Text style={{ color: COLORS.textSub, fontSize: 11 }}>Active Workspace</Text>
                </View>
                {authRequired && (
                  <TouchableOpacity onPress={logout} style={{ padding: 6 }}>
                    <Text style={{ color: COLORS.skyBlue, fontSize: 12, fontWeight: '700' }}>Exit</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        )}

        {/* Content View Area */}
        <View style={{ flex: 1, backgroundColor: COLORS.bgLight }}>
          {/* Top Enterprise Header Bar */}
          <View style={styles.topHeader}>
            <View style={[styles.row, { flex: 1 }]}>
              {!desktop && (
                <View style={[styles.row, { marginRight: 8 }]}>
                  <Text style={{ fontSize: 17, fontWeight: '900', color: COLORS.navyDark }}>Rent<Text style={{ color: COLORS.primaryBlue }}>Pro</Text></Text>
                  <View style={styles.mobileVersionPill}>
                    <Text style={{ color: '#fff', fontSize: 10, fontWeight: '800' }}>v2.0 Enterprise</Text>
                  </View>
                </View>
              )}
              {/* Search Bar */}
              <View style={styles.searchBarWrapper}>
                <TextInput
                  value={globalSearch}
                  onChangeText={setGlobalSearch}
                  placeholder="Global search properties, units, tenants, tickets…"
                  style={styles.searchBarInput}
                  placeholderTextColor="#94A3B8"
                />
              </View>
            </View>

            {/* Right Action Icons */}
            <View style={[styles.row, { gap: 12 }]}>
              {/* Month Selector */}
              <View style={styles.monthBadgeWrapper}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: COLORS.navyDark }}>Cycle: {month}</Text>
              </View>

              {/* Notification Bell */}
              <TouchableOpacity onPress={() => setShowNotificationsModal(true)} style={styles.headerIconButton}>
                <Text style={{ fontSize: 16 }}>🔔</Text>
                {unreadNotifsCount > 0 && (
                  <View style={styles.unreadBadge}>
                    <Text style={{ color: '#fff', fontSize: 9, fontWeight: '900' }}>{unreadNotifsCount}</Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* Portal Mode Switch */}
              <TouchableOpacity
                onPress={() => setTab(tab === 'TenantPortal' ? 'Dashboard' : 'TenantPortal')}
                style={[styles.portalToggle, tab === 'TenantPortal' && { backgroundColor: COLORS.purpleBg, borderColor: COLORS.purple }]}
              >
                <Text style={{ fontSize: 12, fontWeight: '800', color: tab === 'TenantPortal' ? COLORS.purple : COLORS.primaryBlue }}>
                  {tab === 'TenantPortal' ? '👤 Tenant Mode' : '🏢 Ops Mode'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Main Scrollable View Area */}
          <ScrollView
            style={{ flex: 1, padding: 20 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refreshFromGesture} tintColor={COLORS.primaryBlue} />}
          >
            {/* VIEW 1: EXECUTIVE DASHBOARD */}
            {tab === 'Dashboard' && (
              <View>
                <View style={[styles.rowBetween, { marginBottom: 18 }]}>
                  <View>
                    <Text style={styles.viewTitle}>Executive Overview</Text>
                    <Text style={styles.viewSubtitle}>Operational and financial telemetry for {settings.propertyName}</Text>
                  </View>
                  <View style={styles.row}>
                    <PrimaryButton title="＋ Add Unit" onPress={() => setShowFlatModal(true)} style={{ marginRight: 8 }} />
                    <PrimaryButton title="⚡ Enter Readings" onPress={() => setTab('Readings')} colors={['#059669', '#10B981']} />
                  </View>
                </View>

                {/* Primary KPI Row */}
                <View style={styles.kpiGrid}>
                  <KpiCard
                    title="TOTAL UNITS"
                    value={dash.totalUnits || flats.length}
                    sub={`${dash.occupiedFlats || flats.filter(f => f.occupied).length} Occupied · ${dash.vacantFlats || flats.filter(f => !f.occupied).length} Vacant`}
                    icon="🏢"
                    trend={`${dash.occupancyRate || 75}% Occupancy`}
                    onPress={() => setTab('Units')}
                  />
                  <KpiCard
                    title="ACTIVE TENANTS"
                    value={dash.activeTenants || tenants.filter(t => t.status === 'Active Resident').length}
                    sub="1 Applicant in review"
                    icon="👥"
                    trend="+1 this month"
                    onPress={() => setTab('Tenants')}
                  />
                  <KpiCard
                    title="COLLECTED (INR)"
                    value={money(dash.collected || 0)}
                    sub={`Billed: ${money(dash.totalBilled || 0)}`}
                    icon="💰"
                    trend={`${dash.totalBilled ? Math.round(((dash.collected || 0) / dash.totalBilled) * 100) : 0}% collected`}
                    onPress={() => setTab('Billing')}
                  />
                  <KpiCard
                    title="PENDING RECEIVABLES"
                    value={money(dash.pending || 0)}
                    sub="Across all active units"
                    icon="⏳"
                    trend={`${bills.filter(b => b.status === 'PENDING').length} Pending Bills`}
                    onPress={() => setTab('Billing')}
                  />
                </View>

                {/* Secondary Operational Telemetry */}
                <View style={[styles.kpiGrid, { marginTop: 12 }]}>
                  <KpiCard
                    title="ACTIVE WORK ORDERS"
                    value={dash.activeMaintenance || maintenance.filter(m => m.status !== 'Completed').length}
                    sub="1 High priority request"
                    icon="🛠️"
                    onPress={() => setTab('Maintenance')}
                  />
                  <KpiCard
                    title="LEASES EXPIRING (90D)"
                    value={dash.leasesExpiringSoon || 1}
                    sub="Flat 101 renewal pending"
                    icon="📜"
                    onPress={() => setTab('Leases')}
                  />
                  <KpiCard
                    title="NET CASH FLOW"
                    value={money(dash.netCashFlow || (dash.collected || 0) - (dash.totalExpenses || 0))}
                    sub={`Expenses: ${money(dash.totalExpenses || 12200)}`}
                    icon="📈"
                    onPress={() => setTab('Accounting')}
                  />
                  <KpiCard
                    title="DEPOSIT LIABILITIES"
                    value={money(dash.depositLiabilities || 141000)}
                    sub="Held in trust escrow"
                    icon="🔒"
                    onPress={() => setTab('Accounting')}
                  />
                </View>

                {/* Live Activity & Action Widgets */}
                <View style={[styles.desktopGrid2, { marginTop: 20 }]}>
                  {/* Recent Payments Feed */}
                  <View style={styles.card}>
                    <View style={[styles.rowBetween, { marginBottom: 14 }]}>
                      <Text style={styles.cardHeaderTitle}>Recent Rent Collections</Text>
                      <TouchableOpacity onPress={() => setTab('Payments')}>
                        <Text style={styles.linkText}>View Ledger →</Text>
                      </TouchableOpacity>
                    </View>
                    {dash.recentPayments && dash.recentPayments.length > 0 ? (
                      dash.recentPayments.map(p => (
                        <View key={p.id} style={styles.paymentFeedItem}>
                          <View>
                            <Text style={{ fontWeight: '800', color: COLORS.textMain }}>Flat {p.flatNumber} · {p.tenantName}</Text>
                            <Text style={styles.subText}>{p.paymentDate} via {p.paymentMethod}</Text>
                          </View>
                          <Badge label={`+${money(p.amount)}`} type="success" />
                        </View>
                      ))
                    ) : (
                      <Text style={styles.subText}>No recorded payments for cycle {month}.</Text>
                    )}
                  </View>

                  {/* Active Maintenance Requests */}
                  <View style={styles.card}>
                    <View style={[styles.rowBetween, { marginBottom: 14 }]}>
                      <Text style={styles.cardHeaderTitle}>Active Work Orders</Text>
                      <TouchableOpacity onPress={() => setTab('Maintenance')}>
                        <Text style={styles.linkText}>All Tickets →</Text>
                      </TouchableOpacity>
                    </View>
                    {maintenance.slice(0, 4).map(m => (
                      <View key={m.id} style={styles.ticketFeedItem}>
                        <View style={{ flex: 1, marginRight: 10 }}>
                          <Text style={{ fontWeight: '800', color: COLORS.textMain }}>{m.ticketNumber}: {m.title}</Text>
                          <Text style={styles.subText}>Unit {m.flatNumber} · Assigned: {m.assignedTo}</Text>
                        </View>
                        <Badge
                          label={m.status}
                          type={m.status === 'Completed' ? 'success' : m.priority === 'High' ? 'danger' : 'warning'}
                        />
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            )}

            {/* VIEW 2: PROPERTIES & BLOCKS */}
            {tab === 'Properties' && (
              <View>
                <View style={[styles.rowBetween, { marginBottom: 18 }]}>
                  <View>
                    <Text style={styles.viewTitle}>Property Portfolio</Text>
                    <Text style={styles.viewSubtitle}>Multi-property residential & commercial building management</Text>
                  </View>
                  <PrimaryButton title="＋ Add New Property" onPress={() => setShowPropertyModal(true)} />
                </View>

                {properties.map(p => (
                  <View key={p.id} style={[styles.card, { marginBottom: 16 }]}>
                    <View style={styles.rowBetween}>
                      <View>
                        <View style={styles.row}>
                          <Text style={{ fontSize: 18, fontWeight: '900', color: COLORS.navyDark }}>{p.name}</Text>
                          <Badge label={p.code} type="info" style={{ marginLeft: 8 }} />
                          <Badge label={p.status} type="success" style={{ marginLeft: 6 }} />
                        </View>
                        <Text style={[styles.subText, { marginTop: 4 }]}>📍 {p.address}</Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={{ fontSize: 16, fontWeight: '900', color: COLORS.primaryBlue }}>{p.totalUnits} Units</Text>
                        <Text style={styles.subText}>Manager: {p.manager}</Text>
                      </View>
                    </View>
                    <Text style={{ marginTop: 12, color: COLORS.textMuted, fontSize: 13, lineHeight: 18 }}>{p.description}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* VIEW 3: UNITS & FLATS */}
            {tab === 'Units' && (
              <View>
                <View style={[styles.rowBetween, { marginBottom: 18 }]}>
                  <View>
                    <Text style={styles.viewTitle}>Units & Apartments</Text>
                    <Text style={styles.viewSubtitle}>Directory of flats, utility meters, and occupancy status</Text>
                  </View>
                  <PrimaryButton title="＋ Register Unit" onPress={() => { setEditingFlat(null); setFlatForm({ flatNumber: '', tenantName: '', phone: '', monthlyRent: '', electricityReading: '0', waterReading: '0' }); setShowFlatModal(true); }} />
                </View>

                <View style={styles.card}>
                  {flats.map(f => (
                    <View key={f.id} style={styles.tableRow}>
                      <View style={{ flex: 1 }}>
                        <View style={styles.row}>
                          <Text style={{ fontSize: 16, fontWeight: '900', color: COLORS.navyDark }}>Flat {f.flatNumber}</Text>
                          <Badge label={f.occupied ? 'Occupied' : 'Vacant Ready'} type={f.occupied ? 'success' : 'warning'} style={{ marginLeft: 8 }} />
                        </View>
                        <Text style={styles.subText}>Tenant: {f.tenantName || 'None (Vacant)'} · {f.phone || 'No contact'}</Text>
                        <Text style={[styles.subText, { marginTop: 2 }]}>Initial Meters — Electricity: {f.electricityReading} kWh | Water: {f.waterReading} kL</Text>
                      </View>
                      <View style={{ alignItems: 'flex-end', marginRight: 14 }}>
                        <Text style={{ fontSize: 16, fontWeight: '900', color: COLORS.textMain }}>{money(f.monthlyRent)}/mo</Text>
                        <Text style={styles.subText}>Deposit: {money(f.securityDeposit || f.monthlyRent * 3)}</Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => {
                          setEditingFlat(f);
                          setFlatForm({
                            flatNumber: f.flatNumber,
                            tenantName: f.tenantName,
                            phone: f.phone,
                            monthlyRent: String(f.monthlyRent),
                            electricityReading: String(f.electricityReading),
                            waterReading: String(f.waterReading)
                          });
                          setShowFlatModal(true);
                        }}
                        style={styles.actionPill}
                      >
                        <Text style={{ color: COLORS.primaryBlue, fontWeight: '700', fontSize: 12 }}>Edit</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* VIEW 4: TENANT LIFECYCLE */}
            {tab === 'Tenants' && (
              <View>
                <View style={[styles.rowBetween, { marginBottom: 18 }]}>
                  <View>
                    <Text style={styles.viewTitle}>Tenant Lifecycle & Directory</Text>
                    <Text style={styles.viewSubtitle}>Resident profiles, emergency contacts, vehicles, and KYC records</Text>
                  </View>
                  <PrimaryButton title="＋ Add Resident" onPress={() => setShowTenantModal(true)} />
                </View>

                {tenants.map(t => (
                  <View key={t.id} style={[styles.card, { marginBottom: 14 }]}>
                    <View style={styles.rowBetween}>
                      <View>
                        <View style={styles.row}>
                          <Text style={{ fontSize: 17, fontWeight: '900', color: COLORS.navyDark }}>{t.name}</Text>
                          <Badge label={t.status} type={t.status === 'Active Resident' ? 'success' : 'purple'} style={{ marginLeft: 8 }} />
                          <Badge label={`KYC: ${t.kycStatus}`} type={t.kycStatus === 'Verified' ? 'info' : 'warning'} style={{ marginLeft: 6 }} />
                        </View>
                        <Text style={[styles.subText, { marginTop: 4 }]}>Unit: {t.flatNumber ? `Flat ${t.flatNumber}` : 'Unassigned (Applicant)'} · 📞 {t.phone} · ✉️ {t.email}</Text>
                        <Text style={[styles.subText, { marginTop: 2 }]}>Emergency: {t.emergencyContact || 'None listed'} · Vehicle: {t.vehicle || 'None'}</Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={styles.subText}>Registered</Text>
                        <Text style={{ fontWeight: '700', color: COLORS.textMain }}>{t.registrationDate}</Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* VIEW 5: LEASES */}
            {tab === 'Leases' && (
              <View>
                <View style={[styles.rowBetween, { marginBottom: 18 }]}>
                  <View>
                    <Text style={styles.viewTitle}>Lease Agreements</Text>
                    <Text style={styles.viewSubtitle}>Terms, security deposits, escalation rules, and expiration tracking</Text>
                  </View>
                </View>

                {leases.map(l => (
                  <View key={l.id} style={[styles.card, { marginBottom: 14 }]}>
                    <View style={styles.rowBetween}>
                      <View>
                        <View style={styles.row}>
                          <Text style={{ fontSize: 16, fontWeight: '900', color: COLORS.navyDark }}>{l.leaseNumber}</Text>
                          <Badge label={l.status} type="success" style={{ marginLeft: 8 }} />
                          <Badge label={`Expires in ${l.daysUntilExpiry || 90}d`} type={l.daysUntilExpiry <= 60 ? 'danger' : 'info'} style={{ marginLeft: 6 }} />
                        </View>
                        <Text style={[styles.subText, { marginTop: 4 }]}>Flat {l.flatNumber} · Resident: {l.tenantName} · {l.startDate} to {l.endDate}</Text>
                        <Text style={[styles.subText, { marginTop: 2 }]}>Escalation Terms: {l.renewalTerms}</Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={{ fontSize: 16, fontWeight: '900', color: COLORS.primaryBlue }}>{money(l.monthlyRent)}/mo</Text>
                        <Text style={styles.subText}>Deposit: {money(l.securityDeposit)}</Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* VIEW 6: RENT & BILLING */}
            {tab === 'Billing' && (
              <View>
                <View style={[styles.rowBetween, { marginBottom: 18 }]}>
                  <View>
                    <Text style={styles.viewTitle}>Monthly Invoices ({month})</Text>
                    <Text style={styles.viewSubtitle}>Itemized utility charges, base rent, and downloadable PDF invoices</Text>
                  </View>
                  <View style={styles.row}>
                    <PrimaryButton title="⚡ Enter Meter Readings" onPress={() => setTab('Readings')} style={{ marginRight: 8 }} />
                    <PrimaryButton
                      title="📥 Export CSV"
                      onPress={() => {
                        if (Platform.OS === 'web') window.open(`${API}/api/export/${month}.csv`, '_blank');
                      }}
                      colors={['#059669', '#10B981']}
                    />
                  </View>
                </View>

                {bills.length === 0 ? (
                  <View style={[styles.card, { padding: 36, alignItems: 'center' }]}>
                    <Text style={{ fontSize: 18, fontWeight: '800', color: COLORS.navyDark }}>No Invoices Generated for {month}</Text>
                    <Text style={[styles.subText, { marginTop: 6, marginBottom: 18 }]}>Enter current meter readings and generate invoices for this cycle.</Text>
                    <PrimaryButton title="Go to Meter Readings" onPress={() => setTab('Readings')} />
                  </View>
                ) : (
                  bills.map(b => (
                    <View key={b.id} style={[styles.card, { marginBottom: 14 }]}>
                      <View style={styles.rowBetween}>
                        <View>
                          <View style={styles.row}>
                            <Text style={{ fontSize: 17, fontWeight: '900', color: COLORS.navyDark }}>Flat {b.flatNumber} · {b.tenantName}</Text>
                            <Badge label={b.status} type={b.status === 'PAID' ? 'success' : b.status === 'PARTIAL' ? 'warning' : 'danger'} style={{ marginLeft: 8 }} />
                          </View>
                          <Text style={[styles.subText, { marginTop: 4 }]}>
                            Rent: {money(b.rent)} | Electricity: {b.electricityUnits}u ({money(b.electricityAmount)}) | Water: {b.waterUnits}u ({money(b.waterAmount)}) | Garbage: {money(b.garbageAmount)}
                          </Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={{ fontSize: 18, fontWeight: '900', color: COLORS.navyDark }}>{money(b.total)}</Text>
                          <Text style={{ fontSize: 12, color: b.balance > 0 ? COLORS.danger : COLORS.success, fontWeight: '700' }}>
                            Balance: {money(b.balance)}
                          </Text>
                        </View>
                      </View>

                      {/* Bill Actions */}
                      <View style={[styles.rowBetween, { marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: COLORS.border }]}>
                        <View style={styles.row}>
                          <TouchableOpacity
                            onPress={() => {
                              if (Platform.OS === 'web') window.open(`${API}/api/bills/${b.id}/pdf`, '_blank');
                            }}
                            style={styles.actionPill}
                          >
                            <Text style={{ color: COLORS.primaryBlue, fontWeight: '700', fontSize: 12 }}>📄 Download PDF</Text>
                          </TouchableOpacity>
                        </View>

                        {b.balance > 0 && (
                          <PrimaryButton
                            title="Record Payment"
                            onPress={() => {
                              setPaymentBill(b);
                              setPaymentAmount(String(b.balance));
                              setShowPaymentModal(true);
                            }}
                            style={{ height: 34 }}
                            textStyle={{ fontSize: 12 }}
                          />
                        )}
                      </View>
                    </View>
                  ))
                )}
              </View>
            )}

            {/* VIEW 7: PAYMENTS & COLLECTIONS */}
            {tab === 'Payments' && (
              <View>
                <View style={[styles.rowBetween, { marginBottom: 18 }]}>
                  <View>
                    <Text style={styles.viewTitle}>Payment Collections Ledger</Text>
                    <Text style={styles.viewSubtitle}>Verified multi-channel transaction ledger with receipts</Text>
                  </View>
                </View>

                <View style={styles.card}>
                  {dash.recentPayments && dash.recentPayments.length > 0 ? (
                    dash.recentPayments.map(p => (
                      <View key={p.id} style={styles.tableRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontWeight: '800', color: COLORS.navyDark }}>Flat {p.flatNumber} · {p.tenantName}</Text>
                          <Text style={styles.subText}>Date: {p.paymentDate} · Payment ID: {p.id}</Text>
                        </View>
                        <View style={{ alignItems: 'flex-end', marginRight: 14 }}>
                          <Badge label={p.paymentMethod} type="purple" />
                        </View>
                        <Text style={{ fontSize: 16, fontWeight: '900', color: COLORS.success }}>+{money(p.amount)}</Text>
                      </View>
                    ))
                  ) : (
                    <Text style={styles.subText}>No recorded payment entries found.</Text>
                  )}
                </View>
              </View>
            )}

            {/* VIEW 8: ACCOUNTING & P&L */}
            {tab === 'Accounting' && (
              <View>
                <View style={[styles.rowBetween, { marginBottom: 18 }]}>
                  <View>
                    <Text style={styles.viewTitle}>Financial Statement & Ledger</Text>
                    <Text style={styles.viewSubtitle}>Profit & loss breakdown, operating expenses, and trust liabilities</Text>
                  </View>
                  <PrimaryButton title="＋ Record Expense" onPress={() => setShowExpenseModal(true)} colors={['#DC2626', '#B91C1C']} />
                </View>

                {/* Accounting KPI Summary */}
                <View style={styles.kpiGrid}>
                  <KpiCard title="TOTAL OPERATING INCOME" value={money(accountingSummary.totalIncome || dash.collected || 26225)} icon="💵" />
                  <KpiCard title="TOTAL OPERATING EXPENSES" value={money(accountingSummary.totalExpenses || 12200)} icon="📉" />
                  <KpiCard title="NET OPERATING INCOME" value={money(accountingSummary.netOperatingIncome || 14025)} icon="📈" trend="Profitable" />
                  <KpiCard title="ESCROW DEPOSITS HELD" value={money(accountingSummary.depositLiabilities || 141000)} icon="🔒" />
                </View>

                {/* Expense Ledger */}
                <View style={[styles.card, { marginTop: 18 }]}>
                  <Text style={[styles.cardHeaderTitle, { marginBottom: 14 }]}>Operating Expenses & Vendor Payments</Text>
                  {transactions.map(t => (
                    <View key={t.id} style={styles.tableRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontWeight: '800', color: COLORS.navyDark }}>{t.description}</Text>
                        <Text style={styles.subText}>Category: {t.category} · Vendor: {t.vendor} · {t.date}</Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={{ fontSize: 16, fontWeight: '900', color: t.type === 'Expense' ? COLORS.danger : COLORS.primaryBlue }}>
                          {t.type === 'Expense' ? `-${money(t.amount)}` : money(t.amount)}
                        </Text>
                        <Badge label={t.status} type={t.status === 'Cleared' ? 'success' : 'info'} style={{ marginTop: 2 }} />
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* VIEW 9: MAINTENANCE & WORK ORDERS */}
            {tab === 'Maintenance' && (
              <View>
                <View style={[styles.rowBetween, { marginBottom: 18 }]}>
                  <View>
                    <Text style={styles.viewTitle}>Work Orders & Maintenance</Text>
                    <Text style={styles.viewSubtitle}>Facility requests, contractor dispatch, and resolution tracking</Text>
                  </View>
                  <PrimaryButton title="＋ Create Work Order" onPress={() => setShowMaintenanceModal(true)} />
                </View>

                {maintenance.map(m => (
                  <View key={m.id} style={[styles.card, { marginBottom: 14 }]}>
                    <View style={styles.rowBetween}>
                      <View style={{ flex: 1, marginRight: 10 }}>
                        <View style={styles.row}>
                          <Text style={{ fontSize: 16, fontWeight: '900', color: COLORS.navyDark }}>{m.ticketNumber}: {m.title}</Text>
                          <Badge label={m.priority} type={m.priority === 'High' ? 'danger' : m.priority === 'Medium' ? 'warning' : 'info'} style={{ marginLeft: 8 }} />
                          <Badge label={m.category} type="purple" style={{ marginLeft: 6 }} />
                        </View>
                        <Text style={[styles.subText, { marginTop: 4 }]}>Unit {m.flatNumber} · Resident: {m.tenantName} · Reported: {m.createdAt}</Text>
                        <Text style={{ color: COLORS.textMuted, marginTop: 6, fontSize: 13 }}>{m.description}</Text>
                        <Text style={[styles.subText, { marginTop: 6 }]}>Assigned Contractor: {m.assignedTo} | Est. Cost: {money(m.estimatedCost)}</Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Badge label={m.status} type={m.status === 'Completed' ? 'success' : 'warning'} />
                        {m.status !== 'Completed' && (
                          <TouchableOpacity onPress={() => updateWorkOrderStatus(m.id, 'Completed')} style={[styles.actionPill, { marginTop: 10 }]}>
                            <Text style={{ color: COLORS.success, fontWeight: '800', fontSize: 11 }}>Mark Resolved ✓</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* VIEW 10: METER READINGS */}
            {tab === 'Readings' && (
              <View>
                <View style={[styles.rowBetween, { marginBottom: 18 }]}>
                  <View>
                    <Text style={styles.viewTitle}>Utility Meter Readings</Text>
                    <Text style={styles.viewSubtitle}>Track consumption for Electricity (₹{settings.electricityRate}/kWh) & Water (₹{settings.waterRate}/kL)</Text>
                  </View>
                  <PrimaryButton title="⚡ Generate Monthly Invoices" onPress={generateBills} colors={['#2563EB', '#1D4ED8']} />
                </View>

                {flats.map(f => {
                  const r = reading[f.id] || {};
                  const ePrev = Number(r.electricityPrevious || 0);
                  const eCurr = Number(r.electricityCurrent || ePrev);
                  const eUnits = Math.max(0, eCurr - ePrev);
                  const eCost = Math.round(eUnits * Number(settings.electricityRate) * 100) / 100;

                  const wPrev = Number(r.waterPrevious || 0);
                  const wCurr = Number(r.waterCurrent || wPrev);
                  const wUnits = Math.max(0, wCurr - wPrev);
                  const wCost = Math.round(wUnits * Number(settings.waterRate) * 100) / 100;

                  return (
                    <View key={f.id} style={[styles.card, { marginBottom: 16 }]}>
                      <View style={[styles.rowBetween, { marginBottom: 12 }]}>
                        <View>
                          <Text style={{ fontSize: 17, fontWeight: '900', color: COLORS.navyDark }}>Flat {f.flatNumber} — {f.tenantName || 'Vacant'}</Text>
                          <Text style={styles.subText}>Base Monthly Rent: {money(f.monthlyRent)} | Fixed Sanitation: {money(settings.garbageAmount)}</Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={{ fontSize: 16, fontWeight: '900', color: COLORS.primaryBlue }}>
                            Est. Total: {money(f.monthlyRent + eCost + wCost + Number(settings.garbageAmount) + Number(r.otherCharges || 0))}
                          </Text>
                        </View>
                      </View>

                      {/* Inputs Grid */}
                      <View style={styles.desktopGrid2}>
                        {/* Electricity */}
                        <View style={{ backgroundColor: COLORS.bgLight, padding: 12, borderRadius: 10 }}>
                          <Text style={{ fontWeight: '800', color: COLORS.navyDark, marginBottom: 8 }}>⚡ Electricity (Previous: {ePrev})</Text>
                          <Field
                            label="Current Meter Reading (kWh)"
                            value={r.electricityCurrent}
                            onChange={v => setReading(old => ({ ...old, [f.id]: { ...(old[f.id] || {}), electricityCurrent: v } }))}
                            keyboardType="numeric"
                          />
                          <Text style={styles.subText}>Consumption: {eUnits} units = {money(eCost)}</Text>
                        </View>

                        {/* Water */}
                        <View style={{ backgroundColor: COLORS.bgLight, padding: 12, borderRadius: 10 }}>
                          <Text style={{ fontWeight: '800', color: COLORS.navyDark, marginBottom: 8 }}>💧 Water (Previous: {wPrev})</Text>
                          <Field
                            label="Current Meter Reading (kL)"
                            value={r.waterCurrent}
                            onChange={v => setReading(old => ({ ...old, [f.id]: { ...(old[f.id] || {}), waterCurrent: v } }))}
                            keyboardType="numeric"
                          />
                          <Text style={styles.subText}>Consumption: {wUnits} units = {money(wCost)}</Text>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            {/* VIEW 11: STAFF & VENDORS */}
            {tab === 'StaffVendors' && (
              <View>
                <View style={[styles.rowBetween, { marginBottom: 18 }]}>
                  <View>
                    <Text style={styles.viewTitle}>Staff & Preferred Vendors</Text>
                    <Text style={styles.viewSubtitle}>Facility engineers, operations staff, and contracted trade specialists</Text>
                  </View>
                </View>

                {/* Staff Roster */}
                <View style={styles.card}>
                  <Text style={[styles.cardHeaderTitle, { marginBottom: 12 }]}>Internal Operations Team</Text>
                  {staff.map(s => (
                    <View key={s.id} style={styles.tableRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontWeight: '800', color: COLORS.navyDark }}>{s.name} — {s.designation}</Text>
                        <Text style={styles.subText}>📞 {s.phone} · ✉️ {s.email}</Text>
                      </View>
                      <Badge label={s.assignedProperty} type="info" />
                    </View>
                  ))}
                </View>

                {/* Vendors Directory */}
                <View style={[styles.card, { marginTop: 16 }]}>
                  <Text style={[styles.cardHeaderTitle, { marginBottom: 12 }]}>Approved Contractors & Service Partners</Text>
                  {vendors.map(v => (
                    <View key={v.id} style={styles.tableRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontWeight: '800', color: COLORS.navyDark }}>{v.name}</Text>
                        <Text style={styles.subText}>{v.category} · Contact: {v.contactPerson} ({v.phone})</Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Badge label={`★ ${v.rating}`} type="warning" />
                        <Text style={[styles.subText, { marginTop: 4 }]}>Active Contract</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* VIEW 12: TENANT SELF-SERVICE PORTAL */}
            {tab === 'TenantPortal' && (
              <View>
                <View style={[styles.card, { backgroundColor: '#1E293B', marginBottom: 20 }]}>
                  <View style={styles.rowBetween}>
                    <View>
                      <Badge label="RESIDENT SELF-SERVICE PORTAL" type="purple" />
                      <Text style={{ fontSize: 22, fontWeight: '900', color: '#fff', marginTop: 8 }}>Welcome back, Rahul Sharma</Text>
                      <Text style={{ color: COLORS.textSub, marginTop: 4 }}>Unit: Flat 101 · Skyline Residency</Text>
                    </View>
                    <PrimaryButton
                      title="Return to Admin"
                      onPress={() => setTab('Dashboard')}
                      colors={['#475569', '#334155']}
                    />
                  </View>
                </View>

                <View style={styles.desktopGrid2}>
                  {/* Current Rent Status */}
                  <View style={styles.card}>
                    <Text style={styles.cardHeaderTitle}>Your Rental Statement</Text>
                    <View style={{ marginVertical: 14 }}>
                      <Text style={styles.subText}>Billing Cycle: October 2026</Text>
                      <Text style={{ fontSize: 26, fontWeight: '900', color: COLORS.success, marginTop: 4 }}>PAID IN FULL</Text>
                      <Text style={[styles.subText, { marginTop: 4 }]}>Total Invoiced: {money(16225)} · Paid: {money(16225)}</Text>
                    </View>
                    <PrimaryButton
                      title="📄 Download Official Receipt (PDF)"
                      onPress={() => {
                        if (Platform.OS === 'web') window.open(`${API}/api/bills/1/pdf`, '_blank');
                      }}
                    />
                  </View>

                  {/* Submit Maintenance Request */}
                  <View style={styles.card}>
                    <Text style={styles.cardHeaderTitle}>Need Maintenance or Repair?</Text>
                    <Text style={[styles.subText, { marginVertical: 12 }]}>
                      Submit an inquiry directly to the property facility team with priority level.
                    </Text>
                    <PrimaryButton
                      title="🛠️ Request Facility Repair"
                      onPress={() => {
                        setNewTicket({ title: '', category: 'Plumbing', priority: 'Medium', flatId: '1', description: '', assignedTo: 'Rajesh Kumar' });
                        setShowMaintenanceModal(true);
                      }}
                      colors={['#059669', '#10B981']}
                    />
                  </View>
                </View>
              </View>
            )}

            {/* VIEW 13: REPORTS & EXPORTS */}
            {tab === 'Reports' && (
              <View>
                <View style={[styles.rowBetween, { marginBottom: 18 }]}>
                  <View>
                    <Text style={styles.viewTitle}>Business Intelligence & Export</Text>
                    <Text style={styles.viewSubtitle}>Export verified CSV datasets for auditing, accounting, and compliance</Text>
                  </View>
                </View>

                <View style={styles.card}>
                  <Text style={[styles.cardHeaderTitle, { marginBottom: 14 }]}>Available Export Ledgers</Text>
                  <View style={styles.tableRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontWeight: '800', color: COLORS.navyDark }}>Monthly Billing Summary ({month})</Text>
                      <Text style={styles.subText}>Full itemized utility and base rent billing records.</Text>
                    </View>
                    <PrimaryButton title="Export CSV" onPress={() => { if (Platform.OS === 'web') window.open(`${API}/api/export/${month}.csv`, '_blank'); }} />
                  </View>

                  <View style={styles.tableRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontWeight: '800', color: COLORS.navyDark }}>Tenant Directory & KYC Roster</Text>
                      <Text style={styles.subText}>Full resident profiles, emergency contacts, and occupancy.</Text>
                    </View>
                    <PrimaryButton title="Export CSV" onPress={() => { if (Platform.OS === 'web') window.open(`${API}/api/export/tenants.csv`, '_blank'); }} />
                  </View>

                  <View style={styles.tableRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontWeight: '800', color: COLORS.navyDark }}>Maintenance Work Order Logs</Text>
                      <Text style={styles.subText}>Complete history of repairs, contractors, and actual costs.</Text>
                    </View>
                    <PrimaryButton title="Export CSV" onPress={() => { if (Platform.OS === 'web') window.open(`${API}/api/export/maintenance.csv`, '_blank'); }} />
                  </View>
                </View>
              </View>
            )}

            {/* VIEW 14: SETTINGS & TARIFFS */}
            {tab === 'Settings' && (
              <View>
                <View style={[styles.rowBetween, { marginBottom: 18 }]}>
                  <View>
                    <Text style={styles.viewTitle}>System & Utility Tariff Settings</Text>
                    <Text style={styles.viewSubtitle}>Configure unit tariffs, property identity, and review audit trail</Text>
                  </View>
                  <PrimaryButton
                    title="Save Tariffs"
                    onPress={() => {
                      action(
                        () => api('/api/settings', {
                          method: 'PUT',
                          body: JSON.stringify({
                            electricityRate: Number(settings.electricityRate),
                            waterRate: Number(settings.waterRate),
                            garbageAmount: Number(settings.garbageAmount),
                            propertyName: settings.propertyName
                          })
                        }),
                        'Tariffs updated successfully'
                      );
                    }}
                  />
                </View>

                <View style={styles.card}>
                  <Text style={[styles.cardHeaderTitle, { marginBottom: 14 }]}>Utility Rate Configuration</Text>
                  <Field label="Portfolio / Property Name" value={settings.propertyName} onChange={v => setSettings(s => ({ ...s, propertyName: v }))} />
                  <Field label="Electricity Rate (₹ per kWh)" value={settings.electricityRate} onChange={v => setSettings(s => ({ ...s, electricityRate: v }))} keyboardType="numeric" />
                  <Field label="Water Rate (₹ per kL)" value={settings.waterRate} onChange={v => setSettings(s => ({ ...s, waterRate: v }))} keyboardType="numeric" />
                  <Field label="Fixed Sanitation Charge (₹ per Flat)" value={settings.garbageAmount} onChange={v => setSettings(s => ({ ...s, garbageAmount: v }))} keyboardType="numeric" />
                </View>

                {/* Audit Logs */}
                <View style={[styles.card, { marginTop: 18 }]}>
                  <Text style={[styles.cardHeaderTitle, { marginBottom: 12 }]}>Security Audit Trail</Text>
                  {auditLogs.slice(0, 6).map(log => (
                    <View key={log.id} style={styles.tableRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontWeight: '800', color: COLORS.navyDark }}>{log.action} — {log.user}</Text>
                        <Text style={styles.subText}>{log.details} · IP: {log.ip}</Text>
                      </View>
                      <Text style={styles.subText}>{new Date(log.timestamp).toLocaleTimeString()}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            <View style={{ height: 60 }} />
          </ScrollView>

          {/* Mobile Bottom Navigation Bar */}
          {!desktop && (
            <View style={styles.mobileBottomNav}>
              {[
                { key: 'Dashboard', label: 'Overview', icon: '📊' },
                { key: 'Properties', label: 'Props', icon: '🏢' },
                { key: 'Units', label: 'Units', icon: '▦' },
                { key: 'Tenants', label: 'Tenants', icon: '👥' },
                { key: 'Billing', label: 'Invoices', icon: '💳' },
                { key: 'Maintenance', label: 'Repairs', icon: '🛠️' },
                { key: 'Settings', label: 'More', icon: '⚙️' }
              ].map(item => {
                const active = tab === item.key;
                return (
                  <TouchableOpacity
                    key={item.key}
                    onPress={() => setTab(item.key)}
                    style={styles.mobileTabItem}
                  >
                    <Text style={{ fontSize: 17 }}>{item.icon}</Text>
                    <Text style={[styles.mobileTabLabel, active && styles.mobileTabLabelActive]}>{item.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
      </View>

      {/* --- REUSABLE MODALS --- */}

      {/* Modal 1: Add/Edit Unit */}
      <Modal visible={showFlatModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{editingFlat ? 'Edit Unit Details' : 'Register New Unit'}</Text>
            <Field label="Unit / Flat Number" value={flatForm.flatNumber} onChange={v => setFlatForm(f => ({ ...f, flatNumber: v }))} placeholder="e.g. 301" />
            <Field label="Tenant Full Name" value={flatForm.tenantName} onChange={v => setFlatForm(f => ({ ...f, tenantName: v }))} placeholder="Leave empty if vacant" />
            <Field label="Tenant Phone" value={flatForm.phone} onChange={v => setFlatForm(f => ({ ...f, phone: v }))} placeholder="+91 98765 00000" />
            <Field label="Base Monthly Rent (₹)" value={flatForm.monthlyRent} onChange={v => setFlatForm(f => ({ ...f, monthlyRent: v }))} keyboardType="numeric" />
            <Field label="Opening Electricity Meter" value={flatForm.electricityReading} onChange={v => setFlatForm(f => ({ ...f, electricityReading: v }))} keyboardType="numeric" />
            <Field label="Opening Water Meter" value={flatForm.waterReading} onChange={v => setFlatForm(f => ({ ...f, waterReading: v }))} keyboardType="numeric" />
            <View style={[styles.row, { justifyContent: 'flex-end', marginTop: 14, gap: 10 }]}>
              <TouchableOpacity onPress={() => setShowFlatModal(false)} style={styles.cancelButton}><Text style={styles.cancelButtonText}>Cancel</Text></TouchableOpacity>
              <PrimaryButton title={editingFlat ? 'Update Unit' : 'Save Unit'} onPress={saveFlat} />
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal 2: Add Property */}
      <Modal visible={showPropertyModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Add New Property</Text>
            <Field label="Property Name" value={newProperty.name} onChange={v => setNewProperty(p => ({ ...p, name: v }))} placeholder="e.g. Palm Meadows" />
            <Field label="Property Type" value={newProperty.type} onChange={v => setNewProperty(p => ({ ...p, type: v }))} placeholder="Residential Complex" />
            <Field label="Full Address" value={newProperty.address} onChange={v => setNewProperty(p => ({ ...p, address: v }))} placeholder="City, State, Pincode" />
            <Field label="Property Manager" value={newProperty.manager} onChange={v => setNewProperty(p => ({ ...p, manager: v }))} placeholder="Manager name" />
            <Field label="Total Planned Units" value={newProperty.totalUnits} onChange={v => setNewProperty(p => ({ ...p, totalUnits: v }))} keyboardType="numeric" />
            <View style={[styles.row, { justifyContent: 'flex-end', marginTop: 14, gap: 10 }]}>
              <TouchableOpacity onPress={() => setShowPropertyModal(false)} style={styles.cancelButton}><Text style={styles.cancelButtonText}>Cancel</Text></TouchableOpacity>
              <PrimaryButton title="Save Property" onPress={saveProperty} />
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal 3: Add Resident */}
      <Modal visible={showTenantModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Register New Resident</Text>
            <Field label="Full Name" value={newTenant.name} onChange={v => setNewTenant(t => ({ ...t, name: v }))} />
            <Field label="Email Address" value={newTenant.email} onChange={v => setNewTenant(t => ({ ...t, email: v }))} keyboardType="email-address" />
            <Field label="Phone Number" value={newTenant.phone} onChange={v => setNewTenant(t => ({ ...t, phone: v }))} />
            <Field label="Assigned Unit ID" value={newTenant.flatId} onChange={v => setNewTenant(t => ({ ...t, flatId: v }))} placeholder="e.g. 4 for Flat 202" />
            <Field label="Emergency Contact (Name & Phone)" value={newTenant.emergencyContact} onChange={v => setNewTenant(t => ({ ...t, emergencyContact: v }))} />
            <Field label="Vehicle Registration No." value={newTenant.vehicle} onChange={v => setNewTenant(t => ({ ...t, vehicle: v }))} />
            <View style={[styles.row, { justifyContent: 'flex-end', marginTop: 14, gap: 10 }]}>
              <TouchableOpacity onPress={() => setShowTenantModal(false)} style={styles.cancelButton}><Text style={styles.cancelButtonText}>Cancel</Text></TouchableOpacity>
              <PrimaryButton title="Register Resident" onPress={saveTenant} />
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal 4: Maintenance Work Order */}
      <Modal visible={showMaintenanceModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>New Work Order Request</Text>
            <Field label="Issue Title" value={newTicket.title} onChange={v => setNewTicket(t => ({ ...t, title: v }))} placeholder="e.g. Main bathroom leak" />
            <Field label="Category" value={newTicket.category} onChange={v => setNewTicket(t => ({ ...t, category: v }))} placeholder="Plumbing / Electrical / HVAC" />
            <Field label="Priority (Low / Medium / High / Emergency)" value={newTicket.priority} onChange={v => setNewTicket(t => ({ ...t, priority: v }))} />
            <Field label="Unit Number" value={newTicket.flatId} onChange={v => setNewTicket(t => ({ ...t, flatId: v }))} placeholder="e.g. 101" />
            <Field label="Description & Notes" value={newTicket.description} onChange={v => setNewTicket(t => ({ ...t, description: v }))} multiline />
            <View style={[styles.row, { justifyContent: 'flex-end', marginTop: 14, gap: 10 }]}>
              <TouchableOpacity onPress={() => setShowMaintenanceModal(false)} style={styles.cancelButton}><Text style={styles.cancelButtonText}>Cancel</Text></TouchableOpacity>
              <PrimaryButton title="Submit Request" onPress={saveMaintenanceTicket} />
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal 5: Record Payment */}
      <Modal visible={showPaymentModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Record Rental Payment</Text>
            <Text style={[styles.subText, { marginBottom: 12 }]}>
              Unit: Flat {paymentBill?.flatNumber} · Resident: {paymentBill?.tenantName}
            </Text>
            <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.navyDark, marginBottom: 4 }}>
              Outstanding Balance: {money(paymentBill?.balance)}
            </Text>
            <Field label="Payment Amount (₹)" value={paymentAmount} onChange={setPaymentAmount} keyboardType="numeric" />
            <Field label="Payment Method (UPI, CASH, BANK TRANSFER, CHEQUE, OTHER)" value={paymentMethod} onChange={setPaymentMethod} />
            <Field label="Payment Date (YYYY-MM-DD)" value={paymentDate} onChange={setPaymentDate} />
            <View style={[styles.row, { justifyContent: 'flex-end', marginTop: 14, gap: 10 }]}>
              <TouchableOpacity onPress={() => setShowPaymentModal(false)} style={styles.cancelButton}><Text style={styles.cancelButtonText}>Cancel</Text></TouchableOpacity>
              <PrimaryButton title="Confirm Payment" onPress={recordPayment} />
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal 6: Record Expense */}
      <Modal visible={showExpenseModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Record Operating Expense</Text>
            <Field label="Expense Category" value={newExpense.category} onChange={v => setNewExpense(e => ({ ...e, category: v }))} placeholder="Utilities / Maintenance / Security" />
            <Field label="Description" value={newExpense.description} onChange={v => setNewExpense(e => ({ ...e, description: v }))} placeholder="e.g. Lift AMC servicing" />
            <Field label="Amount (₹)" value={newExpense.amount} onChange={v => setNewExpense(e => ({ ...e, amount: v }))} keyboardType="numeric" />
            <Field label="Vendor / Payee" value={newExpense.vendor} onChange={v => setNewExpense(e => ({ ...e, vendor: v }))} placeholder="Vendor name" />
            <View style={[styles.row, { justifyContent: 'flex-end', marginTop: 14, gap: 10 }]}>
              <TouchableOpacity onPress={() => setShowExpenseModal(false)} style={styles.cancelButton}><Text style={styles.cancelButtonText}>Cancel</Text></TouchableOpacity>
              <PrimaryButton title="Save Expense" onPress={saveExpense} />
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal 7: Notifications Center */}
      <Modal visible={showNotificationsModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxHeight: '80%' }]}>
            <View style={[styles.rowBetween, { marginBottom: 14 }]}>
              <Text style={styles.modalTitle}>Notification Center</Text>
              <TouchableOpacity
                onPress={() => {
                  action(() => api('/api/notifications/mark-all-read', { method: 'POST' }), 'All notifications marked read');
                }}
              >
                <Text style={styles.linkText}>Mark all read</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 380 }}>
              {notifications.map(n => (
                <View key={n.id} style={[styles.notificationItem, !n.read && { backgroundColor: COLORS.skyLight }]}>
                  <Text style={{ fontWeight: '800', color: COLORS.navyDark }}>{n.title}</Text>
                  <Text style={[styles.subText, { marginTop: 2 }]}>{n.message}</Text>
                  <Text style={[styles.subText, { marginTop: 4, fontSize: 11 }]}>{n.date}</Text>
                </View>
              ))}
            </ScrollView>
            <View style={[styles.row, { justifyContent: 'flex-end', marginTop: 14 }]}>
              <PrimaryButton title="Close" onPress={() => setShowNotificationsModal(false)} />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fullScreen: { flex: 1, backgroundColor: COLORS.bgLight },
  centerScreen: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.bgLight, padding: 20 },
  row: { flexDirection: 'row', alignItems: 'center' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },

  // Typography
  heading: { fontSize: 24, fontWeight: '900', color: COLORS.navyDark },
  subText: { fontSize: 12, color: COLORS.textMuted },
  viewTitle: { fontSize: 22, fontWeight: '900', color: COLORS.navyDark },
  viewSubtitle: { fontSize: 13, color: COLORS.textMuted, marginTop: 2 },
  cardHeaderTitle: { fontSize: 16, fontWeight: '800', color: COLORS.navyDark },
  linkText: { fontSize: 12, fontWeight: '700', color: COLORS.primaryBlue },

  // Inputs & Buttons
  fieldLabel: { fontSize: 12, fontWeight: '700', color: COLORS.textMain, marginBottom: 6 },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
    color: COLORS.textMain
  },
  button: { borderRadius: 8, paddingHorizontal: 16, paddingVertical: 10, alignItems: 'center', justifyContent: 'center' },
  buttonText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },
  cancelButton: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border },
  cancelButtonText: { color: COLORS.textMuted, fontWeight: '700', fontSize: 13 },
  actionPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, backgroundColor: COLORS.skyLight },

  // Cards
  card: {
    backgroundColor: COLORS.cardWhite,
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#0F172A',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1
  },

  // KPI Grid
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  kpiCard: {
    flex: 1,
    minWidth: 200,
    backgroundColor: COLORS.cardWhite,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#0F172A',
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1
  },
  kpiTitle: { fontSize: 11, fontWeight: '800', color: COLORS.textMuted, letterSpacing: 0.5 },
  kpiIconWrapper: { width: 32, height: 32, borderRadius: 8, backgroundColor: COLORS.bgLight, alignItems: 'center', justifyContent: 'center' },
  kpiIcon: { fontSize: 15 },
  kpiValue: { fontSize: 24, fontWeight: '900', color: COLORS.navyDark, marginTop: 8 },
  kpiSub: { fontSize: 11, color: COLORS.textMuted, marginTop: 4 },

  // Feeds & Tables
  desktopGrid2: { flexDirection: Platform.OS === 'web' ? 'row' : 'column', gap: 16 },
  paymentFeedItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  ticketFeedItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  tableRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },

  // Top Header
  topHeader: {
    height: 60,
    backgroundColor: COLORS.cardWhite,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20
  },
  searchBarWrapper: { flex: 1, maxWidth: 420, backgroundColor: COLORS.bgLight, borderRadius: 8, paddingHorizontal: 12 },
  searchBarInput: { height: 36, fontSize: 13, color: COLORS.textMain },
  monthBadgeWrapper: { backgroundColor: COLORS.skyLight, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 },
  headerIconButton: { width: 36, height: 36, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  unreadBadge: { position: 'absolute', top: -4, right: -4, backgroundColor: COLORS.danger, borderRadius: 8, paddingHorizontal: 4, paddingVertical: 1 },
  portalToggle: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: COLORS.primaryBlue },

  // Sidebar (Navy Theme)
  sidebar: { width: 250, backgroundColor: COLORS.navyDark, paddingHorizontal: 16, paddingVertical: 20 },
  sidebarHeader: { marginBottom: 24, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: COLORS.borderDark },
  sidebarLogoIcon: { width: 34, height: 34, borderRadius: 8, backgroundColor: COLORS.primaryBlue, alignItems: 'center', justifyContent: 'center' },
  sidebarBrandTitle: { fontSize: 20, fontWeight: '900', color: '#FFFFFF' },
  sidebarBadge: { fontSize: 8, fontWeight: '800', color: COLORS.skyBlue, letterSpacing: 1 },
  sidebarTagline: { fontSize: 10, color: COLORS.textSub, marginTop: 8, fontWeight: '600' },
  navSectionHeader: { fontSize: 10, fontWeight: '800', color: '#64748B', letterSpacing: 1, marginBottom: 8, marginTop: 4, paddingHorizontal: 10 },
  navItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 9, paddingHorizontal: 10, borderRadius: 8, marginBottom: 2 },
  navItemActive: { backgroundColor: '#1E3A8A' },
  navItemIcon: { fontSize: 14, marginRight: 10 },
  navItemText: { fontSize: 13, fontWeight: '600', color: '#CBD5E1' },
  navItemTextActive: { color: '#FFFFFF', fontWeight: '800' },
  sidebarFooter: { marginTop: 'auto', paddingTop: 14, borderTopWidth: 1, borderTopColor: COLORS.borderDark },

  // Brand Row (Auth)
  brandRow: { flexDirection: 'row', alignItems: 'center' },
  brandBadge: { width: 44, height: 44, borderRadius: 10, backgroundColor: COLORS.navyDark, alignItems: 'center', justifyContent: 'center' },

  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.65)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalCard: { width: '100%', maxWidth: 480, backgroundColor: '#FFFFFF', borderRadius: 16, padding: 24, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 16, elevation: 5 },
  modalTitle: { fontSize: 18, fontWeight: '900', color: COLORS.navyDark, marginBottom: 14 },
  notificationItem: { padding: 12, borderRadius: 8, marginBottom: 8, borderWidth: 1, borderColor: COLORS.border },
  mobileBottomNav: {
    height: 60,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 4,
    paddingBottom: 2
  },
  mobileTabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4
  },
  mobileTabLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textMuted,
    marginTop: 2
  },
  mobileTabLabelActive: {
    color: COLORS.primaryBlue,
    fontWeight: '800'
  },
  mobileVersionPill: {
    backgroundColor: COLORS.navyDark,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 6
  }
});
