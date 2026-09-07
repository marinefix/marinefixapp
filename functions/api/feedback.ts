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

    const response = await fetch(FEEDBACK_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      redirect: "manual",
      body: JSON.stringify({
        type,
        rating,
        message,
        email: data.email?.trim() || "",
        page: data.page || "home",
        device: data.device || "unknown",
      }),
    });

    // Google Apps Script ContentService normally returns a 302 redirect.
    // The doPost() has already executed, so treat any 2xx/3xx as success.
    if (response.status >= 200 && response.status < 400) {
      return Response.json({ success: true });
    }

    console.error(
      "Google Apps Script error:",
      response.status,
      await response.text()
    );

    return Response.json(
      { error: "Failed to send feedback" },
      { status: 502 }
    );
  } catch (error) {
    console.error("Feedback POST error:", error);

    return Response.json(
      { error: "Failed to send feedback" },
      { status: 500 }
    );
  }
};