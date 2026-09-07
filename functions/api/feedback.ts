const FEEDBACK_WEBHOOK_URL =
  "https://script.google.com/macros/s/AKfycbx6hybrDWJunEBhi0RJNU_XOs0PjB5fEOxGl7wRZjyV149hx6j5uxNOm055y-Wp-Q5r4Q/exec";

export const onRequestPost: PagesFunction = async ({ request }) => {
  try {
    const data = await request.json<{
      type?: string;
      rating?: number;
      message?: string;
      email?: string;
      page?: string;
      device?: string;
    }>();

    const rating = Number(data.rating);
    const message = data.message?.trim();

    if (!message) {
      return Response.json(
        { error: "Feedback message is required" },
        { status: 400 }
      );
    }

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return Response.json(
        { error: "Rating must be between 1 and 5" },
        { status: 400 }
      );
    }

    const type = ["feedback", "bug", "feature"].includes(data.type || "")
      ? data.type
      : "feedback";

    const body = JSON.stringify({
      type,
      rating,
      message,
      email: data.email?.trim() || "",
      page: data.page || "home",
      device: data.device || "unknown",
    });

    // First request: get Apps Script redirect URL
    const firstResponse = await fetch(FEEDBACK_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body,
      redirect: "manual",
    });

    const redirectUrl = firstResponse.headers.get("Location");

    if (!redirectUrl) {
      console.error(
        "Apps Script redirect missing:",
        firstResponse.status
      );

      return Response.json(
        { error: "Failed to connect to feedback service" },
        { status: 502 }
      );
    }

    // Second request: preserve POST after redirect
    const response = await fetch(redirectUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body,
    });

    if (!response.ok) {
      console.error(
        "Google Apps Script error:",
        response.status,
        await response.text()
      );

      return Response.json(
        { error: "Failed to send feedback" },
        { status: 502 }
      );
    }

    const result = (await response.json().catch(() => null)) as {
      success?: boolean;
    };

    if (!result || result.success !== true) {
      return Response.json(
        { error: "Failed to send feedback" },
        { status: 502 }
      );
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error("Feedback POST error:", error);

    return Response.json(
      { error: "Failed to send feedback" },
      { status: 500 }
    );
  }
};