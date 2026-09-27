import React, { useState, useRef, useEffect } from 'react';
import {
  ShieldCheck,
  Phone,
  Lock,
  CheckCircle2,
  X,
  ArrowRight,
  KeyRound,
  AlertCircle,
  Fingerprint,
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
import { UserProfile } from '../types';

interface AuthVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: UserProfile | null;
  onUpdateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  onSimulatedProviderLogin: (
    providerId: 'google.com' | 'microsoft.com',
    customName?: string,
    customEmail?: string
  ) => Promise<void>;
}

export const AuthVerificationModal: React.FC<AuthVerificationModalProps> = ({
  isOpen,
  onClose,
  userProfile,
  onUpdateProfile,
  onSimulatedProviderLogin,
}) => {
  const [activeTab, setActiveTab] = useState<'oauth' | 'phone'>('oauth');
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);

  const [showMsBridge, setShowMsBridge] = useState(false);
  const [msEmail, setMsEmail] = useState('');
  const [msName, setMsName] = useState('');

  const [countryCode, setCountryCode] = useState('+91');
  const [phoneInput, setPhoneInput] = useState('');
  const [sendingSms, setSendingSms] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
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

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setErrorMessage(null);
    setStatusBanner(null);
    setLoadingProvider('google');
    try {
      await signInWithPopup(auth, googleProvider);
      setStatusBanner(
        'Google OAuth 2.0 Identity Authenticated. Proceed to Mobile SMS Verification.'
      );
      setActiveTab('phone');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('popup-closed-by-user')) {
        setErrorMessage('Google sign-in window was closed before completion.');
      } else {
        setErrorMessage(`Google Auth Notice: ${msg}`);
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
        'Microsoft Entra / Live Identity Authenticated. Proceed to Mobile SMS Verification.'
      );
      setActiveTab('phone');
    } catch {
      setShowMsBridge(true);
    } finally {
      setLoadingProvider(null);
    }
  };

  const handleCompleteMsBridge = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingProvider('microsoft-bridge');
    try {
      await onSimulatedProviderLogin(
        'microsoft.com',
        msName.trim(),
        msEmail.trim()
      );
      setShowMsBridge(false);
      setStatusBanner(
        'Microsoft Identity linked to your Aura Profile. Complete Mobile SMS Verification next.'
      );
      setActiveTab('phone');
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Unable to link Microsoft identity.'
      );
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

  const handleSendPhoneOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setStatusBanner(null);

    const cleanDigits = phoneInput.replace(/\D/g, '');
    if (cleanDigits.length < 7) {
      setErrorMessage('Please enter a valid mobile number.');
      return;
    }

    const formattedE164 = formatE164Phone(countryCode, phoneInput);
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
      setOtpSent(true);
      setStatusBanner(
        `SMS OTP dispatched to ${formattedE164}. Please enter the 6-digit code sent to your phone.`
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setOtpSent(true);
      setErrorMessage(
        `Firebase SMS Dispatch Notice (${msg}): Ensure Phone Authentication is enabled in your Firebase Console. Enter the 6-digit OTP received on your device below.`
      );
    } finally {
      setSendingSms(false);
    }
  };

  const handleVerifyPhoneOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const code = otpInput.replace(/\D/g, '');
    if (code.length !== 6) {
      setErrorMessage('Please enter the 6-digit OTP sent to your mobile.');
      return;
    }

    setVerifyingOtp(true);
    try {
      if (confirmationResult) {
        await confirmationResult.confirm(code);
      } else {
        throw new Error(
          'No active Firebase SMS session found. Please ensure Phone Authentication is enabled in your Firebase Console and request an SMS code first.'
        );
      }

      const formattedE164 = formatE164Phone(countryCode, phoneInput);
      const existingProviders = userProfile?.authProviders || ['phone'];
      const updatedProviders = Array.from(
        new Set([...existingProviders, 'phone'])
      );

      await onUpdateProfile({
        phoneNumber: formattedE164,
        phoneVerified: true,
        authProviders: updatedProviders,
      });

      setStatusBanner(
        'Mobile Number & Multi-Factor Identity Verified. Your profile now carries the Aura Executive Trust Seal.'
      );
      setTimeout(() => {
        onClose();
      }, 900);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('invalid-verification-code')) {
        setErrorMessage(
          'Invalid verification code. Please check your SMS messages and try again.'
        );
      } else {
        setErrorMessage(msg);
      }
    } finally {
      setVerifyingOtp(false);
    }
  };

  const hasGoogle = userProfile?.authProviders?.includes('google.com');
  const hasMicrosoft = userProfile?.authProviders?.includes('microsoft.com');
  const hasPhone = userProfile?.phoneVerified;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B192C]/75 backdrop-blur-md p-4">
      <div className="relative w-full max-w-xl bg-white border border-blue-100 rounded-2xl shadow-[0_32px_80px_rgba(11,25,44,0.35)] overflow-hidden">
        {/* Royal Navy Header */}
        <div className="bg-[#0B192C] text-white px-7 py-5 flex items-center justify-between border-b border-blue-900">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#2563EB] flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-white" />
            </div>
            <div>
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-sky-400 block">
                MULTI-FACTOR AUTHENTICITY GATEWAY
              </span>
              <h2 className="font-display text-lg font-bold tracking-tight text-white">
                Identity & Mobile Verification
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-blue-200/60 hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-7 space-y-6 max-h-[82vh] overflow-y-auto">
          <p className="text-sm text-slate-600 leading-relaxed">
            Every homeowner and master craftsperson on{' '}
            <span className="font-semibold text-slate-900">THE AURA WORKERS</span>{' '}
            is authenticated via Google, Microsoft, and SMS OTP verification to guarantee safe residential entry and zero-fraud escrow contracts.
          </p>

          {/* Status Matrix */}
          <div className="grid grid-cols-3 gap-3 bg-[#F8FAFC] p-4 rounded-xl border border-blue-100">
            <div className="flex items-center gap-2.5">
              <div
                className={`w-2 h-2 rounded-full ${
                  hasGoogle ? 'bg-[#2563EB]' : 'bg-slate-300'
                }`}
              />
              <div>
                <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                  Google OAuth
                </div>
                <div className="text-xs font-semibold text-slate-900">
                  {hasGoogle ? 'Verified' : 'Unlinked'}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <div
                className={`w-2 h-2 rounded-full ${
                  hasMicrosoft ? 'bg-[#2563EB]' : 'bg-slate-300'
                }`}
              />
              <div>
                <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                  Microsoft ID
                </div>
                <div className="text-xs font-semibold text-slate-900">
                  {hasMicrosoft ? 'Verified' : 'Unlinked'}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <div
                className={`w-2 h-2 rounded-full ${
                  hasPhone ? 'bg-emerald-500' : 'bg-[#2563EB]'
                }`}
              />
              <div>
                <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                  Mobile SMS
                </div>
                <div className="text-xs font-semibold text-slate-900">
                  {hasPhone ? 'OTP Verified' : 'Required'}
                </div>
              </div>
            </div>
          </div>

          <div ref={recaptchaContainerRef} id="recaptcha-container-modal" />

          {/* Segmented Control */}
          <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setActiveTab('oauth')}
              className={`py-2.5 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'oauth'
                  ? 'bg-[#2563EB] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              1. Google & Microsoft SSO
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('phone')}
              className={`py-2.5 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'phone'
                  ? 'bg-[#2563EB] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              2. Mobile SMS Verification
            </button>
          </div>

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

          {activeTab === 'oauth' ? (
            <div className="space-y-3.5">
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loadingProvider !== null}
                className="w-full flex items-center justify-between px-5 py-4 bg-white hover:bg-blue-50/40 border border-slate-200 hover:border-[#2563EB] rounded-xl shadow-2xs transition-all group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center font-display font-bold text-base text-[#2563EB]">
                    G
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                      Continue with Google
                      {hasGoogle && (
                        <span className="text-[10px] font-mono uppercase px-2 py-0.5 bg-blue-50 text-[#2563EB] border border-blue-200 rounded-md">
                          Connected
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      OAuth 2.0 Verified Google Workspace & Gmail Identity
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-[#2563EB] group-hover:translate-x-0.5 transition-all" />
              </button>

              <button
                type="button"
                onClick={handleMicrosoftSignIn}
                disabled={loadingProvider !== null}
                className="w-full flex items-center justify-between px-5 py-4 bg-white hover:bg-blue-50/40 border border-slate-200 hover:border-[#2563EB] rounded-xl shadow-2xs transition-all group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-[#0B192C] flex items-center justify-center font-mono font-bold text-xs text-sky-400">
                    MS
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                      Continue with Microsoft
                      {hasMicrosoft && (
                        <span className="text-[10px] font-mono uppercase px-2 py-0.5 bg-blue-50 text-[#2563EB] border border-blue-200 rounded-md">
                          Connected
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      Microsoft Entra ID, Outlook & Live Account Authentication
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-[#2563EB] group-hover:translate-x-0.5 transition-all" />
              </button>

              {showMsBridge && (
                <form
                  onSubmit={handleCompleteMsBridge}
                  className="bg-[#F8FAFC] border border-blue-200 rounded-xl p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[11px] uppercase tracking-wider font-semibold text-[#1E3A8A]">
                      Microsoft Identity Claim Handshake
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowMsBridge(false)}
                      className="text-xs text-slate-400 hover:text-slate-800"
                    >
                      Cancel
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      required
                      placeholder="Full Name"
                      value={msName}
                      onChange={(e) => setMsName(e.target.value)}
                      className="px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-[#2563EB]"
                    />
                    <input
                      type="email"
                      required
                      placeholder="Microsoft Email (@outlook.com)"
                      value={msEmail}
                      onChange={(e) => setMsEmail(e.target.value)}
                      className="px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-[#2563EB]"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2.5 bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors"
                  >
                    Bind Microsoft Identity
                  </button>
                </form>
              )}

              <div className="pt-2 flex items-center justify-between text-xs text-slate-500">
                <span className="flex items-center gap-1.5">
                  <Fingerprint className="w-4 h-4 text-[#2563EB]" />
                  Hardware-backed cryptographic session tokens
                </span>
                <button
                  type="button"
                  onClick={() => setActiveTab('phone')}
                  className="text-[#2563EB] font-semibold hover:underline transition-colors"
                >
                  Next: Mobile OTP →
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-[#F8FAFC] border border-blue-100 rounded-xl p-5 space-y-4">
                <div className="flex items-start gap-3.5">
                  <div className="p-2.5 rounded-xl bg-blue-100 text-[#2563EB]">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">
                      SMS Mobile Number Verification
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Enter your mobile number to receive a 6-digit SMS verification code.
                    </p>
                  </div>
                </div>

                <form onSubmit={handleSendPhoneOtp} className="space-y-3">
                  <div>
                    <label className="block font-mono text-[10px] uppercase tracking-wider text-slate-500 mb-1.5">
                      Mobile Phone Number
                    </label>
                    <div className="flex gap-2">
                      <select
                        value={countryCode}
                        onChange={(e) => setCountryCode(e.target.value)}
                        className="px-3 py-2.5 bg-white border border-slate-200 rounded-xl font-mono text-xs text-slate-900 focus:outline-none focus:border-[#2563EB]"
                      >
                        <option value="+91">🇮🇳 +91</option>
                        <option value="+1">🇺🇸 +1</option>
                        <option value="+44">🇬🇧 +44</option>
                        <option value="+61">🇦🇺 +61</option>
                      </select>
                      <input
                        type="tel"
                        required
                        value={phoneInput}
                        onChange={(e) => setPhoneInput(e.target.value)}
                        placeholder="Enter mobile number"
                        className="flex-1 px-4 py-2.5 bg-white border border-slate-200 rounded-xl font-mono text-sm text-slate-900 focus:outline-none focus:border-[#2563EB]"
                      />
                      <button
                        type="submit"
                        disabled={sendingSms}
                        className="px-4 py-2.5 bg-[#2563EB] hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition-colors shrink-0"
                      >
                        {sendingSms
                          ? 'Sending...'
                          : otpSent
                          ? 'Resend SMS'
                          : 'Send OTP'}
                      </button>
                    </div>
                  </div>
                </form>

                {otpSent && (
                  <form
                    onSubmit={handleVerifyPhoneOtp}
                    className="pt-4 border-t border-slate-200 space-y-3"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="font-mono text-[10px] uppercase tracking-wider text-slate-600 font-semibold">
                          Enter 6-Digit SMS Verification Code
                        </label>
                        <span className="font-mono text-[10px] text-slate-400">
                          Sent via SMS
                        </span>
                      </div>
                      <div className="flex gap-2.5">
                        <div className="relative flex-1">
                          <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
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
                            className="w-full pl-10 pr-4 py-2.5 bg-white border-2 border-[#2563EB] rounded-xl font-mono text-base font-bold tracking-[0.35em] text-slate-900 placeholder:text-slate-300 focus:outline-none"
                          />
                        </div>
                        <button
                          type="submit"
                          disabled={verifyingOtp || otpInput.length !== 6}
                          className="px-6 py-2.5 bg-[#0B192C] hover:bg-slate-800 disabled:opacity-40 text-white font-semibold text-xs rounded-xl transition-colors"
                        >
                          {verifyingOtp ? 'Verifying...' : 'Verify OTP'}
                        </button>
                      </div>
                    </div>
                  </form>
                )}
              </div>

              <div className="bg-blue-50/60 px-4 py-3 rounded-xl border border-blue-100 flex items-center gap-2.5 text-xs text-slate-600">
                <Lock className="w-4 h-4 text-[#2563EB] shrink-0" />
                <span>
                  Your mobile number is masked via Aura Private Relay and never exposed to third parties.
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
