import type { ChatChannel } from '@/lib/contact';
import { IcMessenger, IcViber, IcWa } from './icons';

export function ChatIcon({ ch, cls = 'w-4 h-4' }: { ch: ChatChannel['key']; cls?: string }) {
  if (ch === 'messenger') return <IcMessenger cls={cls} />;
  if (ch === 'viber') return <IcViber cls={cls} />;
  return <IcWa cls={cls} />;
}
