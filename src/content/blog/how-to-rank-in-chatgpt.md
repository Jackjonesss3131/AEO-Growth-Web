---
title: 'How to Rank in ChatGPT (And Why "Rank" Is the Wrong Word)'
description: "There's no position one in ChatGPT. Here's how it decides which companies appear in its answers, what SEO still does for you, and what to measure instead of rankings."
pubDate: 'Sep 23 2026'
---

Sooner or later, someone on your team asks: *"Where do we rank in ChatGPT?"*

It's a fair question. It's also the wrong one.

There is no page two in ChatGPT. There isn't a page one either. There's an answer: a paragraph, maybe a short list, sometimes a table. It's written fresh for the person who asked. Your company is either in it or it isn't. If it is, you're described in words you didn't choose.

So the useful version of the question isn't *where do we rank.* It's three questions:

1. **Inclusion.** Does ChatGPT include you when a buyer asks about your category?
2. **Recommendation.** When it includes you, does it recommend you, or just mention you?
3. **Description.** Does it describe you as the company you are today?

This post covers how ChatGPT actually builds an answer, what from SEO still carries over, what doesn't, and what to measure in place of a position.

## Why "rank" breaks

Rankings made sense because search results were a list. Ten links, in order. Your position was stable enough to track week to week, and the outcome you wanted was a click.

ChatGPT doesn't work like that.

| | Google search | ChatGPT |
| --- | --- | --- |
| What the user sees | A ranked list of links | One written answer |
| Unit of visibility | Your position | Whether you're in the answer, and how you're described |
| Stability | Fairly stable day to day | The same prompt can return different companies on each run |
| Context | Mostly the query | The query, earlier messages in the conversation, and memory |
| Outcome | A click to your site | Often a shortlist formed without visiting anyone's site |

"Position 3" doesn't exist in ChatGPT.

"Mentioned in 6 of 20 runs, recommended in 2, described in the right category in 4" does. That's the number worth tracking, and we'll get to how.

## Two ways ChatGPT knows about you

ChatGPT has two sources of information about your company, and they behave very differently.

