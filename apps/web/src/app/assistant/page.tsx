import { redirect } from 'next/navigation';

export default function AssistantRedirect() {
  redirect('/?copilot=1');
}
