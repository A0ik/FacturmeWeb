'use client';
import { ContractForm } from '@/components/contracts/ContractForm';

export default function NewCDIPage() {
  return <ContractForm contractType="cdi" mode="create" />;
}
