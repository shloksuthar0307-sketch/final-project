import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Car, FileSignature, Info, X, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../../../api/client';

const STEPS = ['Intake', 'Inspection', 'Approval & Repair', 'Quality Check', 'Ready'];

export default function ActiveRepairTracker({ loading: parentLoading }: { loading: boolean }) {
  const navigate = useNavigate();
  const [showNotes, setShowNotes] = useState(false);
  const [activeData, setActiveData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadActiveRepair();
  }, []);

  const loadActiveRepair = async () => {
    try {
      setLoading(true);
      const res = await apiFetch('/customer/dashboard/');
      setActiveData(res);
    } catch (err) {
      console.error('Failed to load active repair in tracker:', err);
    } finally {
      setLoading(false);
    }
  };

  if (parentLoading || loading) {
    return <div className="h-[300px] bg-[#0A0A0B]/80 rounded-2xl border border-white/5 animate-pulse"></div>;
  }

  const service = activeData?.activeService;
  const vehicle = activeData?.vehicle || service?.vehicle_info;

  const vehicleName = vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : '2022 Porsche 911 GT3';
  const plate = vehicle?.registration_number || 'MH-02-CB-9921';
  const title = service?.title || 'Brake Pad & Rotor Replacement';
  const technician = service?.technician || 'Elena Rostova';
  const progress = service?.progress ?? 35;

  let currentStep = 1;
  const st = (service?.status || '').toUpperCase();
  if (st === 'CHECKED_IN') currentStep = 0;
  else if (st === 'INSPECTION' || st === 'DIAGNOSIS') currentStep = 1;
  else if (st === 'AWAITING_APPROVAL' || st === 'APPROVED' || st === 'REPAIRING') currentStep = 2;
  else if (st === 'QUALITY_CHECK') currentStep = 3;
  else if (st === 'COMPLETED' || st === 'READY_FOR_PICKUP') currentStep = 4;

  return (
    <div className="bg-[#0A0A0B]/80 backdrop-blur-md border border-white/5 rounded-2xl p-6 relative overflow-hidden h-full flex flex-col justify-between">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#35D07F] to-transparent opacity-50"></div>
      
      <div className="flex flex-col sm:flex-row justify-between items-start mb-8 gap-4">
        <div>
          <h2 className="text-xs font-bold tracking-[0.2em] uppercase text-white mb-4">Active Repair Progress</h2>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center text-white border border-white/10 shrink-0">
              <Car size={32} className="text-[#35D07F]" />
            </div>
            <div>
              <h3 className="text-xl font-bold tracking-widest text-white">{vehicleName}</h3>
              <p className="text-slate-400 text-[10px] font-bold tracking-[0.15em] uppercase mt-1">
                Plate: <span className="text-white font-mono">{plate}</span> • {title}
              </p>
            </div>
          </div>
        </div>
        <div className="sm:text-right">
          <p className="text-slate-500 text-[10px] font-bold tracking-widest uppercase mb-1">Status</p>
          <p className="text-[#35D07F] text-sm font-bold tracking-widest uppercase font-mono">
            {service?.status || 'AWAITING_APPROVAL'} ({progress}%)
          </p>
        </div>
      </div>

      {/* Progress Bar Container */}
      <div className="overflow-x-auto pb-4 custom-scrollbar">
        <div className="relative mb-8 mt-4 min-w-[500px]">
          <div className="absolute top-1/2 left-0 w-full h-1 bg-white/10 -translate-y-1/2 rounded-full"></div>
          <div 
            className="absolute top-1/2 left-0 h-1 bg-[#35D07F] -translate-y-1/2 rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(53,208,127,0.5)]" 
            style={{ width: `${(currentStep / (STEPS.length - 1)) * 100}%` }}
          ></div>
          
          <div className="relative flex justify-between">
            {STEPS.map((step, idx) => {
              const isCompleted = idx < currentStep;
              const isCurrent = idx === currentStep;
              return (
                <div key={step} className="flex flex-col items-center relative">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 transition-all z-10 ${
                    isCompleted ? 'bg-[#35D07F] border-[#35D07F] text-black shadow-[0_0_10px_rgba(53,208,127,0.5)]' : 
                    isCurrent ? 'bg-[#111112] border-[#35D07F] shadow-[0_0_15px_rgba(53,208,127,0.5)]' : 
                    'bg-[#111112] border-white/20'
                  }`}>
                    <div className={`w-2 h-2 rounded-full ${isCompleted ? 'bg-black' : isCurrent ? 'bg-[#35D07F] animate-pulse' : 'bg-transparent'}`}></div>
                  </div>
                  <span className={`absolute top-8 text-[9px] font-bold uppercase tracking-widest text-center w-28 left-1/2 -translate-x-1/2 ${
                    isCompleted || isCurrent ? 'text-white' : 'text-slate-600'
                  }`}>{step}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3 pt-6 border-t border-white/5 mt-4">
        <button 
          onClick={() => setShowNotes(true)} 
          className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl text-[10px] font-bold tracking-widest uppercase transition-all"
        >
          <Info size={14} /> Diagnostic Findings
          <span className="ml-1 w-2 h-2 bg-[#35D07F] rounded-full animate-pulse shadow-[0_0_5px_rgba(53,208,127,0.8)]"></span>
        </button>
        <button 
          onClick={() => navigate('/customer/approvals')} 
          className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-500 rounded-xl text-[10px] font-bold tracking-widest uppercase transition-all"
        >
          <FileSignature size={14} /> Review & Approve Estimate
        </button>
        <button 
          onClick={() => navigate('/customer/messages')} 
          className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl text-[10px] font-bold tracking-widest uppercase transition-all ml-auto"
        >
          Contact Advisor
        </button>
      </div>

      {/* Tech Notes Modal */}
      <AnimatePresence>
        {showNotes && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-[#0A0A0B]/95 backdrop-blur-xl z-20 p-6 flex flex-col border border-white/10 rounded-2xl">
            <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
              <h3 className="text-xs font-bold tracking-[0.2em] uppercase text-[#35D07F]">Diagnostic & Inspection Telemetry</h3>
              <button onClick={() => setShowNotes(false)} className="text-slate-400 hover:text-white p-1 bg-white/5 rounded-lg"><X size={16} /></button>
            </div>
            <div className="flex-1 overflow-auto custom-scrollbar space-y-4 pr-2">
              <div className="bg-white/5 p-5 rounded-xl border border-white/5">
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-[#35D07F]/20 text-[#35D07F] flex items-center justify-center text-[10px] font-bold">E</div>
                    <span className="text-white text-[10px] font-bold tracking-widest uppercase">{technician} • Assigned Specialist</span>
                  </div>
                  <span className="text-slate-500 text-[9px] uppercase tracking-widest font-mono">Job Order #{service?.order_number || 'RT-2026-9921'}</span>
                </div>
                <p className="text-slate-300 text-sm leading-relaxed">
                  Front brake pads measured at 2.1mm (critical replacement threshold 2.0mm). Rotor surface glazing identified under thermal imaging. High-performance Brembo compound pad replacement and rotor precision surfacing authorized in pending estimate.
                </p>
                <div className="mt-4 pt-4 border-t border-white/5 grid grid-cols-2 gap-4">
                   <div>
                     <p className="text-slate-500 text-[9px] uppercase tracking-widest mb-1">Assigned Bay</p>
                     <p className="text-white text-xs font-bold">{service?.bay || 'Bay 2 (Lift)'}</p>
                   </div>
                   <div>
                     <p className="text-slate-500 text-[9px] uppercase tracking-widest mb-1">Service Advisor</p>
                     <p className="text-white text-xs font-bold">{service?.advisor || 'Sarah Wilson'}</p>
                   </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
