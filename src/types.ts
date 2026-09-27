export type UserRole = 'customer' | 'worker' | 'admin';

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  phoneNumber?: string;
  phoneVerified: boolean;
  authProviders: string[]; // e.g. ['google.com', 'microsoft.com', 'phone']
  role: UserRole;
  createdAt: string;
}

export type TradeCategory =
  | 'Plumber'
  | 'Painter'
  | 'Electrician'
  | 'Carpenter'
  | 'HVAC'
  | 'Masonry';

export interface TransparentRateItem {
  task: string;
  flatPrice: number;
  estimatedHours: string;
}

export interface WorkerProjectCaseStudy {
  title: string;
  neighborhood: string;
  duration: string;
  finalCost: number;
  materialsCost: number;
  summary: string;
}

export interface Worker {
  id: string;
  name: string;
  trade: TradeCategory;
  specialty: string;
  avatar: string;
  hourlyRate: number;
  minCalloutFee: number;
  materialsMarkupPct: number; // Always 0% on THE AURA WORKERS for transparent at-cost receipts
  rating: number;
  reviewCount: number;
  completedJobs: number;
  licenseNumber: string;
  backgroundCheckId: string;
  insuranceBondAmount: number;
  verifiedPhone: boolean;
  verifiedIdentity: boolean;
  verifiedLicense: boolean;
  yearsExperience: number;
  neighborhood: string;
  responseTimeMins: number;
  bio: string;
  transparentRates: TransparentRateItem[];
  // Extended Craftsperson Details
  certifications?: string[];
  equipmentManifest?: string[];
  warrantyMonths?: number;
  languages?: string[];
  availabilityStatus?: 'Available Today' | 'Next-Day Dispatch' | 'On-Call Priority';
  serviceRadiusMiles?: number;
  onTimeRatePct?: number;
  repeatClientPct?: number;
  recentProjects?: WorkerProjectCaseStudy[];
}

export type JobStage =
  | 'ESCROW_LOCKED'
  | 'WORKER_DISPATCHED'
  | 'ON_SITE_VERIFIED'
  | 'WORK_IN_PROGRESS'
  | 'COMPLETED_RELEASED';

export interface JobTimelineEntry {
  stage: JobStage;
  label: string;
  timestamp: string;
  note: string;
}

export interface Job {
  id: string;
  customerId: string;
  customerName: string;
  workerId: string;
  workerName: string;
  workerTrade: TradeCategory;
  workerLicense: string;
  title: string;
  scopeDescription: string;
  address: string;
  scheduledFor: string;
  estimatedHours: number;
  hourlyRate: number;
  laborCost: number;
  materialsAllowance: number;
  escrowFee: number;
  totalAmount: number;
  status: JobStage;
  siteSafetyPin: string;
  reviewed: boolean;
  createdAt: string;
  updatedAt: string;
  timeline: JobTimelineEntry[];
}

export type PaymentStatus = 'ESCROW_LOCKED' | 'RELEASED_TO_WORKER' | 'REFUNDED';

export interface Payment {
  id: string;
  jobId: string;
  customerId: string;
  workerId: string;
  workerName: string;
  workerTrade: TradeCategory;
  jobTitle: string;
  laborCost: number;
  materialsAllowance: number;
  escrowFee: number;
  totalAmount: number;
  status: PaymentStatus;
  paymentMethod: string;
  txHash: string;
  createdAt: string;
  releasedAt?: string;
}

export interface Review {
  id: string;
  workerId: string;
  workerName: string;
  jobId?: string;
  customerId: string;
  customerName: string;
  rating: number;
  transparencyScore: number;
  craftsmanshipScore: number;
  punctualityScore: number;
  comment: string;
  projectTitle: string;
  verifiedHire: boolean;
  finalCostPaid: number;
  createdAt: string;
}

export interface EncryptedMessage {
  id: string;
  threadId: string;
  jobId?: string;
  workerId: string;
  customerId: string;
  senderId: string;
  senderName: string;
  senderRole: 'customer' | 'worker' | 'system';
  ciphertext: string;
  iv: string;
  keyFingerprint: string;
  messageType: 'text' | 'quote_lock' | 'pin_handshake';
  createdAt: string;
}

export interface DecryptedMessage extends EncryptedMessage {
  plaintext: string;
}
