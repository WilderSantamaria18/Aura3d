import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { SystemRequirementsModal } from '../components/UI/SystemRequirementsModal';

const meta: Meta<typeof SystemRequirementsModal> = {
  title: 'UI/SystemRequirementsModal',
  component: SystemRequirementsModal,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof SystemRequirementsModal>;

export const Default: Story = {
  render: () => <SystemRequirementsModal isOpen={true} onClose={() => {}} />,
};
