import { useState } from 'react';
import { Copy, Check, Eye, EyeOff, KeyRound } from 'lucide-react';

export function TempPasswordDialog({ open, password, onClose }) {
  const [copied, setCopied] = useState(false);
  const [visible, setVisible] = useState(false);

  if (!open) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative z-10 w-full max-w-md mx-4 animate-fade-in">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-2xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="rounded-full bg-primary/10 p-2">
              <KeyRound className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Temporary Password</h2>
              <p className="text-xs text-muted-foreground">Shown only once — copy it now</p>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-muted/50 p-4 mb-4">
            <div className="flex items-center gap-2">
              <code className="flex-1 font-mono text-sm text-foreground tracking-wider break-all">
                {visible ? password : '•'.repeat(password?.length || 12)}
              </code>
              <button
                onClick={() => setVisible((v) => !v)}
                className="rounded p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                title={visible ? 'Hide' : 'Show'}
              >
                {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
              <button
                onClick={handleCopy}
                className="rounded p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                title="Copy to clipboard"
              >
                {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <p className="text-xs text-muted-foreground mb-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
            ⚠️ This password will not be shown again. The user must change it on first login.
          </p>

          <button
            onClick={onClose}
            className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            I've copied it, close
          </button>
        </div>
      </div>
    </div>
  );
}
