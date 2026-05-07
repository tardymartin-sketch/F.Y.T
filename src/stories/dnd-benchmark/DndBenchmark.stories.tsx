import type { Meta, StoryObj } from '@storybook/react';
import { DndBenchmark, DndKitExample, HelloPangeaExample } from './DndBenchmark';

const meta = {
  title: 'Features/DND Benchmark',
  component: DndBenchmark,
  parameters: {
    layout: 'padded',
  },
} satisfies Meta<typeof DndBenchmark>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Comparaison: Story = {};

export const DndKitSeul: StoryObj<typeof DndKitExample> = {
  render: () => <DndKitExample />,
};

export const HelloPangeaSeul: StoryObj<typeof HelloPangeaExample> = {
  render: () => <HelloPangeaExample />,
};
