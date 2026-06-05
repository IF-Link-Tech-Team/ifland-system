再看：🤖 [执行文档] IF.Land 手机端 PWA 深度重构与双端兼容 PRD (v2)
To Agent: 你是一个资深的前端架构师和执行者，精通 Next.js 16 (App Router)、Tailwind CSS v4 和 TypeScript。
核心任务：将现有的移动端选手界面升级为具有 App Shell（全局底部导航）和全新系统大屏的 PWA 体验。
🚨 最高优先级红线：本次重构的所有更改，绝对不能影响或污染桌面端（PC）的原有布局及颜色。请严格使用 Tailwind 的响应式前缀（如 md:hidden）。

🛠 Existing Context (全局上下文定义)
在编写代码前，请严格参考以下项目现有的数据结构和组件路径，禁止自行猜测或捏造字段：

TypeScript
// 1. 数据结构参考
interface User {
  id: string;
  name: string;
  avatar: string; // 注意是 avatar
}

interface Team {
  teamId: string;
  name: string;
  workshop: string; // 关联的工坊标识，如 "workshop_1" 或 "工坊一"
  status: string;   // 队伍状态，如 "头脑风暴中"、"开发中"
  members: User[];
}

// 2. 现有 UI 组件来源
import { Badge } from "@/components/ui/badge"; // 状态标签必须用这个
// Icon 必须使用 lucide-react

// 3. 全局色板
// --ifland-primary: #B1FA63 (荧光绿)
// --ifland-dark: #242021 (深碳灰)
📍 节点一：构建 App Shell 与底部导航 (双端兼容版)
目标文件：修改或新建 src/app/dashboard/layout.tsx

容器结构隔离：

最外层容器取消强行限宽，保留全屏能力：<div className="w-full min-h-screen relative">。

主内容区针对移动端预留底部空间：<main className="w-full h-full pb-24 md:pb-0 overflow-y-auto">。

悬浮底部导航 (移动端专属 Floating Bottom Nav)：

必须添加 md:hidden，并在层级上让步给 Modal：使用 z-40（shadcn 默认弹窗是 z-50）。

<nav className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-[24rem] bg-white rounded-full py-3 px-8 flex justify-between items-center shadow-2xl z-40 pb-[max(0.75rem,env(safe-area-inset-bottom))]">

导航按钮激活逻辑：

引入 const pathname = usePathname();

系统大屏匹配：pathname === "/dashboard/system" (精确匹配)。

我的界面匹配：pathname === "/dashboard" || pathname.startsWith("/dashboard/") && !pathname.includes("system")。

📍 节点二：搭建“手机系统大屏” (PC端强隔离)
目标文件：新建 src/app/dashboard/system/page.tsx

PC 端隔离与跳转：

在组件最外层做双端分离渲染：

PC端 (hidden md:flex)：显示一个友好的提示页面 "请在手机端查看此页面，或前往 大屏控制台"。

移动端 (md:hidden flex flex-col)：渲染真正的移动端 UI。

移动端容器与安全区：

根容器：<div className="w-full min-h-screen flex flex-col max-w-md mx-auto bg-[var(--ifland-dark)] relative overflow-hidden">

上半层 (亮色倒计时区)：

顶部刘海安全区：className="bg-[var(--ifland-primary)] pt-[max(3rem,env(safe-area-inset-top))] pb-24 flex flex-col items-center"

Logo：两行黑字 "IF.Land Hackathon"。

倒计时：黑色极粗大数字。

📍 节点三：搭建“手机系统大屏”下半层 (可上拉数据抽屉)
目标文件：继续编辑 src/app/dashboard/system/page.tsx

抽屉容器：

<div className="bg-[var(--ifland-dark)] rounded-t-[2.5rem] flex-1 w-full px-6 pt-6 pb-[max(6rem,env(safe-area-inset-bottom))] -mt-12 relative z-10 text-white flex flex-col gap-6 overflow-y-auto overscroll-contain">

头部操作区：

顶部把手：w-12 h-1.5 bg-gray-600 rounded-full mx-auto mb-2

日落时间与整体进度条。

两个功能按钮（查看大屏、登记状态）。

实时工坊队伍列表 (基于 Existing Context)：

引入：import { useHackathonData } from "@/hooks/useHackathonData";

遍历三个工坊，使用 team.workshop 进行过滤。

队伍卡片 (绿底黑字)：bg-[var(--ifland-primary)] text-[var(--ifland-dark)] rounded-xl p-3 flex flex-col gap-3 relative

状态与队名：引入 <Badge>{team.status}</Badge>。

重叠头像：映射 team.members，使用 member.avatar 作为图片 src。头像必须带 ring-2 ring-[var(--ifland-primary)] bg-white 实现遮挡描边。

📍 节点四：现有队伍界面的防污染保护
目标文件：修改 src/app/dashboard/page.tsx

业务锁死：完全保留原有的逻辑和子组件。

样式防污染：

禁止在最外层强制写死 text-white，这会导致子组件（如白底的卡片）内部文字全部变成白色不可见。

仅改变移动端背景色：className="w-full flex flex-col gap-4 p-4 md:p-8 bg-[var(--ifland-dark)] md:bg-transparent min-h-screen md:min-h-0"。

🧪 节点五：Agent 强制完工验证流程
在完成所有代码修改后，你必须执行以下操作并向我汇报结果：

类型与构建检查：

