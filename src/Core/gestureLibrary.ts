import type { HandKeypoint2D, HandKeypoint3D } from "./types";

export interface GestureRecognizerContext {
  handId: string;
  keypoints: HandKeypoint2D[] | undefined;
  keypoints3D: HandKeypoint3D[] | undefined;
  videoWidth: number;
  videoHeight: number;
  currentTimeMs: number;
  precision: number | undefined;
  observedFrameCount: number;
  hasStableHistory: boolean;
  recognizedGestures: Record<string, unknown>;
}

export interface GestureRecognizer<TResult = unknown, TState = unknown> {
  name: string;
  createInitialState: () => TState;
  recognize: (
    context: GestureRecognizerContext,
    state: TState,
  ) => TResult;
}

interface RegisteredGestureRecognizer {
  name: string;
  createInitialState: () => unknown;
  recognize: (
    context: GestureRecognizerContext,
    state: unknown,
  ) => unknown;
}

type HandGestureState = Record<string, unknown>;

export class GestureLibrary {
  private recognizers = new Map<string, RegisteredGestureRecognizer>();
  private stateByHand: Record<string, HandGestureState> = {};
  private observedFrameCountByHand: Record<string, number> = {};

  registerGesture<TResult, TState>(
    recognizer: GestureRecognizer<TResult, TState>,
  ): this {
    if (this.recognizers.has(recognizer.name)) {
      throw new Error(`Gesture "${recognizer.name}" is already registered.`);
    }

    this.recognizers.set(recognizer.name, {
      name: recognizer.name,
      createInitialState: recognizer.createInitialState,
      recognize: (context, state) =>
        recognizer.recognize(context, state as TState),
    });
    return this;
  }

  unregisterGesture(name: string): this {
    this.recognizers.delete(name);

    Object.values(this.stateByHand).forEach((handState) => {
      delete handState[name];
    });

    return this;
  }

  getGestureNames(): string[] {
    return Array.from(this.recognizers.keys());
  }

  evaluateHand(
    context: Omit<
      GestureRecognizerContext,
      "observedFrameCount" | "hasStableHistory" | "recognizedGestures"
    >,
  ): Record<string, unknown> {
    const observedFrameCount =
      (this.observedFrameCountByHand[context.handId] ?? 0) + 1;
    this.observedFrameCountByHand[context.handId] = observedFrameCount;

    const result: Record<string, unknown> = {};
    const enrichedContext: GestureRecognizerContext = {
      ...context,
      observedFrameCount,
      hasStableHistory: observedFrameCount >= 3,
      recognizedGestures: result,
    };

    const handState = (this.stateByHand[context.handId] ??= {});

    this.recognizers.forEach((recognizer, name) => {
      if (!(name in handState)) {
        handState[name] = recognizer.createInitialState();
      }

      result[name] = recognizer.recognize(
        enrichedContext,
        handState[name],
      );
    });

    return result;
  }

  pruneInactiveHands(activeHandIds: Set<string>): void {
    Object.keys(this.stateByHand).forEach((handId) => {
      if (activeHandIds.has(handId)) return;

      delete this.stateByHand[handId];
      delete this.observedFrameCountByHand[handId];
    });
  }

  reset(): void {
    this.stateByHand = {};
    this.observedFrameCountByHand = {};
  }
}
