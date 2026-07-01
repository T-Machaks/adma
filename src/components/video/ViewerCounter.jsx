import { Eye } from 'lucide-react';

export default function ViewerCounter({ count }) {
  if (!count || count <= 0) return null;
  return (
    <div className="flex items-center gap-1.5 text-xs font-semibold text-red-400">
      <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
      <Eye className="w-3 h-3" />
      {count.toLocaleString()} watching
    </div>
  );
}
