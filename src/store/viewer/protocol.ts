import type { ProductId } from '../types';

export interface ViewerAction { id: string; label: string; labelOn: string; step: boolean; on: boolean }
export interface ViewerPersonal { name: string; latin: string; date: string }
export type ViewerCommand =
  | { type: 'show'; id: ProductId; personal: ViewerPersonal }
  | { type: 'personal'; personal: ViewerPersonal }
  | { type: 'action'; id: string };
export type ViewerEvent =
  | { type: 'ready' }
  | { type: 'shown'; id: string; actions: ViewerAction[] }
  | { type: 'actions'; id: string; actions: ViewerAction[] }
  | { type: 'touched' }
  | { type: 'failed'; message?: string };

export interface ViewerHandle { act: (actionId: string) => void }
export interface ViewerProps {
  id: ProductId;
  personal: ViewerPersonal;
  onActions?: (actions: ViewerAction[]) => void;
  /** called once the 3D object is on screen (or failed: then the photo stays) */
  onLive?: (live: boolean) => void;
}

export function parseEvent(data: unknown): ViewerEvent | null {
  if (typeof data !== 'string' || data[0] !== '{') return null;
  try {
    const m = JSON.parse(data) as ViewerEvent;
    return m && typeof m === 'object' && typeof m.type === 'string' ? m : null;
  } catch {
    return null;
  }
}
