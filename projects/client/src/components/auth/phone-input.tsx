import { Input } from "@/components/ui/input";
import { Smartphone } from "lucide-react";

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function PhoneInput({ value, onChange, placeholder }: PhoneInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value.replace(/\D/g, "");
    if (input.length <= 11) {
      onChange(input);
    }
  };

  return (
    <div className="relative">
      <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <div className="absolute left-10 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
        +86
      </div>
      <Input
        type="tel"
        placeholder={placeholder || "请输入手机号"}
        value={value}
        onChange={handleChange}
        className="pl-[70px]"
        maxLength={11}
      />
    </div>
  );
}
