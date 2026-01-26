"use client";

import { useState } from 'react';
import { Key, CheckCircle2, Edit2 } from 'lucide-react';
import { useSyncSettingsStore } from '@/stores/sync-settings-store';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { toast } from 'sonner';

type UIMode = 'not-configured' | 'configured' | 'updating';

export function ApiSettings() {
  const { geminiApiKeyIsSet, updateGeminiApiKey, isLoading } = useSyncSettingsStore();

  // Determine initial UI mode
  const [mode, setMode] = useState<UIMode>(geminiApiKeyIsSet ? 'configured' : 'not-configured');
  const [inputValue, setInputValue] = useState('');

  const handleSave = async () => {
    if (!inputValue.trim()) {
      toast.error('Please enter an API key');
      return;
    }

    try {
      await updateGeminiApiKey(inputValue.trim());
      toast.success('API key saved successfully');
      setInputValue(''); // Clear input
      setMode('configured'); // Switch to configured state
    } catch (error) {
      toast.error('Failed to save API key');
      console.error('Save error:', error);
    }
  };

  const handleUpdate = () => {
    setMode('updating');
    setInputValue('');
  };

  const handleCancel = () => {
    setInputValue('');
    setMode('configured');
  };

  const handleClear = async () => {
    try {
      await updateGeminiApiKey(null);
      toast.success('API key removed');
      setInputValue('');
      setMode('not-configured');
    } catch (error) {
      toast.error('Failed to remove API key');
      console.error('Clear error:', error);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Key className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          <label className="font-medium text-slate-900 dark:text-slate-100">
            Gemini API Key
          </label>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
          Configure your Google AI Studio API key to enable AI-powered description generation.{' '}
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

      {/* State 1: Not Configured */}
      {mode === 'not-configured' && (
        <>
          <Input
            type="password"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Paste your Gemini API key"
            className="font-mono text-sm"
          />
          <Button
            onClick={handleSave}
            disabled={isLoading || !inputValue.trim()}
            variant="primary"
          >
            {isLoading ? 'Saving...' : 'Save API Key'}
          </Button>
        </>
      )}

      {/* State 2: Configured */}
      {mode === 'configured' && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg">
            <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
            <span className="text-sm font-medium text-green-800 dark:text-green-300">
              API Key Configured
            </span>
          </div>
          <div className="flex gap-3">
            <Button onClick={handleUpdate} variant="secondary">
              <Edit2 className="w-4 h-4" />
              Update Key
            </Button>
            <Button onClick={handleClear} variant="ghost" disabled={isLoading}>
              Remove Key
            </Button>
          </div>
        </div>
      )}

      {/* State 3: Updating */}
      {mode === 'updating' && (
        <>
          <Input
            type="password"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Enter new API key"
            className="font-mono text-sm"
            autoFocus
          />
          <div className="flex gap-3">
            <Button
              onClick={handleSave}
              disabled={isLoading || !inputValue.trim()}
              variant="primary"
            >
              {isLoading ? 'Saving...' : 'Save'}
            </Button>
            <Button onClick={handleCancel} variant="secondary" disabled={isLoading}>
              Cancel
            </Button>
          </div>
        </>
      )}

      {/* Security Note - Now ACCURATE */}
      <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-3">
        <p className="text-sm text-green-800 dark:text-green-300">
          <strong>Security:</strong> Your API key is stored server-side only and never exposed to the browser.
          The frontend only knows whether a key is configured or not.
        </p>
      </div>
    </div>
  );
}
