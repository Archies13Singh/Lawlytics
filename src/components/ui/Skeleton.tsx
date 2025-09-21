"use client";

import React from "react";

interface SkeletonProps {
  className?: string;
}

export default function Skeleton({ className = "" }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse rounded bg-gray-200/70 dark:bg-gray-700/50 ${className}`}
      aria-hidden="true"
    />
  );
}
