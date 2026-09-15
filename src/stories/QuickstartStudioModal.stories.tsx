import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { QuickstartStudioModal } from '../components/UI/QuickstartStudioModal';

const meta: Meta<typeof QuickstartStudioModal> = {
  title: 'UI/QuickstartStudioModal',
  component: QuickstartStudioModal,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof QuickstartStudioModal>;

export const Default: Story = {
  render: () => <QuickstartStudioModal />,
};
