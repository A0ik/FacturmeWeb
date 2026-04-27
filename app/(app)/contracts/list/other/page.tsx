import { redirect } from 'next/navigation';

export default function ListOtherRedirect() {
  redirect('/contracts?type=other');
}
