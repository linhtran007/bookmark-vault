# T-INT-06: Add Onboarding for E2E Vault Mode

**Epic:** Complete E2E Cloud Sync Integration
**Type:** Frontend
**State:** pending
**Dependencies:** T-INT-05

---

## Action

Create guided tour for new vault users

---

## Business Summary

Educate users about E2E benefits and security model

---

## Logic

1. Create onboarding flow explaining E2E
2. Show passphrase importance and recovery warning
3. Demonstrate key features (sync, backup, devices)
4. Offer skip option for experienced users
5. Track onboarding completion
6. Show multi-step wizard with illustrations
7. Save completion state to localStorage
8. Show onboarding on first vault enable

---

## Technical Logic

- Use existing onboarding pattern from codebase
- Show multi-step wizard with illustrations
- Save completion state to localStorage
- Show onboarding on first vault enable
- Allow skip and "show again" options

---

## Onboarding Steps

1. **Welcome** - What is vault mode?
2. **Security** - How E2E encryption works
3. **Passphrase** - Why it's critical
4. **Sync** - How syncing works
5. **Backup** - Exporting encrypted backups
6. **Devices** - Managing multiple devices
7. **Ready** - Start using vault

---

## Implementation

```typescript
// lib/vault-onboarding.ts

const ONBOARDING_KEY = 'vault-onboarding-completed';

export function hasCompletedOnboarding(): boolean {
  return localStorage.getItem(ONBOARDING_KEY) === 'true';
}

export function markOnboardingComplete(): void {
  localStorage.setItem(ONBOARDING_KEY, 'true');
}

export function resetOnboarding(): void {
  localStorage.removeItem(ONBOARDING_KEY);
}

export interface OnboardingStep {
  id: string;
  title: string;
  content: string;
  illustration?: string;
}

export const onboardingSteps: OnboardingStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to Vault Mode',
    content: `
      <p>Vault mode adds end-to-end encryption to your bookmarks.</p>
      <p>This means:</p>
      <ul>
        <li>Your data is encrypted on your device</li>
        <li>The server can never read your bookmarks</li>
        <li>You can sync across devices securely</li>
      </ul>
    `,
  },
  {
    id: 'security',
    title: 'How It Works',
    content: `
      <p>Vault mode uses military-grade encryption (AES-256).</p>
      <p>Your passphrase encrypts everything locally before it ever leaves your device.</p>
      <p>Even if someone accessed the server, they would only see encrypted gibberish.</p>
    `,
  },
  {
    id: 'passphrase',
    title: 'Your Passphrase is Critical',
    content: `
      <p><strong>Important:</strong> Your passphrase cannot be recovered.</p>
      <p>If you forget it:</p>
      <ul>
        <li>Your data is permanently inaccessible</li>
        <li>We cannot help you recover it</li>
        <li>There is no "forgot password" option</li>
      </ul>
      <p>Store it safely: password manager, safe deposit box, etc.</p>
    `,
  },
  {
    id: 'sync',
    title: 'Automatic Sync',
    content: `
      <p>Your bookmarks sync automatically across all your devices.</p>
      <p>Changes sync in the background when you're online.</p>
      <p>If you edit on two devices simultaneously, we keep both versions.</p>
    `,
  },
  {
    id: 'backup',
    title: 'Encrypted Backups',
    content: `
      <p>You can export encrypted backups anytime.</p>
      <p>Keep a backup in case you need to restore on a new device.</p>
      <p>Backups are encrypted with your passphrase, just like your vault.</p>
    `,
  },
  {
    id: 'devices',
    title: 'Multiple Devices',
    content: `
      <p>Use vault mode on all your devices.</p>
      <p>View which devices have access in Settings.</p>
      <p>Remove devices you no longer use.</p>
    `,
  },
  {
    id: 'ready',
    title: "You're All Set!",
    content: `
      <p>Your vault is ready to use.</p>
      <p>Remember your passphrase and keep regular backups!</p>
    `,
  },
];
```

---

## UI Component

