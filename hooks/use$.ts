// deno-lint-ignore-file react-rules-of-hooks
import { useSyncExternalStore } from "preact/compat";
import { useCallback, useMemo, useRef } from "preact/hooks";
import { BehaviorSubject, type Observable, of, Subscription, take } from "rxjs";

export function use$<T>(input?: BehaviorSubject<T>): T;
export function use$<T>(input?: Observable<T> | undefined): T | undefined;
export function use$<T>(
  input: () => Observable<T> | undefined,
  deps: unknown[],
): T | undefined;
export function use$<T>(
  input?:
    | Observable<T>
    | BehaviorSubject<T>
    | (() => Observable<T> | undefined),
  deps?: unknown[],
): T | undefined {
  const state$: Observable<T | undefined> = useMemo(
    () => (typeof input === "function" ? input() : input) ?? of(undefined),
    deps ?? [input],
  );

  const valueRef = useRef<T | undefined>(
    state$ instanceof BehaviorSubject ? state$.getValue() : undefined,
  );
  const subRef = useRef<Subscription | null>(null);
  const callbackRef = useRef<(() => void) | null>(null);

  const subscribe = useCallback(
    (callback: () => void) => {
      // Store the callback
      callbackRef.current = callback;

      // Subscribe if not already subscribed
      if (!subRef.current) {
        subRef.current = state$.subscribe((v) => {
          valueRef.current = v;
          callbackRef.current?.();
        });
      } else {
        // If subscription already exists (created in getSnapshot), update it
        // by creating a new subscription with the callback
        subRef.current.unsubscribe();
        subRef.current = state$.subscribe((v) => {
          valueRef.current = v;
          callbackRef.current?.();
        });
      }

      return () => {
        subRef.current?.unsubscribe();
        subRef.current = null;
        callbackRef.current = null;
      };
    },
    [state$],
  );

  const getSnapshot = useCallback(() => {
    // Server snapshot
    if (typeof window === "undefined") {
      // On server: use take(1) and don't store the ref
      state$.pipe(take(1)).subscribe((v) => {
        valueRef.current = v;
      });
    } else if (!subRef.current) {
      // Create subscription if needed to get the initial value
      subRef.current = state$.subscribe((v) => {
        valueRef.current = v;
        // Call the callback if it exists (set by subscribe)
        callbackRef.current?.();
      });
    }

    return valueRef.current;
  }, [state$]);

  return useSyncExternalStore(subscribe, getSnapshot);
}
