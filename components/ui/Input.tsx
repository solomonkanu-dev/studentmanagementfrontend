import { type InputHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = "", id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
    const errorId = error ? `${inputId}-error` : undefined;
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-black dark:text-white"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          aria-describedby={errorId}
          aria-invalid={error ? true : undefined}
          className={[
            "h-9 w-full rounded border border-stroke bg-transparent px-3 text-sm",
            "text-black placeholder:text-body",
            "outline-none transition focus:border-primary active:border-primary",
            "dark:border-strokedark dark:bg-meta-4 dark:text-white dark:focus:border-primary",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            error ? "!border-meta-1" : "",
            className,
          ].join(" ")}
          {...props}
        />
        {error && (
          <p id={errorId} role="alert" className="text-xs text-meta-1">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
