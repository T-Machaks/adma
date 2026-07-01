import { EVENT_CONFIG } from '@/lib/eventConfig';

export default function EventLogo({ size = 'default' }) {
  const sizeClass = {
    default: 'h-10 lg:h-12',
    large: 'h-16 lg:h-20',
  }[size] || 'h-10 lg:h-12';

  return (
    <div className="flex items-center gap-3">
      <img
        src={EVENT_CONFIG.logo.transparent}
        alt={`${EVENT_CONFIG.eventName} Logo`}
        className={`${sizeClass} w-auto object-contain drop-shadow-lg`}
      />
    </div>
  );
}
