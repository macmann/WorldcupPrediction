"use client";

import { useState } from "react";
import { Card, SectionTitle } from "@/components/Cards";
import { TeamName } from "@/components/TeamName";

const tournamentGroups = [
  { group: "A", teams: ["Mexico", "South Korea", "South Africa", "Czechia"] },
  { group: "B", teams: ["Canada", "Switzerland", "Qatar", "Bosnia and Herzegovina"] },
  { group: "C", teams: ["Brazil", "Morocco", "Scotland", "Haiti"] },
  { group: "D", teams: ["USA", "Australia", "Paraguay", "Türkiye"] },
  { group: "E", teams: ["Germany", "Ecuador", "Ivory Coast", "Curaçao"] },
  { group: "F", teams: ["Netherlands", "Japan", "Tunisia", "Sweden"] },
  { group: "G", teams: ["Belgium", "Iran", "Egypt", "New Zealand"] },
  { group: "H", teams: ["Spain", "Uruguay", "Saudi Arabia", "Cape Verde"] },
  { group: "I", teams: ["France", "Senegal", "Norway", "Iraq"] },
  { group: "J", teams: ["Argentina", "Austria", "Algeria", "Jordan"] },
  { group: "K", teams: ["Portugal", "Colombia", "Uzbekistan", "DR Congo"] },
  { group: "L", teams: ["England", "Croatia", "Panama", "Ghana"] }
] as const;

export function TournamentGroupsTable() {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <Card>
      <SectionTitle eyebrow="WC26 groups" title="Tournament table" />
      <p className="mt-2 text-sm leading-6 text-slate-600">See the 12 groups and the national teams competing in each group.</p>
      <button
        type="button"
        aria-expanded={isVisible}
        aria-controls="wc26-tournament-table"
        onClick={() => setIsVisible((visible) => !visible)}
        className="mt-4 flex w-full items-center justify-between rounded-2xl bg-navy px-4 py-3 text-left text-sm font-black text-white shadow-lg shadow-slate-950/15 transition active:scale-[0.98]"
      >
        <span>{isVisible ? "Hide tournament table" : "View tournament table"}</span>
        <span aria-hidden="true" className={`text-lg transition-transform ${isVisible ? "rotate-180" : ""}`}>⌄</span>
      </button>

      {isVisible && (
        <div id="wc26-tournament-table" className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-100 text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th scope="col" className="px-3 py-3">Group</th>
                <th scope="col" className="px-3 py-3">National Teams</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {tournamentGroups.map(({ group, teams }) => (
                <tr key={group} className="align-top">
                  <th scope="row" className="px-3 py-3 text-lg font-black text-emerald-700">{group}</th>
                  <td className="space-y-2 px-3 py-3 font-bold text-slate-800">
                    {teams.map((team) => (
                      <div key={team}>
                        <TeamName name={team} flagClassName="h-6 w-6" nameClassName="leading-5" />
                      </div>
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
