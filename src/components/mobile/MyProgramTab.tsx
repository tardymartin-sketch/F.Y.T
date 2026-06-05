import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Dumbbell, AlertCircle, RotateCcw } from 'lucide-react';
import { AthleteProgram, ProgramSession, ExerciseLog } from '../../../types';
import { programsApi } from '../../services/api/programs.api';
import { workoutRowsToExerciseLogs } from '../../utils/workoutToExerciseLogs';
import { getCurrentWeekIndex } from '../../utils/programUtils';
import { ProgramSessionCard } from './ProgramSessionCard';
import { useActiveSessionStore } from '../../stores/useActiveSessionStore';

// ─── Skeleton loader ──────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div style={{ padding: '16px 16px 0' }}>
      {[1, 2, 3].map(i => (
        <div
          key={i}
          style={{
            background: 'var(--color-surface-2)',
            border: '1px solid var(--color-border)',
            borderRadius: 12,
            height: 72,
            marginBottom: 10,
            animation: 'pulse 1.5s ease-in-out infinite',
          }}
        />
      ))}
      <style>{`@keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:.4 } }`}</style>
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '64px 32px',
        gap: 16,
        textAlign: 'center',
      }}
    >
      <Dumbbell size={48} color="var(--color-text-muted)" />
      <div>
        <div
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: 18,
            color: 'var(--color-text-primary)',
            marginBottom: 8,
          }}
        >
          Aucun programme assigné
        </div>
        <div
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 14,
            color: 'var(--color-text-muted)',
            lineHeight: 1.5,
          }}
        >
          Contacte ton coach pour qu'il te crée un programme.
        </div>
      </div>
    </div>
  );
}

// ─── Error state ──────────────────────────────────────────────────────────────

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '64px 32px',
        gap: 16,
        textAlign: 'center',
      }}
    >
      <AlertCircle size={40} color="var(--color-error, #DC2626)" />
      <div style={{ fontFamily: 'var(--font-body)', color: 'var(--color-text-secondary)', fontSize: 14 }}>
        Impossible de charger le programme.
      </div>
      <button
        onClick={onRetry}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '8px 16px',
          background: 'var(--color-surface-2)',
          border: '1px solid var(--color-border)',
          borderRadius: 8,
          fontFamily: 'var(--font-body)',
          fontWeight: 600,
          fontSize: 13,
          color: 'var(--color-text-primary)',
          cursor: 'pointer',
        }}
      >
        <RotateCcw size={14} />
        Réessayer
      </button>
    </div>
  );
}

// ─── Program selector (N programmes) ─────────────────────────────────────────

function ProgramSelectorView({
  programs,
  onSelect,
}: {
  programs: AthleteProgram[];
  onSelect: (p: AthleteProgram) => void;
}) {
  return (
    <div style={{ padding: '16px 16px 0' }}>
      <div
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: 11,
          fontWeight: 500,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: 'var(--color-text-muted)',
          marginBottom: 12,
        }}
      >
        Mes programmes
      </div>
      {programs.map(program => (
        <button
          key={program.programName}
          onClick={() => onSelect(program)}
          style={{
            width: '100%',
            background: 'var(--color-surface-2)',
            border: '1px solid var(--color-border)',
            borderRadius: 12,
            padding: '16px',
            marginBottom: 10,
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              background: 'var(--color-accent-light)',
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Dumbbell size={20} color="var(--color-accent)" />
          </div>
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 700,
                fontSize: 16,
                color: 'var(--color-text-primary)',
              }}
            >
              {program.programName}
            </div>
            <div
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 13,
                color: 'var(--color-text-muted)',
                marginTop: 2,
              }}
            >
              {program.weeks.length} semaine{program.weeks.length !== 1 ? 's' : ''}
            </div>
          </div>
          <ChevronRight size={18} color="var(--color-text-muted)" />
        </button>
      ))}
    </div>
  );
}

// ─── Program detail (semaines + séances) ─────────────────────────────────────

