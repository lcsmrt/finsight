# Product Ideas — Not Canonical Roadmap

**Status:** Raw backlog — ideas collected from a product brainstorm, not yet triaged or committed.  
**Last updated:** 2026-08-02  
**Next step:** Review, score, and move accepted items into [`ROADMAP.md`](./ROADMAP.md) under the proper milestone.

> This file is intentionally separate from `ROADMAP.md`. It captures "what could be great" without implying delivery order or commitment. Use it as input for prioritization exercises (MoSCoW, RICE, ICE, Kano), then migrate only the accepted items to the canonical roadmap.

---

## 1. Effortless Capture

The biggest usage drop-off is forgetting to log a transaction. Anything that lowers capture friction belongs here.

- **WhatsApp quick-capture bot (M5-02 extension)**
  - Natural-language parsing: *"gastei 45 no mercado hoje"*, *"cartão 1200 em 10x no ipad"*.
  - Voice-message transcription into a draft transaction.
  - Forwarded bank/Pix notifications parsed as candidate transactions.
  - One-tap confirmation inbox inside the app.

- **Voice assistants (Siri / Google Assistant)**
  - Shortcuts / Action Blocks: *"Log 30 reais of gasolina in finSight"* → API call.

- **Mobile share extension / quick actions**
  - Share a receipt from the bank app to finSight → pre-filled draft.
  - Home-screen long-press action: "New expense".

- **PWA / mobile-first web**
  - Installable web app, push notifications, offline read, queued writes.
  - Covers most native-app value before committing to a separate build.

- **Camera capture / OCR**
  - Receipt and invoice (NF) photo upload with OCR + QR-code reading from NFC-e.
  - Item extraction where possible, reusing `TransactionItem`.
  - Merchant/CNPJ lookup to suggest category.

## 2. Broader & Smarter Imports

Move from "Nubank CSV only" to a universal, low-maintenance import layer.

- **Multi-bank CSV/OFX/PDF/XLS support**
  - Nubank, Inter, Itaú, Bradesco, C6, PicPay, Mercado Pago, etc.
  - Separate handling for **statement** vs. **credit-card bill** imports.

- **Statement vs. bill reconciliation**
  - Avoid double-counting: a card purchase appears on the bill; the bill payment appears on the statement.
  - Match imported bill lines against existing transactions/series.

- **Smart classification & renaming rules**
  - User-defined rules (description pattern → category + rename + split).
  - ML classifier trained on the user's own history, not a generic model.

- **Deduplication engine**
  - Fuzzy matching on amount + date + card/account within a sliding window.
  - Conflict resolution UI for ambiguous matches.
  - Match imported installments against an existing series.

- **Open Banking / PSD2 (BR)**
  - Direct, user-consented connection to institutions when regulation and APIs allow.

## 3. Native Mobile Apps (React Native)

A separate app build for Android and iOS, but only after the web experience is mobile-excellent.

- **Phase 1 — PWA / mobile web parity**
  - Offline-first sync, push notifications, installable experience.

- **Phase 2 — RN MVP**
  - Login, dashboard, quick-add expense, transaction list.
  - Biometric auth, queued offline writes.

- **Phase 3 — Native affordances**
  - Share extension, widgets, camera OCR, Siri/Assistant shortcuts, geolocation tagging.

## 4. Intelligence & Insights

AI is most useful as silent automation, not as a fancy dashboard.

- **Automatic categorization**
  - Per-user classifier with explainable suggestions.

- **Anomaly detection**
  - Unusual spending, duplicate charges, missed expected transactions.

- **Cash-flow projection**
  - Timeline of expected balance based on recurring commitments and known income.

- **Savings suggestions**
  - Compare current category spend to budget/history and suggest adjustments.

- **Natural-language query/chat**
  - *"How much did I spend on Uber last quarter?"* → query + chart.

## 5. Planning, Goals & Reserves

Turn finSight from a tracker into a planner.

- **Goals / envelopes**
  - Emergency fund, travel, car, home.
  - Target amount, deadline, monthly contribution, progress bar.

- **Emergency reserve**
  - Virtual account separated from day-to-day balance.
  - Suggested target (3–12× monthly expenses).

- **Investments**
  - Manual register of holdings, contributions, and returns.
  - Future: broker integrations for consolidated net worth.

- **Budgets**
  - Per-category/month envelopes with rollover options.
  - Real-time progress inside the dashboard.

- **What-if simulator**
  - *"If I cut delivery by R$200/month, how much do I save in a year?"*
  - *"12x vs. 6x: impact on monthly cash flow?"*

## 6. Automations & Rules

Reduce repetitive manual work.

- **Automation rules**
  - On import/create matching criteria → set category, rename, split, mark recurring.

- **Smart recurrence detection**
  - Suggest turning repeated transactions into a series.
  - Alert when an expected recurrence is missing.

- **Proactive reminders**
  - Upcoming bill due dates.
  - Credit-card bill closing/vencimento.
  - Daily "nothing logged today" nudge (customizable).

## 7. Sharing & Collaboration

Complete the Shared Plans experience.

- **Server-sent invite emails**
  - Backend sends the invitation link by email instead of relying on copy-paste.
  - Requires email provider integration (Resend/SendGrid/SES) and `FRONTEND_BASE_URL`.

- **Finer privacy controls**
  - Private categories or hidden transactions inside a shared plan.

- **Activity notifications**
  - "Livia added R$150 in Supermercado."

## 8. Data, Privacy & Export

Trust and ownership of data.

- **Receipt/invoice attachments**
  - Encrypted storage (S3/R2/MinIO) linked to transactions.

- **Backup & export**
  - CSV/Excel/PDF export by period.
  - Automated backup to Google Drive / iCloud.

- **Privacy-first options**
  - Optional end-to-end encryption for bank data.

## 9. Mobile-First UX Polish

Small things that make daily use on a phone much better.

- Balance / daily-spend widgets.
- Dark mode and accessibility improvements.
- Swipe actions on transaction list.
- Daily reminder with smart timing.
- Offline-first: write now, sync later.

## 10. Ecosystem & "Blue Sky"

Ideas that are valuable but likely further out or dependent on external factors.

- **Calendar integration** — show due dates and income on Google/Apple Calendar.
- **Multi-currency / travel mode** — log expenses in USD/EUR with daily exchange rate.
- **Light gamification** — streaks for staying within budget (kept subtle).
- **Integration marketplace** — accountants, Notion, YNAB import.
- **Subscription / freemium model** — auto-sync, advanced AI, unlimited invites as paid tiers.

---

## Suggested Triage Framework

Before moving anything to `ROADMAP.md`, score each idea along:

1. **User friction removed** — Does it make daily capture or review noticeably easier?
2. **Data dependency** — Does it need clean/complete data to be useful? (Insights need good capture first.)
3. **Implementation cost** — Days, weeks, or months? Any external dependency (Meta approval, bank API, App Store)?
4. **Strategic fit** — Does it move finSight toward being a planner, or just add noise?
5. **Risk / privacy surface** — Does it touch sensitive financial data or third-party services?

A simple first cut:

- **Capture first** — Without good data, everything else is weak.
- **Web-before-native** — PWA/mobile web often delivers 80% of native value.
- **Manual-before-automated** — Smart rules work best after users have shown patterns.
