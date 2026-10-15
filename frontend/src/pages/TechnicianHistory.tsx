import  { useState } from 'react';
// import { motion } from 'framer-motion';?
import { Search, Calendar, ChevronRight, Clock, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { technicianApi } from '../api/technician';

export default function TechnicianHistory() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('ALL');

  const { data: workOrders = [], isLoading } = useQuery({
    queryKey: ['technicianWorkOrdersHistory'],
    queryFn: technicianApi.getWorkOrders
  });

  const formattedHistory = workOrders.map((o: any) => ({
    id: o.id,
    order_number: o.order_number,
    date: o.date_created ? new Date(o.date_created).toISOString().split('T')[0] : 'Today',
    vehicle: {
      make: o.vehicle?.make || 'Vehicle',
      model: o.vehicle?.model || '',
      reg: o.vehicle?.registration_number || 'N/A'
    },
    type: o.type || 'Repair',
    status: o.status || 'COMPLETED',
    time_spent: '3.5 hrs',
    progress: o.progress || 0
  }));

  const filteredHistory = formattedHistory.filter(h => {
    const matchesSearch = h.order_number.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          h.vehicle.reg.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          h.vehicle.make.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filter === 'ALL' || h.type.toUpperCase() === filter.toUpperCase();
    return matchesSearch && matchesFilter;
  });

  const completedCount = formattedHistory.filter(h => h.status === 'COMPLETED').length;
  const inProgressCount = formattedHistory.filter(h => h.status !== 'COMPLETED').length;

  return (
    <div className="space-y-6 pb-24 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#111112] border border-white/5 p-6 rounded-2xl">
        <div>
          <h1 className="text-2xl font-light text-white">My Service History</h1>
          <p className="text-sm text-slate-500 mt-1">View your past completed work orders and performance.</p>
        </div>
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input 
              type="text" 
              placeholder="Search history..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-black/50 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-white focus:outline-none focus:border-[#35D07F] transition-colors text-sm"
            />
          </div>
          <select 
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="bg-black/50 border border-white/10 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-[#35D07F] appearance-none cursor-pointer"
          >
            <option value="ALL">All Types</option>
            <option value="MAINTENANCE">Maintenance</option>
            <option value="REPAIR">Repair</option>
            <option value="INSPECTION">Inspection</option>
          </select>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-[#111112] border border-white/5 rounded-2xl p-6">
          <div className="text-slate-500 text-[10px] font-bold tracking-widest uppercase mb-2">Total Service Jobs</div>
          <div className="text-3xl font-light text-white">{isLoading ? '-' : formattedHistory.length}</div>
        </div>
        <div className="bg-[#111112] border border-white/5 rounded-2xl p-6">
          <div className="text-slate-500 text-[10px] font-bold tracking-widest uppercase mb-2">Completed Work Orders</div>
          <div className="text-3xl font-light text-[#35D07F]">{isLoading ? '-' : completedCount}</div>
        </div>
        <div className="bg-[#111112] border border-white/5 rounded-2xl p-6">
          <div className="text-slate-500 text-[10px] font-bold tracking-widest uppercase mb-2">Active In-Shop</div>
          <div className="text-3xl font-light text-amber-400">{isLoading ? '-' : inProgressCount}</div>
        </div>
        <div className="bg-[#111112] border border-white/5 rounded-2xl p-6">
          <div className="text-slate-500 text-[10px] font-bold tracking-widest uppercase mb-2">Quality Pass Rate</div>
          <div className="text-3xl font-light text-white">99.2%</div>
        </div>
      </div>

      {/* History Table */}
      <div className="bg-[#111112] border border-white/5 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 bg-black/20">
                <th className="p-4 text-[10px] font-bold tracking-widest uppercase text-slate-500">Order ID</th>
                <th className="p-4 text-[10px] font-bold tracking-widest uppercase text-slate-500">Date</th>
                <th className="p-4 text-[10px] font-bold tracking-widest uppercase text-slate-500">Vehicle</th>
                <th className="p-4 text-[10px] font-bold tracking-widest uppercase text-slate-500">Type</th>
                <th className="p-4 text-[10px] font-bold tracking-widest uppercase text-slate-500">Time Spent</th>
                <th className="p-4 text-[10px] font-bold tracking-widest uppercase text-slate-500 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredHistory.map((job) => (
                <tr key={job.id} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                  <td className="p-4">
                    <span className="text-sm font-mono text-white">{job.order_number}</span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2 text-sm text-slate-400">
                      <Calendar size={14} /> {job.date}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="text-sm text-white">{job.vehicle.make} {job.vehicle.model}</div>
                    <div className="text-xs text-slate-500">{job.vehicle.reg}</div>
                  </td>
                  <td className="p-4">
                    <span className="px-2 py-1 rounded bg-white/5 text-xs text-slate-300">{job.type}</span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2 text-sm text-slate-400">
                      <Clock size={14} /> {job.time_spent}
                    </div>
                  </td>
                  <td className="p-4 text-right">
                    <Link 
                      to={`/technician/vehicle/${job.id}`}
                      className="inline-flex items-center gap-1 text-[#35D07F] hover:text-white transition-colors text-xs font-bold tracking-widest uppercase opacity-0 group-hover:opacity-100"
                    >
                      View Report <ChevronRight size={14} />
                    </Link>
                  </td>
                </tr>
              ))}
              
              {filteredHistory.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-12 text-center">
                    <FileText size={32} className="mx-auto text-slate-600 mb-2" />
                    <p className="text-slate-500 text-sm">No history records found.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

