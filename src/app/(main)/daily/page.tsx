import { redirect } from "next/navigation";

export default function DailyWinnerPage({ searchParams }: { searchParams?: { date?: string } }) {
  const query = searchParams?.date ? `&date=${encodeURIComponent(searchParams.date)}` : "";
  redirect(`/history?section=daily${query}`);
}
