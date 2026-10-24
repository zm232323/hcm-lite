import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

export function Loader({ className, text = 'Loading...' }) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 py-16', className)}>
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  );
}
