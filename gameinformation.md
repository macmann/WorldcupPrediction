# Football Fantasy Myanmar - WC 2026 Game Information

_Last updated: June 4, 2026_

## 1. App Functionality

Football Fantasy Myanmar - WC 2026 is a football prediction game for the FIFA World Cup 2026. Players sign in, predict match results, make tournament award picks, join leaderboards, and compare scores with friends.

### 1.1 User accounts and access

- Users can register, sign in, sign out, reset forgotten passwords, and change passwords.
- The app stores a user profile with display name, email address, optional phone number, avatar URL, language preference, registration date, total points, exact-score count, correct-outcome count, and onboarding status.
- Banned users may be blocked from using the app. A ban reason and ban timestamp may be stored for moderation purposes.
- Admin users have access to admin tools for managing matches, users, leagues, announcements, messages, public settings, tournaments, players, and scoring operations.

### 1.2 Match prediction

- Users can predict every enabled, scheduled match before kickoff.
- A match prediction contains:
  - the selected result: home win, draw, or away win;
  - the predicted home score;
  - the predicted away score.
- The app checks that the scoreline matches the selected result. For example, a draw selection must use equal scores, and a home-win selection must use a higher home score than away score.
- Predictions lock automatically at kickoff based on server time.
- Disabled matches, inactive tournaments, and matches that have already kicked off are not available for new predictions or edits.
- Finished matches are scored from the standard-time score when available. If a 90-minute score exists, that score is used before any full-time fallback score.

### 1.3 Tournament outright picks

- Users can submit tournament picks for:
  - Tournament Winner;
  - 2nd Runner-up;
  - FIFA Fair Play Trophy;
  - Golden Ball;
  - Golden Glove;
  - Golden Boot;
  - FIFA Young Player Award.
- Outright picks are submitted during onboarding or from the winners/outright area of the app.
- All outright selections must belong to the same tournament.
- Award player selections must come from the active player catalog source selected by the app administrator.
- Golden Glove selections must be goalkeepers.
- Golden Boot selections cannot be goalkeepers.
- Outright picks lock at the first Round of 16 kickoff. If the Round of 16 schedule is unavailable, the app falls back to the configured outright lock time or the tournament start time.
- The current automated outright settlement awards points for Golden Ball and Golden Glove picks when an administrator settles the tournament awards.

### 1.4 Leaderboards and leagues

- Users have a global score made from scored match predictions and settled outright points.
- Users can create or join private leagues with a join code.
- League tables allow players to compare performance with friends or communities.
- Leaderboards use total points and prediction accuracy statistics such as exact scores and correct outcomes.
- Rank snapshots may be captured to show movement over time.

### 1.5 Prediction history and daily results

- Users can view prediction history after matches are scored.
- Daily winner and daily ranking screens summarize performance for finished matchdays.
- Share-card data may be generated so users can share daily prediction results.

### 1.6 Live data, fixtures, and scoring jobs

- The app can sync tournaments, teams, players, fixtures, live scores, and final scores from configured football data providers.
- Background jobs handle fixture synchronization, live-score polling, and scoring recalculation.
- Administrators can manually sync matches, override match scores/statuses, enable or disable matches, and recalculate scoring.

### 1.7 Announcements, messages, and public content

- Active announcements can be displayed to users with a title, description, image, optional link, and display frequency.
- Admin messages can be sent to all users, individual users, or selected leagues.
- Users can mark messages as read or delete message receipts.
- Public game rules and terms-and-conditions content can be configured by administrators and displayed inside the user profile area.

### 1.8 Language and device support

- The app supports English and Myanmar language labels.
- Users can save a preferred language.
- The web app includes progressive-web-app assets such as a manifest, service worker, icons, and generated screenshots.

## 2. Game Rules

### 2.1 Eligibility

1. A player must create an account and remain in good standing to participate.
2. Each user may submit one prediction per match.
3. Each user may submit one set of tournament outright picks.
4. Players must not use multiple accounts, automated abuse, tampering, or any activity intended to gain an unfair advantage.

### 2.2 Match prediction deadlines

1. Match predictions are editable only while the match is enabled, scheduled, and before kickoff.
2. The lock deadline is enforced by server time, not by the user's device clock.
3. After kickoff, predictions for that match are locked and cannot be changed.
4. If a match is disabled or its tournament is inactive, the app may reject predictions for that match.

### 2.3 Valid match prediction format

1. A valid prediction must include both a result selection and an exact scoreline.
2. The selected result and scoreline must agree:
   - Home win: home score must be greater than away score.
   - Draw: home score must equal away score.
   - Away win: away score must be greater than home score.
3. Scores must be non-negative whole numbers.
4. The app currently accepts predicted scores from 0 to 30 for each team.

### 2.4 Match scoring

Match predictions are scored after a match is marked as finished and has a standard-time score.

| Prediction achievement | Points |
| --- | ---: |
| Correct result only | 1 |
| Exact scoreline | 3 additional points |
| Correct result + exact scoreline | 4 total points |
| Incorrect result and incorrect scoreline | 0 |

Examples:

- Actual score: Team A 2-1 Team B. Prediction: Team A win, 2-1. Result: 4 points.
- Actual score: Team A 2-1 Team B. Prediction: Team A win, 3-1. Result: 1 point.
- Actual score: Team A 2-1 Team B. Prediction: draw, 1-1. Result: 0 points.

### 2.5 Standard-time score rule

