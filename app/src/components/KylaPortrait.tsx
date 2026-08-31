import React from "react";
import { Platform } from "react-native";
import { TeamAvatar } from "./TeamAvatar";
import { TEAM } from "../data/team";

/**
 * Kyla's portrait — a hand-drawn flat-vector illustration (original art,
 * not a likeness of any real person): mid-30s, warm brown eyes, long dark
 * brown hair, pearls, forest-green blazer.
 *
 * Web renders the SVG through an <img> data URI (react-native-web Image);
 * native falls back to the View-drawn TeamAvatar so nothing breaks in
 * Expo Go.
 */
const KYLA_SVG = `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
<circle cx="50" cy="50" r="50" fill="#EFE0D2"/>
<path d="M50 11 C30 11 22 26 22 41 C22 57 25 67 20 79 L39 79 C35 67 33 56 33 46 L67 46 C67 56 65 67 61 79 L80 79 C75 67 78 57 78 41 C78 26 70 11 50 11 Z" fill="#3B2314"/>
<rect x="45" y="56" width="10" height="13" fill="#E8BD97"/>
<path d="M18 100 C18 83 32 76 50 76 C68 76 82 83 82 100 Z" fill="#1F3A34"/>
<path d="M46.8 76 L50 80.5 L53.2 76 Z" fill="#EFCBA8"/>
<circle cx="46" cy="77.5" r="1.4" fill="#EEE6D8"/>
<circle cx="50" cy="79" r="1.4" fill="#EEE6D8"/>
<circle cx="54" cy="77.5" r="1.4" fill="#EEE6D8"/>
<circle cx="34" cy="44" r="2.7" fill="#EFC5A0"/>
<circle cx="66" cy="44" r="2.7" fill="#EFC5A0"/>
<circle cx="34" cy="48" r="1.5" fill="none" stroke="#D9A93E" stroke-width="1"/>
<circle cx="66" cy="48" r="1.5" fill="none" stroke="#D9A93E" stroke-width="1"/>
<ellipse cx="50" cy="42" rx="16.5" ry="19" fill="#F0C9A6"/>
<path d="M50 13 C33 13 27 25 28 39 C30.5 28 35.5 24.5 40 24 C37 29.5 36 34.5 37 38.5 C39.5 29 44 25.5 50 25.5 C56 25.5 60.5 29 63 38.5 C64 34.5 63 29.5 60 24 C64.5 24.5 69.5 28 72 39 C73 25 67 13 50 13 Z" fill="#3B2314"/>
<path d="M33 38 C30.5 49 30 60 25.5 69 C30 71.5 35 71 37.5 68.5 C34.5 60 34.5 49 35 43 Z" fill="#472C19"/>
<path d="M67 38 C69.5 49 70 60 74.5 69 C70 71.5 65 71 62.5 68.5 C65.5 60 65.5 49 65 43 Z" fill="#472C19"/>
<path d="M38.6 35.2 C40.6 33.6 44.2 33.5 46 34.9" stroke="#33200F" stroke-width="1.5" fill="none" stroke-linecap="round"/>
<path d="M54 34.9 C55.8 33.5 59.4 33.6 61.4 35.2" stroke="#33200F" stroke-width="1.5" fill="none" stroke-linecap="round"/>
<ellipse cx="42.6" cy="40.2" rx="3.4" ry="2.4" fill="#FFFFFF"/>
<ellipse cx="57.4" cy="40.2" rx="3.4" ry="2.4" fill="#FFFFFF"/>
<circle cx="42.7" cy="40.4" r="1.9" fill="#6B4226"/>
<circle cx="57.3" cy="40.4" r="1.9" fill="#6B4226"/>
<circle cx="42.7" cy="40.4" r="0.9" fill="#2B1A0E"/>
<circle cx="57.3" cy="40.4" r="0.9" fill="#2B1A0E"/>
<circle cx="43.4" cy="39.6" r="0.55" fill="#FFFFFF"/>
<circle cx="58" cy="39.6" r="0.55" fill="#FFFFFF"/>
<path d="M39 38.7 C41 37.1 44.4 37.1 46 38.5" stroke="#241408" stroke-width="1.1" fill="none" stroke-linecap="round"/>
<path d="M54 38.5 C55.6 37.1 59 37.1 61 38.7" stroke="#241408" stroke-width="1.1" fill="none" stroke-linecap="round"/>
<path d="M49.5 44 C49.1 46.4 49.1 47.4 50.4 48.1" stroke="#D9A87F" stroke-width="1" fill="none" stroke-linecap="round"/>
<ellipse cx="39" cy="47.5" rx="3" ry="1.7" fill="#E58D74" opacity="0.32"/>
<ellipse cx="61" cy="47.5" rx="3" ry="1.7" fill="#E58D74" opacity="0.32"/>
<path d="M45 52.6 C47 51.7 49 52.1 50 52.1 C51 52.1 53 51.7 55 52.6 C53.6 55.2 51.8 56 50 56 C48.2 56 46.4 55.2 45 52.6 Z" fill="#C4635A"/>
<path d="M45.4 52.7 C47.8 53.4 52.2 53.4 54.6 52.7" stroke="#A84D46" stroke-width="0.5" fill="none"/>
</svg>`;

const KYLA_URI = `data:image/svg+xml;utf8,${encodeURIComponent(KYLA_SVG)}`;

const kylaLook = TEAM.find((m) => m.id === "kyla")!.look;

export function KylaPortrait({ size }: { size: number }) {
  if (Platform.OS !== "web") {
    return <TeamAvatar look={kylaLook} size={size} />;
  }
  // A plain DOM <img> — react-native-web's Image component silently
  // refused the SVG data URI (no element ever reached the DOM), while a
  // real img renders it perfectly. Expo web is React DOM underneath, so
  // this is safe on the only platform that reaches this branch.
  return React.createElement("img", {
    src: KYLA_URI,
    width: size,
    height: size,
    style: { borderRadius: size / 2, display: "block" },
    alt: "Kyla, Lead Stylist",
  });
}
