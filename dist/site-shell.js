// Reveal the current tab within the navigation without scrolling the page.
const navigation = document.querySelector('.site-navigation');
if (navigation) {
  const revealCurrent = () => {
    const current = navigation.querySelector('[aria-current="page"], [aria-selected="true"]');
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
    attributes: true,
    attributeFilter: ['aria-current', 'aria-selected'],
  });
  window.addEventListener('resize', revealCurrent);
}
