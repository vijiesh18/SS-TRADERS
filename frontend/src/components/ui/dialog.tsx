"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Lightweight portal-based modal with the same API as the previous Radix
 * dialog (Dialog / DialogContent / DialogHeader / DialogTitle / ...).
 * Renders to document.body so page-level transforms/overflow can't trap it,
 * and uses the app's warm-beige theme by default.
 */

interface DialogCtx {
  open: boolean;
  setOpen: (o: boolean) => void;
}
const Ctx = React.createContext<DialogCtx | null>(null);

function useDialogCtx() {
  const c = React.useContext(Ctx);
  if (!c) throw new Error("Dialog sub-components must be used within <Dialog>");
  return c;
}

interface DialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

function Dialog({ open: controlledOpen, onOpenChange, children }: DialogProps) {
  const [uncontrolled, setUncontrolled] = React.useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : uncontrolled;
  const setOpen = React.useCallback((o: boolean) => {
    onOpenChange?.(o);
    if (controlledOpen === undefined) setUncontrolled(o);
  }, [onOpenChange, controlledOpen]);
  return <Ctx.Provider value={{ open, setOpen }}>{children}</Ctx.Provider>;
}

function DialogTrigger({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) {
  const { setOpen } = useDialogCtx();
  if (asChild && React.isValidElement(children)) {
    const child = children as React.ReactElement<any>;
    return React.cloneElement(child, {
      onClick: (e: any) => { child.props.onClick?.(e); setOpen(true); },
    });
  }
  return <button type="button" onClick={() => setOpen(true)}>{children}</button>;
}

const DialogContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => {
    const { open, setOpen } = useDialogCtx();
    const [mounted, setMounted] = React.useState(false);

    React.useEffect(() => setMounted(true), []);

    React.useEffect(() => {
      if (!open) return;
      const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
      window.addEventListener("keydown", onKey);
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        window.removeEventListener("keydown", onKey);
        document.body.style.overflow = prev;
      };
    }, [open, setOpen]);

    if (!open || !mounted) return null;

    return createPortal(
      <div
        className="dialog-overlay"
        onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
      >
        <div
          ref={ref}
          role="dialog"
          aria-modal="true"
          className={cn("dialog-panel max-w-lg", className)}
          {...props}
        >
          {children}
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="dialog-close"
            style={{ position: "absolute", right: 16, top: 16 }}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>,
      document.body
    );
  }
);
DialogContent.displayName = "DialogContent";

function DialogClose({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) {
  const { setOpen } = useDialogCtx();
  if (asChild && React.isValidElement(children)) {
    const child = children as React.ReactElement<any>;
    return React.cloneElement(child, {
      onClick: (e: any) => { child.props.onClick?.(e); setOpen(false); },
    });
  }
  return <button type="button" onClick={() => setOpen(false)}>{children}</button>;
}

const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("flex flex-col space-y-1 text-left", className)}
    style={{ paddingBottom: 14, marginBottom: 4, borderBottom: "1px solid rgba(180,155,110,0.18)", paddingRight: 36 }}
    {...props}
  />
);

const DialogTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h2
      ref={ref}
      className={cn("leading-none", className)}
      style={{ fontFamily: "Georgia, serif", fontSize: 18, fontWeight: 700, color: "#2c2418", letterSpacing: "-0.3px", lineHeight: 1.2 }}
      {...props}
    />
  )
);
DialogTitle.displayName = "DialogTitle";

const DialogDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn(className)} style={{ fontSize: 12.5, color: "#a8937a" }} {...props} />
  )
);
DialogDescription.displayName = "DialogDescription";

const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 gap-2", className)} style={{ marginTop: 8 }} {...props} />
);

export {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogClose,
};
