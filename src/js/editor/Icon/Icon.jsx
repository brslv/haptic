import React from 'react';

export default function Icon(
  {
    name,
    width = "24",
    height = "24",
    fill = "none",
    stroke = "default",
    strokeWidth = "2",
    active = false,
    ...rest
  } = {
    name: "plus",
    width: "24",
    height: "24",
    fill: "none",
    stroke: "default",
    strokeWidth: "2",
    active: false,
  }
) {
  const colors = {
    disabled: "#D1D5DB",
    white: "white",
    black: "black",
    muted: "#6B7280",
    faded: "#9CA3AF",
    default: "black",
    primary: "#FCD34D",
    primaryDark: "#FBBF24",
    danger: "#EF4444",
    twitter: "#1DA1F2",
  };

  return (
    <svg
      width={width}
      height={height}
      fill={colors[fill] ? colors[fill] : "none"}
      stroke={`${active ? colors.primary : colors[stroke] || colors.default}`}
      strokeWidth={`${strokeWidth}`}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...rest}
    >
      <use xlinkHref={`/static/images/icons/feather-sprite.svg#${name}`} />
    </svg>
  );
}
