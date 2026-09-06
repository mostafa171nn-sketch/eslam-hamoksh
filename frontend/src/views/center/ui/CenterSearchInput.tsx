import { Search } from 'lucide-react';

export function CenterSearchInput({
  value,
  onChange,
  placeholder,
  'aria-label': ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  'aria-label'?: string;
}) {
  return (
    <div className="mj-search">
      <Search className="mj-search-icon" aria-hidden />
      <input
        type="text"
        className="mj-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
      />
    </div>
  );
}