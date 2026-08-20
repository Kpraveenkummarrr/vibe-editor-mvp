export default function Button({
  as: As = "button",
  variant = "secondary",
  size = "md",
  icon,
  className = "",
  children,
  ...rest
}) {
  const classes = ["ui-btn", `ui-btn--${variant}`, `ui-btn--${size}`, className].filter(Boolean).join(" ");
  return (
    <As className={classes} {...rest}>
      {icon && <span className="ui-btn__icon">{icon}</span>}
      {children}
    </As>
  );
}

export function IconButton({ label, className = "", children, ...rest }) {
  return (
    <button className={`ui-icon-btn ${className}`} aria-label={label} title={label} {...rest}>
      {children}
    </button>
  );
}
