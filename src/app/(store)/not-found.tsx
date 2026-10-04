import Link from "next/link";
import { Container } from "@/components/store/ui";

export default function NotFound() {
  return (
    <Container className="py-32 text-center">
      <p className="text-[11px] tracking-[0.28em] uppercase text-plum">404</p>
      <h1 className="font-display text-5xl mt-3">This page wandered off</h1>
      <p className="text-muted mt-3">It may have moved, or the link might be broken.</p>
      <Link href="/collections/all" className="inline-block mt-8 rounded-full bg-ink text-cream px-7 py-3.5 text-xs tracking-[0.2em] uppercase">
        Shop all clothing
      </Link>
    </Container>
  );
}
