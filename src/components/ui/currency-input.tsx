import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface CurrencyInputProps {
  value: number;
  onChange: (value: number) => void;
  placeholder?: string;
  className?: string;
  id?: string;
  required?: boolean;
  min?: number;
}

export function CurrencyInput({
  value,
  onChange,
  placeholder = "0",
  className,
  id,
  required,
  min = 0,
}: CurrencyInputProps) {
  const formatNumber = (num: number): string => {
    if (num === 0) return "";
    return num.toLocaleString("id-ID");
  };

  const parseNumber = (str: string): number => {
    const cleaned = str.replace(/\./g, "").replace(/,/g, "");
    const parsed = parseInt(cleaned, 10);
    return isNaN(parsed) ? 0 : parsed;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    const numericValue = parseNumber(rawValue);
    onChange(Math.max(min, numericValue));
  };

  return (
    <Input
      id={id}
      type="text"
      inputMode="numeric"
      value={formatNumber(value)}
      onChange={handleChange}
      placeholder={placeholder}
      className={cn(className)}
      required={required}
    />
  );
}
