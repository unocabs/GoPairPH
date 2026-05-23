import { redirect } from 'next/navigation';

export default function WishlistRedirectPage({ searchParams }: { searchParams: { item?: string } }) {
  const query = searchParams.item ? `?item=${encodeURIComponent(searchParams.item)}` : '';
  redirect(`/looking-for${query}`);
}
