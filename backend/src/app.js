'use strict';
const path = require('path');
const dotenv = require('dotenv');

// Load .env from backend directory or repository root if present
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });
dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env') });

const express = require('express');
const cors = require('cors');
const { rateLimit } = require('express-rate-limit');
const { state, save, logAudit, db } = require('./store');
const { calculateBill } = require('./billing');
const { toCsv } = require('./csv');
const PDFDocument = require('pdfkit');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const app = express();
app.use(cors()); app.use(express.json({ limit: '1mb' }));
const fail = (res, status, message) => res.status(status).json({ error: message });
const monthPattern = /^\d{4}-(0[1-9]|1[0-2])$/;

const healthCheckHandler = (_req, res) => {
  const isDbConnected = Array.isArray(state.flats) && Array.isArray(state.bills);
  const mongoInfo = db ? db.getConnectionInfo() : { connected: false, configured: false };
  res.json({
    status: 'ok',
    service: 'RentPro Enterprise API',
    version: '2.0.0-enterprise',
    database: {
      type: mongoInfo.connected ? 'mongodb' : 'json',
      connected: isDbConnected,
      storage: mongoInfo.connected ? 'MongoDB (Cloud / Local)' : 'Persistent JSON File (data.json)',
      mongodb: mongoInfo,
      propertiesCount: (state.properties || []).length,
      flatsCount: state.flats.length,
      tenantsCount: (state.tenants || []).length,
      leasesCount: (state.leases || []).length,
      billsCount: state.bills.length,
      maintenanceCount: (state.maintenance || []).length
    }
  });
};
app.get('/health', healthCheckHandler);
app.get('/api/health', healthCheckHandler);

app.get('/api/database/status', (_req, res) => {
  const mongoInfo = db ? db.getConnectionInfo() : { connected: false, configured: false };
  res.json({
    status: 'ok',
    activeDatabase: mongoInfo.connected ? 'mongodb' : 'json',
    storageEngine: mongoInfo.connected ? 'MongoDB / Mongoose' : 'Local JSON Document Store',
    mongodb: mongoInfo,
    counts: {
      properties: (state.properties || []).length,
      flats: state.flats.length,
      tenants: (state.tenants || []).length,
      leases: (state.leases || []).length,
      bills: state.bills.length,
      maintenance: (state.maintenance || []).length,
      accounting: (state.accounting || []).length,
      staff: (state.staff || []).length,
      vendors: (state.vendors || []).length,
      documents: (state.documents || []).length,
      notifications: (state.notifications || []).length,
      auditLogs: (state.auditLogs || []).length
    }
  });
});

app.post('/api/database/sync', async (_req, res) => {
  if (!db || !db.isConnected()) {
    return fail(res, 503, 'MongoDB is not currently connected. Configure MONGODB_URI in your .env to enable sync.');
  }
  const success = await db.syncToMongo(state);
  if (!success) return fail(res, 500, 'Failed to sync data to MongoDB');
  res.json({ status: 'ok', message: 'Successfully synced all collections to MongoDB' });
});
app.get('/api/auth/config', (_req,res)=>res.json({enabled:process.env.AUTH_ENABLED==='true'}));
app.use('/api/auth/login',rateLimit({windowMs:15*60*1000,limit:10,standardHeaders:'draft-7',legacyHeaders:false,message:{error:'Too many sign-in attempts. Try again in 15 minutes.'}}));
app.post('/api/auth/login', async (req,res)=>{
 if(process.env.AUTH_ENABLED!=='true') return fail(res,503,'Owner authentication is not enabled on this server');
 const {OWNER_EMAIL,OWNER_PASSWORD_HASH,JWT_SECRET}=process.env;
 if(!OWNER_EMAIL||!OWNER_PASSWORD_HASH||!JWT_SECRET||JWT_SECRET.length<32||!(/^\$2[aby]\$\d\d\$/.test(OWNER_PASSWORD_HASH))) return fail(res,503,'Owner authentication is not configured correctly on this server');
 const body=req.body||{};
 const email=String(body.email||'').trim().toLowerCase();
 const password=String(body.password||'');
 if(email!==OWNER_EMAIL.trim().toLowerCase()||!await bcrypt.compare(password,OWNER_PASSWORD_HASH)) return fail(res,401,'Email or password is incorrect');
 const token=jwt.sign({sub:email,role:'Owner/Admin'},JWT_SECRET,{expiresIn:'8h',issuer:'rentpro-api',audience:'rentpro-owner'});
 res.json({token,expiresIn:28800});
});
app.use('/api', (req,res,next)=>{
 if(req.path==='/health'||req.path==='/auth/config'||req.path==='/auth/login'||process.env.AUTH_ENABLED!=='true') return next();
 const secret=process.env.JWT_SECRET;
 if(!secret||secret.length<32) return fail(res,503,'Owner authentication is not configured on this server');
 const match=(req.get('authorization')||'').match(/^Bearer\s+(.+)$/i);
 if(!match) return fail(res,401,'Authentication required');
 try {
  req.owner=jwt.verify(match[1],secret,{issuer:'rentpro-api',audience:'rentpro-owner'});
  next();
 } catch {
  fail(res,401,'Session expired. Please sign in again.');
 }
});
app.get('/api/settings', (_req,res)=>res.json(state.settings));
app.put('/api/settings', (req,res)=>{
 const keys=['electricityRate','waterRate','garbageAmount','propertyName','currencySymbol','lateFeePercentage'];
 for(const k of ['electricityRate','waterRate','garbageAmount']){
   if(req.body[k] !== undefined && (!Number.isFinite(Number(req.body[k])) || Number(req.body[k])<0)) return fail(res,400,`${k} must be non-negative`);
 }
 state.settings={...state.settings,...Object.fromEntries(keys.filter(k=>req.body[k]!==undefined).map(k=>[k,['electricityRate','waterRate','garbageAmount','lateFeePercentage'].includes(k)?Number(req.body[k]):req.body[k]]))};
 save();
 res.json(state.settings);
});

