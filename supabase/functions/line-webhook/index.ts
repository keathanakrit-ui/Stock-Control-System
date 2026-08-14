import { sendPushText } from "./line.ts";

const encoder = new TextEncoder();

type LineSource = {
  type?: string;
  userId?: string;
  groupId?: string;
  roomId?: string;
};

type LineEvent = {
  type?: string;
  source?: LineSource;
  timestamp?: number;
  webhookEventId?: string;
  deliveryContext?: { isRedelivery?: boolean };
};

type LineWebhookBody = {
  destination?: string;
  events?: LineEvent[];
};

function jsonResponse(body: unknown, status = 200): Response {
  return Response.json(body, {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function timingSafeEqual(left: Uint8Array, right: Uint8Array): boolean {
  if (left.length !== right.length) return false;

  let difference = 0;
  for (let index = 0; index < left.length; index++) {
    difference |= left[index] ^ right[index];
  }
  return difference === 0;
}

function decodeBase64(value: string): Uint8Array | null {
  try {
    const binary = atob(value);
    return Uint8Array.from(binary, (character) => character.charCodeAt(0));
  } catch {
    return null;
  }
}

async function verifyLineSignature(
  rawBody: string,
  signature: string,
  channelSecret: string,
): Promise<boolean> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(channelSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const digest = new Uint8Array(
    await crypto.subtle.sign("HMAC", key, encoder.encode(rawBody)),
  );
  const suppliedDigest = decodeBase64(signature);

  return suppliedDigest !== null && timingSafeEqual(digest, suppliedDigest);
}

function logSupportedEvent(event: LineEvent): void {
  if (!event.type || !["follow", "message", "join"].includes(event.type)) {
    return;
  }

  console.info("LINE webhook event", {
    eventType: event.type,
    sourceType: event.source?.type ?? null,
    timestamp: event.timestamp ?? null,
    webhookEventId: event.webhookEventId ?? null,
    isRedelivery: event.deliveryContext?.isRedelivery ?? false,
  });
}

async function handler(request: Request): Promise<Response> {
  if (request.method === "GET") {
    return jsonResponse({ status: "ok", service: "line-webhook" });
  }

  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const channelSecret = Deno.env.get("LINE_CHANNEL_SECRET");
  if (!channelSecret) {
    console.error("LINE webhook signature configuration is incomplete");
    return jsonResponse({ error: "Service unavailable" }, 500);
  }

  const signature = request.headers.get("x-line-signature");
  if (!signature) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  const rawBody = await request.text();
  if (!await verifyLineSignature(rawBody, signature, channelSecret)) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  let payload: LineWebhookBody;
  try {
    payload = JSON.parse(rawBody) as LineWebhookBody;
  } catch {
    return jsonResponse({ error: "Invalid JSON" }, 400);
  }

  for (const event of payload.events ?? []) {
    logSupportedEvent(event);
  }

  return jsonResponse({ status: "ok" });
}

// Re-exported for future server-side workflows; it is not routed as an endpoint.
export { handler, sendPushText, verifyLineSignature };

Deno.serve(handler);
