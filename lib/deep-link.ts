type Listener = (momentId: string) => void;

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