**What it remembers.** Everything the model learned during training. It's built from the web as it looked months or years ago. You can't edit it, and it updates slowly. This is where your old positioning lives. If you repositioned two years ago, the model may still remember the company you used to be. I wrote about that failure in [Being Cited Isn't Being Understood](/blog/being-cited-isnt-being-understood/).

**What it looks up.** When ChatGPT decides to search the web, it runs queries, reads pages and writes an answer with sources attached.

Not every prompt triggers a search. [One analysis](https://www.aipeekaboo.com/blog/fan-out-queries-from-chatgpt) found that roughly 31% of ChatGPT prompts trigger at least one background search, rising to 53.5% for commercial-intent prompts and dropping to 18.7% for purely informational ones.

That split matters. The prompts your buyer types before a purchase — *"best tools for X," "X vs Y," "pricing for Z"* — are the ones most likely to send ChatGPT out to the live web. **The prompts that matter most are the ones you can influence fastest.**

There's a catch. Even when ChatGPT searches, its memory shapes what it searches *for*. If the model believes you belong in a different category, it may never look for you in yours. Search can correct the details. It rarely corrects the frame on its own.

## What happens when ChatGPT searches

ChatGPT doesn't search your buyer's exact words. It splits one question into several narrower sub-queries, pulls pages for each, and writes a single answer from the combined results. This is called query fan-out.

[Researchers have reported](https://peec.ai/blog/patterns-we-see-in-chatgpt-query-fanouts) that ChatGPT combines scores across those sub-queries using Reciprocal Rank Fusion, an algorithm that merges several ranked lists into one.

The practical meaning: **you aren't competing for one query. You're competing across a set of queries you never see.** A page that wins the main query but misses the follow-ups can still be left out of the answer.

### The August 2026 shift

The way ChatGPT runs those sub-queries changed recently, and the change favors companies with clear, complete websites.

On August 8, 2026, tracking firm Promptwatch saw the share of ChatGPT's background searches using the `site:` operator (which limits a search to a single domain) jump from 0.37% to 16.8% in one day, while the average number of searches per response nearly doubled. A separate measurement by Peec AI found similar movement, with `site:` usage rising to about 23% of fan-outs and sources retrieved per prompt roughly doubling from 12 to 24. ([Source](https://blog.rudrakasturi.com/what-is-chatgpt-query-fan-out-the-aug-2026-change-that-killed-reddits-citations/))

Where do those single-domain searches point? An [earlier Peec AI analysis](https://heybuffy.com/blog/chatgpt-site-operator-fan-out-data) from July 2026 found that 84% of `site:` searches targeted the brand's own website — the company the question was about.

At the same time, community sources lost ground. Reddit's share of ChatGPT citations [fell from about 1 in 25 to 1 in 200](https://concurate.com/chatgpt-query-fan-out/) between August 8 and 17, a drop that didn't appear in Google's AI Overviews over the same period.

Put together, ChatGPT is increasingly going to **your own site to check facts about you.** That's an opportunity and a risk:

- If your site states clearly what you do, who you sell to, how pricing works and what you integrate with, the model has something to confirm.
- If those facts are vague, buried in a PDF, or missing, the model fills the gap with whatever third parties say.

One caution: these are snapshots. The trackers' numbers differ by methodology, and OpenAI ships changes without announcing them. The direction is what matters, not the exact percentages.

### One more detail: language

If you sell in multiple markets, note this. [Research across more than 20 million fan-out queries](https://www.aipeekaboo.com/blog/fan-out-queries-from-chatgpt) found that 43% of background searches for non-English prompts ran in English. Your English pages may be answering questions asked in Spanish, German or Portuguese.

## Who actually reads your site

OpenAI uses three separate bots, and they do different jobs. Treating them as one "AI crawler" is where many sites go wrong.

| Bot | What it does | If you block it |
| --- | --- | --- |
| GPTBot | Collects content that may be used to train future models | Your content isn't used for training. Search visibility is unaffected. |
| OAI-SearchBot | Indexes pages for ChatGPT search | You won't appear in ChatGPT search answers |
| ChatGPT-User | Fetches a page live when a user's conversation needs it | ChatGPT can't read your page during a conversation |

OAI-SearchBot and GPTBot [can be controlled independently](https://developers.openai.com/api/docs/bots) in robots.txt, and OpenAI notes that robots.txt rules may not apply to ChatGPT-User because it's triggered by a user. [One experiment](https://searchengineland.com/inside-chatgpt-search-web-run-fan-out-queries-ai-visibility-477339) confirmed that when ChatGPT browses pages after a search, it's ChatGPT-User — not OAI-SearchBot — that fetches the content.

The most common problem isn't robots.txt. It's the firewall. Many domains allow OpenAI's bots in robots.txt but [block them through Cloudflare, Akamai or AWS rate limits](https://www.muratulusoy.de/en/glossary/gptbot.html) that return 429 errors, making the site invisible to ChatGPT without anyone intending it.

Check both. It takes ten minutes, and it's the cheapest fix in this whole post.

## What SEO still does for you

Here's the part people get wrong in both directions.

Some say SEO is dead. Others say AEO is just SEO. Neither is right.

**Retrieval is still search.** ChatGPT uses search engines to find the results it builds answers from, which makes that step [fundamentally an SEO problem](https://lilyraynyc.substack.com/p/what-we-can-learn-from-evolving-chatgpt). If your pages don't show up for the sub-queries ChatGPT runs, they're not in the pool it reads from.

So these still matter:

- **Crawl access and indexation.** A page that isn't indexed can't be retrieved.
- **Clean, server-rendered HTML.** Pages that hide key facts behind JavaScript or open with vague prose are more likely to lose to a competitor that made extraction easier.
- **Pages that match specific questions.** Pricing, integrations, comparisons, use cases.
- **Topical authority.** A domain known for the subject gets pulled more often.
- **Honest dates.** Fan-outs often add the current year to queries. Pages that are actually current benefit. Pages that are restamped without being updated eventually lose trust.

SEO gets you **retrieved.** It doesn't decide whether you're **recommended**, or how you're **described.** That happens in later stages. (More on the difference in [AEO vs SEO](/blog/aeo-vs-seo/).)

## What stops working

| SEO habit | Still useful? | What to do instead |
| --- | --- | --- |
| Tracking keyword position | No | Track inclusion, recommendation and description across repeated prompt runs |
| Traffic as the main proof of success | Partly | Add AI referral traffic and "how did you hear about us" answers. Many buyers shortlist without clicking. |
| One page per keyword | Partly | Cover the follow-up questions too. Fan-outs look for them. |
| Optimizing only your own site | No | Fix how third parties describe you. The model corroborates across sources. |
| Long intros before the answer | No | Put the answer in the first two sentences, then explain |
| Vague category language ("the platform for modern teams") | No | Name your category, your buyer and your use case plainly |

The row that costs companies the most is the fourth one. Getting mentioned is mostly about your site. Getting **recommended** depends heavily on what roundups, directories and review sites say about you. I cover that in [How to Get AI Recommendations (Not Just Citations)](/blog/how-to-get-ai-recommendations/).

## How to show up more often

In order of effort, cheapest first:

**1. Open the door.** Allow OAI-SearchBot and ChatGPT-User in robots.txt. Then check your firewall and CDN rules for blocks and 429s. Decide separately whether you want GPTBot training on your content.

**2. Make your site the canonical record.** One page, easy to find, stating plainly: what category you're in, who you sell to, what problem you solve, how pricing works, and what you integrate with. When ChatGPT runs a `site:` search on your domain, this is what it should find.

**3. Build pages for the follow-up questions.** A buyer's first question is broad. ChatGPT's second round of searches is specific: pricing tiers, security and compliance, integrations, "X vs Y," use cases by role or industry. Each deserves its own page with a direct answer.

**4. Lead with the answer.** First two sentences answer the question. Everything after supports it. A model extracting a claim shouldn't have to read four paragraphs to find it.

**5. Fix the third-party record.** Search your category in roundups, directories and review sites. Note every place that describes you in the wrong category, with the wrong buyer, or with an old feature set. Correct the ones you can control first.

**6. Keep dates honest.** Update pages when the content changes. Don't restamp dates on unchanged pages. Models are learning to distrust dates that don't match the body.

**7. Write for buyers who don't know you yet.** The prompts that matter are unbranded: *"best [category] for [buyer],"* *"how to solve [problem]."* If your content only answers questions that include your name, it only helps people who already found you.

## What to measure instead of rank

Rankings gave you one number. This gives you a few, and together they're much more useful.

**Set up the prompt set.** Write 20 to 50 prompts your buyer would type *before* they've heard of you. No brand names. Mix broad category questions with specific ones (comparisons, pricing, use cases).

**Run each prompt several times.** Answers vary between runs. One run tells you almost nothing. Five runs start to show a pattern.

**Run them per engine.** ChatGPT, Perplexity, Gemini and Google's AI Overviews pull from different sources and behave differently. A win in one doesn't carry over automatically.

Then track:

| Metric | What it tells you |
| --- | --- |
| Inclusion rate | % of runs where you appear at all |
| Recommendation rate | % of runs where you're recommended or on the shortlist, not just named |
| Share of voice | How your inclusion compares to your top competitors on the same prompts |
| Description accuracy | % of runs where you're described in the right category, for the right buyer |
| Cited sources | Which domains feed the answers in your category |
| Own-site citations | How often your own pages are among the sources |

Track it monthly. Then connect it to pipeline: watch referral traffic from chatgpt.com in your analytics, and add "ChatGPT / AI assistant" as an option in your "how did you hear about us" field. Buyers tell you more than you'd expect.

If inclusion is high and recommendation is low, you have a positioning problem, not a visibility problem. If inclusion is high and description accuracy is low, the model knows you — as someone else. Each gap needs a different fix, and a single "rank" number would hide all of them.

## The short version

- There's no position in ChatGPT. There's an answer, and you're either in it or not.
- ChatGPT knows you from memory (slow, often outdated) and from search (fast, and you can influence it).
- Buyer-intent prompts trigger search more often, so the most valuable prompts are the most fixable.
- ChatGPT now checks brands' own sites more often. Your site needs to state the facts plainly.
- SEO still gets you retrieved. It doesn't decide whether you're recommended or how you're described.
- Measure inclusion, recommendation and description across repeated runs, per engine, every month.

## Want to know what ChatGPT says about you today?

I run hundreds of real buyer prompts across ChatGPT, Perplexity, Gemini and AI Overviews to map where you appear, how you're described, and which sources shape the answer in your category. [See how the audit works](/ai-search-optimization/).

I'll run it on your domain before we talk, so the call starts with findings instead of questions.

[Book a call](https://calendly.com/geraldgerez/growth-plg)

---

### Sources

- [OpenAI — Overview of OpenAI Crawlers](https://developers.openai.com/api/docs/bots)
- [Search Engine Journal — OpenAI's Crawler Docs Now List OAI-AdsBot](https://www.searchenginejournal.com/openais-crawler-docs-now-list-oai-adsbot-for-chatgpt-ads/572861/)
- [Search Engine Land — Inside ChatGPT Search: web.run and fan-out queries](https://searchengineland.com/inside-chatgpt-search-web-run-fan-out-queries-ai-visibility-477339)
- [Peec AI — Patterns we see in ChatGPT query fanouts](https://peec.ai/blog/patterns-we-see-in-chatgpt-query-fanouts)
- [Buffy — ChatGPT site: operator fan-out data](https://heybuffy.com/blog/chatgpt-site-operator-fan-out-data)
- [What Is ChatGPT Query Fan-Out? The Aug 2026 Change](https://blog.rudrakasturi.com/what-is-chatgpt-query-fan-out-the-aug-2026-change-that-killed-reddits-citations/)
- [Concurate — 5 ChatGPT Query Fan-Out Changes](https://concurate.com/chatgpt-query-fan-out/)
- [AI Peekaboo — Fan-out queries from ChatGPT](https://www.aipeekaboo.com/blog/fan-out-queries-from-chatgpt)
- [Lily Ray — What We Can Learn from Evolving ChatGPT Fan-Out Queries](https://lilyraynyc.substack.com/p/what-we-can-learn-from-evolving-chatgpt)
- [Murat Ulusoy — GPTBot, robots.txt & WAF](https://www.muratulusoy.de/en/glossary/gptbot.html)
