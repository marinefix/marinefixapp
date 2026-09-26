import { Mail, Wrench } from "lucide-react";

type Props = {
  contactEmail?: string;
};

export function Footer({
  contactEmail = "marinefix.official@gmail.com",
}: Props) {
  return (
    <footer className="border-t border-marine-border bg-marine-card py-6 px-6 lg:px-10 mt-auto">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
        <div className="flex items-center gap-2">
          <span className="text-blue-600 text-xl">⚓</span>
          <span className="font-bold tracking-wide text-marine-text">MARINE FIX</span>
          <span className="text-xs ml-2 text-marine-muted">
            © {new Date().getFullYear()} All rights reserved.
          </span>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-marine-muted">
          <div className="flex items-center gap-1.5">
            <Wrench className="h-3.5 w-3.5 text-blue-500" />
            <span>Built for ETOs &amp; Marine Engineers</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-marine-muted">Contact:</span>
            <a
              href={`mailto:${contactEmail}?subject=Marine%20Fix%20Support%20/%20Feedback`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-marine-border bg-marine-hover/40 text-blue-500 hover:border-blue-500/60 transition font-medium"
            >
              <Mail className="h-3.5 w-3.5" />
              <span>{contactEmail}</span>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