// --- Enterprise Properties ---
app.get('/api/properties', (_req, res) => res.json(state.properties || []));
app.post('/api/properties', (req, res) => {
  const { name, type, address, manager, totalUnits, description } = req.body || {};
  if (!String(name || '').trim()) return fail(res, 400, 'Property name is required');
  const prop = {
    id: state.nextPropertyId++,
    code: `PROP-0${(state.properties || []).length + 1}`,
    name: String(name).trim(),
    type: String(type || 'Residential Complex'),
    address: String(address || ''),
    manager: String(manager || 'Unassigned'),
    buildings: Number(req.body.buildings || 1),
    floors: Number(req.body.floors || 1),
    totalUnits: Number(totalUnits || 0),
    status: 'Active',
    description: String(description || '')
  };
  state.properties = state.properties || [];
  state.properties.push(prop);
  if (logAudit) logAudit(req.owner?.sub, 'Create Property', `Created property ${prop.name}`);
  save();
  res.status(201).json(prop);
});
app.put('/api/properties/:id', (req, res) => {
  const prop = (state.properties || []).find(p => p.id === Number(req.params.id));
  if (!prop) return fail(res, 404, 'Property not found');
  Object.assign(prop, req.body || {});
  if (logAudit) logAudit(req.owner?.sub, 'Update Property', `Updated property ${prop.name}`);
  save();
  res.json(prop);
});

// --- Enterprise Tenants ---
app.get('/api/tenants', (req, res) => {
  let list = state.tenants || [];
  if (req.query.status) list = list.filter(t => t.status === req.query.status);
  res.json(list);
});
app.post('/api/tenants', (req, res) => {
  const { name, email, phone, flatId, status, emergencyContact, vehicle, notes } = req.body || {};
  if (!String(name || '').trim()) return fail(res, 400, 'Tenant name is required');
  const flat = flatId ? state.flats.find(f => f.id === Number(flatId)) : null;
  const tenant = {
    id: state.nextTenantId++,
    name: String(name).trim(),
    email: String(email || ''),
    phone: String(phone || ''),
    flatId: flat ? flat.id : null,
    flatNumber: flat ? flat.flatNumber : null,
    propertyId: flat ? flat.propertyId || 1 : 1,
    status: String(status || (flat ? 'Active Resident' : 'Applicant')),
    emergencyContact: String(emergencyContact || ''),
    vehicle: String(vehicle || ''),
    kycStatus: req.body.kycStatus || 'Pending',
    registrationDate: req.body.registrationDate || new Date().toISOString().slice(0, 10),
    notes: String(notes || '')
  };
  state.tenants = state.tenants || [];
  state.tenants.push(tenant);
  if (flat && !flat.occupied) {
    flat.occupied = true;
    flat.tenantName = tenant.name;
    flat.phone = tenant.phone;
  }
  if (logAudit) logAudit(req.owner?.sub, 'Create Tenant', `Registered tenant ${tenant.name}`);
  save();
  res.status(201).json(tenant);
});
app.put('/api/tenants/:id', (req, res) => {
  const tenant = (state.tenants || []).find(t => t.id === Number(req.params.id));
  if (!tenant) return fail(res, 404, 'Tenant not found');
  Object.assign(tenant, req.body || {});
  if (logAudit) logAudit(req.owner?.sub, 'Update Tenant', `Updated tenant ${tenant.name}`);
  save();
  res.json(tenant);
});

