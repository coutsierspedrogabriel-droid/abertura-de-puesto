import { useState, useEffect } from 'react';
import { StatusButton } from './StatusButton';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { AlertCircle } from 'lucide-react';

type Status = 'ok' | 'nok' | 'na' | null;

interface QuestionCardProps {
  questionNumber: number;
  questionText: string;
  initialStatus?: Status;
  initialJustification?: string;
  onAnswer: (status: Status, justification: string) => void;
  hasError?: boolean;
}

export function QuestionCard({
  questionNumber,
  questionText,
  initialStatus,
  initialJustification = '',
  onAnswer,
  hasError = false,
}: QuestionCardProps) {
  const [status, setStatus] = useState<Status>(initialStatus ?? null);
  const [justification, setJustification] = useState(initialJustification);

  useEffect(() => {
    onAnswer(status, justification);
  }, [status, justification]);

  const handleStatusChange = (newStatus: Status) => {
    setStatus(newStatus);
    if (newStatus !== 'nok') {
      setJustification('');
    }
  };

  const showJustification = status === 'nok';
  const justificationMissing = showJustification && !justification.trim();

  return (
    <div
      className={cn(
        'rounded-xl p-5 transition-all duration-300 animate-slide-in',
        'gradient-card industrial-border',
        hasError && 'ring-2 ring-status-nok/50'
      )}
    >
      <div className="flex flex-col gap-4">
        {/* Question Header */}
        <div className="flex items-start gap-3">
          <span className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary/20 text-primary font-bold text-sm shrink-0">
            {questionNumber}
          </span>
          <p className="text-foreground font-medium leading-relaxed">{questionText}</p>
        </div>

        {/* Status Buttons */}
        <div className="flex flex-wrap gap-2 sm:gap-3">
          <StatusButton
            status="ok"
            selected={status === 'ok'}
            onClick={() => handleStatusChange('ok')}
          />
          <StatusButton
            status="nok"
            selected={status === 'nok'}
            onClick={() => handleStatusChange('nok')}
          />
          <StatusButton
            status="na"
            selected={status === 'na'}
            onClick={() => handleStatusChange('na')}
          />
        </div>

        {/* Justification Field */}
        {showJustification && (
          <div className="animate-slide-in">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="h-4 w-4 text-status-nok" />
              <label className="text-sm font-medium text-status-nok">
                Justificativa obrigatória
              </label>
            </div>
            <Textarea
              placeholder="Descreva o motivo da não conformidade..."
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              className={cn(
                'min-h-[80px] bg-muted border-border focus:border-primary resize-none',
                justificationMissing && 'border-status-nok focus:border-status-nok'
              )}
            />
            {justificationMissing && (
              <p className="text-xs text-status-nok mt-1">
                A justificativa é obrigatória para respostas NOK
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
