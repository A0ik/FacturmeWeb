import { redirect } from 'next/navigation';

export default function ListCDDRedirect() {
  redirect('/contracts?type=cdd');
}
