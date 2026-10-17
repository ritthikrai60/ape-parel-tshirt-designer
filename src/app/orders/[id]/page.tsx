import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

interface OrderDetailRedirectProps {
  params: Promise<{ id: string }> | { id: string };
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function OrderDetailRedirectPage({
  params,
  searchParams,
}: OrderDetailRedirectProps) {
  const resolvedParams = await params;
  const resolvedQuery = await searchParams;
  const queryString = new URLSearchParams(resolvedQuery as Record<string, string>).toString();
  const target = queryString
    ? `/account/orders/${resolvedParams.id}?${queryString}`
    : `/account/orders/${resolvedParams.id}`;

  redirect(target);
}
