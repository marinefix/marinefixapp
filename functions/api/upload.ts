interface Env {
  STORAGE: R2Bucket;
}

const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15 MB

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
]);

function jsonResponse(
  data: Record<string, unknown>,
  status = 200
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

export const onRequestPost: PagesFunction<Env> = async ({
  request,
  env,
}) => {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return jsonResponse(
        {
          success: false,
          error: "No file provided",
        },
        400
      );
    }

    if (file.size === 0) {
      return jsonResponse(
        {
          success: false,
          error: "Empty file is not allowed",
        },
        400
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return jsonResponse(
        {
          success: false,
          error: "File size must not exceed 15 MB",
        },
        413
      );
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return jsonResponse(
        {
          success: false,
          error: "Only JPG, PNG, WEBP, GIF images and PDF files are allowed",
        },
        415
      );
    }

    const extension = file.name.includes(".")
      ? file.name.substring(file.name.lastIndexOf(".")).toLowerCase()
      : "";

    const safeExtension = extension.replace(/[^a-z0-9.]/g, "");

    const key = `${crypto.randomUUID()}${safeExtension}`;

    await env.STORAGE.put(key, file.stream(), {
      httpMetadata: {
        contentType: file.type,
        cacheControl: "public, max-age=31536000, immutable",
      },
    });

    return jsonResponse({
      success: true,
      url: `/api/upload?key=${encodeURIComponent(key)}`,
    });
  } catch {
    return jsonResponse(
      {
        success: false,
        error: "Upload failed",
      },
      500
    );
  }
};

export const onRequestGet: PagesFunction<Env> = async ({
  request,
  env,
}) => {
  try {
    const url = new URL(request.url);
    const key = url.searchParams.get("key");

    if (!key) {
      return new Response("Missing key", {
        status: 400,
      });
    }

    const object = await env.STORAGE.get(key);

    if (!object) {
      return new Response("File not found", {
        status: 404,
      });
    }

    const headers = new Headers();

    object.writeHttpMetadata(headers);

    headers.set(
      "Cache-Control",
      "public, max-age=31536000, immutable"
    );

    headers.set("ETag", object.httpEtag);

    return new Response(object.body, {
      headers,
    });
  } catch {
    return new Response("Failed to retrieve file", {
      status: 500,
    });
  }
};