// --- Enterprise Leases ---
app.get('/api/leases', (_req, res) => res.json(state.leases || []));
app.post('/api/leases', (req, res) => {
  const { flatId, tenantId, startDate, endDate, monthlyRent, securityDeposit, renewalTerms } = req.body || {};
  if (!flatId || !tenantId) return fail(res, 400, 'flatId and tenantId are required');
  const activeExisting = (state.leases || []).find(l => l.flatId === Number(flatId) && l.status === 'Active');
  if (activeExisting) return fail(res, 409, `An active lease already exists for this unit (${activeExisting.leaseNumber})`);
  const flat = state.flats.find(f => f.id === Number(flatId));
  const tenant = (state.tenants || []).find(t => t.id === Number(tenantId));
  const lease = {
    id: state.nextLeaseId++,
    leaseNumber: `LSE-${new Date().getFullYear()}-${flat ? flat.flatNumber : state.nextLeaseId}`,
    propertyId: flat ? flat.propertyId || 1 : 1,
    propertyName: 'Skyline Residency',
    flatId: Number(flatId),
    flatNumber: flat ? flat.flatNumber : '',
    tenantId: Number(tenantId),
    tenantName: tenant ? tenant.name : '',
    startDate: String(startDate || new Date().toISOString().slice(0, 10)),
    endDate: String(endDate || ''),
    monthlyRent: Number(monthlyRent || (flat ? flat.monthlyRent : 0)),
    securityDeposit: Number(securityDeposit || (flat ? flat.monthlyRent * 3 : 0)),
    paymentDueDate: Number(req.body.paymentDueDate || 5),
    status: 'Active',
    renewalTerms: String(renewalTerms || '5% annual escalation upon renewal'),
    daysUntilExpiry: 365
  };
  state.leases = state.leases || [];
  state.leases.push(lease);
  if (logAudit) logAudit(req.owner?.sub, 'Create Lease', `Created lease ${lease.leaseNumber}`);
  save();
  res.status(201).json(lease);
});

// --- Enterprise Maintenance & Work Orders ---
app.get('/api/maintenance', (_req, res) => res.json(state.maintenance || []));
app.post('/api/maintenance', (req, res) => {
  const { title, category, priority, flatId, flatNumber, description, estimatedCost, assignedTo } = req.body || {};
  if (!String(title || '').trim()) return fail(res, 400, 'Title is required');
  const ticket = {
    id: state.nextMaintenanceId++,
    ticketNumber: `MNT-2026-${String(state.nextMaintenanceId).padStart(3, '0')}`,
    propertyId: 1,
    propertyName: 'Skyline Residency',
    flatId: flatId ? Number(flatId) : null,
    flatNumber: String(flatNumber || (flatId ? (state.flats.find(f => f.id === Number(flatId))?.flatNumber || '') : 'Common Area')),
    tenantName: req.body.tenantName || 'Resident',
    title: String(title).trim(),
    category: String(category || 'General Repair'),
    priority: String(priority || 'Medium'),
    status: req.body.status || 'Submitted',
    assignedTo: String(assignedTo || 'Unassigned'),
    estimatedCost: Number(estimatedCost || 0),
    actualCost: 0,
    createdAt: new Date().toISOString().slice(0, 10),
    description: String(description || '')
  };
  state.maintenance = state.maintenance || [];
  state.maintenance.push(ticket);
  if (logAudit) logAudit(req.owner?.sub, 'Create Maintenance', `Created ticket ${ticket.ticketNumber}`);
  save();
  res.status(201).json(ticket);
});
app.put('/api/maintenance/:id', (req, res) => {
  const ticket = (state.maintenance || []).find(m => m.id === Number(req.params.id));
  if (!ticket) return fail(res, 404, 'Ticket not found');
  Object.assign(ticket, req.body || {});
  if (req.body.status === 'Completed' && !ticket.completedAt) {
    ticket.completedAt = new Date().toISOString().slice(0, 10);
  }
  if (logAudit) logAudit(req.owner?.sub, 'Update Maintenance', `Updated ticket ${ticket.ticketNumber}`);
  save();
  res.json(ticket);
});

