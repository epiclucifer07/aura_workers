import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldCheck,
  Wrench,
  Paintbrush,
  Zap,
  Hammer,
  Lock,
  Star,
  CheckCircle2,
  MessageSquareLock,
  Clock,
  ArrowRight,
  Search,
  SlidersHorizontal,
  Receipt,
  UserCheck,
  Plus,
  ChevronRight,
  MapPin,
  LogOut,
  Wind,
  Layers,
  Award,
  Briefcase,
} from 'lucide-react';
import { onAuthStateChanged } from 'firebase/auth';
import {
  collection,
  doc,
  setDoc,
  onSnapshot,
  getDoc,
} from 'firebase/firestore';
import {
  auth,
  db,
  firebaseSignOut,
  OperationType,
  handleFirestoreError,
  testFirestoreConnection,
} from './firebase';
import {
  UserProfile,
  UserRole,
  Worker,
  Job,
  JobStage,
  Payment,
  Review,
  TradeCategory,
} from './types';
import { INITIAL_WORKERS, INITIAL_REVIEWS } from './data/seedWorkers';
import { AuthVerificationModal } from './components/AuthVerificationModal';
import { VerificationDossierModal } from './components/VerificationDossierModal';
import { HireEscrowModal } from './components/HireEscrowModal';
import { EncryptedChatDrawer } from './components/EncryptedChatDrawer';
import { ReviewModal } from './components/ReviewModal';
import { RegisterWorkerModal } from './components/RegisterWorkerModal';
import { SignInPage } from './components/SignInPage';

const JOB_STAGES: {
  stage: JobStage;
  stepNum: string;
  shortLabel: string;
  description: string;
  actionButtonLabel: string;
}[] = [
  {
    stage: 'ESCROW_LOCKED',
    stepNum: '01',
    shortLabel: 'Escrow Vault Locked',
    description:
      'Ceiling price secured in Aura Trust Vault. Craftsperson alerted for priority dispatch.',
    actionButtonLabel: 'Dispatch Craftsperson to Residence →',
  },
  {
    stage: 'WORKER_DISPATCHED',
    stepNum: '02',
    shortLabel: 'Craftsperson En Route',
    description:
      'Licensed specialist is en route with diagnostic kit. Prepare your 4-digit Site Safety PIN.',
    actionButtonLabel: 'Verify Door PIN & Confirm Arrival →',
  },
  {
    stage: 'ON_SITE_VERIFIED',
    stepNum: '03',
    shortLabel: 'On-Site PIN Verified',
    description:
      '4-digit Site Safety PIN & State License credential verified at entry. Scope confirmed.',
    actionButtonLabel: 'Initiate Trade Execution Timer →',
  },
  {
    stage: 'WORK_IN_PROGRESS',
    stepNum: '04',
    shortLabel: 'Execution in Progress',
    description:
      'Active trade execution underway. Wholesale store material receipts attached with 0% markup.',
    actionButtonLabel: 'Sign Off Quality & Release Escrow →',
  },
  {
    stage: 'COMPLETED_RELEASED',
    stepNum: '05',
    shortLabel: 'Completed & Settled',
    description:
      'Homeowner signed off on craftsmanship. Escrow funds settled & $1M surety warranty active.',
    actionButtonLabel: 'Contract Settled',
  },
];

