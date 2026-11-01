// Hide new discovery entry points during rollout; existing inbox links stay usable.
export const messagingEnabled = process.env.NEXT_PUBLIC_MESSAGING_ENABLED === 'true';
export const MESSAGE_MAX_LENGTH = 2000;
export const MESSAGE_PAGE_SIZE = 30;
export const INBOX_PAGE_SIZE = 20;

export function messageQuestions(kind: string, negotiable = false) {
  if (kind === 'donate') return ['Are these shoes still available?', 'Where can I pick them up?', 'Can you ship them?'];
  return [
    'Are these shoes still available?',
    'Any damage, repairs, or sole separation?',
    'Can you ship to my city?',
    'Where and when can we meet?',
    'How do these fit compared with your usual running shoes?',
    'Could you add close-ups of the outsole and size tag to the listing?',
    ...(negotiable ? ['Is the listed price negotiable?'] : []),
  ];
}

export const sellerReplies = [
  "Yes, they're available.",
  'What would you like to check about the condition?',
  'Which city should I check shipping for?',
  'What area and day work for a meetup?',
  'Please use the offer button here so I can review your request.',
];

export function purchaseStatusLabel(status: string, reason?: string | null) {
  if (reason === 'buyer_withdrew') return 'Withdrawn';
  if (reason === 'cancelled') return 'Cancelled';
  if (reason === 'unavailable') return 'No longer available';
  return ({ pending: 'Awaiting seller', accepted: 'Reserved', completed: 'Completed', declined: 'Declined' } as Record<string, string>)[status] ?? status;
}
