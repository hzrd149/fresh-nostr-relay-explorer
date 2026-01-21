import { useEffect } from "preact/hooks";
import { BehaviorSubject, Observable } from "rxjs";

export default function useSubscription<T>(
  input?: BehaviorSubject<T>,
): void;
export default function useSubscription<T>(input?: Observable<T>): void;
export default function useSubscription<T>(
  input: () => Observable<T>,
  deps: unknown[],
): void;
export default function useSubscription<T>(
  input?: Observable<T> | BehaviorSubject<T> | (() => Observable<T>),
  deps?: unknown[],
): void {
  useEffect(() => {
    const sub = (typeof input === "function" ? input() : input)?.subscribe();
    return () => sub?.unsubscribe();
  }, deps ?? [input]);
}
