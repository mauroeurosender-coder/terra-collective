import { Caveat, DM_Sans, Fraunces } from "next/font/google";

export const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces", axes: ["SOFT", "WONK", "opsz"], style: ["normal", "italic"] });
export const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-dm-sans" });
export const caveat = Caveat({ subsets: ["latin"], variable: "--font-caveat", weight: ["500"] });

export const fontVars = `${fraunces.variable} ${dmSans.variable} ${caveat.variable}`;
