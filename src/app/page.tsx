import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 p-6">
      <h1 className="text-4xl font-bold tracking-wider text-ifland-primary md:text-6xl">
        IF.Land
      </h1>
      <p className="text-muted-foreground text-center text-sm md:text-base">
        黑客松现场协同与展示系统
      </p>
      <div className="flex gap-4">
        <Button className="border border-ifland-primary/50 bg-ifland-primary/10 text-ifland-primary hover:bg-ifland-primary/20">
          <Link href="/login">进入系统</Link>
        </Button>
        <Button variant="outline" className="border-ifland-orange/50 text-ifland-orange hover:bg-ifland-orange/10">
          <Link href="/screen">大屏展示</Link>
        </Button>
      </div>
    </div>
  );
}
