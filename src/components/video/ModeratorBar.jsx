import { useState } from 'react';
import { Radio, UserCheck, MessageSquare, HelpCircle, Users, Square } from 'lucide-react';
import { Switch } from '@/components/ui/switch';

export default function ModeratorBar({ session, onUpdate, isPending }) {
  const [viewerInput, setViewerInput] = useState(session?.viewer_count?.toString() || '');

  const toggle = (field) => {
    onUpdate({ [field]: !session?.[field] });
  };

  const setStatus = (status) => {
    onUpdate({ status });
  };

  const saveViewerCount = () => {
    const n = parseInt(viewerInput, 10);
    if (!isNaN(n) && n >= 0) onUpdate({ viewer_count: n });
  };

  return (
    <div className="bg-slate-900 border border-white/10 rounded-xl p-3 space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
        <span className="text-xs font-bold text-white uppercase tracking-wide">Moderator Controls</span>
        <span className="ml-auto text-[10px] text-slate-400">Organizer only</span>
      </div>

      {/* Status controls */}
      <div className="flex gap-2">
        <button
          onClick={() => setStatus('live')}
          disabled={session?.status === 'live' || isPending}
          className="flex-1 flex items-center justify-center gap-1.5 text-xs font-bold py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <Radio className="w-3.5 h-3.5" /> Go Live
        </button>
        <button
          onClick={() => setStatus('ended')}
          disabled={session?.status === 'ended' || isPending}
          className="flex-1 flex items-center justify-center gap-1.5 text-xs font-bold py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <Square className="w-3.5 h-3.5" /> End Session
        </button>
      </div>

      {/* Toggles */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <MessageSquare className="w-3.5 h-3.5" /> Chat enabled
          </div>
          <Switch
            checked={!!session?.chat_enabled}
            onCheckedChange={() => toggle('chat_enabled')}
          />
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <HelpCircle className="w-3.5 h-3.5" /> Q&A enabled
          </div>
          <Switch
            checked={!!session?.qa_enabled}
            onCheckedChange={() => toggle('qa_enabled')}
          />
        </div>
      </div>

      {/* Viewer count */}
      <div>
        <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
          <Users className="w-3 h-3 inline mr-1" /> Viewer Count
        </label>
        <div className="flex gap-2">
          <input
            type="number"
            min="0"
            value={viewerInput}
            onChange={e => setViewerInput(e.target.value)}
            className="flex-1 text-xs bg-slate-800 border border-white/10 rounded-lg px-2 py-1.5 text-white focus:outline-none focus:ring-1 focus:ring-amber"
          />
          <button
            onClick={saveViewerCount}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber hover:bg-amber/90 text-white transition-colors"
          >
            Set
          </button>
        </div>
      </div>
    </div>
  );
}
