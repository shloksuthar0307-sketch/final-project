import { useState, useEffect } from 'react';
import { Car, ShieldAlert, ShieldCheck, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { fetchVehicles } from '../../../api/client';

export default function VehicleSummary({ loading: parentLoading }: { loading: boolean }) {
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadVehicles();
  }, []);

  const loadVehicles = async () => {
    try {
      setLoading(true);
      const data = await fetchVehicles();
      setVehicles(Array.isArray(data) ? data : (data.results || []));
    } catch (err) {
      console.error('Failed to load vehicles in summary:', err);
    } finally {
      setLoading(false);
    }
  };

  if (parentLoading || loading) {
    return <div className="h-[200px] bg-[#0A0A0B]/80 rounded-2xl border border-white/5 animate-pulse"></div>;
  }

  return (
    <div className="bg-[#0A0A0B]/80 backdrop-blur-md border border-white/5 rounded-2xl p-6 relative overflow-hidden">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xs font-bold tracking-[0.2em] uppercase text-white">Vehicle Service Summary</h2>
        <button 
          onClick={() => navigate('/customer/vehicles')} 
          className="text-[#35D07F] text-[10px] font-bold tracking-widest uppercase hover:underline"
        >
          View All ({vehicles.length})
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {vehicles.slice(0, 2).map((vehicle) => {
          const isGood = (vehicle.health_score ?? 85) >= 80;
          const plate = vehicle.registration_number || vehicle.plate || 'No Plate';
          const mileageStr = vehicle.mileage ? `${Number(vehicle.mileage).toLocaleString()} km` : '18,400 km';

          return (
            <div key={vehicle.id} className="bg-[#111112] border border-white/5 hover:border-[#35D07F]/30 rounded-xl p-5 transition-all group">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center text-white border border-white/10 group-hover:bg-[#35D07F]/10 group-hover:border-[#35D07F]/30 group-hover:text-[#35D07F] transition-all">
                    <Car size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold tracking-widest text-white">{vehicle.year} {vehicle.make} {vehicle.model}</h3>
                    <p className="text-slate-400 text-[10px] font-bold tracking-[0.15em] uppercase">Plate: {plate} • {mileageStr}</p>
                  </div>
                </div>
                <div className={`px-2 py-1 border rounded text-[9px] font-bold uppercase tracking-widest flex items-center gap-1 ${
                  isGood ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                }`}>
                  {isGood ? <ShieldCheck size={12} /> : <ShieldAlert size={12} />}
                  {vehicle.health_status || (isGood ? 'Good' : 'Attention Required')}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 py-4 border-y border-white/5 mb-4">
                <div>
                  <p className="text-slate-500 text-[9px] font-bold uppercase tracking-widest mb-1">Health Telemetry</p>
                  <p className="text-[#35D07F] text-sm font-bold tracking-widest font-mono">{vehicle.health_score || 88} / 100</p>
                </div>
                <div>
                  <p className="text-slate-500 text-[9px] font-bold uppercase tracking-widest mb-1">Powertrain Specs</p>
                  <p className="text-white text-sm font-bold tracking-widest uppercase">{vehicle.fuel_type || 'Petrol'}</p>
                </div>
              </div>

              <div className="flex gap-2">
                <button 
                  onClick={() => navigate(`/customer/vehicles/${vehicle.id}`)} 
                  className="flex-1 py-2 bg-white/5 hover:bg-white/10 hover:text-white text-slate-300 rounded-lg text-[10px] font-bold tracking-widest uppercase transition-all"
                >
                  View Details
                </button>
                <button 
                  onClick={() => navigate('/customer/book-service')} 
                  className="flex-1 py-2 bg-[#35D07F] hover:bg-[#2bb46c] text-black rounded-lg text-[10px] font-bold tracking-widest uppercase transition-all shadow-[0_0_10px_rgba(53,208,127,0.3)]"
                >
                  Book Service
                </button>
              </div>
            </div>
          );
        })}

        {vehicles.length === 0 && (
          <div className="col-span-full py-12 text-center text-slate-500 text-xs tracking-widest uppercase">
            No registered vehicles in your garage yet.
          </div>
        )}
      </div>
    </div>
  );
}
