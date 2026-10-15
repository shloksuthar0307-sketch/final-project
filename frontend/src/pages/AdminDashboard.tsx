import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Car, Wrench, AlertCircle, Calendar, 
  CheckSquare, FileText, Receipt, DollarSign,
  TrendingUp, ArrowRight, MoreHorizontal, Loader2, RefreshCw
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { fetchAdminDashboardKPIs } from '../api/client';

export default function AdminDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadMetrics = async () => {
    try {
      setLoading(true);
      const res = await fetchAdminDashboardKPIs();
      setData(res);
    } catch (err) {
      console.error('Failed to load admin KPIs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMetrics();
  }, []);

  const kpis = data?.kpis || {};
  const pipeline = data?.pipeline || [];

  const primaryCards = [
    { title: 'Total Vehicles', value: kpis.total_vehicles ?? 0, trend: '+12%', isUp: true, icon: Car, color: 'text-blue-400', bg: 'bg-blue-400/10' },
    { title: 'Active Services', value: kpis.active_services ?? 0, trend: 'In Progress', isUp: true, icon: Wrench, color: 'text-[#35D07F]', bg: 'bg-[#35D07F]/10' },
    { title: 'Pending Approvals', value: kpis.pending_approvals ?? 0, trend: 'Awaiting Client', isUp: false, icon: CheckSquare, color: 'text-amber-400', bg: 'bg-amber-400/10' },
    { title: "Today's Bookings", value: kpis.todays_bookings ?? 0, trend: 'Scheduled', isUp: true, icon: Calendar, color: 'text-purple-400', bg: 'bg-purple-400/10' },
  ];

  const secondaryCards = [
    { title: 'Active Inspections', value: kpis.active_inspections ?? 0, icon: FileText, color: 'text-indigo-400' },
    { title: 'Open Repair Issues', value: kpis.open_repair_issues ?? 0, icon: AlertCircle, color: 'text-rose-400' },
    { title: 'Pending Invoices', value: `$${Number(kpis.pending_invoices || 0).toLocaleString()}`, icon: Receipt, color: 'text-orange-400' },
    { title: 'Monthly Revenue', value: `$${Number(kpis.monthly_revenue || 0).toLocaleString()}`, icon: DollarSign, color: 'text-emerald-400' },
  ];

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-light text-white tracking-tight">Operations Overview</h1>
          <p className="text-sm text-slate-500 mt-1">Real-time multi-tenant telemetry and workshop execution metrics.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={loadMetrics}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-lg text-xs font-mono transition-colors"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> REFRESH
          </button>
          <span className="text-xs font-mono text-slate-500">LIVE DB SYNC</span>
        </div>
      </div>

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center">
          <Loader2 className="w-10 h-10 text-[#35D07F] animate-spin mb-4" />
          <p className="text-slate-400 text-xs font-bold tracking-widest uppercase">Aggregating Global Operations Data...</p>
        </div>
      ) : (
        <>
          {/* Primary KPI Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {primaryCards.map((kpi, idx) => {
              const Icon = kpi.icon;
              return (
                <motion.div 
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: idx * 0.1 }}
                  className="bg-[#111112] border border-white/5 rounded-2xl p-6 relative overflow-hidden group hover:border-white/10 transition-colors"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className={'w-12 h-12 rounded-xl flex items-center justify-center ' + kpi.bg}>
                      <Icon size={24} className={kpi.color} />
                    </div>
                    <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                      <TrendingUp size={12} />
                      {kpi.trend}
                    </div>
                  </div>
                  <h3 className="text-4xl font-light text-white mb-1 font-mono">{kpi.value}</h3>
                  <p className="text-xs font-sans tracking-wider text-slate-500 uppercase">{kpi.title}</p>
                </motion.div>
              );
            })}
          </div>

          {/* Secondary Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {secondaryCards.map((kpi, idx) => {
              const Icon = kpi.icon;
              return (
                <div key={idx} className="bg-[#111112]/50 border border-white/5 rounded-xl p-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-black/50 border border-white/5 flex items-center justify-center">
                    <Icon size={18} className={kpi.color} />
                  </div>
                  <div>
                    <p className="text-xl font-light text-white font-mono">{kpi.value}</p>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider">{kpi.title}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Live Repair Status Kanban */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-light text-white">Live Repair Status</h2>
              <Link to="/admin/repairs" className="text-sm text-[#35D07F] hover:text-[#2EB86F] flex items-center gap-1 transition-colors">
                View All Repairs <ArrowRight size={16} />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
              {pipeline.map((column: any, idx: number) => (
                <div key={idx} className="bg-[#111112] border border-white/5 rounded-2xl p-4 flex flex-col h-[500px]">
                  
                  {/* Column Header */}
                  <div className="flex items-center justify-between mb-4 px-2">
                    <div className="flex items-center gap-2">
                      <span className={'w-2 h-2 rounded-full ' + (column.color || 'bg-slate-400')}></span>
                      <h3 className="text-sm font-medium text-slate-300">{column.stage}</h3>
                    </div>
                    <span className="text-xs font-mono bg-white/5 px-2 py-1 rounded text-slate-400">{column.count}</span>
                  </div>

                  {/* Cards Container */}
                  <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-1">
                    {column.jobs && column.jobs.length > 0 ? column.jobs.map((job: any, jIdx: number) => (
                      <motion.div 
                        key={jIdx}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: idx * 0.1 + jIdx * 0.1 }}
                        className="bg-black/40 border border-white/5 rounded-xl p-4 hover:border-white/20 transition-colors cursor-pointer group"
                      >
                        <div className="flex justify-between items-start mb-3">
                          <span className="text-xs font-mono text-[#35D07F] font-bold">{job.id}</span>
                          <button className="text-slate-600 hover:text-white transition-colors">
                            <MoreHorizontal size={16} />
                          </button>
                        </div>
                        
                        <h4 className="text-white font-medium text-sm mb-1">{job.vehicle}</h4>
                        <p className="text-xs text-slate-500 mb-4">{job.customer}</p>
                        
                        <div className="flex items-center justify-between text-[10px] uppercase tracking-wider mb-2">
                          <span className="text-slate-400">
                            {job.priority || 'Normal'} Priority
                          </span>
                          <span className="text-slate-400">{job.progress}%</span>
                        </div>
                        
                        {/* Progress bar */}
                        {job.progress > 0 && (
                          <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                            <div 
                              className={'h-full rounded-full ' + (column.color || 'bg-[#35D07F]')}
                              style={{ width: `${job.progress}%` }}
                            ></div>
                          </div>
                        )}
                      </motion.div>
                    )) : (
                      <div className="h-full flex items-center justify-center border-2 border-dashed border-white/5 rounded-xl">
                        <span className="text-xs text-slate-600 uppercase tracking-widest">No Active Jobs</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
