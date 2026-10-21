import { redirect } from 'next/navigation';

export default function PendingRedirect() {
  redirect('/activity?tab=pending');
}
