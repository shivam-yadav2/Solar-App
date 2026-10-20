// Copied from SAAS-Solar/src/types.ts — keep in sync (the web file is the source of truth).
export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'CUSTOMER';

export type TenantStatus = 'active' | 'trial' | 'suspended' | 'expired';
export type TenantPlan = 'starter' | 'growth' | 'enterprise';

export interface TenantBranding {
  logoUrl: string;
  faviconUrl?: string;
  primaryColor: string; // e.g. '#f59e0b', '#10b981', '#3b82f6'
  secondaryColor?: string;
  companyTagline: string;
  supportEmail: string;
  supportPhone: string;
  customDomain?: string;
  /** Websites allowed to use the customer login API (Website Login module), e.g. https://example.com */
  websiteLoginOrigins?: string[];
  /** Legacy single key pair (before named credentials); read as one credential. */
  websiteLoginKeys?: { publishableKey: string; secretKeyHash?: string; secretKeyHint: string; createdAt: string };
  /** Website Login API credentials — one per integration (company developer, agency…), managed by the platform admin. */
  websiteLoginCredentials?: WebsiteLoginCredential[];
}

/** One API key pair for a tenant's Website Login API. The secret is stored only as a SHA-256 hash. */
export interface WebsiteLoginCredential {
  id: string;
  /** Who it was issued to, e.g. "Pixel Agency — WordPress site". */
  label: string;
  contactEmail?: string;
  publishableKey: string;
  secretKeyHash?: string;
  secretKeyHint: string;
  /** Websites allowed to use the publishable key. */
  allowedOrigins: string[];
  createdAt: string;
  createdBy: string;
  revokedAt?: string;
}

export interface TenantBusinessProfile {
  legalEntityName: string;
  gstin: string;
  pan: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  bankName: string;
  bankAccountNumber: string;
  bankIfsc: string;
  invoicePrefix: string;
  quotationPrefix: string;
}

export interface TenantModules {
  customerManagement: boolean;
  solarProjects: boolean;
  paymentsMilestones: boolean;
  expenseTracking: boolean;
  profitAndMargins: boolean;
  payroll?: boolean;
  warrantyCards: boolean;
  invoices: boolean;
  serviceTickets: boolean;
  documentCenter: boolean;
  reportsExport: boolean;
  activityLogs: boolean;
  aiAssistant: boolean;
  /** Quotation builder. Off unless a super admin explicitly enables it. */
  quotations?: boolean;
  /** Pre-sales leads & follow-ups. On unless switched off. */
  leadsCrm?: boolean;
  /** Stock, project BoQ and equipment serials. On unless switched off. */
  inventory?: boolean;
  /** Attendance and daily progress reports. On unless switched off. */
  fieldOperations?: boolean;
  /** Customer login from the tenant's own website (hosted page + login API). Off unless enabled. */
  websiteLogin?: boolean;
}

export interface TenantSubscription {
  planName: string; // snapshot of the Plan's display name at assignment time
  planId?: string;  // FK reference to `plans` — undefined for tenants onboarded before Plan management existed
  billingCycle: 'monthly' | 'yearly';
  currentPeriodEnd: string;
  maxProjectsLimit: number;
  maxUsersLimit: number;
  pricePerMonth: number;
  autoRenew: boolean;
  /** Present on demo workspaces created from Super Admin → Demos. */
  demo?: TenantDemo;

  // --- Managed by the platform admin (never editable by the tenant) ---
  /** Add-ons on top of the plan's limits, e.g. 5 extra users for this company. */
  extraUsers?: number;
  extraProjects?: number;
  /** File storage this company may use, in MB (unset = the platform default). */
  storageLimitMb?: number;
  /** When on, after currentPeriodEnd the workspace goes grace → read-only → locked. */
  enforceExpiry?: boolean;
  /** Days of normal use after the due date (default 7). */
  graceDays?: number;
  /** Days of read-only access after the grace period, before locking (default 15). */
  readOnlyDays?: number;
  /** Read-only switched on manually (e.g. payment pending). */
  readOnly?: { since: string; reason?: string; by: string };
  archivedAt?: string;
  archivedBy?: string;
  /** Renewals, extensions and due-date changes, newest first. */
  renewals?: SubscriptionRenewal[];
  /** Old company codes, so old login links keep working after a change. */
  previousSlugs?: string[];
  /** Platform-only notes about this customer. */
  crm?: TenantCrm;
  /** Discount on the SolarOS fee for this company. */
  discount?: TenantDiscount;
}

export interface SubscriptionRenewal {
  id: string;
  at: string;
  by: string;
  kind: 'renewal' | 'extension' | 'due_date';
  from: string;
  to: string;
  amount?: number;
  method?: string;
  note?: string;
}

/** Discount on a company's SolarOS fee (custom price, founder price, coupon). */
export interface TenantDiscount {
  type: 'percent' | 'flat';
  /** Percent off, or flat ₹ off per month. */
  value: number;
  label?: string;
  couponCode?: string;
  /** Discount stops applying after this date (ISO); none = forever. */
  until?: string;
}

// ---------------------------------------------------------------- platform billing (SolarOS → its customers)

export type BillingInvoiceStatus = 'draft' | 'issued' | 'partially_paid' | 'paid' | 'void';

export interface BillingLine {
  description: string;
  sac?: string;
  quantity: number;
  rate: number;
  amount: number;
}

