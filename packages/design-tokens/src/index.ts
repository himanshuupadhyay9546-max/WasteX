export const colors = {
  background: "#090d16",
  surface: "#111827",
  surfaceBorder: "#1f293d",
  surfaceCard: "#161e31",
  
  // Brand accents
  primary: {
    50: "#ecfdf5",
    100: "#d1fae5",
    400: "#34d399",
    500: "#10b981",
    600: "#059669",
    700: "#047857"
  },
  accent: {
    cyan: "#06b6d4",
    sky: "#38bdf8",
    amber: "#f59e0b",
    rose: "#f43f5e",
    purple: "#a855f7",
    emerald: "#10b981"
  },
  
  // Bin fill levels
  binFill: {
    normal: "#10b981",    // < 50%
    medium: "#f59e0b",    // 50% - 75%
    high: "#ea580c",      // 75% - 85%
    overflow: "#f43f5e"   // >= 85%
  },

  // Traffic congestion levels
  traffic: {
    free: "#10b981",
    moderate: "#f59e0b",
    heavy: "#ef4444",
    gridlock: "#881337"
  },

  // Dumping severity
  severity: {
    low: { bg: "rgba(100, 116, 139, 0.2)", text: "#94a3b8", border: "#475569" },
    medium: { bg: "rgba(245, 158, 11, 0.2)", text: "#f59e0b", border: "rgba(245, 158, 11, 0.4)" },
    high: { bg: "rgba(234, 88, 12, 0.2)", text: "#ea580c", border: "rgba(234, 88, 12, 0.4)" },
    critical: { bg: "rgba(244, 63, 94, 0.2)", text: "#f43f5e", border: "rgba(244, 63, 94, 0.5)" }
  }
};

export const typography = {
  fontFamily: {
    sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
    mono: ["JetBrains Mono", "monospace"]
  }
};
