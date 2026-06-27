"use client";

import { CircleHelp } from "lucide-react";
import { type ReactNode, useId, useReducer } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/Popover";
import { initialFieldHelpState, isFieldHelpOpen, reduceFieldHelpState } from "@/components/ui/fieldHelpState";
import { cn } from "@/lib/utils";

type FieldHelpProps = {
  label: string;
  content: ReactNode;
  className?: string;
  contentClassName?: string;
};

export default function FieldHelp({ label, content, className, contentClassName }: FieldHelpProps) {
  const contentId = useId();
  const [state, dispatch] = useReducer(reduceFieldHelpState, initialFieldHelpState);
  const isOpen = isFieldHelpOpen(state);

  return (
    <Popover
      open={isOpen}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          dispatch({ type: "close" });
        }
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Mostrar ayuda sobre ${label}`}
          aria-describedby={isOpen ? contentId : undefined}
          onClick={() => dispatch({ type: "toggle-pin" })}
          onFocus={() => dispatch({ type: "focus", active: true })}
          onBlur={() => dispatch({ type: "focus", active: false })}
          onMouseEnter={() => dispatch({ type: "hover", active: true })}
          onMouseLeave={() => dispatch({ type: "hover", active: false })}
          className={cn(
            "inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-text-muted transition-colors duration-150 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
            className,
          )}
        >
          <CircleHelp className="h-4 w-4" aria-hidden="true" />
        </button>
      </PopoverTrigger>

      <PopoverContent
        role="tooltip"
        align="start"
        side="top"
        sideOffset={10}
        onOpenAutoFocus={(event) => event.preventDefault()}
        onCloseAutoFocus={(event) => event.preventDefault()}
        onMouseEnter={() => dispatch({ type: "hover", active: true })}
        onMouseLeave={() => dispatch({ type: "hover", active: false })}
        className={cn(
          "w-72 min-w-0 max-w-[18rem] rounded-2xl border border-border-default/80 bg-surface px-3 py-2.5 text-left shadow-lg shadow-accent-soft/15",
          contentClassName,
        )}
      >
        <p id={contentId} className="text-xs leading-5 text-text-secondary lg:text-[11px] 2xl:text-xs">
          {content}
        </p>
      </PopoverContent>
    </Popover>
  );
}
