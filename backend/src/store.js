'use strict';
const fs = require('fs');
const path = require('path');
const db = require('./db');

function getFile() {
  return process.env.RENTPRO_DATA_FILE || path.join(__dirname, '..', 'data.json');
}

const defaultSettings = {
  electricityRate: 8,
  waterRate: 30,
  garbageAmount: 125,
  propertyName: 'RentPro Enterprise Properties',
  currency: 'INR',
  currencySymbol: '₹',
  taxRate: 0,
  lateFeePercentage: 2
};

const state = {
  properties: [],
  flats: [],
  tenants: [],
  leases: [],
  bills: [],
  maintenance: [],
  accounting: [],
  staff: [],
  vendors: [],
  documents: [],
  notifications: [],
  auditLogs: [],
  settings: { ...defaultSettings },
  nextPropertyId: 1,
  nextFlatId: 1,
  nextTenantId: 1,
  nextLeaseId: 1,
  nextBillId: 1,
  nextMaintenanceId: 1,
  nextTransactionId: 1,
  nextStaffId: 1,
  nextVendorId: 1,
  nextDocumentId: 1,
  nextNotificationId: 1,
  nextAuditLogId: 1
};

function ensureEnterpriseSeeds() {
  // If properties are empty, seed primary property
  if (!Array.isArray(state.properties) || state.properties.length === 0) {
    state.properties = [
      {
        id: 1,
        code: 'PROP-01',
        name: 'Skyline Residency',
        type: 'Residential Complex',
        address: '42 MG Road, Central Business District, Bengaluru, Karnataka 560001',
        manager: 'Meenakshi Sundaram',
        buildings: 1,
        floors: 2,
        totalUnits: state.flats.length || 4,
        status: 'Active',
        description: 'Prime urban residential tower featuring modern 2BHK/3BHK units with dedicated utility meters.'
      },
      {
        id: 2,
        code: 'PROP-02',
        name: 'Greenwood Palms',
        type: 'Gated Luxury Villas',
        address: '88 ITPL Main Road, Whitefield, Bengaluru 560066',
        manager: 'Rajesh Kumar',
        buildings: 2,
        floors: 3,
        totalUnits: 6,
        status: 'Active',
        description: 'Suburban gated villa enclave with private gardens and automated billing.'
      }
    ];
    state.nextPropertyId = 3;
  }

  // Ensure each flat is linked to a property and has unit metadata
  state.flats.forEach(flat => {
    if (!flat.propertyId) flat.propertyId = 1;
    if (!flat.type) flat.type = '2BHK Apartment';
    if (!flat.floor) flat.floor = flat.flatNumber.startsWith('1') ? 1 : 2;
    if (!flat.status) flat.status = flat.occupied ? 'Occupied' : 'Vacant Ready';
    if (!flat.securityDeposit) flat.securityDeposit = flat.monthlyRent * 3;
    if (!flat.bedrooms) flat.bedrooms = 2;
    if (!flat.bathrooms) flat.bathrooms = 2;
    if (!flat.squareFeet) flat.squareFeet = 1150;
  });

  // If tenants are empty, seed from occupied flats
  if (!Array.isArray(state.tenants) || state.tenants.length === 0) {
    state.tenants = [
      {
        id: 1,
        name: 'Rahul Sharma',
        email: 'rahul.sharma@example.com',
        phone: '+91 98765 43210',
        flatId: 1,
        flatNumber: '101',
        propertyId: 1,
        status: 'Active Resident',
        emergencyContact: 'Sunita Sharma (+91 98765 00001)',
        vehicle: 'KA-01-MJ-1234 (Sedan)',
        kycStatus: 'Verified',
        registrationDate: '2026-01-01',
        notes: 'Software engineer at Global Tech. Prompt on rent payments.'
      },
      {
        id: 2,
        name: 'Priya Nair',
        email: 'priya.nair@example.com',
        phone: '+91 98123 45678',
        flatId: 2,
        flatNumber: '102',
        propertyId: 1,
        status: 'Active Resident',
        emergencyContact: 'K. Nair (+91 98123 00002)',
        vehicle: 'KA-03-AB-9876 (Two-wheeler)',
        kycStatus: 'Verified',
        registrationDate: '2026-03-01',
        notes: 'Senior product manager. Registered pet (Golden Retriever).'
      },
      {
        id: 3,
        name: 'Anand Verma',
        email: 'anand.verma@example.com',
        phone: '+91 97654 32109',
        flatId: 3,
        flatNumber: '201',
        propertyId: 1,
        status: 'Active Resident',
        emergencyContact: 'Ritu Verma (+91 97654 00003)',
        vehicle: 'KA-05-EX-4422 (Hatchback)',
        kycStatus: 'Verified',
        registrationDate: '2026-06-01',
        notes: 'Principal Architect at Studio Design.'
      },
      {
        id: 4,
        name: 'Vikram Malhotra',
        email: 'vikram.m@example.com',
        phone: '+91 98450 77889',
        flatId: null,
        flatNumber: null,
        propertyId: 1,
        status: 'Applicant',
        emergencyContact: 'Rohan Malhotra (+91 98450 00004)',
        vehicle: 'KA-04-ZZ-5555',
        kycStatus: 'Pending Review',
        registrationDate: '2026-11-01',
        notes: 'Application submitted for Flat 202. Credit background check in progress.'
      }
    ];
    state.nextTenantId = 5;
  }

  // If leases are empty, seed active leases
  if (!Array.isArray(state.leases) || state.leases.length === 0) {
    state.leases = [
      {
        id: 1,
        leaseNumber: 'LSE-2026-101',
        propertyId: 1,
        propertyName: 'Skyline Residency',
        flatId: 1,
        flatNumber: '101',
        tenantId: 1,
        tenantName: 'Rahul Sharma',
        startDate: '2026-01-01',
        endDate: '2026-12-31',
        monthlyRent: 15000,
        securityDeposit: 45000,
        paymentDueDate: 5,
        status: 'Active',
        renewalTerms: '5% annual escalation upon renewal',
        daysUntilExpiry: 48
      },
      {
        id: 2,
        leaseNumber: 'LSE-2026-102',
        propertyId: 1,
        propertyName: 'Skyline Residency',
        flatId: 2,
        flatNumber: '102',
        tenantId: 2,
        tenantName: 'Priya Nair',
        startDate: '2026-03-01',
        endDate: '2027-02-28',
        monthlyRent: 18000,
        securityDeposit: 54000,
        paymentDueDate: 5,
        status: 'Active',
        renewalTerms: '6% annual escalation upon renewal',
        daysUntilExpiry: 107
      },
      {
        id: 3,
        leaseNumber: 'LSE-2026-201',
        propertyId: 1,
        propertyName: 'Skyline Residency',
        flatId: 3,
        flatNumber: '201',
        tenantId: 3,
        tenantName: 'Anand Verma',
        startDate: '2026-06-01',
        endDate: '2027-05-31',
        monthlyRent: 14000,
        securityDeposit: 42000,
        paymentDueDate: 5,
        status: 'Active',
        renewalTerms: '5% annual escalation upon renewal',
        daysUntilExpiry: 199
      }
    ];
    state.nextLeaseId = 4;
  }

  // Maintenance work orders
  if (!Array.isArray(state.maintenance) || state.maintenance.length === 0) {
    state.maintenance = [
      {
        id: 1,
        ticketNumber: 'MNT-2026-001',
        propertyId: 1,
        propertyName: 'Skyline Residency',
        flatId: 1,
        flatNumber: '101',
        tenantName: 'Rahul Sharma',
        title: 'Water heater thermostat inspection',
        category: 'Electrical',
        priority: 'High',
        status: 'In Progress',
        assignedTo: 'Rajesh Kumar (Technician)',
        estimatedCost: 1200,
        actualCost: 0,
        createdAt: '2026-11-02',
        description: 'Master bathroom geyser thermostat tripping breaker during morning peak.'
      },
      {
        id: 2,
        ticketNumber: 'MNT-2026-002',
        propertyId: 1,
        propertyName: 'Skyline Residency',
        flatId: 2,
        flatNumber: '102',
        tenantName: 'Priya Nair',
        title: 'AC master bedroom filter service',
        category: 'HVAC',
        priority: 'Medium',
        status: 'Completed',
        assignedTo: 'CoolAir Facility Solutions',
        estimatedCost: 850,
        actualCost: 850,
        createdAt: '2026-10-18',
        completedAt: '2026-10-20',
        description: 'Seasonal AC deep antibacterial coil clean and fresh gas top-up.'
      },
      {
        id: 3,
        ticketNumber: 'MNT-2026-003',
        propertyId: 1,
        propertyName: 'Skyline Residency',
        flatId: 3,
        flatNumber: '201',
        tenantName: 'Anand Verma',
        title: 'Balcony sliding door track alignment',
        category: 'Carpentry',
        priority: 'Low',
        status: 'Scheduled',
        assignedTo: 'Suresh Woodworks',
        estimatedCost: 400,
        actualCost: 0,
        createdAt: '2026-11-08',
        description: 'Balcony aluminum mosquito mesh sliding panel sticking on track.'
      },
      {
        id: 4,
        ticketNumber: 'MNT-2026-004',
        propertyId: 1,
        propertyName: 'Skyline Residency',
        flatId: 4,
        flatNumber: '202',
        tenantName: 'Vacant Unit',
        title: 'Turnover paint touch-up & deep polish',
        category: 'Turnover',
        priority: 'Medium',
        status: 'Completed',
        assignedTo: 'QuickPlumb & Painting Co',
        estimatedCost: 2500,
        actualCost: 2500,
        createdAt: '2026-10-25',
        completedAt: '2026-10-28',
        description: 'Full turnover wall clean, fresh coat, and deep polish for new tenant move-in.'
      }
    ];
    state.nextMaintenanceId = 5;
  }

  // Accounting & transactions
  if (!Array.isArray(state.accounting) || state.accounting.length === 0) {
    state.accounting = [
      {
        id: 1,
        type: 'Expense',
        category: 'Utilities',
        propertyId: 1,
        description: 'Common area lighting & elevator power consumption (BESCOM)',
        amount: 3200,
        date: '2026-10-15',
        vendor: 'BESCOM Electricity Board',
        paymentMethod: 'Net Banking',
        status: 'Cleared'
      },
      {
        id: 2,
        type: 'Expense',
        category: 'Maintenance',
        propertyId: 1,
        description: 'Elevator monthly safety preventative AMC inspection & servicing',
        amount: 2500,
        date: '2026-10-20',
        vendor: 'Otis Elevators India',
        paymentMethod: 'Bank Transfer',
        status: 'Cleared'
      },
      {
        id: 3,
        type: 'Expense',
        category: 'Security',
        propertyId: 1,
        description: '24/7 Security guarding and CCTV perimeter monitoring service',
        amount: 6500,
        date: '2026-10-25',
        vendor: 'SafeGuard Security Solutions',
        paymentMethod: 'Cheque',
        status: 'Cleared'
      },
      {
        id: 4,
        type: 'Liability',
        category: 'Security Deposit',
        propertyId: 1,
        description: 'Tenant security deposit held in trust escrow (Flat 101, 102, 201)',
        amount: 141000,
        date: '2026-06-01',
        vendor: 'Rental Trust Escrow',
        paymentMethod: 'Bank Transfer',
        status: 'Held'
      }
    ];
    state.nextTransactionId = 5;
  }

  // Staff
  if (!Array.isArray(state.staff) || state.staff.length === 0) {
    state.staff = [
      {
        id: 1,
        name: 'Rajesh Kumar',
        designation: 'Chief Maintenance Technician',
        phone: '+91 98450 11223',
        email: 'rajesh.tech@rentpro.internal',
        assignedProperty: 'Skyline Residency',
        status: 'Active',
        role: 'Technician'
      },
      {
        id: 2,
        name: 'Meenakshi Sundaram',
        designation: 'Senior Property Operations Manager',
        phone: '+91 98450 99881',
        email: 'meenakshi.mgr@rentpro.internal',
        assignedProperty: 'All Properties',
        status: 'Active',
        role: 'Manager'
      }
    ];
    state.nextStaffId = 3;
  }

  // Vendors
  if (!Array.isArray(state.vendors) || state.vendors.length === 0) {
    state.vendors = [
      {
        id: 1,
        name: 'CoolAir Facility Solutions',
        category: 'HVAC & Air Conditioning',
        contactPerson: 'Amit Saxena',
        phone: '+91 98200 44556',
        rating: 4.8,
        status: 'Preferred',
        contractUntil: '2027-03-31'
      },
      {
        id: 2,
        name: 'QuickPlumb & Sanitation Co',
        category: 'Plumbing & Drainage',
        contactPerson: 'Ganesh Rao',
        phone: '+91 98200 77889',
        rating: 4.9,
        status: 'Active',
        contractUntil: '2027-01-31'
      },
      {
        id: 3,
        name: 'SafeGuard Security Solutions',
        category: 'Guarding & Surveillance',
        contactPerson: 'Vikrant Singh',
        phone: '+91 98200 11223',
        rating: 4.7,
        status: 'Active',
        contractUntil: '2026-12-31'
      }
    ];
    state.nextVendorId = 4;
  }

  // Documents
  if (!Array.isArray(state.documents) || state.documents.length === 0) {
    state.documents = [
      {
        id: 1,
        title: 'Standard Residential Tenancy Agreement 2026',
        category: 'Lease Templates',
        fileSize: '245 KB',
        uploadedAt: '2026-01-10',
        format: 'PDF',
        isPublic: false
      },
      {
        id: 2,
        title: 'Skyline Residency Fire Safety & Lift NOC',
        category: 'Compliance & Safety',
        fileSize: '1.2 MB',
        uploadedAt: '2026-02-15',
        format: 'PDF',
        isPublic: false
      },
      {
        id: 3,
        title: 'Community Guidelines & Parking By-Laws',
        category: 'Resident Handbook',
        fileSize: '180 KB',
        uploadedAt: '2026-03-01',
        format: 'PDF',
        isPublic: true
      }
    ];
    state.nextDocumentId = 4;
  }

  // Notifications
  if (!Array.isArray(state.notifications) || state.notifications.length === 0) {
    state.notifications = [
      {
        id: 1,
        title: 'October Invoices Generated',
        message: 'Monthly billing run for Skyline Residency finalized and published.',
        date: '2026-10-31',
        type: 'billing',
        read: true
      },
      {
        id: 2,
        title: 'UPI Payment Received',
        message: '₹16,225 paid by Rahul Sharma for Flat 101 via UPI.',
        date: '2026-11-01',
        type: 'payment',
        read: true
      },
      {
        id: 3,
        title: 'Work Order Active',
        message: 'MNT-2026-001 (Water heater thermostat) assigned to Rajesh Kumar.',
        date: '2026-11-02',
        type: 'maintenance',
        read: false
      },
      {
        id: 4,
        title: 'Lease Expiry Notice (48 Days)',
        message: 'Lease for Flat 101 (Rahul Sharma) expires on 2026-12-31. Renewal pending.',
        date: '2026-11-13',
        type: 'lease',
        read: false
      }
    ];
    state.nextNotificationId = 5;
  }

  // Audit Logs
  if (!Array.isArray(state.auditLogs) || state.auditLogs.length === 0) {
    state.auditLogs = [
      {
        id: 1,
        timestamp: new Date().toISOString(),
        user: 'Owner / System Admin',
        action: 'System Upgrade',
        details: 'RentPro Enterprise Edition Schema Initialized with multi-property support',
        ip: '127.0.0.1'
      }
    ];
    state.nextAuditLogId = 2;
  }
}

