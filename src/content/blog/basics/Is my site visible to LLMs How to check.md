# Is my site visible to LLMs? How to check

Oct 16, 2026

## The short answer: probably not the way you think

Your robots.txt can allow every AI crawler on the list and your server can still be turning them away.

Those are two different systems. Robots.txt is a declaration — it is what you *say* you permit. It has nothing to do with what your server does when a bot actually knocks, or whether the page it hands back can be indexed once it has it.

Most AEO advice tells you to allow GPTBot in robots.txt and moves on to content. That advice skips the one thing that makes everything after it pointless if it fails.

Here is how to check, in the order that matters.

## It cost me two days on my own site

Last week Bing would not index my own audit page.

It had found the page. The fetch was successful. Crawling was allowed. And in the same panel, one line down: **Indexing allowed? No.**

The cause was a trailing slash. My links pointed at `/audit`. My canonical said `/audit/`. To Bing those were two different URLs, neither one agreeing with the other, so it indexed nothing.

I sell this work. It still took me two days to find it on my own site.

That is the gap this article is about. Nothing in robots.txt was wrong. Nothing in the content was wrong. The page answered 200 and handed back a perfectly good document. It was simply not indexable, and the only place that said so was one line in a panel I had not thought to open.

## Three bots decide whether ChatGPT can cite you

OpenAI runs several crawlers and they do different jobs. Most people treat them as one thing and block or allow all three together. That is a mistake in both directions.

| Bot | What it does | Can it cite you? |
| --- | --- | --- |
| **OAI-SearchBot** | Builds the index behind ChatGPT Search | Yes |
| **ChatGPT-User** | Fetches pages live, during a conversation | Yes |
| **GPTBot** | Collects training data | No |

Block OAI-SearchBot and you are not in the pool at all. Block ChatGPT-User and you cannot be pulled into an answer while someone is asking.

GPTBot is the one people argue about, and it is the one that matters least for getting recommended. It does not cite you and it does not send traffic. Blocking it is a defensible choice — one of the companies I audited blocks GPTBot, ClaudeBot, Google-Extended and CCBot, and still gets cited fine, because they left the search bots alone.

If you remember one thing: the first two decide whether you get recommended. The third one does not.

## What I found across 31 B2B SaaS sites

I ran a crawler check on 31 B2B SaaS domains. Real request per bot, comparing what each one got back against what a browser gets.

Three of them were turning bots away at the server while robots.txt said everything was allowed.

One returned **403 to seven bots at once** — OAI-SearchBot, GPTBot, Claude-SearchBot, ClaudeBot, PerplexityBot, Googlebot and Bingbot. Not just AI. Google and Bing too. A browser got 599 words of content. Those bots got four.

Another, a company that had just rebranded, returned 403 to GPTBot and ClaudeBot. Browser: 1,024 words. Bots: four.

A third returned 403 to GPTBot and serves zero words in the raw HTML on top of it.

None of these companies know. Their robots.txt is clean. If you only check robots.txt, you would call all three of them fine.

The usual culprit is Cloudflare bot-fight mode, a WAF rule, or rate limiting. Someone turned on bot protection to stop scrapers and swept up the crawlers that would have cited them.

One caveat worth saying out loud: some sites verify real bots by IP range, so the genuine crawler may get through even when a request carrying its user agent does not. Check that before you panic. But a 403 to the user agent is still the first thing I would look at.

## Two more ways to be invisible without knowing it

**Your content is built by JavaScript.** One of the sites I checked serves zero words in the raw HTML — seven script tags and nothing else. Most AI crawlers do not run JavaScript. They get an empty page and leave. Your site looks perfect in a browser and reads as blank to the thing deciding whether to cite you.

To check this yourself, use View Source, not Inspect Element. Inspect shows you the page after JavaScript has run. View Source shows you what the crawler got.

**Your URLs disagree with each other.** This was my bug. Your links say one URL, your canonical says another, your sitemap says a third. Each one looks fine on its own. Together they tell a crawler your page has no stable address, and a crawler that cannot settle on an address will not index any of them.

The same thing happens with canonicals left over from a build pipeline. One company I audited has a homepage whose canonical still points at a Vercel staging subdomain. Every engine reading that page is being told the real version lives somewhere else.

## The checklist, in order

The order matters. Each step makes the next one pointless if it fails.

**1. Request your homepage with each bot's user agent.** Not robots.txt — the actual request. Compare the status code and the word count against what a browser gets. If a bot gets 403, or gets four words where a browser gets 600, stop here. Nothing else you do will matter until that is fixed.

**2. Count the words in your raw HTML.** View Source, not Inspect Element. If the body is empty and your content only appears after scripts run, server-side rendering or static generation for your marketing pages is the fix.

**3. Line up your URLs.** Requested URL, final URL after redirects, canonical tag, sitemap entry. All four should agree — trailing slash included.

**4. Look for a noindex you did not put there.** The meta robots tag and the `X-Robots-Tag` HTTP header. Platform defaults and staging configs leak into production more often than you would think.

**5. Then worry about content.** Schema, llms.txt, comparison pages, third-party mentions. All of it is real work and all of it is wasted if steps one through four are broken.

That last point is the whole argument. Content built on a site that crawlers cannot read does not compound — it just sits there.

## Run it on your own domain

Steps one through four are the [crawler check](https://www.aeogrowth.co/ai-crawler-check/) on this site. It requests your homepage with every AI bot's user agent, compares what each one receives against what a browser gets, reads your robots.txt, sitemap and schema, and counts the words in your raw HTML. Free, no signup, runs on your domain in about two minutes.

If it comes back clean, the problem is further up — and the rest of this site is about that part.

---

### Related

- [The four layers of AI answer failure](https://www.aeogrowth.co/framework) — retrieval, citation, interpretation, expression, and why they have to be fixed in that order
- [Is being cited by AI the same as being recommended?](https://www.aeogrowth.co/blog/why-chatgpt-recommends-competitor-attribution-tool/) — the distinction most visibility tools miss
- [What sources does AI cite?](https://www.aeogrowth.co/blog/what-sources-does-ai-cite/) — where the answers actually come from
- [AEO vs SEO](https://www.aeogrowth.co/blog/aeo-vs-seo/) — what changes, and what does not
- [How to get AI recommendations](https://www.aeogrowth.co/blog/how-to-get-ai-recommendations/) — what comes after the technical layer
- [Best AEO agencies for B2B SaaS, compared by published price](https://www.aeogrowth.co/blog/best-aeo-agencies-saas/) — if you have decided to hire someone
