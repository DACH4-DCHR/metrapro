import { X } from "lucide-react";
import type { HelpContent } from "../../lib/helpContent";

interface HelpPanelProps {
  content: HelpContent;
  onClose: () => void;
}

export function HelpPanel({ content, onClose }: HelpPanelProps) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label={`Ayuda: ${content.title}`}>
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />
      <div className="relative flex h-full w-full max-w-md flex-col bg-white shadow-xl">
        <div className="flex items-center justify-between gap-3 border-b border-steel-200 bg-navy-950 px-5 py-4">
          <h2 className="text-base font-bold text-white">{content.title}</h2>
          <button
            onClick={onClose}
            aria-label="Cerrar ayuda"
            className="rounded p-1.5 text-steel-300 hover:bg-white/10 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <p className="mb-5 text-sm leading-relaxed text-steel-600">{content.summary}</p>
          {content.sections.map((section, i) => (
            <div key={i} className="mb-5">
              <h3 className="mb-2 border-b border-steel-100 pb-1 text-xs font-bold uppercase tracking-wide text-navy-900">
                {section.heading}
              </h3>
              <dl className="flex flex-col gap-3">
                {section.items.map((item, j) => (
                  <div key={j}>
                    <dt className="text-sm font-semibold text-navy-800">{item.label}</dt>
                    <dd className="mt-0.5 text-sm leading-relaxed text-steel-600">{item.text}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
