import { permanentRedirect } from 'next/navigation';

// Permanent redirect — feature renamed from "Find My Pair" to "Looking For".
export default function NewFindMyPairRedirect() {
  permanentRedirect('/looking-for/new');
}
