import { PlatformScreen } from "@/components/PlatformScreen";
export default function Page({ params }: { params: { id: string } }) { return <PlatformScreen page="leagues" leagueId={params.id} />; }
