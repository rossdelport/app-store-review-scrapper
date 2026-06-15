"use client";

import { useState } from "react";
import { DownloadIcon, CloseIcon, CheckIcon } from "@/components/icons";

/** Modal that shows a generated build-spec prompt with copy + download actions.
 *  Shared by the standalone /analyze page and project detail pages. */
export default function PromptModal({
  prompt,
  filenameBase,
  onClose,
}: {
  prompt: string;
  filenameBase: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(prompt).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function download() {
    const blob = new Blob([prompt], { type: "text/markdown;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(filenameBase || "app").toLowerCase().replace(/[^a-z0-9]+/g, "-") || "app"}-build-spec.md`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Build spec for Claude Code</h2>
            <p className="text-xs text-slate-400">{prompt.length.toLocaleString()} characters — paste this into Claude Code</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={copy}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-slate-800"
            >
              {copied ? <CheckIcon className="h-4 w-4" /> : null}
              {copied ? "Copied" : "Copy"}
            </button>
            <button
              onClick={download}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <DownloadIcon className="h-4 w-4" /> .md
            </button>
            <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
              <CloseIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
        <pre className="scroll-thin overflow-auto whitespace-pre-wrap p-5 text-sm leading-relaxed text-slate-800">
          {prompt}
        </pre>
      </div>
    </div>
  );
}
