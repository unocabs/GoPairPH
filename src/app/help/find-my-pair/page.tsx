import { permanentRedirect } from 'next/navigation';

// Permanent redirect — help page renamed from "How Find My Pair Works" to "How Looking For Works".
export default function HelpFindMyPairRedirect() {
  permanentRedirect('/help/looking-for');
}