export interface BillingParty {
  name: string;
  gstin?: string;
  address?: string;
  state?: string;
  stateCode?: string;
  email?: string;
  phone?: string;
}

export interface BillingInvoice {
  id: string;
  tenantId: string;
  tenantName?: string;
  invoiceNumber: string;
  kind: 'subscription' | 'custom';
  status: BillingInvoiceStatus;
  issueDate: string;
  dueDate: string;
  periodStart?: string;
  periodEnd?: string;
  months?: number;
  currency: string;
  subtotal: number;
  discount: number;
  taxable: number;
  cgst: number;
  sgst: number;
  igst: number;
  total: number;
  amountPaid: number;
  seller: BillingParty;
  buyer: BillingParty;
  lines: BillingLine[];
  notes?: string;
  planName?: string;
  discountLabel?: string;
  publicToken: string;
  paymentLinkUrl?: string;
  paymentLinkId?: string;
  reminders?: { at: string; stage: string; channel: string }[];
  createdBy: string;
  createdAt: string;
  paidAt?: string;
  voidedAt?: string;
}

export interface BillingPayment {
  id: string;
  tenantId: string;
  invoiceId: string;
  amount: number;
  method: string;
  reference?: string;
  paidAt: string;
  source: 'manual' | 'razorpay';
  gatewayPaymentId?: string;
  note?: string;
  recordedBy: string;
  createdAt: string;
}

export interface BillingCoupon {
  code: string;
  type: 'percent' | 'flat';
  value: number;
  label?: string;
  /** Months the discount lasts once applied; 0 = forever. */
  durationMonths: number;
  validUntil?: string;
  maxUses?: number;
  uses: number;
  active: boolean;
}

/** SolarOS's own billing identity and rules (platform settings). */
export interface BillingSettings {
  legalName: string;
  gstin?: string;
  pan?: string;
  address?: string;
  state?: string;
  stateCode?: string;
  email?: string;
  phone?: string;
  bankName?: string;
  bankAccountNumber?: string;
  bankIfsc?: string;
  upiId?: string;
  sacCode: string;
  gstRate: number;
  /** e.g. "SOS/{FY}/" — {FY} becomes 2026-27. */
  invoicePrefix: string;
  paymentTermsDays: number;
  terms?: string;
  /** Create the renewal invoice this many days before the due date (0 = off). */
  autoInvoiceDaysBefore: number;
  /** Reminder days relative to the due date, e.g. [-7, -3, 0, 3, 7]. */
  reminderDays: number[];
  razorpayKeyId?: string;
  /** Never sent to the browser — only whether it's set. */
  razorpayKeySecret?: string;
  razorpayWebhookSecret?: string;
  coupons: BillingCoupon[];
}

export interface TenantCrm {
  salesOwner?: string;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  tags?: string[];
  notes?: { id: string; at: string; by: string; text: string }[];
}

/** A sales demo workspace for a prospect (stored on the tenant's subscription). */
export interface TenantDemo {
  prospectName: string;
  company: string;
  phone: string;
  email?: string;
  city?: string;
  notes?: string;
  /** Who the prospect should contact to buy — shown in the demo banner and when it ends. */
  contactName?: string;
  contactPhone?: string;
  loginEmail: string;
  sampleData: boolean;
  createdAt: string;
  createdBy: string;
  expiresAt: string;
  extendedCount?: number;
  convertedAt?: string;
}

