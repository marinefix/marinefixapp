interface Env {
    FEEDBACK_WEBHOOK_URL: string;
  }
  
  export const onRequestPost: PagesFunction<Env> = async ({
    request,
    env,
  }) => {
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
  
      const response = await fetch(env.FEEDBACK_WEBHOOK_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type,
          rating,
          message,
          email: data.email?.trim() || "",
          page: data.page || "home",
          device: data.device || "unknown",
        }),
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