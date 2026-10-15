import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Car, Plus, Search, ShieldCheck, ShieldAlert, X, Check, Loader2, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { fetchVehicles as getVehiclesApi, createVehicle } from '../../api/client';

export default function CustomerVehicles() {
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Filter states
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [filterHealth, setFilterHealth] = useState('All'); // 'All', 'Good', 'Attention Required'

  // Modal Form State
  const [formData, setFormData] = useState({
    make: '',
    model: '',
    year: new Date().getFullYear(),
    registration_number: '',
    vin: '',
    color: '',
    mileage: 0,
    fuel_type: 'Petrol',
    transmission: 'Automatic'
  });

  const filterMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadVehicles();
  }, []);

  const loadVehicles = async () => {
    try {
      setLoading(true);
      const data = await getVehiclesApi();
      setVehicles(Array.isArray(data) ? data : (data.results || []));
    } catch (error: any) {
      toast.error('Failed to load vehicles');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (filterMenuRef.current && !filterMenuRef.current.contains(event.target as Node)) {
        setShowFilterMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter vehicles based on search query AND health filter
  const filteredVehicles = vehicles.filter(v => {
    const plate = v.registration_number || v.plate || '';
    const matchesSearch = `${v.year} ${v.make} ${v.model} ${plate} ${v.vin || ''}`.toLowerCase().includes(searchQuery.toLowerCase());
    const healthStatus = v.health_status || (v.health_score >= 80 ? 'Good' : 'Attention Required');
    const matchesHealth = filterHealth === 'All' || healthStatus.toLowerCase().includes(filterHealth.toLowerCase());
    return matchesSearch && matchesHealth;
  });

  const handleSaveVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.make || !formData.model || !formData.registration_number) {
      toast.error('Please enter Make, Model, and License Plate');
      return;
    }
    try {
      setIsSubmitting(true);
      await createVehicle({
        make: formData.make,
        model: formData.model,
        year: Number(formData.year),
        registration_number: formData.registration_number.toUpperCase(),
        vin: formData.vin ? formData.vin.toUpperCase() : undefined,
        color: formData.color || 'Standard',
        mileage: Number(formData.mileage) || 0,
        fuel_type: formData.fuel_type,
        transmission: formData.transmission
      });
      toast.success('Vehicle successfully added to your garage!', {
        style: { background: '#1A1A1B', color: '#fff', border: '1px solid rgba(53,208,127,0.2)' },
        iconTheme: { primary: '#35D07F', secondary: '#000' }
      });
      setShowAddModal(false);
      setFormData({
        make: '',
        model: '',
        year: new Date().getFullYear(),
        registration_number: '',
        vin: '',
        color: '',
        mileage: 0,
        fuel_type: 'Petrol',
        transmission: 'Automatic'
      });
      loadVehicles();
    } catch (error: any) {
      toast.error(error.message || 'Failed to add vehicle');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-bold tracking-widest uppercase text-white mb-2 flex items-center gap-3">
            <Car className="text-[#35D07F]" size={28} />
            My Vehicles
          </h1>
          <p className="text-slate-400 text-xs tracking-widest uppercase">
            Manage your registered vehicles and telemetry history.
          </p>
        </motion.div>

        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }} className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <input 
              type="text" 
              placeholder="SEARCH VEHICLES..." 
              className="pl-10 pr-4 py-2.5 bg-[#0A0A0B] border border-white/10 rounded-xl text-xs text-white uppercase tracking-widest focus:border-[#35D07F] outline-none transition-all w-64"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          {/* Filter Dropdown */}
          <div className="relative" ref={filterMenuRef}>
            <button 
              onClick={() => setShowFilterMenu(!showFilterMenu)}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#0A0A0B] border border-white/10 hover:border-white/20 rounded-xl text-xs text-white uppercase tracking-widest transition-all"
            >
              Filter: {filterHealth}
            </button>
            <AnimatePresence>
              {showFilterMenu && (
                <motion.div 
                  initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 5 }}
                  className="absolute right-0 mt-2 w-48 bg-[#0A0A0B] border border-white/10 rounded-xl p-3 shadow-2xl z-20"
                >
                  <div className="space-y-3">
                    {['All', 'Good', 'Attention Required'].map(status => (
                      <label key={status} className="flex items-center gap-3 cursor-pointer group" onClick={() => { setFilterHealth(status); setShowFilterMenu(false); }}>
                        <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                          filterHealth === status 
                            ? 'border-[#35D07F] bg-[#35D07F]' 
                            : 'border-white/20 group-hover:border-[#35D07F]/50'
                        }`}>
                          {filterHealth === status && <Check size={12} className="text-black" />}
                        </div>
                        <span className={`text-xs tracking-wider transition-colors ${
                          filterHealth === status 
                            ? 'text-white font-bold' 
                            : 'text-slate-400 group-hover:text-slate-200'
                        }`}>
                          {status}
                        </span>
                      </label>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button 
            onClick={() => setShowAddModal(true)} 
            className="flex items-center gap-2 px-6 py-2.5 bg-[#35D07F] hover:bg-[#2bb46c] text-black rounded-xl text-xs font-bold tracking-widest uppercase transition-all shadow-[0_0_15px_rgba(53,208,127,0.3)]"
          >
            <Plus size={16} /> Add Vehicle
          </button>
        </motion.div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {loading ? (
          <div className="col-span-full py-20 text-center flex flex-col items-center">
            <Loader2 className="w-12 h-12 text-[#35D07F] animate-spin mb-4" />
            <h3 className="text-white font-bold tracking-widest uppercase mb-2">Loading Vehicles...</h3>
          </div>
        ) : filteredVehicles.length > 0 ? filteredVehicles.map((vehicle, index) => {
          const isGood = (vehicle.health_score ?? 85) >= 80;
          const plate = vehicle.registration_number || vehicle.plate || 'No Plate';
          return (
            <motion.div 
              key={vehicle.id}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }}
              onClick={() => navigate(`/customer/vehicles/${vehicle.id}`)}
              className="bg-[#0A0A0B]/80 backdrop-blur-md border border-white/5 hover:border-white/20 rounded-2xl p-6 transition-all group shadow-xl cursor-pointer relative overflow-hidden"
            >
              <div className="flex justify-between items-start mb-6 border-b border-white/5 pb-6">
                <div className="flex items-center gap-5">
                  <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center text-white border border-white/10 group-hover:bg-[#35D07F]/10 group-hover:border-[#35D07F]/30 group-hover:text-[#35D07F] transition-all shrink-0">
                    <Car size={32} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold tracking-widest text-white mb-1 group-hover:text-[#35D07F] transition-colors">
                      {vehicle.year} {vehicle.make} {vehicle.model}
                    </h3>
                    <p className="text-slate-400 text-xs font-bold tracking-[0.15em] uppercase">Plate: <span className="text-white">{plate}</span></p>
                  </div>
                </div>
                <div className={`px-3 py-1.5 border rounded-lg text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 ${
                  isGood ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                }`}>
                  {isGood ? <ShieldCheck size={14} /> : <ShieldAlert size={14} />}
                  {vehicle.health_status || (isGood ? 'Good' : 'Attention Required')}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                <div>
                  <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1">VIN</p>
                  <p className="text-slate-300 text-xs tracking-wider font-mono">{vehicle.vin ? `...${vehicle.vin.slice(-6)}` : 'N/A'}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1">Mileage</p>
                  <p className="text-slate-300 text-xs tracking-wider">{vehicle.mileage ? `${Number(vehicle.mileage).toLocaleString()} km` : '18,400 km'}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1">Fuel / Trans</p>
                  <p className="text-slate-300 text-xs tracking-wider">{vehicle.fuel_type || 'Petrol'} / {vehicle.transmission?.slice(0, 4) || 'Auto'}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1">Health Score</p>
                  <p className="text-[#35D07F] text-xs font-bold font-mono tracking-wider">{vehicle.health_score || 88} / 100</p>
                </div>
              </div>

              <div className="flex justify-between items-center pt-3 border-t border-white/5 text-[10px] uppercase tracking-widest text-slate-400 group-hover:text-white transition-colors">
                <span>View Full Telemetry & QR</span>
                <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform text-[#35D07F]" />
              </div>
            </motion.div>
          );
        }) : (
          <div className="col-span-full py-20 text-center flex flex-col items-center">
            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center text-slate-500 mb-4">
              <Car size={24} />
            </div>
            <h3 className="text-white font-bold tracking-widest uppercase mb-2">No Vehicles Found</h3>
            <p className="text-slate-500 text-xs tracking-widest uppercase">We couldn't find any vehicles matching your search or filter.</p>
          </div>
        )}
      </div>

      {/* Add Vehicle Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} 
              className="absolute inset-0 bg-black/80 backdrop-blur-sm" 
              onClick={() => setShowAddModal(false)} 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} 
              className="bg-[#0A0A0B] border border-white/10 p-6 rounded-2xl z-10 w-full max-w-lg shadow-2xl relative"
            >
              <button onClick={() => setShowAddModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors">
                <X size={20} />
              </button>
              
              <h2 className="text-white text-lg font-bold tracking-widest uppercase mb-6 flex items-center gap-2">
                <Car className="text-[#35D07F]" size={20} /> Add New Vehicle
              </h2>
              
              <form onSubmit={handleSaveVehicle}>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1 block">Make</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Porsche" 
                      value={formData.make}
                      onChange={(e) => setFormData({ ...formData, make: e.target.value })}
                      required
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white text-sm outline-none focus:border-[#35D07F] transition-colors" 
                    />
                  </div>
                  <div>
                    <label className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1 block">Model</label>
                    <input 
                      type="text" 
                      placeholder="e.g. 911 GT3" 
                      value={formData.model}
                      onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                      required
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white text-sm outline-none focus:border-[#35D07F] transition-colors" 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1 block">Year</label>
                    <input 
                      type="number" 
                      placeholder="e.g. 2024" 
                      value={formData.year}
                      onChange={(e) => setFormData({ ...formData, year: Number(e.target.value) })}
                      required
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white text-sm outline-none focus:border-[#35D07F] transition-colors" 
                    />
                  </div>
                  <div>
                    <label className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1 block">License Plate</label>
                    <input 
                      type="text" 
                      placeholder="e.g. MH-02-CB-9921" 
                      value={formData.registration_number}
                      onChange={(e) => setFormData({ ...formData, registration_number: e.target.value })}
                      required
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white text-sm outline-none focus:border-[#35D07F] transition-colors uppercase" 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1 block">Color</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Silver Metallic" 
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white text-sm outline-none focus:border-[#35D07F] transition-colors" 
                    />
                  </div>
                  <div>
                    <label className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1 block">Odometer (KM)</label>
                    <input 
                      type="number" 
                      placeholder="e.g. 15000" 
                      value={formData.mileage}
                      onChange={(e) => setFormData({ ...formData, mileage: Number(e.target.value) })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white text-sm outline-none focus:border-[#35D07F] transition-colors" 
                    />
                  </div>
                </div>

                <div className="mb-6">
                  <label className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1 block">VIN (Vehicle Identification Number)</label>
                  <input 
                    type="text" 
                    placeholder="17-Digit VIN" 
                    value={formData.vin}
                    onChange={(e) => setFormData({ ...formData, vin: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white text-sm outline-none focus:border-[#35D07F] transition-colors uppercase" 
                  />
                </div>
                
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 bg-[#35D07F] text-black font-bold tracking-widest uppercase rounded-xl shadow-[0_0_15px_rgba(53,208,127,0.3)] hover:bg-[#2bb46c] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus size={18} />} 
                  {isSubmitting ? 'Registering...' : 'Save Vehicle to Garage'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
