const PACKAGE_STYLES = {
  Basic:    'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  Enhanced: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300',
  Premium:  'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
};

export default function TierBadge({ package: pkg }) {
  if (!pkg) return null;
  const cls = PACKAGE_STYLES[pkg] ?? 'bg-muted text-muted-foreground';
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${cls}`}>
      {pkg}
    </span>
  );
}