export default function App() {
  const [activeSection, setActiveSection] = useState<
    'discover' | 'tracker' | 'ledger' | 'signin'
  >('discover');

  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  const [workers, setWorkers] = useState<Worker[]>(INITIAL_WORKERS);
  const [reviews, setReviews] = useState<Review[]>(INITIAL_REVIEWS);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [toastBanner, setToastBanner] = useState<string | null>(null);

  const [selectedTrade, setSelectedTrade] = useState<'All' | TradeCategory>(
    'All'
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [maxRate, setMaxRate] = useState<number>(65);
  const [sortBy, setSortBy] = useState<
    'rating' | 'rate_asc' | 'dispatch' | 'jobs'
  >('rating');

  const [calcTrade, setCalcTrade] = useState<TradeCategory>('Plumber');
  const [calcHours, setCalcHours] = useState<number>(2.5);
  const [calcMaterials, setCalcMaterials] = useState<number>(30);

  const [dossierWorker, setDossierWorker] = useState<Worker | null>(null);
  const [hireModalState, setHireModalState] = useState<{
    worker: Worker | null;
    presetTask?: string;
    presetHours?: number;
  }>({ worker: null });
  const [chatDrawerState, setChatDrawerState] = useState<{
    isOpen: boolean;
    worker: Worker | null;
    job?: Job | null;
  }>({ isOpen: false, worker: null, job: null });
  const [reviewModalState, setReviewModalState] = useState<{
    worker: Worker | null;
    defaultProjectTitle?: string;
    defaultCostPaid?: number;
  }>({ worker: null });
  const [registerWorkerOpen, setRegisterWorkerOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<Payment | null>(null);

  const showToast = (msg: string) => {
    setToastBanner(msg);
    setTimeout(() => {
      setToastBanner((prev) => (prev === msg ? null : prev));
    }, 4500);
  };

  useEffect(() => {
    testFirestoreConnection();
  }, []);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (fbUser) => {
      if (!fbUser) {
        setUserProfile(null);
        return;
      }

      const userRef = doc(db, 'users', fbUser.uid);
      try {
        const snap = await getDoc(userRef);
        const providerIds = fbUser.providerData.map((p) => p.providerId);
        if (providerIds.length === 0) providerIds.push('google.com');

        if (snap.exists()) {
          const existing = snap.data() as UserProfile;
          const mergedProviders = Array.from(
            new Set([...(existing.authProviders || []), ...providerIds])
          );
          const updated: UserProfile = {
            ...existing,
            displayName:
              fbUser.displayName || existing.displayName || 'Verified Client',
            email: fbUser.email || existing.email || '',
            photoURL: fbUser.photoURL || existing.photoURL || '',
            authProviders: mergedProviders,
          };
          await setDoc(userRef, updated, { merge: true });
          setUserProfile(updated);
        } else {
          const newProfile: UserProfile = {
            uid: fbUser.uid,
            displayName: fbUser.displayName || 'Aura Verified Client',
            email: fbUser.email || 'client@auraworkers.org',
            photoURL: fbUser.photoURL || '',
            phoneNumber: fbUser.phoneNumber || '',
            phoneVerified: Boolean(fbUser.phoneNumber),
            authProviders: providerIds,
            role: 'customer',
            createdAt: new Date().toISOString(),
          };
          await setDoc(userRef, newProfile);
          setUserProfile(newProfile);
        }
      } catch (err) {
        console.error('Error syncing user profile:', err);
      }
    });

    return () => unsubAuth();
  }, []);

  useEffect(() => {
    const unsubWorkers = onSnapshot(
      collection(db, 'workers'),
      async (snapshot) => {
        if (snapshot.empty) {
          setWorkers(INITIAL_WORKERS);
          if (auth.currentUser) {
            for (const w of INITIAL_WORKERS) {
              await setDoc(doc(db, 'workers', w.id), w).catch(() => {});
            }
          }
        } else {
          const loaded: Worker[] = [];
          snapshot.forEach((d) => loaded.push(d.data() as Worker));
          const map = new Map<string, Worker>();
          INITIAL_WORKERS.forEach((w) => map.set(w.id, w));
          loaded.forEach((w) => map.set(w.id, w));
          setWorkers(Array.from(map.values()));
        }
      },
      (err) => {
        console.warn('Workers snapshot notice:', err);
      }
    );

    const unsubReviews = onSnapshot(
      collection(db, 'reviews'),
      async (snapshot) => {
        if (snapshot.empty) {
          setReviews(INITIAL_REVIEWS);
          if (auth.currentUser) {
            for (const r of INITIAL_REVIEWS) {
              await setDoc(doc(db, 'reviews', r.id), r).catch(() => {});
            }
          }
        } else {
          const loaded: Review[] = [];
          snapshot.forEach((d) => loaded.push(d.data() as Review));
          const map = new Map<string, Review>();
          INITIAL_REVIEWS.forEach((r) => map.set(r.id, r));
          loaded.forEach((r) => map.set(r.id, r));
          const sorted = Array.from(map.values()).sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          setReviews(sorted);
        }
      },
      (err) => {
        console.warn('Reviews snapshot notice:', err);
      }
    );

    return () => {
      unsubWorkers();
      unsubReviews();
    };
  }, [userProfile?.uid]);

  useEffect(() => {
    if (!userProfile) {
      return;
    }

    INITIAL_WORKERS.forEach((w) => {
      setDoc(doc(db, 'workers', w.id), w, { merge: true }).catch(() => {});
    });

    const unsubJobs = onSnapshot(
      collection(db, 'jobs'),
      (snapshot) => {
        const list: Job[] = [];
        snapshot.forEach((d) => {
          const data = d.data() as Job;
          if (data.customerId === userProfile.uid) {
            list.push(data);
          }
        });
        list.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setJobs(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'jobs');
      }
    );

    const unsubPayments = onSnapshot(
      collection(db, 'payments'),
      (snapshot) => {
        const list: Payment[] = [];
        snapshot.forEach((d) => {
          const data = d.data() as Payment;
          if (data.customerId === userProfile.uid) {
            list.push(data);
          }
        });
        list.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setPayments(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'payments');
      }
    );

    return () => {
      unsubJobs();
      unsubPayments();
    };
  }, [userProfile]);

  const handleUpdateProfile = async (updates: Partial<UserProfile>) => {
    if (!userProfile) return;
    const updated: UserProfile = { ...userProfile, ...updates };
    setUserProfile(updated);
    if (auth.currentUser) {
      try {
        await setDoc(doc(db, 'users', userProfile.uid), updated, {
          merge: true,
        });
      } catch (err) {
        handleFirestoreError(
          err,
          OperationType.UPDATE,
          `users/${userProfile.uid}`
        );
      }
    }
  };

  const handleSimulatedProviderLogin = async (
    providerId: 'google.com' | 'microsoft.com',
    customName?: string,
    customEmail?: string,
    role?: UserRole
  ) => {
    if (userProfile) {
      const mergedProviders = Array.from(
        new Set([...userProfile.authProviders, providerId])
      );
      await handleUpdateProfile({
        displayName: customName || userProfile.displayName,
        email: customEmail || userProfile.email,
        role: role || userProfile.role,
        authProviders: mergedProviders,
      });
      return;
    }

    const fallbackUid = auth.currentUser?.uid || `aura_user_${Date.now()}`;
    const newProfile: UserProfile = {
      uid: fallbackUid,
      displayName: customName || 'Verified Member',
      email: customEmail || 'member@outlook.com',
      phoneNumber: '',
      phoneVerified: false,
      authProviders: [providerId],
      role: role || 'customer',
      createdAt: new Date().toISOString(),
    };
    setUserProfile(newProfile);
    if (auth.currentUser) {
      await setDoc(doc(db, 'users', fallbackUid), newProfile, { merge: true });
    }
  };

  const handleConfirmHire = async (bookingData: {
    worker: Worker;
    title: string;
    scopeDescription: string;
    address: string;
    scheduledFor: string;
    estimatedHours: number;
    materialsAllowance: number;
    paymentMethod: string;
  }) => {
    if (!userProfile) {
      setActiveSection('signin');
      return;
    }

    const {
      worker,
      title,
      scopeDescription,
      address,
      scheduledFor,
      estimatedHours,
      materialsAllowance,
      paymentMethod,
    } = bookingData;

    const laborCost = Math.round(worker.hourlyRate * estimatedHours);
    const escrowFee = Math.round((laborCost + materialsAllowance) * 0.05);
    const totalAmount = laborCost + materialsAllowance + escrowFee;
    const nowIso = new Date().toISOString();
    const jobId = `JOB-${Math.floor(100000 + Math.random() * 900000)}`;
    const paymentId = `PAY-${Math.floor(100000 + Math.random() * 900000)}`;
    const safetyPin = Math.floor(1000 + Math.random() * 9000).toString();
    const txHash = `0xAURA${Math.random()
      .toString(16)
      .substring(2, 10)
      .toUpperCase()}9F2B`;

    const newJob: Job = {
      id: jobId,
      customerId: userProfile.uid,
      customerName: userProfile.displayName,
      workerId: worker.id,
      workerName: worker.name,
      workerTrade: worker.trade,
      workerLicense: worker.licenseNumber,
      title,
      scopeDescription,
      address,
      scheduledFor,
      estimatedHours,
      hourlyRate: worker.hourlyRate,
      laborCost,
      materialsAllowance,
      escrowFee,
      totalAmount,
      status: 'ESCROW_LOCKED',
      siteSafetyPin: safetyPin,
      reviewed: false,
      createdAt: nowIso,
      updatedAt: nowIso,
      timeline: [
        {
          stage: 'ESCROW_LOCKED',
          label: 'Escrow Vault Locked & Contract Signed',
          timestamp: nowIso,
          note: `$${totalAmount}.00 secured in Aura Escrow (${txHash}). Site Safety PIN [${safetyPin}] generated.`,
        },
      ],
    };

    const newPayment: Payment = {
      id: paymentId,
      jobId,
      customerId: userProfile.uid,
      workerId: worker.id,
      workerName: worker.name,
      workerTrade: worker.trade,
      jobTitle: title,
      laborCost,
      materialsAllowance,
      escrowFee,
      totalAmount,
      status: 'ESCROW_LOCKED',
      paymentMethod,
      txHash,
      createdAt: nowIso,
    };

    setJobs((prev) => [newJob, ...prev]);
    setPayments((prev) => [newPayment, ...prev]);

    if (auth.currentUser) {
      try {
        await setDoc(doc(db, 'jobs', jobId), newJob);
        await setDoc(doc(db, 'payments', paymentId), newPayment);
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, 'jobs');
      }
    }

    setActiveSection('tracker');
    showToast(
      `Escrow Vault Locked ($${totalAmount}). ${worker.name} assigned to ${jobId}.`
    );
  };

  const handleAdvanceJobStage = async (job: Job) => {
    const currentIndex = JOB_STAGES.findIndex((s) => s.stage === job.status);
    if (currentIndex === -1 || currentIndex >= JOB_STAGES.length - 1) return;

    const nextStageObj = JOB_STAGES[currentIndex + 1];
    const nowIso = new Date().toISOString();

    let stageNote = nextStageObj.description;
    if (nextStageObj.stage === 'WORKER_DISPATCHED') {
      stageNote = `${job.workerName} departed toward ${job.address}. Live GPS Telemetry active.`;
    } else if (nextStageObj.stage === 'ON_SITE_VERIFIED') {
      stageNote = `Site Safety PIN [${job.siteSafetyPin}] & License [${job.workerLicense}] verified at door.`;
    } else if (nextStageObj.stage === 'WORK_IN_PROGRESS') {
      stageNote = `Active ${job.workerTrade.toLowerCase()} execution started. Wholesale material receipts uploaded with 0% markup.`;
    } else if (nextStageObj.stage === 'COMPLETED_RELEASED') {
      stageNote = `Homeowner approved work quality. $${job.totalAmount}.00 released from Escrow to ${job.workerName}.`;
    }

    const updatedTimeline = [
      ...job.timeline,
      {
        stage: nextStageObj.stage,
        label: nextStageObj.shortLabel,
        timestamp: nowIso,
        note: stageNote,
      },
    ];

    const updatedJob: Job = {
      ...job,
      status: nextStageObj.stage,
      updatedAt: nowIso,
      timeline: updatedTimeline,
    };

    setJobs((prev) => prev.map((j) => (j.id === job.id ? updatedJob : j)));

    if (auth.currentUser) {
      try {
        await setDoc(doc(db, 'jobs', job.id), updatedJob, { merge: true });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `jobs/${job.id}`);
      }
    }

    if (nextStageObj.stage === 'COMPLETED_RELEASED') {
      const targetPayment = payments.find((p) => p.jobId === job.id);
      if (targetPayment) {
        const updatedPayment: Payment = {
          ...targetPayment,
          status: 'RELEASED_TO_WORKER',
          releasedAt: nowIso,
        };
        setPayments((prev) =>
          prev.map((p) => (p.id === targetPayment.id ? updatedPayment : p))
        );
        if (auth.currentUser) {
          try {
            await setDoc(
              doc(db, 'payments', targetPayment.id),
              updatedPayment,
              { merge: true }
            );
          } catch (err) {
            handleFirestoreError(
              err,
              OperationType.UPDATE,
              `payments/${targetPayment.id}`
            );
          }
        }
      }
      showToast(
        `Contract ${job.id} Settled! $${job.totalAmount} released from Escrow to ${job.workerName}.`
      );
    } else {
      showToast(`Telemetry updated: ${nextStageObj.shortLabel}`);
    }
  };

  const handleSubmitReview = async (reviewData: {
    worker: Worker;
    rating: number;
    transparencyScore: number;
    craftsmanshipScore: number;
    punctualityScore: number;
    comment: string;
    projectTitle: string;
    finalCostPaid: number;
  }) => {
    if (!userProfile) {
      setActiveSection('signin');
      return;
    }

    const revId = `rev_${Date.now()}`;
    const newReview: Review = {
      id: revId,
      workerId: reviewData.worker.id,
      workerName: reviewData.worker.name,
      customerId: userProfile.uid,
      customerName: userProfile.displayName,
      rating: reviewData.rating,
      transparencyScore: reviewData.transparencyScore,
      craftsmanshipScore: reviewData.craftsmanshipScore,
      punctualityScore: reviewData.punctualityScore,
      comment: reviewData.comment,
      projectTitle: reviewData.projectTitle,
      verifiedHire: true,
      finalCostPaid: reviewData.finalCostPaid,
      createdAt: new Date().toISOString(),
    };

    const currentCount = reviewData.worker.reviewCount || 1;
    const newCount = currentCount + 1;
    const newAvg = Number(
      (
        (reviewData.worker.rating * currentCount + reviewData.rating) /
        newCount
      ).toFixed(2)
    );

    const updatedWorker: Worker = {
      ...reviewData.worker,
      rating: newAvg,
      reviewCount: newCount,
    };

    setReviews((prev) => [newReview, ...prev]);
    setWorkers((prev) =>
      prev.map((w) => (w.id === updatedWorker.id ? updatedWorker : w))
    );

    if (auth.currentUser) {
      try {
        await setDoc(doc(db, 'reviews', revId), newReview);
        await setDoc(doc(db, 'workers', updatedWorker.id), updatedWorker, {
          merge: true,
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, 'reviews');
      }
    }

    showToast(
      `Client evaluation recorded for ${reviewData.worker.name} (${newAvg} ★)`
    );
  };

  const handleRegisterWorker = async (newWorker: Worker) => {
    setWorkers((prev) => [newWorker, ...prev]);
    if (auth.currentUser) {
      try {
        await setDoc(doc(db, 'workers', newWorker.id), newWorker);
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, 'workers');
      }
    }
    showToast(
      `${newWorker.name} (${newWorker.licenseNumber}) certified in THE AURA WORKERS Guild.`
    );
  };

  const filteredWorkers = useMemo(() => {
    const list = workers.filter((w) => {
      if (selectedTrade !== 'All' && w.trade !== selectedTrade) return false;
      if (w.hourlyRate > maxRate) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = w.name.toLowerCase().includes(q);
        const matchTrade = w.trade.toLowerCase().includes(q);
        const matchSpec = w.specialty.toLowerCase().includes(q);
        const matchLic = w.licenseNumber.toLowerCase().includes(q);
        const matchNeighborhood = w.neighborhood.toLowerCase().includes(q);
        const matchTask = w.transparentRates.some((t) =>
          t.task.toLowerCase().includes(q)
        );
        const matchCert = (w.certifications || []).some((c) =>
          c.toLowerCase().includes(q)
        );
        const matchEquip = (w.equipmentManifest || []).some((e) =>
          e.toLowerCase().includes(q)
        );
        return (
          matchName ||
          matchTrade ||
          matchSpec ||
          matchLic ||
          matchNeighborhood ||
          matchTask ||
          matchCert ||
          matchEquip
        );
      }
      return true;
    });

    return list.sort((a, b) => {
      if (sortBy === 'rate_asc') return a.hourlyRate - b.hourlyRate;
      if (sortBy === 'dispatch') return a.responseTimeMins - b.responseTimeMins;
      if (sortBy === 'jobs') return b.completedJobs - a.completedJobs;
      return b.rating - a.rating;
    });
  }, [workers, selectedTrade, maxRate, searchQuery, sortBy]);

  const avgAuraRate =
    calcTrade === 'Painter'
      ? 39
      : calcTrade === 'Plumber'
      ? 44
      : calcTrade === 'Carpenter'
      ? 45
      : calcTrade === 'Masonry'
      ? 45
      : calcTrade === 'HVAC'
      ? 49
      : 51;
  const auraDirectLabor = Math.round(avgAuraRate * calcHours);
  const auraEscrowFee = Math.round((auraDirectLabor + calcMaterials) * 0.05);
  const auraTotal = auraDirectLabor + calcMaterials + auraEscrowFee;
  const agencyInflatedTotal = Math.round(
    avgAuraRate * 2.05 * calcHours + 79 + calcMaterials * 1.35
  );
  const netCustomerSavings = agencyInflatedTotal - auraTotal;

  const escrowLockedSum = payments
    .filter((p) => p.status === 'ESCROW_LOCKED')
    .reduce((acc, p) => acc + p.totalAmount, 0);
  const releasedSum = payments
    .filter((p) => p.status === 'RELEASED_TO_WORKER')
    .reduce((acc, p) => acc + p.totalAmount, 0);

  // =========================================================================
  // MANDATORY SIGN-IN GATE: Users cannot enter the site until signed in!
  // =========================================================================
  if (!userProfile || activeSection === 'signin') {
    return (
      <SignInPage
        userProfile={userProfile}
        onUpdateProfile={handleUpdateProfile}
        onSimulatedProviderLogin={handleSimulatedProviderLogin}
        onContinueToPlatform={() => {
          if (!userProfile) return;
          setActiveSection('discover');
          showToast(
            `Welcome, ${userProfile.displayName}! Verified session active.`
          );
        }}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-[#0F172A]">
      {/* Blue & White Executive Toast Notification */}
      {toastBanner && (
        <div className="fixed bottom-6 right-6 z-50 max-w-md bg-[#0B192C] text-white border border-sky-400/50 px-5 py-3.5 rounded-2xl shadow-[0_24px_60px_rgba(11,25,44,0.45)] flex items-center gap-3.5 animate-in fade-in slide-in-from-bottom-4">
          <div className="w-7 h-7 rounded-lg bg-[#2563EB] flex items-center justify-center shrink-0">
            <ShieldCheck className="w-4 h-4 text-white" />
          </div>
          <span className="text-xs font-medium leading-snug text-white">
            {toastBanner}
          </span>
        </div>
      )}

      {/* Crisp Blue & White Sticky Command Header */}
      <header className="sticky top-0 z-40 h-20 bg-white/95 backdrop-blur-xl border-b border-blue-100 shadow-[0_4px_24px_rgba(15,23,42,0.03)] px-4 sm:px-8">
        <div className="max-w-[1440px] mx-auto h-full flex items-center justify-between gap-4">
          {/* Left: Brand Crest & Primary Navigation */}
          <div className="flex items-center gap-8">
            <button
              type="button"
              onClick={() => setActiveSection('discover')}
              className="flex items-center gap-3.5 text-left group"
            >
              <div className="w-10 h-10 rounded-xl bg-[#2563EB] flex items-center justify-center shadow-[0_6px_20px_rgba(37,99,235,0.3)] group-hover:bg-[#1D4ED8] transition-colors">
                <ShieldCheck className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="font-display font-extrabold text-base sm:text-lg tracking-tight text-slate-900 block leading-none">
                  THE AURA WORKERS
                </span>
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#2563EB] font-semibold block mt-1">
                  VERIFIED TRADE & ESCROW NETWORK
                </span>
              </div>
            </button>

            {/* Segmented Blue & White Navigation */}
            <nav className="hidden lg:flex items-center gap-1 bg-slate-100/90 p-1.5 rounded-xl border border-slate-200/80">
              <button
                type="button"
                onClick={() => setActiveSection('discover')}
                className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                  activeSection === 'discover'
                    ? 'bg-[#2563EB] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Verified Craftspeople ({workers.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveSection('tracker')}
                className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${
                  activeSection === 'tracker'
                    ? 'bg-[#2563EB] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    activeSection === 'tracker'
                      ? 'bg-white'
                      : 'bg-emerald-500'
                  }`}
                />
                Live Job Telemetry ({jobs.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveSection('ledger')}
                className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                  activeSection === 'ledger'
                    ? 'bg-[#2563EB] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Escrow & Payment Ledger ({payments.length})
              </button>
            </nav>
          </div>

          {/* Right: E2EE Channel & Authenticated Member Control */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() =>
                setChatDrawerState({
                  isOpen: true,
                  worker: workers[0],
                  job: jobs[0] || null,
                })
              }
              className="hidden sm:flex items-center gap-2 px-3.5 py-2 bg-blue-50/70 hover:bg-blue-100/80 border border-blue-200 rounded-xl text-xs font-semibold text-[#1E3A8A] transition-all"
            >
              <MessageSquareLock className="w-4 h-4 text-[#2563EB]" />
              <span>AES-256 Comms</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setAuthModalOpen(true)}
                className="flex items-center gap-3 px-3.5 py-1.5 bg-white hover:bg-slate-50 border border-blue-200 rounded-xl transition-all shadow-2xs"
              >
                <div className="text-left">
                  <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
                    {userProfile.displayName.split(' ')[0]}
                    {userProfile.phoneVerified ? (
                      <span className="font-mono text-[9px] px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md uppercase tracking-wider">
                        SMS + ID Verified
                      </span>
                    ) : (
                      <span className="font-mono text-[9px] px-2 py-0.5 bg-blue-50 text-[#2563EB] border border-blue-200 rounded-md uppercase tracking-wider">
                        Verify Mobile
                      </span>
                    )}
                  </div>
                  <div className="font-mono text-[10px] text-slate-400">
                    {userProfile.authProviders
                      .map((p) => p.replace('.com', '').toUpperCase())
                      .join(' • ')}
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  firebaseSignOut(auth).catch(() => {});
                  setUserProfile(null);
                  setActiveSection('signin');
                }}
                className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                title="Sign Out (Returns to Mandatory Sign-In Gate)"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Sub-Navigation Bar */}
      <div className="lg:hidden flex border-b border-blue-100 bg-white px-4 py-2 gap-1.5">
        <button
          type="button"
          onClick={() => setActiveSection('discover')}
          className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors ${
            activeSection === 'discover'
              ? 'bg-[#2563EB] text-white'
              : 'text-slate-600'
          }`}
        >
          Guild ({workers.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveSection('tracker')}
          className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors ${
            activeSection === 'tracker'
              ? 'bg-[#2563EB] text-white'
              : 'text-slate-600'
          }`}
        >
          Telemetry ({jobs.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveSection('ledger')}
          className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors ${
            activeSection === 'ledger'
              ? 'bg-[#2563EB] text-white'
              : 'text-slate-600'
          }`}
        >
          Ledger ({payments.length})
        </button>
      </div>

      {/* =====================================================================
          VIEW 1: DISCOVER CRAFTSPEOPLE (ROYAL BLUE HERO + WHITE DIRECTORY)
      ===================================================================== */}
      {activeSection === 'discover' && (
        <>
          {/* Full-Bleed Royal Blue Architectural Hero */}
          <section className="bg-royal-blueprint text-white border-b border-blue-900 relative overflow-hidden">
            <div className="max-w-[1440px] mx-auto px-4 sm:px-8 py-12 lg:py-16 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
              {/* Left 7 Columns: Proposition & Guild Pillars */}
              <div className="lg:col-span-7 space-y-8">
                <div className="space-y-5">
                  <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 bg-blue-500/15 border border-sky-400/30 rounded-full">
                    <span className="w-2 h-2 rounded-full bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.8)]" />
                    <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-sky-300 font-semibold">
                      STATE-LICENSED GUILD • ZERO AGENCY MARKUP
                    </span>
                  </div>

                  <h1 className="font-display text-4xl sm:text-5xl lg:text-[58px] font-extrabold tracking-tight text-white leading-[1.06]">
                    Master Craftsmanship.{' '}
                    <span className="text-sky-400 block sm:inline">
                      Audited Direct Pricing.
                    </span>
                  </h1>

                  <p className="text-base sm:text-lg text-blue-100/75 max-w-2xl leading-relaxed font-light">
                    Commission vetted master{' '}
                    <strong className="text-white font-semibold">
                      plumbers, architectural painters, electricians, and finish carpenters
                    </strong>{' '}
                    at transparent direct rates from{' '}
                    <span className="font-mono text-sky-400 font-semibold">
                      $38/hr
                    </span>
                    . Protected by our 4-point credential audit, wholesale store material receipts with 0% markup, and AES-256 encrypted comms.
                  </p>
                </div>

                {/* Refined Discipline Selector */}
                <div className="space-y-3">
                  <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-blue-200/60">
                    Filter Guild by Trade Discipline
                  </div>
                  <div className="flex flex-wrap gap-2.5">
                    {(
                      [
                        { label: 'All Disciplines (16)', val: 'All', icon: ShieldCheck },
                        { label: 'Master Plumbers', val: 'Plumber', icon: Wrench },
                        {
                          label: 'Architectural Painters',
                          val: 'Painter',
                          icon: Paintbrush,
                        },
                        {
                          label: 'Licensed Electricians',
                          val: 'Electrician',
                          icon: Zap,
                        },
                        {
                          label: 'Finish Carpenters',
                          val: 'Carpenter',
                          icon: Hammer,
                        },
                        {
                          label: 'HVAC & Climate',
                          val: 'HVAC',
                          icon: Wind,
                        },
                        {
                          label: 'Tile & Masonry',
                          val: 'Masonry',
                          icon: Layers,
                        },
                      ] as const
                    ).map((item) => {
                      const IconComponent = item.icon;
                      const isSelected = selectedTrade === item.val;
                      return (
                        <button
                          key={item.val}
                          type="button"
                          onClick={() => setSelectedTrade(item.val)}
                          className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2.5 border transition-all duration-200 ${
                            isSelected
                              ? 'bg-white text-[#0B192C] border-white shadow-[0_0_25px_rgba(255,255,255,0.25)]'
                              : 'bg-white/[0.06] text-white/85 border-white/[0.15] hover:bg-white/[0.12] hover:text-white'
                          }`}
                        >
                          <IconComponent
                            className={`w-4 h-4 ${
                              isSelected ? 'text-[#2563EB]' : 'text-sky-400'
                            }`}
                          />
                          {item.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 4 Executive Telemetry Pillars */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 border-t border-white/[0.12]">
                  <div className="space-y-1">
                    <div className="font-mono text-xl font-semibold text-white">
                      $38–$52<span className="text-xs text-blue-200/50">/hr</span>
                    </div>
                    <div className="text-xs text-blue-200/70">
                      Audited Direct Rates
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="font-mono text-xl font-semibold text-sky-400">
                      0% Markup
                    </div>
                    <div className="text-xs text-blue-200/70">
                      At-Cost Store Receipts
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="font-mono text-xl font-semibold text-white">
                      $1,000,000
                    </div>
                    <div className="text-xs text-blue-200/70">
                      Surety & Property Bond
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="font-mono text-xl font-semibold text-sky-400">
                      AES-256
                    </div>
                    <div className="text-xs text-blue-200/70">
                      Zero-Knowledge Comms
                    </div>
                  </div>
                </div>
              </div>

              {/* Right 5 Columns: Crisp White & Blue Price-Lock Concierge Instrument */}
              <div className="lg:col-span-5 bg-white text-slate-900 border border-blue-100 rounded-3xl p-7 shadow-[0_32px_90px_rgba(0,0,0,0.35)] space-y-6">
                <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                  <div>
                    <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#2563EB] font-bold block">
                      TRANSPARENT ESCROW ESTIMATOR
                    </span>
                    <h3 className="font-display text-base font-bold text-slate-900 mt-0.5">
                      Direct Rate vs. Agency Comparison
                    </h3>
                  </div>
                  <span className="font-mono text-[11px] px-2.5 py-1 bg-blue-50 text-[#2563EB] border border-blue-200 font-bold rounded-lg">
                    Save ~48%
                  </span>
                </div>

                <div className="space-y-5">
                  {/* Trade Selector */}
                  <div>
                    <label className="block font-mono text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-2">
                      1. Select Trade Discipline
                    </label>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
                      {(
                        [
                          'Plumber',
                          'Painter',
                          'Electrician',
                          'Carpenter',
                          'HVAC',
                          'Masonry',
                        ] as const
                      ).map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => {
                            setCalcTrade(t);
                            setSelectedTrade(t);
                          }}
                          className={`py-2 rounded-lg text-[11px] font-semibold transition-all ${
                            calcTrade === t
                              ? 'bg-[#2563EB] text-white shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Duration Slider */}
                  <div>
                    <div className="flex justify-between text-xs mb-2">
                      <span className="text-slate-500">
                        2. Estimated Execution Hours
                      </span>
                      <span className="font-mono font-bold text-slate-900">
                        {calcHours} hrs × ${avgAuraRate}/hr avg
                      </span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={8}
                      step={0.5}
                      value={calcHours}
                      onChange={(e) => setCalcHours(parseFloat(e.target.value))}
                      className="w-full"
                    />
                  </div>

                  {/* Materials Slider */}
                  <div>
                    <div className="flex justify-between text-xs mb-2">
                      <span className="text-slate-500">
                        3. Wholesale Materials Cap (0% Markup)
                      </span>
                      <span className="font-mono font-bold text-slate-900">
                        ${calcMaterials} receipt allowance
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={150}
                      step={10}
                      value={calcMaterials}
                      onChange={(e) =>
                        setCalcMaterials(parseInt(e.target.value, 10))
                      }
                      className="w-full"
                    />
                  </div>
                </div>

                {/* Ledger Output Card */}
                <div className="bg-[#F8FAFC] p-5 rounded-2xl border border-blue-100 space-y-2.5 font-mono text-xs">
                  <div className="flex justify-between text-slate-400 line-through">
                    <span>Typical Middleman Agency Quote:</span>
                    <span>${agencyInflatedTotal}.00</span>
                  </div>
                  <div className="flex justify-between text-slate-700">
                    <span>Aura Direct Craft Labor ({calcHours}h):</span>
                    <span className="font-semibold">${auraDirectLabor}.00</span>
                  </div>
                  <div className="flex justify-between text-slate-700">
                    <span>At-Cost Store Materials:</span>
                    <span className="font-semibold">${calcMaterials}.00</span>
                  </div>
                  <div className="flex justify-between text-slate-700">
                    <span>5% Escrow Vault & $1M Surety:</span>
                    <span className="font-semibold">${auraEscrowFee}.00</span>
                  </div>
                  <div className="pt-3 border-t border-blue-200 flex items-baseline justify-between">
                    <div>
                      <span className="font-sans font-bold text-sm text-slate-900 block">
                        Audited Ceiling Price
                      </span>
                      <span className="text-[11px] text-emerald-700 font-semibold">
                        Direct Client Savings: ${netCustomerSavings}.00
                      </span>
                    </div>
                    <span className="font-bold text-2xl text-[#2563EB]">
                      ${auraTotal}.00
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const matchingWorker =
                      workers.find((w) => w.trade === calcTrade) || workers[0];
                    setHireModalState({
                      worker: matchingWorker,
                      presetTask: `${calcTrade} Price-Locked Commission`,
                      presetHours: calcHours,
                    });
                  }}
                  className="w-full py-3.5 bg-[#2563EB] hover:bg-blue-700 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-2 shadow-[0_10px_25px_rgba(37,99,235,0.3)] transition-all"
                >
                  <Lock className="w-4 h-4" />
                  Reserve {calcTrade} at ${auraTotal} Ceiling Price
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </section>

          {/* Main Directory Container */}
          <main className="max-w-[1440px] w-full mx-auto px-4 sm:px-8 py-12 space-y-10">
            {/* Floating Blue & White Filter & Search Bar */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-blue-100 shadow-[0_12px_40px_rgba(37,99,235,0.05)]">
              <div className="flex-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-[#2563EB] absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by master plumber, painter, fixture repair, license #..."
                    className="w-full pl-11 pr-4 py-2.5 bg-[#F8FAFC] border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#2563EB]"
                  />
                </div>

                <div className="flex items-center gap-3.5 bg-[#F8FAFC] px-4 py-2 rounded-xl border border-slate-200">
                  <SlidersHorizontal className="w-4 h-4 text-[#2563EB] shrink-0" />
                  <div className="text-xs">
                    <span className="text-slate-500 font-mono uppercase text-[10px] tracking-wider block">
                      Rate Ceiling: ${maxRate}/hr
                    </span>
                    <input
                      type="range"
                      min={35}
                      max={65}
                      step={1}
                      value={maxRate}
                      onChange={(e) => setMaxRate(Number(e.target.value))}
                      className="w-24"
                    />
                  </div>
                </div>

                <select
                  value={sortBy}
                  onChange={(e) =>
                    setSortBy(
                      e.target.value as
                        | 'rating'
                        | 'rate_asc'
                        | 'dispatch'
                        | 'jobs'
                    )
                  }
                  className="px-3.5 py-2.5 bg-[#F8FAFC] border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-[#2563EB]"
                >
                  <option value="rating">Sort: Highest Standing (★)</option>
                  <option value="rate_asc">Sort: Lowest Hourly Rate ($)</option>
                  <option value="dispatch">Sort: Fastest Dispatch (Mins)</option>
                  <option value="jobs">Sort: Most Audited Jobs</option>
                </select>
              </div>

              <button
                type="button"
                onClick={() => setRegisterWorkerOpen(true)}
                className="px-5 py-2.5 bg-[#0B192C] hover:bg-slate-800 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors shrink-0"
              >
                <Plus className="w-4 h-4 text-sky-400" />
                Apply as a Master Craftsperson
              </button>
            </div>

            {/* Section Header */}
            <div className="flex items-end justify-between">
              <div>
                <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#2563EB] font-bold">
                  AUDITED DIRECTORY • {filteredWorkers.length} SPECIALISTS AVAILABLE
                </span>
                <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 mt-1">
                  Verified Master Craftspeople
                </h2>
              </div>
            </div>

            {/* Craftsperson Dossier Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
              {filteredWorkers.map((worker) => (
                <article
                  key={worker.id}
                  className="bg-white border border-blue-100 hover:border-[#2563EB] rounded-2xl overflow-hidden flex flex-col justify-between shadow-[0_8px_30px_rgba(15,23,42,0.04)] hover:shadow-[0_20px_50px_rgba(37,99,235,0.1)] hover:-translate-y-0.5 transition-all duration-300"
                >
                  <div>
                    {/* Group 1: Portrait, Identity & Audited Hourly Rate */}
                    <div className="p-6 pb-4 flex items-start justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="relative shrink-0">
                          <img
                            src={worker.avatar}
                            alt={worker.name}
                            className="w-16 h-16 rounded-2xl object-cover border-2 border-blue-100 shadow-xs"
                          />
                          <div
                            className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#2563EB] border-2 border-white flex items-center justify-center"
                            title="Identity & State License Verified"
                          >
                            <CheckCircle2 className="w-3 h-3 text-white" />
                          </div>
                        </div>

                        <div>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="font-mono text-[10px] uppercase tracking-wider px-2.5 py-0.5 bg-[#2563EB] text-white font-semibold rounded-md">
                              {worker.trade}
                            </span>
                            <span className="font-mono text-[10px] px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md font-semibold">
                              {worker.availabilityStatus || 'Available Today'}
                            </span>
                          </div>
                          <h3 className="font-display text-lg font-bold text-slate-900 mt-1">
                            {worker.name}
                          </h3>
                          <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3 text-[#2563EB] shrink-0" />
                            <span className="truncate">{worker.neighborhood}</span>
                          </div>
                        </div>
                      </div>

                      {/* Audited Direct Rate Pill */}
                      <div className="text-right shrink-0 bg-blue-50/70 px-3.5 py-2 rounded-xl border border-blue-200">
                        <div className="font-mono text-xl font-bold text-[#1E3A8A]">
                          ${worker.hourlyRate}
                          <span className="text-xs font-normal text-slate-500">
                            /hr
                          </span>
                        </div>
                        <div className="font-mono text-[10px] text-emerald-700 font-semibold">
                          $0 Callout
                        </div>
                      </div>
                    </div>

                    {/* Performance Telemetry Micro-Bar */}
                    <div className="px-6 pb-3.5 grid grid-cols-4 gap-1.5 text-center font-mono text-[10px]">
                      <div className="bg-[#F8FAFC] py-1.5 px-2 rounded-lg border border-slate-200/80">
                        <span className="font-bold text-slate-900 block">
                          {worker.completedJobs}
                        </span>
                        <span className="text-slate-400">Jobs</span>
                      </div>
                      <div className="bg-[#F8FAFC] py-1.5 px-2 rounded-lg border border-slate-200/80">
                        <span className="font-bold text-emerald-700 block">
                          {worker.onTimeRatePct || 99.4}%
                        </span>
                        <span className="text-slate-400">On-Time</span>
                      </div>
                      <div className="bg-[#F8FAFC] py-1.5 px-2 rounded-lg border border-slate-200/80">
                        <span className="font-bold text-[#2563EB] block">
                          {worker.warrantyMonths || 36} Mo
                        </span>
                        <span className="text-slate-400">Warranty</span>
                      </div>
                      <div className="bg-[#F8FAFC] py-1.5 px-2 rounded-lg border border-slate-200/80">
                        <span className="font-bold text-slate-900 block">
                          {worker.yearsExperience} Yrs
                        </span>
                        <span className="text-slate-400">Exp.</span>
                      </div>
                    </div>

                    {/* Group 2: Clickable 4-Point Security & Verification Seal Strip */}
                    <div className="px-6 py-2.5 bg-[#F8FAFC] border-y border-blue-100 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 font-mono text-[11px] text-slate-700 font-medium">
                        <ShieldCheck className="w-4 h-4 text-[#2563EB] shrink-0" />
                        <span>{worker.licenseNumber}</span>
                        <span className="text-slate-300">•</span>
                        <span className="text-emerald-700 font-semibold">
                          $1M Bonded
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setDossierWorker(worker)}
                        className="font-mono text-[10px] uppercase tracking-wider text-[#2563EB] font-bold hover:underline flex items-center gap-0.5 shrink-0"
                      >
                        Full Dossier
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Group 3: Specialty, Certifications, Tool Manifest & Fixed-Scope Packages */}
                    <div className="p-6 space-y-4">
                      <div>
                        <div className="text-xs font-semibold text-[#1E3A8A] mb-1">
                          {worker.specialty}
                        </div>
                        <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">
                          {worker.bio}
                        </p>
                      </div>

                      {/* Certifications & Diagnostic Rig Pills */}
                      <div className="flex flex-wrap gap-1.5">
                        {(worker.certifications || []).slice(0, 2).map((c, i) => (
                          <span
                            key={`cert-${i}`}
                            className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50/80 text-[#1E3A8A] border border-blue-200/80 rounded-md font-mono text-[10px]"
                          >
                            <Award className="w-2.5 h-2.5 text-[#2563EB] shrink-0" />
                            <span className="truncate max-w-[200px]">{c}</span>
                          </span>
                        ))}
                        {(worker.equipmentManifest || [])
                          .slice(0, 1)
                          .map((eq, i) => (
                            <span
                              key={`eq-${i}`}
                              className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-700 border border-slate-200 rounded-md font-mono text-[10px]"
                            >
                              <Wrench className="w-2.5 h-2.5 text-[#2563EB] shrink-0" />
                              <span className="truncate max-w-[200px]">
                                {eq}
                              </span>
                            </span>
                          ))}
                      </div>

                      {/* Audited Case Study Highlight */}
                      {worker.recentProjects && worker.recentProjects[0] && (
                        <div className="bg-blue-50/40 p-3 rounded-xl border border-blue-100/90 space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-mono text-[9px] uppercase tracking-wider text-[#2563EB] font-bold flex items-center gap-1">
                              <Briefcase className="w-3 h-3" /> Recent Audited Case
                            </span>
                            <span className="font-mono text-[10px] font-bold text-emerald-700">
                              ${worker.recentProjects[0].finalCost} Paid (Incl. $
                              {worker.recentProjects[0].materialsCost} Mat.)
                            </span>
                          </div>
                          <div className="text-[11px] font-semibold text-slate-800 truncate">
                            {worker.recentProjects[0].title}
                          </div>
                          <p className="text-[11px] text-slate-500 line-clamp-1">
                            {worker.recentProjects[0].summary}
                          </p>
                        </div>
                      )}

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                            Standardized Scope (0% Material Markup)
                          </span>
                          <button
                            type="button"
                            onClick={() => setDossierWorker(worker)}
                            className="font-mono text-[10px] text-[#2563EB] hover:underline"
                          >
                            +{worker.transparentRates.length} Packages
                          </button>
                        </div>
                        {worker.transparentRates.slice(0, 2).map((task, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() =>
                              setHireModalState({
                                worker,
                                presetTask: task.task,
                                presetHours: parseFloat(task.estimatedHours) || 2,
                              })
                            }
                            className="w-full flex items-center justify-between px-3.5 py-2.5 bg-[#F8FAFC] hover:bg-blue-50/70 border border-slate-200/80 hover:border-[#2563EB] rounded-xl text-left transition-all group"
                          >
                            <div className="pr-2 truncate">
                              <span className="text-xs font-medium text-slate-800 truncate block group-hover:text-[#2563EB] transition-colors">
                                {task.task}
                              </span>
                              <span className="font-mono text-[10px] text-slate-400">
                                Est. {task.estimatedHours}
                              </span>
                            </div>
                            <span className="font-mono text-xs font-bold text-[#2563EB] shrink-0">
                              ${task.flatPrice}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Group 4: Verified Rating, Encrypted Chat & Reserve Actions */}
                  <div className="px-6 py-4 bg-[#F8FAFC] border-t border-blue-100 space-y-3.5">
                    <div className="flex items-center justify-between text-xs">
                      <button
                        type="button"
                        onClick={() => setReviewModalState({ worker })}
                        className="flex items-center gap-1.5 hover:underline"
                      >
                        <Star className="w-4 h-4 fill-[#2563EB] text-[#2563EB]" />
                        <span className="font-mono font-bold text-slate-900">
                          {worker.rating.toFixed(2)}
                        </span>
                        <span className="text-slate-400">
                          ({worker.reviewCount} verified reviews)
                        </span>
                      </button>

                      <span className="font-mono text-[11px] text-emerald-700 font-medium">
                        ~{worker.responseTimeMins}m dispatch
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        onClick={() =>
                          setChatDrawerState({
                            isOpen: true,
                            worker,
                            job: jobs.find((j) => j.workerId === worker.id),
                          })
                        }
                        className="py-2.5 px-3 bg-white hover:bg-blue-50 border border-blue-200 rounded-xl text-xs font-semibold text-[#1E3A8A] flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
                      >
                        <MessageSquareLock className="w-3.5 h-3.5 text-[#2563EB]" />
                        E2EE Chat
                      </button>

                      <button
                        type="button"
                        onClick={() => setHireModalState({ worker })}
                        className="py-2.5 px-3 bg-[#2563EB] hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                      >
                        <Lock className="w-3.5 h-3.5" />
                        Reserve Pro
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </main>
        </>
      )}

      {/* =====================================================================
          VIEW 2: REAL-TIME JOB STATUS TRACKING & TELEMETRY
      ===================================================================== */}
      {activeSection === 'tracker' && (
        <main className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-8 py-12 space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0B192C] text-white p-7 rounded-3xl border border-blue-900 shadow-lg">
            <div>
              <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-sky-400 font-semibold">
                <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
                LIVE ESCROW & ON-SITE TELEMETRY ENGINE
              </div>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-white mt-1.5">
                Real-Time Job Status & Site Safety Tracker
              </h2>
              <p className="text-xs sm:text-sm text-blue-100/70 mt-1">
                Monitor every milestone from Escrow Vault Lock to 4-digit Site Safety PIN handshake and final work approval.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setHireModalState({ worker: workers[0] })}
              className="px-5 py-3 bg-[#2563EB] hover:bg-blue-500 text-white font-semibold text-xs rounded-xl flex items-center gap-2 shrink-0 shadow-md transition-colors"
            >
              <Plus className="w-4 h-4" />
              Commission New Price-Locked Job
            </button>
          </div>

          {jobs.length === 0 ? (
            <div className="bg-white border border-blue-100 rounded-3xl p-12 text-center space-y-4 shadow-xs">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 text-[#2563EB] flex items-center justify-center mx-auto">
                <Wrench className="w-7 h-7" />
              </div>
              <h3 className="font-display text-xl font-bold text-slate-900">
                No Active Service Commissions Yet
              </h3>
              <p className="text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
                Reserve any verified master plumber or painter from the guild—or launch an instant interactive commission below to test the 5-stage live telemetry tracker.
              </p>
              <div className="flex flex-wrap justify-center gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setHireModalState({ worker: workers[0] })}
                  className="px-5 py-3 bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition-colors"
                >
                  Reserve Marcus Vance (Master Plumber • $45/hr)
                </button>
                <button
                  type="button"
                  onClick={() => setHireModalState({ worker: workers[1] })}
                  className="px-5 py-3 bg-white hover:bg-blue-50 text-[#1E3A8A] border border-blue-200 text-xs font-semibold rounded-xl transition-colors"
                >
                  Reserve Elena Rostova (Architectural Painter • $38/hr)
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-7">
              {jobs.map((job) => {
                const currentStageIdx = JOB_STAGES.findIndex(
                  (s) => s.stage === job.status
                );
                const currentStageMeta = JOB_STAGES[currentStageIdx];
                const assignedWorker =
                  workers.find((w) => w.id === job.workerId) || workers[0];

                return (
                  <div
                    key={job.id}
                    className="bg-white border border-blue-100 rounded-3xl overflow-hidden shadow-[0_12px_40px_rgba(15,23,42,0.05)]"
                  >
                    {/* Royal Navy Job Header Bar */}
                    <div className="bg-[#0B192C] text-white px-7 py-5 flex flex-wrap items-center justify-between gap-4 border-b border-blue-900">
                      <div className="flex items-center gap-3.5">
                        <span className="font-mono text-xs px-3 py-1 bg-[#2563EB] text-white font-semibold rounded-lg">
                          {job.id}
                        </span>
                        <div>
                          <h3 className="font-display text-base sm:text-lg font-bold text-white">
                            {job.title}
                          </h3>
                          <div className="font-mono text-xs text-blue-200/70 mt-0.5">
                            Specialist: {job.workerName} ({job.workerTrade} •{' '}
                            {job.workerLicense})
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-5">
                        <div className="bg-white/10 px-4 py-2 rounded-xl border border-white/15 font-mono text-xs">
                          <span className="text-blue-200/70">
                            Site Safety PIN:{' '}
                          </span>
                          <strong className="text-sky-400 tracking-widest">
                            {job.siteSafetyPin}
                          </strong>
                        </div>

                        <div className="text-right font-mono">
                          <div className="text-lg font-bold text-white">
                            ${job.totalAmount}.00
                          </div>
                          <div className="text-[10px] uppercase tracking-wider text-sky-400 font-semibold">
                            {job.status === 'COMPLETED_RELEASED'
                              ? 'Settled to Pro'
                              : 'Secured in Escrow'}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 5-Stage Telemetry Stepper */}
                    <div className="p-7 space-y-6">
                      <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                        {JOB_STAGES.map((step, idx) => {
                          const isDone = idx <= currentStageIdx;
                          const isCurrent = idx === currentStageIdx;
                          return (
                            <div
                              key={step.stage}
                              className={`p-4 rounded-2xl border transition-all ${
                                isCurrent
                                  ? 'bg-blue-50/80 border-[#2563EB] shadow-xs'
                                  : isDone
                                  ? 'bg-emerald-50/40 border-emerald-200'
                                  : 'bg-slate-50 border-slate-200 opacity-50'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="font-mono text-[10px] uppercase tracking-wider font-bold text-[#2563EB]">
                                  STAGE {step.stepNum}
                                </span>
                                {isDone && (
                                  <CheckCircle2
                                    className={`w-4 h-4 ${
                                      isCurrent
                                        ? 'text-[#2563EB]'
                                        : 'text-emerald-600'
                                    }`}
                                  />
                                )}
                              </div>
                              <div className="font-display text-xs font-bold text-slate-900 mb-1">
                                {step.shortLabel}
                              </div>
                              <p className="text-[11px] text-slate-500 leading-relaxed">
                                {step.description}
                              </p>
                            </div>
                          );
                        })}
                      </div>

                      {/* Interactive Stage Action + Encrypted Chat + Review Controls */}
                      <div className="bg-[#F8FAFC] p-5 rounded-2xl border border-blue-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div className="space-y-1">
                          <div className="font-mono text-xs uppercase font-bold text-slate-900 flex items-center gap-2">
                            <Clock className="w-4 h-4 text-[#2563EB]" />
                            Active Milestone: {currentStageMeta.shortLabel}
                          </div>
                          <p className="text-xs text-slate-500">
                            Residence: {job.address} • Window: {job.scheduledFor} •
                            Audited Breakdown: ${job.laborCost} Labor + $
                            {job.materialsAllowance} Materials + ${job.escrowFee}{' '}
                            Escrow
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                          <button
                            type="button"
                            onClick={() =>
                              setChatDrawerState({
                                isOpen: true,
                                worker: assignedWorker,
                                job,
                              })
                            }
                            className="px-4 py-2.5 bg-white hover:bg-blue-50 text-[#1E3A8A] border border-blue-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
                          >
                            <MessageSquareLock className="w-3.5 h-3.5 text-[#2563EB]" />
                            AES-256 Chat
                          </button>

                          {job.status !== 'COMPLETED_RELEASED' ? (
                            <button
                              type="button"
                              onClick={() => handleAdvanceJobStage(job)}
                              className="px-5 py-2.5 bg-[#2563EB] hover:bg-blue-700 text-white font-semibold text-xs rounded-xl flex items-center gap-1.5 shadow-sm transition-all"
                            >
                              {currentStageMeta.actionButtonLabel}
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                setReviewModalState({
                                  worker: assignedWorker,
                                  defaultProjectTitle: job.title,
                                  defaultCostPaid: job.totalAmount,
                                })
                              }
                              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl flex items-center gap-1.5"
                            >
                              <Star className="w-3.5 h-3.5 fill-white" />
                              Evaluate {job.workerName.split(' ')[0]}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Cryptographic Audit Log Timeline */}
                      <div className="space-y-2 pt-1">
                        <div className="font-mono text-[10px] uppercase tracking-widest text-slate-400 font-semibold">
                          Cryptographic Event Ledger
                        </div>
                        <div className="space-y-1.5">
                          {job.timeline.map((entry, idx) => (
                            <div
                              key={idx}
                              className="flex flex-col sm:flex-row sm:items-center justify-between text-xs bg-[#F8FAFC] px-4 py-2.5 rounded-xl border border-blue-100/80 font-mono"
                            >
                              <div className="flex items-center gap-2.5">
                                <span className="text-[#2563EB] font-semibold">
                                  [{entry.label}]
                                </span>
                                <span className="font-sans text-slate-700">
                                  {entry.note}
                                </span>
                              </div>
                              <span className="text-[11px] text-slate-400 shrink-0">
                                {new Date(entry.timestamp).toLocaleTimeString()}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      )}

      {/* =====================================================================
          VIEW 3: PAYMENT HISTORY & ESCROW LEDGER
      ===================================================================== */}
      {activeSection === 'ledger' && (
        <main className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-8 py-12 space-y-8">
          {/* Summary KPI Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div className="bg-white p-6 rounded-2xl border border-blue-100 shadow-2xs">
              <div className="font-mono text-[11px] uppercase tracking-wider text-slate-400">
                Active Escrow Vault Balance
              </div>
              <div className="font-mono text-3xl font-bold text-[#2563EB] mt-1.5">
                ${escrowLockedSum}.00
              </div>
              <div className="text-xs text-slate-500 mt-1">
                Held safely in Aura Trust Vault until completion sign-off
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-blue-100 shadow-2xs">
              <div className="font-mono text-[11px] uppercase tracking-wider text-slate-400">
                Total Settled to Verified Pros
              </div>
              <div className="font-mono text-3xl font-bold text-emerald-600 mt-1.5">
                ${releasedSum}.00
              </div>
              <div className="text-xs text-slate-500 mt-1">
                100% transparent direct payouts with 0% material markup
              </div>
            </div>

            <div className="bg-[#0B192C] text-white p-6 rounded-2xl border border-blue-900 shadow-md">
              <div className="font-mono text-[11px] uppercase tracking-wider text-sky-400">
                Active Property Surety Coverage
              </div>
              <div className="font-mono text-3xl font-bold text-white mt-1.5">
                $1,000,000
              </div>
              <div className="text-xs text-blue-200/70 mt-1">
                Commercial liability bond active on every transaction
              </div>
            </div>
          </div>

          {/* Payment Ledger Table */}
          <div className="bg-white border border-blue-100 rounded-3xl overflow-hidden shadow-[0_12px_40px_rgba(15,23,42,0.04)]">
            <div className="bg-[#0B192C] text-white px-7 py-5 flex items-center justify-between border-b border-blue-900">
              <div className="flex items-center gap-2.5">
                <Receipt className="w-4 h-4 text-sky-400" />
                <span className="font-mono text-xs uppercase tracking-[0.18em] font-semibold">
                  AUDITED ESCROW & PAYMENT HISTORY LEDGER
                </span>
              </div>
              <span className="font-mono text-xs text-blue-200/70">
                {payments.length} Recorded Contracts
              </span>
            </div>

            {payments.length === 0 ? (
              <div className="p-12 text-center space-y-3.5">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#2563EB] flex items-center justify-center mx-auto">
                  <Receipt className="w-6 h-6" />
                </div>
                <h3 className="font-display text-lg font-bold text-slate-900">
                  No Escrow Ledger Records Yet
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                  When you commission a master plumber, painter, or specialist, your itemized Escrow Contract and cryptographic payment receipt will be archived here.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveSection('discover')}
                  className="px-5 py-2.5 bg-[#2563EB] text-white text-xs font-semibold rounded-xl"
                >
                  Explore Verified Craftspeople
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#F8FAFC] border-b border-blue-100 font-mono text-[10px] uppercase tracking-wider text-slate-500">
                      <th className="py-4 px-5">Tx Hash / ID</th>
                      <th className="py-4 px-5">Commission & Specialist</th>
                      <th className="py-4 px-5">Labor</th>
                      <th className="py-4 px-5">Materials (0% Markup)</th>
                      <th className="py-4 px-5">Escrow Vault</th>
                      <th className="py-4 px-5">Ceiling Total</th>
                      <th className="py-4 px-5">Status</th>
                      <th className="py-4 px-5 text-right">Audit Receipt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {payments.map((pay) => (
                      <tr
                        key={pay.id}
                        className="hover:bg-blue-50/40 transition-colors"
                      >
                        <td className="py-4 px-5 font-mono">
                          <div className="font-bold text-slate-900">
                            {pay.id}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {pay.txHash}
                          </div>
                        </td>
                        <td className="py-4 px-5">
                          <div className="font-semibold text-slate-900">
                            {pay.jobTitle}
                          </div>
                          <div className="text-slate-500">
                            {pay.workerName} ({pay.workerTrade}) •{' '}
                            <span className="font-mono">{pay.jobId}</span>
                          </div>
                        </td>
                        <td className="py-4 px-5 font-mono text-slate-700">
                          ${pay.laborCost}.00
                        </td>
                        <td className="py-4 px-5 font-mono text-slate-700">
                          ${pay.materialsAllowance}.00
                        </td>
                        <td className="py-4 px-5 font-mono text-slate-700">
                          ${pay.escrowFee}.00
                        </td>
                        <td className="py-4 px-5 font-mono font-bold text-sm text-[#2563EB]">
                          ${pay.totalAmount}.00
                        </td>
                        <td className="py-4 px-5">
                          {pay.status === 'RELEASED_TO_WORKER' ? (
                            <span className="font-mono text-[10px] uppercase px-2.5 py-1 bg-emerald-500/10 text-emerald-700 rounded-md font-semibold">
                              SETTLED TO PRO
                            </span>
                          ) : (
                            <span className="font-mono text-[10px] uppercase px-2.5 py-1 bg-blue-50 text-[#2563EB] border border-blue-200 rounded-md font-semibold">
                              ESCROW LOCKED
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-5 text-right">
                          <button
                            type="button"
                            onClick={() => setSelectedReceipt(pay)}
                            className="px-3.5 py-1.5 bg-[#F8FAFC] hover:bg-[#2563EB] hover:text-white text-[#1E3A8A] border border-blue-200 text-[11px] font-semibold rounded-lg transition-colors"
                          >
                            Inspect Receipt
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      )}

      {/* Royal Navy Architectural Footer */}
      <footer className="bg-[#0B192C] text-white border-t border-blue-900 py-10 px-4 sm:px-8 mt-auto">
        <div className="max-w-[1440px] mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg bg-[#2563EB] flex items-center justify-center">
                <ShieldCheck className="w-4 h-4 text-white" />
              </div>
              <span className="font-display font-bold text-base tracking-wider text-white">
                THE AURA WORKERS
              </span>
            </div>
            <p className="text-xs text-blue-200/60 mt-2 max-w-md leading-relaxed">
              Verified trade guild for discerning homeowners and master craftspeople. Audited hourly rates, 4-point license verification, real-time escrow telemetry, and AES-256-GCM encrypted communication.
            </p>
          </div>

          <div className="flex flex-wrap gap-6 text-xs text-blue-200/70">
            <button
              type="button"
              onClick={() => setAuthModalOpen(true)}
              className="hover:text-sky-400 transition-colors"
            >
              Multi-Factor Identity Gateway
            </button>
            <button
              type="button"
              onClick={() => setRegisterWorkerOpen(true)}
              className="hover:text-sky-400 transition-colors"
            >
              Craftsperson Enrollment
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('tracker')}
              className="hover:text-sky-400 transition-colors"
            >
              Live Job Telemetry
            </button>
          </div>
        </div>
      </footer>

      {/* =====================================================================
          MODALS & DRAWERS
      ===================================================================== */}
      <AuthVerificationModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        userProfile={userProfile}
        onUpdateProfile={handleUpdateProfile}
        onSimulatedProviderLogin={handleSimulatedProviderLogin}
      />

      <VerificationDossierModal
        worker={dossierWorker}
        onClose={() => setDossierWorker(null)}
        onHireClick={(worker, presetTask, presetHours) => {
          setDossierWorker(null);
          setHireModalState({ worker, presetTask, presetHours });
        }}
      />

      <HireEscrowModal
        worker={hireModalState.worker}
        presetTask={hireModalState.presetTask}
        presetHours={hireModalState.presetHours}
        onClose={() => setHireModalState({ worker: null })}
        onConfirmHire={handleConfirmHire}
      />

      <EncryptedChatDrawer
        isOpen={chatDrawerState.isOpen}
        onClose={() =>
          setChatDrawerState({ isOpen: false, worker: null, job: null })
        }
        worker={chatDrawerState.worker}
        activeJob={chatDrawerState.job}
        userProfile={userProfile}
        onRequireAuth={() => setAuthModalOpen(true)}
      />

      <ReviewModal
        worker={reviewModalState.worker}
        reviews={reviews}
        userProfile={userProfile}
        defaultProjectTitle={reviewModalState.defaultProjectTitle}
        defaultCostPaid={reviewModalState.defaultCostPaid}
        onClose={() => setReviewModalState({ worker: null })}
        onSubmitReview={handleSubmitReview}
        onRequireAuth={() => setAuthModalOpen(true)}
      />

      <RegisterWorkerModal
        isOpen={registerWorkerOpen}
        onClose={() => setRegisterWorkerOpen(false)}
        onRegisterWorker={handleRegisterWorker}
      />

      {/* Itemized Cryptographic Escrow Receipt Modal */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B192C]/75 backdrop-blur-md p-4">
          <div className="w-full max-w-md bg-white border border-blue-100 rounded-2xl overflow-hidden shadow-[0_32px_90px_rgba(11,25,44,0.45)]">
            <div className="bg-[#0B192C] text-white px-6 py-4 flex items-center justify-between border-b border-blue-900">
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] font-semibold text-sky-400">
                AURA CRYPTOGRAPHIC ESCROW RECEIPT
              </span>
              <button
                type="button"
                onClick={() => setSelectedReceipt(null)}
                className="text-xs font-mono uppercase text-blue-200/60 hover:text-white"
              >
                Close
              </button>
            </div>
            <div className="p-6 space-y-4 font-mono text-xs">
              <div className="border-b border-slate-200 pb-3.5 space-y-1">
                <div className="text-slate-400">
                  RECEIPT ID: {selectedReceipt.id}
                </div>
                <div className="font-sans font-bold text-sm text-slate-900">
                  {selectedReceipt.jobTitle}
                </div>
                <div className="text-[#2563EB]">
                  Specialist: {selectedReceipt.workerName} (
                  {selectedReceipt.workerTrade})
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Direct Craft Labor:</span>
                  <span className="text-slate-900">
                    ${selectedReceipt.laborCost}.00
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">
                    Wholesale Materials (0% Markup):
                  </span>
                  <span className="text-slate-900">
                    ${selectedReceipt.materialsAllowance}.00
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">
                    5% Escrow & $1M Bond Protection:
                  </span>
                  <span className="text-slate-900">
                    ${selectedReceipt.escrowFee}.00
                  </span>
                </div>
                <div className="pt-2.5 border-t border-slate-200 flex justify-between font-bold text-base text-[#2563EB]">
                  <span>Total Audited Amount:</span>
                  <span>${selectedReceipt.totalAmount}.00</span>
                </div>
              </div>

              <div className="bg-[#F8FAFC] p-3.5 rounded-xl border border-blue-100 space-y-1 text-[11px]">
                <div>
                  <span className="text-slate-400">Vault Tx Hash: </span>
                  <span className="text-slate-900">
                    {selectedReceipt.txHash}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400">Payment Method: </span>
                  <span className="text-slate-700">
                    {selectedReceipt.paymentMethod}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400">Status: </span>
                  <strong className="text-emerald-700">
                    {selectedReceipt.status}
                  </strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
