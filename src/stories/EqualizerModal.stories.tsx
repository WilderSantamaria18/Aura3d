import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { EqualizerModal } from '../components/UI/EqualizerModal';

const meta: Meta<typeof EqualizerModal> = {
  title: 'UI/EqualizerModal',
  component: EqualizerModal,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof EqualizerModal>;

export const Default: Story = {
  render: () => <EqualizerModal />,
};

export const Mobile360px: Story = {
  parameters: {
    viewport: { defaultViewport: 'mobileSmall' },
  },
  render: () => <EqualizerModal />,
};
