import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Lock,
  X,
  Calendar,
  MapPin,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';
import { Worker } from '../types';

interface HireEscrowModalProps {
  worker: Worker | null;
  presetTask?: string;
  presetHours?: number;
  onClose: () => void;
  onConfirmHire: (bookingData: {
    worker: Worker;
    title: string;
    scopeDescription: string;
    address: string;
    scheduledFor: string;
    estimatedHours: number;
    materialsAllowance: number;
    paymentMethod: string;
  }) => Promise<void>;
}

export const HireEscrowModal: React.FC<HireEscrowModalProps> = ({
  worker,
  presetTask,
  presetHours,
  onClose,
  onConfirmHire,
}) => {
  const [title, setTitle] = useState('');
  const [scopeDescription, setScopeDescription] = useState('');
  const [address, setAddress] = useState('742 Craftsman Way, Residence 4B');
  const [scheduledFor, setScheduledFor] = useState('Today • Priority 90-Min Window');
  const [estimatedHours, setEstimatedHours] = useState<number>(2);
  const [materialsAllowance, setMaterialsAllowance] = useState<number>(25);
  const [paymentMethod] = useState('Aura Escrow Vault • Visa •••• 4829');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (worker) {
      const defaultTask =
        presetTask ||
        worker.transparentRates[0]?.task ||
        `${worker.trade} Diagnostic & Execution`;
      setTitle(defaultTask);
      setEstimatedHours(presetHours || 2);
      setScopeDescription(
        `Complete ${defaultTask.toLowerCase()} with audited zero-markup material receipts and on-site 4-digit safety PIN verification.`
      );
    }
  }, [worker, presetTask, presetHours]);

  if (!worker) return null;

  const laborCost = Math.round(worker.hourlyRate * estimatedHours);
  const escrowFee = Math.round((laborCost + materialsAllowance) * 0.05);
  const totalAmount = laborCost + materialsAllowance + escrowFee;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onConfirmHire({
        worker,
        title: title.trim() || `${worker.trade} Service`,
        scopeDescription: scopeDescription.trim(),
        address: address.trim(),
        scheduledFor,
        estimatedHours,
        materialsAllowance,
        paymentMethod,
      });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B192C]/75 backdrop-blur-md p-4">
      <div className="relative w-full max-w-2xl bg-white border border-blue-100 rounded-2xl shadow-[0_32px_90px_rgba(11,25,44,0.4)] overflow-hidden max-h-[92vh] flex flex-col">
        {/* Royal Navy Header */}
        <div className="bg-[#0B192C] text-white px-7 py-5 flex items-center justify-between border-b border-blue-900 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#2563EB] flex items-center justify-center">
              <Lock className="w-4 h-4 text-white" />
            </div>
            <div>
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-sky-400 block">
                AURA ESCROW CONTRACT & DISPATCH
              </span>
              <h3 className="font-display text-base font-semibold text-white">
                Reserve Craftsperson & Lock Ceiling Price
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

        <form
          onSubmit={handleSubmit}
          className="p-7 overflow-y-auto space-y-5"
        >
          {/* Worker Summary Strip */}
          <div className="flex items-center justify-between bg-[#F8FAFC] p-4 rounded-xl border border-blue-100">
            <div className="flex items-center gap-3.5">
              <img
                src={worker.avatar}
                alt={worker.name}
                className="w-12 h-12 rounded-xl object-cover border border-blue-200"
              />
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-display font-bold text-sm text-slate-900">
                    {worker.name}
                  </span>
                  <span className="font-mono text-[10px] uppercase px-2 py-0.5 bg-[#2563EB] text-white rounded-md font-semibold">
                    {worker.trade}
                  </span>
                </div>
                <div className="font-mono text-[11px] text-emerald-700 mt-0.5">
                  {worker.licenseNumber} • $1M Surety Bonded
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="font-mono text-lg font-bold text-slate-900">
                ${worker.hourlyRate}
                <span className="text-xs font-normal text-slate-500">/hr</span>
              </div>
              <div className="font-mono text-[10px] text-[#2563EB] uppercase tracking-wider font-semibold">
                Audited Rate
              </div>
            </div>
          </div>

          {/* Preset Task Selector */}
          <div>
            <label className="block font-mono text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-2">
              Select Standardized Scope or Specify Custom Project
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2.5">
              {worker.transparentRates.map((rate, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setTitle(rate.task);
                    setEstimatedHours(parseFloat(rate.estimatedHours) || 2);
                  }}
                  className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                    title === rate.task
                      ? 'bg-[#2563EB] text-white border-[#2563EB] font-medium'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-[#2563EB]'
                  }`}
                >
                  {rate.task} (${rate.flatPrice})
                </button>
              ))}
            </div>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Kitchen Copper Pipe Leak Repair"
              className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-[#2563EB]"
            />
          </div>

          {/* Scope & Hours */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 bg-[#F8FAFC] p-4 rounded-xl border border-blue-100">
            <div>
              <div className="flex justify-between text-xs mb-2">
                <span className="text-slate-500">Booked Labor Hours</span>
                <span className="font-mono font-semibold text-slate-900">
                  {estimatedHours} hrs
                </span>
              </div>
              <input
                type="range"
                min={1}
                max={8}
                step={0.5}
                value={estimatedHours}
                onChange={(e) => setEstimatedHours(parseFloat(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between font-mono text-[10px] text-slate-400 mt-1">
                <span>1 hr</span>
                <span>4 hrs</span>
                <span>8 hrs</span>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-2">
                <span className="text-slate-500">Materials Cap (0% Markup)</span>
                <span className="font-mono font-semibold text-slate-900">
                  ${materialsAllowance}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={200}
                step={5}
                value={materialsAllowance}
                onChange={(e) =>
                  setMaterialsAllowance(parseInt(e.target.value, 10))
                }
                className="w-full"
              />
              <div className="flex justify-between font-mono text-[10px] text-slate-400 mt-1">
                <span>$0 (Labor Only)</span>
                <span>$100</span>
                <span>$200</span>
              </div>
            </div>
          </div>

          {/* Location & Window */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-mono text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1.5">
                Residence / Service Address
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-[#2563EB] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#2563EB]"
                />
              </div>
            </div>

            <div>
              <label className="block font-mono text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1.5">
                Arrival Window
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-[#2563EB] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <select
                  value={scheduledFor}
                  onChange={(e) => setScheduledFor(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#2563EB]"
                >
                  <option value="Today • Priority 90-Min Window">
                    Today • Priority 90-Min Window
                  </option>
                  <option value="Tomorrow • 09:00 AM Morning Arrival">
                    Tomorrow • 09:00 AM Morning Arrival
                  </option>
                  <option value="Tomorrow • 02:00 PM Afternoon Arrival">
                    Tomorrow • 02:00 PM Afternoon Arrival
                  </option>
                  <option value="Saturday • 10:00 AM Weekend Window">
                    Saturday • 10:00 AM Weekend Window
                  </option>
                </select>
              </div>
            </div>
          </div>

          {/* Scope Notes */}
          <div>
            <label className="block font-mono text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1.5">
              Project & Access Notes
            </label>
            <textarea
              rows={2}
              value={scopeDescription}
              onChange={(e) => setScopeDescription(e.target.value)}
              className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#2563EB]"
            />
          </div>

          {/* Royal Navy Escrow Breakdown Box */}
          <div className="bg-[#0B192C] text-white p-5 rounded-2xl border border-blue-900 space-y-3">
            <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
              <span className="font-mono text-[11px] uppercase tracking-widest font-semibold text-sky-400">
                Audited Escrow Price Guarantee
              </span>
              <span className="font-mono text-[11px] text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Zero Surprise Fees
              </span>
            </div>

            <div className="space-y-1.5 font-mono text-xs">
              <div className="flex justify-between">
                <span className="text-blue-200/70">
                  Direct Craft Labor ({estimatedHours} hrs × ${worker.hourlyRate}/hr)
                </span>
                <span className="text-white">${laborCost}.00</span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-200/70">
                  Wholesale Materials Cap (0% Markup, Receipt Audited)
                </span>
                <span className="text-white">${materialsAllowance}.00</span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-200/70">
                  Aura Escrow Vault & $1M Surety Bond (5%)
                </span>
                <span className="text-white">${escrowFee}.00</span>
              </div>
              <div className="pt-2.5 border-t border-white/10 flex justify-between items-baseline">
                <span className="font-sans font-semibold text-sm text-white">
                  Guaranteed Ceiling Total (Held in Escrow)
                </span>
                <span className="font-bold text-2xl text-sky-400">
                  ${totalAmount}.00
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-medium text-slate-500 hover:text-slate-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-3 bg-[#2563EB] hover:bg-blue-600 text-white font-semibold text-xs rounded-xl flex items-center gap-2 shadow-md transition-all"
            >
              <ShieldCheck className="w-4 h-4" />
              {submitting
                ? 'Securing Escrow Vault...'
                : `Lock $${totalAmount} in Escrow & Dispatch`}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
