# Privacy Policy — self-review notes (not legal advice)

**Effective:** 2026-08-05
**Important:** this is a technically-informed self-review by whoever/whatever wrote this note (an AI coding assistant reading the codebase), **not a legal opinion**. Do not represent any of this as legal review or compliance certification. Get an actual lawyer familiar with Zimbabwean and regional data-protection law (the Cyber and Data Protection Act, 2021, and POTRAZ's role as the designated authority) before treating `src/pages/PrivacyPolicy.jsx` as legally sufficient — that's CAIQ Phase 3 item 19's real ask, this document is prep work for that conversation, not a substitute for it.

## Concrete factual gap found and fixed

**The policy was stale relative to real data flows.** It's dated "26 July 2026," but real Paynow payment processing shipped 2026-08-04 — Section 4 ("Third parties we share data with") never mentioned Paynow at all, despite it now handling real payment transactions (amount, reference, line-item description — see `security/VENDOR_DEPENDENCY_REVIEW.md` for exactly what it sees). **Fixed directly** (this is a factual correction, not a legal judgment call) — see the accompanying code change.

## Things worth a lawyer's specific attention (not fixed here — genuinely need legal judgment)

1. **International data transfer disclosure.** AWS region is af-south-1 (Cape Town, South Africa) — Zimbabwean users' personal data is being transferred/stored outside Zimbabwe. Whether this needs explicit disclosure or additional safeguards under the Cyber and Data Protection Act (2021) is a real legal question, not something to guess at.
2. **Named regulator / complaint mechanism.** The policy doesn't name a supervisory authority a user could escalate to (Section 7, "Your rights," only offers direct contact). Whether Zimbabwean law expects this named explicitly is worth confirming.
3. **Legal basis for processing.** The policy describes *what* is collected and *why* functionally, but doesn't frame it in terms of a specific legal basis (consent, contract necessity, legitimate interest) the way GDPR-influenced policies typically do — whether that framing is expected here depends on which regime the platform is actually subject to.
4. **Minors/children's data.** No policy on whether under-18s can hold accounts or what happens if a minor's data is collected — worth an explicit statement either way.
5. **Financial record retention minimums.** Section 5 doesn't specify a retention period for payment records tied to any tax/financial record-keeping legal minimum (as opposed to the "indefinite, for record-keeping" note in `DATA_CLASSIFICATION_AND_RETENTION.md`, which is an internal technical note, not a legally-grounded retention commitment).
6. **Cookies.** The app uses an essential session cookie (`adma_session`) — no analytics/marketing cookies exist today (confirmed in `VENDOR_DEPENDENCY_REVIEW.md` — "no general-purpose analytics/tracking vendor is integrated"), so this is likely low-risk, but a one-line "we use one essential cookie, no tracking cookies" statement would close the gap cheaply if a lawyer agrees it's needed.
7. **Breach notification commitment isn't public.** `INCIDENT_RESPONSE_PLAN.md` internally commits to notifying affected users within 72 hours of a confirmed breach — this commitment isn't reflected in the public-facing Privacy Policy at all. Whether it should be is a legal/PR judgment call, not purely a drafting one.

## Recommendation

Bundle items 1–7 above into a single paid review with a Zimbabwe-competent data-protection lawyer, alongside a review of the third-party vendor agreements (Paynow, AWS, Microsoft) for whether formal Data Processing Agreements are needed/exist. This is explicitly **not** urgent at the platform's current scale and userbase — appropriate before any enterprise-scale partner deal or a real complaint/incident forces the question, not necessarily before then.

---
*Part of ADMA Digital's CAIQ v4.0.3 remediation plan — see `ADMA_CAIQ_Assessment_and_Security_Plan_2026-08-04.md`, Phase 3 item 19.*
