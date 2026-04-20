"use client";

import { useState } from "react";
import {
  IconShare,
  IconBell,
  IconCrown,
  IconBolt,
} from "./icons";

export function Navbar() {
  const [title, setTitle] = useState("东方未来主义Rage｜AIMV - 副本");

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
        <NavButton>
          <span className="text-sm">Miau Skills</span>
        </NavButton>

        <NavIconButton title="分享">
          <IconShare />
        </NavIconButton>

        <NavIconButton title="通知">
          <IconBell />
        </NavIconButton>

        <NavButton className="relative">
          <SaleBadge />
          <IconCrown className="text-amber-400" />
          <span className="text-sm">会员超市</span>
        </NavButton>

        <div className="flex items-center gap-1 px-2">
          <IconBolt className="h-4 w-4 text-emerald-400" />
          <span className="text-sm tabular-nums text-fg-default">1,941</span>
        </div>

        <button className="h-10 w-10 overflow-hidden rounded-full border border-[var(--topnav-btn-border-raw)] bg-[var(--surface-panel-bg)]">
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
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      className={`flex h-10 items-center gap-1.5 rounded-full border border-[var(--topnav-btn-border-raw)] bg-[var(--surface-panel-bg)] px-4 text-fg-default transition-colors hover:bg-[var(--surface-panel-bg-hover)] ${className}`}
    >
      {children}
    </button>
  );
}

function NavIconButton({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  return (
    <button
      title={title}
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
