interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export function Card({ children, className = "" }: CardProps) {
  return (
    <div
      className={[
        "rounded-sm border border-stroke bg-white shadow-default",
        "dark:border-strokedark dark:bg-boxdark",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className = "" }: CardProps) {
  return (
    <div
      className={[
        "border-b border-stroke px-5 py-4 dark:border-strokedark",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}

export function CardContent({ children, className = "" }: CardProps) {
  return (
    <div className={["px-5 py-4", className].join(" ")}>{children}</div>
  );
}
