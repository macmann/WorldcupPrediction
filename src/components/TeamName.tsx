import { teamFlagEmoji, teamFlagImageUrl } from "@/lib/countryFlags";

type TeamNameProps = {
  name: string;
  flagEmoji?: string | null;
  flagImageUrl?: string | null;
  className?: string;
  flagClassName?: string;
  nameClassName?: string;
};

export function TeamName({ name, flagEmoji, flagImageUrl, className = "", flagClassName = "", nameClassName = "" }: TeamNameProps) {
  const flagUrl = flagImageUrl ?? teamFlagImageUrl(name);
  const fallbackFlag = teamFlagEmoji(name, flagEmoji);

  return (
    <span className={`inline-flex min-w-0 items-center gap-2 ${className}`}>
      {flagUrl ? (
        <span className={`inline-flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white shadow-sm ring-1 ring-slate-200 ${flagClassName}`}>
          <img src={flagUrl} alt={`${name} flag`} className="h-full w-full object-cover" loading="lazy" />
        </span>
      ) : fallbackFlag ? (
        <span aria-hidden="true" className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-xl shadow-sm ring-1 ring-slate-200 ${flagClassName}`}>
          {fallbackFlag}
        </span>
      ) : null}
      <span className={nameClassName}>{name}</span>
    </span>
  );
}

export function teamNameWithFlag(name: string, flagEmoji?: string | null) {
  const flag = teamFlagEmoji(name, flagEmoji);
  return flag ? `${flag} ${name}` : name;
}
