interface Env {
  ADMIN_SECRET: string;
}

const SESSION_MAX_AGE_MS = 60 * 60 * 1000;

async function verifyToken(token: string, secret: string): Promise<boolean> {
  if (!secret) return false;

  const [timestamp, signature] = token.split(".");
  const tokenTime = Number(timestamp);
  if (!timestamp || !signature || !Number.isFinite(tokenTime)) return false;

  const age = Date.now() - tokenTime;
  if (age < 0 || age >= SESSION_MAX_AGE_MS) return false;

  try {
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );
    const signatureBytes = new Uint8Array(
      signature.match(/.{1,2}/g)?.map((byte) => parseInt(byte, 16)) || []
    );
    if (signatureBytes.length !== 32) return false;

    return await crypto.subtle.verify(
      "HMAC",
      key,
      signatureBytes,
      new TextEncoder().encode(timestamp)
    );
  } catch {
    return false;
  }
}

async function createToken(secret: string): Promise<string> {
  const timestamp = Date.now().toString();
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(timestamp)
  );
  const signatureHex = Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
  return `${timestamp}.${signatureHex}`;
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const cookie = request.headers.get("Cookie") || "";
  const match = cookie.match(/(?:^|;\s*)marinefix_admin=([^;]+)/);
  if (!match || !(await verifyToken(match[1], env.ADMIN_SECRET))) {
    return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  }

  const token = await createToken(env.ADMIN_SECRET);
  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      "Set-Cookie": `marinefix_admin=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=3600`,
    },
  });
};
