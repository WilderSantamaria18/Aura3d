import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { UniversalCommandPalette } from '../components/UI/UniversalCommandPalette';

const meta: Meta<typeof UniversalCommandPalette> = {
  title: 'UI/UniversalCommandPalette',
  component: UniversalCommandPalette,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof UniversalCommandPalette>;

export const OpenState: Story = {
  render: () => <UniversalCommandPalette />,
};
