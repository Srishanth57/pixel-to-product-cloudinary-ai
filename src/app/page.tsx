import Nav from "@/components/landing/Nav";
import Hero from "@/components/landing/Hero";
import Pipeline from "@/components/landing/Pipeline";
import Platform from "@/components/landing/Platform";
import CtaFooter from "@/components/landing/CtaFooter";

export default function Home() {
  return (
    <main className="w-full max-w-full overflow-x-clip">
      <Nav /><Hero /><Pipeline /><Platform /><CtaFooter />
    </main>
  );
}