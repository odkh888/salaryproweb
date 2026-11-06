import React from "react";
import * as Icons from "lucide-react";

interface CategoryIconProps {
  name: string;
  className?: string;
  size?: number;
}

export function CategoryIcon({ name, className = "w-5 h-5", size = 20 }: CategoryIconProps) {
  // @ts-expect-error dynamic lucide icon lookup
  const IconComponent = Icons[name] || Icons.Tag;
  return <IconComponent className={className} size={size} />;
}
