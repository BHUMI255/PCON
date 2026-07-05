import React, { useState, useEffect } from 'react';
import { fetchAdvancedAnalytics } from '../services/api';
import { 
  Activity, Clock, Heart, Users, ShieldAlert,
  Building2, MapPin, CheckCircle, TrendingUp, Star
} from 'lucide-react';
import Navbar from '../components/layout/Navbar';

export default function AnalyticsDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadData = async () => {
      try {
        const res = await fetchAdvancedAnalytics();
        setData(res);
        setError('');
      } catch (err) {
        console.error('Failed to load analytics:', err);
        setError('Failed to fetch analytics data.');
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
    const interval = setInterval(loadData, 15000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-[#080c14] flex flex-col">
        <Navbar />
        <div className="flex-grow flex flex-col items-center justify-center">
          <Activity className="animate-pulse text-green-400 mb-4" size={48} />
          <p className="text-gray-400 font-bold tracking-widest text-xs uppercase">Crunching Live Analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#080c14] flex flex-col">
        <Navbar />
        <div className="flex-grow flex items-center justify-center">
          <p className="text-red-400 font-bold bg-red-500/10 border border-red-500/20 px-6 py-4 rounded-xl">{error}</p>
        </div>
      </div>
    );
  }

  const { cityHealth, departmentPerformance, wardRanking } = data;

  return (
    <div className="min-h-screen bg-[#080c14] text-white">
      <Navbar />

      <main className="max-w-7xl mx-auto px-6 py-12 space-y-12">
        {/* Header */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-[10px] font-bold uppercase tracking-widest mb-2">
            <Activity size={12} className="animate-pulse" /> Live Data Stream Active
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight">Advanced Analytics</h1>
          <p className="text-gray-400 text-sm max-w-2xl">
            Real-time performance metrics tracking city health, departmental efficiency, and neighborhood activity.
          </p>
        </div>

        {/* 1. City Health Index */}
        <section className="space-y-6">
          <h2 className="text-xl font-black text-white flex items-center gap-2 border-b border-white/10 pb-3">
            <Heart className="text-pink-400" size={24} /> City Health Index
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="glass-card p-6 rounded-2xl flex flex-col justify-between border border-white/5 bg-white/5 hover:bg-white/10 transition-colors">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-red-500/10 rounded-xl text-red-400">
                  <ShieldAlert size={20} />
                </div>
              </div>
              <div>
                <p className="text-3xl font-black text-white mb-1">{cityHealth.pendingComplaints}</p>
                <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">Pending Complaints</p>
              </div>
            </div>

            <div className="glass-card p-6 rounded-2xl flex flex-col justify-between border border-white/5 bg-white/5 hover:bg-white/10 transition-colors">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-cyan-500/10 rounded-xl text-cyan-400">
                  <Clock size={20} />
                </div>
              </div>
              <div>
                <p className="text-3xl font-black text-white mb-1">{cityHealth.avgResolutionSpeedHours} <span className="text-sm font-semibold text-gray-500">hrs</span></p>
                <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">Avg Resolution Speed</p>
              </div>
            </div>

            <div className="glass-card p-6 rounded-2xl flex flex-col justify-between border border-white/5 bg-white/5 hover:bg-white/10 transition-colors">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-yellow-500/10 rounded-xl text-yellow-400">
                  <Star size={20} />
                </div>
              </div>
              <div>
                <p className="text-3xl font-black text-white mb-1">{cityHealth.citizenSatisfaction}</p>
                <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">Citizen Satisfaction (Upvotes)</p>
              </div>
            </div>

            <div className="glass-card p-6 rounded-2xl flex flex-col justify-between border border-white/5 bg-white/5 hover:bg-white/10 transition-colors">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-purple-500/10 rounded-xl text-purple-400">
                  <Users size={20} />
                </div>
              </div>
              <div>
                <p className="text-3xl font-black text-white mb-1">{cityHealth.communityParticipation}</p>
                <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">Community Engagements</p>
              </div>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          
          {/* 2. Department Performance Dashboard */}
          <section className="space-y-6">
            <h2 className="text-xl font-black text-white flex items-center gap-2 border-b border-white/10 pb-3">
              <Building2 className="text-blue-400" size={24} /> Department Performance
            </h2>
            
            <div className="bg-[#111827] border border-gray-800 rounded-2xl overflow-hidden shadow-2xl">
              {departmentPerformance.length === 0 ? (
                <div className="p-12 text-center text-gray-500 text-sm">No official assignments found.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-[#1a2235] text-[10px] uppercase tracking-widest text-gray-400 border-b border-gray-800">
                      <tr>
                        <th className="px-6 py-4 font-bold">Official / Dept</th>
                        <th className="px-6 py-4 font-bold">Resolution Rate</th>
                        <th className="px-6 py-4 font-bold">Avg Time</th>
                        <th className="px-6 py-4 font-bold">Backlog</th>
                        <th className="px-6 py-4 font-bold text-center">Approval</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                      {departmentPerformance.map((dept, idx) => (
                        <tr key={idx} className="hover:bg-white/5 transition-colors">
                          <td className="px-6 py-4 font-bold text-white flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-blue-500" />
                            {dept.name}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <span className="text-white font-bold">{dept.resolutionRate}%</span>
                              <div className="w-16 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                                <div className="h-full bg-green-500" style={{ width: `${dept.resolutionRate}%` }} />
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-gray-300">{dept.avgCompletionTimeHours}h</td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 rounded text-[10px] font-bold ${dept.backlog > 10 ? 'bg-red-500/10 text-red-400' : 'bg-gray-800 text-gray-300'}`}>
                              {dept.backlog} pending
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="text-yellow-400 font-bold flex items-center justify-center gap-1">
                              <Star size={12} fill="currentColor" /> {dept.citizenRatings}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>

          {/* 3. Ward Rankings */}
          <section className="space-y-6">
            <h2 className="text-xl font-black text-white flex items-center gap-2 border-b border-white/10 pb-3">
              <MapPin className="text-green-400" size={24} /> Ward & Locality Rankings
            </h2>
            
            <div className="space-y-4">
              {wardRanking.length === 0 ? (
                <div className="bg-[#111827] border border-gray-800 rounded-2xl p-12 text-center text-gray-500 text-sm shadow-2xl">
                  No location data available yet.
                </div>
              ) : (
                wardRanking.map((ward, idx) => (
                  <div key={idx} className="bg-[#111827] border border-gray-800 hover:border-green-500/30 rounded-2xl p-5 flex items-center justify-between shadow-xl transition-all">
                    
                    <div className="flex items-center gap-5">
                      <div className="w-10 h-10 rounded-xl bg-[#1a2235] border border-gray-700 flex items-center justify-center text-white font-black text-lg">
                        #{idx + 1}
                      </div>
                      <div>
                        <h3 className="text-white font-black text-base">{ward.name}</h3>
                        <p className="text-[11px] text-gray-500 font-bold uppercase tracking-wider flex items-center gap-1.5 mt-1">
                          <CheckCircle size={10} className="text-green-500" /> {ward.cleanestRate}% Resolved
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-6 text-right">
                      <div className="hidden sm:block">
                        <p className="text-xs font-bold text-gray-300">{ward.avgResponseTimeHours}h</p>
                        <p className="text-[9px] text-gray-500 uppercase tracking-widest">Avg Response</p>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-emerald-400 flex items-center justify-end gap-1">
                          <TrendingUp size={12} /> {ward.activityScore} pts
                        </p>
                        <p className="text-[9px] text-gray-500 uppercase tracking-widest">Citizen Activity</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

        </div>
      </main>
    </div>
  );
}
