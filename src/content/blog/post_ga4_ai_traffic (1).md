---
title: "How to Track AI Traffic in GA4 (And How to Report It Without Overselling It)"
description: "AI referrals are around 1% of sessions, and between a third and two-thirds of them never arrive labeled. The GA4 setup that captures what's capturable, why the conversion stat everyone quotes comes from a single client, and the five lines worth putting on a monthly report."
pubDate: 'Oct 7 2026'
---

**The short answer:** build a custom channel group that sits above Referral and matches AI domains by regex. GA4's native AI Assistant channel, added in May 2026, covers some engines but not Perplexity, and it isn't retroactive — so run both. Then accept that you will never see most of this traffic, and build the report around that fact instead of pretending otherwise.

I sell AEO work, which gives me an obvious incentive to tell you this channel is bigger than it is. It isn't. The honest version is more useful to you anyway, because the number you can't defend is the number that gets your budget cut.

## Three numbers that set expectations before you start

**Volume is small.** Conductor's benchmark across 3.3 billion sessions put AI referrals near 1.08% of total visits. Similarweb's 2026 analysis landed in the same neighborhood at roughly 0.9%, up about 5x year over year. Growing fast, still tiny. Present this as a traffic channel and you lose the argument in the first slide.

**A large share is uncapturable.** Somewhere between 35% and 70% of AI referral sessions arrive with no referrer header and land in Direct. No regex reaches those. Any number you report is a floor, not a total — and saying so out loud is what keeps the rest of the report credible.

**The engine mix for B2B is not the public mix.** In B2B referral data for March–April 2026, ChatGPT sat near 62.6%, Claude around 18.5%, Gemini near 10.6%, Perplexity around 7.3%. Claude's B2B share runs roughly four times its share of general web traffic. Perplexity sends about 7% of B2B AI referrals on under 2% of AI platform visits. If you're only watching ChatGPT, you're watching 60% of a channel.

> **"Is 1% of sessions worth setting up tracking for?"**
>
> The traffic alone, debatably. The influence, yes. Buyers who never click still arrive at your form already convinced, and that shows up in your sales calls months before it shows up in GA4. You're not measuring volume here. You're measuring whether a channel you can't see is already working.

## The setup

**1. Create a custom channel group.** Admin → Data display → Channel groups → Create new. Copy the default, then add one AI channel and drag it *above* Referral. GA4 evaluates channels top to bottom. Put it below Referral and it never fires.

**2. Match on session source with regex.**

```
^(chatgpt\.com|chat\.openai\.com|openai\.com|claude\.ai|anthropic\.com|perplexity\.ai|gemini\.google\.com|copilot\.microsoft\.com|grok\.com|deepseek\.com|you\.com|poe\.com|phind\.com|mistral\.ai|meta\.ai)
```

**3. Split the big engines into their own channels.** One lumped "AI" bucket tells you nothing you can act on. ChatGPT, Claude, Perplexity and Gemini each get a line, because they retrieve differently — and the gaps between them are the diagnosis, not the noise.

**4. Keep the native channel on as well.** ChatGPT now appends `utm_source=chatgpt.com` to citation links, which improves attribution on its own. Native plus custom, cross-checked, catches more than either alone.

**5. Add a self-reported attribution field.** One free-text question on your demo form: *How did you first hear about us?* For a channel where most sessions arrive unlabeled, a human telling you is better data than your analytics. Pipe it to a CRM field and report it next to the GA4 number.

## About that conversion rate

You've seen the stat. ChatGPT referral traffic converts at 15.9%, Perplexity at 10.5%, against 1.76% for Google organic.

It comes from Seer Interactive, and it is **one** B2B client, measured October 2024 to April 2025. It gets quoted as an industry benchmark about once a week.

The directional finding holds — AI-referred visits convert well above organic in every dataset I've seen, and the reason is obvious. The visitor already read a synthesized comparison and clicked through to a shortlisted vendor. They arrive late in the process, not early. But a channel at 1% of sessions produces small numbers, and small numbers inflate percentages.