export interface Plan {
  id: string;
  key: string;
  name: string;
  description?: string;
  pricePerMonth: number;
  billingCycle: 'monthly' | 'yearly';
  maxProjectsLimit: number;
  maxUsersLimit: number;
  trialDays: number;
  enabledModules: TenantModules;
  isActive: boolean;
  sortOrder: number;
  tenantCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface TenantStats {
  totalCustomers: number;
  totalProjects: number;
  totalCapacityKw: number;
  totalRevenue: number;
  activeTickets: number;
}

export interface Tenant {
  id: string;
  slug: string;
  name: string;
  status: TenantStatus;
  adminEmail: string;
  branding: TenantBranding;
  businessProfile: TenantBusinessProfile;
  enabledModules: TenantModules;
  subscription: TenantSubscription;
  stats?: TenantStats;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  tenantId?: string;
  username: string;
  email: string;
  role: UserRole;
  roleId?: string;
  /** Display name of the user's role (from /auth/me), e.g. "Sales executive". */
  roleName?: string;
  customerId?: string;
  temporaryPassword?: boolean;
  forcePasswordChange?: boolean;
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
  /** Set at sign-in when the password policy's expiry made a new password necessary. */
  passwordExpired?: boolean;
  /** Platform logins only (from /auth/me): Owner, Admin, Support or Billing. */
  platformRole?: import('./lib/platformRoles').PlatformRole;
}

/** Platform-wide sign-in rules (Super Admin → Security). */
export interface SecurityPolicy {
  requireMfaForPlatform: boolean;
  requireMfaForStaff: boolean;
  passwordMinLength: number;
  passwordRequireNumber: boolean;
  passwordRequireSymbol: boolean;
  passwordRequireMixedCase: boolean;
  /** New password can't be the current one or one of the last N (0 = off). */
  passwordHistory: number;
  /** Staff and platform passwords must be changed after N days (0 = never). Customers are exempt. */
  passwordExpiryDays: number;
  /** Sign staff/platform out after N minutes without activity (0 = off). */
  idleTimeoutMinutes: number;
  /** Most devices one staff/platform login may be signed in on (0 = no limit); the oldest is signed out. */
  maxDevices: number;
  /** Platform logins only from these IPs / CIDR ranges (empty = anywhere). */
  platformIpAllowlist: string[];
  /** Security alerts: who gets them (empty emails = the platform Owners). */
  alertEmails?: string[];
  alertPhones?: string[];
  /** Alert on a burst of wrong passwords (this many in 15 min for one account; 3× for one IP). */
  alertFailedLogins?: boolean;
  failedLoginThreshold?: number;
  /** Alert when a platform login comes from a network not seen in 90 days. */
  alertNewPlatformIp?: boolean;
  /** Show the city / country of an IP (sends the IP to ipwho.is). */
  lookupIpCountry?: boolean;
}

/** One company's sign-in rules, set by the platform. */
export interface TenantSecurity {
  /** Staff may sign in only from these IPs / CIDR ranges (empty = anywhere). Customers are not affected. */
  ipAllowlist: string[];
  /** Staff must use two-factor sign-in. */
  requireMfa: boolean;
}

export interface Permission {
  id: string;
  key: string;
  module: string;
  description: string;
}

export interface Role {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  isSystem: boolean;
  permissionKeys: string[];
  userCount?: number;
  /** The viewer may assign this role to staff (server-computed). */
  canAssign?: boolean;
  /** The viewer may edit this role's permissions (server-computed). */
  canEdit?: boolean;
  createdAt: string;
  updatedAt: string;
}

export type CustomerStatus = 'Active' | 'Inactive' | 'Archived';
export type AccountStatus = 'Enabled' | 'Disabled' | 'Pending First Login';

export interface Customer {
  id: string;
  tenantId?: string;
  customId: string; // e.g. CUS-2026-00001
  name: string;
  mobile: string;
  email: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  status: CustomerStatus;
  accountStatus: AccountStatus;
  userId?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type ProjectStatus =
  | 'Lead'
  | 'Booked'
  | 'Planning'
  | 'Material Ordered'
  | 'Installation Scheduled'
  | 'Installation In Progress'
  | 'Installed'
  | 'Inspection Pending'
  | 'Completed'
  | 'Cancelled'
  | 'On Hold';

export type PaymentStatus = 'Unpaid' | 'Partially Paid' | 'Fully Paid' | 'Overdue';

export interface SolarProject {
  id: string;
  tenantId?: string;
  customId: string; // e.g. SOL-2026-00001
  customerId: string;
  customerName?: string;
  customerCustomId?: string;
  customerMobile?: string;
  projectName: string;
  status: ProjectStatus;
  installationAddress: string;
  city: string;
  state: string;
  pincode: string;
  startDate: string;
  completionDate?: string;
  
  // Solar Technical Specs
  capacityKw: number;
  panelsCount: number;
  panelBrand: string;
  panelModel: string;
  panelSerialNumbers?: string[];
  inverterBrand: string;
  inverterModel: string;
  inverterSerial?: string;
  batteryInstalled: boolean;
  batteryCapacity?: string;
  batteryBrand?: string;
  batteryModel?: string;
  structureType: string;
  mountingType: string;
  installationType: string;
  systemConfiguration?: string;
  uppclAccountNo?: string;
  netMeteringStatus?: string;
  technicalNotes?: string;

  // Deal / Financial
  dealAmount: number;
  planPackage?: string;
  bookingDate: string;
  agreementDate?: string;
  discount: number;
  taxGst: number;
  finalDealAmount: number;
  bookedProfit?: number; // Expected profit at booking time
  
  // Computed runtime or cached fields (for internal admin)
  totalReceived?: number;
  pendingBalance?: number;
  paymentStatus?: PaymentStatus;
  totalCost?: number;
  actualProfit?: number;
  profitMargin?: number;
  profitVariance?: number; // actualProfit - bookedProfit

