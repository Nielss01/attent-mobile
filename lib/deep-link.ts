type Listener = (momentId: string) => void;
type VoidListener = () => void;

let pendingMomentId: string | null = null;
const listeners = new Set<Listener>();

export function setPendingMoment(momentId: string) {
  pendingMomentId = momentId;
  for (const listener of listeners) {
    listener(momentId);
  }
}

export function consumePendingMoment(): string | null {
  const id = pendingMomentId;
  pendingMomentId = null;
  return id;
}

export function onMomentDeepLink(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// ---------------------------------------------------------------------------
// Holiday notification deep-link: tapping opens the notifications panel
// ---------------------------------------------------------------------------

let pendingHolidayNotification = false;
const holidayListeners = new Set<VoidListener>();

export function setPendingHolidayNotification() {
  pendingHolidayNotification = true;
  for (const listener of holidayListeners) {
    listener();
  }
}

export function consumePendingHolidayNotification(): boolean {
  const pending = pendingHolidayNotification;
  pendingHolidayNotification = false;
  return pending;
}

export function onHolidayNotification(listener: VoidListener): () => void {
  holidayListeners.add(listener);
  return () => holidayListeners.delete(listener);
}
