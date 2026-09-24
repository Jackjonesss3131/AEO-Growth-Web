---
title: "What Is an AI Visibility Audit (And Why Most Miss the Point)"
description: "Most AI visibility audits report how often you're mentioned. That's a monitoring metric, not a diagnosis. What a real audit should tell you, what the tools measure, and how to run a basic one yourself."
pubDate: 'Sep 25 2026'
---

**The short answer:** an AI visibility audit tells you what AI engines say about your company when your buyers ask about your category — and why. Most audits stop at the first half. They report how often you appear and how you compare to competitors, which is useful monitoring. It isn't a diagnosis, and it rarely tells you what to change.

This post explains what the standard metrics measure, where they run out, and what to ask for instead. It's written for B2B SaaS teams deciding whether to buy a tool, hire someone, or run this themselves.

## What "AI visibility" usually means

The category has settled on a standard definition. Peec AI, one of the better-known tools, [states it plainly](https://peec.ai/product/ai-visibility): it measures your brand's AI visibility as the percentage of AI responses that mention your brand.

Around that core number, most tools report a similar set:

- **Visibility or coverage rate** — how often you're mentioned across a set of tracked prompts
- **Share of voice** — your mention rate compared to competitors
- **Position** — how early in the answer you appear
- **Sentiment** — usually a score, positive to negative
- **Cited sources** — which pages the engine pulled from

[Otterly.ai describes](https://otterly.ai/) the same shape: brand coverage rate, share of voice against competitors, platform-by-platform visibility and trends over time.

This is real work, done well. Running prompts across several engines on a schedule, parsing the answers and charting the trend is exactly the kind of thing software should do. [One practitioner guide puts it bluntly](https://www.shadow.inc/resources/how-to-measure-ai-share-of-voice): manual auditing works for small prompt sets but doesn't scale past 10–15 queries.

So the tools aren't the problem. The problem is what happens when a mention rate becomes the headline number.

> **"What's actually wrong with tracking mention rate?"**
>
> Nothing, as a trend line. It's the wrong thing to *decide* from.
>
> A mention is not a recommendation. Your company can be named in an answer as an also-ran, in a list of ten, or in the wrong category entirely — and all three count as a mention. Meanwhile a competitor named once, as the recommendation, wins the deal.
>
> I wrote about the three levels — mention, citation and recommendation — in [How to Get AI Recommendations](/blog/how-to-get-ai-recommendations/). A dashboard that counts all three as one number can't tell you which one you have.

## Where the standard metrics run out

Four gaps come up in every audit I run.

**1. Mention rate doesn't separate "named" from "recommended."**
An answer that says *"alternatives include A, B, C and yours"* and an answer that says *"for your situation, use yours"* are different outcomes. Most tools score them the same.

**2. Sentiment isn't accuracy.**
Sentiment asks whether the tone was positive. Accuracy asks whether the model described the right product, category and buyer. A model can enthusiastically recommend you for something you don't sell. That scores as positive sentiment and reads as a win on the dashboard.

This isn't a claim I need to make on my own authority. A comparison of AI visibility tools published by one of the vendors in the category [addresses it directly](https://kime.ai/blog/best-ai-visibility-tools): asked whether these tools can detect when AI describes a brand incorrectly, the answer given is that some can and many cannot, with accuracy tracking named as a differentiating feature rather than a standard one.

**3. Share of voice doesn't tell you about fit.**
Appearing in 40% of answers about your category sounds good until you see that in most of them you're recommended for the wrong segment — the enterprise slot when you serve lean teams, or the generic slot when you're a specialist.

**4. Measurement stops where the fix starts.**
This is a design decision, not a flaw, and the honest reviews say so. One 2026 comparison [describes Peec as measurement-first by design](https://arbling.com/blog/guides/ai-visibility-tools-compared), noting that acting on the findings — restructuring content, repairing entity inconsistencies — happens in other systems. For a team with an execution arm in place, that division of labor is fine. For a team without one, the recommendations point at work the tool doesn't do.

> **"So do I still need a tool?"**
>
> Probably yes, eventually — for the same reason you use rank tracking. You need the trend line, and you need it without someone running prompts by hand every month.
>
> But buy it for monitoring, not for diagnosis. A tool tells you *that* something changed. An audit tells you *why*, and which page or listing to change. They're different jobs, and the second one is where the pipeline is.
>
> One practical note before you buy: most of these tools price by prompt, and each prompt counts separately per engine. [Otterly's tiers](https://alhena.ai/blog/best-ai-visibility-tools-ecommerce/) run from $29/month for 15 prompts to $189/month for 100. A serious B2B prompt set — 30 buyer questions across four engines — is 120 prompt-engine combinations. Check the math against the tier before you assume the entry plan covers you. Engine coverage is often gated by plan too: the same comparison notes that Profound's entry plan tracks only ChatGPT.

## What a real audit should tell you

Here's the standard I'd hold any audit to — mine or anyone else's. For every buyer question, in every engine:

**1. Recommended, mentioned, or absent.**
Three states, not one. Named as an option worth evaluating is a different result from appearing in a list.

**2. The exact description.**
Not a sentiment score — the actual sentence. What category did the model put you in? What did it say you do? Is that what you sell today?

**3. Fit accuracy.**
Which segment were you recommended for, and is it the one you actually serve? Being recommended to the wrong buyer is a specific, fixable failure, and it's invisible on a coverage chart.

**4. Who took your place.**
For every answer you're missing from, which competitors appeared, and how were *they* described? Their description is the one the model thinks the category needs.

**5. The sources behind the answer.**
Which specific pages did the engine cite. This is the part that converts an audit into a work plan, because those pages are the raw material of the answer.

**6. A named fix per finding.**
Not "improve your content." This directory profile still uses your old category name. This integration has no page. This competitor's comparison list includes six tools and not you.

> **"How is that different from what the tools' recommendations already give me?"**
>
> Some tools do surface citation opportunities and content gaps, and the better ones rank them by likely impact. That's genuinely useful input.
>
> The difference is ordering and cause. A gap list tells you what's missing. An audit tells you what's blocking everything else. If your company is described three different ways across the web, publishing more content amplifies the confusion instead of fixing it — so entity consistency comes before content, every time. A ranked list of opportunities won't tell you that, because it's scoring items independently.

## What this looks like in practice

Take marketing attribution software, a category I looked at in detail [in a separate post](/blog/why-chatgpt-recommends-competitor-attribution-tool/).

When I checked what ranks for *best B2B marketing attribution software*, six of the nine results were published by companies that sell attribution software. Those vendor-written buyer's guides are a large part of what the models read when someone asks which attribution tool to use.

Read them closely and they aren't rankings — they're assignments. One tool gets the "already on HubSpot" slot. Another gets enterprise Salesforce. Another gets ABM. Ruler Analytics gets phone-call attribution.

Now consider what each type of report tells an attribution founder:

- **A visibility dashboard says:** you were mentioned in 22% of answers, share of voice 9%, sentiment positive, trending up.
- **An audit says:** you're mentioned in six of those answers as a generic option and recommended in none; in four of them you're described by the category you used before your repositioning; the buyer's guides driving those answers are these five specific pages, you appear in one of them, and in that one your row says "marketing analytics" rather than "revenue attribution."

The first is a number to report upward. The second is a week of work with a clear order.

## Run a basic one yourself

You can do a useful version of this in about an hour. It won't scale, and that's fine — the first pass is diagnostic.

**1. Write 20–30 buyer questions.** In your prospects' words, not your homepage's. Attach real constraints: CRM, team size, industry, sales cycle, budget, compliance. Never include your brand name — asking *"is [your company] good"* introduces the brand yourself and tells you nothing useful.

**2. Run them across ChatGPT, Perplexity, Gemini and Google's AI Mode.** Track engines separately. They don't draw from the same sources, which I covered in [AEO vs GEO](/blog/aeo-vs-geo-blog/).

**3. Record six columns per answer.** Recommended / mentioned / absent. The exact sentence describing you. Category correct? Segment correct? Competitors recommended. Sources cited.

**4. Tally the sources.** Across all your missing answers, which pages appear most? That list, sorted by frequency, is your work plan.

**5. Look for disagreement.** Where do the engines describe you differently? Differences usually trace back to different source pools — one engine leaning on your site, another on directories or comparison lists.

> **"Our prompt set will be biased. We're the ones writing it."**
>
> It will, and it's worth guarding against. Two practical fixes.
>
> Pull the wording from real inputs: sales call notes, demo requests, support tickets, the questions prospects ask on first calls. Not the phrasing on your product page.
>
> And include questions you expect to lose. A prompt set where you appear everywhere is a prompt set written around your strengths. The questions where a competitor wins are where the information is.

## When a tool is enough, and when it isn't

Being straight about this, since I sell the audit.

**A tool is probably enough if** you already know your positioning is clear and consistent, your category is stable, you have a team that can act on findings, and what you need is the trend line and competitive benchmark.

**An audit earns its cost when** any of these are true:

- You repositioned in the last two years and old descriptions are still circulating
- You're in a category where the buyer's guides are written by your competitors
- You appear in AI answers but the descriptions are wrong, vague or outdated
- Your visibility numbers move and nobody can explain why
- You run two domains, or your company changed names
- You're a specialist competing against incumbents on broad category questions

Most of those are entity problems, and entity problems don't resolve on their own. They get louder as more content is published on top of them.

## Quick answers

**What is an AI visibility audit?**
An assessment of what AI engines say about your company when buyers ask about your category — whether you're recommended, how you're described, which competitors appear instead, and which sources produced each answer.

**How is it different from an AI visibility tool?**
A tool monitors: it tracks mention rate, share of voice and sentiment over time, at scale. An audit diagnoses: it explains why a specific answer came out the way it did and what to change. Most teams eventually want both.

**What should an AI visibility audit include?**
Recommendation status per question and engine, the exact description used, category and segment accuracy, competitors recommended instead, the sources cited in each answer, and a specific fix tied to each finding.

**Can I run one myself?**
Yes, for a first pass. Write 20–30 unbranded buyer questions, run them across the major engines, and log six columns per answer. Manual auditing stops scaling past a few dozen prompts, which is where tooling helps.

**Does sentiment tell me whether AI describes my company correctly?**
No. Sentiment measures tone. Accuracy measures whether the category, product and buyer are right. Some tools track description accuracy; many don't. If it matters to you, confirm it's included before you buy.

**How often should I run it?**
A full audit when something changes — a repositioning, a launch, a rename, a new competitor. Monitoring monthly in between.

---

If you'd like to see what the models say about your company today — recommended or only mentioned, and described how — I run the audit on your domain before we talk, so the call starts with findings rather than questions. [Book a call](https://calendly.com/geraldgerez/growth-plg).