// --- Enterprise Accounting & Ledger ---
app.get('/api/accounting/summary', (_req, res) => {
  const incomeTotal = (state.bills || []).reduce((sum, b) => sum + (b.paidAmount || 0), 0);
  const expenseTotal = (state.accounting || []).filter(t => t.type === 'Expense').reduce((sum, t) => sum + (t.amount || 0), 0);
  const liabilityTotal = (state.accounting || []).filter(t => t.type === 'Liability').reduce((sum, t) => sum + (t.amount || 0), 0);
  res.json({
    totalIncome: incomeTotal,
    totalExpenses: expenseTotal,
    netOperatingIncome: incomeTotal - expenseTotal,
    depositLiabilities: liabilityTotal,
    transactionsCount: (state.accounting || []).length
  });
});
app.get('/api/accounting/transactions', (_req, res) => res.json(state.accounting || []));
app.post('/api/accounting/transactions', (req, res) => {
  const { type, category, description, amount, date, vendor, paymentMethod } = req.body || {};
  if (!Number.isFinite(Number(amount)) || Number(amount) <= 0) return fail(res, 400, 'Valid amount is required');
  const txn = {
    id: state.nextTransactionId++,
    type: String(type || 'Expense'),
    category: String(category || 'General'),
    propertyId: 1,
    description: String(description || ''),
    amount: Number(amount),
    date: String(date || new Date().toISOString().slice(0, 10)),
    vendor: String(vendor || 'Direct'),
    paymentMethod: String(paymentMethod || 'Net Banking'),
    status: 'Cleared'
  };
  state.accounting = state.accounting || [];
  state.accounting.push(txn);
  if (logAudit) logAudit(req.owner?.sub, 'Create Transaction', `Recorded ${txn.type} of ₹${txn.amount}`);
  save();
  res.status(201).json(txn);
});

// --- Staff & Vendors ---
app.get('/api/staff', (_req, res) => res.json(state.staff || []));
app.post('/api/staff', (req, res) => {
  const { name, role, designation, phone, email, assignedProperty } = req.body || {};
  if (!String(name || '').trim()) return fail(res, 400, 'Staff name is required');
  const staff = {
    id: state.nextStaffId++,
    name: String(name).trim(),
    role: String(role || 'Technician'),
    designation: String(designation || 'Staff'),
    phone: String(phone || ''),
    email: String(email || ''),
    assignedProperty: String(assignedProperty || 'All Properties'),
    status: 'Active'
  };
  state.staff = state.staff || [];
  state.staff.push(staff);
  save();
  res.status(201).json(staff);
});

app.get('/api/vendors', (_req, res) => res.json(state.vendors || []));
app.post('/api/vendors', (req, res) => {
  const { name, category, contactPerson, phone, rating } = req.body || {};
  if (!String(name || '').trim()) return fail(res, 400, 'Vendor name is required');
  const vendor = {
    id: state.nextVendorId++,
    name: String(name).trim(),
    category: String(category || 'General Service'),
    contactPerson: String(contactPerson || ''),
    phone: String(phone || ''),
    rating: Number(rating || 4.5),
    status: 'Active',
    contractUntil: req.body.contractUntil || '2027-12-31'
  };
  state.vendors = state.vendors || [];
  state.vendors.push(vendor);
  save();
  res.status(201).json(vendor);
});

