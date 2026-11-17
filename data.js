// FAKE DATABASE. One page per line:  id,url,text,links-it-points-to (separated by ;)
// Add more rows here and refresh the browser: search, graph and table all update.
const RAW = `
1,pune-food-guide.com,Where to eat in Pune - vada pav and biryani and pizza,2
2,best-pizza-pune.com,Fresh wood-fired pizza made daily - try our cheese pizza,1;3
3,college-canteen-blog.com,Student reviews of canteen food and chai and Friday pizza,2;4
4,pizza-recipes-home.com,Make pizza at home - pizza dough and pizza sauce,2;5
5,cheap-eats-pune.com,Good food under 100 rupees - misal and dosa and pizza slices,2
6,pizza-pizza-pizza.com,pizza pizza pizza pizza pizza pizza pizza pizza pizza pizza,1
`;

const PAGES = RAW.trim().split("\n").map(line => {
  const c = line.split(",");
  return {
    id: +c[0],
    url: c[1].trim(),
    text: c.slice(2, -1).join(",").trim(),
    links: c[c.length - 1].split(";").filter(Boolean).map(Number)
  };
});

// PageRank: PR(p) = (1-d)/N + d * sum( PR(q) / outlinks(q) ) over every page q linking to p
function pageRank(pages, d = 0.85, iterations = 60) {
  const N = pages.length;
  let pr = {};
  pages.forEach(p => pr[p.id] = 1 / N);
  for (let i = 0; i < iterations; i++) {
    const next = {};
    pages.forEach(p => next[p.id] = (1 - d) / N);
    let dangling = 0;
    pages.forEach(p => {
      if (!p.links.length) dangling += pr[p.id];
      else p.links.forEach(t => next[t] += d * pr[p.id] / p.links.length);
    });
    pages.forEach(p => next[p.id] += d * dangling / N);
    pr = next;
  }
  return pr;
}
