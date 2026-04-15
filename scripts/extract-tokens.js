JSON.stringify({
  fonts: [...new Set([...document.querySelectorAll('*')].slice(0, 300).map(el => getComputedStyle(el).fontFamily))],
  bgColors: [...new Set([...document.querySelectorAll('*')].slice(0, 300).map(el => getComputedStyle(el).backgroundColor).filter(c => c !== 'rgba(0, 0, 0, 0)'))],
  textColors: [...new Set([...document.querySelectorAll('*')].slice(0, 300).map(el => getComputedStyle(el).color))],
  fontSizes: [...new Set([...document.querySelectorAll('*')].slice(0, 300).map(el => getComputedStyle(el).fontSize))],
  title: document.title,
  url: location.href,
  bodyBg: getComputedStyle(document.body).backgroundColor,
  htmlBg: getComputedStyle(document.documentElement).backgroundColor,
  viewportWidth: window.innerWidth,
  viewportHeight: window.innerHeight,
  links: [...document.querySelectorAll('link[rel*="icon"], link[rel*="font"], link[href*="font"]')].map(l => ({rel: l.rel, href: l.href})),
  metaTags: [...document.querySelectorAll('meta[name], meta[property]')].map(m => ({name: m.name || m.getAttribute('property'), content: m.content}))
}, null, 2)
