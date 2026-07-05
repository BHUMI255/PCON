import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { fetchPublicStats } from '../services/api';
import { ShieldAlert, Globe, Users, Eye, ShieldCheck, Activity, ChevronDown } from 'lucide-react';

export default function LandingPage() {
  const { user, login, signup } = useContext(AuthContext);
  const navigate = useNavigate();

  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [locality, setLocality] = useState('');
  const [error, setError] = useState('');
  const [mockStats, setMockStats] = useState({ issues: 320, resolved: 245, volunteers: 110 });

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const stats = await fetchPublicStats();
        setMockStats(stats);
      } catch (err) {
        console.error('Failed to load live stats:', err);
      }
    };
    
    loadStats();
    const intervalId = setInterval(loadStats, 10000);
    return () => clearInterval(intervalId);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (isRegister) {
        await signup(name, email, password, locality);
      } else {
        await login(email, password);
      }
      navigate('/dashboard');
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Authentication failed. Please try again.');
    }
  };

  const handleVisitorAccess = () => {
    // Navigate straight to dashboard without signing in
    navigate('/dashboard');
  };

  return (
    <div className="w-full flex flex-col">
      <div className="min-h-[calc(100vh-73px)] bg-transparent flex flex-col items-center justify-center px-6 py-12 relative overflow-hidden">

      <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-12 gap-12 items-center z-10">
        
        {/* Branding & Vision Panel */}
        <div className="lg:col-span-7 space-y-8 text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase tracking-wider">
            <Globe size={14} className="animate-spin-slow" /> Connecting Citizens & Cities
          </div>
          <h1 className="text-4xl md:text-6xl font-black tracking-tight text-white leading-tight">
            Empower Your <span className="bg-gradient-to-r from-teal-400 to-purple-400 bg-clip-text text-transparent">Community</span>, Resolve Local Issues.
          </h1>
          <p className="text-white text-lg leading-relaxed max-w-xl">
            CivicConnect is a civic engagement platform allowing residents to report infrastructure complaints, join community discussions, and sign up for local volunteer campaigns.
          </p>

          {/* Stats Bar */}
          <div className="grid grid-cols-3 gap-6 pt-4 border-t border-gray-800/80 max-w-lg">
            <div>
              <p className="text-3xl font-extrabold text-white">{mockStats.issues}</p>
              <p className="text-xs text-white font-semibold uppercase">Reports Logged</p>
            </div>
            <div>
              <p className="text-3xl font-extrabold text-teal-400">{mockStats.resolved}</p>
              <p className="text-xs text-white font-semibold uppercase">Resolved</p>
            </div>
            <div>
              <p className="text-3xl font-extrabold text-purple-400">{mockStats.volunteers}</p>
              <p className="text-xs text-white font-semibold uppercase">Volunteers Active</p>
            </div>
          </div>

          {/* Card Features */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-xl">
            <div className="p-4 rounded-xl bg-white/5 backdrop-blur-2xl border border-white/20 flex items-start gap-3">
              <div className="bg-teal-500/20 text-teal-400 p-2 rounded-lg"><ShieldAlert size={18} /></div>
              <div>
                <h3 className="text-sm font-semibold text-white">Smart Reporting</h3>
                <p className="text-xs text-white mt-1">Report road, power, or sanitary issues instantly with GeoJSON location mapping.</p>
              </div>
            </div>
            <div className="p-4 rounded-xl bg-black/50 backdrop-blur-2xl border border-white/10 flex items-start gap-3">
              <div className="bg-purple-500/20 text-purple-400 p-2 rounded-lg"><Users size={18} /></div>
              <div>
                <h3 className="text-sm font-semibold text-white">Interactive Forums</h3>
                <p className="text-xs text-white mt-1">Discuss neighborhood issues, upvote priority alerts, and voice suggestions.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Access Panel (Login/Signup Form) */}
        <div className="lg:col-span-5 w-full">
          <div className="bg-black/50 backdrop-blur-2xl border border-white/10 rounded-2xl p-8 flex flex-col shadow-[0_8px_32px_0_rgba(0,0,0,0.5)]">
            <h2 className="text-2xl font-extrabold text-white mb-2 text-glow">
              {isRegister ? 'Create an Account' : 'Welcome Back'}
            </h2>
            <p className="text-xs text-white mb-6">
              {isRegister ? 'Join the community effort today.' : 'Sign in to access citizen actions.'}
            </p>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-2.5 rounded-lg text-xs font-semibold mb-4 text-center">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {isRegister && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-white uppercase mb-1">Full Name</label>
                    <input 
                      type="text" 
                      required
                      placeholder="Jane Doe" 
                      value={name} 
                      onChange={e => setName(e.target.value)}
                      className="w-full bg-black/40 border border-white/20 outline-none rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-400 transition-all focus:border-white/50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-white uppercase mb-1">Locality / Neighborhood</label>
                    <input 
                      type="text" 
                      placeholder="Greenwood Valley" 
                      value={locality} 
                      onChange={e => setLocality(e.target.value)}
                      className="w-full bg-black/40 border border-white/20 outline-none rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-400 transition-all focus:border-white/50"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-bold text-white uppercase mb-1">Email Address</label>
                <input 
                  type="email" 
                  required
                  placeholder="name@locality.com" 
                  value={email} 
                  onChange={e => setEmail(e.target.value)}
                  className="w-full bg-black/40 border border-white/20 outline-none rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-400 transition-all focus:border-white/50"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-white uppercase mb-1">Password</label>
                <input 
                  type="password" 
                  required
                  placeholder="••••••••" 
                  value={password} 
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-black/40 border border-white/20 outline-none rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-400 transition-all focus:border-white/50"
                />
              </div>

              <button 
                type="submit" 
                className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-black font-bold text-sm py-3 px-4 rounded-lg shadow-lg hover:shadow-green-500/10 hover:shadow-lg transition-all cursor-pointer"
              >
                {isRegister ? 'Register' : 'Sign In'}
              </button>
            </form>

            <div className="flex items-center my-6">
              <div className="h-px bg-white/20 flex-grow" />
              <span className="text-[10px] text-white uppercase tracking-widest px-3 font-semibold">Or Connect As</span>
              <div className="h-px bg-white/20 flex-grow" />
            </div>

            <button 
              onClick={handleVisitorAccess}
              className="w-full border border-white/20 hover:border-white/40 bg-black/20 hover:bg-black/40 text-white font-semibold text-xs py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Eye size={16} /> Continue as Visitor
            </button>

            <p className="text-center text-xs text-white mt-6">
              {isRegister ? 'Already have an account?' : 'Need to report issues?'}{' '}
              <button 
                onClick={() => setIsRegister(!isRegister)} 
                className="text-teal-300 hover:text-white hover:underline font-bold cursor-pointer transition-colors"
              >
                {isRegister ? 'Sign In' : 'Create Account'}
              </button>
            </p>
          </div>
        </div>

      </div>
        
        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce opacity-50 hover:opacity-100 cursor-pointer text-white hidden md:block">
          <ChevronDown size={36} />
        </div>
      </div>

      {/* VALUE PROP SECTION - Importance, Use, Surity */}
      <div className="w-full bg-transparent py-32 px-6 border-t border-white/5 relative z-10 scroll-reveal">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16 scroll-reveal">
            <h2 className="text-4xl md:text-5xl font-black text-white mb-4 text-glow">Why CivicConnect?</h2>
            <p className="text-lg text-gray-400 max-w-2xl mx-auto">A seamless platform built to modernize civic engagement, offering unprecedented reliability, ease of use, and robust security.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Importance */}
            <div className="glass-card p-10 rounded-2xl flex flex-col items-center text-center hover:-translate-y-2 transition-transform duration-500 scroll-reveal">
              <div className="w-20 h-20 rounded-full bg-teal-500/20 text-teal-400 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(45,212,191,0.2)]">
                <Activity size={40} />
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">Importance</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Empowering citizens to directly report infrastructure failures and track resolution ensures faster response times and a higher quality of living for the entire community.
              </p>
            </div>

            {/* Ease of Use */}
            <div className="glass-card p-10 rounded-2xl flex flex-col items-center text-center hover:-translate-y-2 transition-transform duration-500 scroll-reveal" style={{ animationDelay: '0.1s' }}>
              <div className="w-20 h-20 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(168,85,247,0.2)]">
                <Users size={40} />
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">Ease of Use</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Designed with a friction-free interface. Simply snap a photo, drop a pin on the interactive map, and submit. We route it automatically to the relevant local authorities.
              </p>
            </div>

            {/* Surity & Trust */}
            <div className="glass-card p-10 rounded-2xl flex flex-col items-center text-center hover:-translate-y-2 transition-transform duration-500 scroll-reveal" style={{ animationDelay: '0.2s' }}>
              <div className="w-20 h-20 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(59,130,246,0.2)]">
                <ShieldCheck size={40} />
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">Surity & Trust</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Your data is cryptographically secured. We provide full transparency on issue tracking, ensuring strict civic accountability with verified municipal responses.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
