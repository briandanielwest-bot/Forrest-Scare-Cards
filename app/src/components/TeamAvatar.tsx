import React from "react";
import { View } from "react-native";

/**
 * Flat illustrated portrait for a team member, drawn entirely with Views so
 * it renders identically on web and native with zero image assets or deps.
 * Every measurement is a fraction of `size`, so it scales cleanly.
 */
export interface AvatarLook {
  bg: string; // backdrop circle
  skin: string;
  hair: string;
  eye: string;
  jacket: string;
  hairStyle: "long" | "short" | "buzz";
  accessory?: "necklace" | "tie" | "pocketSquare";
  accent?: string; // necklace/tie/pocket-square color
  beard?: boolean;
  // Softer feminine features: full lips instead of the line smile, plus a
  // hint of blush.
  lips?: boolean;
}

export function TeamAvatar({ look, size }: { look: AvatarLook; size: number }) {
  const s = (f: number) => f * size;
  const abs = "absolute" as const;
  const isLong = look.hairStyle === "long";

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: look.bg,
        overflow: "hidden",
      }}
    >
      {/* hair mass behind the face (long styles) */}
      {isLong ? (
        <View
          style={{
            position: abs,
            width: s(0.66),
            height: s(0.85),
            top: s(0.08),
            left: s(0.17),
            borderTopLeftRadius: s(0.33),
            borderTopRightRadius: s(0.33),
            backgroundColor: look.hair,
          }}
        />
      ) : null}

      {/* neck */}
      <View style={{ position: abs, width: s(0.16), height: s(0.18), top: s(0.56), left: s(0.42), backgroundColor: look.skin }} />

      {/* jacket / shoulders */}
      <View
        style={{
          position: abs,
          width: s(0.92),
          height: s(0.4),
          bottom: -s(0.06),
          left: s(0.04),
          borderTopLeftRadius: s(0.28),
          borderTopRightRadius: s(0.28),
          backgroundColor: look.jacket,
        }}
      />
      {/* shirt V */}
      <View
        style={{
          position: abs,
          width: s(0.13),
          height: s(0.13),
          bottom: s(0.16),
          left: s(0.435),
          backgroundColor: "#F7F3EA",
          transform: [{ rotate: "45deg" }],
        }}
      />
      {look.accessory === "tie" ? (
        <View
          style={{
            position: abs,
            width: s(0.06),
            height: s(0.19),
            bottom: s(0.0),
            left: s(0.47),
            borderRadius: s(0.02),
            backgroundColor: look.accent ?? "#7A2E2E",
          }}
        />
      ) : null}

      {/* long hair falls over the shoulders */}
      {isLong ? (
        <>
          <View
            style={{
              position: abs,
              width: s(0.14),
              height: s(0.52),
              top: s(0.26),
              left: s(0.155),
              borderRadius: s(0.07),
              backgroundColor: look.hair,
            }}
          />
          <View
            style={{
              position: abs,
              width: s(0.14),
              height: s(0.52),
              top: s(0.26),
              right: s(0.155),
              borderRadius: s(0.07),
              backgroundColor: look.hair,
            }}
          />
        </>
      ) : null}

      {/* face */}
      <View
        style={{
          position: abs,
          width: s(0.5),
          height: s(0.55),
          top: s(0.13),
          left: s(0.25),
          borderRadius: s(0.25),
          backgroundColor: look.skin,
        }}
      />

      {/* beard hugs the jaw, under the mouth */}
      {look.beard ? (
        <View
          style={{
            position: abs,
            width: s(0.42),
            height: s(0.2),
            top: s(0.5),
            left: s(0.29),
            borderBottomLeftRadius: s(0.21),
            borderBottomRightRadius: s(0.21),
            backgroundColor: look.hair,
            opacity: 0.9,
          }}
        />
      ) : null}

      {/* top hair — a soft side-swept fringe on feminine faces, fuller crop otherwise */}
      {look.hairStyle !== "buzz" ? (
        <View
          style={{
            position: abs,
            width: s(0.56),
            height: look.lips ? s(0.17) : isLong ? s(0.24) : s(0.22),
            top: s(0.1),
            left: s(0.22),
            borderTopLeftRadius: s(0.28),
            borderTopRightRadius: s(0.28),
            borderBottomRightRadius: look.lips ? s(0.24) : isLong ? s(0.14) : 0,
            borderBottomLeftRadius: look.lips ? s(0.05) : 0,
            backgroundColor: look.hair,
          }}
        />
      ) : (
        <View
          style={{
            position: abs,
            width: s(0.52),
            height: s(0.14),
            top: s(0.11),
            left: s(0.24),
            borderTopLeftRadius: s(0.26),
            borderTopRightRadius: s(0.26),
            backgroundColor: look.hair,
            opacity: 0.85,
          }}
        />
      )}

      {/* brows — higher and finer on feminine faces for an open expression */}
      <View style={{ position: abs, width: s(0.1), height: look.lips ? s(0.02) : s(0.028), top: look.lips ? s(0.33) : s(0.36), left: s(0.32), borderRadius: s(0.02), backgroundColor: look.hair }} />
      <View style={{ position: abs, width: s(0.1), height: look.lips ? s(0.02) : s(0.028), top: look.lips ? s(0.33) : s(0.36), left: s(0.58), borderRadius: s(0.02), backgroundColor: look.hair }} />

      {/* eyes, with a catchlight so they read alive at small sizes */}
      <View style={{ position: abs, width: look.lips ? s(0.068) : s(0.06), height: look.lips ? s(0.085) : s(0.075), top: s(0.4), left: s(0.335), borderRadius: s(0.045), backgroundColor: look.eye }} />
      <View style={{ position: abs, width: look.lips ? s(0.068) : s(0.06), height: look.lips ? s(0.085) : s(0.075), top: s(0.4), left: s(0.597), borderRadius: s(0.045), backgroundColor: look.eye }} />
      {look.lips ? (
        <>
          <View style={{ position: abs, width: s(0.085), height: s(0.02), top: s(0.388), left: s(0.328), borderRadius: s(0.01), backgroundColor: "#241812" }} />
          <View style={{ position: abs, width: s(0.085), height: s(0.02), top: s(0.388), left: s(0.59), borderRadius: s(0.01), backgroundColor: "#241812" }} />
        </>
      ) : null}
      <View style={{ position: abs, width: s(0.02), height: s(0.02), top: s(0.41), left: s(0.365), borderRadius: s(0.01), backgroundColor: "#FFFFFF" }} />
      <View style={{ position: abs, width: s(0.02), height: s(0.02), top: s(0.41), left: s(0.625), borderRadius: s(0.01), backgroundColor: "#FFFFFF" }} />

      {/* blush */}
      {look.lips ? (
        <>
          <View style={{ position: abs, width: s(0.07), height: s(0.045), top: s(0.47), left: s(0.3), borderRadius: s(0.035), backgroundColor: "#D98A74", opacity: 0.4 }} />
          <View style={{ position: abs, width: s(0.07), height: s(0.045), top: s(0.47), left: s(0.63), borderRadius: s(0.035), backgroundColor: "#D98A74", opacity: 0.4 }} />
        </>
      ) : null}

      {/* mouth: full lips for a feminine face, warm line smile otherwise */}
      {look.lips ? (
        <View
          style={{
            position: abs,
            width: s(0.13),
            height: s(0.055),
            top: s(0.535),
            left: s(0.435),
            borderRadius: s(0.03),
            backgroundColor: "#C05E52",
          }}
        />
      ) : (
        <View
          style={{
            position: abs,
            width: s(0.14),
            height: s(0.07),
            top: s(0.52),
            left: s(0.43),
            borderBottomWidth: Math.max(2, s(0.025)),
            borderBottomColor: look.beard ? "#F7F3EA" : "#A65B4B",
            borderBottomLeftRadius: s(0.07),
            borderBottomRightRadius: s(0.07),
          }}
        />
      )}

      {/* necklace: three small dots along the neckline */}
      {look.accessory === "necklace" ? (
        <>
          <View style={{ position: abs, width: s(0.045), height: s(0.045), bottom: s(0.2), left: s(0.42), borderRadius: s(0.03), backgroundColor: look.accent ?? "#D9B24C" }} />
          <View style={{ position: abs, width: s(0.045), height: s(0.045), bottom: s(0.185), left: s(0.478), borderRadius: s(0.03), backgroundColor: look.accent ?? "#D9B24C" }} />
          <View style={{ position: abs, width: s(0.045), height: s(0.045), bottom: s(0.2), left: s(0.536), borderRadius: s(0.03), backgroundColor: look.accent ?? "#D9B24C" }} />
        </>
      ) : null}

      {/* pocket square peek */}
      {look.accessory === "pocketSquare" ? (
        <View
          style={{
            position: abs,
            width: s(0.09),
            height: s(0.05),
            bottom: s(0.13),
            left: s(0.66),
            borderTopLeftRadius: s(0.02),
            borderTopRightRadius: s(0.02),
            backgroundColor: look.accent ?? "#D9B24C",
          }}
        />
      ) : null}
    </View>
  );
}
