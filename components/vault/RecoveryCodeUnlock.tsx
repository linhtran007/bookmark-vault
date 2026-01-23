"use client";

import { useState } from 'react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Card from '@/components/ui/Card';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { toast } from 'sonner';
import { useRecoveryCodeUnlock } from '@/hooks/useRecoveryCodeUnlock';

interface RecoveryCodeUnlockProps {
  onCancel: () => void;
  onSuccess: () => void;
}

export function RecoveryCodeUnlock({ onCancel, onSuccess }: RecoveryCodeUnlockProps) {
  const [step, setStep] = useState<'code' | 'passphrase'>('code');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [newPassphrase, setNewPassphrase] = useState('');
  const [confirmPassphrase, setConfirmPassphrase] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { unlockWithRecoveryCode } = useRecoveryCodeUnlock();

  const normalizeCode = (code: string) => {
    return code.replace(/\s+/g, '').toUpperCase();
  };

  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!recoveryCode.trim()) {
      setError('Please enter your recovery code');
      return;
    }

    setStep('passphrase');
  };

  const handlePassphraseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (!newPassphrase) {
        throw new Error('Please enter a new passphrase');
      }

      if (newPassphrase.length < 12) {
        throw new Error('Passphrase must be at least 12 characters');
      }

      if (newPassphrase !== confirmPassphrase) {
        throw new Error('Passphrases do not match');
      }

      await unlockWithRecoveryCode(normalizeCode(recoveryCode), newPassphrase);
      toast.success('Vault unlocked with recovery code! Your passphrase has been reset.');
      onSuccess();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to unlock vault';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  if (step === 'code') {
    return (
      <Card className="p-6">
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-2">Enter Recovery Code</h3>
            <p className="text-sm text-gray-600">
              Enter one of your recovery codes to regain access. Each code can only be used once.
            </p>
          </div>

          <form onSubmit={handleCodeSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">Recovery Code</label>
              <Input
                type="text"
                placeholder="e.g., ABCD-EFGH-IJKL-MNOP"
                value={recoveryCode}
                onChange={(e) => {
                  setRecoveryCode(e.target.value);
                  setError(null);
                }}
                className="font-mono uppercase"
                autoFocus
              />
              {error && <p className="text-sm text-red-600 mt-1">{error}</p>}
            </div>

            <div className="flex gap-3">
              <Button type="button" variant="secondary" onClick={onCancel} disabled={loading}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                Next
              </Button>
            </div>
          </form>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-2">Set New Passphrase</h3>
          <p className="text-sm text-gray-600">
            Your recovery code has been verified. Now set a new passphrase to secure your vault.
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-900">
            <strong>Code verified:</strong> {recoveryCode.slice(0, 4)}...
          </p>
        </div>

        <form onSubmit={handlePassphraseSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">New Passphrase</label>
            <PasswordInput
              placeholder="Enter a strong passphrase (12+ characters)"
              value={newPassphrase}
              onChange={(e) => {
                setNewPassphrase(e.target.value);
                setError(null);
              }}
              disabled={loading}
            />
            {newPassphrase && newPassphrase.length < 12 && (
              <p className="text-xs text-orange-600 mt-1">Minimum 12 characters recommended</p>
            )}
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">Confirm Passphrase</label>
            <PasswordInput
              placeholder="Re-enter your passphrase"
              value={confirmPassphrase}
              onChange={(e) => {
                setConfirmPassphrase(e.target.value);
                setError(null);
              }}
              disabled={loading}
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setStep('code');
                setError(null);
              }}
              disabled={loading}
            >
              Back
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Unlocking...' : 'Unlock Vault'}
            </Button>
          </div>
        </form>
      </div>
    </Card>
  );
}
