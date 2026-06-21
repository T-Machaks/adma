export default function MineConLogo({ size = 'default' }) {
  const sizeClass = {
    default: 'h-10 lg:h-12',
    large: 'h-16 lg:h-20',
  }[size] || 'h-10 lg:h-12';

  return (
    <div className="flex items-center gap-3">
      <img
        src="/minecon-logo.png"
        alt="MineCon Logo"
        className={`${sizeClass} w-auto object-contain drop-shadow-lg`}
      />
      <div className="hidden sm:flex flex-col">
        <span className="font-heading text-lg font-bold text-white tracking-wider leading-none">
          MINECON
        </span>
        <span className="text-[10px] text-amber font-semibold tracking-widest uppercase">
          2026
        </span>
      </div>
    </div>
  );
}
