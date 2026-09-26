import { useState } from "react";
import { ShieldAlert, X, KeyRound, Eye, EyeOff } from "lucide-react";
import { authenticateAdmin } from "../lib/adminAuth";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

export function AdminLoginModal({ isOpen, onClose, onSuccess }: Props) {
  const [passcode, setPasscode] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (loading) return;

    setLoading(true);
    setError(false);

    const success = await authenticateAdmin(passcode);

    if (success) {
      setPasscode("");
      setLoading(false);
      onSuccess();
    } else {
      setError(true);
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0b1329] border border-slate-700 rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl animate-fade-in text-slate-100">
        <div className="flex justify-between items-center pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-amber-400" />
            <h3 className="font-bold text-sm text-white">Admin Mode</h3>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-slate-300 block mb-1.5 font-medium">
              Enter Admin Secret Passcode
            </label>

            <div className="relative flex items-center">
              <KeyRound className="h-4 w-4 text-slate-400 absolute left-3 pointer-events-none" />

              <input
                type={showPass ? "text" : "password"}
                value={passcode}
                onChange={(e) => {
                  setPasscode(e.target.value);
                  setError(false);
                }}
                placeholder="Enter passcode"
                style={{ backgroundColor: "#152238", color: "#38bdf8" }}
                className="w-full border border-slate-600 rounded-xl pl-9 pr-10 py-2.5 text-sm font-semibold tracking-wider placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                autoFocus
                disabled={loading}
              />

              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3 text-slate-400 hover:text-cyan-400 cursor-pointer"
                title={showPass ? "Hide passcode" : "Show passcode"}
                disabled={loading}
              >
                {showPass ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>

            {error && (
              <p className="text-[11px] text-rose-400 mt-1.5 font-medium">
                Invalid secret passcode.
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-3.5 py-1.5 rounded-lg border border-slate-700 text-xs text-slate-300 hover:bg-slate-800 transition cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading}
              className="px-4 py-1.5 rounded-lg bg-cyan-400 text-slate-950 text-xs font-bold hover:bg-cyan-300 transition cursor-pointer disabled:opacity-50"
            >
              {loading ? "Checking..." : "Unlock Mode"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}