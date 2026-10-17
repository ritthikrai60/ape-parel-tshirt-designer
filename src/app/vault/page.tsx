import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

interface VaultPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function VaultRedirectPage({ searchParams }: VaultPageProps) {
  const resolvedParams = await searchParams;
  const queryString = new URLSearchParams(resolvedParams as Record<string, string>).toString();
  const target = queryString ? `/account/vault?${queryString}` : '/account/vault';
  redirect(target);
}
