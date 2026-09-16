import type { ReactNode } from 'react';

declare module '@storybook/react' {
  export type Meta<T = any> = {
    title?: string;
    component?: T;
    parameters?: Record<string, any>;
    decorators?: Array<(story: () => ReactNode) => ReactNode>;
    [key: string]: any;
  };

  export type StoryObj<T = any> = {
    render?: (args?: any) => ReactNode;
    args?: any;
    parameters?: Record<string, any>;
    [key: string]: any;
  };
}