function ProgramDetailView({
  program,
  onBack,
  onLaunch,
  hasActiveSession,
}: {
  program: AthleteProgram;
  onBack: () => void;
  onLaunch: (session: ProgramSession) => void;
  hasActiveSession: boolean;
}) {
  const [weekIndex, setWeekIndex] = useState(() =>
    getCurrentWeekIndex(program.weeks, new Date())
  );

  const week = program.weeks[weekIndex];
  const isFirst = weekIndex === 0;
  const isLast = weekIndex === program.weeks.length - 1;

  return (
    <div>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '14px 16px 10px',
          borderBottom: '1px solid var(--color-border)',
        }}
      >
        <button
          onClick={onBack}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 4,
            color: 'var(--color-text-muted)',
          }}
        >
          <ChevronLeft size={20} />
        </button>
        <div
          style={{
            flex: 1,
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: 17,
            color: 'var(--color-text-primary)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {program.programName}
        </div>
      </div>

      {/* Week navigator */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 16px',
          background: 'var(--color-surface)',
        }}
      >
        <button
          onClick={() => setWeekIndex(i => i - 1)}
          disabled={isFirst}
          style={{
            background: 'none',
            border: 'none',
            cursor: isFirst ? 'not-allowed' : 'pointer',
            padding: 4,
            color: isFirst ? 'var(--color-border)' : 'var(--color-text-secondary)',
          }}
        >
          <ChevronLeft size={22} />
        </button>

        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              fontFamily: 'var(--font-body)',
              fontWeight: 600,
              fontSize: 14,
              color: 'var(--color-text-primary)',
            }}
          >
            {week?.weekLabel ?? ''}
          </div>
          <div
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 11,
              color: 'var(--color-text-muted)',
              marginTop: 2,
            }}
          >
            Semaine {weekIndex + 1} / {program.weeks.length}
          </div>
        </div>

        <button
          onClick={() => setWeekIndex(i => i + 1)}
          disabled={isLast}
          style={{
            background: 'none',
            border: 'none',
            cursor: isLast ? 'not-allowed' : 'pointer',
            padding: 4,
            color: isLast ? 'var(--color-border)' : 'var(--color-text-secondary)',
          }}
        >
          <ChevronRight size={22} />
        </button>
      </div>

      {/* Sessions de la semaine */}
      <div style={{ padding: '12px 16px 0' }}>
        {week && week.sessions.length > 0 ? (
          week.sessions.map(session => (
            <ProgramSessionCard
              key={session.seanceType}
              session={session}
              onLaunch={onLaunch}
              disabled={hasActiveSession}
            />
          ))
        ) : (
          <div
            style={{
              textAlign: 'center',
              padding: '32px 0',
              fontFamily: 'var(--font-body)',
              fontSize: 14,
              color: 'var(--color-text-muted)',
            }}
          >
            Aucune séance cette semaine.
          </div>
        )}
        {hasActiveSession && (
          <div
            style={{
              marginTop: 8,
              padding: '10px 14px',
              background: 'var(--color-surface-2)',
              borderRadius: 8,
              fontFamily: 'var(--font-body)',
              fontSize: 13,
              color: 'var(--color-text-muted)',
              textAlign: 'center',
            }}
          >
            Termine ta séance active avant d'en lancer une nouvelle.
          </div>
        )}
      </div>
    </div>
  );
}

// ─── MyProgramTab ─────────────────────────────────────────────────────────────

interface Props {
  userId: string;
  hasActiveSession: boolean;
  onStartNewSession: (exercises: ExerciseLog[]) => void;
}

export function MyProgramTab({ userId, hasActiveSession, onStartNewSession }: Props) {
  const [selectedProgram, setSelectedProgram] = useState<AthleteProgram | null>(null);
  const setCurrentTemplateId = useActiveSessionStore(s => s.setCurrentTemplateId);

  const { data: programs, isLoading, isError, refetch } = useQuery({
    queryKey: ['athleteProgram', userId],
    queryFn: () => programsApi.getAthleteProgramSessions(userId),
    staleTime: 5 * 60 * 1000,
  });

  const handleLaunch = (session: ProgramSession) => {
    // Propage le template source pour permettre l'affichage des blocs de texte coach
    setCurrentTemplateId(session.sourceTemplateId ?? null);
    const exercises = workoutRowsToExerciseLogs(session.rows);
    onStartNewSession(exercises);
  };

  // Loading
  if (isLoading) return <Skeleton />;

  // Error
  if (isError) return <ErrorState onRetry={() => refetch()} />;

  // Empty
  if (!programs || programs.length === 0) return <EmptyState />;

  // Si un seul programme, on va directement sur la vue détail
  const effectiveProgram = selectedProgram ?? (programs.length === 1 ? programs[0] : null);

  // Sélecteur de programmes
  if (!effectiveProgram) {
    return (
      <ProgramSelectorView
        programs={programs}
        onSelect={setSelectedProgram}
      />
    );
  }

  // Vue détaillée
  return (
    <ProgramDetailView
      program={effectiveProgram}
      onBack={() => setSelectedProgram(null)}
      onLaunch={handleLaunch}
      hasActiveSession={hasActiveSession}
    />
  );
}
