import { teamFlagEmoji } from "@/lib/countryFlags";

type TeamNameProps = {
  name: string;
  flagEmoji?: string | null;
  className?: string;
  flagClassName?: string;
  nameClassName?: string;
};

export function TeamName({ name, flagEmoji, className = "", flagClassName = "", nameClassName = "" }: TeamNameProps) {
  const flag = teamFlagEmoji(name, flagEmoji);

  return (
    <span className={`inline-flex min-w-0 items-center gap-2 ${className}`}>
      {flag && (
        <span aria-hidden="true" className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-xl shadow-sm ring-1 ring-slate-200 ${flagClassName}`}>
          {flag}
        </span>
      )}
      <span className={nameClassName}>{name}</span>
    </span>
  );
}

export function teamNameWithFlag(name: string, flagEmoji?: string | null) {
  const flag = teamFlagEmoji(name, flagEmoji);
  return flag ? `${flag} ${name}` : name;
}
