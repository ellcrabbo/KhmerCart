import { readErrorMessage } from "../apps/admin/app/client-helpers";

describe("admin client helpers", () => {
  it("reads a message from a JSON error response", async () => {
    const response = new Response(JSON.stringify({ message: "Approval failed." }), {
      headers: {
        "content-type": "application/json"
      },
      status: 422
    });

    await expect(readErrorMessage(response)).resolves.toBe("Approval failed.");
  });

  it("falls back to the status text when the response body is not valid JSON", async () => {
    const response = new Response("not-json", {
      headers: {
        "content-type": "text/plain"
      },
      status: 503
    });

    await expect(readErrorMessage(response)).resolves.toBe(
      "Request failed with status 503."
    );
  });
});
