import { useState } from "react";
import { ArrowLeft, Send, Star, MessageSquare } from "lucide-react";
import { navigate } from "../lib/router";
import { submitFeedback } from "../lib/queries";

export function FeedbackView() {
  const [type, setType] = useState<
    "feedback" | "bug" | "feature"
  >("feedback");

  const [rating, setRating] = useState(0);
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(
    e: React.FormEvent
  ) {
    e.preventDefault();

    setError("");

    if (!rating) {
      setError("Please select a rating.");
      return;
    }

    if (!message.trim()) {
      setError("Please enter your feedback.");
      return;
    }

    setSubmitting(true);

    try {
      await submitFeedback({
        type,
        rating,
        message: message.trim(),
        email: email.trim() || undefined,
      });

      setSuccess(true);
      setRating(0);
      setMessage("");
      setEmail("");
      setType("feedback");
    } catch (err) {
      console.error(
        "Feedback submission failed:",
        err
      );

      setError(
        "Unable to submit feedback. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-full animate-fade-in">
      <div className="max-w-3xl mx-auto px-6 py-8 lg:px-10 lg:py-12">

        {/* Back */}
        <button
          type="button"
          onClick={() => navigate({ name: "home" })}
          className="inline-flex items-center gap-2 text-sm text-marine-muted hover:text-marine-accent transition mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </button>

        {/* Header */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-marine-accent/30 bg-marine-accent/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-marine-accent mb-4">
            <MessageSquare className="h-3.5 w-3.5" />
            Feedback & Suggestions
          </div>

          <h1 className="text-3xl lg:text-4xl font-bold text-marine-text">
            Help us improve Marine Fix
          </h1>

          <p className="mt-2 text-sm lg:text-base text-marine-muted">
            Tell us what you think, report a problem,
            or suggest a feature.
          </p>
        </div>

        {/* Form */}
        <div className="rounded-2xl border border-marine-border bg-marine-card p-5 lg:p-7">

          {success ? (
            <div className="py-10 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/30">
                <Send className="h-6 w-6 text-emerald-400" />
              </div>

              <h2 className="text-xl font-bold text-marine-text">
                Thank you!
              </h2>

              <p className="mt-2 text-sm text-marine-muted">
                Your feedback helps us make Marine Fix
                better for everyone.
              </p>

              <div className="mt-6 flex justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setSuccess(false)}
                  className="px-4 py-2.5 rounded-xl border border-marine-border text-sm font-semibold text-marine-text hover:border-marine-accent/50 transition"
                >
                  Send Another
                </button>

                <button
                  type="button"
                  onClick={() =>
                    navigate({ name: "home" })
                  }
                  className="px-4 py-2.5 rounded-xl bg-marine-accent text-marine-base text-sm font-semibold hover:opacity-90 transition"
                >
                  Back to Home
                </button>
              </div>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="space-y-6"
            >

              {/* Rating */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-marine-muted mb-3">
                  How was your experience?
                </label>

                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map(
                    (star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() =>
                          setRating(star)
                        }
                        className="p-1 rounded-lg hover:bg-marine-accent/10 transition"
                        aria-label={`${star} star`}
                      >
                        <Star
                          className={`h-7 w-7 ${
                            star <= rating
                              ? "fill-marine-accent text-marine-accent"
                              : "text-marine-muted"
                          }`}
                        />
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* Type */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-marine-muted mb-3">
                  What would you like to share?
                </label>

                <div className="flex flex-wrap gap-2">
                  {[
                    {
                      value: "feedback",
                      label: "Feedback",
                    },
                    {
                      value: "bug",
                      label: "Report a Bug",
                    },
                    {
                      value: "feature",
                      label: "Feature Request",
                    },
                  ].map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() =>
                        setType(
                          item.value as
                            | "feedback"
                            | "bug"
                            | "feature"
                        )
                      }
                      className={`px-4 py-2 rounded-xl text-sm font-medium border transition ${
                        type === item.value
                          ? "bg-marine-accent/15 border-marine-accent/50 text-marine-accent"
                          : "bg-marine-base border-marine-border text-marine-muted hover:border-marine-accent/30"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Message */}
              <div>
                <label
                  htmlFor="feedback-message"
                  className="block text-xs font-semibold uppercase tracking-wider text-marine-muted mb-3"
                >
                  Your message
                </label>

                <textarea
                  id="feedback-message"
                  value={message}
                  onChange={(e) =>
                    setMessage(e.target.value)
                  }
                  rows={6}
                  maxLength={1000}
                  placeholder="Tell us what you liked, what went wrong, or what you'd like to see next..."
                  className="w-full resize-none rounded-xl bg-marine-base border border-marine-border px-4 py-3 text-sm text-marine-text placeholder:text-marine-muted/60 outline-none focus:border-marine-accent/60 transition"
                />

                <div className="mt-1 text-right text-xs text-marine-muted">
                  {message.length}/1000
                </div>
              </div>

              {/* Email */}
              <div>
                <label
                  htmlFor="feedback-email"
                  className="block text-xs font-semibold uppercase tracking-wider text-marine-muted mb-3"
                >
                  Email
                  <span className="normal-case font-normal ml-1">
                    (optional)
                  </span>
                </label>

                <input
                  id="feedback-email"
                  type="email"
                  value={email}
                  onChange={(e) =>
                    setEmail(e.target.value)
                  }
                  placeholder="your@email.com"
                  className="w-full rounded-xl bg-marine-base border border-marine-border px-4 py-3 text-sm text-marine-text placeholder:text-marine-muted/60 outline-none focus:border-marine-accent/60 transition"
                />
              </div>

              {/* Error */}
              {error && (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                  {error}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3 rounded-xl bg-marine-accent text-marine-base font-semibold text-sm hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="h-4 w-4" />

                {submitting
                  ? "Submitting..."
                  : "Submit Feedback"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}