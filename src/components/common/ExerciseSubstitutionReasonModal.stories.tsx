import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { ExerciseSubstitutionReasonModal } from './ExerciseSubstitutionReasonModal';

const meta = {
  title: 'Common/ExerciseSubstitutionReasonModal',
  component: ExerciseSubstitutionReasonModal,
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof ExerciseSubstitutionReasonModal>;

export default meta;
type Story = StoryObj<typeof meta>;

const StatefulModal = () => {
  const [isOpen, setIsOpen] = useState(true);
  const [submittedReason, setSubmittedReason] = useState<string | null>(null);

  return (
    <div className="p-8 h-screen w-full bg-theme flex flex-col items-center justify-center">
      <button 
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg"
      >
        Ouvrir Modale
      </button>
      
      {submittedReason !== null && (
        <p className="mt-4 text-theme">
          Raison soumise : {submittedReason || "(Aucune raison donnée)"}
        </p>
      )}

      <ExerciseSubstitutionReasonModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onSubmit={(reason) => {
          setSubmittedReason(reason);
          setIsOpen(false);
        }}
        exerciseName="Développé Couché"
      />
    </div>
  );
};

export const Default: Story = {
  render: () => <StatefulModal />,
};
