import React, { useState, useEffect, useContext, useCallback } from 'react';
import { AuthContext } from '../context/AuthContext';
import { fetchUpcomingReminders } from '../services/api';
import { Bell, X, Clock, MapPin, Calendar, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const POLL_INTERVAL = 60000; // Check every 60 seconds

export default function EventReminders() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [reminders, setReminders] = useState([]);
  const [dismissed, setDismissed] = useState(new Set());
  const [expanded, setExpanded] = useState(false);

  const checkReminders = useCallback(async () => {
    if (!user) return;
    try {
      const data = await fetchUpcomingReminders();
      setReminders(data);

      // Browser notification for new reminders
      if (data.length > 0 && 'Notification' in window && Notification.permission === 'granted') {
        data.forEach(r => {
          const key = `${r.eventId}-${r.minutesUntilEvent}`;
          if (!dismissed.has(key)) {
            // Only fire notification at specific intervals to avoid spam
            if (r.minutesUntilEvent <= 5 || r.minutesUntilEvent === 15 || r.minutesUntilEvent === 30 || r.minutesUntilEvent === 60) {
              new Notification(`🔔 Event Reminder: ${r.title}`, {
                body: `Starts in ${r.minutesUntilEvent} minutes! 📍 ${r.address}`,
                icon: '🗓️',
                tag: r.eventId // Prevents duplicate notifications
              });
            }
          }
        });
      }
    } catch (err) {
      // Silent fail — reminders are non-critical
    }
  }, [user, dismissed]);

  useEffect(() => {
    if (!user) return;
    
    // Request browser notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    checkReminders();
    const interval = setInterval(checkReminders, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [user, checkReminders]);

  const handleDismiss = (eventId) => {
    setDismissed(prev => new Set([...prev, eventId]));
  };

  const activeReminders = reminders.filter(r => !dismissed.has(r.eventId));

  if (!user || activeReminders.length === 0) return null;

  const getCategoryIcon = (cat) => {
    const icons = { CLEANLINESS: '🧹', PLANTATION: '🌳', MEETING: '🤝', RECYCLING: '♻️', AWARENESS: '📢', OTHER: '⭐' };
    return icons[cat] || '📅';
  };

  const getUrgencyColor = (mins) => {
    if (mins <= 10) return 'glass-red';
    if (mins <= 30) return 'glass-amber';
    return 'glass-green';
  };

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end gap-3">
      {/* Expanded reminder cards */}
      {expanded && (
        <div className="flex flex-col gap-2 mb-1 animate-in" style={{ animation: 'slideUp 0.3s ease-out' }}>
          {activeReminders.map(reminder => (
            <div
              key={reminder.eventId}
              className={`${getUrgencyColor(reminder.minutesUntilEvent)} rounded-2xl p-4 shadow-2xl w-80 transition-all hover:scale-[1.02]`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{getCategoryIcon(reminder.category)}</span>
                  <div>
                    <p className="text-sm font-extrabold text-white leading-tight">{reminder.title}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <Clock size={10} className="text-white/80" />
                      <span className="text-[11px] font-bold text-white/90">
                        {reminder.minutesUntilEvent <= 0
                          ? 'Starting now!'
                          : reminder.minutesUntilEvent < 60
                          ? `In ${reminder.minutesUntilEvent} min`
                          : `In ${Math.floor(reminder.minutesUntilEvent / 60)}h ${reminder.minutesUntilEvent % 60}m`
                        }
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleDismiss(reminder.eventId)}
                  className="text-white/60 hover:text-white transition-colors p-0.5 cursor-pointer"
                >
                  <X size={14} />
                </button>
              </div>

              <div className="flex items-center gap-1.5 mt-2.5 text-[10px] text-white/75">
                <MapPin size={10} />
                <span className="truncate">{reminder.address}</span>
              </div>

              <button
                onClick={() => { navigate('/events'); setExpanded(false); }}
                className="mt-3 w-full bg-white/10 hover:bg-white/20 backdrop-blur text-white text-[11px] font-bold py-1.5 px-3 rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer border border-white/5"
              >
                View Event <ChevronRight size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Floating bell button */}
      <button
        onClick={() => setExpanded(v => !v)}
        className={`relative w-14 h-14 rounded-2xl shadow-2xl flex items-center justify-center transition-all hover:scale-110 ${
          activeReminders.some(r => r.minutesUntilEvent <= 10)
            ? 'bg-gradient-to-br from-red-500 to-rose-600 shadow-red-500/40'
            : 'bg-gradient-to-br from-green-500 to-emerald-600 shadow-green-500/40'
        }`}
        style={{
          animation: activeReminders.some(r => r.minutesUntilEvent <= 10) ? 'bellShake 0.5s ease-in-out infinite' : 'none'
        }}
      >
        <Bell size={22} className="text-white" />
        
        {/* Badge count */}
        <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-white text-black text-[10px] font-black rounded-full flex items-center justify-center shadow-lg">
          {activeReminders.length}
        </span>
        
        {/* Pulse ring for urgent */}
        {activeReminders.some(r => r.minutesUntilEvent <= 10) && (
          <span className="absolute inset-0 rounded-2xl border-2 border-red-400 animate-ping opacity-40" />
        )}
      </button>

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes bellShake {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(8deg); }
          75% { transform: rotate(-8deg); }
        }
      `}</style>
    </div>
  );
}
