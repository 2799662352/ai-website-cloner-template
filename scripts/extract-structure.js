JSON.stringify({
  images: [...document.querySelectorAll('img')].map(img => ({
    src: img.src || img.currentSrc,
    alt: img.alt,
    width: img.naturalWidth,
    height: img.naturalHeight,
    parentClasses: img.parentElement?.className?.toString().slice(0, 100),
    position: getComputedStyle(img).position
  })),
  videos: [...document.querySelectorAll('video')].map(v => ({
    src: v.src || v.querySelector('source')?.src,
    poster: v.poster,
    autoplay: v.autoplay,
    loop: v.loop,
    muted: v.muted
  })),
  svgCount: document.querySelectorAll('svg').length,
  canvasCount: document.querySelectorAll('canvas').length,
  topLevelDivs: [...document.body.children].map(el => ({
    tag: el.tagName,
    id: el.id,
    classes: el.className?.toString().slice(0, 150),
    childCount: el.children.length,
    rect: el.getBoundingClientRect().toJSON()
  })),
  reactFlowExists: !!document.querySelector('.react-flow'),
  hasReactFlow: !!document.querySelector('[class*="react-flow"]'),
  mainContainers: [...document.querySelectorAll('[class*="header"], [class*="sidebar"], [class*="toolbar"], [class*="canvas"], [class*="panel"], [class*="nav"]')].map(el => ({
    tag: el.tagName,
    classes: el.className?.toString().slice(0, 150),
    rect: el.getBoundingClientRect().toJSON()
  }))
}, null, 2)
