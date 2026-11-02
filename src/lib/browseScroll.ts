export interface BrowsePosition {
  x: number;
  y: number;
  anchor: { id: string; top: number } | null;
}

function listingCards(doc: Document): HTMLElement[] {
  return Array.from(doc.querySelectorAll<HTMLElement>('[data-browse-results] [data-browse-listing-id]'));
}

export function captureBrowsePosition(doc: Document, view: Window): BrowsePosition {
  const cards = listingCards(doc);
  // Prefer a visible card rather than the button, which moves down on append.
  const card = cards.find(node => {
    const rect = node.getBoundingClientRect();
    return rect.bottom > 80 && rect.top < view.innerHeight;
  }) ?? cards[cards.length - 1];
  const id = card?.getAttribute('data-browse-listing-id');
  return {
    x: view.scrollX, y: view.scrollY,
    anchor: id ? { id, top: card.getBoundingClientRect().top } : null,
  };
}

export function restoreBrowsePosition(position: BrowsePosition, doc: Document, view: Window): void {
  const card = position.anchor
    ? listingCards(doc).find(node => node.getAttribute('data-browse-listing-id') === position.anchor?.id)
    : null;
  const top = card && position.anchor
    ? view.scrollY + card.getBoundingClientRect().top - position.anchor.top
    : position.y;
  view.scrollTo({ left: position.x, top: Math.max(0, top), behavior: 'instant' });
}
