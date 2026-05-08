import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { RichTextEditor } from '../../components/common/RichTextEditor';
import { RichTextDisplay } from '../../components/common/RichTextDisplay';

const meta = {
  title: 'Components/Common/RichTextEditor',
  component: RichTextEditor,
  parameters: {
    layout: 'padded',
  },
} satisfies Meta<typeof RichTextEditor>;

export default meta;
type Story = StoryObj<typeof meta>;

const EditableExample = ({ showFullToolbar = false }) => {
  const [html, setHtml] = useState('<p class="mb-2 leading-relaxed text-slate-800" dir="ltr"><span data-lexical-text="true">Voici un texte </span><strong class="font-bold" data-lexical-text="true">riche</strong><span data-lexical-text="true"> par défaut !</span></p>');

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h3 className="text-lg font-bold text-slate-800 mb-4">
          Mode Édition {showFullToolbar ? '(Barre complète)' : '(Barre par défaut)'}
        </h3>
        <RichTextEditor 
          initialHtml={html}
          onChange={setHtml}
          placeholder="Saisissez des consignes..."
          showFullToolbar={showFullToolbar}
        />
      </div>

      <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Rendu (Athlète - RichTextDisplay)</h3>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-100">
          <RichTextDisplay html={html} />
        </div>
      </div>
      
      <div className="bg-slate-900 p-4 rounded-xl text-slate-300 font-mono text-xs overflow-x-auto">
        <h3 className="text-slate-400 mb-2">Code HTML généré :</h3>
        {html}
      </div>
    </div>
  );
};

export const Default: Story = {
  render: () => <EditableExample />
};

export const FullToolbar: Story = {
  render: () => <EditableExample showFullToolbar={true} />
};
