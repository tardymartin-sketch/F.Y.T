import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { ExerciseSelectionModal } from './ExerciseSelectionModal';
import { Exercise } from '../../../types';

const meta = {
  title: 'Common/ExerciseSelectionModal',
  component: ExerciseSelectionModal,
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof ExerciseSelectionModal>;

export default meta;
type Story = StoryObj<typeof meta>;

// Données de test
const mockExercises: Exercise[] = [
  {
    id: 'ex-1',
    name: 'Développé Couché',
    primaryMuscleGroupId: 'mg-pectocraux',
    movementPatternId: 'mp-horizontal-push',
    limbType: 'bilateral',
    videoUrl: 'https://example.com/video1',
  },
  {
    id: 'ex-2',
    name: 'Développé Couché :: Haltères',
    primaryMuscleGroupId: 'mg-pectocraux',
    movementPatternId: 'mp-horizontal-push',
    limbType: 'unilateral',
  },
  {
    id: 'ex-3',
    name: 'Squat',
    primaryMuscleGroupId: 'mg-quadriceps',
    movementPatternId: 'mp-squat',
    limbType: 'bilateral',
  },
  {
    id: 'ex-4',
    name: 'Traction',
    primaryMuscleGroupId: 'mg-dos',
    movementPatternId: 'mp-vertical-pull',
    limbType: 'bilateral',
  },
];

const StatefulModal = ({ exercises = mockExercises }: { exercises?: Exercise[] }) => {
  const [isOpen, setIsOpen] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <div className="p-8 h-screen w-full bg-theme flex flex-col items-center justify-center">
      <button
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg"
      >
        Ouvrir Modale
      </button>

      {selectedId && (
        <p className="mt-4 text-theme">
          Exercice sélectionné : {exercises.find(e => e.id === selectedId)?.name} (ID: {selectedId})
        </p>
      )}

      <ExerciseSelectionModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        exercises={exercises}
        onSelect={(id) => {
          setSelectedId(id);
          setIsOpen(false);
        }}
      />
    </div>
  );
};

export const Default: Story = {
  render: () => <StatefulModal />,
};

export const EmptyState: Story = {
  render: () => <StatefulModal exercises={[]} />,
};
