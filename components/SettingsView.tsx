
import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { Mail, Send, Save, Database, HelpCircle, CheckCircle2, Copy, User as UserIcon } from 'lucide-react';

interface Props {
  user: User;
  contactEmail: string;
  scriptUrl: string;
  onSaveScriptUrl: (url: string) => void;
  onSaveContactEmail: (email: string) => Promise<void>;
  onInvite: (email: string, coachId: string) => Promise<void>;
  isConnected: boolean;
  allCoaches?: User[]; // For Admin only
}

export const SettingsView: React.FC<Props> = ({ 
    user, 
    contactEmail, 
    scriptUrl, 
    onSaveScriptUrl, 
    onSaveContactEmail, 
    onInvite,
    isConnected,
    allCoaches = []
}) => {
  const [inviteEmail, setInviteEmail] = useState('');
  const [selectedCoachId, setSelectedCoachId] = useState(user.role === 'coach' ? user.id : '');
  const [tempScriptUrl, setTempScriptUrl] = useState(scriptUrl);
  const [tempContactEmail, setTempContactEmail] = useState(contactEmail);
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  // Filter out any admins just in case, though App.tsx should handle it.
  const validCoaches = allCoaches.filter(c => c.role === 'coach');

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;
    
    // For admin, ensure a coach is selected
    const coachRef = user.role === 'admin' ? selectedCoachId : user.id;
    if (!coachRef) {
        setStatusMsg("Please select a coach to link.");
        return;
    }

    setLoading(true);
    try {
        await onInvite(inviteEmail, coachRef);
        setInviteEmail('');
        setStatusMsg("Invitation sent successfully!");
        setTimeout(() => setStatusMsg(''), 3000);
    } catch (e) {
        setStatusMsg("Failed to send invite.");
    } finally {
        setLoading(false);
    }
  };

  const handleAdminSave = async () => {
    setLoading(true);
    try {
        onSaveScriptUrl(tempScriptUrl);
        await onSaveContactEmail(tempContactEmail);
        setStatusMsg("Settings saved.");
    } catch (e) {
        setStatusMsg("Error saving settings.");
    } finally {
        setLoading(false);
    }
  };

  // --- ATHLETE VIEW: HELP ---
  if (user.role === 'athlete') {
      return (
        <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
            <h1 className="text-2xl font-bold text-white mb-6">Help & Support</h1>
            
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                    <div className="bg-emerald-900/30 p-2 rounded-lg">
                        <UserIcon className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                        <h3 className="font-bold text-white">Account Type</h3>
                        <p className="text-slate-400 text-sm capitalize">{user.role}</p>
                    </div>
                </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="bg-blue-900/30 p-2 rounded-lg">
                        <Mail className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                        <h3 className="font-bold text-white">Contact Coach</h3>
                        <p className="text-slate-400 text-sm">Need help with your program?</p>
                    </div>
                </div>

                {contactEmail ? (
                    <a 
                        href={`mailto:${contactEmail}`}
                        className="flex items-center justify-center gap-2 w-full bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl font-bold transition-colors"
                    >
                        <Send className="w-4 h-4" />
                        Send Email
                    </a>
                ) : (
                    <p className="text-slate-500 text-sm italic">No contact email configured by admin.</p>
                )}
            </div>
        </div>
      );
  }

  // --- COACH VIEW: SETTINGS + INVITE ---
  if (user.role === 'coach') {
      return (
        <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
            <h1 className="text-2xl font-bold text-white mb-6">Coach Settings</h1>

            {/* Invite Section */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="bg-emerald-900/30 p-2 rounded-lg">
                        <Send className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                        <h3 className="font-bold text-white">Invite Athlete</h3>
                        <p className="text-slate-400 text-sm">Send an invitation to join your team.</p>
                    </div>
                </div>

                <form onSubmit={handleInvite} className="space-y-4">
                    <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">Athlete Email</label>
                        <input 
                            type="email" 
                            required
                            placeholder="athlete@example.com"
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                            value={inviteEmail}
                            onChange={(e) => setInviteEmail(e.target.value)}
                        />
                    </div>
                    <button 
                        type="submit" 
                        disabled={loading}
                        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-xl font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {loading ? 'Sending...' : 'Send Invite'}
                        {!loading && <Send className="w-4 h-4" />}
                    </button>
                    {statusMsg && <p className="text-center text-emerald-400 text-sm">{statusMsg}</p>}
                </form>
            </div>
        </div>
      );
  }

  // --- ADMIN VIEW: GLOBAL CONFIG ---
  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
        <h1 className="text-2xl font-bold text-white mb-6">Admin Configuration</h1>

        {/* Global Settings */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-6">
                <div className="bg-purple-900/30 p-2 rounded-lg">
                    <Database className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                    <h3 className="font-bold text-white">System Settings</h3>
                    <p className="text-slate-400 text-sm">Configure global application parameters.</p>
                </div>
            </div>

            <div className="space-y-4">
                <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Apps Script URL (Backend)</label>
                    <input 
                        type="text" 
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-slate-300 font-mono text-xs focus:ring-2 focus:ring-purple-500 outline-none"
                        value={tempScriptUrl}
                        onChange={(e) => setTempScriptUrl(e.target.value)}
                    />
                </div>
                <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Contact Email (Visible to Athletes)</label>
                    <input 
                        type="email" 
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:ring-2 focus:ring-purple-500 outline-none"
                        value={tempContactEmail}
                        onChange={(e) => setTempContactEmail(e.target.value)}
                    />
                </div>
                <button 
                    onClick={handleAdminSave}
                    disabled={loading}
                    className="w-full bg-purple-600 hover:bg-purple-500 text-white py-3 rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
                >
                    <Save className="w-4 h-4" />
                    Save Configuration
                </button>
            </div>
        </div>

        {/* Admin Invite Tool */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-6">
                <div className="bg-emerald-900/30 p-2 rounded-lg">
                    <Send className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                    <h3 className="font-bold text-white">Invite User</h3>
                    <p className="text-slate-400 text-sm">Send an invite linked to a specific coach.</p>
                </div>
            </div>

            <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">User Email</label>
                        <input 
                            type="email" 
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                            value={inviteEmail}
                            onChange={(e) => setInviteEmail(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">Assign to Coach</label>
                        <select 
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                            value={selectedCoachId}
                            onChange={(e) => setSelectedCoachId(e.target.value)}
                        >
                            <option value="">-- Select Coach --</option>
                            {validCoaches.map(c => (
                                <option key={c.id} value={c.id}>{c.firstName} {c.lastName} ({c.username})</option>
                            ))}
                        </select>
                    </div>
                </div>
                <button 
                    onClick={handleInvite}
                    disabled={loading || !inviteEmail || !selectedCoachId}
                    className="w-full bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-xl font-bold transition-colors disabled:opacity-50"
                >
                    Send Invite Link
                </button>
                {statusMsg && <p className="text-center text-emerald-400 text-sm">{statusMsg}</p>}
            </div>
        </div>
    </div>
  );
};