So quote the direction, name the source, and don't build a forecast on it. The first person who audits that slide will find exactly what I just found.

> **"Can I attribute pipeline to AI search?"**
>
> Not cleanly, and anyone selling you a tidy attribution model here is selling something. Combine GA4 referral data, self-reported attribution and citation share, then treat the result as directional. The alternative — a precise number you can't defend — is worse than an honest range.

## What to report instead

Five lines, monthly:

| Line | Why it earns its place |
| --- | --- |
| AI referral sessions, split by engine | The trend matters more than the number |
| Engaged session rate vs. organic | Separates real intent from curiosity clicks |
| Landing page distribution | Which pages the engines treat as your answer |
| Self-reported attribution count | Covers the Direct bucket GA4 can't see |
| Citation and description share by engine | The half of the channel that never clicks |

The third line is the most useful and the most ignored. It tells you which of your pages the models have decided represent you — which is usually not the page you'd have chosen.

The fifth line doesn't come from GA4 at all, and that's the point. GA4 counts clicks that happened. It cannot count the answer where you were recommended and the buyer never clicked, which in B2B is most of them. Reporting only GA4 means reporting the smaller half of the channel. On choosing a tool for the other half, I've written <a href="/blog/ai-visibility-tools-b2b-saas/" style="color: #2563eb; text-decoration: underline; text-underline-offset: 2px;">AI Visibility Tools for B2B SaaS</a>.

## Before you blame the setup

If your AI referrals are near zero after all of this, the tracking may be fine and the visibility may not be.

Two things to rule out, in order. First, whether AI crawlers can read your site at all — most don't execute JavaScript, and a client-rendered marketing site returns an empty shell to them. Two minutes with the <a href="/ai-crawler-check/" style="color: #2563eb; text-decoration: underline; text-underline-offset: 2px;">Crawler Check</a> settles it. Second, whether the models describe you as the company you are now, which decides whether you're eligible for the shortlist in the first place. The <a href="/positioning-check/" style="color: #2563eb; text-decoration: underline; text-underline-offset: 2px;">Positioning Check</a> shows which version of your homepage the crawls captured.

A measurement problem and a visibility problem look identical in GA4. They need opposite fixes.

## Quick answers

**Does GA4 track AI traffic automatically?** Partly, since May 2026. The native AI Assistant channel recognizes ChatGPT, Gemini, DeepSeek, Copilot and Grok. Perplexity still routes to generic Referral, and the classification isn't applied retroactively. A custom channel group is still required.

**Why does my AI traffic show up as Direct?** Many AI surfaces strip or omit the referrer, especially desktop apps and mobile clients. Between a third and two-thirds of sessions arrive this way. It's a protocol limitation, not a setup error.

**How much AI referral traffic should a B2B SaaS expect?** Around 1% of sessions today for most sites, trending up quickly. Judge the channel on arrival quality and citation share, not volume.

**Which engine should I watch?** ChatGPT for volume, Claude and Perplexity for B2B intent. Claude's share of B2B referrals runs far ahead of its share of general traffic.

**Is being cited the same as being recommended?** No, and GA4 can't tell them apart. A citation means a model used your page as a source. A recommendation means it named you as worth evaluating. More on the gap in <a href="/blog/how-to-get-ai-recommendations/" style="color: #2563eb; text-decoration: underline; text-underline-offset: 2px;">How to Get AI Recommendations (Not Just Citations)</a>.

---

If your AI referrals are flat and you can't tell whether that's a tracking problem or a visibility problem, send me your domain. I'll run your buyer's real questions across ChatGPT, Perplexity, Gemini and Google and tell you whether you appear, how you're described, and who gets named instead. Free, before we talk. <a href="https://calendly.com/geraldgerez/growth-plg" style="color: #2563eb; text-decoration: underline; text-underline-offset: 2px;">Book a call</a>.
