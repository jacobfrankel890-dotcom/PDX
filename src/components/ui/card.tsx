import { cn } from "@/lib/utils";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: "sm" | "md" | "lg";
}

export function Card({ children, className, padding = "md" }: CardProps) {
  const paddings = { sm: "p-4", md: "p-6", lg: "p-8" };

  return (
    <div
      className={cn(
        "bg-white rounded-xl shadow-sm border border-slate-200",
        paddings[padding],
        className
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("mb-4", className)}>{children}</div>;
}

export function CardTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return <h2 className={cn("text-xl font-semibold text-pdx-blue", className)}>{children}</h2>;
}

export function CardDescription({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={cn("text-sm text-slate-500 mt-1", className)}>{children}</p>;
}
