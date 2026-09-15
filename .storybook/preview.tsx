import React from 'react';
import type { Preview } from '@storybook/react';
import '../src/index.css';

const customViewports = {
  mobileSmall: {
    name: 'Mobile (360px)',
    styles: {
      width: '360px',
      height: '640px',
    },
  },
  tablet: {
    name: 'Tablet (768px)',
    styles: {
      width: '768px',
      height: '1024px',
    },
  },
  desktop: {
    name: 'Desktop (1024px)',
    styles: {
      width: '1024px',
      height: '768px',
    },
  },
  desktopWide: {
    name: 'Desktop Wide (1440px)',
    styles: {
      width: '1440px',
      height: '900px',
    },
  },
};

const preview: Preview = {
  parameters: {
    backgrounds: {
      default: 'aura-dark',
      values: [
        { name: 'aura-dark', value: '#06080e' },
        { name: 'aura-surface', value: '#0c101a' },
      ],
    },
    viewport: {
      viewports: customViewports,
    },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
  decorators: [
    (Story) => (
      <div className="bg-[#06080e] text-white min-h-screen p-4 font-sans antialiased">
        <Story />
      </div>
    ),
  ],
};

export default preview;
