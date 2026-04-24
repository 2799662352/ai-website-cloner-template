"use client";

import { useState } from "react";
import {
  IconShare,
  IconBell,
  IconCrown,
  IconBolt,
} from "./icons";
import { toast } from "@/components/ui/Toast";

export function Navbar() {
  const [title, setTitle] = useState("东方未来主义Rage｜AIMV - 副本");

  const handleSave = () => {
    toast("已保存到本地草稿", "success");
  };

  const handleShare = () => {
    toast("功能开发中：分享画布", "info");
  };

  const handleNotifications = () => {
    toast("暂无新通知", "info");
  };

  const handleAvatar = () => {
    toast("功能开发中：账户中心", "info");
  };

  const handleMembership = () => {
    toast("功能开发中：会员超市", "info");
  };

  const handleMiauSkills = () => {
    toast("功能开发中：Miau Skills", "info");
  };

  return (
    <nav className="pointer-events-none absolute left-0 right-0 top-4 z-40 flex h-12 items-center justify-between pl-2 pr-4">
      {/* Left section */}
      <div className="pointer-events-auto flex items-center gap-2">
        <button className="flex h-10 items-center gap-1.5 rounded-full border border-[var(--topnav-btn-border-raw)] bg-[var(--surface-panel-bg)] px-3 transition-colors hover:bg-[var(--surface-panel-bg-hover)]">
          <LogoIcon />
          <span className="text-sm font-medium text-fg-default">Miau</span>
        </button>

        <div className="flex items-center gap-1">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="h-8 w-64 rounded-md bg-transparent px-2 text-sm text-fg-default outline-none focus:bg-[var(--surface-panel-bg-hover)]"
          />
        </div>
      </div>

      {/* Right section */}
      <div className="pointer-events-auto flex items-center gap-2">
        <NavButton onClick={handleSave} title="保存画布 ⌘S">
          <SaveCloudIcon />
          <span className="text-sm">保存画布</span>
        </NavButton>

        <NavButton onClick={handleMiauSkills}>
          <span className="text-sm">Miau Skills</span>
        </NavButton>

        <NavIconButton title="分享" onClick={handleShare}>
          <IconShare />
        </NavIconButton>

        <NavIconButton title="通知" onClick={handleNotifications}>
          <IconBell />
        </NavIconButton>

        <NavButton onClick={handleMembership} className="relative">
          <SaleBadge />
          <IconCrown className="text-amber-400" />
          <span className="text-sm">会员超市</span>
        </NavButton>

        <div className="flex items-center gap-1 px-2">
          <IconBolt className="h-4 w-4 text-emerald-400" />
          <span className="text-sm tabular-nums text-fg-default">1,941</span>
        </div>

        <button
          onClick={handleAvatar}
          title="账户"
          className="h-10 w-10 overflow-hidden rounded-full border border-[var(--topnav-btn-border-raw)] bg-[var(--surface-panel-bg)] transition-transform hover:scale-105"
        >
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600 text-xs font-bold text-white">
            U
          </div>
        </button>
      </div>
    </nav>
  );
}

function NavButton({
  children,
  className = "",
  onClick,
  title,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  title?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`flex h-10 items-center gap-1.5 rounded-full border border-[var(--topnav-btn-border-raw)] bg-[var(--surface-panel-bg)] px-4 text-fg-default transition-colors hover:bg-[var(--surface-panel-bg-hover)] ${className}`}
    >
      {children}
    </button>
  );
}

function NavIconButton({
  children,
  title,
  onClick,
}: {
  children: React.ReactNode;
  title: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--topnav-btn-border-raw)] bg-[var(--surface-panel-bg)] text-fg-default transition-colors hover:bg-[var(--surface-panel-bg-hover)]"
    >
      {children}
    </button>
  );
}

function SaleBadge() {
  return (
    <span className="absolute -right-1 -top-2 rounded-sm bg-orange-500 px-1 text-[10px] font-bold leading-tight text-white">
      限时 39 折
    </span>
  );
}

function SaveCloudIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.5 11a3 3 0 0 1 1.6-5.5A4 4 0 0 1 12 6.5a2.5 2.5 0 0 1 0 5h-9z" />
      <path d="M8 8v3m0 0l-1.5-1.5M8 11l1.5-1.5" />
    </svg>
  );
}

function LogoIcon() {
  return (
    <img
      src="/miau-cat-logo.png"
      alt="Miau"
      width={24}
      height={24}
      className="object-contain"
      draggable={false}
    />
  );
}
