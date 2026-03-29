export const ORDER_STATE_VALUES = [
  "CREATED",
  "PAYMENT_PENDING",
  "PAYMENT_CONFIRMED",
  "SELLER_CONFIRMED",
  "PACKED",
  "HANDED_TO_CARRIER",
  "IN_TRANSIT",
  "DELIVERED",
  "COMPLETED",
  "CANCELLED",
  "REFUNDED"
] as const;

export type OrderLifecycleState = (typeof ORDER_STATE_VALUES)[number];

export const ORDER_EVENT_TYPE_VALUES = [
  "CREATED",
  "STATE_CHANGED",
  "PAYMENT_CAPTURED",
  "SELLER_CONFIRMED",
  "PACKED",
  "HANDED_TO_CARRIER",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "REFUNDED",
  "NOTE_ADDED"
] as const;

export type OrderLifecycleEventType = (typeof ORDER_EVENT_TYPE_VALUES)[number];

export const ORDER_ACTOR_TYPE_VALUES = [
  "USER",
  "SYSTEM",
  "PAYMENT_PROVIDER"
] as const;

export type OrderActorType = (typeof ORDER_ACTOR_TYPE_VALUES)[number];

export type OrderActorRole = "ADMIN" | "BUYER" | "SELLER";

export type OrderTransitionActor = {
  label?: string | null;
  role?: OrderActorRole | null;
  type: OrderActorType;
  userId?: string | null;
};

export type OrderSlaConfig = {
  confirmMinutes: number | null;
  shipHours: number | null;
};

export const ORDER_TRANSITION_MATRIX: Record<
  OrderLifecycleState,
  readonly OrderLifecycleState[]
> = {
  CANCELLED: [],
  COMPLETED: ["REFUNDED"],
  CREATED: ["PAYMENT_PENDING", "SELLER_CONFIRMED", "CANCELLED"],
  DELIVERED: ["COMPLETED", "REFUNDED"],
  HANDED_TO_CARRIER: ["IN_TRANSIT", "DELIVERED", "REFUNDED"],
  IN_TRANSIT: ["DELIVERED", "REFUNDED"],
  PACKED: ["HANDED_TO_CARRIER", "CANCELLED", "REFUNDED"],
  PAYMENT_CONFIRMED: ["SELLER_CONFIRMED", "CANCELLED", "REFUNDED"],
  PAYMENT_PENDING: ["PAYMENT_CONFIRMED", "CANCELLED"],
  REFUNDED: [],
  SELLER_CONFIRMED: ["PACKED", "HANDED_TO_CARRIER", "CANCELLED", "REFUNDED"]
};

function parseOptionalPositiveInteger(value: string | undefined): number | null {
  const parsed = Number(value);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export function readOrderSlaConfig(
  env: NodeJS.ProcessEnv = process.env
): OrderSlaConfig {
  return {
    confirmMinutes: parseOptionalPositiveInteger(env.ORDER_SLA_CONFIRM_MINUTES),
    shipHours: parseOptionalPositiveInteger(env.ORDER_SLA_SHIP_HOURS)
  };
}

export function getAllowedOrderTransitions(
  fromState: OrderLifecycleState
): readonly OrderLifecycleState[] {
  return ORDER_TRANSITION_MATRIX[fromState];
}

export function canTransitionOrder(
  fromState: OrderLifecycleState,
  toState: OrderLifecycleState
): boolean {
  return fromState !== toState && ORDER_TRANSITION_MATRIX[fromState].includes(toState);
}

export class OrderStateTransitionError extends Error {
  code: string;
  fromState: OrderLifecycleState;
  toState: OrderLifecycleState;

  constructor(fromState: OrderLifecycleState, toState: OrderLifecycleState) {
    super(`ILLEGAL_TRANSITION:${fromState}->${toState}`);
    this.code = "ILLEGAL_TRANSITION";
    this.fromState = fromState;
    this.name = "OrderStateTransitionError";
    this.toState = toState;
  }
}

export function assertOrderTransition(
  fromState: OrderLifecycleState,
  toState: OrderLifecycleState
) {
  if (!canTransitionOrder(fromState, toState)) {
    throw new OrderStateTransitionError(fromState, toState);
  }
}

export function getOrderTransitionEventType(
  toState: OrderLifecycleState
): OrderLifecycleEventType {
  if (toState === "PAYMENT_CONFIRMED") {
    return "PAYMENT_CAPTURED";
  }

  if (toState === "SELLER_CONFIRMED") {
    return "SELLER_CONFIRMED";
  }

  if (toState === "PACKED") {
    return "PACKED";
  }

  if (toState === "HANDED_TO_CARRIER") {
    return "HANDED_TO_CARRIER";
  }

  if (toState === "IN_TRANSIT") {
    return "SHIPPED";
  }

  if (toState === "DELIVERED") {
    return "DELIVERED";
  }

  if (toState === "CANCELLED") {
    return "CANCELLED";
  }

  if (toState === "REFUNDED") {
    return "REFUNDED";
  }

  return "STATE_CHANGED";
}
