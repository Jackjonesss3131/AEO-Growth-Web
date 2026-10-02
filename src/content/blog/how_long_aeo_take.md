Oct 2, 2026

# How Long Does AEO Take to Work?

**The short answer:** there are two clocks, and confusing them is why people think AEO either works in a week or never works at all. The first clock — can the engines *read* your page — runs in days to about three weeks. The second — are you *recommended* in your buyer's decision questions — runs in months, and it never fully stops. Start at BOFU and the second clock runs as fast as it can. Start at the top of the funnel and it may never finish.

I sell this work, so read the rest with that in mind. But the timeline below isn't my preference — it's set by how the engines actually crawl, re-read and re-weight their sources.

## Two clocks, not one

When someone asks "how long does AEO take," they're usually picturing one event: you publish a page, and at some point you appear in the answer. That's two different things happening on two different schedules.

The first is **eligibility** — the engine crawls your page and can now use it. This is fast and mostly technical.

The second is **selection** — the engine decides your page is the best source to answer a specific buyer's question, and names you. This is slow and mostly competitive.

Being crawled is not being recommended. You can be fully indexed on Monday and still absent from the answer in month three, because every other source the model weighs still beats yours for that question. The wait almost never lives in the crawl. It lives in the selection.

## The crawl clock — this part is fast

New and updated pages get read faster than most people expect, and the speed depends heavily on which engine you mean.

In one 90-day study that verified every bot by its published IP ranges, the median recrawl cycle for the same page was about 5.5 days for Perplexity, around 14 days for ChatGPT, and roughly 23 days for Claude. Perplexity is the fastest because its whole model is live retrieval — it re-reads often so its answers stay current. New pages tend to get even more attention early: GPTBot has been observed crawling fresh URLs several times more often than Google in the first few days after publication.

So the realistic read on eligibility:

- **Perplexity** can re-read a changed page within the week, and surface new content in answers within hours to a couple of days.
- **ChatGPT's** search layer picks up new pages in roughly one to two weeks of background crawling — faster when the page is judged important, like pricing.
- **Claude and the slower engines** sit around three weeks or more.

That's the fast clock. If your only question is "can the models see my new page," the answer is days, not months. Which is exactly why the crawl is the wrong thing to obsess over.

## The recommendation clock — this part is the wait

Getting read is cheap. Getting chosen is the work, and it runs on a longer schedule for reasons that have nothing to do with crawl speed.

The model answers a buyer's decision question with the source it trusts most *for that question, in that category.* That ranking is shaped by things that take time to move: whether third-party pages (the buyer's guides, the comparisons, the listicles) still point at the incumbent, whether your own pages are consistent with each other, and how fresh and specific your page is against the alternatives. Freshness genuinely helps here — a large majority of ChatGPT's top-cited pages were updated within the last 30 days, and roughly half of Perplexity's citations come from content less than 13 weeks old — but freshness only matters once you're a plausible source at all.

That's the gap. On a narrow, winnable BOFU question where you've built the exact page for the exact constraint, the model can start naming you within a couple of months — often on Perplexity first. On a broad category question the incumbent has owned for years, you can publish, get crawled, stay fresh, and still never be the chosen answer. The clock on that question doesn't run slow. It doesn't run at all.

> **"My page is live and crawled — why am I still not in the answer?"**
>
> Because crawled means eligible, not chosen. Eligibility takes days; selection depends on whether your page is the best-matched source for that specific question and whether the sources competing with you outweigh it. A crawled page that competes for the broad category term is a crawled page that loses. A crawled page built for one constrained "who + case" is the one that starts winning — and that's a selection problem the engine resolves over months, not a crawl problem it resolves in days.

## A realistic BOFU timeline

Here's the honest arc when you start at the bottom, on the questions you can actually win. It's a loop, not a launch.

**Days 1–10 — audit, no pages yet.** Run your real BOFU questions across ChatGPT, Perplexity, Gemini and Google. Find where you're absent, and where you appear but get described as the wrong company. This is the map for everything after.

**Days 10–30 — fix what's wrong, then build.** Fix the pages that describe you wrong *before* publishing anything new — a wrong description costs you today. Then build the first BOFU pages, one per "who + case."

**Weeks 3–6 — the crawl catches up.** Perplexity re-reads within the week; ChatGPT's background crawl lands around two weeks; slower engines take longer. Eligibility is basically done here.

**Month 2 — first movement.** Live-retrieval engines (Perplexity, ChatGPT search) start naming you on your narrowest, most winnable questions. This is the earliest you should expect a real signal.

