import React from 'react';
import { Play, Dumbbell } from 'lucide-react';
import { ProgramSession } from '../../../types';

interface Props {
  session: ProgramSession;
  onLaunch: (session: ProgramSession) => void;
  disabled?: boolean;
}

export function ProgramSessionCard({ session, onLaunch, disabled = false }: Props) {
  const exerciseCount = session.rows.filter(r => !r.isTextBlock).length;

  return (
    <div
      style={{
        background: 'var(--color-surface-2)',
        border: '1px solid var(--color-border)',
        borderRadius: 12,
        padding: '14px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        marginBottom: 10,
      }}
    >
      {/* Icône */}
      <div
        style={{
          width: 44,
          height: 44,
          background: 'var(--color-surface)',
          borderRadius: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Dumbbell size={20} color="var(--color-accent)" />
      </div>

      {/* Infos */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: 16,
            color: 'var(--color-text-primary)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {session.seanceType}
        </div>
        <div
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 13,
            color: 'var(--color-text-muted)',
            marginTop: 2,
          }}
        >
          {exerciseCount} exercice{exerciseCount !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Bouton Lancer */}
      <button
        onClick={() => onLaunch(session)}
        disabled={disabled}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '8px 14px',
          background: disabled ? 'var(--color-surface)' : 'var(--color-accent)',
          color: disabled ? 'var(--color-text-muted)' : '#fff',
          border: 'none',
          borderRadius: 8,
          fontFamily: 'var(--font-body)',
          fontWeight: 600,
          fontSize: 13,
          cursor: disabled ? 'not-allowed' : 'pointer',
          flexShrink: 0,
          transition: 'background 0.15s',
        }}
      >
        <Play size={14} />
        Lancer
      </button>
    </div>
  );
}
