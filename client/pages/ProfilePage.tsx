import React, { useState, useEffect } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { ShimmerButton } from '@/components/ui/shimmer-button';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/axios';
import { User, Mail, Shield, Building, Calendar, CheckCircle2, AlertCircle } from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const { user, updateUser } = useAuth();

  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setName(user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim());
      setCompany(user.company || '');
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMessage(null);
    setErrorMessage(null);

    if (!name.trim()) {
      setErrorMessage('Name cannot be empty');
      return;
    }

    setLoading(true);

    try {
      const res = await api.put('/api/auth/profile', {
        name: name.trim(),
        company: company.trim(),
      });

      const updated = res.data.user || res.data.data?.user;
      if (updated) {
        updateUser(updated);
        setSuccessMessage('Profile updated successfully');
      } else {
        setSuccessMessage('Profile saved');
      }
    } catch (err: any) {
      const msg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        err.message ||
        'Failed to update profile';
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (userName?: string) => {
    if (!userName) return 'U';
    const parts = userName.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return userName.slice(0, 2).toUpperCase();
  };

  const formattedDate = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : 'Recent Member';

  return (
    <div className="h-full max-h-full w-full overflow-hidden flex items-center justify-center p-4 sm:p-6 bg-[#161616]">
      <GlassCard className="w-full max-w-2xl p-6 sm:p-8 border border-white/15 bg-white/[0.08] backdrop-blur-[18px] rounded-[24px] shadow-2xl overflow-hidden">
        {/* Profile Header */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 pb-6 border-b border-white/10">
          <div className="w-16 h-16 rounded-full bg-[#C6F135] text-black font-bold text-xl flex items-center justify-center shadow-lg shadow-[#C6F135]/25 flex-shrink-0">
            {getInitials(user?.name)}
          </div>
          <div className="flex-1 text-center sm:text-left">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-bold text-white">{user?.name}</h2>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#C6F135]/15 text-[#C6F135] border border-[#C6F135]/30 capitalize self-center sm:self-auto">
                {user?.role || 'admin'}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-[#9A9A9A] mt-1 flex items-center justify-center sm:justify-start gap-1.5">
              <Mail className="w-3.5 h-3.5" /> {user?.email}
            </p>
          </div>
        </div>

        {/* Read-Only Stats Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-5">
          <div className="p-3 rounded-xl bg-white/[0.04] border border-white/10 flex items-center gap-3">
            <Shield className="w-4 h-4 text-[#C6F135]" />
            <div>
              <div className="text-[10px] text-[#9A9A9A] uppercase tracking-wider">Access Role</div>
              <div className="text-xs sm:text-sm font-semibold text-white capitalize">{user?.role || 'admin'}</div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-white/[0.04] border border-white/10 flex items-center gap-3">
            <Building className="w-4 h-4 text-[#C6F135]" />
            <div>
              <div className="text-[10px] text-[#9A9A9A] uppercase tracking-wider">Company</div>
              <div className="text-xs sm:text-sm font-semibold text-white truncate max-w-[120px]">
                {user?.company || 'Personal'}
              </div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-white/[0.04] border border-white/10 flex items-center gap-3">
            <Calendar className="w-4 h-4 text-[#C6F135]" />
            <div>
              <div className="text-[10px] text-[#9A9A9A] uppercase tracking-wider">Member Since</div>
              <div className="text-xs sm:text-sm font-semibold text-white">{formattedDate}</div>
            </div>
          </div>
        </div>

        {/* Inline Feedback Alerts */}
        {successMessage && (
          <div className="mb-4 p-2.5 rounded-xl bg-[#C6F135]/10 border border-[#C6F135]/30 flex items-center gap-2 text-xs text-[#C6F135]">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-[#C6F135]" />
            <span>{successMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="mb-4 p-2.5 rounded-xl bg-red-500/10 border border-red-500/25 flex items-center gap-2 text-xs text-red-400">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Edit Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#9A9A9A] uppercase tracking-wider mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <input
                  id="profile-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your full name"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.05] border border-white/10 text-white placeholder-[#9A9A9A] text-sm focus:outline-none focus:border-[#C6F135] transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#9A9A9A] uppercase tracking-wider mb-1.5">
                Company Name
              </label>
              <div className="relative">
                <input
                  id="profile-company"
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="Your organization"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.05] border border-white/10 text-white placeholder-[#9A9A9A] text-sm focus:outline-none focus:border-[#C6F135] transition-colors"
                />
              </div>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <ShimmerButton
              type="submit"
              disabled={loading}
              background="#C6F135"
              shimmerColor="#ffffff"
              className="text-black font-semibold text-sm px-6 py-2.5 rounded-xl cursor-pointer hover:brightness-105 active:scale-[0.99] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  Saving...
                </span>
              ) : (
                'Save Changes'
              )}
            </ShimmerButton>
          </div>
        </form>
      </GlassCard>
    </div>
  );
};

export default ProfilePage;