  notes?: string;
  internalRemarks?: string;
  isArchived?: boolean;
  createdAt: string;
  updatedAt: string;
}

export type PaymentMethod = string;
export type PaymentTransactionStatus = 'Successful' | 'Pending' | 'Failed' | 'Refunded';
export type PaymentReconciliationStatus = 'Unreconciled' | 'Matched' | 'Exception';
export type ExpenseApprovalStatus = 'Pending' | 'Approved' | 'Rejected';

export interface Payment {
  id: string;
  tenantId?: string;
  customId: string; // e.g. PAY-2026-00001
  customerId: string;
  projectId: string;
  adjustmentOfId?: string;
  paymentDate: string;
  amount: number;
  paymentMethod: PaymentMethod;
  transactionRef?: string;
  status: PaymentTransactionStatus;
  notes?: string;
  receiptFileId?: string;
  receiptFileName?: string;
  reconciliationStatus?: PaymentReconciliationStatus;
  reconciledBy?: string;
  reconciledAt?: string;
  reconciliationNote?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectExpense {
  id: string;
  tenantId?: string;
  customId: string; // e.g. EXP-2026-00001
  customerId: string;
  projectId: string;
  adjustmentOfId?: string;
  expenseCategory: string;
  expenseName: string;
  amount: number;
  date: string;
  vendor?: string;
  remark?: string;
  receiptFileId?: string;
  receiptFileName?: string;
  addedBy: string;
  approvalStatus?: ExpenseApprovalStatus;
  approvedBy?: string;
  approvedAt?: string;
  approvalNote?: string;
  createdAt: string;
  updatedAt: string;
}

export type WarrantyItemType =
  | 'Solar Panel'
  | 'Inverter'
  | 'Battery'
  | 'Structure'
  | 'Wiring/Electrical'
  | 'Other Equipment';

export type WarrantyType = string;

export interface WarrantyDocument {
  id: string;
  tenantId?: string;
  customId: string; // e.g. WAR-2026-00001
  customerId: string;
  projectId: string;
  equipmentAssetId?: string;
  itemType: WarrantyItemType;
  warrantyType: WarrantyType;
  periodYears: number;
  startDate: string;
  expiryDate: string;
  brand?: string;
  model?: string;
  serialNumber?: string;
  fileId?: string;
  fileName?: string;
  fileSize?: number;
  fileMime?: string;
  remark?: string;
  createdAt: string;
  updatedAt: string;
}

export type InvoiceType = 'Tax Invoice' | 'Proforma' | 'Advance Receipt' | 'Final Bill';
export type InvoiceStatus = 'Issued' | 'Paid' | 'Cancelled';

export interface Invoice {
  id: string;
  tenantId?: string;
  customId: string; // e.g. INV-2026-00001
  invoiceNumber: string;
  customerId: string;
  projectId: string;
  invoiceDate: string;
  dueDate?: string;
  amount: number;
  taxAmount?: number;
  gstSnapshot?: GstInvoiceSnapshot;
  invoiceType: InvoiceType;
  status: InvoiceStatus;
  fileId?: string;
  fileName?: string;
  fileSize?: number;
  description?: string;
  // Enriched project/equipment details returned for invoice previews and portals.
  projectName?: string;
  capacityKw?: number;
  panelBrand?: string;
  panelModel?: string;
  panelSerialNumbers?: string[];
  inverterBrand?: string;
  inverterModel?: string;
  inverterSerial?: string;
  uploadedBy: string;
  createdAt: string;
  updatedAt: string;
}

export type ComplaintType = string;

export type ComplaintPriority = 'Low' | 'Medium' | 'High' | 'Critical';

export type ComplaintStatus =
  | 'Submitted'
  | 'Acknowledged'
  | 'Assigned'
  | 'In Progress'
  | 'Technician Visit Scheduled'
  | 'Waiting for Customer'
  | 'Resolved'
  | 'Closed'
  | 'Reopened';

export interface ComplaintAttachment {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  fileId: string;
}

export interface Complaint {
  id: string;
  tenantId?: string;
  customId: string; // e.g. CMP-2026-00001
  customerId: string;
  projectId: string;
  isItemSpecific: boolean;
  relatedItem?: string;
  complaintType: ComplaintType;
  subject: string;
  description: string;
  priority: ComplaintPriority;
  status: ComplaintStatus;
  assignedStaff?: string;
  resolution?: string;
  resolvedDate?: string;
  attachments: ComplaintAttachment[];
  createdAt: string;
  updatedAt: string;
}

export interface ComplaintComment {
  id: string;
  complaintId: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  message: string;
  isInternalNote: boolean; // Must NOT be exposed to customer
  attachments?: ComplaintAttachment[];
  createdAt: string;
}

export interface ComplaintTimelineEvent {
  id: string;
  complaintId: string;
  title: string;
  description: string;
  actorName: string;
  actorRole: UserRole;
  timestamp: string;
  newStatus?: ComplaintStatus;
}

export type ProjectDocumentCategory =
  | 'Agreement'
  | 'Quotation'
  | 'Installation Report'
  | 'Site Survey'
  | 'UPPCL Document'
  | 'Net Metering'
  | 'Completion Certificate'
  | 'Payment Receipt'
  | 'Other';

export interface ProjectDocument {
  id: string;
  tenantId?: string;
  customId: string; // e.g. DOC-2026-00001
  customerId: string;
  projectId: string;
  name: string;
  category: ProjectDocumentCategory;
  fileId: string;
  fileName: string;
  fileSize: number;
  fileMime: string;
  uploadedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface UploadedFile {
  id: string;
  tenantId?: string;
  originalName: string;
  mimeType: string;
  size: number;
  dataBase64: string; // Stored securely
  uploadedBy: string;
  customerId?: string;
  projectId?: string;
  createdAt: string;
}

export type ActivitySeverity = 'info' | 'notice' | 'warning' | 'critical';

/** Field-level change set: { fieldName: { from, to } }. */
export type ActivityChanges = Record<string, { from: unknown; to: unknown }>;

export interface ActivityLog {
  id: string;
  tenantId?: string;
  tenantName?: string;
  userId: string;
  userName: string;
  /** UserRole, or 'ANONYMOUS' for security events with no matched account. */
  userRole: UserRole | 'ANONYMOUS';
  action: string;
  category?: string;
  severity?: ActivitySeverity;
  entity: string;
  entityId: string;
  entityCustomId?: string;
  details?: Record<string, any>;
  changes?: ActivityChanges;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
  sessionId?: string;
  timestamp: string;
}

export interface UserSession {
  id: string;
  userId: string;
  tenantId?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
  lastSeenAt: string;
  lastPath?: string;
  expiresAt: string;
  revokedAt?: string;
  revokedReason?: string;
  isActive: boolean;
  userName?: string;
  userEmail?: string;
  userRole?: string;
  tenantName?: string;
}

export interface Notification {
  id: string;
  tenantId?: string;
  recipientUserId?: string;
  recipientRole?: 'ADMIN' | 'CUSTOMER';
  customerId?: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  linkUrl?: string;
  isRead: boolean;
  createdAt: string;
}

export type GstRegistrationType = 'Regular' | 'Composition' | 'Unregistered';

export interface GstSettings {
  enabled: boolean;
  registrationType: GstRegistrationType;
  stateCode: string;
  defaultHsnSacCode: string;
  defaultTaxRate: number;
  priceIncludesTax: boolean;
  invoicePrefix: string;
}

/** Immutable GST identity and calculation configuration stored with each invoice. */
export interface GstInvoiceSnapshot extends GstSettings {
  sellerName: string;
  sellerAddress: string;
  sellerState: string;
  sellerPincode: string;
  sellerGstin: string;
  placeOfSupply: string;
  placeOfSupplyCode: string;
  supplyType: 'INTRA_STATE' | 'INTER_STATE';
}

export interface CompanySettings {
  companyName: string;
  logoUrl: string;
  tagline: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  email: string;
  gstNumber: string;
  gstSettings: GstSettings;
  website: string;
  googleReviewUrl: string;
  defaultCurrency: string;
  warrantyExpiryAlertDays: number;
  expenseCategories: string[];
  complaintCategories: string[];
  documentCategories: string[];
  paymentMethods: string[];
  panelBrands: string[];
  inverterBrands: string[];
  batteryBrands: string[];
}

export interface InternalFeedback {
  id: string;
  tenantId?: string;
  customerId: string;
  customerName: string;
  projectId?: string;
  rating: number; // 1-5
  comment: string;
  createdAt: string;
}

export interface AuthSession {
  user: User;
  token: string;
  customer?: Customer;
  tenant?: Tenant;
  permissionKeys?: string[];
}

// -------------------------------------------------------------
// PAYROLL & STAFF TYPES
// -------------------------------------------------------------

export type EmployeeRole =
  | 'Solar EPC Engineer'
  | 'Site Supervisor'
  | 'Solar Technician'
  | 'Electrician'
  | 'Sales & Marketing'
  | 'Liaison Officer'
  | 'Operations Manager'
  | 'Helper / Laborer'
  | 'Accountant';

export type EmploymentType = 'Full-Time' | 'Contract' | 'Daily Wage' | 'Commission';
export type EmployeeStatus = 'Active' | 'On Leave' | 'Inactive' | 'Terminated';

export interface Employee {
  id: string;
  tenantId?: string;
  customId: string; // e.g. EMP-2026-00001
  name: string;
  email: string;
  phone: string;
  role: EmployeeRole;
  department: string;
  employmentType: EmploymentType;
  joiningDate: string;
  baseSalary: number; // monthly or per-day base
  bankAccount: string;
  bankName: string;
  ifscCode: string;
  upiId?: string;
  panNumber?: string;
  aadhaarNumber?: string;
  status: EmployeeStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type PayrollStatus = 'Paid' | 'Pending' | 'Processing';

export interface PayrollRecord {
  id: string;
  tenantId?: string;
  customId: string; // e.g. PAYROLL-2026-00001
  employeeId: string;
  employeeName: string;
  employeeCustomId: string;
  employeeRole: string;
  department: string;
  month: string; // e.g. '2026-08'
  year: number;

