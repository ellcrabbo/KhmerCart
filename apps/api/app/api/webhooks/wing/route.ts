import { handlePaymentWebhookRequest } from "../_lib/webhooks";

export async function POST(request: Request) {
  return handlePaymentWebhookRequest(request, "WING");
}
