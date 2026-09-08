"use client";

import { forwardRef, useEffect, useId, useRef, useState } from "react";

type Props = {
  length?: number;
  label?: string;
  error?: string;
  disabled?: boolean;
  "data-testid"?: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "size">;

/**
 * Segmented verification-code field.
 *
 * One real input spans the whole control and is rendered transparent; the cells
 * below are presentational. This is deliberate: paste, iOS SMS autofill via
 * autocomplete="one-time-code", password managers, IME and mobile keyboards all
 * keep working because the browser still sees a single ordinary text field.
 * Six separate inputs would break most of that and have to reimplement it.
 *
 * Colors come from the Yeda design tokens in ./tokens.css, so light and dark
 * both follow whatever theme ZITADEL's provider has set on <html>.
 */
export const OTPInput = forwardRef<HTMLInputElement, Props>(function OTPInput(
  { length = 6, label, error, disabled, className, onChange, onBlur, name, "data-testid": testId, ...rest },
  ref,
) {
  const [value, setValue] = useState(() =>
    rest.defaultValue != null ? String(rest.defaultValue) : rest.value != null ? String(rest.value) : "",
  );
  const [focused, setFocused] = useState(false);
  const [caret, setCaret] = useState(0);
  const inner = useRef<HTMLInputElement | null>(null);
  const id = useId();
  const errorId = `${id}-error`;

  // The field stays uncontrolled so react-hook-form (and autofill, and the
  // prefilled ?code= link) can write straight to the element; `value` is only a
  // mirror for painting the cells and is re-synced from the DOM after render.
  useEffect(() => {
    const current = inner.current?.value ?? "";
    if (current !== value) setValue(current);
  }, [value]);

  const cells = Array.from({ length }, (_, i) => value[i] ?? "");
  const activeIndex = Math.min(focused ? caret : -1, length - 1);

  return (
    <div className={className}>
      {label && (
        <label htmlFor={id} className="sr-only">
          {label}
        </label>
      )}

      <div className="relative" dir="ltr">
        <input
          {...rest}
          id={id}
          name={name}
          ref={(node) => {
            inner.current = node;
            if (typeof ref === "function") ref(node);
            else if (ref) ref.current = node;
          }}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={length}
          disabled={disabled}
          data-testid={testId}
          aria-label={label}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : undefined}
          className="absolute inset-0 z-10 h-full w-full cursor-text appearance-none !border-0 bg-transparent text-transparent caret-transparent !shadow-none !outline-none focus:!ring-0 focus:!outline-none focus-visible:!ring-0 focus-visible:!outline-none disabled:cursor-not-allowed"
          onChange={(event) => {
            // Digits only, but strip after the browser has done paste/autofill.
            const next = event.target.value.replace(/\D/g, "").slice(0, length);
            setValue(next);
            setCaret(next.length);
            event.target.value = next;
            onChange?.(event);
          }}
          onSelect={(event) => setCaret(event.currentTarget.selectionStart ?? 0)}
          onKeyUp={(event) => setCaret(event.currentTarget.selectionStart ?? 0)}
          onFocus={(event) => {
            setFocused(true);
            setCaret(event.currentTarget.selectionStart ?? 0);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
        />

        <div className="pointer-events-none flex justify-center" aria-hidden="true">
          <div className="yeda-otp-cells flex divide-x divide-[#d5d8ef] overflow-hidden rounded-lg border border-[#d5d8ef] dark:divide-[rgba(255,255,255,0.18)] dark:border-[rgba(255,255,255,0.18)]">
            {cells.map((char, index) => {
              const isActive = index === activeIndex || (activeIndex >= length && index === length - 1);
              return (
                <div
                  key={index}
                  className={[
                    "flex items-center justify-center font-semibold transition-colors",
                    length > 6 ? "h-12 w-8 text-base sm:h-14 sm:w-11 sm:text-[1.25rem]" : "h-14 w-12 text-[1.25rem] sm:w-14",
                    "bg-white text-[#1b1b1e] dark:bg-[#111318] dark:text-[#ffffff]",
                    isActive
                      ? "bg-[#0a59eb]/5 ring-2 ring-[#0a59eb] ring-inset dark:bg-[#1170ff]/10 dark:ring-[#1170ff]"
                      : "",
                    error ? "text-[hsl(var(--destructive))]" : "",
                    disabled ? "opacity-50" : "",
                  ].join(" ")}
                >
                  {char ||
                    (isActive && !char ? (
                      <span className="animate-pulse font-normal text-[#0a59eb] dark:text-[#1170ff]">|</span>
                    ) : (
                      ""
                    ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {error && (
        <p id={errorId} className="text-14px mt-2 text-center text-[hsl(var(--destructive))]">
          {error}
        </p>
      )}
    </div>
  );
});
