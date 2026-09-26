---
title: "What Sources Does AI Actually Cite? The Studies, and How to Get Into Them"
description: "Reddit outweighs every software directory combined in some studies. In others, ChatGPT pulls 69% of citations from brand sites. What the measurements really show, and how a B2B SaaS finds the sources shaping its own answers."
pubDate: 'Sep 30 2026'
---

**The short answer:** there's no single source pool. What gets cited changes by engine, by question type and by category — and the published studies disagree sharply because they measured different combinations of those three. What holds across all of them: community discussion and third-party lists carry more weight than most B2B SaaS teams expect, review directories carry less, and being named in an answer is far more common than being the link that gets clicked.

The useful move isn't memorizing someone else's percentages. It's finding the sources shaping *your* answers. I'll cover the studies first, because they tell you where to look, then the method for finding your own.

## What the studies measured

| Study | Scope | Headline finding |
| --- | --- | --- |
| [Glotier](https://glotier.com/guides/what-sources-ai-cites) | 40 buying questions, 292 citations, 196 domains | Reddit in 38 of 40 answers; ~13% of all citations. Five classic software directories together: 0.7% |
| DerivateX, [reported here](https://lymlyt.pro/blog/g2-capterra-ai-visibility/) | 40 B2B SaaS categories, 233 recommendations, ChatGPT with web search | Review aggregators 0.9% of citations; G2 and Capterra zero. 92.3% of named tools got a citation, but only 11.6% pointed at the tool's own site |
| [SE Ranking](https://seranking.com/blog/review-platforms-in-ai-overviews/) | 30,000 commercial keywords, 23 review platforms | Review platforms in 34.5% of AI Overviews; 8.5% of all links |
| [tryanalyze](https://www.tryanalyze.ai/blog/state-of-ai-search-source-family-mix) | 22,295 answers to 460 B2B prompts | ChatGPT: 69% of citations from brand websites and product pages. Perplexity and AI Mode spread roughly evenly across brand sites, lists and editorial |
| [Ahrefs](https://ahrefs.com/blog/ai-overview-citations-top-10) | 863,000 keywords, 4M cited URLs | 37.9% of AI Overview citations also rank in Google's top 10 — down from 76.1% a year earlier |

Read those rows together and the contradiction is obvious. One study says directories are irrelevant; another finds them in a third of AI Overviews. One says ChatGPT leans overwhelmingly on brand sites; another says Reddit dominates.

> **"So which study should I believe?"**
>
> All of them, within their scope. The disagreements are mostly explained by three variables.
>
> **Engine.** Google AI Overviews surfaces long source lists. ChatGPT with web search cites far more sparingly. Perplexity sits between them. Studies measuring different engines aren't contradicting each other.
>
> **Question type.** Broad category questions pull comparison lists and directories. Constrained questions — a specific stack, team size or compliance need — pull different sources entirely, often community threads and specific product pages.
>
> **What counts as a citation.** Some studies count the visible source block, others count inline links, others count anything the engine retrieved. Those are three different denominators.
>
> The practical conclusion: don't build strategy on a borrowed percentage. Measure your own category.

## Five patterns that hold across studies

**1. Community discussion outweighs directories.**
Reddit appears repeatedly at the top. In the Glotier measurement it appeared in 38 of 40 answers and accounted for roughly nineteen times the combined share of the five major software directories. Whatever the exact number in your category, the direction is consistent.

**2. Your own site matters more than the Reddit narrative suggests — on some engines.**
The tryanalyze data on B2B prompts found ChatGPT drawing 69% of citations from brand websites and product pages. That's the opposite of the "earned media wins" framing you'll see elsewhere. Both can be true: engines differ, and your own pages can be cited heavily while community sources drive whether you're named at all.

**3. The category's buyer's guides are usually written by vendors.**
When I checked what ranks for *best B2B marketing attribution software*, [six of the nine results were published by companies selling attribution software](/blog/why-chatgpt-recommends-competitor-attribution-tool/). Those pages are the raw material for the category. If your competitors wrote them, the model learned your category from their version of it.

**4. Review platforms behave like a gate, not a source.**
Nearly every tool ChatGPT recommends has G2 and Capterra profiles, yet those profiles are rarely the cited link. The reading that fits both findings is eligibility rather than citation — covered in detail in [Do G2 and Capterra Reviews Get You Recommended by AI](/blog/g2-capterra-ai-recommendations/).

**5. Ranking helps, and decides less every year.**
Ahrefs' overlap figure between AI Overview citations and Google's top 10 halved in under a year, to about 38%. Ranking is an input, not a proxy.

## The number that should change your content plan

From the DerivateX data: ChatGPT attached a citation to 92.3% of the tools it named — but only **11.6% of those citations pointed at the recommended tool's own website**.

Being named is close to automatic once you're eligible. Being the *cited link* is rare, and it's the one that captures the click.

That gap is why "we appear in AI answers" and "AI sends us traffic" are different claims, and why a mention-rate dashboard can rise while nothing reaches your site. It's the same distinction between mention, citation and recommendation I wrote about in [How to Get AI Recommendations](/blog/how-to-get-ai-recommendations/).

## How to find the sources shaping your answers

This is the part that actually matters, and it takes about an hour.

**1. Write 20–30 questions your buyer asks before they know you exist.**
Real constraints attached: CRM, team size, industry, sales cycle, budget, compliance. Pull the phrasing from discovery calls and support tickets, not your homepage. Never include your brand name — asking *"is [company] good"* introduces the brand yourself and teaches you nothing.

**2. Run them across ChatGPT, Perplexity, Gemini and Google's AI results.** Separately. They don't share a source pool.

**3. Log the sources, not just the answer.** For every response, record every cited URL and what type it is: your site, a competitor's site, a comparison list, a review platform, a community thread, editorial, or documentation.

**4. Tally by frequency.** Sort the domains by how often they appear across all your answers.

That sorted list is your work plan. The pages at the top are the ones writing your category description — and most of them will be pages you don't control.

**5. Read the top ten.** Not skim. Check how you're described in each, whether you're mentioned at all, and which competitors are. That's usually where the real finding is: not absence, but an accurate-sounding description of the company you were two years ago.

> **"What if our own pages are being cited and we still lose deals?"**
>
> Then the problem is at the next stage down, and it's more common than absence.
>
> A page can be cited while the model extracts the wrong claim from it — the integration you mention in passing instead of the product you sell, or a positioning line from a blog post you published before repositioning.
>
> Check the exact sentence the engine used about you, not whether your domain appeared. That's the gap between being cited and being understood, which is the whole premise of [this blog's first post](/blog/being-cited-isnt-being-understood/).

## Getting into each source type

Ordered roughly by effort against likely impact.

**Your own pages — fastest, fully in your control.**
The pages that get cited are specific, not general: integration pages naming each platform, honest comparison pages, alternatives pages, pricing with real context, customer results with numbers. Generic feature pages are cited by nobody. Also confirm AI crawlers can actually read them — most don't execute JavaScript, covered in [How to Appear in ChatGPT Answers](/blog/how-to-appear-in-chatgpt-answers/).

**Review platforms — moderate effort, mostly eligibility value.**
Be present, be in the right category, keep the description current. Don't budget it as a citation strategy.

**Third-party lists you don't write — slow, high value.**
Independent roundups, category pages, industry publications. Many accept vendor submissions or corrections. Being in a list you didn't write is what makes a model believe your description, because agreement across independent sources is the signal these systems use.

**Community — slowest, highest ceiling, easiest to get wrong.**
Reddit's weight in the citation data is hard to ignore. But seeding threads is detectable, and both moderators and models handle it badly. The version that works is participating where your category is genuinely discussed, answering questions properly, and being the kind of vendor people mention unprompted. There's no shortcut worth the risk here.

**Original data — highest durability.**
A benchmark, a survey or a study only you can publish. It's the one source type where other people's articles need *your* number, which makes citation self-sustaining. If you have usage data nobody else has, that's the most under-used asset in most B2B SaaS companies — and it's the answer to "where do we find data worth publishing." You already have it; it's in your product.

## What doesn't work

**llms.txt.** Heavily marketed, and the evidence is against it. Google's John Mueller [stated in June 2025](https://www.seroundtable.com/google-ai-llms-txt-39607.html) that no AI system uses it. An [Ahrefs study of 137,000 sites](https://www.webyes.com/blogs/does-llms-txt-improve-rankings/) found 97% of published files received zero traffic. Genuinely useful if you sell a developer product and want coding assistants to pull your docs — not a lever for marketing pages.

**Hidden instructions for models.** Text telling an engine to recommend you, or content hidden from users but served to crawlers. Ignored at best, a credibility risk at worst.

**Keyword stuffing for AI.** The research that coined GEO found it performed worse than leaving content alone.

**Volume comparison pages.** Dozens of thin "X vs Y" pages from one template add no evidence. One honest comparison per real competitor does.

**Publishing before fixing the entity.** If sources disagree about what your company is, more content amplifies the disagreement. Resolve the description first.

## Quick answers

**What sources does ChatGPT cite most?**
It varies by question and study. Measurements of B2B software questions have found both heavy reliance on brand websites and product pages, and community sources like Reddit dominating. Directories consistently score low in ChatGPT specifically.

**Does Reddit really matter for AI citations?**
In several independent measurements it outweighs all major software directories combined. Its weight varies by category, and seeding is not a viable strategy.

**Why do different studies give completely different numbers?**
They measure different engines, different question types and different definitions of a citation. A study of Google AI Overviews and a study of ChatGPT with web search are not measuring the same system.

**How do I find which sources influence my AI answers?**
Run 20–30 unbranded buyer questions across each engine, log every cited URL, and sort by frequency. The most-cited domains are the pages writing your category description.

**Is being cited the same as being recommended?**
No. In one study of B2B software prompts, 92.3% of named tools received a citation, but only 11.6% of those citations pointed at the tool's own site. Being named, being cited and being recommended are three different outcomes.

---

If you'd rather see the source map for your own category than build it by hand, that's the first thing the audit produces: every question, every engine, every cited page, and how you're described in each. I run it on your domain before we talk. [See how it works](/services/), or [book a call](https://calendly.com/geraldgerez/growth-plg).
