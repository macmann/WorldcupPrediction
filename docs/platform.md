# Platform rules and operations

## Scope and weekly loop

Select a competition and season. League seasons group fixtures into configurable Gameweeks; knockout seasons may have no Gameweeks and retain tournament stages. No core rule requires 38 weeks. EPL bootstrap is configuration only, not synthetic fixtures. Home highlights the next unfinished week with fixtures, progress, the next deadline, Banker, points, rank movement, rival, recent achievements and results. Historical seasons remain selectable.

Predictions use a home/draw/away outcome and integer scores from 0–30. The outcome must agree with the scoreline. Only explicitly migrated legacy knockout rules allow a tied scoreline with a predicted advancing team and penalty choice. Server/database time controls edits, Banker selection, season picks, bonus answers and individual prediction reveal. A postponed fixture does not reveal predictions merely because its status changed.

Modern default scoring is outcome 1 + additional exact 3 = 4. Prediction records retain base points, multiplier, upset bonus and final award. Exactly one saved prediction per user/scoring Gameweek can be Banker. Changing it is forbidden once its selected match starts. Banker doubles the base award. Optional upset bonus is added afterward, outside the multiplier. Live awards are calculated in responses and never persisted as final awards.

A moved fixture retains provider identity and internal ID. Before locking, its scoring Gameweek and Banker can move; if the destination Banker slot is occupied, the moved selection is cleared. After locking, the original deadline/scoring Gameweek is retained while the display Gameweek/date can change. Cancelled matches score zero. Postponed/unresolved matches prevent finalization. Empty weeks never finalize automatically. Admin result overrides survive provider refreshes.

## Ranking and corrections

Season ranking: total points, exact scores, correct outcomes, Gameweek wins, earlier registration, user ID. Gameweek ranking/champion: weekly points, exact scores, correct outcomes, earlier last submitted prediction timestamp, earlier registration, user ID. One champion is selected using this deterministic rule. Season points include separately auditable season-pick/bonus awards; accuracy and streaks use match predictions only.

Rebuilds acquire a season advisory lock and replay source records. A correction rebuilds base/Banker/upset points, week and season standings, chronological cumulative rank snapshots, champions, achievements, streaks, statistics and H2H. Achievements that no longer qualify are revoked while keeping their original earned date/audit record; reawarding is idempotent. Completion notifications that lose validity are revoked. Rank movement is calculated from historical snapshots. Team accuracy needs 5 scored predictions; accuracy boards require 10 scored predictions, Banker accuracy 5.

Admins can rebuild via `/admin-platform` or `npm run platform:recalculate -- <season-id>`. Status must be officially FINISHED with a valid result for authoritative match awards. Mark a season COMPLETED and rebuild to award its champion. No scheduled/live score is treated as final.

## Social play

Private leagues retain join codes and server-side membership authorization. They can link to multiple seasons without mixing scores. Creating/joining a league links it to the selected season; joining existing linked seasons preserves participant history. Rival selection requires current shared membership in a season-linked private league. Friends' predictions remain hidden until the relevant match deadline; community percentages/average scores are visible only after the viewer submits.

H2H owners lock participants before schedule generation. Persisted round-robin fixtures use sorted participant IDs, a rotating schedule and alternating home/away on repeat cycles. Odd player counts receive byes worth 0 table points. Real games award 3/1/0 for win/draw/loss. Late members remain eligible for classic scoring but cannot join a locked H2H schedule. Generation requires future Gameweeks with synced fixtures. Giant Killer compares the opponent to the H2H leader in the deterministic table immediately before that Gameweek; no award before any earlier H2H results exist. Ties use table points, prediction-point difference, prediction points for, registration and ID.

## Picks and engagement

Default season picks: champion 20, runner-up 10, four distinct top-four teams at 5 each, three relegated teams at 5 each, Golden Boot 10, Golden Glove 8, Player of Season 10, Surprise Team 5. Admins configure enabled rules, counts, points, results and deadlines. Explicit rule deadline overrides season deadline, which overrides the end of configured lock Gameweek (default 3). Missing Gameweek timing fails closed at season start. Players/teams must belong to the selected season; Golden Glove requires a goalkeeper. Settlement is administrative and recalculable, not guessed from fixtures.

Bonus questions have localized text, immutable option IDs, configurable points/deadline, active state and administratively settled answer. Answers lock on the server; points remain separate from match awards. Do not change locked answer options. Corrected settlements trigger rebuilds.

Upset scoring is optional, disabled by default, and uses only the app's community distribution frozen at the deadline. Minimum sample defaults to 20, threshold to 15%, bonus to 1. Later predictions do not alter frozen snapshots. No odds or financial game concepts are used.

AI Pundit is an optional system user with the same prediction validator and deadline as people. Provider-neutral interface currently implements OpenAI/openai-compatible chat APIs. Server credential: `AI_PUNDIT_API_KEY`. Each season configures enabled/provider/model/baseUrl/timeoutMs/maxOutputTokens. Generation metadata records successes/failures; failures never block human gameplay. Already generated/locked picks are skipped. Admin reset is restricted to unlocked picks to preserve fairness. Use a separate provider key and configure its network domain in your deployment.

Achievements are persistent definitions with JSON criteria and season-scoped earned records: Sniper, Oracle, Hot Streak, King of the Week, Season Champion, Comeback, Giant Killer; optional Wooden Spoon is disabled by default. Current/best correct and exact streaks are replayed in kickoff/ID order from scored predictions. Profiles expose season metrics and historical seasons. In-app notifications honor per-user preferences and use deduplicated event keys; existing announcement/PWA infrastructure remains. Reminder maintenance runs every five minutes.

## Administration and security

`/admin-platform` manages competitions, seasons, Gameweeks, teams, players, matches/overrides, provider/catalog syncing, rebuilds, pick rules/settlement, bonus questions/settlement, AI settings/status/reset, league-season bindings and achievement criteria. Existing admin console retains users, announcements and other stable operations. Every admin API requires existing server authorization. APIs expose public player fields, not emails/secrets. Private league details require membership.

PWA caches public static assets only; personalized navigation/API responses are fetched from the server and never cached for another signed-in account. Prediction entry remains responsive on mobile. New strings are in the English/Myanmar dictionaries; add future languages through the same store.

Football-data.org credentials and plan access are required for real EPL fixtures, results, squads and live updates. Integration tests exercise actual PostgreSQL services with synthetic test-only records, not upstream availability. No production mock fixtures are installed. Live provider and AI API access must be verified with deployment credentials.
