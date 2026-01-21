"use client";

import { useState } from 'react';
import { Modal, Button } from '@/components/ui';
import { AlertTriangle, Loader2, ShieldOff, Trash2 } from 'lucide-react';

interface BlockedSyncDialogProps {
  isOpen: boolean;
  onClose: () => void;
  encryptedRecordCount: number;
  onRevertToPlaintext: () => Promise<void>;
  onDeleteEncryptedCloudData: () => Promise<void>;
}

export function BlockedSyncDialog({
  isOpen,
  onClose,
  encryptedRecordCount,
  onRevertToPlaintext,
  onDeleteEncryptedCloudData,
}: BlockedSyncDialogProps) {
  const [isWorking, setIsWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handle = async (fn: () => Promise<void>) => {
    setIsWorking(true);
    setError(null);

    try {
      await fn();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Operation failed');
    } finally {
      setIsWorking(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={() => {}} closeOnBackdrop={false} title="Cloud sync blocked">
      <div className="space-y-5">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 dark:bg-amber-950/30 dark:border-amber-800">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
                Encrypted cloud data detected
              </p>
              <p className="text-sm text-amber-800 dark:text-amber-300 mt-1">
                You have {encryptedRecordCount} encrypted record{encryptedRecordCount === 1 ? '' : 's'} in the cloud.
                Plaintext sync is blocked to prevent data loss.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <Button
            onClick={() => handle(onRevertToPlaintext)}
            disabled={isWorking}
            className="w-full gap-2"
          >
            {isWorking ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Working...
              </>
            ) : (
              <>
                <ShieldOff className="w-4 h-4" />
                Revert vault to plaintext
              </>
            )}
          </Button>

          <Button
            variant="danger"
            onClick={() => handle(onDeleteEncryptedCloudData)}
            disabled={isWorking}
            className="w-full gap-2"
          >
            {isWorking ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Working...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                Delete encrypted cloud data
              </>
            )}
          </Button>

          <Button variant="secondary" onClick={onClose} disabled={isWorking} className="w-full">
            Cancel
          </Button>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}
      </div>
    </Modal>
  );
}