1. The app scores matches using standard-time scores when those scores are available.
2. For knockout matches, this means prediction scoring is based on the 90-minute score if stored by the app.
3. If the standard-time score fields are not available, the app falls back to the stored home and away score.
4. Penalty shootouts are not part of match-prediction scoreline scoring unless the stored match score itself reflects the value used by administrators.

### 2.6 Outright pick deadlines

1. Tournament outright picks are editable until the outright lock deadline.
2. The primary outright lock deadline is the first Round of 16 kickoff.
3. If that match is not available in the app, administrators may rely on a configured lock time or tournament start time fallback.
4. After the lock deadline, outright picks cannot be changed.

### 2.7 Outright pick validation

1. All teams and players in one outright entry must belong to the same tournament.
2. Player award picks must use the active player list selected by administrators.
3. Golden Glove picks must be goalkeepers.
4. Golden Boot picks must not be goalkeepers.
5. The app may reject missing, invalid, unavailable, or outdated selections.

### 2.8 Outright scoring

The current automated outright settlement awards:

| Outright award | Points |
| --- | ---: |
| Correct Golden Ball pick | 5 |
| Correct Golden Glove pick | 3 |

Administrators settle these awards after official results are known. Other collected tournament picks may be used for app display, community engagement, future rules, manual promotions, or administrator-defined use, but they are not part of the current automated outright settlement unless the app is updated.

### 2.9 Ranking and tie-breakers

1. Users are ranked primarily by total points.
2. Exact-score count and correct-outcome count are tracked as accuracy statistics and may be used as tie-breakers in leaderboard views.
3. Earlier registration time may be used as an additional tie-breaker where configured.
4. Private league leaderboards use the same player score data for users in that league.

### 2.10 Scoring corrections

1. Scores may be recalculated if match data is corrected or an administrator overrides a result.
2. A recalculation can update points, exact-score flags, correct-outcome flags, and global totals.
3. If a provider changes fixture or score data, the app may sync and update records according to administrator settings.
4. Administrator decisions and official source data are final for in-app scoring.

## 3. Terms and Conditions

### 3.1 Acceptance of terms

By creating an account, submitting predictions, joining leagues, or using the app, you agree to follow these Terms and Conditions, the Game Rules, and any instructions shown inside the app.

### 3.2 Entertainment purpose

The app is intended for football entertainment, fantasy competition, social leaderboards, and community engagement. It is not an official FIFA product and does not guarantee prizes, rewards, betting outcomes, or financial returns.

### 3.3 Account responsibility

- You are responsible for keeping your login details secure.
- You must provide accurate account information where required.
- You must not impersonate another person or create accounts for abusive purposes.
- The app team may restrict, suspend, ban, or remove accounts that violate these terms or harm the service.

### 3.4 Fair play

You agree not to:

- exploit bugs or security weaknesses;
- submit fraudulent or automated activity;
- interfere with scoring, fixtures, leaderboards, or other users;
- attempt unauthorized access to admin tools, APIs, databases, or infrastructure;
- harass, abuse, threaten, or spam other users.

### 3.5 Predictions, scoring, and results

- Predictions must be submitted before their applicable deadlines.
- Server time is used for lock deadlines.
- The app may rely on third-party football data providers, manual administrator updates, or both.
- Scores, statuses, fixtures, player catalogs, and award results may be corrected when official or administrator-reviewed information changes.
- The app team may recalculate leaderboards after corrections.

### 3.6 Leagues and user content

- Private league names, display names, messages, and shared content must be respectful and lawful.
- The app team may remove inappropriate names, messages, announcements, or content.
- League join codes may be shared by users at their own discretion.

### 3.7 Communications

- The app may show announcements, system messages, league messages, account messages, and administrative notices.
- Password reset messages may be sent by email when email delivery is configured.
- Users may receive important service, security, scoring, or game-related communications.

### 3.8 Data and privacy

- The app stores account, prediction, league, message, announcement-view, session, and scoring data needed to operate the game.
- Passwords are stored as hashes, not plain text.
- Session tokens and password reset tokens are stored as hashes where applicable.
- Users should not submit sensitive personal information that is not requested by the app.
- Operational logs may contain technical events necessary for debugging, security, and maintenance.

### 3.9 Availability and changes

- The app may be unavailable during maintenance, outages, provider failures, migrations, or unexpected technical issues.
- Features, scoring rules, deadlines, terms, and content may be updated when necessary.
- Administrators may enable maintenance mode or operational controls to protect the service.

### 3.10 Third-party services

The app may use hosted database, Redis, football-data, email, deployment, analytics, or other third-party services. Their availability and data accuracy can affect app behavior.

### 3.11 Limitation of liability

To the fullest extent permitted by applicable law, the app team is not responsible for indirect losses, missed predictions, delayed data, provider errors, device issues, network problems, or leaderboard changes caused by corrections or service interruptions.

### 3.12 Final decisions

Administrator decisions about rule enforcement, scoring corrections, account restrictions, league moderation, and tournament settlement are final within the app.

## 4. Player Quick Guide

1. Create an account or sign in.
2. Complete onboarding by choosing tournament outright picks.
3. Go to the Predict tab before each kickoff.
4. Choose home win, draw, or away win.
5. Enter the exact scoreline and save.
6. Join or create private leagues to compete with friends.
7. Check leaderboards, daily winners, and prediction history after matches are scored.
8. Review profile messages, game rules, and terms inside the app.
