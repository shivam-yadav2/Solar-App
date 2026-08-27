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
  customerId?: string;
  temporaryPassword?: boolean;
  forcePasswordChange?: boolean;
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
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

export type PaymentMethod = 'Cash' | 'UPI' | 'Bank Transfer' | 'Cheque' | 'Card' | 'Other';
export type PaymentTransactionStatus = 'Successful' | 'Pending' | 'Failed' | 'Refunded';

export interface Payment {
  id: string;
  tenantId?: string;
  customId: string; // e.g. PAY-2026-00001
  customerId: string;
  projectId: string;
  paymentDate: string;
  amount: number;
  paymentMethod: PaymentMethod;
  transactionRef?: string;
  status: PaymentTransactionStatus;
  notes?: string;
  receiptFileId?: string;
  receiptFileName?: string;
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
  expenseCategory: string;
  expenseName: string;
  amount: number;
  date: string;
  vendor?: string;
  remark?: string;
  receiptFileId?: string;
  receiptFileName?: string;
  addedBy: string;
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

export type WarrantyType = 'Standard' | 'Performance' | 'Manufacturer' | 'Extended' | 'Workmanship';

export interface WarrantyDocument {
  id: string;
  tenantId?: string;
  customId: string; // e.g. WAR-2026-00001
  customerId: string;
  projectId: string;
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
  invoiceType: InvoiceType;
  status: InvoiceStatus;
  fileId?: string;
  fileName?: string;
  fileSize?: number;
  description?: string;
  uploadedBy: string;
  createdAt: string;
  updatedAt: string;
}

export type ComplaintType =
  | 'Solar Panel'
  | 'Inverter'
  | 'Battery'
  | 'Wiring'
  | 'Earthing'
  | 'Structure'
  | 'Generation Issue'
  | 'UPPCL/Net Metering'
  | 'Installation'
  | 'General Complaint'
  | 'Other';

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

export interface ActivityLog {
  id: string;
  tenantId?: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: string;
  entity: string;
  entityId: string;
  entityCustomId?: string;
  details?: Record<string, any>;
  timestamp: string;
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

export interface Quotation {
  id: string;
  tenantId: string;
  customId: string;
  leadId?: string;
  customerId?: string;
  quotationNumber: string;
  title: string;
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
  termsConditions?: string;
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


