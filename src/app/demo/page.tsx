import type { Metadata } from "next";
import { DemoClient } from "./demo-client";

export const metadata: Metadata = {
  title: "Live demo",
  description:
    "Plan a trip with five simulated friends. The real product, no sign-up, nothing saved. Takes about a minute.",
};

export default function DemoPage() {
  return <DemoClient />;
}
