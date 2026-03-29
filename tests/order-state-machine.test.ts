import {
  ORDER_STATE_VALUES,
  OrderStateTransitionError,
  assertOrderTransition,
  canTransitionOrder,
  getAllowedOrderTransitions,
  getOrderTransitionEventType,
  type OrderLifecycleEventType,
  type OrderLifecycleState
} from "@khmercart/core";

const EXPECTED_TRANSITIONS: Record<OrderLifecycleState, readonly OrderLifecycleState[]> = {
  CANCELLED: [],
  COMPLETED: ["REFUNDED"],
  CREATED: ["PAYMENT_PENDING", "SELLER_CONFIRMED", "CANCELLED"],
  DELIVERED: ["COMPLETED", "REFUNDED"],
  IN_TRANSIT: ["DELIVERED", "REFUNDED"],
  PACKED: ["IN_TRANSIT", "CANCELLED", "REFUNDED"],
  PAYMENT_CONFIRMED: ["SELLER_CONFIRMED", "CANCELLED", "REFUNDED"],
  PAYMENT_PENDING: ["PAYMENT_CONFIRMED", "CANCELLED"],
  REFUNDED: [],
  SELLER_CONFIRMED: ["PACKED", "CANCELLED", "REFUNDED"]
};

const EXPECTED_EVENT_TYPES: Record<OrderLifecycleState, OrderLifecycleEventType> = {
  CANCELLED: "CANCELLED",
  COMPLETED: "STATE_CHANGED",
  CREATED: "STATE_CHANGED",
  DELIVERED: "DELIVERED",
  IN_TRANSIT: "SHIPPED",
  PACKED: "PACKED",
  PAYMENT_CONFIRMED: "PAYMENT_CAPTURED",
  PAYMENT_PENDING: "STATE_CHANGED",
  REFUNDED: "REFUNDED",
  SELLER_CONFIRMED: "SELLER_CONFIRMED"
};

describe("order state machine", () => {
  it("enforces the explicit transition matrix for every state pair", () => {
    for (const fromState of ORDER_STATE_VALUES) {
      expect(getAllowedOrderTransitions(fromState)).toEqual(
        EXPECTED_TRANSITIONS[fromState]
      );

      for (const toState of ORDER_STATE_VALUES) {
        const expected = EXPECTED_TRANSITIONS[fromState].includes(toState);

        expect(canTransitionOrder(fromState, toState)).toBe(expected);

        if (expected) {
          expect(() => assertOrderTransition(fromState, toState)).not.toThrow();
        } else {
          expect(() => assertOrderTransition(fromState, toState)).toThrowError(
            new OrderStateTransitionError(fromState, toState)
          );
        }
      }
    }
  });

  it("maps each target state to the expected order event type", () => {
    for (const state of ORDER_STATE_VALUES) {
      expect(getOrderTransitionEventType(state)).toBe(EXPECTED_EVENT_TYPES[state]);
    }
  });
});
