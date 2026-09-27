import React, { useState } from 'react';
import {
  ShieldCheck,
  X,
  CheckCircle2,
  FileCheck2,
  PhoneCall,
  Award,
  Calculator,
  Lock,
  ArrowRight,
  Wrench,
  Clock,
  MapPin,
  Globe,
  Sparkles,
  Briefcase,
} from 'lucide-react';
import { Worker } from '../types';

interface VerificationDossierModalProps {
  worker: Worker | null;
  onClose: () => void;
  onHireClick: (worker: Worker, presetTask?: string, presetHours?: number) => void;
}

export const VerificationDossierModal: React.FC<VerificationDossierModalProps> = ({
  worker,
  onClose,
  onHireClick,
}) => {
  const [selectedHours, setSelectedHours] = useState<number>(3);
  const [materialsEst, setMaterialsEst] = useState<number>(25);

  if (!worker) return null;

  const laborTotal = worker.hourlyRate * selectedHours;
  const escrowFee = Math.round((laborTotal + materialsEst) * 0.05);
  const guaranteedTotal = laborTotal + materialsEst + escrowFee;

  const certifications = worker.certifications || [
    `CA State Licensed ${worker.trade} Specialist`,
    'OSHA-30 Residential Safety Certified',
    'Aura Zero-Markup Material Audit Pledge',
  ];

  const equipmentManifest = worker.equipmentManifest || [
    'Digital Diagnostic & Calibration Kit',
    'HEPA Dust Containment & Floor Protection',
    'Laser Level & Thermal Moisture Scanner',
  ];

  const recentProjects = worker.recentProjects || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B192C]/80 backdrop-blur-md p-4">
      <div className="relative w-full max-w-4xl bg-white border border-blue-100 rounded-3xl shadow-[0_32px_90px_rgba(11,25,44,0.45)] overflow-hidden max-h-[92vh] flex flex-col">
        {/* Royal Navy Top Bar */}
        <div className="bg-[#0B192C] text-white px-7 py-5 flex items-center justify-between border-b border-blue-900 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#2563EB] flex items-center justify-center shadow-sm">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-sky-400 block font-semibold">
                4-POINT REGULATORY, TOOL MANIFEST & CASE STUDY DOSSIER
              </span>
              <h3 className="font-display text-base font-bold text-white">
                Master Craftsperson Credential & Technical Audit
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

        {/* Scrollable Dossier Body */}
        <div className="p-7 overflow-y-auto space-y-7">
          {/* Worker Identity Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
            <div className="flex items-center gap-4">
              <div className="relative shrink-0">
                <img
                  src={worker.avatar}
                  alt={worker.name}
                  className="w-20 h-20 rounded-2xl object-cover border-2 border-blue-200 shadow-sm"
                />
                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#2563EB] border-2 border-white flex items-center justify-center">
                  <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                </div>
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[10px] uppercase tracking-wider px-2.5 py-0.5 bg-[#2563EB] text-white font-semibold rounded-md">
                    Master {worker.trade}
                  </span>
                  <span className="font-mono text-[11px] px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    {worker.availabilityStatus || 'Available Today'}
                  </span>
                  <span className="font-mono text-xs text-slate-500">
                    {worker.yearsExperience} Yrs Exp
                  </span>
                </div>
                <h2 className="font-display text-2xl font-bold text-slate-900 mt-1">
                  {worker.name}
                </h2>
                <p className="text-xs text-slate-600 font-medium mt-0.5">
                  {worker.specialty}
                </p>
                <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 mt-1.5">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-[#2563EB]" />
                    {worker.neighborhood} ({worker.serviceRadiusMiles || 18} mi radius)
                  </span>
                  <span className="flex items-center gap-1">
                    <Globe className="w-3.5 h-3.5 text-[#2563EB]" />
                    {(worker.languages || ['English']).join(' • ')}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-blue-50/80 px-5 py-4 rounded-2xl border border-blue-200 text-right shrink-0">
              <div className="font-mono text-[10px] uppercase tracking-wider text-[#2563EB] font-bold">
                Audited Direct Rate
              </div>
              <div className="font-mono text-3xl font-bold text-[#1E3A8A]">
                ${worker.hourlyRate}
                <span className="text-xs font-normal text-slate-500">/hr</span>
              </div>
              <div className="font-mono text-[10px] text-emerald-700 font-semibold mt-0.5">
                0% Material Markup • $0 Callout
              </div>
            </div>
          </div>

          {/* 6-Metric Executive Telemetry Ribbon */}
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5">
            <div className="bg-[#F8FAFC] p-3.5 rounded-xl border border-blue-100 text-center">
              <div className="font-mono text-base font-bold text-slate-900">
                {worker.completedJobs}
              </div>
              <div className="font-mono text-[10px] uppercase tracking-wider text-slate-500 mt-0.5">
                Audited Jobs
              </div>
            </div>
            <div className="bg-[#F8FAFC] p-3.5 rounded-xl border border-blue-100 text-center">
              <div className="font-mono text-base font-bold text-emerald-700">
                {worker.onTimeRatePct || 99.4}%
              </div>
              <div className="font-mono text-[10px] uppercase tracking-wider text-slate-500 mt-0.5">
                On-Time SLA
              </div>
            </div>
            <div className="bg-[#F8FAFC] p-3.5 rounded-xl border border-blue-100 text-center">
              <div className="font-mono text-base font-bold text-[#2563EB]">
                {worker.repeatClientPct || 89}%
              </div>
              <div className="font-mono text-[10px] uppercase tracking-wider text-slate-500 mt-0.5">
                Repeat Clients
              </div>
            </div>
            <div className="bg-[#F8FAFC] p-3.5 rounded-xl border border-blue-100 text-center">
              <div className="font-mono text-base font-bold text-slate-900">
                {worker.warrantyMonths || 36} Mo
              </div>
              <div className="font-mono text-[10px] uppercase tracking-wider text-slate-500 mt-0.5">
                Craft Warranty
              </div>
            </div>
            <div className="bg-[#F8FAFC] p-3.5 rounded-xl border border-blue-100 text-center">
              <div className="font-mono text-base font-bold text-slate-900">
                ~{worker.responseTimeMins}m
              </div>
              <div className="font-mono text-[10px] uppercase tracking-wider text-slate-500 mt-0.5">
                Avg Dispatch
              </div>
            </div>
            <div className="bg-[#F8FAFC] p-3.5 rounded-xl border border-blue-100 text-center">
              <div className="font-mono text-base font-bold text-emerald-700">
                $1,000,000
              </div>
              <div className="font-mono text-[10px] uppercase tracking-wider text-slate-500 mt-0.5">
                Surety Bond
              </div>
            </div>
          </div>

          {/* Craftsperson Statement */}
          <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-4 text-xs text-slate-700 leading-relaxed">
            <span className="font-mono text-[10px] uppercase tracking-widest text-[#2563EB] font-bold block mb-1">
              CRAFTSPERSON DIRECT PLEDGE & METHODOLOGY
            </span>
            {worker.bio}
          </div>

          {/* 4-Point Verification Grid */}
          <div>
            <h4 className="font-mono text-[11px] uppercase tracking-widest text-[#2563EB] font-bold mb-3.5">
              Cryptographic & State Licensing Ledger
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="bg-[#F8FAFC] p-4 rounded-xl border border-blue-100 flex items-start gap-3.5">
                <div className="p-2 rounded-lg bg-blue-100 text-[#2563EB] shrink-0">
                  <FileCheck2 className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-900">
                    State Contractor Trade License
                  </div>
                  <div className="font-mono text-xs text-[#2563EB] font-semibold mt-0.5">
                    {worker.licenseNumber}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                    Verified directly with the State Contractors License Board. Zero citations or disciplinary actions.
                  </p>
                </div>
              </div>

              <div className="bg-[#F8FAFC] p-4 rounded-xl border border-blue-100 flex items-start gap-3.5">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-700 shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-900">
                    National Criminal & Identity Audit
                  </div>
                  <div className="font-mono text-xs text-emerald-700 font-semibold mt-0.5">
                    {worker.backgroundCheckId}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                    Biometric government ID, SSN trace, and federal/county background screening cleared.
                  </p>
                </div>
              </div>

              <div className="bg-[#F8FAFC] p-4 rounded-xl border border-blue-100 flex items-start gap-3.5">
                <div className="p-2 rounded-lg bg-blue-100 text-[#2563EB] shrink-0">
                  <Award className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-900">
                    Commercial Liability & Workmanship Warranty
                  </div>
                  <div className="font-mono text-xs text-slate-900 font-semibold mt-0.5">
                    ${worker.insuranceBondAmount.toLocaleString()} Bond •{' '}
                    {worker.warrantyMonths || 36}-Month Written Guarantee
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                    Backed by Aura Surety against accidental water, electrical, structural, or finish damage.
                  </p>
                </div>
              </div>

              <div className="bg-[#F8FAFC] p-4 rounded-xl border border-blue-100 flex items-start gap-3.5">
                <div className="p-2 rounded-lg bg-blue-100 text-[#2563EB] shrink-0">
                  <PhoneCall className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-900">
                    Multi-Factor Site PIN Protocol
                  </div>
                  <div className="font-mono text-xs text-slate-800 font-semibold mt-0.5">
                    SMS OTP + Door Handshake Active
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                    Craftsperson must verify your 4-digit Site Safety PIN prior to residential entry.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Trade Certifications + On-Rig Tool Manifest */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-[#F8FAFC] p-5 rounded-2xl border border-blue-100 space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#2563EB]" />
                <h4 className="font-mono text-[11px] uppercase tracking-widest text-[#2563EB] font-bold">
                  Board Accreditations & Certifications
                </h4>
              </div>
              <ul className="space-y-2">
                {certifications.map((cert, idx) => (
                  <li
                    key={idx}
                    className="flex items-center gap-2.5 text-xs text-slate-800 bg-white px-3.5 py-2 rounded-xl border border-blue-100"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="font-medium">{cert}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-[#F8FAFC] p-5 rounded-2xl border border-blue-100 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-[#2563EB]" />
                  <h4 className="font-mono text-[11px] uppercase tracking-widest text-[#2563EB] font-bold">
                    On-Rig Diagnostic & Tool Manifest
                  </h4>
                </div>
                <span className="font-mono text-[10px] text-emerald-700 font-semibold">
                  $0 Tool Fee
                </span>
              </div>
              <ul className="space-y-2">
                {equipmentManifest.map((item, idx) => (
                  <li
                    key={idx}
                    className="flex items-center gap-2.5 text-xs text-slate-800 bg-white px-3.5 py-2 rounded-xl border border-blue-100"
                  >
                    <span className="w-2 h-2 rounded-full bg-[#2563EB] shrink-0" />
                    <span className="font-mono text-[11px] text-slate-700">
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Audited Recent Project Case Studies */}
          {recentProjects.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3.5">
                <h4 className="font-mono text-[11px] uppercase tracking-widest text-[#2563EB] font-bold flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-[#2563EB]" />
                  Audited Past Project Case Studies (Zero Material Markup)
                </h4>
                <span className="font-mono text-[10px] text-slate-400">
                  Verified Escrow Receipts
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {recentProjects.map((proj, idx) => (
                  <div
                    key={idx}
                    className="bg-[#F8FAFC] p-4 rounded-2xl border border-blue-100 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-xs font-bold text-slate-900">
                          {proj.title}
                        </div>
                        <div className="font-mono text-[10px] text-[#2563EB] flex items-center gap-2 mt-0.5">
                          <span>{proj.neighborhood}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {proj.duration}
                          </span>
                        </div>
                      </div>
                      <div className="text-right shrink-0 bg-white px-2.5 py-1 rounded-lg border border-blue-200 font-mono">
                        <div className="text-xs font-bold text-[#1E3A8A]">
                          ${proj.finalCost}
                        </div>
                        <div className="text-[9px] text-emerald-700">
                          Incl. ${proj.materialsCost} Mat.
                        </div>
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      {proj.summary}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pre-Priced Flat Tasks */}
          <div>
            <h4 className="font-mono text-[11px] uppercase tracking-widest text-[#2563EB] font-bold mb-3.5">
              Standardized Fixed-Scope Schedule (Click to Reserve)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {worker.transparentRates.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    const parsedHours = parseFloat(item.estimatedHours) || 2;
                    onHireClick(worker, item.task, parsedHours);
                  }}
                  className="flex items-center justify-between p-4 bg-white hover:bg-blue-50/50 border border-slate-200 hover:border-[#2563EB] rounded-xl text-left transition-all group shadow-2xs"
                >
                  <div className="pr-3">
                    <div className="text-xs font-semibold text-slate-900 group-hover:text-[#2563EB] transition-colors">
                      {item.task}
                    </div>
                    <div className="font-mono text-[11px] text-slate-400 mt-0.5">
                      Estimated Duration: {item.estimatedHours}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-mono text-sm font-bold text-slate-900">
                      ${item.flatPrice}
                    </div>
                    <div className="font-mono text-[10px] text-[#2563EB] uppercase tracking-wider font-semibold">
                      Reserve →
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Interactive Price-Lock Estimator */}
          <div className="bg-[#0B192C] text-white p-6 rounded-2xl border border-blue-900 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Calculator className="w-4 h-4 text-sky-400" />
                <span className="font-mono text-xs uppercase tracking-widest font-semibold text-white">
                  Interactive Ceiling-Price Estimator
                </span>
              </div>
              <span className="font-mono text-[11px] text-sky-400">
                Zero Hidden Agency Fees
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <div className="flex justify-between text-xs mb-2">
                  <span className="text-blue-200/70">Booked Craft Labor</span>
                  <span className="font-mono font-semibold text-white">
                    {selectedHours} hrs × ${worker.hourlyRate}/hr
                  </span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={10}
                  step={0.5}
                  value={selectedHours}
                  onChange={(e) => setSelectedHours(parseFloat(e.target.value))}
                  className="w-full range-dark"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-2">
                  <span className="text-blue-200/70">
                    At-Cost Materials Allowance (0% Markup)
                  </span>
                  <span className="font-mono font-semibold text-white">
                    ${materialsEst}
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={250}
                  step={5}
                  value={materialsEst}
                  onChange={(e) => setMaterialsEst(parseInt(e.target.value, 10))}
                  className="w-full range-dark"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex flex-wrap gap-5 font-mono text-xs">
                <div>
                  <span className="text-blue-200/60">Labor:</span>{' '}
                  <strong className="text-white">${laborTotal}</strong>
                </div>
                <div>
                  <span className="text-blue-200/60">Materials:</span>{' '}
                  <strong className="text-white">${materialsEst}</strong>
                </div>
                <div>
                  <span className="text-blue-200/60">5% Escrow Vault:</span>{' '}
                  <strong className="text-white">${escrowFee}</strong>
                </div>
                <div>
                  <span className="text-blue-200/60">Ceiling Total:</span>{' '}
                  <strong className="text-base text-sky-400">
                    ${guaranteedTotal}
                  </strong>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onHireClick(worker, undefined, selectedHours)}
                className="px-5 py-3 bg-[#2563EB] hover:bg-blue-500 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-2 transition-colors shrink-0"
              >
                <Lock className="w-3.5 h-3.5" />
                Lock Rate & Reserve {worker.name.split(' ')[0]}
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
