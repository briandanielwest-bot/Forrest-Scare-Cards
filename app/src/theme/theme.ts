export const colors = {
  // Hunter green + gold — every screen reads these tokens rather than raw
  // hex, so retuning the palette here is a one-file change.
  bayou: "#355E3B",
  bayouDark: "#1F3823",
  blazerNavy: "#2A4B32",
  gold: "#C5A028",
  cream: "#FAF6EC",
  paper: "#FFFFFF",
  ink: "#1A1A1A",
  muted: "#6B7280",
  border: "#E4DCC6",
  danger: "#B3432B",
  success: "#3F7A5C",
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const radii = {
  sm: 8,
  md: 14,
  lg: 22,
  pill: 999,
};

export const typography = {
  display: { fontSize: 30, fontWeight: "800" as const, color: colors.ink },
  title: { fontSize: 22, fontWeight: "700" as const, color: colors.ink },
  subtitle: { fontSize: 16, fontWeight: "600" as const, color: colors.muted },
  body: { fontSize: 15, fontWeight: "400" as const, color: colors.ink, lineHeight: 21 },
  small: { fontSize: 12, fontWeight: "500" as const, color: colors.muted },
};
