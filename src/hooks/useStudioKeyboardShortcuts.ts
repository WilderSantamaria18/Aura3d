/**
 * useStudioKeyboardShortcuts
 * Deprecated: Global keyboard events are now unified in a single listener
 * in useKeyboardShortcuts to eliminate race conditions, double triggers, and focus traps.
 */
export { useKeyboardShortcuts as useStudioKeyboardShortcuts } from './useKeyboardShortcuts';
