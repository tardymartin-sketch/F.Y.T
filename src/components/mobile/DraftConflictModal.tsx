// ============================================================
// F.Y.T - DRAFT CONFLICT MODAL
// Shown when another tab wrote a newer draft version.
// User chooses to keep current or reload from the other tab.
// ============================================================

import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  onKeepCurrent: () => void;
  onReload: () => void;
}

export function DraftConflictModal({ onKeepCurrent, onReload }: Props) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.55)',
        zIndex: 200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 20px',
      }}
    >
      <div
        style={{
          background: 'var(--color-surface)',
          borderRadius: 16,
          padding: '28px 24px',
          width: '100%',
          maxWidth: 380,
        }}
      >
        {/* Icon + title */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              background: 'rgba(217, 119, 6, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <AlertTriangle size={22} style={{ color: 'var(--color-accent)' }} />
          </div>
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 17,
              fontWeight: 700,
              color: 'var(--color-text)',
              textAlign: 'center',
            }}
          >
            Session modifiée dans un autre onglet
          </h2>
        </div>

        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 14,
            color: 'var(--color-text-muted)',
            textAlign: 'center',
            lineHeight: 1.5,
            marginBottom: 24,
          }}
        >
          Un autre onglet a enregistré une version plus récente de cette session. Quelle version veux-tu garder&nbsp;?
        </p>

        {/* Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button
            onClick={onReload}
            style={{
              padding: '13px',
              fontFamily: 'var(--font-display)',
              fontSize: 14,
              fontWeight: 700,
              color: '#fff',
              background: 'var(--color-accent)',
              border: 'none',
              borderRadius: 12,
              cursor: 'pointer',
            }}
          >
            Utiliser la version la plus récente
          </button>
          <button
            onClick={onKeepCurrent}
            style={{
              padding: '13px',
              fontFamily: 'var(--font-body)',
              fontSize: 14,
              fontWeight: 500,
              color: 'var(--color-text-muted)',
              background: 'var(--color-surface-elevated)',
              border: '1px solid var(--color-border)',
              borderRadius: 12,
              cursor: 'pointer',
            }}
          >
            Garder cette version
          </button>
        </div>
      </div>
    </div>
  );
}
