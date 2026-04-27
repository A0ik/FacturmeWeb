import { redirect } from 'next/navigation';

export default function ListCDIRedirect() {
  redirect('/contracts?type=cdi');
}
