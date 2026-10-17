import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

interface OrdersPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function OrdersRedirectPage({ searchParams }: OrdersPageProps) {
  const resolvedParams = await searchParams;
  const queryString = new URLSearchParams(resolvedParams as Record<string, string>).toString();
  const target = queryString ? `/account/orders?${queryString}` : '/account/orders';
  redirect(target);
}
