export default function SectionHeader({ title, subtitle, className = '' }) {
  return (
    <div className={`mb-6 ${className}`}>
      <h2 className="text-2xl font-heading font-bold text-foreground tracking-wide uppercase">{title}</h2>
      {subtitle && <p className="text-muted-foreground text-sm mt-1">{subtitle}</p>}
    </div>
  );
}
