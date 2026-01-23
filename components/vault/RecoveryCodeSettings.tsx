"use client";

import { useState } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { PasswordInput } from '@/components/ui/PasswordInput';
import Modal from '@/components/ui/Modal';
import { RecoveryCodeDisplay } from './RecoveryCodeDisplay';
import { toast } from 'sonner';
import { useRecoveryCodeRegenerate } from '@/hooks/useRecoveryCodeRegenerate';
import { useVaultStore } from '@/stores/vault-store';

export function RecoveryCodeSettings() {
  const [showModal, setShowModal] = useState(false);
  const [step, setStep] = useState<'password' | 'display'>('password');
  const [passphrase, setPassphrase] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newCodes, setNewCodes] = useState<string[]>([]);

  const { regenerateRecoveryCodes } = useRecoveryCodeRegenerate();
  const { vaultEnvelope } = useVaultStore();

  const unusedCodeCount = vaultEnvelope?.recoveryWrappers?.filter(w => w.usedAt === null).length ?? 0;

  const handleRegenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (!passphrase) {
        throw new Error('Please enter your passphrase');
      }

      const codes = await regenerateRecoveryCodes(passphrase);
      setNewCodes(codes);
      setStep('display');
      toast.success('Recovery codes regenerated');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to regenerate recovery codes';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleModalClose = () => {
    setShowModal(false);
    setStep('password');
    setPassphrase('');
    setError(null);
    setNewCodes([]);
  };

  return (
    <>
      <Card className="p-6">
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold text-lg mb-2">Recovery Codes</h3>
            <p className="text-sm text-gray-600">
              Use recovery codes to regain access if you forget your passphrase. Each code can be used once.
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle size={20} className="text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-semibold text-blue-900">
                  {unusedCodeCount} of {vaultEnvelope?.recoveryWrappers?.length ?? 0} codes remaining
                </p>
                <p className="text-blue-800 mt-1">
                  Generate new codes when you run low or suspect codes may be compromised.
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={() => setShowModal(true)}
              variant="secondary"
              className="flex items-center gap-2"
            >
              <RefreshCw size={18} />
              Generate New Codes
            </Button>
          </div>

          <div className="text-xs text-gray-500 space-y-1 pt-2 border-t">
            <p>• Each recovery code can only be used once</p>
            <p>• After using a code, you&apos;ll be prompted to set a new passphrase</p>
            <p>• Store codes securely (offline, safe, or password manager)</p>
            <p>• Regenerating codes invalidates old codes (if you haven&apos;t lost them)</p>
          </div>
        </div>
      </Card>

      <Modal
        isOpen={showModal}
        onClose={handleModalClose}
        title={step === 'password' ? 'Generate Recovery Codes' : 'Your New Recovery Codes'}
      >
        {step === 'password' ? (
          <form onSubmit={handleRegenerate} className="space-y-4">
            <p className="text-sm text-gray-600">
              Enter your passphrase to verify your identity before generating new recovery codes.
            </p>

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">Passphrase</label>
              <PasswordInput
                placeholder="Enter your passphrase"
                value={passphrase}
                onChange={(e) => {
                  setPassphrase(e.target.value);
                  setError(null);
                }}
                disabled={loading}
                autoFocus
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex gap-3 justify-end">
              <Button type="button" variant="secondary" onClick={handleModalClose} disabled={loading}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Verifying...' : 'Generate Codes'}
              </Button>
            </div>
          </form>
        ) : (
          <RecoveryCodeDisplay
            codes={newCodes}
            onConfirmed={handleModalClose}
          />
        )}
      </Modal>
    </>
  );
}