**Months 3–4 — it starts to hold.** Movement shows up on ChatGPT's and Gemini's broader answers, and presence across several segments stabilizes instead of flickering.

**Ongoing — the monthly loop.** The engines re-weight their sources, competitors publish, and your description drifts. Same questions, every engine, every month. The teams that keep the loop running catch a slipped description before it costs a quarter. The ones who audit once and file it away are optimizing for a snapshot that's already stale.

> **"Why does Perplexity move before ChatGPT?"**
>
> Different architectures, different clocks. Perplexity retrieves live on every query and recrawls the same page roughly every 5.5 days, so a change you make can show up within the week. ChatGPT is two systems at once — a search layer that reads the live web fairly fast, and model knowledge that updates on much slower training cycles. Its retrieval moves in weeks; its "baked-in" sense of your category can lag far longer. That's why Perplexity is usually where you see life first.

## A worked example, end to end

Say you sell a marketing attribution tool, and the segment is a demand-gen lead at a 20–50 person SaaS on HubSpot, budget-conscious, who just got asked by their CEO which channels drive pipeline.

**The question:** "what's a simple attribution tool for a small B2B SaaS on HubSpot that won't need a data engineer to run?"

**Day 1:** you run that exact question across all four engines. You're not in the shortlist on any of them; two name the same enterprise incumbent, one invents a description of you from an old positioning you dropped a year ago.

**Week 3:** you've fixed the stale description and published one page built for exactly this constraint — named HubSpot integration, positioned for small teams, honest about the enterprise complexity it *doesn't* have, with proof. Perplexity has already re-read it.

**Month 2:** Perplexity starts listing you as the simple HubSpot-friendly option on that question. ChatGPT search is close behind. Gemini still names the incumbent.

**Month 3–4:** you hold the shortlist on that question across Perplexity and ChatGPT, and you've repeated the method on two more segments. Gemini starts to move. The old wrong description is gone everywhere.

Four months in, you're not "ranking for attribution." You're the named answer to three specific questions your actual buyers ask — which is the only thing that moved pipeline.

> **"Can I speed it up?"**
>
> Some of it, yes. Link to the new page internally so it gets re-read sooner, keep it genuinely updated so freshness works in your favor, and — this is the big one — make sure it renders its content without JavaScript, because most AI crawlers don't run JS, and a page the crawler can't read never starts either clock. What you *can't* do is force the engines to re-weight their sources overnight. So the fastest version of AEO isn't a hack — it's refusing to waste weeks on a page the crawler can't see, and starting on the questions you can actually win.

## Quick answers

**How long until AI can see a new page?** Days to about three weeks. Perplexity often within a week, ChatGPT around two weeks, slower engines three-plus. Eligibility is the fast part.

**How long until I'm actually recommended?** On winnable BOFU questions, typically two to four months, engine by engine, with Perplexity usually first. On broad category terms the incumbent owns, it may never happen — no matter how long you wait.

**Why does Perplexity show results before ChatGPT?** Live retrieval on every query plus a recrawl cycle of roughly 5.5 days. ChatGPT's search layer is slower and its model knowledge slower still.

**Is AEO ever "done"?** No. The engines re-weight sources, competitors publish, and your description drifts. It's a monthly loop, not a project with an end date.

**How do I avoid wasting the wait?** Make sure your pages render without JavaScript so the crawl actually counts, and start at BOFU so the selection clock is running on questions you can win instead of ones you can't.

## How we work

The order is the same one I run with every client, and it starts at the bottom on purpose.

First I take your product and your ICP and build the real decision questions your buyer asks — stack, team size and budget attached. Then I run them across ChatGPT, Perplexity, Gemini and Google before we talk, so the first call opens with findings: where you're in the shortlist, how you're described, who takes your place when you're not.

From there the work is ordered — fix what describes you wrong before publishing anything, build the pages that answer the constrained questions, then measure the same questions every month. On expectations, I'll tell you plainly: first signs tend to show on Perplexity within weeks, and a shortlist you can hold across engines is a two-to-four-month build on your winnable questions — not a week, and not a one-time fix. Full scope is on the [services page](https://www.aeogrowth.co/services/).

---

Want to know where your clock actually stands? Send me your domain and I'll run your BOFU questions across every engine: whether you appear today, how you're described, and who's taking your place. Free, before we talk. [Book a call](https://calendly.com/geraldgerez/growth-plg).

Gerald Gerez

AEO & GEO · B2B SaaS
