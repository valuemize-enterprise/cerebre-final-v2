'use client';
import { useEffect, useState } from 'react';
import { Star, Users, Award, Loader2, ChevronDown, ChevronUp, Send, CheckCircle2 } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const API  = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
const hdrs = () => ({ Authorization: `Bearer ${localStorage.getItem('cerebre_client_token')}` });

const DEPT_LABELS: Record<string, string> = {
  strategy: 'Strategy', creative: 'Creative', paid_media: 'Paid Media',
  social_media: 'Social Media', analytics: 'Analytics', content: 'Content',
  design: 'Design', leadership: 'Leadership', technology: 'Technology',
};

const StarRating = ({
  label, value, onChange, readonly = false,
}: { label: string; value: number; onChange?: (v: number) => void; readonly?: boolean }) => (
  <div className="flex items-center justify-between py-2 border-b" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
    <span className="text-xs text-white/50">{label}</span>
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(star => (
        <button key={star} type="button"
          onClick={() => !readonly && onChange?.(star)}
          className={clsx('transition-colors', readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110')}>
          <Star className={clsx('w-4 h-4 transition-colors', star <= value ? 'fill-amber-400 text-amber-400' : 'text-white/20')} />
        </button>
      ))}
    </div>
  </div>
);

const RatingModal = ({
  staff, brandId, onClose, onSaved,
}: { staff: any; brandId: string; onClose: () => void; onSaved: () => void }) => {
  const [ratings, setRatings] = useState({
    overall_rating: 0, communication_rating: 0, quality_rating: 0,
    responsiveness_rating: 0, strategic_value_rating: 0,
  });
  const [feedback, setFeedback] = useState('');
  const [saving, setSaving]     = useState(false);

  const set = (k: string, v: number) => setRatings(r => ({ ...r, [k]: v }));

  const submit = async () => {
    if (ratings.overall_rating === 0) { toast.error('Please give an overall rating'); return; }
    setSaving(true);
    try {
      await axios.post(`${API}/client/team/${staff.id}/rate`,
        { ...ratings, written_feedback: feedback },
        { headers: hdrs() }
      );
      toast.success(`Thank you for rating ${staff.full_name.split(' ')[0]}`);
      onSaved(); onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to save rating');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border overflow-hidden"
        style={{ background: '#0d0630', borderColor: 'rgba(109,40,217,0.4)' }}>
        <div className="p-5 border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
          <div className="flex items-center gap-3">
            {staff.avatar_url
              ? <img src={staff.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
              : <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold" style={{ background: 'linear-gradient(135deg,#6d28d9,#a78bfa)' }}>
                  {staff.full_name.charAt(0)}
                </div>
            }
            <div>
              <p className="text-white font-bold text-sm">{staff.full_name}</p>
              <p className="text-white/40 text-xs">{staff.role_on_brand || staff.role_title}</p>
            </div>
          </div>
        </div>
        <div className="p-5 space-y-1">
          <StarRating label="Overall performance *" value={ratings.overall_rating} onChange={v => set('overall_rating', v)} />
          <StarRating label="Communication"         value={ratings.communication_rating} onChange={v => set('communication_rating', v)} />
          <StarRating label="Quality of work"       value={ratings.quality_rating}       onChange={v => set('quality_rating', v)} />
          <StarRating label="Responsiveness"        value={ratings.responsiveness_rating} onChange={v => set('responsiveness_rating', v)} />
          <StarRating label="Strategic value"       value={ratings.strategic_value_rating} onChange={v => set('strategic_value_rating', v)} />
          <div className="pt-3">
            <label className="block text-xs text-white/40 mb-2">Written feedback (optional)</label>
            <textarea rows={3} className="w-full rounded-xl px-3 py-2.5 text-sm text-white/80 outline-none resize-none"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
              placeholder="What did they do well? What could improve?"
              value={feedback} onChange={e => setFeedback(e.target.value)} />
          </div>
        </div>
        <div className="p-4 flex gap-2 border-t" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
          <button onClick={submit} disabled={saving || ratings.overall_rating === 0}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-40 flex items-center justify-center gap-2"
            style={{ background: 'linear-gradient(135deg,#6d28d9,#9333ea)' }}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Submit rating
          </button>
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl text-sm text-white/40 hover:text-white/70"
            style={{ background: 'rgba(255,255,255,0.04)' }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

const StaffCard = ({ member, onRate }: { member: any; onRate: (m: any) => void }) => {
  const [expanded, setExpanded] = useState(false);
  const skills = typeof member.skills === 'string' ? JSON.parse(member.skills) : (member.skills || []);
  const certs  = typeof member.certifications === 'string' ? JSON.parse(member.certifications) : (member.certifications || []);

  return (
    <div className="rounded-2xl border overflow-hidden transition-all"
      style={{ borderColor: member.is_lead ? 'rgba(109,40,217,0.4)' : 'rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' }}>
      <div className="p-5">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            {member.avatar_url
              ? <img src={member.avatar_url} alt={member.full_name} className="w-14 h-14 rounded-2xl object-cover" />
              : <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-xl font-black"
                  style={{ background: 'linear-gradient(135deg,#6d28d9,#a78bfa)' }}>
                  {member.full_name.charAt(0)}
                </div>
            }
            {member.is_lead && (
              <div className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full flex items-center justify-center text-[10px]"
                style={{ background: '#f59e0b' }}>
                ⭐
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-white font-bold text-base">{member.full_name}</p>
                <p className="text-purple-400 text-xs font-medium">{member.role_on_brand || member.role_title}</p>
                {member.is_lead && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full mt-1 inline-block"
                    style={{ background: 'rgba(245,158,11,0.2)', color: '#fcd34d', border: '1px solid rgba(245,158,11,0.3)' }}>
                    Lead Account Manager
                  </span>
                )}
              </div>
              {/* Rating display */}
              {member.avg_client_rating > 0 && (
                <div className="text-right flex-shrink-0">
                  <div className="flex items-center gap-1 justify-end">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span className="text-sm font-bold text-white">{parseFloat(member.avg_client_rating).toFixed(1)}</span>
                  </div>
                  <p className="text-[10px] text-white/30">{member.total_ratings} rating{member.total_ratings !== 1 ? 's' : ''}</p>
                </div>
              )}
            </div>

            {/* Skills preview */}
            {skills.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {skills.slice(0, 4).map((s: string) => (
                  <span key={s} className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                    style={{ background: 'rgba(109,40,217,0.15)', color: '#c4b5fd', border: '1px solid rgba(109,40,217,0.2)' }}>
                    {s}
                  </span>
                ))}
                {skills.length > 4 && <span className="text-[10px] text-white/20">+{skills.length-4} more</span>}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 mt-4 pt-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
          <button onClick={() => onRate(member)}
            className="flex-1 py-2 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-1.5"
            style={{ background: 'linear-gradient(135deg,rgba(109,40,217,0.3),rgba(147,51,234,0.2))', border: '1px solid rgba(109,40,217,0.3)' }}>
            <Star className="w-3.5 h-3.5" /> Rate {member.full_name.split(' ')[0]}
          </button>
          <button onClick={() => setExpanded(e => !e)}
            className="px-3 py-2 rounded-xl text-xs text-white/40 hover:text-white/60"
            style={{ background: 'rgba(255,255,255,0.04)' }}>
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expanded profile */}
      {expanded && (
        <div className="px-5 pb-5 pt-2 border-t space-y-3" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          {member.bio && <p className="text-xs text-white/50 leading-relaxed">{member.bio}</p>}
          {member.value_proposition && (
            <div className="p-3 rounded-xl text-xs text-purple-300 leading-relaxed"
              style={{ background: 'rgba(109,40,217,0.1)', border: '1px solid rgba(109,40,217,0.2)' }}>
              <strong className="text-purple-400 block mb-1">Why {member.full_name.split(' ')[0]} is on your team:</strong>
              {member.value_proposition}
            </div>
          )}
          {certs.length > 0 && (
            <div>
              <p className="text-[10px] text-white/30 uppercase tracking-wider mb-2">Certifications</p>
              <div className="flex flex-wrap gap-1.5">
                {certs.map((c: string) => (
                  <span key={c} className="text-[10px] px-2 py-0.5 rounded-full"
                    style={{ background: 'rgba(5,150,105,0.15)', color: '#6ee7b7', border: '1px solid rgba(5,150,105,0.2)' }}>
                    <Award className="w-2.5 h-2.5 inline mr-1" />{c}
                  </span>
                ))}
              </div>
            </div>
          )}
          {member.years_experience > 0 && (
            <p className="text-xs text-white/30">{member.years_experience} year{member.years_experience !== 1 ? 's' : ''} of experience</p>
          )}
        </div>
      )}
    </div>
  );
};

export default function ClientTeamPage() {
  const [team, setTeam]       = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [ratingTarget, setRatingTarget] = useState<any>(null);
  const [client, setClient]   = useState<any>(null);

  useEffect(() => {
    const info = localStorage.getItem('cerebre_client_info');
    if (info) setClient(JSON.parse(info));
    axios.get(`${API}/client/team`, { headers: hdrs() })
      .then(r => setTeam(r.data.team || []))
      .catch(console.error).finally(() => setLoading(false));
  }, []);

  const lead   = team.find(m => m.is_lead);
  const others = team.filter(m => !m.is_lead);

  return (
    <div className="p-6 lg:p-8 max-w-4xl">
      {/* Rating modal */}
      {ratingTarget && (
        <RatingModal
          staff={ratingTarget}
          brandId={client?.brandId}
          onClose={() => setRatingTarget(null)}
          onSaved={() => {
            setRatingTarget(null);
            axios.get(`${API}/client/team`, { headers: hdrs() }).then(r => setTeam(r.data.team || []));
          }}
        />
      )}

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-black text-white">Your Cerebre Team</h1>
        <p className="text-white/40 text-sm mt-1">
          {team.length} specialist{team.length !== 1 ? 's' : ''} working on {client?.brandName}
        </p>
      </div>

      {/* Rating invite */}
      <div className="rounded-2xl p-5 mb-7 flex items-center gap-4"
        style={{ background: 'rgba(109,40,217,0.1)', border: '1px solid rgba(109,40,217,0.25)' }}>
        <Star className="w-8 h-8 text-amber-400 flex-shrink-0" />
        <div>
          <p className="text-white font-bold text-sm">Your feedback makes us better</p>
          <p className="text-white/40 text-xs mt-0.5">
            Rate your team members monthly. Your feedback is private, goes directly to team leads, and shapes how we serve you.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
        </div>
      ) : team.length === 0 ? (
        <div className="text-center py-20">
          <Users className="w-12 h-12 mx-auto text-white/10 mb-4" />
          <p className="text-white/30 font-semibold">Team not yet assigned</p>
          <p className="text-white/15 text-sm mt-1">Your account manager will assign your team shortly</p>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Lead AM first */}
          {lead && (
            <div>
              <p className="text-[10px] font-bold text-amber-400/70 uppercase tracking-widest mb-3">⭐ Your Lead Account Manager</p>
              <StaffCard member={lead} onRate={setRatingTarget} />
            </div>
          )}
          {/* Rest of team */}
          {others.length > 0 && (
            <div>
              {lead && <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest mb-3 mt-6">Your Team</p>}
              <div className="grid sm:grid-cols-2 gap-4">
                {others.map(m => <StaffCard key={m.id} member={m} onRate={setRatingTarget} />)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
