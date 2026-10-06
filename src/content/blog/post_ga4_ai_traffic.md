**Slug:** `/blog/track-ai-traffic-ga4-b2b-saas/`
**Title:** How to Track AI Traffic in GA4 — And How to Report It Without Overselling It
**Meta description:** AI referrals are roughly 1% of sessions and a third to two-thirds of them never arrive labeled. Here's the GA4 setup that captures what's capturable, and what to tell your CFO about the rest.

---

## Short answer

Build a custom channel group that sits above Referral and matches AI domains by regex. GA4's native AI Assistant channel, added in May 2026, covers some engines but not Perplexity, and it isn't retroactive. Run both.

Then accept that you will never see most of it, and build your reporting around that fact instead of pretending otherwise.

---

## What you're actually measuring

Three numbers set expectations before you start.

**Volume is small.** Conductor's benchmark across 3.3 billion sessions put AI referrals near 1.08% of total visits. Similarweb's 2026 analysis landed in the same neighborhood at around 0.9%, up roughly 5x year over year. Growing fast, still tiny. If you present this as a traffic channel, you lose the argument.

**A large share is uncapturable.** Somewhere between 35% and 70% of AI referral sessions arrive with no referrer header and land in Direct. You cannot regex your way to those. Any number you report is a floor, not a total.

**The engine mix for B2B is not the public mix.** In B2B referral data for March–April 2026, ChatGPT sat near 62.6%, Claude around 18.5%, Gemini near 10.6% and Perplexity around 7.3%. Claude's B2B share is roughly four times its share of general web traffic. Perplexity sends about 7% of B2B AI referrals on under 2% of AI platform visits. If you only watch ChatGPT, you're watching 60% of a channel.

---

## The setup

**1. Create a custom channel group.**
Admin → Data display → Channel groups → Create new. Copy the default, then add one AI channel and drag it *above* Referral. GA4 evaluates channels top to bottom; put it below Referral and it never fires.

**2. Match on session source with regex.**

```
^(chatgpt\.com|chat\.openai\.com|openai\.com|claude\.ai|anthropic\.com|perplexity\.ai|gemini\.google\.com|copilot\.microsoft\.com|bing\.com\/chat|grok\.com|deepseek\.com|you\.com|poe\.com|phind\.com|mistral\.ai|meta\.ai)
```

**3. Split the big engines into their own channels.** One lumped "AI" bucket tells you nothing you can act on. ChatGPT, Claude, Perplexity and Gemini each deserve a line, because they retrieve differently and the gaps between them are the diagnosis.

**4. Keep the native channel on too.** ChatGPT appends `utm_source=chatgpt.com` to citation links now, which improves attribution on its own. Native plus custom, cross-checked, catches more than either alone.

**5. Add a self-reported attribution field.** One free-text question on your demo form: *How did you first hear about us?* For a channel where most sessions arrive unlabeled, the human telling you is better data than the analytics. Pipe it to a CRM field and report it next to the GA4 number.

---

## About that conversion rate

You've seen the stat: ChatGPT referral traffic converts at 15.9%, Perplexity at 10.5%, against 1.76% for Google organic.

It comes from Seer Interactive, and it's one B2B client, measured October 2024 to April 2025. It gets quoted as an industry benchmark roughly once a week. It isn't one.

The broader directional finding holds — AI-referred visits convert well above organic across every dataset I've seen, and the reason is obvious: the visitor already read a synthesized comparison and clicked through to a shortlisted vendor. They arrive late in the process. Small numbers also inflate percentages, and a channel at 1% of sessions produces small numbers.

So report the direction, cite the source, and don't build a forecast on it. The first person who audits that slide will find what I just found.

---

## What to report instead

Five lines, monthly:

- **AI referral sessions, split by engine.** The trend matters more than the number.
- **Engaged session rate vs. organic.** Separates real clicks from curiosity.
- **Landing page distribution.** Which pages engines actually send people to. This is the most useful line on the report and the most ignored — it tells you which content the models treat as your answer.
- **Self-reported attribution count.** From the form. Covers the Direct bucket GA4 can't.
- **Citation and description share by engine.** From your visibility tooling, not GA4. GA4 measures clicks that happened. It can't measure the answer where you were recommended and the buyer never clicked, which in B2B is most of them.

That last gap is the point. For B2B SaaS the mention is worth more than the click, and your analytics stack was built to count clicks. Reporting only GA4 means reporting the smaller half of the channel. I've written about [picking a tool for the other half](https://www.aeogrowth.co/blog/ai-visibility-tools-b2b-saas/).

---

## Common questions

**Does GA4 track AI traffic automatically?**
Partly, since May 2026. The native AI Assistant channel recognizes ChatGPT, Gemini, DeepSeek, Copilot and Grok. Perplexity still routes to generic Referral, and the classification isn't applied to historical data. A custom group is still required.

**Why does my AI traffic show up as Direct?**
Many AI surfaces strip or omit the referrer, especially in desktop apps and mobile clients. A third to two-thirds of sessions arrive this way. It's a protocol limitation, not a setup error.

**How much AI traffic should a B2B SaaS expect?**
Around 1% of sessions today for most sites, trending up quickly. Judge the channel on arrival quality and on citation share, not volume.

**Is AI referral traffic worth optimizing for at 1% of sessions?**
The traffic alone, debatably. The influence, yes — buyers who never click still arrive at your form already convinced, and that shows up in your sales calls before it shows up in GA4.

**Can I attribute pipeline to AI search?**
Not cleanly, and anyone claiming a tidy attribution model here is selling something. Combine GA4 referral data, self-reported attribution and citation share, and treat the result as directional.

---

*If your AI referrals are flat and you don't know whether that's a visibility problem or a measurement problem, [send me your domain](https://calendly.com/geraldgerez/growth-plg). Free, before we talk.*

**Schema:** `FAQPage` en el bloque de preguntas, `HowTo` en la sección de setup, `Article` con `author` y `datePublished`.
