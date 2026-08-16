"use client";

import { useFormStatus } from "react-dom";
import type { ComponentProps, ReactNode } from "react";

import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";

/**
 * A submit button that knows, on its own, whether its form is in flight.
 *
 * `useFormStatus` reads the state of the nearest enclosing <form>, so this
 * needs no pending prop threaded down from wherever the action lives — which is
 * the whole point: a server action added later gets a working spinner for free
 * instead of quietly shipping a button that looks inert while it works.
 *
 * It must be a child of the form to read that status, never the component that
 * renders the form.
 */
export function SubmitButton({
  children,
  disabled,
  pendingLabel,
  ...props
}: ComponentProps<typeof Button> & {
  children: ReactNode;
  /**
   * Shown while submitting. Say what is happening ("Signing out…"), not just
   * that something is — the label is the only explanation the user gets for
   * why the page has stopped responding to them.
   */
  pendingLabel?: string;
}) {
  const { pending } = useFormStatus();

  return (
    // `disabled` is pulled out of props and OR-ed rather than spread: spreading
    // it would let a caller's `disabled={false}` re-enable the button mid-flight
    // and allow a second submit.
    <Button disabled={pending || disabled} type="submit" {...props}>
      {pending && <Spinner />}
      {pending && pendingLabel ? pendingLabel : children}
    </Button>
  );
}
