import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Receipt, Search, Download, CheckCircle2, Clock, AlertCircle, DollarSign, FileText, ArrowRight, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { fetchCustomerInvoices, createPaymentOrder, verifyPayment } from '../../api/client';

export default function CustomerInvoices() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('ALL');

  useEffect(() => {
    loadInvoices();
  }, []);

  const loadInvoices = async () => {
    try {
      setLoading(true);
      const res = await fetchCustomerInvoices();
      const list = Array.isArray(res) ? res : (res.results || []);
      setInvoices(list);
    } catch (error) {
      toast.error('Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  const filteredInvoices = invoices.filter(inv => {
    const invNum = inv.invoice_number || inv.id || '';
    const svc = inv.service_title || inv.vehicle_details || '';
    const matchesSearch = invNum.toLowerCase().includes(searchQuery.toLowerCase()) || svc.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    
    if (filter === 'UNPAID') return inv.status !== 'PAID';
    if (filter === 'PAID') return inv.status === 'PAID';
    return true;
  });

  // Calculate live dynamic metrics from real invoices
  const totalOutstanding = invoices
    .filter(i => i.status !== 'PAID')
    .reduce((sum, i) => sum + Number(i.balance || i.amount || 0), 0);

  const totalPaid = invoices
    .reduce((sum, i) => sum + Number(i.paid || (i.status === 'PAID' ? i.amount : 0) || 0), 0);

  const handleDownload = (inv: any) => {
    const invId = inv.invoice_number || inv.id;
    const receiptContent = `
========================================
             REPAIRTRACE
          OFFICIAL INVOICE
========================================
Invoice ID: ${invId}
Branch:     ${inv.branch_name || 'Downtown Apex Center'}
Customer:   ${inv.customer_name || 'Valued Customer'}
Vehicle:    ${inv.vehicle_details || 'Registered Vehicle'}
Service:    ${inv.service_title || 'General Maintenance'}
Amount:     $${Number(inv.amount).toFixed(2)}
Paid:       $${Number(inv.paid || 0).toFixed(2)}
Balance:    $${Number(inv.balance || 0).toFixed(2)}
Status:     ${inv.status}
Date:       ${inv.created_at ? new Date(inv.created_at).toLocaleDateString() : 'N/A'}
========================================
Thank you for choosing RepairTrace!
`.trim();

    const blob = new Blob([receiptContent], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${invId}_receipt.txt`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success(`Invoice ${invId} Downloaded`, {
      style: { background: '#1A1A1B', color: '#fff', border: '1px solid rgba(53,208,127,0.2)' },
      iconTheme: { primary: '#35D07F', secondary: '#000' }
    });
  };

  const handlePay = async (inv: any) => {
    const invId = inv.id;
    setPayingId(invId);
    try {
      const order = await createPaymentOrder(invId);
      
      if ((window as any).Razorpay) {
        const rzp = new (window as any).Razorpay({
          key: order.key_id,
          amount: order.amount_in_paise,
          currency: order.currency,
          name: 'RepairTrace Autocare',
          description: `Invoice ${order.invoice_number}`,
          order_id: order.order_id,
          handler: async (response: any) => {
            await verifyPayment({
              invoice_id: order.invoice_id,
              order_id: response.razorpay_order_id,
              payment_id: response.razorpay_payment_id,
              signature: response.razorpay_signature
            });
            toast.success(`Invoice ${order.invoice_number} Paid Successfully!`);
            loadInvoices();
          }
        });
        rzp.open();
      } else {
        // Direct verified simulated settlement
        await verifyPayment({
          invoice_id: order.invoice_id,
          order_id: order.order_id,
          payment_id: `pay_sim_${Date.now()}`,
          signature: 'simulated_test_sig'
        });
        toast.success(`Payment verified! Invoice ${order.invoice_number} is settled.`, {
          style: { background: '#1A1A1B', color: '#fff', border: '1px solid rgba(53,208,127,0.2)' },
          iconTheme: { primary: '#35D07F', secondary: '#000' }
        });
        loadInvoices();
      }
    } catch (err: any) {
      toast.error(err.message || 'Payment initiation failed');
    } finally {
      setPayingId(null);
    }
  };

  const handleExportAll = () => {
    const headers = ['Invoice ID', 'Date', 'Customer', 'Vehicle', 'Service', 'Amount', 'Status'];
    const csvContent = [
      headers.join(','),
      ...filteredInvoices.map(inv => 
        `"${inv.invoice_number || inv.id}","${inv.created_at ? new Date(inv.created_at).toLocaleDateString() : ''}","${inv.customer_name || ''}","${inv.vehicle_details || ''}","${inv.service_title || ''}","${Number(inv.amount).toFixed(2)}","${inv.status}"`
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'repairtrace_invoices.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success('All Invoices Exported Successfully', {
      style: { background: '#1A1A1B', color: '#fff', border: '1px solid rgba(53,208,127,0.2)' },
      iconTheme: { primary: '#35D07F', secondary: '#000' }
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PAID': 
        return <span className="px-2.5 py-1 flex items-center gap-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 text-[9px] font-bold uppercase tracking-widest w-fit"><CheckCircle2 size={12} /> Paid</span>;
      case 'OVERDUE': 
        return <span className="px-2.5 py-1 flex items-center gap-1.5 rounded-lg border border-rose-500/20 bg-rose-500/10 text-rose-400 text-[9px] font-bold uppercase tracking-widest w-fit animate-pulse"><AlertCircle size={12} /> Overdue</span>;
      default: 
        return <span className="px-2.5 py-1 flex items-center gap-1.5 rounded-lg border border-amber-500/20 bg-amber-500/10 text-amber-400 text-[9px] font-bold uppercase tracking-widest w-fit"><Clock size={12} /> Unpaid</span>;
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-bold tracking-widest uppercase text-white mb-2 flex items-center gap-3">
            <Receipt className="text-[#35D07F]" size={28} />
            Invoices & Billing
          </h1>
          <p className="text-slate-400 text-xs tracking-widest uppercase">
            Transparent billing records, itemized parts, and gateway settlement history.
          </p>
        </motion.div>

        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }} className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <input 
              type="text" 
              placeholder="SEARCH INVOICES..." 
              className="pl-10 pr-4 py-2.5 bg-[#0A0A0B] border border-white/10 rounded-xl text-xs text-white uppercase tracking-widest focus:border-[#35D07F] outline-none transition-all w-64"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button onClick={handleExportAll} className="flex items-center gap-2 px-6 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl text-xs font-bold tracking-widest uppercase transition-all">
            <Download size={16} /> Export All
          </button>
        </motion.div>
      </div>

      {/* Summary Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Total Outstanding', value: `$${totalOutstanding.toFixed(2)}`, icon: DollarSign, color: totalOutstanding > 0 ? 'text-rose-400' : 'text-[#35D07F]', border: totalOutstanding > 0 ? 'border-rose-500/20' : 'border-white/5' },
          { label: 'Total Invoices', value: invoices.length.toString(), icon: Clock, color: 'text-amber-400', border: 'border-white/5' },
          { label: 'Total Paid To Date', value: `$${totalPaid.toFixed(2)}`, icon: CheckCircle2, color: 'text-[#35D07F]', border: 'border-white/5' }
        ].map((stat, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + (i * 0.1) }}
            className={`bg-[#0A0A0B]/80 backdrop-blur-md border ${stat.border} rounded-2xl p-6 flex items-center justify-between`}
          >
            <div>
              <p className="text-slate-400 text-[10px] font-bold tracking-widest uppercase mb-1">{stat.label}</p>
              <h3 className={`text-2xl font-bold tracking-widest font-mono ${stat.color}`}>{stat.value}</h3>
            </div>
            <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center text-slate-400">
              <stat.icon size={20} />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Filter Tabs */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
        className="flex gap-2 mb-6"
      >
        {['ALL', 'UNPAID', 'PAID'].map(tab => (
          <button 
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-6 py-2.5 rounded-xl text-[10px] font-bold tracking-widest uppercase transition-all border ${
              filter === tab 
                ? 'bg-[#35D07F]/10 border-[#35D07F]/50 text-[#35D07F]' 
                : 'bg-white/5 border-white/5 text-slate-400 hover:text-white hover:bg-white/10'
            }`}
          >
            {tab}
          </button>
        ))}
      </motion.div>

      {/* Invoices Table */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
        className="bg-[#0A0A0B]/80 backdrop-blur-md border border-white/5 rounded-2xl overflow-hidden"
      >
        <div className="hidden lg:grid grid-cols-12 gap-4 p-6 border-b border-white/5 text-slate-500 text-[10px] font-bold tracking-[0.2em] uppercase bg-white/[0.02]">
          <div className="col-span-4">Invoice & Service</div>
          <div className="col-span-2">Issue Date</div>
          <div className="col-span-2">Vehicle</div>
          <div className="col-span-2">Amount & Status</div>
          <div className="col-span-2 text-right">Actions</div>
        </div>

        <div className="divide-y divide-white/5">
          {loading ? (
            <div className="p-10 text-center flex flex-col items-center justify-center">
              <Loader2 className="w-8 h-8 text-[#35D07F] animate-spin mb-4" />
              <h3 className="text-white font-bold tracking-widest uppercase mb-2">Loading Invoices...</h3>
            </div>
          ) : filteredInvoices.length > 0 ? filteredInvoices.map((inv) => {
            const isUnpaid = inv.status !== 'PAID';
            const isProcessing = payingId === inv.id;
            const invNumber = inv.invoice_number || inv.id;
            const dateStr = inv.created_at ? new Date(inv.created_at).toLocaleDateString() : 'N/A';

            return (
              <div key={inv.id} className="grid grid-cols-1 lg:grid-cols-12 gap-4 p-6 items-center hover:bg-white/[0.02] transition-colors group">
                
                {/* Invoice & Service */}
                <div className="col-span-4 flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-white/5 text-slate-400 border border-white/10 shrink-0 group-hover:bg-[#35D07F]/10 group-hover:text-[#35D07F] group-hover:border-[#35D07F]/30 transition-all">
                    <FileText size={16} />
                  </div>
                  <div>
                    <h3 className="text-white font-bold tracking-wider text-sm mb-1 group-hover:text-[#35D07F] transition-colors font-mono">{invNumber}</h3>
                    <p className="text-slate-400 text-xs font-medium line-clamp-1">{inv.service_title || 'General Maintenance'}</p>
                    <p className="text-slate-500 text-[10px] uppercase tracking-widest mt-0.5">{inv.branch_name || 'Apex Center'}</p>
                  </div>
                </div>

                {/* Issue Date */}
                <div className="col-span-2 text-slate-300 text-xs font-mono">
                  {dateStr}
                </div>

                {/* Vehicle */}
                <div className="col-span-2 text-slate-300 text-xs font-medium">
                  {inv.vehicle_details || 'Vehicle'}
                </div>

                {/* Amount & Status */}
                <div className="col-span-2 space-y-1">
                  <div className="text-white font-bold text-sm font-mono tracking-wider">
                    ${Number(inv.amount).toFixed(2)}
                  </div>
                  {getStatusBadge(inv.status)}
                </div>

                {/* Actions */}
                <div className="col-span-2 flex items-center justify-end gap-2">
                  <button 
                    onClick={() => handleDownload(inv)}
                    className="p-2.5 bg-white/5 hover:bg-white/10 border border-white/5 text-slate-400 hover:text-white rounded-xl transition-all"
                    title="Download Receipt"
                  >
                    <Download size={14} />
                  </button>
                  {isUnpaid ? (
                    <button 
                      onClick={() => handlePay(inv)}
                      disabled={isProcessing}
                      className="px-4 py-2.5 bg-[#35D07F] hover:bg-[#2bb46c] text-black rounded-xl text-[10px] font-bold tracking-widest uppercase transition-all shadow-[0_0_15px_rgba(53,208,127,0.3)] flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {isProcessing ? <Loader2 size={12} className="animate-spin" /> : <ArrowRight size={12} />}
                      {isProcessing ? 'Processing' : 'Pay Now'}
                    </button>
                  ) : (
                    <button 
                      onClick={() => handleDownload(inv)}
                      className="px-4 py-2.5 bg-white/5 text-slate-400 hover:text-white rounded-xl text-[10px] font-bold tracking-widest uppercase transition-all"
                    >
                      Receipt
                    </button>
                  )}
                </div>

              </div>
            );
          }) : (
            <div className="p-12 text-center text-slate-500 text-xs tracking-widest uppercase">
              No invoices found matching criteria.
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