在终端运行 npx tsc --noEmit 检查 TypeScript 报错。

在终端运行 npm run build 确保没有构建级别的致命错误。

自动化测试 (若环境允许)：

请检查 /e2e 目录下是否有 Playwright 配置。如果有，请运行测试脚本检查。

输出汇报：

若出现 TS 报错或构建失败，请立即自行修复。

若全部通过，请回复：“✅ 移动端 PWA 重构完成，双端隔离与 TS 类型检查已通过。” 并展示核心代码。

修复补丁：
手机端 UI 修复补丁：导航栏补全与上滑抽屉交互
任务：目前的手机端重构存在三个缺陷：底部导航丢失了一个按钮、系统大屏缺少了日落数据模块、且深色面板无法像原生抽屉一样上滑覆盖全屏。请严格按照以下步骤进行修复。

📍 修复 1：补全底部悬浮导航栏 (Bottom Nav)
目标文件：src/app/dashboard/layout.tsx
请找到底部的 <nav> 元素，并彻底重写其内部结构。必须保证是三个等距排列的按钮，大屏在正中间。

TypeScript
{/* 悬浮底部导航 (移动端专属) */}
<nav className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-[24rem] bg-white rounded-full py-3 px-6 flex flex-row justify-between items-center shadow-2xl z-40 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
  {/* 左侧：手册 */}
  <a href="https://build-iflink.feishu.cn/wiki/OMbEw9b9CiBJyOkwGxscSizFn2t?fromScene=spaceOverview" target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-1 text-gray-400 hover:text-black w-16">
    <Book className="w-5 h-5" />
    <span className="text-[10px] font-bold">手册</span>
  </a>

  {/* 中间：系统大屏 */}
  <Link href="/dashboard/system" className={`flex flex-col items-center gap-1 w-16 ${pathname === '/dashboard/system' ? 'text-black' : 'text-gray-400'}`}>
    <Monitor className="w-5 h-5" />
    <span className="text-[10px] font-bold">系统大屏</span>
  </Link>

  {/* 右侧：用户/我的 */}
  <Link href="/dashboard" className={`flex flex-col items-center gap-1 w-16 ${pathname === '/dashboard' || pathname.startsWith('/dashboard/') && !pathname.includes('system') ? 'text-black' : 'text-gray-400'}`}>
    <User className="w-5 h-5" />
    <span className="text-[10px] font-bold">我的</span>
  </Link>
</nav>
(注：请确保页面顶部已经 import { Book, Monitor, User } from "lucide-react";)

📍 修复 2：实现物理视差“上滑抽屉”交互
目标文件：src/app/dashboard/system/page.tsx
不要使用 flex-1 限制高度了。请重构该页面的最外层容器，使用相对定位和外边距来实现上滑覆盖效果。

结构要求：

最外层容器：w-full h-screen overflow-y-auto relative max-w-md mx-auto bg-[var(--ifland-dark)] (注意这里是 h-screen 且支持纵向滚动)。

绿色亮色区 (垫底)：必须改成绝对定位，留在背景中。absolute top-0 left-0 w-full h-[55vh] bg-[var(--ifland-primary)] pt-[max(3rem,env(safe-area-inset-top))] flex flex-col items-center z-0。

深色抽屉区 (覆盖层)：给它一个上边距，让它起始位置在屏幕中下部。relative z-10 w-full min-h-screen bg-[var(--ifland-dark)] mt-[45vh] rounded-t-[2.5rem] px-6 pt-6 pb-32 flex flex-col gap-6 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]。

(原理：当用户上下滑动页面时，垫底的绿色区域不动/随文档滚动，而黑色的 min-h-screen 会滑动上来盖住整个屏幕，完美模拟抽屉效果！)

📍 修复 3：补回丢失的“距离日落”数据模块
目标文件：src/app/dashboard/system/page.tsx
在刚才重构的“深色抽屉区”内部，顶部的把手下面，立即插入以下 UI 代码（不可省略）：

TypeScript
{/* 顶部把手 */}
<div className="w-12 h-1.5 bg-gray-600 rounded-full mx-auto mb-2 flex-shrink-0" />

{/* 核心数据区：日落时间与进度 */}
<div className="flex flex-col gap-4 w-full">
  {/* 日落时间面板 */}
  <div className="flex flex-row justify-between items-center w-full">
    <div className="flex flex-col gap-1">
      <span className="text-[var(--ifland-primary)] font-bold text-xl tracking-wide">距离日落还有</span>
      <span className="text-gray-300 text-sm font-medium">日落时间: 19:00</span>
      <span className="text-gray-500 text-xs mt-1">118.816311°E<br/>31.890438°N</span>
    </div>
    <div className="text-[var(--ifland-primary)] font-black text-6xl leading-none tracking-tighter">
      10H<br/>10M
    </div>
  </div>

  {/* 整体进度条 */}
  <div className="flex items-center gap-3 w-full">
    <span className="text-[var(--ifland-primary)] font-bold text-sm whitespace-nowrap">整体进度</span>
    <div className="flex-1 h-5 bg-gray-800 rounded-full overflow-hidden p-1">
      <div className="w-[78%] h-full bg-[var(--ifland-primary)] rounded-full"></div>
    </div>
    <span className="text-white font-bold text-sm">78%</span>
  </div>
</div>

{/* 下方才是你们原有的：操作按钮组 和 工坊队伍列表... */}
请立即排查并执行这三处修改。完成后向我展示效果。