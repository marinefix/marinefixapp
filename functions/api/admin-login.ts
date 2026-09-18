interface Env {
  ADMIN_SECRET: string;
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
  try {
    const body = await request.json<{ passcode?: string }>();
    const passcode = body.passcode?.trim();

    if (!passcode || passcode !== env.ADMIN_SECRET) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid credentials" }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const token = await createToken(env.ADMIN_SECRET);
    const secureCookie = new URL(request.url).protocol === "https:"
      ? "; Secure"
      : "";

    return new Response(
      JSON.stringify({ success: true }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Set-Cookie": `marinefix_admin=${token}; HttpOnly${secureCookie}; SameSite=Strict; Path=/; Max-Age=28800`,
        },
      }
    );
  } catch {
    return new Response(
      JSON.stringify({ success: false, error: "Invalid request" }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};