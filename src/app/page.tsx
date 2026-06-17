import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ShowcaseSection } from "@/components/home/showcase-section";

export default function Home() {
  return (
    <main>
      {/* Hero 区域 - 占满第一屏 */}
      <section
        className="relative flex min-h-screen w-full items-center justify-center bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url(https://ifland-assets.tos-cn-beijing.volces.com/hero-images/moblie.png)`,
        }}
      >
        {/* 响应式替换 PC 端大图 */}
        <style dangerouslySetInnerHTML={{
          __html: `
            @media (min-width: 768px) {
              section {
                background-image: url('https://ifland-assets.tos-cn-beijing.volces.com/hero-images/desktop.png') !important;
              }
            }
          `,
        }} />

        {/* 居中内容 */}
        <div className="relative z-10 flex flex-col items-center">
          {/* Logo - 移动端 Dark, PC端 Light */}
          <img
            src="/icons/IF.Land%20Dark%20Logo.svg"
            alt="IF.Land Logo"
            className="w-64 object-contain drop-shadow-2xl md:hidden"
          />
          <img
            src="/icons/IF.Land%20Light%20Logo.svg"
            alt="IF.Land Logo"
            className="hidden w-96 object-contain drop-shadow-2xl lg:w-[32rem] md:block"
          />

          {/* Slogan */}
          <div className="mt-8 flex flex-col items-center justify-center text-center">
            <h1 className="font-sans text-2xl font-bold tracking-[0.2em] text-white drop-shadow-lg md:text-4xl lg:text-5xl">
              走出轨道，登陆旷野
            </h1>
            <p className="font-sans mt-4 text-sm font-medium uppercase tracking-[0.3em] text-ifland-primary drop-shadow-md md:text-lg">
              Where Ideas Land, Where Souls Grow
            </p>
          </div>
        </div>

        {/* 右上角登录按钮 */}
        <div className="absolute right-4 top-4 z-10 md:right-8 md:top-8">
          <Button className="bg-ifland-primary text-ifland-dark font-bold hover:bg-ifland-primary/80">
            <Link href="/login">登录</Link>
          </Button>
        </div>
      </section>

      {/* 作品展示模块 */}
      <ShowcaseSection />
    </main>
  );
}
