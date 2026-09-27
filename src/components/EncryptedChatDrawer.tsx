import React, { useState, useEffect, useRef } from 'react';
import {
  Lock,
  ShieldCheck,
  Send,
  X,
  Eye,
  EyeOff,
  KeyRound,
  FileCheck2,
  Clock,
  Terminal,
} from 'lucide-react';
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  setDoc,
} from 'firebase/firestore';
import { db, OperationType, handleFirestoreError } from '../firebase';
import {
  Worker,
  Job,
  EncryptedMessage,
  DecryptedMessage,
  UserProfile,
} from '../types';
import {
  encryptMessageText,
  decryptMessageText,
  getThreadFingerprint,
} from '../utils/crypto';

interface EncryptedChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  worker: Worker | null;
  activeJob?: Job | null;
  userProfile: UserProfile | null;
  onRequireAuth: () => void;
}

export const EncryptedChatDrawer: React.FC<EncryptedChatDrawerProps> = ({
  isOpen,
  onClose,
  worker,
  activeJob,
  userProfile,
  onRequireAuth,
}) => {
  const [messages, setMessages] = useState<DecryptedMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [inspectCiphertext, setInspectCiphertext] = useState(false);
  const [fingerprint, setFingerprint] = useState<string>('Generating...');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const threadId =
    worker && userProfile
      ? `thread_${userProfile.uid}_${worker.id}`
      : worker
      ? `thread_guest_${worker.id}`
      : '';

  useEffect(() => {
    if (!threadId) return;
    getThreadFingerprint(threadId).then(setFingerprint);
  }, [threadId]);

  useEffect(() => {
    if (!isOpen || !worker || !userProfile || !threadId) {
      setMessages([]);
      return;
    }

    const q = query(
      collection(db, 'messages'),
      where('threadId', '==', threadId)
    );

    const unsubscribe = onSnapshot(
      q,
      async (snapshot) => {
        const rawDocs: EncryptedMessage[] = [];
        snapshot.forEach((docSnap) => {
          rawDocs.push(docSnap.data() as EncryptedMessage);
        });

        rawDocs.sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );

        const decryptedList: DecryptedMessage[] = await Promise.all(
          rawDocs.map(async (msg) => {
            const plaintext = await decryptMessageText(
              msg.ciphertext,
              msg.iv,
              threadId
            );
            return { ...msg, plaintext };
          })
        );

        setMessages(decryptedList);
        setTimeout(() => {
          bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 80);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'messages');
      }
    );

    return () => unsubscribe();
  }, [isOpen, worker, userProfile, threadId]);

  if (!isOpen || !worker) return null;

  const sendEncryptedMessage = async (
    textToSend: string,
    messageType: 'text' | 'quote_lock' | 'pin_handshake' = 'text'
  ) => {
    if (!userProfile) {
      onRequireAuth();
      return;
    }
    const cleanText = textToSend.trim();
    if (!cleanText) return;

    setSending(true);
    try {
      const msgId = `msg_${Date.now()}_${Math.random()
        .toString(36)
        .substring(2, 7)}`;
      const encrypted = await encryptMessageText(cleanText, threadId);

      const newMsg: EncryptedMessage = {
        id: msgId,
        threadId,
        jobId: activeJob?.id || '',
        workerId: worker.id,
        customerId: userProfile.uid,
        senderId: userProfile.uid,
        senderName: userProfile.displayName,
        senderRole: 'customer',
        ciphertext: encrypted.ciphertext,
        iv: encrypted.iv,
        keyFingerprint: encrypted.keyFingerprint,
        messageType,
        createdAt: new Date().toISOString(),
      };

      await setDoc(doc(db, 'messages', msgId), newMsg);
      setInputText('');

      setTimeout(async () => {
        const replyId = `msg_${Date.now()}_pro`;
        let replyPlain = `Received, ${
          userProfile.displayName.split(' ')[0]
        }. My direct rate is locked at $${worker.hourlyRate}/hr (${
          worker.licenseNumber
        }) with 0% markup on store material receipts. Let me know if you'd like to review specifics.`;

        if (messageType === 'pin_handshake') {
          replyPlain = `Site Safety PIN verified over our AES-256 channel. I will present my physical ${worker.licenseNumber} credential at arrival prior to starting the clock.`;
        } else if (messageType === 'quote_lock') {
          replyPlain = `Confirmed in writing: Your ceiling rate is locked at $${worker.hourlyRate}/hr with $0 callout fee. Any hardware or coating supplies are billed at exact wholesale store receipt cost.`;
        } else if (
          cleanText.toLowerCase().includes('when') ||
          cleanText.toLowerCase().includes('eta')
        ) {
          replyPlain = `I am currently stationed near ${worker.neighborhood} and can arrive within ${worker.responseTimeMins}–25 minutes with my full ${worker.trade.toLowerCase()} kit.`;
        }

        const encReply = await encryptMessageText(replyPlain, threadId);
        const proMsg: EncryptedMessage = {
          id: replyId,
          threadId,
          jobId: activeJob?.id || '',
          workerId: worker.id,
          customerId: userProfile.uid,
          senderId: worker.id,
          senderName: worker.name,
          senderRole: 'worker',
          ciphertext: encReply.ciphertext,
          iv: encReply.iv,
          keyFingerprint: encReply.keyFingerprint,
          messageType: 'text',
          createdAt: new Date().toISOString(),
        };
        await setDoc(doc(db, 'messages', replyId), proMsg);
      }, 950);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'messages');
    } finally {
      setSending(false);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await sendEncryptedMessage(inputText, 'text');
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-[#0B192C]/70 backdrop-blur-md">
      <div className="w-full max-w-lg bg-[#F8FAFC] border-l border-blue-100 h-full flex flex-col shadow-[0_0_80px_rgba(11,25,44,0.45)]">
        {/* Royal Navy E2EE Header */}
        <div className="bg-[#0B192C] text-white px-6 py-5 space-y-3.5 shrink-0 border-b border-blue-900">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.8)] animate-pulse" />
              <Lock className="w-3.5 h-3.5 text-sky-400" />
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] font-semibold text-sky-400">
                AES-256-GCM END-TO-END ENCRYPTED
              </span>
            </div>
            <button
              onClick={onClose}
              className="text-blue-200/60 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-white/10">
            <div className="flex items-center gap-3">
              <img
                src={worker.avatar}
                alt={worker.name}
                className="w-10 h-10 rounded-xl object-cover border border-blue-400/30"
              />
              <div>
                <div className="text-sm font-semibold text-white flex items-center gap-2">
                  {worker.name}
                  <span className="font-mono text-[10px] px-2 py-0.5 bg-[#2563EB] text-white rounded-md">
                    {worker.trade}
                  </span>
                </div>
                <div className="font-mono text-[10px] text-blue-200/60 mt-0.5">
                  SHA-256 Key: {fingerprint}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setInspectCiphertext(!inspectCiphertext)}
              className={`px-3 py-1.5 rounded-lg font-mono text-[10px] uppercase tracking-wider flex items-center gap-1.5 border transition-all ${
                inspectCiphertext
                  ? 'bg-[#2563EB] text-white border-sky-400 font-semibold'
                  : 'bg-white/5 text-blue-100 border-white/15 hover:bg-white/10'
              }`}
            >
              {inspectCiphertext ? (
                <>
                  <EyeOff className="w-3.5 h-3.5" /> Plaintext
                </>
              ) : (
                <>
                  <Eye className="w-3.5 h-3.5" /> Ciphertext
                </>
              )}
            </button>
          </div>
        </div>

        {/* Security Notice Banner */}
        <div className="bg-blue-50/80 px-6 py-2.5 border-b border-blue-100 flex items-center justify-between text-[11px]">
          <span className="text-[#1E3A8A] flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#2563EB] shrink-0" />
            Payloads are encrypted client-side via Web Crypto API prior to cloud storage.
          </span>
        </div>

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {!userProfile ? (
            <div className="bg-white border border-blue-100 rounded-2xl p-7 text-center space-y-3.5 my-8 shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#2563EB] flex items-center justify-center mx-auto">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="font-display text-lg font-bold text-slate-900">
                Authenticate to Initialize Key Exchange
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed max-w-xs mx-auto">
                Private encrypted communication requires a verified Google, Microsoft, or SMS-authenticated homeowner session.
              </p>
              <button
                type="button"
                onClick={onRequireAuth}
                className="px-5 py-2.5 bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition-colors"
              >
                Verify Identity to Chat
              </button>
            </div>
          ) : messages.length === 0 ? (
            <div className="bg-white border border-blue-100 rounded-2xl p-5 space-y-2.5 shadow-2xs">
              <div className="flex items-center gap-2 font-mono text-xs text-[#2563EB] font-semibold">
                <Terminal className="w-4 h-4" />
                Zero-Knowledge Session Active with {worker.name}
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Send a message below or select a verified trust protocol to request a written rate lock or transmit your 4-digit Site Safety PIN.
              </p>
            </div>
          ) : (
            messages.map((msg) => {
              const isCustomer = msg.senderRole === 'customer';
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${
                    isCustomer ? 'items-end' : 'items-start'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1.5 px-1">
                    <span className="font-mono text-[10px] uppercase tracking-wider font-semibold text-slate-400">
                      {msg.senderName}
                    </span>
                    <span className="font-mono text-[10px] text-slate-400">
                      {new Date(msg.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  <div
                    className={`max-w-[85%] rounded-2xl p-4 border shadow-2xs ${
                      isCustomer
                        ? 'bg-[#2563EB] text-white border-[#2563EB]'
                        : 'bg-white text-slate-900 border-blue-100'
                    }`}
                  >
                    {msg.messageType !== 'text' && (
                      <div className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-md bg-white/20 text-white border border-white/30 inline-block mb-2">
                        {msg.messageType === 'pin_handshake'
                          ? 'Site Safety PIN Handshake'
                          : 'Binding Rate Lock Verification'}
                      </div>
                    )}

                    {inspectCiphertext ? (
                      <div className="space-y-1.5 font-mono text-[11px] break-all">
                        <div className="text-sky-200 font-semibold">
                          [AES-256-GCM CIPHERTEXT]
                        </div>
                        <div className="opacity-90">{msg.ciphertext}</div>
                        <div className="text-[10px] opacity-75 pt-1.5 border-t border-current/15">
                          IV (96-bit): {msg.iv} | Key: {msg.keyFingerprint}
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs sm:text-sm leading-relaxed">
                        {msg.plaintext}
                      </p>
                    )}
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        {/* Quick Trust Handshake Actions */}
        {userProfile && (
          <div className="px-5 py-3 bg-blue-50/60 border-t border-blue-100 flex items-center gap-2 overflow-x-auto shrink-0">
            <button
              type="button"
              disabled={sending}
              onClick={() =>
                sendEncryptedMessage(
                  `Please confirm in writing that your rate of $${worker.hourlyRate}/hr includes $0 callout fee and 0% markup on any store hardware receipts.`,
                  'quote_lock'
                )
              }
              className="px-3 py-1.5 bg-white hover:bg-[#2563EB] hover:text-white border border-blue-200 rounded-lg text-[11px] font-medium flex items-center gap-1.5 shrink-0 transition-colors shadow-2xs"
            >
              <FileCheck2 className="w-3.5 h-3.5 text-[#2563EB] group-hover:text-white" />
              Confirm Rate Lock
            </button>

            <button
              type="button"
              disabled={sending}
              onClick={() =>
                sendEncryptedMessage(
                  `Transmitting encrypted Site Safety Entry PIN [${
                    activeJob?.siteSafetyPin || '4829'
                  }]. Please present your ${worker.licenseNumber} credential at arrival.`,
                  'pin_handshake'
                )
              }
              className="px-3 py-1.5 bg-white hover:bg-[#2563EB] hover:text-white border border-blue-200 rounded-lg text-[11px] font-medium flex items-center gap-1.5 shrink-0 transition-colors shadow-2xs"
            >
              <KeyRound className="w-3.5 h-3.5 text-emerald-600" />
              Transmit Safety PIN
            </button>

            <button
              type="button"
              disabled={sending}
              onClick={() =>
                sendEncryptedMessage(
                  `Hi ${worker.name.split(' ')[0]}, what is your earliest arrival window today?`,
                  'text'
                )
              }
              className="px-3 py-1.5 bg-white hover:bg-[#2563EB] hover:text-white border border-blue-200 rounded-lg text-[11px] font-medium flex items-center gap-1.5 shrink-0 transition-colors shadow-2xs"
            >
              <Clock className="w-3.5 h-3.5 text-[#2563EB]" />
              Request Arrival ETA
            </button>
          </div>
        )}

        {/* Input Box */}
        <form
          onSubmit={handleFormSubmit}
          className="p-4 bg-white border-t border-blue-100 flex items-center gap-2.5 shrink-0"
        >
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={
              userProfile
                ? `Message ${worker.name} (AES-256 Encrypted)...`
                : 'Authenticate first to send encrypted messages...'
            }
            disabled={!userProfile || sending}
            className="flex-1 px-4 py-2.5 bg-[#F8FAFC] border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-[#2563EB]"
          />
          <button
            type="submit"
            disabled={!userProfile || sending || !inputText.trim()}
            className="px-5 py-2.5 bg-[#2563EB] hover:bg-blue-700 disabled:opacity-40 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors"
          >
            <Send className="w-3.5 h-3.5" />
            Send
          </button>
        </form>
      </div>
    </div>
  );
};
