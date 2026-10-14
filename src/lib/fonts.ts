import { Caveat, DM_Sans, Fraunces } from "next/font/google";

export const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces", axes: ["SOFT", "opsz"], style: ["normal", "italic"] });
export const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-dm-sans" });
// Handwriting font only appears in a few places (gift notes), so it isn’t preloaded on every page.
export const caveat = Caveat({ subsets: ["latin"], variable: "--font-caveat", weight: ["500"], preload: false });

export const fontVars = `${fraunces.variable} ${dmSans.variable} ${caveat.variable}`;
