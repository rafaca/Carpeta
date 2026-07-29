import { CreatorNetwork } from "@/components/CreatorNetwork";

export const metadata = {
  title: "Creator Network — Those Who Play",
  description: "Force-directed graph of creators and how they connect.",
};

export default function NetworkPage() {
  return <CreatorNetwork />;
}