function load() {
  try {
    const file = getFile();
    if (fs.existsSync(file)) {
      const data = JSON.parse(fs.readFileSync(file, 'utf8'));
      state.properties = data.properties || [];
      state.flats = data.flats || [];
      state.tenants = data.tenants || [];
      state.leases = data.leases || [];
      state.bills = data.bills || [];
      state.maintenance = data.maintenance || [];
      state.accounting = data.accounting || [];
      state.staff = data.staff || [];
      state.vendors = data.vendors || [];
      state.documents = data.documents || [];
      state.notifications = data.notifications || [];
      state.auditLogs = data.auditLogs || [];
      state.settings = { ...defaultSettings, ...(data.settings || {}) };

      state.nextPropertyId = data.nextPropertyId || 1;
      state.nextFlatId = data.nextFlatId || 1;
      state.nextTenantId = data.nextTenantId || 1;
      state.nextLeaseId = data.nextLeaseId || 1;
      state.nextBillId = data.nextBillId || 1;
      state.nextMaintenanceId = data.nextMaintenanceId || 1;
      state.nextTransactionId = data.nextTransactionId || 1;
      state.nextStaffId = data.nextStaffId || 1;
      state.nextVendorId = data.nextVendorId || 1;
      state.nextDocumentId = data.nextDocumentId || 1;
      state.nextNotificationId = data.nextNotificationId || 1;
      state.nextAuditLogId = data.nextAuditLogId || 1;
    }
    // Automatically verify and seed enterprise modules if they don't exist
    ensureEnterpriseSeeds();
  } catch (e) {
    throw new Error(`Could not read data file: ${e.message}`);
  }
}

