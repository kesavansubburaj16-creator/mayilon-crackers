import type { Metadata } from "next";
import { OrderInvoiceView } from "@/components/estimate/OrderInvoiceView";
import { getOrder } from "@/lib/db";

export const dynamic = "force-dynamic";

type Params = Promise<{ number: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { number } = await params;
  return { title: `Order ${number}`, robots: { index: false, follow: false } };
}

export default async function EstimateConfirmationPage({ params }: { params: Params }) {
  const { number } = await params;
  const order = await getOrder(number);

  return (
    <OrderInvoiceView
      number={number}
      initialEstimate={order || undefined}
      initialItems={order?.items || undefined}
    />
  );
}
