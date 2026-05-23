import { permanentRedirect } from 'next/navigation';

// Permanent redirect — feature renamed from "Find My Pair" to "Looking For".
// Preserves shared deep-links (FB groups, Messenger) of the form ?item=<id>.
interface PageProps {
  searchParams: { item?: string } & Record<string, string | string[] | undefined>;
}

export default function FindMyPairRedirect({ searchParams }: PageProps) {
  const target = searchParams.item
    ? `/looking-for?item=${encodeURIComponent(searchParams.item)}`
    : '/looking-for';
  permanentRedirect(target);
}
