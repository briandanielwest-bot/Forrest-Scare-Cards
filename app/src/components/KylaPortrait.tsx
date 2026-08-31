import React from "react";
import { Image } from "react-native";

/**
 * Kyla's face — the founders' own photo, used as the brand's face across
 * the app (Welcome team grid, interview chat, plan-building screen).
 * A require()'d static asset renders on web and native alike.
 */
const KYLA_PHOTO = require("../../assets/kyla.jpg");

export function KylaPortrait({ size }: { size: number }) {
  return <Image source={KYLA_PHOTO} style={{ width: size, height: size, borderRadius: size / 2 }} />;
}
