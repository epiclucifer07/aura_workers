import React, { useState } from 'react';
import {
  Star,
  ShieldCheck,
  X,
  CheckCircle2,
  MessageSquareQuote,
  Award,
} from 'lucide-react';
import { Worker, Review, UserProfile } from '../types';

interface ReviewModalProps {
  worker: Worker | null;
  reviews: Review[];
  userProfile: UserProfile | null;
  defaultProjectTitle?: string;
  defaultCostPaid?: number;
  onClose: () => void;
  onSubmitReview: (reviewData: {
    worker: Worker;
    rating: number;
    transparencyScore: number;
    craftsmanshipScore: number;
    punctualityScore: number;
    comment: string;
    projectTitle: string;
    finalCostPaid: number;
  }) => Promise<void>;
  onRequireAuth: () => void;
}

export const ReviewModal: React.FC<ReviewModalProps> = ({
  worker,
  reviews,
  userProfile,
  defaultProjectTitle,
  defaultCostPaid,
  onClose,
  onSubmitReview,
  onRequireAuth,
}) => {
  const [rating, setRating] = useState<number>(5);
  const [transparencyScore, setTransparencyScore] = useState<number>(5);
  const [craftsmanshipScore, setCraftsmanshipScore] = useState<number>(5);
  const [punctualityScore, setPunctualityScore] = useState<number>(5);
  const [projectTitle, setProjectTitle] = useState(
    defaultProjectTitle || worker?.transparentRates[0]?.task || 'Trade Service'
  );
  const [finalCostPaid, setFinalCostPaid] = useState<number>(
    defaultCostPaid || (worker ? worker.hourlyRate * 2 + 20 : 110)
  );
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  if (!worker) return null;

  const workerReviews = reviews.filter((r) => r.workerId === worker.id);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile) {
      onRequireAuth();
      return;
    }
    if (!comment.trim()) return;

    setSubmitting(true);
    try {
      await onSubmitReview({
        worker,
        rating,
        transparencyScore,
        craftsmanshipScore,
        punctualityScore,
        comment: comment.trim(),
        projectTitle: projectTitle.trim() || `${worker.trade} Service`,
        finalCostPaid: Number(finalCostPaid) || worker.hourlyRate * 2,
      });
      setComment('');
      setSubmittedSuccess(true);
      setTimeout(() => setSubmittedSuccess(false), 3500);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B192C]/75 backdrop-blur-md p-4">
      <div className="relative w-full max-w-3xl bg-white border border-blue-100 rounded-2xl shadow-[0_32px_90px_rgba(11,25,44,0.4)] overflow-hidden max-h-[90vh] flex flex-col">
        {/* Royal Navy Top Bar */}
        <div className="bg-[#0B192C] text-white px-7 py-5 flex items-center justify-between border-b border-blue-900 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#2563EB] flex items-center justify-center">
              <Award className="w-4 h-4 text-white" />
            </div>
            <div>
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-sky-400 block">
                VERIFIED CLIENT ENDORSEMENTS & PRICE AUDIT
              </span>
              <h3 className="font-display text-base font-semibold text-white">
                Ratings & Completed Project Ledger
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-blue-200/60 hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-7 overflow-y-auto space-y-6">
          {/* Worker Summary & Aggregate Rating */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#F8FAFC] p-5 rounded-2xl border border-blue-100">
            <div className="flex items-center gap-4">
              <img
                src={worker.avatar}
                alt={worker.name}
                className="w-14 h-14 rounded-xl object-cover border border-blue-200"
              />
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-display text-xl font-bold text-slate-900">
                    {worker.name}
                  </h2>
                  <span className="font-mono text-[10px] uppercase px-2 py-0.5 bg-[#2563EB] text-white rounded-md font-semibold">
                    {worker.trade}
                  </span>
                </div>
                <div className="font-mono text-xs text-slate-500 mt-0.5">
                  {worker.licenseNumber} • ${worker.hourlyRate}/hr Audited Direct Rate
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-white px-5 py-3 rounded-xl border border-blue-100 shadow-2xs">
              <div className="text-right">
                <div className="font-mono text-2xl font-bold text-slate-900 flex items-center gap-1.5">
                  <Star className="w-5 h-5 fill-[#2563EB] text-[#2563EB]" />
                  {worker.rating.toFixed(2)}
                </div>
                <div className="font-mono text-[10px] uppercase tracking-wider text-slate-400">
                  {worker.reviewCount} Verified Reviews
                </div>
              </div>
            </div>
          </div>

          {/* Submit New Verified Review Form */}
          <form
            onSubmit={handleSubmit}
            className="bg-white p-6 rounded-2xl border border-blue-100 shadow-xs space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-display text-base font-bold text-slate-900 flex items-center gap-2">
                <MessageSquareQuote className="w-4 h-4 text-[#2563EB]" />
                Record a Verified Client Review
              </h3>
              <span className="font-mono text-[11px] text-emerald-700 font-medium">
                Authenticated Escrow Ledger
              </span>
            </div>

            {submittedSuccess && (
              <div className="bg-blue-50 border border-blue-200 text-[#1E3A8A] px-4 py-3 rounded-xl text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#2563EB]" />
                Your verified review has been recorded and the craftsperson’s standing has been updated in real time.
              </div>
            )}

            {/* Star Selectors */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#F8FAFC] p-4 rounded-xl border border-blue-100">
              {[
                { label: 'Overall Standing', val: rating, set: setRating },
                {
                  label: 'Price Honesty',
                  val: transparencyScore,
                  set: setTransparencyScore,
                },
                {
                  label: 'Craftsmanship',
                  val: craftsmanshipScore,
                  set: setCraftsmanshipScore,
                },
                {
                  label: 'Punctuality',
                  val: punctualityScore,
                  set: setPunctualityScore,
                },
              ].map((dim, idx) => (
                <div key={idx}>
                  <div className="font-mono text-[10px] uppercase tracking-wider text-slate-500 mb-1.5">
                    {dim.label}
                  </div>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => dim.set(star)}
                        className="p-0.5 focus:outline-none"
                      >
                        <Star
                          className={`w-4 h-4 transition-transform hover:scale-110 ${
                            star <= dim.val
                              ? 'fill-[#2563EB] text-[#2563EB]'
                              : 'text-slate-300'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block font-mono text-[10px] uppercase tracking-wider text-slate-500 mb-1.5">
                  Completed Scope
                </label>
                <input
                  type="text"
                  required
                  value={projectTitle}
                  onChange={(e) => setProjectTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#F8FAFC] border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#2563EB]"
                />
              </div>
              <div>
                <label className="block font-mono text-[10px] uppercase tracking-wider text-slate-500 mb-1.5">
                  Audited Final Cost Paid ($ USD)
                </label>
                <input
                  type="number"
                  required
                  min={10}
                  value={finalCostPaid}
                  onChange={(e) => setFinalCostPaid(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-[#F8FAFC] border border-slate-200 rounded-xl font-mono text-xs text-slate-900 focus:outline-none focus:border-[#2563EB]"
                />
              </div>
            </div>

            <div>
              <label className="block font-mono text-[10px] uppercase tracking-wider text-slate-500 mb-1.5">
                Client Evaluation (Craftsmanship, Price Accuracy & Site Protocol)
              </label>
              <textarea
                rows={3}
                required
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={`Detail how ${worker.name} executed the work, honored the ceiling price, and verified the Site Safety PIN...`}
                className="w-full px-4 py-2.5 bg-[#F8FAFC] border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#2563EB]"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2.5 bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition-colors"
              >
                {submitting ? 'Publishing...' : 'Publish Verified Evaluation'}
              </button>
            </div>
          </form>

          {/* Existing Verified Reviews List */}
          <div className="space-y-3.5">
            <h4 className="font-mono text-[11px] uppercase tracking-widest text-[#2563EB] font-semibold">
              Verified Client Archive ({workerReviews.length} Entries)
            </h4>

            {workerReviews.length === 0 ? (
              <div className="bg-[#F8FAFC] p-6 rounded-2xl border border-blue-100 text-center text-xs text-slate-500">
                No client evaluations recorded yet for this craftsperson.
              </div>
            ) : (
              workerReviews.map((rev) => (
                <div
                  key={rev.id}
                  className="bg-[#F8FAFC] p-5 rounded-2xl border border-blue-100 space-y-2.5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="font-semibold text-xs text-slate-900">
                        {rev.customerName}
                      </span>
                      <span className="font-mono text-[10px] px-2 py-0.5 bg-blue-50 text-[#2563EB] border border-blue-200 rounded-md flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3" /> Verified Escrow Client
                      </span>
                    </div>
                    <div className="flex items-center gap-3 font-mono text-xs">
                      <span className="text-slate-700 font-semibold">
                        Audited Total: ${rev.finalCostPaid}
                      </span>
                      <span className="flex items-center gap-1 text-slate-900 font-bold">
                        <Star className="w-3.5 h-3.5 fill-[#2563EB] text-[#2563EB]" />
                        {rev.rating.toFixed(1)}
                      </span>
                    </div>
                  </div>

                  <div className="font-mono text-[11px] text-[#2563EB] font-medium">
                    Scope: {rev.projectTitle}
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed">
                    “{rev.comment}”
                  </p>

                  <div className="pt-2.5 border-t border-blue-100 flex flex-wrap items-center justify-between gap-2 font-mono text-[10px] text-slate-400">
                    <div className="flex gap-4">
                      <span>Price Honesty: {rev.transparencyScore}/5</span>
                      <span>Craftsmanship: {rev.craftsmanshipScore}/5</span>
                      <span>Punctuality: {rev.punctualityScore}/5</span>
                    </div>
                    <span>
                      {new Date(rev.createdAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
