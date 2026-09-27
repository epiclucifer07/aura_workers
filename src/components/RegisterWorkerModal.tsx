import React, { useState } from 'react';
import { X, Wrench, CheckCircle2 } from 'lucide-react';
import { TradeCategory, Worker } from '../types';

interface RegisterWorkerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRegisterWorker: (newWorker: Worker) => Promise<void>;
}

export const RegisterWorkerModal: React.FC<RegisterWorkerModalProps> = ({
  isOpen,
  onClose,
  onRegisterWorker,
}) => {
  const [name, setName] = useState('');
  const [trade, setTrade] = useState<TradeCategory>('Plumber');
  const [specialty, setSpecialty] = useState('');
  const [hourlyRate, setHourlyRate] = useState<number>(44);
  const [licenseNumber, setLicenseNumber] = useState('LIC #PLM-88412-CA');
  const [yearsExperience, setYearsExperience] = useState<number>(10);
  const [warrantyMonths, setWarrantyMonths] = useState<number>(36);
  const [neighborhood, setNeighborhood] = useState('Central Metro & Westside');
  const [equipmentList, setEquipmentList] = useState(
    'FLIR Thermal Imager, HEPA Dust Extractor, Digital Pressure Analyzer'
  );
  const [bio, setBio] = useState('');
  const [task1Name, setTask1Name] = useState('Standard Fixture / Surface Service');
  const [task1Price, setTask1Price] = useState<number>(88);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const workerId = `worker_${Date.now()}`;
      const parsedEquipment = equipmentList
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const newWorker: Worker = {
        id: workerId,
        name: name.trim() || 'Verified Trade Specialist',
        trade,
        specialty:
          specialty.trim() ||
          `Licensed ${trade} • Residential Repair & Precision Execution`,
        avatar:
          trade === 'Painter' || trade === 'Masonry'
            ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80'
            : 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=80',
        hourlyRate: Number(hourlyRate) || 44,
        minCalloutFee: 0,
        materialsMarkupPct: 0,
        rating: 5.0,
        reviewCount: 1,
        completedJobs: 18,
        licenseNumber: licenseNumber.trim() || 'LIC #TRD-99201-CA',
        backgroundCheckId: `BG-SHA256-${Math.random()
          .toString(16)
          .substring(2, 8)
          .toUpperCase()}`,
        insuranceBondAmount: 1000000,
        verifiedPhone: true,
        verifiedIdentity: true,
        verifiedLicense: true,
        yearsExperience: Number(yearsExperience) || 10,
        warrantyMonths: Number(warrantyMonths) || 36,
        availabilityStatus: 'Available Today',
        serviceRadiusMiles: 20,
        onTimeRatePct: 99.5,
        repeatClientPct: 90,
        languages: ['English'],
        certifications: [
          `CA State Licensed ${trade} Contractor`,
          'OSHA-30 Residential Site Safety Certified',
          'Aura Zero-Markup Wholesale Receipt Pledge',
        ],
        equipmentManifest:
          parsedEquipment.length > 0
            ? parsedEquipment
            : ['Digital Diagnostic Kit', 'HEPA Dust Containment System'],
        neighborhood: neighborhood.trim() || 'Metro Service Area',
        responseTimeMins: 14,
        bio:
          bio.trim() ||
          `State-licensed ${trade.toLowerCase()} committed to affordable, transparent hourly rates and zero markup on hardware store materials.`,
        transparentRates: [
          {
            task: task1Name.trim() || `${trade} Standard Service Package`,
            flatPrice: Number(task1Price) || Number(hourlyRate) * 2,
            estimatedHours: '2.0 hrs',
          },
          {
            task: `Half-Day ${trade} Execution Block`,
            flatPrice: Number(hourlyRate) * 4,
            estimatedHours: '4.0 hrs',
          },
        ],
      };

      await onRegisterWorker(newWorker);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B192C]/75 backdrop-blur-md p-4">
      <div className="relative w-full max-w-xl bg-white border border-blue-100 rounded-2xl shadow-[0_32px_90px_rgba(11,25,44,0.45)] overflow-hidden max-h-[90vh] flex flex-col">
        <div className="bg-[#0B192C] text-white px-7 py-5 flex items-center justify-between border-b border-blue-900 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#2563EB] flex items-center justify-center">
              <Wrench className="w-4 h-4 text-white" />
            </div>
            <div>
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-sky-400 block font-semibold">
                CRAFTSPERSON CREDENTIAL ENROLLMENT
              </span>
              <h3 className="font-display text-base font-semibold text-white">
                Apply to THE AURA WORKERS Guild
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
          className="p-7 space-y-4 overflow-y-auto text-xs"
        >
          <p className="text-slate-500 leading-relaxed">
            Enroll in <strong className="text-slate-900">THE AURA WORKERS</strong> verified guild. All members pledge transparent direct hourly rates ($0 callout fee, 0% material markup) and maintain active state licensing.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block font-mono text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1.5">
                Full Legal Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Carlos Mendez"
                className="w-full px-3.5 py-2.5 bg-[#F8FAFC] border border-slate-200 rounded-xl focus:outline-none focus:border-[#2563EB]"
              />
            </div>

            <div>
              <label className="block font-mono text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1.5">
                Primary Trade Discipline
              </label>
              <select
                value={trade}
                onChange={(e) => setTrade(e.target.value as TradeCategory)}
                className="w-full px-3.5 py-2.5 bg-[#F8FAFC] border border-slate-200 rounded-xl focus:outline-none focus:border-[#2563EB]"
              >
                <option value="Plumber">Master Plumber</option>
                <option value="Painter">Architectural Painter</option>
                <option value="Electrician">Licensed Electrician</option>
                <option value="Carpenter">Finish Carpenter</option>
                <option value="HVAC">HVAC & Climate Specialist</option>
                <option value="Masonry">Tile & Masonry Craftsperson</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="block font-mono text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1.5">
                Direct Rate ($/hr)
              </label>
              <input
                type="number"
                required
                min={20}
                max={120}
                value={hourlyRate}
                onChange={(e) => setHourlyRate(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-[#F8FAFC] border border-slate-200 rounded-xl font-mono font-bold focus:outline-none focus:border-[#2563EB]"
              />
            </div>

            <div>
              <label className="block font-mono text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1.5">
                State License #
              </label>
              <input
                type="text"
                required
                value={licenseNumber}
                onChange={(e) => setLicenseNumber(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#F8FAFC] border border-slate-200 rounded-xl font-mono focus:outline-none focus:border-[#2563EB]"
              />
            </div>

            <div>
              <label className="block font-mono text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1.5">
                Years Exp.
              </label>
              <input
                type="number"
                required
                min={1}
                max={50}
                value={yearsExperience}
                onChange={(e) => setYearsExperience(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-[#F8FAFC] border border-slate-200 rounded-xl font-mono focus:outline-none focus:border-[#2563EB]"
              />
            </div>

            <div>
              <label className="block font-mono text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1.5">
                Warranty (Mo)
              </label>
              <input
                type="number"
                required
                min={12}
                max={120}
                value={warrantyMonths}
                onChange={(e) => setWarrantyMonths(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-[#F8FAFC] border border-slate-200 rounded-xl font-mono focus:outline-none focus:border-[#2563EB]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block font-mono text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1.5">
                Specialization & Technical Focus
              </label>
              <input
                type="text"
                required
                value={specialty}
                onChange={(e) => setSpecialty(e.target.value)}
                placeholder="e.g. Copper Repiping & Leak Diagnostics"
                className="w-full px-3.5 py-2.5 bg-[#F8FAFC] border border-slate-200 rounded-xl focus:outline-none focus:border-[#2563EB]"
              />
            </div>

            <div>
              <label className="block font-mono text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1.5">
                Service Neighborhoods
              </label>
              <input
                type="text"
                required
                value={neighborhood}
                onChange={(e) => setNeighborhood(e.target.value)}
                placeholder="e.g. Midtown & Westside District"
                className="w-full px-3.5 py-2.5 bg-[#F8FAFC] border border-slate-200 rounded-xl focus:outline-none focus:border-[#2563EB]"
              />
            </div>
          </div>

          <div>
            <label className="block font-mono text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1.5">
              On-Rig Diagnostic & Tool Manifest (Comma Separated)
            </label>
            <input
              type="text"
              value={equipmentList}
              onChange={(e) => setEquipmentList(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#F8FAFC] border border-slate-200 rounded-xl font-mono text-[11px] focus:outline-none focus:border-[#2563EB]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block font-mono text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1.5">
                Standardized Flat-Scope Package
              </label>
              <input
                type="text"
                required
                value={task1Name}
                onChange={(e) => setTask1Name(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#F8FAFC] border border-slate-200 rounded-xl focus:outline-none focus:border-[#2563EB]"
              />
            </div>
            <div>
              <label className="block font-mono text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1.5">
                Locked Package Price ($ USD)
              </label>
              <input
                type="number"
                required
                value={task1Price}
                onChange={(e) => setTask1Price(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-[#F8FAFC] border border-slate-200 rounded-xl font-mono focus:outline-none focus:border-[#2563EB]"
              />
            </div>
          </div>

          <div>
            <label className="block font-mono text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1.5">
              Craftsperson Guarantee & Bio
            </label>
            <textarea
              rows={2}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Outline your equipment, dust-containment standards, and zero-markup commitment..."
              className="w-full px-3.5 py-2.5 bg-[#F8FAFC] border border-slate-200 rounded-xl focus:outline-none focus:border-[#2563EB]"
            />
          </div>

          <div className="bg-blue-50/70 p-3.5 rounded-xl border border-blue-200 flex items-center gap-2.5 text-[11px] text-[#1E3A8A]">
            <CheckCircle2 className="w-4 h-4 text-[#2563EB] shrink-0" />
            <span>
              Includes $1,000,000 Aura Surety Bond & SHA-256 License Verification Seal.
            </span>
          </div>

          <div className="flex justify-end gap-3 pt-2">
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
              className="px-6 py-2.5 bg-[#2563EB] hover:bg-blue-700 text-white font-semibold text-xs rounded-xl transition-colors"
            >
              {submitting ? 'Verifying Credentials...' : 'Certify & Publish Dossier'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
