import {
  assertOrderTransition,
  getOrderTransitionEventType,
  type OrderLifecycleEventType,
  type OrderLifecycleState,
  type OrderTransitionActor
} from "@khmercart/core";
import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";

type DatabaseClient = Prisma.TransactionClient | typeof prisma;

export class OrderServiceError extends Error {
  code: string;
  status: number;

  constructor(code: string, message: string, status = 400) {
    super(message);
    this.code = code;
    this.name = "OrderServiceError";
    this.status = status;
  }
}

export type OrderEventMetadata = Record<string, unknown> | null | undefined;

export type AppendOrderEventInput = {
  actor: OrderTransitionActor;
  fromState?: OrderLifecycleState | null;
  message?: string | null;
  metadata?: OrderEventMetadata;
  orderId: string;
  toState?: OrderLifecycleState | null;
  type: OrderLifecycleEventType;
};

export type TransitionOrderOptions = {
  message?: string | null;
  metadata?: OrderEventMetadata;
};

export type TransitionOrderResult = {
  eventId: string;
  fromState: OrderLifecycleState;
  orderId: string;
  state: OrderLifecycleState;
  toState: OrderLifecycleState;
};

function toPrismaJsonValue(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function assertActor(input: OrderTransitionActor) {
  if (input.type === "USER" && !input.userId) {
    throw new OrderServiceError(
      "INVALID_ACTOR",
      "User-backed order transitions require a user id.",
      400
    );
  }
}

function createEventPayload(input: {
  actor: OrderTransitionActor;
  metadata?: OrderEventMetadata;
}) {
  const payload: Record<string, unknown> = {
    actor: {
      label: input.actor.label ?? null,
      role: input.actor.role ?? null,
      type: input.actor.type,
      userId: input.actor.userId ?? null
    }
  };

  if (input.metadata) {
    payload.metadata = input.metadata;
  }

  return payload;
}

function buildTransitionMessage(
  fromState: OrderLifecycleState,
  toState: OrderLifecycleState
) {
  return `Order moved from ${fromState} to ${toState}.`;
}

function createStateUpdate(
  toState: OrderLifecycleState,
  changedAt: Date
): Prisma.OrderUpdateInput {
  return {
    cancelledAt: toState === "CANCELLED" ? changedAt : undefined,
    completedAt: toState === "COMPLETED" ? changedAt : undefined,
    paidAt: toState === "PAYMENT_CONFIRMED" ? changedAt : undefined,
    state: toState
  };
}

export async function appendOrderEventInTransaction(
  tx: DatabaseClient,
  input: AppendOrderEventInput
) {
  assertActor(input.actor);

  return tx.orderEvent.create({
    data: {
      actorUserId: input.actor.userId ?? null,
      fromState: input.fromState ?? null,
      message: input.message?.trim() || null,
      orderId: input.orderId,
      payload: toPrismaJsonValue(
        createEventPayload({
          actor: input.actor,
          metadata: input.metadata
        })
      ),
      toState: input.toState ?? null,
      type: input.type
    }
  });
}

export async function appendOrderEvent(input: AppendOrderEventInput) {
  return prisma.$transaction((tx) => appendOrderEventInTransaction(tx, input));
}

async function transitionOrderWithClient(
  tx: DatabaseClient,
  orderId: string,
  toState: OrderLifecycleState,
  actor: OrderTransitionActor,
  options: TransitionOrderOptions = {}
): Promise<TransitionOrderResult> {
  assertActor(actor);

  const order = await tx.order.findUnique({
    where: {
      id: orderId
    }
  });

  if (!order) {
    throw new OrderServiceError("NOT_FOUND", "Order not found.", 404);
  }

  try {
    assertOrderTransition(order.state, toState);
  } catch (error) {
    if (error instanceof Error) {
      throw new OrderServiceError(
        "ILLEGAL_TRANSITION",
        error.message,
        409
      );
    }

    throw error;
  }

  const changedAt = new Date();
  const updatedOrder = await tx.order.update({
    data: createStateUpdate(toState, changedAt),
    where: {
      id: order.id
    }
  });
  const event = await appendOrderEventInTransaction(tx, {
    actor,
    fromState: order.state,
    message: options.message ?? buildTransitionMessage(order.state, toState),
    metadata: options.metadata,
    orderId: order.id,
    toState,
    type: getOrderTransitionEventType(toState)
  });

  return {
    eventId: event.id,
    fromState: order.state,
    orderId: updatedOrder.id,
    state: updatedOrder.state,
    toState
  };
}

export async function transitionOrder(
  orderId: string,
  toState: OrderLifecycleState,
  actor: OrderTransitionActor,
  options: TransitionOrderOptions = {}
): Promise<TransitionOrderResult> {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      return await prisma.$transaction(
        (tx) => transitionOrderWithClient(tx, orderId, toState, actor, options),
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable
        }
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2034" &&
        attempt < 3
      ) {
        continue;
      }

      throw error;
    }
  }

  throw new OrderServiceError(
    "INTERNAL_SERVER_ERROR",
    "Order transition could not be completed.",
    500
  );
}

export async function transitionOrderInTransaction(
  tx: Prisma.TransactionClient,
  orderId: string,
  toState: OrderLifecycleState,
  actor: OrderTransitionActor,
  options: TransitionOrderOptions = {}
): Promise<TransitionOrderResult> {
  return transitionOrderWithClient(tx, orderId, toState, actor, options);
}