// --- Documents, Notifications & Audit Logs ---
app.get('/api/documents', (_req, res) => res.json(state.documents || []));
app.get('/api/notifications', (_req, res) => res.json(state.notifications || []));
app.put('/api/notifications/:id/read', (req, res) => {
  const n = (state.notifications || []).find(item => item.id === Number(req.params.id));
  if (n) { n.read = true; save(); }
  res.json({ success: true });
});
app.post('/api/notifications/mark-all-read', (_req, res) => {
  (state.notifications || []).forEach(n => n.read = true);
  save();
  res.json({ success: true });
});
app.get('/api/audit-logs', (_req, res) => res.json(state.auditLogs || []));
app.get('/api/flats', (_req,res)=>res.json(state.flats));
app.post('/api/flats', (req,res)=>{ const {flatNumber,tenantName='',phone='',monthlyRent,electricityReading=0,waterReading=0}=req.body;
 if(!String(flatNumber||'').trim()) return fail(res,400,'flatNumber is required'); if(state.flats.some(f=>f.flatNumber===String(flatNumber).trim())) return fail(res,409,'Flat number already exists');
 if(monthlyRent===undefined||monthlyRent===null||monthlyRent===''||!Number.isFinite(Number(monthlyRent))||Number(monthlyRent)<0) return fail(res,400,'monthlyRent must be non-negative');
 for(const [v,label] of [[electricityReading,'electricityReading'],[waterReading,'waterReading']]) if(!Number.isFinite(Number(v))||Number(v)<0) return fail(res,400,`${label} must be non-negative`);
 const flat={id:state.nextFlatId++,flatNumber:String(flatNumber).trim(),tenantName:String(tenantName),phone:String(phone),monthlyRent:Number(monthlyRent),electricityReading:Number(electricityReading),waterReading:Number(waterReading),occupied:Boolean(tenantName)}; state.flats.push(flat); save(); res.status(201).json(flat); });