function save() {
  const file = getFile();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(state, null, 2));
  if (db && db.isConnected && db.isConnected()) {
    db.syncToMongo(state).catch(err => {
      console.error('[RentPro Database] Background MongoDB sync error:', err.message);
    });
  }
}

async function initDB() {
  try {
    const conn = await db.connectDB();
    if (db.isConnected()) {
      await db.loadFromMongo(state);
    }
    return conn;
  } catch (error) {
    console.warn('[RentPro Database] Error initializing MongoDB:', error.message);
    return null;
  }
}

function logAudit(user, action, details, ip = '127.0.0.1') {
  const entry = {
    id: state.nextAuditLogId++,
    timestamp: new Date().toISOString(),
    user: user || 'System Admin',
    action,
    details,
    ip
  };
  state.auditLogs.unshift(entry);
  if (state.auditLogs.length > 500) state.auditLogs.pop();
  save();
  return entry;
}

function resetForTests() {
  state.properties = [];
  state.flats = [];
  state.tenants = [];
  state.leases = [];
  state.bills = [];
  state.maintenance = [];
  state.accounting = [];
  state.staff = [];
  state.vendors = [];
  state.documents = [];
  state.notifications = [];
  state.auditLogs = [];
  state.settings = { ...defaultSettings };
  state.nextPropertyId = 1;
  state.nextFlatId = 1;
  state.nextTenantId = 1;
  state.nextLeaseId = 1;
  state.nextBillId = 1;
  state.nextMaintenanceId = 1;
  state.nextTransactionId = 1;
  state.nextStaffId = 1;
  state.nextVendorId = 1;
  state.nextDocumentId = 1;
  state.nextNotificationId = 1;
  state.nextAuditLogId = 1;
  save();
}

load();

module.exports = {
  state,
  save,
  logAudit,
  resetForTests,
  load,
  initDB,
  db
};
