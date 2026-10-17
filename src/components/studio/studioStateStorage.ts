import { DesignElement } from '@/lib/types';

export const STUDIO_STORAGE_KEY = 'ape_parel_studio_design_state';
export const PENDING_ACTION_STORAGE_KEY = 'ape_parel_pending_studio_action';

export type PendingStudioAction = 'SAVE' | 'ORDER' | null;

export interface StudioPersistedState {
  version: number;
  garmentProductId?: string;
  garmentVariantId?: string;
  selectedColor: string;
  selectedSize: string;
  quantity: number;
  activeSurface: 'FRONT' | 'BACK';
  frontElements: DesignElement[];
  backElements: DesignElement[];
  pendingAction?: PendingStudioAction;
  savedAt: number;
}

/**
 * Dynamically resolves the available Storage object in browser or test environments.
 */
function getStorage(): Storage | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
    if (typeof globalThis !== 'undefined' && (globalThis as any).localStorage) {
      return (globalThis as any).localStorage;
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * Defensively validates and sanitizes a single DesignElement object from untrusted storage.
 */
function sanitizeElement(el: any): DesignElement | null {
  if (!el || typeof el !== 'object' || Array.isArray(el)) return null;
  if (typeof el.id !== 'string' || !el.id.trim()) return null;
  if (typeof el.artworkId !== 'string' || !el.artworkId.trim()) return null;
  return {
    id: el.id.trim(),
    artworkId: el.artworkId.trim(),
    licenseOptionId:
      typeof el.licenseOptionId === 'string' && el.licenseOptionId.trim()
        ? el.licenseOptionId.trim()
        : 'lic_std',
    title: typeof el.title === 'string' && el.title.trim() ? el.title.trim() : 'Untitled Artwork',
    previewUrl: typeof el.previewUrl === 'string' ? el.previewUrl : '',
    creatorName:
      typeof el.creatorName === 'string' && el.creatorName.trim()
        ? el.creatorName.trim()
        : 'Anonymous',
    creatorId:
      typeof el.creatorId === 'string' && el.creatorId.trim() ? el.creatorId.trim() : 'unknown',
    surface: el.surface === 'BACK' ? 'BACK' : 'FRONT',
    x: typeof el.x === 'number' && Number.isFinite(el.x) ? el.x : 50,
    y: typeof el.y === 'number' && Number.isFinite(el.y) ? el.y : 50,
    width: typeof el.width === 'number' && Number.isFinite(el.width) && el.width > 0 ? el.width : 30,
    height: typeof el.height === 'number' && Number.isFinite(el.height) && el.height > 0 ? el.height : 30,
    rotation: typeof el.rotation === 'number' && Number.isFinite(el.rotation) ? el.rotation : 0,
    zIndex: typeof el.zIndex === 'number' && Number.isFinite(el.zIndex) ? Math.floor(el.zIndex) : 1,
    price: typeof el.price === 'number' && Number.isFinite(el.price) && el.price >= 0 ? el.price : 0,
  };
}

/**
 * Persists the user's active studio design state to localStorage.
 * Handles storage quota exceptions and non-browser environments gracefully.
 */
export function saveStudioState(state: Partial<StudioPersistedState>): boolean {
  const storage = getStorage();
  if (!storage) return false;
  try {
    const existing = loadStudioState();
    const sanitizedFront =
      state.frontElements !== undefined
        ? (state.frontElements.map(sanitizeElement).filter(Boolean) as DesignElement[])
        : existing?.frontElements ?? [];
    const sanitizedBack =
      state.backElements !== undefined
        ? (state.backElements.map(sanitizeElement).filter(Boolean) as DesignElement[])
        : existing?.backElements ?? [];

    const payload: StudioPersistedState = {
      version: 1,
      garmentProductId:
        typeof state.garmentProductId === 'string' && state.garmentProductId.trim()
          ? state.garmentProductId.trim()
          : existing?.garmentProductId,
      garmentVariantId:
        typeof state.garmentVariantId === 'string' && state.garmentVariantId.trim()
          ? state.garmentVariantId.trim()
          : existing?.garmentVariantId,
      selectedColor:
        typeof state.selectedColor === 'string' && state.selectedColor.trim()
          ? state.selectedColor.trim()
          : existing?.selectedColor ?? '#131718',
      selectedSize:
        typeof state.selectedSize === 'string' && state.selectedSize.trim()
          ? state.selectedSize.trim()
          : existing?.selectedSize ?? 'L',
      quantity:
        typeof state.quantity === 'number' && Number.isFinite(state.quantity) && state.quantity > 0
          ? Math.floor(state.quantity)
          : existing?.quantity ?? 1,
      activeSurface:
        state.activeSurface === 'BACK'
          ? 'BACK'
          : state.activeSurface === 'FRONT'
          ? 'FRONT'
          : existing?.activeSurface ?? 'FRONT',
      frontElements: sanitizedFront,
      backElements: sanitizedBack,
      pendingAction: state.pendingAction !== undefined ? state.pendingAction : existing?.pendingAction ?? null,
      savedAt: Date.now(),
    };
    storage.setItem(STUDIO_STORAGE_KEY, JSON.stringify(payload));
    return true;
  } catch (err) {
    console.warn('[studioStateStorage] Failed to save studio state to localStorage:', err);
    return false;
  }
}

/**
 * Loads the active studio design state from localStorage.
 * Defensively validates and sanitizes all properties to protect runtime consumers.
 */
export function loadStudioState(): StudioPersistedState | null {
  const storage = getStorage();
  if (!storage) return null;
  try {
    const raw = storage.getItem(STUDIO_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;

    // Defensively sanitize elements arrays and individual element objects
    const frontElements = Array.isArray(parsed.frontElements)
      ? (parsed.frontElements.map(sanitizeElement).filter(Boolean) as DesignElement[])
      : [];
    const backElements = Array.isArray(parsed.backElements)
      ? (parsed.backElements.map(sanitizeElement).filter(Boolean) as DesignElement[])
      : [];
    const selectedColor =
      typeof parsed.selectedColor === 'string' && parsed.selectedColor.trim()
        ? parsed.selectedColor.trim()
        : '#131718';
    const selectedSize =
      typeof parsed.selectedSize === 'string' && parsed.selectedSize.trim()
        ? parsed.selectedSize.trim()
        : 'L';
    const quantity =
      typeof parsed.quantity === 'number' && Number.isFinite(parsed.quantity) && parsed.quantity > 0
        ? Math.floor(parsed.quantity)
        : 1;
    const activeSurface: 'FRONT' | 'BACK' = parsed.activeSurface === 'BACK' ? 'BACK' : 'FRONT';
    const pendingAction: PendingStudioAction =
      parsed.pendingAction === 'SAVE' || parsed.pendingAction === 'ORDER' ? parsed.pendingAction : null;

    return {
      version: typeof parsed.version === 'number' ? parsed.version : 1,
      garmentProductId:
        typeof parsed.garmentProductId === 'string' && parsed.garmentProductId.trim()
          ? parsed.garmentProductId.trim()
          : undefined,
      garmentVariantId:
        typeof parsed.garmentVariantId === 'string' && parsed.garmentVariantId.trim()
          ? parsed.garmentVariantId.trim()
          : undefined,
      selectedColor,
      selectedSize,
      quantity,
      activeSurface,
      frontElements,
      backElements,
      pendingAction,
      savedAt: typeof parsed.savedAt === 'number' ? parsed.savedAt : Date.now(),
    };
  } catch (err) {
    console.warn('[studioStateStorage] Failed to parse studio state from localStorage:', err);
    return null;
  }
}

/**
 * Clears the active studio design state from localStorage.
 */
export function clearStudioState(): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.removeItem(STUDIO_STORAGE_KEY);
  } catch (err) {
    console.warn('[studioStateStorage] Failed to clear studio state:', err);
  }
}

/**
 * Records a pending user action ('SAVE' or 'ORDER') that should resume after authentication.
 */
export function savePendingStudioAction(action: 'SAVE' | 'ORDER'): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.setItem(PENDING_ACTION_STORAGE_KEY, action);
  } catch (err) {
    console.warn('[studioStateStorage] Failed to save pending action:', err);
  }
}

/**
 * Retrieves the pending user action recorded before authentication.
 */
export function loadPendingStudioAction(): 'SAVE' | 'ORDER' | null {
  const storage = getStorage();
  if (!storage) return null;
  try {
    const val = storage.getItem(PENDING_ACTION_STORAGE_KEY);
    if (val === 'SAVE' || val === 'ORDER') return val;
    return null;
  } catch (err) {
    console.warn('[studioStateStorage] Failed to read pending action:', err);
    return null;
  }
}

/**
 * Clears any pending studio action once resumed or cancelled.
 */
export function clearPendingStudioAction(): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.removeItem(PENDING_ACTION_STORAGE_KEY);
  } catch (err) {
    console.warn('[studioStateStorage] Failed to clear pending action:', err);
  }
}