app.put('/api/flats/:id', (req,res)=>{const flat=state.flats.find(f=>f.id===Number(req.params.id));if(!flat)return fail(res,404,'Flat not found');const body=req.body||{};const candidate={...flat};for(const k of ['flatNumber','tenantName','phone','monthlyRent','electricityReading','waterReading'])if(body[k]!==undefined)candidate[k]=['monthlyRent','electricityReading','waterReading'].includes(k)?Number(body[k]):body[k];candidate.flatNumber=String(candidate.flatNumber||'').trim();if(!candidate.flatNumber)return fail(res,400,'flatNumber is required');if(state.flats.some(f=>f.id!==flat.id&&f.flatNumber===candidate.flatNumber))return fail(res,409,'Flat number already exists');if(['monthlyRent','electricityReading','waterReading'].some(k=>body[k]===''||!Number.isFinite(candidate[k])||candidate[k]<0))return fail(res,400,'Rent and readings must be non-negative');candidate.occupied=body.occupied===undefined?Boolean(candidate.tenantName):Boolean(body.occupied);Object.assign(flat,candidate);save();res.json(flat);});
app.delete('/api/flats/:id',(req,res)=>{const i=state.flats.findIndex(f=>f.id===Number(req.params.id));if(i<0)return fail(res,404,'Flat not found');state.flats.splice(i,1);save();res.status(204).end();});
app.get('/api/bills', (req,res)=>{const rows=state.bills.filter(b=>!req.query.month||b.month===req.query.month);res.json(rows);});
app.post('/api/bills/generate', (req,res)=>{
 const {month,readings}=req.body;
 if(!monthPattern.test(month||''))return fail(res,400,'month must be YYYY-MM');
 if(state.bills.some(b=>b.month===month))return fail(res,409,'Bills already generated for this month');
 if(!Array.isArray(readings)||readings.length!==state.flats.length)return fail(res,400,'Provide readings for every registered flat');
 try {
  const rows=state.flats.map(flat=>{
   const r=readings.find(x=>Number(x.flatId)===flat.id);
   if(!r)throw new Error(`Missing readings for flat ${flat.flatNumber}`);
   const previousBill=state.bills.filter(b=>b.flatId===flat.id).sort((a,b)=>b.month.localeCompare(a.month))[0];
   const ep=previousBill?previousBill.electricityCurrent:flat.electricityReading;
   const wp=previousBill?previousBill.waterCurrent:flat.waterReading;
   if(Number(r.electricityPrevious)!==ep||Number(r.waterPrevious)!==wp)throw new Error(`Previous readings must carry forward for flat ${flat.flatNumber} (electricity ${ep}, water ${wp})`);
   return {...calculateBill(flat,{...r,month},{...state.settings,otherCharges:r.otherCharges||0}),payments:[]};
  });
  rows.forEach(b=>b.id=state.nextBillId++);
  state.bills.push(...rows);save();res.status(201).json(rows);
 }catch(e){return fail(res,400,e.message);}
});
app.post('/api/bills/:id/payment',(req,res)=>{
 const bill=state.bills.find(b=>b.id===Number(req.params.id));
 if(!bill)return fail(res,404,'Bill not found');
 const amount=Number(req.body.amount);
 if(!Number.isFinite(amount)||amount<=0)return fail(res,400,'Payment amount must be greater than zero');
 if(amount>bill.balance)return fail(res,400,'Payment exceeds outstanding balance');
 const paymentMethod=String(req.body.paymentMethod||'UPI').trim().toUpperCase();
 if(!['UPI','CASH','BANK TRANSFER','CHEQUE','OTHER'].includes(paymentMethod))return fail(res,400,'Payment method must be UPI, cash, bank transfer, cheque, or other');
 const paymentDate=String(req.body.paymentDate||new Date().toISOString().slice(0,10));
 if(!/^\d{4}-\d{2}-\d{2}$/.test(paymentDate)||Number.isNaN(Date.parse(`${paymentDate}T00:00:00Z`))||new Date(`${paymentDate}T00:00:00Z`).toISOString().slice(0,10)!==paymentDate)return fail(res,400,'Payment date must be a valid YYYY-MM-DD date');
 bill.payments ||= [];
 const payment={id:`${bill.id}-${bill.payments.length+1}`,amount:Math.round(amount*100)/100,paymentMethod,paymentDate};
 bill.payments.push(payment);
 bill.paidAmount=Math.round((bill.paidAmount+amount)*100)/100;
 bill.balance=Math.round((bill.total-bill.paidAmount)*100)/100;
 bill.status=bill.balance===0?'PAID':'PARTIAL';
 bill.paymentMethod=paymentMethod;bill.paymentDate=paymentDate;
 save();res.json(bill);
});
app.get('/api/export/:month.csv',(req,res)=>{if(!monthPattern.test(req.params.month))return fail(res,400,'month must be YYYY-MM');const rows=state.bills.filter(b=>b.month===req.params.month);res.setHeader('Content-Type','text/csv; charset=utf-8');res.setHeader('Content-Disposition',`attachment; filename="RentPro-${req.params.month}.csv"`);res.send(toCsv(rows));});
app.get('/api/bills/:id/pdf',(req,res)=>{const b=state.bills.find(x=>x.id===Number(req.params.id));if(!b)return fail(res,404,'Bill not found');res.setHeader('Content-Type','application/pdf');res.setHeader('Content-Disposition',`attachment; filename="Bill-${b.flatNumber}-${b.month}.pdf"`);const doc=new PDFDocument({margin:48});doc.pipe(res);doc.fontSize(24).fillColor('#2563eb').text('RENTPRO', {align:'center'});doc.moveDown().fontSize(16).fillColor('#111827').text(`Rental Invoice | ${b.month}`,{align:'center'});doc.moveDown().fontSize(12).fillColor('#111827');doc.text(`Flat: ${b.flatNumber}    Tenant: ${b.tenantName}`);doc.moveDown();[['Monthly rent',b.rent],['Electricity',`${b.electricityUnits} units × ₹${b.electricityRate} = ₹${b.electricityAmount}`],['Water',`${b.waterUnits} units × ₹${b.waterRate} = ₹${b.waterAmount}`],['Garbage',b.garbageAmount],['Other charges',b.otherCharges],['Total',`₹${b.total}`],['Paid',`₹${b.paidAmount}`],['Balance',`₹${b.balance}`]].forEach(([k,v])=>doc.text(`${k}: ${v}`));doc.end();});
app.get('/api/dashboard', (req, res) => {
  const month = req.query.month || new Date().toISOString().slice(0, 7);
  const bills = (state.bills || []).filter(b => b.month === month);
  const recentPayments = bills.flatMap(b => (b.payments || []).map(p => ({
    ...p,
    flatId: b.flatId,
    flatNumber: b.flatNumber,
    tenantName: b.tenantName,
    month: b.month
  }))).sort((a, b) => b.paymentDate.localeCompare(a.paymentDate)).slice(0, 8);

  const totalBilled = bills.reduce((s, b) => s + b.total, 0);
  const collected = bills.reduce((s, b) => s + b.paidAmount, 0);
  const pending = bills.reduce((s, b) => s + b.balance, 0);
  const totalFlats = (state.flats || []).length;
  const occupiedFlats = (state.flats || []).filter(f => f.occupied).length;
  const vacantFlats = (state.flats || []).filter(f => !f.occupied).length;
  const occupancyRate = totalFlats ? Math.round((occupiedFlats / totalFlats) * 100) : 0;

  const totalProperties = (state.properties || []).length || 1;
  const totalBuildings = (state.properties || []).reduce((s, p) => s + (p.buildings || 1), 0);
  const totalTenants = (state.tenants || []).length;
  const activeTenants = (state.tenants || []).filter(t => t.status === 'Active Resident').length;
  const activeMaintenance = (state.maintenance || []).filter(m => m.status !== 'Completed' && m.status !== 'Closed').length;
  const emergencyMaintenance = (state.maintenance || []).filter(m => m.priority === 'High' || m.priority === 'Emergency').length;
  const leasesExpiringSoon = (state.leases || []).filter(l => l.status === 'Active' && (l.daysUntilExpiry || 365) <= 90).length;

  const totalExpenses = (state.accounting || []).filter(t => t.type === 'Expense').reduce((s, t) => s + (t.amount || 0), 0);
  const depositLiabilities = (state.accounting || []).filter(t => t.type === 'Liability').reduce((s, t) => s + (t.amount || 0), 0);
  const netCashFlow = collected - totalExpenses;

  res.json({
    month,
    totalFlats,
    occupiedFlats,
    vacantFlats,
    totalBilled,
    collected,
    pending,
    billsCount: bills.length,
    availableMonths: [...new Set((state.bills || []).map(b => b.month))].sort().reverse(),
    recentPayments,

    // Enterprise enhancements
    totalProperties,
    totalBuildings,
    totalUnits: totalFlats,
    occupancyRate,
    totalTenants,
    activeTenants,
    activeMaintenance,
    emergencyMaintenance,
    leasesExpiringSoon,
    totalExpenses,
    depositLiabilities,
    netCashFlow,
    recentMaintenance: (state.maintenance || []).slice(0, 5),
    expiringLeases: (state.leases || []).filter(l => (l.daysUntilExpiry || 365) <= 90).slice(0, 5)
  });
});

