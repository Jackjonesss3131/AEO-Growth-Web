---
title: "How to Rank in ChatGPT (You Don't — Here's What Actually Happens)"
description: "A prioritized checklist for B2B SaaS: what actually determines whether AI engines can read, use and recommend your site — starting with the technical failure that makes everything else pointless."
pubDate: 'Sep 27 2026'
---

**The short answer:** start by confirming AI crawlers can actually read your pages, because most of them don't run JavaScript. Then make sure they're allowed in. Then give them content that answers your buyer's real questions with specifics they can quote, and make sure the rest of the web describes your company the same way you do.

The order matters more than the list. Work done further down is wasted if something above it is broken.

Here's the checklist, in the order I'd run it for a B2B SaaS company.

## 1. Check whether AI crawlers can see your content at all

This is first because it's binary, common, and invisible from a browser.

[Vercel analyzed AI crawler traffic across its network](https://vercel.com/blog/the-rise-of-the-ai-crawler) and found that none of the major AI crawlers render JavaScript. OpenAI's GPTBot generated 569 million requests in a month on that network alone; Anthropic's Claude crawler 370 million — together about 20% of Googlebot's volume. Both fetch JavaScript files and neither executes them. They read the HTML your server returns, and that's it.

Googlebot renders JavaScript. Gemini inherits that capability through Google's infrastructure. AppleBot renders too. GPTBot, ClaudeBot and PerplexityBot do not.

So if your marketing site is a client-side rendered single-page app, a browser sees your page and GPTBot sees an empty shell.

**Test it in two minutes.** In your browser, open DevTools, disable JavaScript, and reload the page. What's left is roughly what an AI crawler gets.

Or from a terminal:

```bash
curl -s -A "GPTBot/1.2 (+https://openai.com/gptbot)" https://yoursite.com/your-key-page | wc -w
```

If that word count is a fraction of what's on the page, you've found the problem before spending a euro on content.

**The fix** is server-side rendering or pre-rendering for anything that carries meaning: your product pages, pricing, integrations, docs and blog. Client-side rendering is fine for interactive widgets and dynamic elements that aren't part of your argument.

> **"We're on Webflow / WordPress / HubSpot. Does this apply to us?"**
>
> Mostly no, and that's good news. Those platforms serve rendered HTML by default.
>
> Where it bites is custom marketing sites built as React or Vue SPAs, app-shell architectures, and pages where key content — pricing tables, comparison tables, integration lists — is fetched client-side after load. Test the specific pages that matter rather than assuming site-wide.

## 2. Make sure the crawlers are allowed in

Two separate things can block an AI crawler, and only one of them is robots.txt.

**Robots.txt.** All the major AI crawlers respect it. Decide deliberately which you allow. The relevant user agents:

| Company | User agents |
| --- | --- |
| OpenAI | `GPTBot`, `OAI-SearchBot`, `ChatGPT-User` |
| Anthropic | `ClaudeBot`, `Claude-SearchBot`, `Claude-User` |
| Perplexity | `PerplexityBot`, `Perplexity-User` |
| Google (AI features) | `Google-Extended` |
| Apple | `Applebot-Extended` |

Worth knowing the distinction: some of these crawl for training, others fetch pages live to answer a question being asked right now. Blocking the training crawler while allowing the search fetcher is a legitimate strategy. Blocking everything and then wondering why you're not cited is not.

**Your firewall or CDN.** This one catches people out, because robots.txt says yes while the edge says no. Bot protection rules, WAF challenges and managed "AI bot" rulesets can return a challenge or a 403 to a crawler that your robots.txt explicitly welcomes. A JavaScript challenge is fatal for a crawler that doesn't run JavaScript.

If you're on Cloudflare, Vercel, Fastly or similar, check the bot management settings directly — don't infer access from robots.txt.

> **"How do I know if something is blocking them?"**
>
> Request one of your pages with an AI crawler's user agent and look at the status code:
>
> ```bash
> curl -sI -A "GPTBot/1.2 (+https://openai.com/gptbot)" https://yoursite.com/ | head -1
> ```
>
> A `200` means you're through. A `403`, `401` or `503` means something at the edge is refusing the crawler regardless of what robots.txt says. Repeat for `ClaudeBot` and `PerplexityBot` — rules sometimes differ by user agent.
>
> Then check your server logs for those user agents. If they've never appeared, that's your answer.

## 3. Skip llms.txt for now

This one gets sold hard, so here's what the evidence actually shows.

Google's John Mueller [stated on Bluesky in June 2025](https://www.seroundtable.com/google-ai-llms-txt-39607.html) that no AI system currently uses llms.txt. Gary Illyes confirmed at Search Central Live that Google doesn't support it and isn't planning to. Google's own AI-features guidance says you don't need llms.txt or special markup to appear in its generative results.

The usage data agrees. [An Ahrefs study of 137,000 sites](https://www.webyes.com/blogs/does-llms-txt-improve-rankings/) found 97% of published llms.txt files received zero traffic in May 2026. [SE Ranking analyzed roughly 300,000 domains](https://baselinelabs.ai/blog/llms-txt-google-search), found about 10% adoption, and — running both a statistical model and a classifier — found no citation effect. [Another provider monitoring more than 500 million AI bot visits](https://limy.ai/blog/llms-txt-in-2026-the-full-guide) over 90 days recorded 408 requests targeting llms.txt.

The common argument for it is that OpenAI, Anthropic and Perplexity all publish llms.txt on their own developer docs. They do — for coding assistants pulling their API documentation. [As one analysis puts it](https://medium.com/@kaispriestersbach/the-llms-txt-is-dead-more-precisely-a-dud-ab7bee4f469c), that's like assuming a restaurant reads other restaurants' menus because it has one of its own.

**Where it genuinely helps:** if you sell a developer product and your users pull your docs into Cursor, Claude Code or similar. Stripe, Vercel and Cloudflare ship it for exactly that reason, and it's a real developer-experience win.

**Where it doesn't:** as a lever for getting your marketing pages cited. It costs half a day and won't hurt you. Just don't let it displace items 1 and 2, which are load-bearing.

## 4. Structure pages so a model can lift the answer

Once crawlers can read you, the question becomes whether your content is usable.

**Answer first.** Put the direct answer in the first two or three sentences of the page and under each heading. A model extracting a claim shouldn't have to infer it from four paragraphs of setup.

**Headings as questions.** Match the way your buyer phrases things. *"How much does it cost for a 20-person team?"* works better than *"Pricing."*

**Specifics over adjectives.** Numbers, named integrations, real constraints. "Syncs with Salesforce every 15 minutes" is quotable. "Seamless integration" is not.

**Self-contained sections.** Models retrieve chunks, not whole pages. A section that only makes sense after reading the previous one often arrives without it.

**Sources on claims.** Attribution and statistics are among the content features that research on generative engines found most consistently improves how content is used — I covered that research in [AEO vs GEO](/blog/aeo-vs-geo-blog/).

**Plain HTML for anything important.** Text in images, canvas elements or JavaScript-built tables is invisible. If a comparison table matters, it should be a `<table>`.

## 5. Publish the pages B2B buyers actually ask about

Buyers don't ask broad category questions when they're close to a decision. They ask constrained ones — with their stack, team size, budget and compliance requirements attached.

The pages that answer those:

- **"Best for" pages, one per segment.** *[Product] for agencies*, *for fintech*, *for teams under 50*. State the use case, the constraints you handle, the outcome.
- **Integration pages, one per major integration.** Named, with what the integration actually does. This is what answers *"a tool that works with Salesforce and Snowflake."*
- **Pricing with real context.** Ranges, what drives cost, who each tier is for. "Contact sales" gives a model nothing when a buyer mentions a budget.
- **Honest comparison pages.** One per real competitor, stating when they're the better choice. Comparisons that admit trade-offs carry more weight than ones that win every row.
- **Alternatives pages.** Buyers constantly ask for alternatives to an incumbent. If you don't answer it, a competitor's page does — and they choose which alternatives get listed.
- **Requirements and compliance pages.** SOC 2, GDPR, data residency, SSO. Checkable facts that let a model include you in a constrained answer.
- **Customer results with numbers,** attributed to a type of company.

> **"Isn't this just content marketing with extra steps?"**
>
> Largely, yes — and that's worth saying plainly rather than dressing it up. The genuinely new parts are narrow: the technical readability in items 1 and 2, the entity consistency in item 6, and measuring descriptions rather than rankings.
>
> What changes is emphasis. Traditional content strategy optimizes for the top of the funnel because that's where search volume lives. For AI answers, the constrained bottom-of-funnel questions matter more, because that's where a model is assembling a shortlist and your specificity is what qualifies you for it.

## 6. Make the whole web describe you the same way

This is where most B2B SaaS companies actually lose, and it's not on your site.

When a model decides what you are, it looks for agreement across sources. If your homepage says "revenue intelligence platform" while your G2 category, Crunchbase profile and a 2023 roundup say "sales email tool," the model sees a conflict and resolves it toward whichever description has more weight behind it. Often that's the old one, simply because it's had longer to propagate.

**The inventory:** your site, G2, Capterra, Crunchbase, LinkedIn, Product Hunt, directory listings, review profiles, and any comparison pages that include you. Check each against how you describe yourself today. Correct the ones that disagree.

This matters most after a repositioning, a rename, or if you run more than one domain. Old descriptions don't expire on their own.

> **"We repositioned last year. How far back does this go?"**
>
> Further than you'd like. The pages that describe your old positioning are still indexed, still being retrieved, and in most cases still outnumber the pages describing the new one.
>
> Prioritize by weight, not by age: the sources that appear most often in your own AI answers first, then the high-authority profiles, then the long tail. [The audit post](/blog/what-is-an-ai-visibility-audit/) covers how to find which sources are actually shaping your answers.

## 7. Get named in pages you didn't write

Your own comparison page helps a model find you. Being named in someone else's is what makes it believe you.

In most B2B categories, the buyer's guides the models read are written by vendors. When I looked at marketing attribution software, [six of the nine results ranking for the main category query](/blog/why-chatgpt-recommends-competitor-attribution-tool/) were published by companies selling attribution software.

What to pursue, roughly in order of effort:

- **Review platforms.** G2 and Capterra profiles, in the right category, with recent reviews.
- **Analyst peer-review listings** where your category has one.
- **Independent roundups and comparison lists.** Many accept vendor submissions or corrections.
- **Communities where your buyers actually are.** Reddit, Slack groups, niche forums — participating honestly, not seeding.
- **Original data.** A benchmark or study only you can publish is the most durable way to get cited, because other people's articles need your number.

## 8. Measure descriptions, not just mentions

Run 20–30 unbranded buyer questions monthly across ChatGPT, Perplexity, Gemini and Google's AI results. Track engines separately.

For each answer, log: recommended, mentioned or absent; the exact description used; whether the category is right; whether the segment is right; who appeared instead; and which sources were cited.

Mention rate alone will tell you a number is going up while you're being recommended to the wrong buyer. The difference between being cited and being recommended is the whole game — I go through it in [How to Get AI Recommendations](/blog/how-to-get-ai-recommendations/).

## The order, one more time

1. Confirm crawlers can read your HTML without JavaScript
2. Confirm nothing at the edge is blocking them
3. Skip llms.txt unless you sell to developers
4. Restructure pages so answers are extractable
5. Publish the constrained, bottom-of-funnel pages
6. Make every source describe you consistently
7. Earn mentions in pages you don't control
8. Measure descriptions monthly

If you only do two things this week, do the first two. A site AI crawlers can't read or aren't allowed to fetch will not appear in AI answers no matter how good the content is.

## Quick answers

**How do I get my SaaS to appear in ChatGPT?**
Make sure AI crawlers can fetch and read your pages without JavaScript, allow them in robots.txt and at your CDN, publish pages that answer constrained buyer questions with specifics, keep your description consistent across the web, and earn mentions on pages you don't control.

**Do AI crawlers read JavaScript?**
Most don't. Analysis of AI crawler traffic found that GPTBot, ClaudeBot and PerplexityBot fetch JavaScript files but don't execute them. Googlebot and Gemini do render, and AppleBot does too.

**Do I need an llms.txt file?**
Not for AI search visibility. Google has said no AI system uses it, and large-scale studies found that nearly all published files are never requested. It's genuinely useful if you sell a developer product and want coding assistants to pull your docs correctly.

**Which AI crawlers should I allow in robots.txt?**
At minimum the retrieval bots that power live answers: `OAI-SearchBot`, `ChatGPT-User`, `Claude-SearchBot`, `PerplexityBot`. Whether you also allow training crawlers like `GPTBot`, `ClaudeBot` and `Google-Extended` is a separate business decision.

**Why is my site not showing up in ChatGPT even though it ranks on Google?**
The most common technical cause is client-side rendering: Googlebot renders your JavaScript, AI crawlers don't. The most common non-technical cause is inconsistent descriptions across the web. [AEO vs SEO](/blog/aeo-vs-seo-blog/) covers why ranking doesn't transfer automatically.

**How long does this take to work?**
Changes to your own site register soonest in engines that search the web on every question. Changes to how third parties describe you take longer. Nobody can honestly promise a date for a specific engine.

---

If you'd rather see the diagnosis before doing any of this, I run the audit on your domain before we talk — the unbranded questions your buyers ask, across every major engine, with the specific pages shaping each answer. [Book a call](https://calendly.com/geraldgerez/growth-plg).
