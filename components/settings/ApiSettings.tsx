"use client";

import { useState, useEffect } from 'react';
import { Eye, EyeOff, Key, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useSyncSettingsStore } from '@/stores/sync-settings-store';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { toast } from 'sonner';

export function ApiSettings() {
  const { geminiApiToken, setGeminiApiToken, saveToServer } = useSyncSettingsStore();
  const [showToken, setShowToken] = useState(false);
  const [localToken, setLocalToken] = useState(geminiApiToken || '');
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setHasChanges(localToken !== (geminiApiToken || ''));
  }, [localToken, geminiApiToken]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      setGeminiApiToken(localToken || undefined);
      await saveToServer();
      toast.success('API token saved successfully');
    } catch (error) {
      toast.error('Failed to save API token');
      console.error('Save error:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleClear = () => {
    setLocalToken('');
    setHasChanges(true);
  };

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Key className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          <label htmlFor="gemini-token" className="font-medium text-slate-900 dark:text-slate-100">
            Gemini API Token
          </label>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
          Enter your Google AI Studio API key to enable AI-powered description generation.{' '}
          <a
            href="https://aistudio.google.com/app/apikey"
            target="_blank"
            rel="noopener noreferrer"
            className="text-rose-600 hover:text-rose-700 dark:text-rose-400 underline"
          >
            Get an API key
          </a>
        </p>
      </div>

      <div className="relative">
        <Input
          id="gemini-token"
          type={showToken ? 'text' : 'password'}
          value={localToken}
          onChange={(e) => setLocalToken(e.target.value)}
          placeholder="Enter your Gemini API token"
          className="pr-20 font-mono text-sm"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {localToken && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded transition-colors"
              title="Clear token"
            >
              <AlertCircle className="w-4 h-4" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowToken(!showToken)}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded transition-colors"
            title={showToken ? 'Hide token' : 'Show token'}
          >
            {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {geminiApiToken && !hasChanges && (
        <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
          <CheckCircle2 className="w-4 h-4" />
          <span>Token configured</span>
        </div>
      )}

      <div className="flex gap-3">
        <Button
          onClick={handleSave}
          disabled={isSaving || !hasChanges}
          variant="primary"
        >
          {isSaving ? 'Saving...' : 'Save Token'}
        </Button>
        {hasChanges && (
          <Button
            onClick={() => setLocalToken(geminiApiToken || '')}
            variant="secondary"
          >
            Cancel
          </Button>
        )}
      </div>

      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
        <p className="text-sm text-amber-800 dark:text-amber-300">
          <strong>Security Note:</strong> Your API token is stored encrypted and only used server-side. Never share your token with anyone.
        </p>
      </div>
    </div>
  );
}