  // Earnings Breakdown
  baseSalary: number;
  hra: number; // House Rent Allowance
  siteAllowance: number; // Site Visit / Travel Allowance
  projectCommission: number; // kW commission / Project achievement incentive
  bonus: number;
  grossSalary: number;

  // Deductions Breakdown
  providentFund: number; // PF
  professionalTax: number; // PT
  tds: number; // Income Tax / TDS
  advanceDeduction: number; // Recovery of salary advance
  leaveDeductions: number; // LOP unpaid leave deduction
  totalDeductions: number;

  // Net Disbursal
  netSalary: number;

  // Settlement Details
  status: PayrollStatus;
  paymentDate?: string;
  paymentMethod?: PaymentMethod;
  transactionRef?: string;
  paymentNotes?: string;

  // Linked Solar Project (if incentive applies)
  linkedProjectId?: string;
  linkedProjectName?: string;

  createdAt: string;
  updatedAt: string;
}

export interface SalaryAdvance {
  id: string;
  tenantId?: string;
  customId: string; // e.g. ADV-2026-00001
  employeeId: string;
  employeeName: string;
  amount: number;
  disbursedDate: string;
  reason: string;
  recoveryMonth: string; // e.g. '2026-08'
  isRecovered: boolean;
  recoveredInPayrollId?: string;
  notes?: string;
  createdAt: string;
}

// -------------------------------------------------------------
// Pre-Sales CRM & Quotations Types
// -------------------------------------------------------------

export type LeadStatus = 'New' | 'Contacted' | 'Site Survey Scheduled' | 'Proposal Sent' | 'Negotiation' | 'Won' | 'Lost' | 'Disqualified';
export type LeadSource = 'Meta Ads' | 'Google Ads' | 'Website' | 'Referral' | 'Field Outreach' | 'Channel Partner' | 'Other';

export interface Lead {
  id: string;
  tenantId: string;
  customId: string;
  prospectName: string;
  phone: string;
  email?: string;
  address?: string;
  city: string;
  state: string;
  pincode?: string;
  monthlyElectricityBill?: number;
  sanctionedLoadKw?: number;
  proposedCapacityKw?: number;
  leadSource: LeadSource;
  status: LeadStatus;
  assignedToUserId?: string;
  lostReason?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type InteractionType = 'Call' | 'WhatsApp' | 'Site Visit' | 'Meeting' | 'Email' | 'Note';

export interface LeadFollowUp {
  id: string;
  tenantId: string;
  leadId: string;
  actorUserId: string;
  interactionType: InteractionType;
  summary: string;
  nextFollowUpDate?: string;
  createdAt: string;
}

export type QuotationStatus = 'Draft' | 'Sent' | 'Viewed' | 'Accepted' | 'Rejected' | 'Expired';

export interface QuotationItem {
  id: string;
  quotationId: string;
  itemName: string;
  description?: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
}

export type QuotationTemplateKey = 'classic' | 'modern' | 'minimal' | 'bold';

/** One row of the "other details" table: e.g. Inverter | Polycab/Microtek | 3 kw. */
export interface QuotationComponentLine {
  category: string;
  brand: string;
  spec: string;
  highlight?: boolean;
}

/** A tenant-customisable dropdown for one component category. */
export interface QuotationComponentOption {
  category: string;
  options: string[];
  defaultSpec: string;
  highlight?: boolean;
}

export interface QuotationSettings {
  defaultTemplate: QuotationTemplateKey;
  validityDays: number;
  features: string[];
  components: QuotationComponentOption[];
  paymentTerms: string;
  priceLabel: string;
  termsConditions: string;
  preparedByName: string;
  preparedByPhone: string;
  headerNote: string;
  branchAddress: string;
  signatoryTitle: string;
}

export interface Quotation {
  id: string;
  tenantId: string;
  customId: string;
  leadId?: string;
  customerId?: string;
  projectId?: string;
  recipientName?: string;
  recipientAddress?: string;
  recipientPhone?: string;
  quotationNumber: string;
  title: string;
  quotationDate?: string;
  validUntil: string;
  systemCapacityKw: number;
  panelTypeBrand: string;
  inverterTypeBrand: string;
  subtotalAmount: number;
  discountAmount: number;
  taxGstAmount: number;
  totalAmount: number;
  estimatedAnnualGenerationKwh?: number;
  estimatedMonthlySavings?: number;
  paybackYears?: number;
  status: QuotationStatus;
  templateKey: QuotationTemplateKey;
  features: string[];
  components: QuotationComponentLine[];
  priceLabel?: string;
  termsConditions?: string;
  paymentTerms?: string;
  notes?: string;
  preparedByName?: string;
  preparedByPhone?: string;
  createdBy: string;
  items?: QuotationItem[];
  createdAt: string;
  updatedAt: string;
}

// -------------------------------------------------------------
// Inventory, Stock Movement & Project BoQ Types
// -------------------------------------------------------------

export type InventoryCategory = 'Solar Panel' | 'Inverter' | 'Battery' | 'Mounting Structure' | 'ACDB/DCDB' | 'Cables & Wiring' | 'Earthing & Lightning' | 'Hardware & Fasteners' | 'Safety & Tools' | 'Other';

export interface InventoryItem {
  id: string;
  tenantId: string;
  itemCode: string;
  itemName: string;
  category: InventoryCategory;
  brand?: string;
  modelNumber?: string;
  unitOfMeasure: string;
  currentStock: number;
  minimumReorderLevel: number;
  costPricePerUnit: number;
  sellingPricePerUnit: number;
  hsnCode?: string;
  gstRatePercent: number;
  warehouseLocation?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type StockMovementType = 'PURCHASE_IN' | 'PROJECT_DISPATCH_OUT' | 'RETURN_IN' | 'ADJUSTMENT_WRITE_OFF';

export interface InventoryStockMovement {
  id: string;
  tenantId: string;
  itemId: string;
  movementType: StockMovementType;
  quantity: number;
  previousStock: number;
  resultingStock: number;
  unitCost: number;
  totalCost: number;
  linkedProjectId?: string;
  vendorSupplier?: string;
  referenceChallanNo?: string;
  notes?: string;
  serialNumbers?: string[];
  createdBy: string;
  createdAt: string;
}

export type EquipmentAssetStatus = 'IN_STOCK' | 'DISPATCHED' | 'INSTALLED' | 'RETURNED' | 'REPLACED' | 'WRITTEN_OFF';

export interface EquipmentAsset {
  id: string;
  tenantId: string;
  inventoryItemId?: string;
  serialNumber: string;
  equipmentType: InventoryCategory;
  brand?: string;
  modelNumber?: string;
  status: EquipmentAssetStatus;
  projectId?: string;
  customerId?: string;
  dispatchMovementId?: string;
  installedAt?: string;
  warrantyExpiry?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EquipmentAssetEvent {
  id: string;
  assetId: string;
  tenantId: string;
  movementId?: string;
  projectId?: string;
  eventType: 'REGISTERED' | 'DISPATCHED' | 'RETURNED' | 'INSTALLED' | 'REPLACED' | 'WRITTEN_OFF';
  previousStatus?: EquipmentAssetStatus;
  resultingStatus: EquipmentAssetStatus;
  notes?: string;
  createdBy: string;
  createdAt: string;
}

export type BoQStatus = 'Planned' | 'Partially Dispatched' | 'Fully Dispatched' | 'Installed/Consumed';

export interface ProjectBoqItem {
  id: string;
  projectId: string;
  itemId?: string;
  itemName: string;
  category: string;
  unit: string;
  plannedQuantity: number;
  dispatchedQuantity: number;
  consumedQuantity: number;
  unitCostEstimate: number;
  status: BoQStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// -------------------------------------------------------------
// Invoice Line Items Types
// -------------------------------------------------------------

export interface InvoiceLineItem {
  id: string;
  invoiceId: string;
  itemDescription: string;
  hsnSacCode?: string;
  quantity: number;
  unitOfMeasure: string;
  ratePerUnit: number;
  taxableValue: number;
  cgstRate: number;
  cgstAmount: number;
  sgstRate: number;
  sgstAmount: number;
  igstRate: number;
  igstAmount: number;
  totalAmount: number;
}

// -------------------------------------------------------------
// DISCOM & Field Operations (DPR) Types
// -------------------------------------------------------------

export type DiscomStageName =
  | 'Feasibility Application Submitted'
  | 'Feasibility Approved'
  | 'Estimate Generated & Paid'
  | 'Work Execution Submitted (WCR)'
  | 'Safety Inspection / CEIG Inspection'
  | 'Bi-directional Net-Meter Testing'
  | 'Net-Meter Installed on Site'
  | 'Joint Inspection Report (JIR) Signed'
  | 'Subsidy / DBT Portal Claim Dispatched'
  | 'Subsidy Disbursed to Customer';

export type DiscomStageStatus = 'Pending' | 'In Progress' | 'Approved' | 'Rejected' | 'On Hold';

export interface DiscomLiaisonStage {
  id: string;
  tenantId: string;
  projectId: string;
  stageName: DiscomStageName;
  status: DiscomStageStatus;
  submissionDate?: string;
  approvalDate?: string;
  applicationReferenceNo?: string;
  discomOfficerName?: string;
  remarks?: string;
  documentFileId?: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface DailyProgressReport {
  id: string;
  tenantId: string;
  projectId: string;
  reportDate: string;
  submittedByUserId: string;
  structureMountingProgressPct: number;
  panelInstallationProgressPct: number;
  wiringInverterProgressPct: number;
  laborCountOnSite: number;
  workCompletedToday: string;
  blockersOrDelays?: string;
  weatherConditions?: string;
  gpsLatitude?: number;
  gpsLongitude?: number;
  sitePhotos?: string[];
  createdAt: string;
}

export type AttendanceStatus = 'Present' | 'Absent' | 'Half Day' | 'On Leave' | 'Holiday' | 'Site Duty';

export interface EmployeeAttendance {
  id: string;
  tenantId: string;
  employeeId: string;
  date: string;
  status: AttendanceStatus;
  punchInTime?: string;
  punchOutTime?: string;
  punchInLatitude?: number;
  punchInLongitude?: number;
  workingHours?: number;
  assignedProjectId?: string;
  notes?: string;
  createdAt: string;
}

// -------------------------------------------------------------
// SaaS Subscriptions & Usage Meters
// -------------------------------------------------------------

export type SaasPlanTier = 'STARTER' | 'PRO' | 'ENTERPRISE' | 'CUSTOM';
export type SaasSubStatus = 'trialing' | 'active' | 'past_due' | 'canceled' | 'unpaid' | 'paused';
export type SaasInvoiceStatus = 'draft' | 'open' | 'paid' | 'uncollectible' | 'void';

export interface SaasSubscription {
  id: string;
  tenantId: string;
  gatewayCustomerId?: string;
  gatewaySubscriptionId?: string;
  planTier: SaasPlanTier;
  status: SaasSubStatus;
  billingInterval: 'monthly' | 'yearly';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  unitAmount: number;
  currency: string;
  trialEnd?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SaasSubscriptionInvoice {
  id: string;
  tenantId: string;
  subscriptionId?: string;
  invoiceNumber: string;
  amountDue: number;
  amountPaid: number;
  taxAmount: number;
  currency: string;
  status: SaasInvoiceStatus;
  billingDate: string;
  paidAt?: string;
  hostedInvoiceUrl?: string;
  pdfUrl?: string;
  createdAt: string;
}

export interface TenantUsageMeter {
  id: string;
  tenantId: string;
  metricKey: string;
  currentValue: number;
  maxLimit: number;
  resetPeriod: 'never' | 'monthly' | 'yearly';
  lastResetAt: string;
  updatedAt: string;
}



// ---------------------------------------------------------------- communication (Super Admin → Communication)

export type MessageChannel = 'email' | 'sms' | 'whatsapp';
export type MessageEvent =
  | 'password_reset' | 'temp_password' | 'welcome_staff' | 'welcome_customer' | 'welcome_platform' | 'demo_credentials'
  | 'billing_invoice' | 'billing_reminder' | 'billing_receipt' | 'support_reply' | 'announcement' | 'customer_document' | 'backup_copy' | 'security_alert';

/** Text for one event on every channel. Variables look like {{name}}. */
export interface MessageTemplate {
  enabled: boolean;
  channels: MessageChannel[];
  emailSubject: string;
  emailBody: string;
  sms: string;
  whatsapp: string;
  /** WhatsApp Cloud API: approved template name (business-initiated messages need one). */
  whatsappTemplateName?: string;
  whatsappTemplateLanguage?: string;
  /** Variables sent as the template's {{1}}, {{2}}… in this order, e.g. "name, link". */
  whatsappParams?: string;
}

export interface CommunicationSettings {
  email: {
    provider: 'off' | 'smtp' | 'brevo' | 'resend';
    fromName: string; fromEmail: string; replyTo?: string;
    smtpHost?: string; smtpPort?: number; smtpSecurity?: 'ssl' | 'starttls' | 'none'; smtpUser?: string; smtpPass?: string;
    apiKey?: string;
  };
  sms: {
    provider: 'off' | 'twilio' | 'http';
    twilioSid?: string; twilioToken?: string; twilioFrom?: string;
    httpMethod?: 'GET' | 'POST'; httpUrl?: string; httpHeaders?: string; httpBody?: string;
  };
  whatsapp: {
    provider: 'off' | 'meta' | 'http';
    metaPhoneNumberId?: string; metaToken?: string;
    httpMethod?: 'GET' | 'POST'; httpUrl?: string; httpHeaders?: string; httpBody?: string;
  };
  templates: Partial<Record<MessageEvent, Partial<MessageTemplate>>>;
}

export interface MessageLogEntry {
  id: string; tenantId?: string; tenantName?: string; channel: MessageChannel; event: string; recipient: string; subject?: string;
  status: 'sent' | 'failed'; error?: string; providerId?: string; createdAt: string;
}

export interface Announcement {
  id: string;
  title: string;
  message: string;
  tone: 'info' | 'warning' | 'success';
  /** Empty = every company. */
  tenantIds: string[];
  audience: 'staff' | 'customers' | 'everyone';
  startsAt: string;
  endsAt?: string;
  linkUrl?: string;
  linkLabel?: string;
  active: boolean;
  createdBy: string;
  createdAt: string;
  emailedAt?: string;
}

export type SupportTicketStatus = 'open' | 'waiting_on_customer' | 'resolved' | 'closed';
export interface SupportTicket {
  id: string;
  number: string;
  tenantId: string;
  tenantName?: string;
  createdById: string;
  createdByName: string;
  createdByEmail?: string;
  subject: string;
  category: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  status: SupportTicketStatus;
  assignedToId?: string;
  assignedToName?: string;
  createdAt: string;
  updatedAt: string;
  lastReplyAt: string;
  lastReplyBy: 'company' | 'solaros';
  messageCount?: number;
}
export interface SupportMessage {
  id: string;
  ticketId: string;
  authorId: string;
  authorName: string;
  side: 'company' | 'solaros';
  body: string;
  /** SolarOS team notes the company never sees. */
  internal: boolean;
  createdAt: string;
  attachments?: { fileId: string; name: string; mime: string; size: number }[];
}

// ---------------------------------------------------------------- platform settings (Super Admin → Platform settings)

export interface PlatformConfig {
  /** Public address of the app, e.g. https://solaros.voidlayer.in (links in emails, website login). */
  appUrl: string;
  /** Extra sites allowed to call the API from a browser (CORS), e.g. the mobile web app. The app's own address is always allowed. */
  allowedOrigins: string[];
  maintenance: { enabled: boolean; message: string; until?: string; startedAt?: string; startedBy?: string };
}

export interface PlatformBranding {
  name: string;
  tagline: string;
  /** Wordmark / logo shown on the website and sign-in (URL or uploaded image). */
  logoUrl: string;
  supportEmail: string;
  supportPhone: string;
  whatsapp: string;
  website: string;
  /** Small print, e.g. "ERP by voidlayer". */
  companyLine: string;
  heroBadge: string;
  heroTitle: string;
  heroHighlight: string;
  heroSubtitle: string;
  heroPoints: string[];
  pricingSubtitle: string;
  ctaTitle: string;
  ctaSubtitle: string;
  footerAbout: string;
  faqs: { q: string; a: string }[];
}

export interface DefaultRole { name: string; description: string; permissionKeys: string[] }
export interface TenantDefaults {
  lists: Pick<CompanySettings, 'expenseCategories' | 'complaintCategories' | 'documentCategories' | 'paymentMethods' | 'panelBrands' | 'inverterBrands' | 'batteryBrands'>;
  gst: Pick<GstSettings, 'defaultTaxRate' | 'defaultHsnSacCode' | 'invoicePrefix' | 'priceIncludesTax'>;
  warrantyExpiryAlertDays: number;
  /** Created in every new company next to the built-in Admin role. */
  roles: DefaultRole[];
}

export type LegalKey = 'terms' | 'privacy' | 'refund';
export interface LegalDocument {
  key: LegalKey;
  title: string;
  content: string;
  version: number;
  published: boolean;
  /** Company owners must accept it (again after a new version). */
  requireAcceptance: boolean;
  updatedAt?: string;
}

export interface FeatureFlag {
  key: string;
  name: string;
  description?: string;
  /** off = nobody, beta = only the chosen companies, on = everyone. */
  status: 'off' | 'beta' | 'on';
  tenantIds: string[];
  updatedAt?: string;
}
