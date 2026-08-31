import React from "react";
import { Platform } from "react-native";
import { TeamAvatar } from "./TeamAvatar";
import { TEAM } from "../data/team";

/**
 * Kyla's avatar — a hand-drawn character portrait modeled on the
 * founders' own reference photos (long center-parted dark-brown hair,
 * warm brown eyes, broad smile, green lace dress). Web renders the SVG
 * through a plain img element; native falls back to the View-drawn
 * avatar so Expo Go never breaks.
 */
const KYLA_SVG = `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
<circle cx="50" cy="50" r="50" fill="#EFE0D2"/>
<!-- back hair: long dark-brown waves falling past the shoulders -->
<path d="M50 10 C31 10 22 25 22 40 C22 55 24 63 19 76 C17 82 18 90 20 96 L80 96 C82 90 83 82 81 76 C76 63 78 55 78 40 C78 25 69 10 50 10 Z" fill="#33200F"/>
<!-- neck -->
<path d="M44 58 L56 58 L56 72 L44 72 Z" fill="#E9BD95"/>
<path d="M44 58 L56 58 L56 63 C52 65 48 65 44 63 Z" fill="#D9A87C"/>
<!-- green lace dress: cap sleeves, scalloped neckline -->
<path d="M16 100 C16 84 30 76 50 76 C70 76 84 84 84 100 Z" fill="#1E3D2F"/>
<path d="M38 78 C42 74.5 46 73.5 50 73.5 C54 73.5 58 74.5 62 78 C58 80 54 81 50 81 C46 81 42 80 38 78 Z" fill="#2A4F3D"/>
<!-- ears -->
<!-- face: soft oval, gentle chin -->
<path d="M50 22 C59.8 22 65.5 30 65.5 41 C65.5 52 59.5 61.5 50 61.5 C40.5 61.5 34.5 52 34.5 41 C34.5 30 40.2 22 50 22 Z" fill="#F2C9A5"/>
<!-- front hair: center part, waves framing the face -->
<path d="M50 11 C33 11 25 24 26 40 C27 47 28 51 30 55 C30.5 48 30 41 32 34 C34 27 38 24 43 23.2 C42 25.2 41.8 26.6 42 28 C43.5 25.2 46.5 23.8 50 23.8 C53.5 23.8 56.5 25.2 58.8 29.5 C58.2 26.6 58 25.2 57 23.2 C62 24 66 27 68 34 C70 41 69.5 48 70 55 C72 51 73 47 74 40 C75 24 67 11 50 11 Z" fill="#3A2515"/>
<!-- side waves over shoulders -->
<path d="M31 42 C28 54 28.5 66 24 75 C28 78.5 33 78 36 75 C32.5 65 33.5 53 34 46 Z" fill="#3F2917"/>
<path d="M69 42 C72 54 71.5 66 76 75 C72 78.5 67 78 64 75 C67.5 65 66.5 53 66 46 Z" fill="#3F2917"/>
<!-- brows: arched, groomed -->
<path d="M38.5 34.4 C40.5 32.4 44.3 32.2 46.3 33.8" stroke="#3A2515" stroke-width="1.4" fill="none" stroke-linecap="round"/>
<path d="M53.7 33.8 C55.7 32.2 59.5 32.4 61.5 34.4" stroke="#3A2515" stroke-width="1.4" fill="none" stroke-linecap="round"/>
<!-- eyes: almond, warm brown -->
<path d="M38.7 39.6 C40 37.8 44 37.6 45.6 39.5 C44.3 41.4 40.2 41.5 38.7 39.6 Z" fill="#FFFFFF"/>
<path d="M54.4 39.5 C56 37.6 60 37.8 61.3 39.6 C59.8 41.5 55.7 41.4 54.4 39.5 Z" fill="#FFFFFF"/>
<circle cx="42.2" cy="39.5" r="1.75" fill="#5C3A1E"/>
<circle cx="57.8" cy="39.5" r="1.75" fill="#5C3A1E"/>
<circle cx="42.2" cy="39.5" r="0.8" fill="#241408"/>
<circle cx="57.8" cy="39.5" r="0.8" fill="#241408"/>
<circle cx="42.8" cy="38.9" r="0.45" fill="#FFFFFF"/>
<circle cx="58.4" cy="38.9" r="0.45" fill="#FFFFFF"/>
<!-- lash lines -->
<path d="M38.4 38.9 C40 37.1 44.2 36.9 45.9 38.7" stroke="#1E1006" stroke-width="1.15" fill="none" stroke-linecap="round"/>
<path d="M54.1 38.7 C55.8 36.9 60 37.1 61.6 38.9" stroke="#1E1006" stroke-width="1.15" fill="none" stroke-linecap="round"/>
<!-- nose: subtle -->
<path d="M49.6 43.5 C49.2 46 49.2 47.2 50.6 47.9" stroke="#DCA981" stroke-width="1" fill="none" stroke-linecap="round"/>
<!-- blush -->
<ellipse cx="39.5" cy="47.5" rx="3.1" ry="1.8" fill="#E8927A" opacity="0.22"/>
<ellipse cx="60.5" cy="47.5" rx="3.1" ry="1.8" fill="#E8927A" opacity="0.22"/>
<!-- broad warm smile with teeth -->
<path d="M43.2 51.2 C45.5 50.6 48 50.9 50 50.9 C52 50.9 54.5 50.6 56.8 51.2 C55.6 55 53 56.6 50 56.6 C47 56.6 44.4 55 43.2 51.2 Z" fill="#B85A4E"/>
<path d="M44.6 51.4 C46.5 51.1 48.5 51.2 50 51.2 C51.5 51.2 53.5 51.1 55.4 51.4 C55 52.7 54 53.5 52.8 53.9 C51 54.4 49 54.4 47.2 53.9 C46 53.5 45 52.7 44.6 51.4 Z" fill="#FFFFFF"/>
<path d="M43.2 51.2 C45.5 50.6 48 50.9 50 50.9 C52 50.9 54.5 50.6 56.8 51.2" stroke="#8F4038" stroke-width="0.6" fill="none"/>
<path d="M29.5 46 C27.5 56 28 66 25.5 73" stroke="#5A3B22" stroke-width="1.6" fill="none" stroke-linecap="round" opacity="0.8"/>
<path d="M70.5 46 C72.5 56 72 66 74.5 73" stroke="#5A3B22" stroke-width="1.6" fill="none" stroke-linecap="round" opacity="0.8"/>
<path d="M33.5 30 C31.5 38 31 46 31.5 52" stroke="#54371F" stroke-width="1.2" fill="none" stroke-linecap="round" opacity="0.6"/>
<path d="M66.5 30 C68.5 38 69 46 68.5 52" stroke="#54371F" stroke-width="1.2" fill="none" stroke-linecap="round" opacity="0.6"/>
</svg>`;

const KYLA_URI = `data:image/svg+xml;utf8,${encodeURIComponent(KYLA_SVG)}`;

const kylaLook = TEAM.find((m) => m.id === "kyla")!.look;

export function KylaPortrait({ size }: { size: number }) {
  if (Platform.OS !== "web") {
    return <TeamAvatar look={kylaLook} size={size} />;
  }
  return React.createElement("img", {
    src: KYLA_URI,
    width: size,
    height: size,
    style: { borderRadius: size / 2, display: "block" },
    alt: "Kyla, Lead Stylist",
  });
}
