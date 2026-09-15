import type { Meta, StoryObj } from '@storybook/react';
import { EmptyState } from '../components/Common/EmptyState';
import { Skeleton } from '../components/Common/Skeleton';
import { Spinner } from '../components/Common/Spinner';
import { ErrorState } from '../components/Common/ErrorState';
import { Music, Upload, Search } from 'lucide-react';

const meta: Meta = {
  title: 'Design System/UI States',
  tags: ['autodocs'],
};

export default meta;

export const EmptyQueue: StoryObj = {
  render: () => (
    <EmptyState
      icon={Upload}
      title="Cola de reproducción vacía"
      description="Arrastra tus archivos de audio aquí o carga pistas desde tu biblioteca."
      action={{
        label: 'Cargar Audio',
        onClick: () => {},
      }}
    />
  ),
};

export const NoSearchResults: StoryObj = {
  render: () => (
    <EmptyState
      icon={Search}
      title="Sin resultados"
      description="No se encontraron canciones ni herramientas con ese nombre."
    />
  ),
};

export const LoadingSkeletons: StoryObj = {
  render: () => (
    <div className="space-y-2 p-4 max-w-sm">
      <Skeleton height="16px" width="60%" />
      <Skeleton height="12px" width="90%" />
      <Skeleton height="12px" width="40%" />
    </div>
  ),
};

export const Spinners: StoryObj = {
  render: () => (
    <div className="flex gap-4 p-4 items-center">
      <Spinner size="sm" />
      <Spinner size="md" />
      <Spinner size="lg" />
    </div>
  ),
};

export const ErrorCard: StoryObj = {
  render: () => (
    <ErrorState
      title="Error de conexión"
      message="No se pudo cargar la estación de radio streaming. Verifica tu red."
      onRetry={() => {}}
    />
  ),
};