app.get('/api/export/tenants.csv', (_req, res) => {
  const cols = ['id', 'name', 'flatNumber', 'email', 'phone', 'status', 'kycStatus', 'registrationDate'];
  const rows = (state.tenants || []).map(t => cols.map(c => `"${String(t[c] ?? '').replace(/"/g, '""')}"`).join(','));
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="RentPro-Tenants.csv"');
  res.send([cols.join(','), ...rows].join('\r\n') + '\r\n');
});

app.get('/api/export/maintenance.csv', (_req, res) => {
  const cols = ['ticketNumber', 'flatNumber', 'tenantName', 'title', 'category', 'priority', 'status', 'assignedTo', 'estimatedCost', 'createdAt'];
  const rows = (state.maintenance || []).map(m => cols.map(c => `"${String(m[c] ?? '').replace(/"/g, '""')}"`).join(','));
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="RentPro-Maintenance.csv"');
  res.send([cols.join(','), ...rows].join('\r\n') + '\r\n');
});

const fs = require('fs');
const apkPath = path.join(__dirname, '..', '..', 'RentPro-v2.apk');
const fallbackApkPath = path.join(__dirname, '..', '..', 'RentPro.apk');
app.get(['/RentPro.apk', '/RentPro-v2.apk', '/download/apk', '/api/download/apk'], (_req, res) => {
  const target = fs.existsSync(apkPath) ? apkPath : fallbackApkPath;
  if (fs.existsSync(target)) {
    res.download(target, 'RentPro-v2.apk');
  } else {
    res.status(404).json({ error: 'RentPro APK not found' });
  }
});

const candidatePublicDirs = [
  path.join(__dirname, '..', 'public'),
  path.join(__dirname, '..', 'dist'),
  path.join(__dirname, '..', '..', 'mobile', 'dist'),
  path.join(process.cwd(), 'backend', 'public'),
  path.join(process.cwd(), 'mobile', 'dist')
];

let publicDir = null;
for (const dir of candidatePublicDirs) {
  if (fs.existsSync(dir) && fs.existsSync(path.join(dir, 'index.html'))) {
    publicDir = dir;
    break;
  }
}

if (publicDir) {
  app.use(express.static(publicDir));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(publicDir, 'index.html'));
  });
}

app.use((err,_req,res,_next)=>{res.status(500).json({error:'Internal server error'});});
module.exports=app;
