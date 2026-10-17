import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

interface HomePageProps {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const resolvedParams = searchParams ? await searchParams : {};
  const query = new URLSearchParams(resolvedParams as Record<string, string>).toString();
  const target = query ? `/marketplace?${query}` : '/marketplace';
  redirect(target);
}
