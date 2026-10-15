import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Check, FileText, Wrench, Camera, CheckCircle2, ChevronRight, CheckSquare, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { fetchCustomerNotifications, markAllNotificationsRead } from '../../api/client';

export default function CustomerNotifications() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const data = await fetchCustomerNotifications();
      const list = Array.isArray(data) ? data : (data.results || []);
      setNotifications(list);
    } catch (err: any) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      setNotifications(notifications.map(n => ({ ...n, is_read: true })));
      toast.success('All notifications marked as read', {
        style: { background: '#1A1A1B', color: '#fff', border: '1px solid rgba(53,208,127,0.2)' },
        iconTheme: { primary: '#35D07F', secondary: '#000' }
      });
    } catch {
      toast.error('Failed to mark all read');
    }
  };

  const handleNotificationClick = (notif: any) => {
    if (notif.action_url) {
      navigate(notif.action_url);
    } else {
      navigate('/customer/dashboard');
    }
  };

  const getIconForType = (type: string) => {
    switch ((type || '').toUpperCase()) {
      case 'ESTIMATE':
        return { icon: FileText, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' };
      case 'INSPECTION':
      case 'EVIDENCE':
        return { icon: Camera, color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' };
      case 'REPAIR':
        return { icon: Wrench, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' };
      default:
        return { icon: CheckCircle2, color: 'text-[#35D07F]', bg: 'bg-[#35D07F]/10', border: 'border-[#35D07F]/20' };
    }
  };

  return (
    <div className="max-w-[1000px] mx-auto pb-10 min-h-[calc(100vh-140px)] flex flex-col">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8 shrink-0">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-bold tracking-widest uppercase text-white mb-2 flex items-center gap-3">
            <Bell className="text-[#35D07F]" size={28} />
            Notifications
            {unreadCount > 0 && (
              <span className="bg-[#35D07F] text-black text-sm px-3 py-1 rounded-full ml-2 font-bold">
                {unreadCount}
              </span>
            )}
          </h1>
          <p className="text-slate-400 text-xs tracking-widest uppercase">
            Stay updated on your vehicle's repair progress and approvals.
          </p>
        </motion.div>
        
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}>
          <button 
            onClick={handleMarkAllRead}
            disabled={unreadCount === 0}
            className="flex items-center gap-2 px-6 py-2.5 bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed text-white border border-white/10 rounded-xl text-xs font-bold tracking-widest uppercase transition-all"
          >
            <CheckSquare size={16} /> Mark All Read
          </button>
        </motion.div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-[#35D07F] animate-spin" />
        </div>
      ) : (
        /* Notifications List */
        <div className="flex-1 space-y-4">
          <AnimatePresence>
            {notifications.map((notif, index) => {
              const meta = getIconForType(notif.notification_type);
              const Icon = meta.icon;
              const isUnread = !notif.is_read;
              const timeString = notif.created_at ? new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Today';

              return (
                <motion.div 
                  key={notif.id}
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}
                  onClick={() => handleNotificationClick(notif)}
                  className={`group relative bg-[#0A0A0B]/80 backdrop-blur-md border rounded-2xl p-5 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer transition-all overflow-hidden ${
                    isUnread 
                      ? 'border-[#35D07F]/30 hover:border-[#35D07F]/60 hover:bg-[#35D07F]/5' 
                      : 'border-white/5 hover:border-white/20 hover:bg-white/[0.02]'
                  }`}
                >
                  {/* Unread indicator line */}
                  {isUnread && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#35D07F] shadow-[0_0_10px_rgba(53,208,127,0.5)]"></div>
                  )}

                  <div className="flex items-start md:items-center gap-5">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border ${meta.bg} ${meta.color} ${meta.border}`}>
                      <Icon size={20} />
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className={`text-base font-bold tracking-widest ${isUnread ? 'text-white' : 'text-slate-300'}`}>
                          {notif.title}
                        </h3>
                        {isUnread && (
                          <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest bg-[#35D07F]/20 text-[#35D07F] border border-[#35D07F]/30">
                            New
                          </span>
                        )}
                      </div>
                      <p className={`text-sm tracking-wide ${isUnread ? 'text-slate-300' : 'text-slate-500'}`}>
                        {notif.message}
                      </p>
                      <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-2 block md:hidden">
                        {timeString}
                      </p>
                    </div>
                  </div>

                  <div className="hidden md:flex items-center justify-end gap-6 shrink-0 min-w-[150px]">
                    <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">{timeString}</p>
                    <div className="w-8 h-8 rounded-full bg-white/5 group-hover:bg-[#35D07F] text-slate-400 group-hover:text-black flex items-center justify-center transition-all">
                      <ChevronRight size={16} />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {notifications.length === 0 && (
            <div className="py-20 text-center flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-slate-500 mb-4">
                <Check size={24} />
              </div>
              <h3 className="text-white font-bold tracking-widest uppercase mb-2">You're all caught up!</h3>
              <p className="text-slate-500 text-xs tracking-widest uppercase">No notifications at this time.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
