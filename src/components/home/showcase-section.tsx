"use client";

import { useState, useEffect } from "react";
import { GitBranch } from "lucide-react";
import type { Project, TagColor } from "@/types";

const TAG_STYLES: Record<TagColor, string> = {
  green: "text-ifland-primary border-ifland-primary/30 bg-ifland-primary/10",
  orange: "text-ifland-orange border-ifland-orange/30 bg-ifland-orange/10",
  purple: "text-ifland-purple border-ifland-purple/30 bg-ifland-purple/10",
};

const CATEGORIES = ["全部", "AI+教育", "AI+校园", "AIGC", "智慧交通", "硬件交互"];

// 降级 Mock 数据
const FALLBACK_PROJECTS: Project[] = [
  {
    id: "01",
    projectName: "NeuroLink",
    teamName: "Techin",
    description: "基于脑机接口的实时协作白板，支持多模态输入与 AI 辅助创意生成",
    posterUrl: null,
    githubUrl: "https://github.com",
    tags: [{ name: "AI+教育", color: "green" }, { name: "硬件交互", color: "orange" }],
  },
  {
    id: "02",
    projectName: "CampusPulse",
    teamName: "Campus",
    description: "校园活动智能推荐引擎，利用 LLM 分析用户兴趣实现个性化活动匹配",
    posterUrl: null,
    githubUrl: "https://github.com",
    tags: [{ name: "AI+校园", color: "purple" }, { name: "推荐系统", color: "green" }],
  },
  {
    id: "03",
    projectName: "行无忧",
    teamName: "行无忧",
    description: "基于多源数据的智能出行规划平台，实时路况预测与碳排放追踪",
    posterUrl: null,
    githubUrl: null,
    tags: [{ name: "智慧交通", color: "orange" }, { name: "绿色计算", color: "green" }],
  },
  {
    id: "04",
    projectName: "DreamWeaver",
    teamName: "全网最尊重前额叶队",
    description: "梦境可视化创作工具，将 AI 生成的叙事转化为交互式 3D 场景",
    posterUrl: null,
    githubUrl: "https://github.com",
    tags: [{ name: "AIGC", color: "purple" }, { name: "3D渲染", color: "orange" }],
  },
];

function SkeletonCard() {
  return (
    <div className="flex flex-col border border-gray-800 bg-[#1a1a1a]">
      <div className="aspect-[4/3] w-full animate-pulse bg-gray-800" />
      <div className="flex flex-col gap-3 p-4">
        <div className="h-5 w-2/3 animate-pulse rounded bg-gray-800" />
        <div className="h-4 w-1/3 animate-pulse rounded bg-gray-800" />
        <div className="h-4 w-full animate-pulse rounded bg-gray-800" />
      </div>
    </div>
  );
}

export function ShowcaseSection() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/projects")
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data?.length > 0) {
          setProjects(json.data);
        } else {
          setProjects(FALLBACK_PROJECTS);
        }
      })
      .catch(() => {
        setProjects(FALLBACK_PROJECTS);
      })
      .finally(() => setLoading(false));
  }, []);

  const displayProjects = loading ? [] : projects;

  return (
    <section className="w-full border-t border-gray-800 bg-[var(--ifland-dark)] py-16 text-white md:py-24">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        {/* 头部 */}
        <div className="mb-10 flex flex-col gap-4 md:mb-14">
          <h2 className="font-mono text-3xl font-bold tracking-widest text-ifland-primary md:text-5xl">
            PROJECT SHOWCASE
          </h2>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {CATEGORIES.map((cat) => (
              <span
                key={cat}
                className="shrink-0 cursor-pointer rounded border border-gray-700 px-3 py-1 text-sm text-gray-400 transition-colors hover:border-ifland-primary hover:text-ifland-primary first:border-ifland-primary first:text-ifland-primary"
              >
                {cat}
              </span>
            ))}
          </div>
        </div>

        {/* 卡片网格 */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
            : displayProjects.map((project) => (
                <div
                  key={project.id}
                  className="group relative flex flex-col border border-gray-800 bg-[#1a1a1a] transition-colors hover:border-ifland-primary"
                >
                  {/* 海报区 */}
                  <div className="relative aspect-[4/3] w-full overflow-hidden bg-gray-900">
                    {project.posterUrl ? (
                      <img
                        src={project.posterUrl}
                        alt={project.projectName}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
                        <img
                          src="/icons/IF.Land%20Light%20Logo.svg"
                          alt=""
                          className="w-16 opacity-30"
                        />
                      </div>
                    )}
                    {/* 编号标签 */}
                    <span className="absolute left-0 top-0 bg-ifland-primary px-2 py-0.5 font-mono text-sm font-bold text-ifland-dark">
                      #{project.id}
                    </span>
                  </div>

                  {/* 内容区 */}
                  <div className="flex flex-1 flex-col gap-2 p-4">
                    <h3 className="text-lg font-bold">{project.projectName}</h3>
                    <p className="text-sm font-medium text-ifland-primary">{project.teamName}</p>
                    <p className="line-clamp-2 text-sm text-gray-400">{project.description}</p>

                    {/* 标签 + GitHub */}
                    <div className="mt-auto flex items-center gap-2 pt-3">
                      {project.tags.map((tag) => (
                        <span
                          key={tag.name}
                          className={`rounded border px-2 py-0.5 text-xs ${TAG_STYLES[tag.color]}`}
                        >
                          {tag.name}
                        </span>
                      ))}
                      {project.githubUrl && (
                        <a
                          href={project.githubUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-auto text-gray-500 transition-colors hover:text-ifland-primary"
                        >
                          <GitBranch className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
        </div>
      </div>
    </section>
  );
}