```typescript
// components/vault/VaultOnboarding.tsx
"use client";

import { useState, useEffect } from "react";
import { Modal } from "@/components/ui";
import { Button } from "@/components/ui";
import {
  onboardingSteps,
  hasCompletedOnboarding,
  markOnboardingComplete,
} from "@/lib/vault-onboarding";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function VaultOnboarding({ isOpen, onClose }: Props) {
  const [currentStep, setCurrentStep] = useState(0);
  const [skipped, setSkipped] = useState(false);

  const handleNext = () => {
    if (currentStep < onboardingSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    markOnboardingComplete();
    onClose();
  };

  const handleSkip = () => {
    setSkipped(true);
    markOnboardingComplete();
    onClose();
  };

  const step = onboardingSteps[currentStep];
  const isLastStep = currentStep === onboardingSteps.length - 1;
  const isFirstStep = currentStep === 0;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={step.title}>
      <div className="space-y-6">
        {/* Progress indicator */}
        <div className="flex items-center gap-2">
          {onboardingSteps.map((_, index) => (
            <div
              key={index}
              className={`flex-1 h-1 rounded ${
                index <= currentStep ? "bg-blue-600" : "bg-gray-200"
              }`}
            />
          ))}
        </div>

        {/* Step content */}
        <div
          className="prose prose-sm max-w-none"
          dangerouslySetInnerHTML={{ __html: step.content }}
        />

        {/* Illustration placeholder */}
        {step.illustration && (
          <div className="bg-gray-100 rounded-lg p-8 text-center">
            <img src={step.illustration} alt={step.title} />
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Button
            variant="secondary"
            onClick={handleBack}
            disabled={isFirstStep}
          >
            Back
          </Button>

          <div className="flex gap-3">
            <Button variant="ghost" onClick={handleSkip}>
              Skip
            </Button>
            <Button variant="primary" onClick={handleNext}>
              {isLastStep ? "Get Started" : "Next"}
            </Button>
          </div>
        </div>

        {/* Step indicator */}
        <div className="text-center text-sm text-gray-600">
          Step {currentStep + 1} of {onboardingSteps.length}
        </div>
      </div>
    </Modal>
  );
}
```

---

## Integration

```typescript
// In enable vault flow
import { hasCompletedOnboarding } from '@/lib/vault-onboarding';
import { VaultOnboarding } from '@/components/vault/VaultOnboarding';

export function EnableVaultFlow() {
  const [showOnboarding, setShowOnboarding] = useState(false);

  const handleEnableComplete = () => {
    // Check if user has seen onboarding
    if (!hasCompletedOnboarding()) {
      setShowOnboarding(true);
    }
  };

  return (
    <>
      {/* ... enable flow UI ... */}

      <VaultOnboarding
        isOpen={showOnboarding}
        onClose={() => setShowOnboarding(false)}
      />
    </>
  );
}
```

---

## "Show Again" Option

```typescript
// In settings page
import { resetOnboarding } from '@/lib/vault-onboarding';

export function SettingsPage() {
  const handleResetOnboarding = () => {
    if (confirm("Show vault onboarding again?")) {
      resetOnboarding();
    }
  };

  return (
    <SettingsSection title="Help">
      <button onClick={handleResetOnboarding}>
        Show vault onboarding again
      </button>
    </SettingsSection>
  );
}
```

---

## Testing

**Integration Test:**
- Verify onboarding shows on first enable
- Verify steps progress correctly
- Verify skip works
- Verify completion tracked

---

## Files

**CREATE:**
- `lib/vault-onboarding.ts`
- `components/vault/VaultOnboarding.tsx`

**MODIFY:**
- `components/vault/EnableVaultModal.tsx` (trigger onboarding)
- `app/settings/page.tsx` (add reset option)

---

## Patterns

- Follow existing onboarding patterns
- Use multi-step wizard
- Allow skip and replay

---

## Verification Checklist

- [ ] Onboarding steps defined
- [ ] Wizard UI created
- [ ] Progress indicator works
- [ ] Skip option works
- [ ] Completion tracked
- [ ] Shows on first enable
- [ ] "Show again" works
- [ ] Content is clear
- [ ] Mobile responsive
- [ ] Integration tests pass

---

## Notes

- Consider adding video walkthrough
- Consider adding interactive demo
- Keep steps concise and focused
- Use simple language (avoid jargon)
- Consider adding tooltips reference
- Add analytics for onboarding completion
- Test on mobile and desktop
- Consider accessibility (screen readers)
- Add keyboard navigation
- Localize content for i18n
- Consider adding dark mode support
