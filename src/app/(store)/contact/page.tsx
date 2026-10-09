import { Clock, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ContactForm } from "@/components/store/contact-form";
import { Breadcrumbs, Container } from "@/components/store/ui";
import { getSettings } from "@/lib/settings";

export const revalidate = 600;
export const metadata: Metadata = {
  title: "Contact us",
  description: "Questions about sizing, an order or styling? Reach Trumee by WhatsApp, phone or email — Mon–Sat, 10 AM to 6 PM IST.",
  alternates: { canonical: "/contact" },
};

export default async function ContactPage() {
  const store = await getSettings("store");
  const rows = [
    { icon: MessageCircle, label: "WhatsApp", value: "Chat with us", href: `https://wa.me/${store.whatsapp}` },
    { icon: Phone, label: "Phone", value: store.phone, href: `tel:${store.phone.replace(/\s/g, "")}` },
    { icon: Mail, label: "Email", value: store.email, href: `mailto:${store.email}` },
    { icon: Clock, label: "Hours", value: store.supportHours },
    { icon: MapPin, label: "Studio", value: store.address },
  ];
  return (
    <Container className="pt-12 sm:pt-16">
      <Breadcrumbs items={[{ label: "Contact us" }]} />
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-14">
        <div>
          <h1 className="font-display text-5xl sm:text-6xl leading-[1]">We’re here to help</h1>
          <p className="text-ink-soft mt-5 max-w-md">
            Questions about your order, need sizing advice, or just want to say hi? A real person from our Gurgaon studio replies — usually within a few hours.
          </p>
          <ul className="mt-10 divide-y divide-line border-y border-line">
            {rows.map(({ icon: Icon, label, value, href }) => (
              <li key={label} className="flex items-start gap-4 py-4">
                <Icon className="size-5 text-sea mt-0.5 shrink-0" strokeWidth={1.5} />
                <div>
                  <p className="text-[11px] tracking-[0.2em] uppercase text-muted">{label}</p>
                  {href ? (
                    <a href={href} target={href.startsWith("http") ? "_blank" : undefined} rel="noopener" className="hover:text-sea underline-offset-4 hover:underline">
                      {value}
                    </a>
                  ) : (
                    <p>{value}</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
          <p className="text-sm text-muted mt-6">
            Looking for quick answers? See our <Link href="/pages/faqs" className="underline">FAQs</Link>, <Link href="/pages/shipping-policy" className="underline">shipping</Link> and{" "}
            <Link href="/pages/returns-policy" className="underline">returns</Link> pages, or <Link href="/track-order" className="underline">track your order</Link>.
          </p>
        </div>
        <div className="bg-sand p-6 sm:p-10">
          <h2 className="font-display text-3xl">Send us a message</h2>
          <ContactForm />
        </div>
      </div>
    </Container>
  );
}
