interface TableProps {
  children: React.ReactNode;
  className?: string;
}

export function Table({ children, className = "" }: TableProps) {
  return (
    <div className="w-full overflow-x-auto">
      <table className={["w-full text-sm", className].join(" ")}>
        {children}
      </table>
    </div>
  );
}

export function TableHead({ children }: { children: React.ReactNode }) {
  return (
    <thead className="border-b border-stroke bg-whiter dark:border-strokedark dark:bg-meta-4">
      {children}
    </thead>
  );
}

export function TableBody({ children }: { children: React.ReactNode }) {
  return (
    <tbody className="divide-y divide-stroke dark:divide-strokedark">
      {children}
    </tbody>
  );
}

export function Th({ children, className = "" }: TableProps) {
  return (
    <th
      className={[
        "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-body dark:text-bodydark",
        className,
      ].join(" ")}
    >
      {children}
    </th>
  );
}

export function Td({ children, className = "", ...props }: TableProps & React.TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td
      className={[
        "px-4 py-3 text-black dark:text-white",
        className,
      ].join(" ")}
      {...props}
    >
      {children}
    </td>
  );
}
