<div align="center"> <br>
Mini Google

Old keyword search vs PageRank, side by side.

<br> <br>

Open the live demo

<br>
mini-google-livid.vercel.app

Type any word. Watch two search engines disagree.

<br> <br> </div>
What it does

Mini Google runs on a fake web. Search any word and it makes up a handful of pages about it, then ranks the same pages two ways:

	Old method	PageRank
Counts	how many times the page repeats your word	who links to the page, and how important they are
Winner for "pizza"	pizza-pizza-pizza.com (spam, 10 repeats)	best-pizza-pune.com (most trusted)
Spam page ends up	#1	last

Keyword stuffing beats the old method. It can't beat PageRank, because nobody links to a spam page.

Try these

pizza · cricket · laptop · pune food · chai tapri · or anything else

"pizza" uses the 6 hand-made pages. Every other word gets a fake web generated for it, and the same word always gives the same web.

How PageRank is calculated
PR(p) = (1 - d) / N  +  d × sum of PR(q) / links(q)

d = 0.85, N = number of pages, q = every page that links to p. The scores are repeated 60 times until they settle.

Run it on your computer

No install needed. Download the folder and double-click index.html.

Files
File	Job
index.html	page structure
style.css	old-Google look
data.js	the fake database (edit it to add pages) and the PageRank function
app.js	keyword search, fake web generator, results, link graph
<div align="center"> <br>

Open the live demo

<sub>A school project. All pages are fake.</sub>

</div>
