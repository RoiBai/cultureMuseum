// Reveal the current tab within the navigation without scrolling the page.
for (const navigation of document.querySelectorAll('.site-navigation, .site-subtabs')) {
  const revealCurrent = () => {
    const current = navigation.querySelector('[aria-current="page"], [aria-selected="true"], [aria-pressed="true"]');
    if (!current || navigation.scrollWidth <= navigation.clientWidth) return;
    const item = current.getBoundingClientRect();
    const strip = navigation.getBoundingClientRect();
    if (item.left < strip.left + 16 || item.right > strip.right - 16) {
      navigation.scrollLeft += item.left - strip.left - (strip.width - item.width) / 2;
    }
  };
  revealCurrent();
  new MutationObserver(revealCurrent).observe(navigation, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ['aria-current', 'aria-selected', 'aria-pressed'],
  });
  window.addEventListener('resize', revealCurrent);
}
