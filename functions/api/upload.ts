interface Env {
  STORAGE: R2Bucket;
}

const MAX_FILE_SIZE = 15 * 1024 * 1024; // Final stored file limit
const MAX_VIDEO_FILE_SIZE = 15 * 1024 * 1024; // Videos arrive here after client compression

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const ALLOWED_VIDEO_TYPES = new Set([
  "video/webm",
  "video/mp4",
  "video/quicktime",
  "video/x-m4v",
]);

const ALLOWED_WORD_TYPES = new Set([
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

function getExtension(name: string): string {
  return name.includes(".")
    ? name.substring(name.lastIndexOf(".")).toLowerCase()
    : "";
}

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

    const extension = getExtension(file.name);
    const isImage = ALLOWED_IMAGE_TYPES.has(file.type) || /^\.(jpg|jpeg|png|webp|gif)$/.test(extension);
    const isPdf = file.type === "application/pdf" || extension === ".pdf";
    const isVideo = ALLOWED_VIDEO_TYPES.has(file.type) || /^\.(webm|mp4|m4v|mov)$/.test(extension);
    const isWord = ALLOWED_WORD_TYPES.has(file.type) || /^\.(doc|docx)$/.test(extension);

    if (!isImage && !isPdf && !isVideo && !isWord) {
      return jsonResponse(
        {
          success: false,
          error: "Only image, video, PDF, DOC and DOCX files are allowed",
        },
        415
      );
    }

    const maxSize = isVideo ? MAX_VIDEO_FILE_SIZE : MAX_FILE_SIZE;
    if (file.size > maxSize) {
      return jsonResponse(
        {
          success: false,
          error: isVideo
            ? "Compressed video must be 15 MB or smaller"
            : "File size must not exceed 15 MB",
        },
        413
      );
    }

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