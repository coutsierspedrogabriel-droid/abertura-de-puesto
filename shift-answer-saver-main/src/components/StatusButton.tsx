import { cn } from '@/lib/utils';
import { Check, X, MinusCircle } from 'lucide-react';

type Status = 'ok' | 'nok' | 'na';

interface StatusButtonProps {
  status: Status;
  selected: boolean;
  onClick: () => void;
  disabled?: boolean;
}

const statusConfig = {
  ok: {
    label: 'OK',
    icon: Check,
    baseClass: 'border-status-ok/50 text-status-ok',
    selectedClass: 'bg-status-ok text-status-ok-foreground border-status-ok shadow-glow-ok',
  },
  nok: {
    label: 'NOK',
    icon: X,
    baseClass: 'border-status-nok/50 text-status-nok',
    selectedClass: 'bg-status-nok text-status-nok-foreground border-status-nok shadow-glow-nok',
  },
  na: {
    label: 'N/A',
    icon: MinusCircle,
    baseClass: 'border-status-na/50 text-status-na',
    selectedClass: 'bg-status-na text-status-na-foreground border-status-na',
  },
};

export function StatusButton({ status, selected, onClick, disabled }: StatusButtonProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border-2 font-semibold transition-all duration-200',
        'hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed',
        'min-w-[80px]',
        selected ? config.selectedClass : `${config.baseClass} bg-transparent hover:bg-muted`
      )}
    >
      <Icon className="h-4 w-4" />
      <span className="text-sm">{config.label}</span>
    </button>
  );
}
