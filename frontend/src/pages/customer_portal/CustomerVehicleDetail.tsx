import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Car, Calendar, FileText, Wrench, ShieldCheck, Activity, Edit3, QrCode, RefreshCw, Loader2, CheckCircle2, AlertTriangle, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';
import { fetchVehicle, fetchServiceHistory, fetchVehicleQR, regenerateVehicleQR } from '../../api/client';

export default function CustomerVehicleDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'health' | 'qr'>('overview');
  
  const [vehicle, setVehicle] = useState<any | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [qrData, setQrData] = useState<{ token: string; qr_url: string } | null>(null);
  const [qrLoading, setQrLoading] = useState(false);

  useEffect(() => {
    if (id) {
      loadVehicleData();
    }
  }, [id]);

  useEffect(() => {
    if (activeTab === 'qr' && id) {
      loadQrData();
    }
  }, [activeTab, id]);

  const loadVehicleData = async () => {
    try {
      setLoading(true);
      const [vData, hData] = await Promise.all([
        fetchVehicle(id!),
        fetchServiceHistory(id!).catch(() => [])
      ]);
      setVehicle(vData);
      setHistory(Array.isArray(hData) ? hData : (hData.results || []));
    } catch (err: any) {
      toast.error('Failed to load vehicle details');
    } finally {
      setLoading(false);
    }
  };

  const loadQrData = async () => {
    try {
      setQrLoading(true);
      const res = await fetchVehicleQR(id!);
      setQrData(res);
    } catch (err: any) {
      console.error('Error fetching QR data', err);
    } finally {
      setQrLoading(false);
    }
  };

  const handleRegenerateQr = async () => {
    try {
      setQrLoading(true);
      const res = await regenerateVehicleQR(id!);
      setQrData(res);
      toast.success('Vehicle history QR Code regenerated successfully');
    } catch (err) {
      toast.error('Failed to regenerate QR code');
    } finally {
      setQrLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 text-[#35D07F] animate-spin mb-4" />
        <p className="text-slate-400 text-xs font-bold tracking-widest uppercase">Accessing Vehicle Telemetry...</p>
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div className="py-20 text-center flex flex-col items-center">
        <Car size={36} className="text-slate-600 mb-4" />
        <h3 className="text-white font-bold tracking-widest uppercase mb-2">Vehicle Not Found</h3>
        <button onClick={() => navigate('/customer/vehicles')} className="mt-4 text-[#35D07F] text-xs font-bold uppercase tracking-widest">
          Return to Garage
        </button>
      </div>
    );
  }

  const isGood = (vehicle.health_score ?? 85) >= 80;
  const plate = vehicle.registration_number || vehicle.plate || 'No Plate';

  return (
    <div className="max-w-[1400px] mx-auto pb-10">
      {/* Header */}
      <div className="mb-8">
        <button 
          onClick={() => navigate('/customer/vehicles')}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-6 text-[10px] font-bold tracking-widest uppercase"
        >
          <ArrowLeft size={14} /> Back to Vehicles
        </button>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center gap-3 mb-2">
              <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest ${
                isGood ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 
                'bg-amber-500/10 text-amber-400 border border-amber-500/20'
              }`}>
                {vehicle.health_status || (isGood ? 'Optimal' : 'Attention Required')}
              </span>
              <span className="text-slate-400 text-[10px] font-bold uppercase tracking-widest font-mono">PLATE: {plate}</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-widest uppercase text-white">
              {vehicle.year} {vehicle.make} {vehicle.model}
            </h1>
            <p className="text-slate-400 text-xs mt-2 font-mono tracking-wider">
              VIN: <span className="text-slate-200">{vehicle.vin || 'Not Registered'}</span>
            </p>
          </motion.div>

          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }} className="flex gap-3">
            <button 
              onClick={() => setActiveTab('qr')} 
              className="px-5 py-2.5 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-xl text-xs font-bold tracking-widest uppercase transition-all flex items-center gap-2"
            >
              <QrCode size={16} className="text-[#35D07F]" /> Digital Passport
            </button>
            <button 
              onClick={() => navigate('/customer/book-service')} 
              className="px-6 py-2.5 bg-[#35D07F] hover:bg-[#2bb46c] text-black rounded-xl text-xs font-bold tracking-widest uppercase transition-all shadow-[0_0_15px_rgba(53,208,127,0.3)] flex items-center gap-2"
            >
              <Wrench size={16} /> Book Service
            </button>
          </motion.div>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
      >
        <div className="bg-[#0A0A0B]/80 backdrop-blur-md border border-white/5 rounded-2xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
            <Activity size={20} />
          </div>
          <div>
            <p className="text-slate-500 text-[10px] font-bold tracking-widest uppercase mb-1">Odometer</p>
            <p className="text-white font-bold text-lg font-mono">{Number(vehicle.mileage || 18400).toLocaleString()} km</p>
          </div>
        </div>
        
        <div className="bg-[#0A0A0B]/80 backdrop-blur-md border border-white/5 rounded-2xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-[#35D07F]">
            <ShieldCheck size={20} />
          </div>
          <div>
            <p className="text-slate-500 text-[10px] font-bold tracking-widest uppercase mb-1">Health Score</p>
            <p className="text-[#35D07F] font-bold text-lg font-mono">{vehicle.health_score || 88} / 100</p>
          </div>
        </div>

        <div className="bg-[#0A0A0B]/80 backdrop-blur-md border border-white/5 rounded-2xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400">
            <Calendar size={20} />
          </div>
          <div>
            <p className="text-slate-500 text-[10px] font-bold tracking-widest uppercase mb-1">Fuel / Transmission</p>
            <p className="text-white font-bold text-sm tracking-widest uppercase">{vehicle.fuel_type || 'Petrol'} • {vehicle.transmission || 'Automatic'}</p>
          </div>
        </div>

        <div className="bg-[#0A0A0B]/80 backdrop-blur-md border border-white/5 rounded-2xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400">
            <Wrench size={20} />
          </div>
          <div>
            <p className="text-slate-500 text-[10px] font-bold tracking-widest uppercase mb-1">Total Service Orders</p>
            <p className="text-white font-bold text-lg font-mono">{history.length}</p>
          </div>
        </div>
      </motion.div>

      {/* Main Content Tabs */}
      <div className="flex flex-col lg:flex-row gap-8">
        
        {/* Sidebar Nav */}
        <div className="w-full lg:w-64 shrink-0 space-y-2">
          {[
            { id: 'overview', label: 'Vehicle Overview', icon: Car },
            { id: 'health', label: 'System Telemetry', icon: Activity },
            { id: 'history', label: 'Service History', icon: Wrench },
            { id: 'qr', label: 'Public Passport QR', icon: QrCode }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${
                activeTab === tab.id 
                  ? 'bg-[#35D07F]/10 text-[#35D07F] shadow-[inset_2px_0_0_#35D07F]' 
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <tab.icon size={16} /> {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1 min-w-0">
          <AnimatePresence mode="wait">
            
            {activeTab === 'overview' && (
              <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                <div className="bg-[#0A0A0B]/80 border border-white/5 rounded-2xl p-6">
                  <h3 className="text-sm font-bold tracking-widest uppercase text-white mb-6 flex items-center gap-2">
                    <Car className="text-[#35D07F]" size={16} /> Specifications & Specs
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                    <div>
                      <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1">Make</p>
                      <p className="text-white text-sm font-medium">{vehicle.make}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1">Model</p>
                      <p className="text-white text-sm font-medium">{vehicle.model}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1">Year</p>
                      <p className="text-white text-sm font-medium">{vehicle.year}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1">Color</p>
                      <p className="text-white text-sm font-medium">{vehicle.color || 'Standard'}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1">Fuel Type</p>
                      <p className="text-white text-sm font-medium">{vehicle.fuel_type || 'Petrol'}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1">Transmission</p>
                      <p className="text-white text-sm font-medium">{vehicle.transmission || 'Automatic'}</p>
                    </div>
                  </div>
                </div>

                {/* Maintenance Items */}
                {vehicle.maintenance_items && vehicle.maintenance_items.length > 0 && (
                  <div className="bg-[#0A0A0B]/80 border border-white/5 rounded-2xl p-6">
                    <h3 className="text-sm font-bold tracking-widest uppercase text-white mb-4 flex items-center gap-2">
                      <Calendar className="text-amber-500" size={16} /> Scheduled Maintenance Schedule
                    </h3>
                    <div className="divide-y divide-white/5">
                      {vehicle.maintenance_items.map((m: any) => (
                        <div key={m.id} className="py-3 flex justify-between items-center">
                          <div>
                            <p className="text-white text-xs font-bold uppercase tracking-wider">{m.title}</p>
                            <p className="text-slate-400 text-[10px] tracking-widest uppercase">{m.due_text}</p>
                          </div>
                          <span className={`px-2 py-1 rounded text-[9px] font-bold uppercase tracking-widest ${
                            m.is_urgent ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-white/5 text-slate-300'
                          }`}>
                            {m.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'health' && (
              <motion.div key="health" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                <div className="bg-[#0A0A0B]/80 border border-white/5 rounded-2xl p-6">
                  <h3 className="text-sm font-bold tracking-widest uppercase text-white mb-6 flex items-center gap-2">
                    <Activity className="text-[#35D07F]" size={16} /> Multi-System Health Diagnostics
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {vehicle.health_categories && vehicle.health_categories.length > 0 ? (
                      vehicle.health_categories.map((cat: any) => (
                        <div key={cat.id} className="bg-[#111112] border border-white/5 rounded-xl p-4 flex flex-col justify-between">
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-white text-xs font-bold tracking-wider uppercase">{cat.name}</span>
                            <span className={`text-xs font-bold font-mono ${cat.score >= 80 ? 'text-[#35D07F]' : 'text-amber-400'}`}>
                              {cat.score}%
                            </span>
                          </div>
                          <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden mb-2">
                            <div 
                              className={`h-full ${cat.score >= 80 ? 'bg-[#35D07F]' : 'bg-amber-400'}`} 
                              style={{ width: `${cat.score}%` }}
                            />
                          </div>
                          <p className="text-slate-500 text-[10px] tracking-widest uppercase">{cat.warning ? 'Warning: Attention Required' : 'Diagnostic Status: Optimal'}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-slate-500 text-xs">No component telemetry recorded yet.</p>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'history' && (
              <motion.div key="history" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
                <div className="bg-[#0A0A0B]/80 border border-white/5 rounded-2xl p-6">
                  <h3 className="text-sm font-bold tracking-widest uppercase text-white mb-6 flex items-center gap-2">
                    <Wrench className="text-[#35D07F]" size={16} /> Historical Service Log
                  </h3>
                  {history.length > 0 ? (
                    <div className="divide-y divide-white/5">
                      {history.map((order: any) => (
                        <div key={order.id} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div>
                            <div className="flex items-center gap-3 mb-1">
                              <span className="text-[#35D07F] font-mono text-xs font-bold">{order.order_number}</span>
                              <span className="px-2 py-0.5 bg-white/5 text-slate-300 rounded text-[9px] font-bold tracking-widest uppercase">
                                {order.status}
                              </span>
                            </div>
                            <h4 className="text-white text-sm font-bold tracking-wider">{order.title}</h4>
                            <p className="text-slate-500 text-[10px] tracking-widest uppercase mt-1">
                              Tech: {order.technician || 'Assigned Specialist'} • Branch: {order.branch_name || 'Apex Center'}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-white text-sm font-mono font-bold">${Number(order.total_cost || 0).toFixed(2)}</p>
                            <p className="text-slate-500 text-[10px] tracking-widest uppercase">
                              {order.date_created ? new Date(order.date_created).toLocaleDateString() : ''}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-12 text-center text-slate-500 text-xs tracking-widest uppercase">
                      No service records logged for this vehicle yet.
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === 'qr' && (
              <motion.div key="qr" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                <div className="bg-[#0A0A0B]/80 border border-white/5 rounded-2xl p-8 flex flex-col items-center text-center">
                  <h3 className="text-xl font-bold tracking-widest uppercase text-white mb-2">
                    Cryptographic Service Passport
                  </h3>
                  <p className="text-slate-400 text-xs tracking-widest uppercase max-w-md mb-8">
                    Scan or share this public QR code to provide verified buyers or repairers access to permanent service history without exposing personal customer details.
                  </p>

                  {qrLoading ? (
                    <div className="w-56 h-56 flex items-center justify-center bg-white/5 rounded-2xl border border-white/10 mb-6">
                      <Loader2 className="w-8 h-8 text-[#35D07F] animate-spin" />
                    </div>
                  ) : qrData ? (
                    <div className="flex flex-col items-center mb-8">
                      <div className="p-4 bg-white rounded-2xl shadow-[0_0_30px_rgba(53,208,127,0.2)] mb-4">
                        <img 
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrData.qr_url)}`} 
                          alt="Vehicle QR Code"
                          className="w-48 h-48 rounded"
                        />
                      </div>
                      <a 
                        href={`/v/${qrData.token}`} 
                        target="_blank" 
                        rel="noreferrer"
                        className="text-[#35D07F] hover:underline text-xs font-mono flex items-center gap-1.5"
                      >
                        Public Link: /v/{qrData.token} <ExternalLink size={12} />
                      </a>
                    </div>
                  ) : (
                    <p className="text-slate-500 text-xs mb-8">No active QR code generated.</p>
                  )}

                  <div className="flex gap-4">
                    <button
                      onClick={handleRegenerateQr}
                      disabled={qrLoading}
                      className="px-6 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-bold tracking-widest uppercase border border-white/10 transition-all flex items-center gap-2"
                    >
                      <RefreshCw size={14} className={qrLoading ? 'animate-spin' : ''} /> Regenerate Token
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
