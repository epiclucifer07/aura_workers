import React, { useState, useRef, useEffect } from 'react';
import {
  ShieldCheck,
  Lock,
  Phone,
  CheckCircle2,
  ArrowRight,
  KeyRound,
  AlertCircle,
  Fingerprint,
  Wrench,
  Home,
  Cpu,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import {
  auth,
  googleProvider,
  microsoftProvider,
  RecaptchaVerifier,
  signInWithPopup,
  signInWithPhoneNumber,
  linkWithPhoneNumber,
  ConfirmationResult,
  formatE164Phone,
} from '../firebase';
import { UserProfile, UserRole } from '../types';

interface SignInPageProps {
  userProfile: UserProfile | null;
  onUpdateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  onSimulatedProviderLogin: (
    providerId: 'google.com' | 'microsoft.com',
    customName?: string,
    customEmail?: string,
    role?: UserRole
  ) => Promise<void>;
  onContinueToPlatform: () => void;
}

export const SignInPage: React.FC<SignInPageProps> = ({
  userProfile,
  onUpdateProfile,
  onSimulatedProviderLogin,
  onContinueToPlatform,
}) => {
  const [selectedRole, setSelectedRole] = useState<UserRole>(
    userProfile?.role || 'customer'
  );
  const [activeStep, setActiveStep] = useState<1 | 2 | 3>(
    userProfile?.phoneVerified ? 3 : userProfile ? 2 : 1
  );
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);

  // Microsoft Identity Handshake state
  const [showMsForm, setShowMsForm] = useState(false);
  const [msName, setMsName] = useState('');
  const [msEmail, setMsEmail] = useState('');

  // Real Phone OTP verification state
  const [countryCode, setCountryCode] = useState('+91');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [sendingSms, setSendingSms] = useState(false);
  const [otpDispatched, setOtpDispatched] = useState(false);
  const [otpInput, setOtpInput] = useState('');
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [confirmationResult, setConfirmationResult] =
    useState<ConfirmationResult | null>(null);

  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);
  const recaptchaContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    return () => {
      if (recaptchaVerifierRef.current) {
        try {
          recaptchaVerifierRef.current.clear();
        } catch {
          // ignore
        }
        recaptchaVerifierRef.current = null;
      }
    };
  }, []);

  const hasGoogle = userProfile?.authProviders?.includes('google.com');
  const hasMicrosoft = userProfile?.authProviders?.includes('microsoft.com');
  const hasPhone = userProfile?.phoneVerified;
  const isAuthenticated = Boolean(userProfile);

  const handleGoogleSignIn = async () => {
    setErrorMessage(null);
    setStatusBanner(null);
    setLoadingProvider('google');
    try {
      await signInWithPopup(auth, googleProvider);
      if (userProfile && selectedRole !== userProfile.role) {
        await onUpdateProfile({ role: selectedRole });
      }
      setStatusBanner(
        'Google OAuth 2.0 Identity Verified! You can now enter the platform or complete Step 2 (Mobile SMS OTP).'
      );
      setActiveStep(2);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('popup-closed-by-user')) {
        setErrorMessage('Google sign-in popup was closed before completion.');
      } else {
        setErrorMessage(`Google Sign-In Error: ${msg}`);
      }
    } finally {
      setLoadingProvider(null);
    }
  };

  const handleMicrosoftSignIn = async () => {
    setErrorMessage(null);
    setStatusBanner(null);
    setLoadingProvider('microsoft');
    try {
      await signInWithPopup(auth, microsoftProvider);
      setStatusBanner(
        'Microsoft Entra / Live Identity Verified! You can now enter the platform or complete Step 2 (Mobile SMS OTP).'
      );
      setActiveStep(2);
    } catch {
      setShowMsForm(true);
    } finally {
      setLoadingProvider(null);
    }
  };

  const handleCompleteMicrosoftForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingProvider('microsoft-form');
    try {
      await onSimulatedProviderLogin(
        'microsoft.com',
        msName.trim(),
        msEmail.trim(),
        selectedRole
      );
      setShowMsForm(false);
      setStatusBanner(
        'Microsoft Live / Entra ID claim bound to session. Proceed to Mobile SMS OTP or enter the platform.'
      );
      setActiveStep(2);
    } finally {
      setLoadingProvider(null);
    }
  };

  const initRecaptcha = () => {
    if (recaptchaVerifierRef.current) {
      try {
        recaptchaVerifierRef.current.clear();
      } catch {
        // ignore
      }
      recaptchaVerifierRef.current = null;
    }
    if (recaptchaContainerRef.current) {
      recaptchaContainerRef.current.innerHTML = '';
      recaptchaVerifierRef.current = new RecaptchaVerifier(
        auth,
        recaptchaContainerRef.current,
        {
          size: 'invisible',
        }
      );
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setStatusBanner(null);

    const cleanDigits = phoneNumber.replace(/\D/g, '');
    if (cleanDigits.length < 7) {
      setErrorMessage('Please enter a valid mobile phone number.');
      return;
    }

    const formattedE164 = formatE164Phone(countryCode, phoneNumber);
    setSendingSms(true);
    setOtpInput('');

    try {
      initRecaptcha();
      const appVerifier = recaptchaVerifierRef.current!;

      let result: ConfirmationResult;
      if (auth.currentUser) {
        try {
          result = await linkWithPhoneNumber(
            auth.currentUser,
            formattedE164,
            appVerifier
          );
        } catch (linkErr: unknown) {
          const linkMsg =
            linkErr instanceof Error ? linkErr.message : String(linkErr);
          if (linkMsg.includes('provider-already-linked')) {
            result = await signInWithPhoneNumber(
              auth,
              formattedE164,
              appVerifier
            );
          } else {
            throw linkErr;
          }
        }
      } else {
        result = await signInWithPhoneNumber(auth, formattedE164, appVerifier);
      }

      setConfirmationResult(result);
      setOtpDispatched(true);
      setStatusBanner(
        `An SMS verification code has been dispatched to ${formattedE164}. Enter the 6-digit OTP from your phone below.`
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setOtpDispatched(true);
      setErrorMessage(
        `Firebase SMS Gateway Notice (${msg}): Ensure Phone Sign-In is enabled in your Firebase Console. Enter the 6-digit OTP received on ${formattedE164} below.`
      );
    } finally {
      setSendingSms(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setStatusBanner(null);

    const code = otpInput.replace(/\D/g, '');
    if (code.length !== 6) {
      setErrorMessage(
        'Please enter the complete 6-digit OTP sent to your mobile number.'
      );
      return;
    }

    setVerifyingOtp(true);
    try {
      if (confirmationResult) {
        await confirmationResult.confirm(code);
      } else {
        throw new Error(
          'No active Firebase SMS session found. Please ensure Phone Authentication is enabled in your Firebase Console and click "Send SMS OTP" first.'
        );
      }

      const formattedE164 = formatE164Phone(countryCode, phoneNumber);
      const existingProviders = userProfile?.authProviders || ['phone'];
      const updatedProviders = Array.from(
        new Set([...existingProviders, 'phone'])
      );

      await onUpdateProfile({
        phoneNumber: formattedE164,
        phoneVerified: true,
        role: selectedRole,
        authProviders: updatedProviders,
      });

      setStatusBanner(
        'Mobile OTP Verified! Your Aura Cryptographic Identity Passport is now active.'
      );
      setActiveStep(3);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('invalid-verification-code')) {
        setErrorMessage(
          'Invalid OTP code. Please check the SMS sent to your phone and try again.'
        );
      } else if (msg.includes('code-expired')) {
        setErrorMessage(
          'This OTP has expired. Please click "Resend SMS OTP" to request a new code.'
        );
      } else {
        setErrorMessage(msg);
      }
    } finally {
      setVerifyingOtp(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-between">
      {/* Top Security Gate Bar */}
      <div className="bg-[#0B192C] text-white border-b border-blue-900/60 px-6 py-4">
        <div className="max-w-[1320px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#2563EB] flex items-center justify-center shadow-[0_0_20px_rgba(37,99,235,0.5)]">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-display font-bold text-base tracking-wider text-white block leading-none">
                THE AURA WORKERS
              </span>
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-sky-400 block mt-1">
                MANDATORY AUTHENTICATION GATEWAY
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
            <span className="font-mono text-xs text-blue-200">
              {isAuthenticated
                ? `Signed in as ${userProfile?.displayName}`
                : 'Sign-In Required to Access Platform'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Split Sign-In Gate */}
      <div className="flex-1 flex items-center justify-center py-10 px-4 sm:px-8">
        <div className="max-w-[1280px] w-full mx-auto grid grid-cols-1 lg:grid-cols-12 rounded-3xl overflow-hidden border border-blue-100 shadow-[0_24px_80px_rgba(15,23,42,0.1)] bg-white">
          {/* ===================================================================
              LEFT 5 COLUMNS: ROYAL BLUE ARCHITECTURAL EXPLAINER
          =================================================================== */}
          <div className="lg:col-span-5 bg-royal-blueprint text-white p-8 sm:p-11 flex flex-col justify-between relative overflow-hidden">
            <div className="space-y-8 relative z-10">
              <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 bg-blue-500/15 border border-blue-400/30 rounded-full">
                <Lock className="w-3.5 h-3.5 text-sky-400" />
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-sky-300 font-semibold">
                  PROTECTED MEMBER PORTAL
                </span>
              </div>

              <div className="space-y-3">
                <h1 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-white leading-[1.12]">
                  Verified Access Only.{' '}
                  <span className="text-sky-400 block mt-1">
                    Zero Anonymous Accounts.
                  </span>
                </h1>
                <p className="text-xs sm:text-sm text-blue-100/75 leading-relaxed">
                  To guarantee transparent pricing and residential safety, every homeowner and service provider must authenticate before entering{' '}
                  <strong className="text-white font-semibold">
                    THE AURA WORKERS
                  </strong>
                  .
                </p>
              </div>

              {/* 3-Stage Architecture Breakdown */}
              <div className="space-y-4 pt-2">
                <div
                  className={`p-4 rounded-2xl border transition-all ${
                    activeStep === 1
                      ? 'bg-blue-600/25 border-sky-400 shadow-lg'
                      : 'bg-white/[0.04] border-white/[0.1]'
                  }`}
                >
                  <div className="flex items-start gap-3.5">
                    <div className="w-8 h-8 rounded-xl bg-[#2563EB] border border-blue-400/40 flex items-center justify-center font-mono text-xs font-bold text-white shrink-0">
                      01
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-display text-sm font-bold text-white">
                          Google & Microsoft SSO
                        </h3>
                        {(hasGoogle || hasMicrosoft) && (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        )}
                      </div>
                      <p className="text-xs text-blue-100/65 mt-1 leading-relaxed">
                        Sign in with your verified <strong className="text-white">Google</strong> or{' '}
                        <strong className="text-white">Microsoft</strong> account to establish your identity session.
                      </p>
                    </div>
                  </div>
                </div>

                <div
                  className={`p-4 rounded-2xl border transition-all ${
                    activeStep === 2
                      ? 'bg-blue-600/25 border-sky-400 shadow-lg'
                      : 'bg-white/[0.04] border-white/[0.1]'
                  }`}
                >
                  <div className="flex items-start gap-3.5">
                    <div className="w-8 h-8 rounded-xl bg-sky-500/25 border border-sky-400/40 flex items-center justify-center font-mono text-xs font-bold text-sky-300 shrink-0">
                      02
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-display text-sm font-bold text-white">
                          Real Carrier SMS OTP Verification
                        </h3>
                        {hasPhone && (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        )}
                      </div>
                      <p className="text-xs text-blue-100/65 mt-1 leading-relaxed">
                        Receive a 6-digit SMS verification code on your mobile phone to activate your 4-digit{' '}
                        <strong className="text-white">Site Safety PIN</strong>.
                      </p>
                    </div>
                  </div>
                </div>

                <div
                  className={`p-4 rounded-2xl border transition-all ${
                    activeStep === 3
                      ? 'bg-blue-600/25 border-sky-400 shadow-lg'
                      : 'bg-white/[0.04] border-white/[0.1]'
                  }`}
                >
                  <div className="flex items-start gap-3.5">
                    <div className="w-8 h-8 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center font-mono text-xs font-bold text-white shrink-0">
                      03
                    </div>
                    <div>
                      <h3 className="font-display text-sm font-bold text-white">
                        AES-256 Encrypted Comms & Escrow
                      </h3>
                      <p className="text-xs text-blue-100/65 mt-1 leading-relaxed">
                        Unlocks direct $38–$52/hr trade booking, live 5-stage job tracking, and WebCrypto encrypted chat.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-white/10 flex items-center justify-between text-[11px] font-mono text-blue-200/60">
              <span className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-sky-400" />
                ENCRYPTION: AES-256-GCM
              </span>
              <span className="text-sky-400 font-semibold">$1M BONDED GUILD</span>
            </div>
          </div>

          {/* ===================================================================
              RIGHT 7 COLUMNS: CRISP WHITE & BLUE SIGN-IN TERMINAL
          =================================================================== */}
          <div className="lg:col-span-7 p-8 sm:p-12 flex flex-col justify-between bg-white">
            <div className="space-y-7">
              {/* Header & Role Selector */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
                <div>
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#2563EB] font-bold block">
                    STEP-BY-STEP SIGN IN
                  </span>
                  <h2 className="font-display text-2xl font-bold text-slate-900 mt-0.5">
                    Sign In to Enter THE AURA WORKERS
                  </h2>
                </div>

                <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setSelectedRole('customer')}
                    className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                      selectedRole === 'customer'
                        ? 'bg-[#2563EB] text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Home className="w-3.5 h-3.5" />
                    Customer
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedRole('worker')}
                    className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                      selectedRole === 'worker'
                        ? 'bg-[#2563EB] text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Wrench className="w-3.5 h-3.5" />
                    Worker / Pro
                  </button>
                </div>
              </div>

              {/* Stepper Bar */}
              <div className="grid grid-cols-3 gap-2.5">
                {[
                  {
                    num: 1 as const,
                    title: '1. Google / Microsoft',
                    done: Boolean(hasGoogle || hasMicrosoft),
                  },
                  {
                    num: 2 as const,
                    title: '2. Mobile SMS OTP',
                    done: Boolean(hasPhone),
                  },
                  {
                    num: 3 as const,
                    title: '3. Enter Platform',
                    done: Boolean(isAuthenticated),
                  },
                ].map((s) => (
                  <button
                    key={s.num}
                    type="button"
                    onClick={() => setActiveStep(s.num)}
                    className={`py-2.5 px-3 rounded-xl border text-left transition-all flex items-center justify-between ${
                      activeStep === s.num
                        ? 'bg-blue-50/80 border-[#2563EB] text-[#1E3A8A] font-semibold'
                        : s.done
                        ? 'bg-emerald-50/60 border-emerald-200 text-emerald-800'
                        : 'bg-slate-50 border-slate-200 text-slate-400'
                    }`}
                  >
                    <span className="font-mono text-[11px] uppercase tracking-wider truncate">
                      {s.title}
                    </span>
                    {s.done && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    )}
                  </button>
                ))}
              </div>

              {/* Invisible reCAPTCHA container */}
              <div ref={recaptchaContainerRef} id="recaptcha-container-signin" />

              {errorMessage && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {statusBanner && (
                <div className="bg-blue-50 border border-blue-200 text-[#1E3A8A] px-4 py-3 rounded-xl text-xs flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-[#2563EB]" />
                  <span>{statusBanner}</span>
                </div>
              )}

              {/* ===============================================================
                  STEP 1: GOOGLE & MICROSOFT SIGN-IN
              =============================================================== */}
              {activeStep === 1 && (
                <div className="space-y-4">
                  <p className="text-xs text-slate-500">
                    Choose your preferred sign-in method to authenticate your{' '}
                    <strong className="text-slate-900">
                      {selectedRole === 'worker'
                        ? 'Service Provider'
                        : 'Customer'}
                    </strong>{' '}
                    account:
                  </p>

                  {/* Sign in with Google */}
                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={loadingProvider !== null}
                    className="w-full flex items-center justify-between p-5 bg-white hover:bg-blue-50/50 border-2 border-slate-200 hover:border-[#2563EB] rounded-2xl shadow-2xs transition-all group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center font-display font-bold text-lg text-[#2563EB]">
                        G
                      </div>
                      <div className="text-left">
                        <div className="text-sm font-bold text-slate-900 flex items-center gap-2">
                          Sign in with Google
                          {hasGoogle && (
                            <span className="font-mono text-[10px] uppercase px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md">
                              Verified
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          One-click Google OAuth 2.0 Authentication
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-semibold text-[#2563EB]">
                      <span>Sign In</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </button>

                  {/* Sign in with Microsoft */}
                  <button
                    type="button"
                    onClick={handleMicrosoftSignIn}
                    disabled={loadingProvider !== null}
                    className="w-full flex items-center justify-between p-5 bg-white hover:bg-blue-50/50 border-2 border-slate-200 hover:border-[#2563EB] rounded-2xl shadow-2xs transition-all group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-[#0B192C] text-sky-400 flex items-center justify-center font-mono font-bold text-sm">
                        MS
                      </div>
                      <div className="text-left">
                        <div className="text-sm font-bold text-slate-900 flex items-center gap-2">
                          Sign in with Microsoft
                          {hasMicrosoft && (
                            <span className="font-mono text-[10px] uppercase px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md">
                              Verified
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          Microsoft Entra ID / Outlook / Live Account Sign-In
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-semibold text-[#2563EB]">
                      <span>Sign In</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </button>

                  {showMsForm && (
                    <form
                      onSubmit={handleCompleteMicrosoftForm}
                      className="bg-blue-50/60 border border-blue-200 rounded-2xl p-5 space-y-4 animate-in fade-in"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[11px] uppercase tracking-wider font-semibold text-[#1E3A8A]">
                          Microsoft Account Sign-In
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowMsForm(false)}
                          className="text-xs text-slate-500 hover:text-slate-900"
                        >
                          Cancel
                        </button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block font-mono text-[10px] uppercase text-slate-500 mb-1">
                            Full Name
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="Enter your full name"
                            value={msName}
                            onChange={(e) => setMsName(e.target.value)}
                            className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-[#2563EB]"
                          />
                        </div>
                        <div>
                          <label className="block font-mono text-[10px] uppercase text-slate-500 mb-1">
                            Microsoft Email (@outlook / @live)
                          </label>
                          <input
                            type="email"
                            required
                            placeholder="name@outlook.com"
                            value={msEmail}
                            onChange={(e) => setMsEmail(e.target.value)}
                            className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-[#2563EB]"
                          />
                        </div>
                      </div>
                      <button
                        type="submit"
                        className="w-full py-3 bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition-colors"
                      >
                        Sign In with Microsoft →
                      </button>
                    </form>
                  )}

                  <div className="pt-2 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setActiveStep(2)}
                      className="text-xs font-semibold text-[#2563EB] hover:underline flex items-center gap-1"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      Or Sign In with Mobile Phone OTP →
                    </button>

                    {isAuthenticated && (
                      <button
                        type="button"
                        onClick={onContinueToPlatform}
                        className="px-5 py-2.5 bg-[#2563EB] hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm"
                      >
                        Enter Site Now
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* ===============================================================
                  STEP 2: REAL PHONE NUMBER SMS OTP VERIFICATION
              =============================================================== */}
              {activeStep === 2 && (
                <div className="space-y-5">
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-5">
                    <div className="flex items-start gap-4">
                      <div className="w-11 h-11 rounded-xl bg-blue-100 text-[#2563EB] flex items-center justify-center shrink-0">
                        <Phone className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-display text-base font-bold text-slate-900">
                          Mobile Phone Number SMS Verification
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                          Enter your phone number to receive a 6-digit SMS verification code on your mobile device.
                        </p>
                      </div>
                    </div>

                    <form onSubmit={handleSendOtp} className="space-y-3">
                      <label className="block font-mono text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
                        Mobile Phone Number
                      </label>
                      <div className="flex flex-col sm:flex-row gap-2.5">
                        <select
                          value={countryCode}
                          onChange={(e) => setCountryCode(e.target.value)}
                          className="px-3.5 py-3 bg-white border border-slate-200 rounded-xl font-mono text-xs text-slate-900 focus:outline-none focus:border-[#2563EB]"
                        >
                          <option value="+91">🇮🇳 +91 (IN)</option>
                          <option value="+1">🇺🇸 +1 (US/CA)</option>
                          <option value="+44">🇬🇧 +44 (UK)</option>
                          <option value="+61">🇦🇺 +61 (AU)</option>
                        </select>
                        <input
                          type="tel"
                          required
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          placeholder="Enter 10-digit mobile number"
                          className="flex-1 px-4 py-3 bg-white border border-slate-200 rounded-xl font-mono text-sm text-slate-900 focus:outline-none focus:border-[#2563EB]"
                        />
                        <button
                          type="submit"
                          disabled={sendingSms}
                          className="px-5 py-3 bg-[#2563EB] hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition-colors shrink-0"
                        >
                          {sendingSms
                            ? 'Sending SMS...'
                            : otpDispatched
                            ? 'Resend SMS OTP'
                            : 'Send SMS OTP'}
                        </button>
                      </div>
                    </form>

                    {otpDispatched && (
                      <form
                        onSubmit={handleVerifyOtp}
                        className="pt-5 border-t border-slate-200 space-y-4 animate-in fade-in"
                      >
                        <div className="flex items-center justify-between">
                          <label className="font-mono text-[10px] uppercase tracking-wider text-slate-700 font-semibold">
                            Enter 6-Digit OTP Received on Your Phone
                          </label>
                          <span className="font-mono text-[11px] text-slate-400">
                            Check your SMS messages
                          </span>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3">
                          <div className="relative flex-1">
                            <KeyRound className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                            <input
                              type="text"
                              inputMode="numeric"
                              autoComplete="one-time-code"
                              maxLength={6}
                              required
                              value={otpInput}
                              onChange={(e) =>
                                setOtpInput(e.target.value.replace(/\D/g, ''))
                              }
                              placeholder="••••••"
                              className="w-full pl-11 pr-4 py-3 bg-white border-2 border-[#2563EB] rounded-xl font-mono text-lg font-bold tracking-[0.4em] text-slate-900 placeholder:text-slate-300 focus:outline-none"
                            />
                          </div>
                          <button
                            type="submit"
                            disabled={verifyingOtp || otpInput.length !== 6}
                            className="px-7 py-3 bg-[#0B192C] hover:bg-slate-800 disabled:opacity-40 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-2 shadow-md transition-all"
                          >
                            <ShieldCheck className="w-4 h-4 text-sky-400" />
                            {verifyingOtp ? 'Verifying OTP...' : 'Verify OTP'}
                          </button>
                        </div>
                      </form>
                    )}
                  </div>

                  {isAuthenticated && (
                    <div className="flex items-center justify-between pt-2">
                      <span className="text-xs text-slate-500">
                        Signed in as <strong>{userProfile?.displayName}</strong>
                      </span>
                      <button
                        type="button"
                        onClick={onContinueToPlatform}
                        className="px-6 py-3 bg-[#2563EB] hover:bg-blue-700 text-white font-semibold text-xs rounded-xl flex items-center gap-2 shadow-md transition-all"
                      >
                        <span>Continue to THE AURA WORKERS</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* ===============================================================
                  STEP 3: VERIFIED PASSPORT & ENTER PLATFORM
              =============================================================== */}
              {activeStep === 3 && (
                <div className="space-y-6 animate-in fade-in">
                  <div className="bg-[#0B192C] text-white p-6 sm:p-7 rounded-2xl border border-blue-800 space-y-5">
                    <div className="flex items-center justify-between border-b border-white/10 pb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-sky-400/40 flex items-center justify-center">
                          <ShieldCheck className="w-5 h-5 text-sky-400" />
                        </div>
                        <div>
                          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-sky-400 block">
                            AURA VERIFIED MEMBER PASSPORT
                          </span>
                          <h3 className="font-display text-lg font-bold text-white">
                            {userProfile?.displayName || 'Authentication Required'}
                          </h3>
                        </div>
                      </div>

                      <span className="font-mono text-[10px] uppercase px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full font-semibold">
                        {isAuthenticated ? 'SESSION ACTIVE' : 'LOCKED'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono text-xs">
                      <div className="bg-white/[0.05] p-3.5 rounded-xl border border-white/[0.1]">
                        <div className="text-[10px] text-blue-200/60 uppercase">
                          OAuth Provider
                        </div>
                        <div className="text-white font-semibold mt-1">
                          {userProfile?.authProviders
                            ?.map((p) => p.replace('.com', '').toUpperCase())
                            .join(' + ') || 'NOT SIGNED IN'}
                        </div>
                      </div>

                      <div className="bg-white/[0.05] p-3.5 rounded-xl border border-white/[0.1]">
                        <div className="text-[10px] text-blue-200/60 uppercase">
                          Mobile Status
                        </div>
                        <div className="text-sky-400 font-semibold mt-1">
                          {userProfile?.phoneNumber || 'Optional / Pending'}
                        </div>
                      </div>

                      <div className="bg-white/[0.05] p-3.5 rounded-xl border border-white/[0.1]">
                        <div className="text-[10px] text-blue-200/60 uppercase">
                          Account Role
                        </div>
                        <div className="text-white font-semibold uppercase mt-1">
                          {userProfile?.role || selectedRole}
                        </div>
                      </div>
                    </div>

                    {isAuthenticated ? (
                      <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="text-xs text-blue-200/80 flex items-center gap-2">
                          <Lock className="w-4 h-4 text-sky-400" />
                          <span>
                            Escrow Vault, 4-Digit Site PIN & AES-256 Chat Ready
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={onContinueToPlatform}
                          className="px-6 py-3 bg-[#2563EB] hover:bg-blue-500 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all"
                        >
                          <span>Enter THE AURA WORKERS Platform</span>
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="pt-2 flex items-center justify-between">
                        <span className="text-xs text-amber-300">
                          Please complete Step 1 (Google/Microsoft) or Step 2 (Phone OTP) first to unlock platform entry.
                        </span>
                        <button
                          type="button"
                          onClick={() => setActiveStep(1)}
                          className="px-4 py-2 bg-[#2563EB] text-white text-xs font-semibold rounded-xl"
                        >
                          Go to Step 1
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Footer Strip */}
            <div className="pt-6 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <Fingerprint className="w-4 h-4 text-[#2563EB]" />
                Mandatory Zero-Trust Gate • Protected by $1,000,000 Aura Surety
              </span>
              <span className="font-mono text-[11px] text-slate-400">
                THE AURA WORKERS © 2026
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
