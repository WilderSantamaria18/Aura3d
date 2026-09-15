import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Controls } from '../components/Player/Controls';

const meta: Meta<typeof Controls> = {
  title: 'Player/Controls',
  component: Controls,
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof Controls>;

export const Default: Story = {
  render: () => (
    <div className="w-[clamp(320px,94vw,840px)] p-4 rounded-[20px] bg-[#0c101a]/95 border border-white/10">
      <Controls />
    </div>
  ),
};

export const Mobile360px: Story = {
  parameters: {
    viewport: { defaultViewport: 'mobileSmall' },
  },
  render: () => (
    <div className="w-full max-w-[340px] p-2 rounded-[20px] bg-[#0c101a]/95 border border-white/10">
      <Controls />
    </div>
  ),
};
