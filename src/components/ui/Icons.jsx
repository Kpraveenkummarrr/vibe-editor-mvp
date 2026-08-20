/* Consistent, lightweight stroke-icon set (Lucide-inspired, hand-authored so no new
   dependency is required). Every icon shares the same viewBox, stroke width, and
   line caps so they read as one coherent system rather than mixed styles. */

function Icon({ size = 16, strokeWidth = 1.8, children, ...rest }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  );
}

export function IconMonitor(props) {
  return (
    <Icon {...props}>
      <rect x="3" y="3" width="18" height="14" rx="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </Icon>
  );
}

export function IconCode(props) {
  return (
    <Icon {...props}>
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </Icon>
  );
}

export function IconFolder(props) {
  return (
    <Icon {...props}>
      <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.2a2 2 0 0 1-1.6-.8L9.8 3.8A2 2 0 0 0 8.2 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
    </Icon>
  );
}

export function IconHistory(props) {
  return (
    <Icon {...props}>
      <path d="M3 12a9 9 0 1 0 2.6-6.3" />
      <polyline points="3 4 3 9 8 9" />
      <polyline points="12 8 12 12 15 14" />
    </Icon>
  );
}

export function IconAlertTriangle(props) {
  return (
    <Icon {...props}>
      <path d="M10.3 3.9 2 18a2 2 0 0 0 1.7 3h16.6a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
      <line x1="12" y1="9.5" x2="12" y2="13.5" />
      <line x1="12" y1="16.8" x2="12" y2="16.9" />
    </Icon>
  );
}

export function IconTablet(props) {
  return (
    <Icon {...props}>
      <rect x="5" y="2" width="14" height="20" rx="2" />
      <line x1="12" y1="18" x2="12" y2="18.01" />
    </Icon>
  );
}

export function IconSmartphone(props) {
  return (
    <Icon {...props}>
      <rect x="6.5" y="2" width="11" height="20" rx="2.4" />
      <line x1="12" y1="17.7" x2="12" y2="17.71" />
    </Icon>
  );
}

export function IconChevronDown(props) {
  return (
    <Icon {...props}>
      <polyline points="6 9 12 15 18 9" />
    </Icon>
  );
}

export function IconMenu(props) {
  return (
    <Icon {...props}>
      <line x1="3.5" y1="6.5" x2="20.5" y2="6.5" />
      <line x1="3.5" y1="12" x2="20.5" y2="12" />
      <line x1="3.5" y1="17.5" x2="20.5" y2="17.5" />
    </Icon>
  );
}

export function IconX(props) {
  return (
    <Icon {...props}>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </Icon>
  );
}

export function IconPlus(props) {
  return (
    <Icon {...props}>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </Icon>
  );
}

export function IconSparkles(props) {
  return (
    <Icon strokeWidth={1.5} {...props}>
      <path d="M12 3v3.2M12 17.8V21M4.9 4.9l2.3 2.3M16.8 16.8l2.3 2.3M3 12h3.2M17.8 12H21M4.9 19.1l2.3-2.3M16.8 7.2l2.3-2.3" />
      <circle cx="12" cy="12" r="2.6" />
    </Icon>
  );
}

export function IconEdit(props) {
  return (
    <Icon {...props}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </Icon>
  );
}

export function IconEye(props) {
  return (
    <Icon {...props}>
      <path d="M1.5 12S5 5 12 5s10.5 7 10.5 7-3.5 7-10.5 7S1.5 12 1.5 12Z" />
      <circle cx="12" cy="12" r="3" />
    </Icon>
  );
}

export function IconCopy(props) {
  return (
    <Icon {...props}>
      <rect x="9" y="9" width="12" height="12" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </Icon>
  );
}

export function IconRefresh(props) {
  return (
    <Icon {...props}>
      <polyline points="1 4 1 10 7 10" />
      <path d="M3.5 15a9 9 0 1 0 .9-8.4L1 10" />
    </Icon>
  );
}

export function IconCheck(props) {
  return (
    <Icon {...props}>
      <polyline points="20 6 9 17 4 12" />
    </Icon>
  );
}

export function IconRocket(props) {
  return (
    <Icon {...props}>
      <path d="M12 2c2.5 2 4 5.5 4 9 0 2-.6 3.6-1.4 5H9.4C8.6 14.6 8 13 8 11c0-3.5 1.5-7 4-9Z" />
      <circle cx="12" cy="9" r="1.5" />
      <path d="M8.6 16 6 18.5V21l2.5-1M15.4 16l2.6 2.5V21l-2.5-1" />
    </Icon>
  );
}

export function IconCpu(props) {
  return (
    <Icon {...props}>
      <rect x="7" y="7" width="10" height="10" rx="1.5" />
      <rect x="3" y="10" width="2" height="4" rx="0.5" fill="currentColor" stroke="none" />
      <rect x="19" y="10" width="2" height="4" rx="0.5" fill="currentColor" stroke="none" />
      <rect x="10" y="3" width="4" height="2" rx="0.5" fill="currentColor" stroke="none" />
      <rect x="10" y="19" width="4" height="2" rx="0.5" fill="currentColor" stroke="none" />
    </Icon>
  );
}

export function IconClock(props) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="9" />
      <polyline points="12 7 12 12 15.5 14" />
    </Icon>
  );
}

export function IconHammer(props) {
  return (
    <Icon {...props}>
      <path d="m14.5 3.5 6 6-2.3 2.3-6-6z" />
      <path d="M13.5 8.5 3 19v2h2L15.5 10.5" />
    </Icon>
  );
}

export function IconImage(props) {
  return (
    <Icon {...props}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="9" cy="9" r="2" />
      <path d="m21 15-5-5L5 21" />
    </Icon>
  );
}

export function IconTrash(props) {
  return (
    <Icon {...props}>
      <path d="M3 6h18" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </Icon>
  );
}

export function IconUpload(props) {
  return (
    <Icon {...props}>
      <path d="M12 16V4" />
      <path d="m7 9 5-5 5 5" />
      <path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
    </Icon>
  );
}

export function IconFile(props) {
  return (
    <Icon {...props}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </Icon>
  );
}

export function IconPencil(props) {
  return (
    <Icon {...props}>
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
    </Icon>
  );
}

