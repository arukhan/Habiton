import type {Metadata,Viewport} from "next";import {AppProvider} from "@/context/AppContext";import "./globals.css";import {ThemeProvider} from "@/components/ThemeProvider";
export const metadata:Metadata={title:"Habiton — Small steps, real growth",description:"A gentle habit tracker with recovery quests and your penguin companion",  icons: {
    icon: "/penguin-icon.png",
    apple: "/penguin-icon.png"},
manifest:"/manifest.webmanifest",appleWebApp:{capable:true,title:"Habiton"}};
export const viewport:Viewport={width:"device-width",initialScale:1,themeColor:"#f5edff"};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body><ThemeProvider><AppProvider>{children}</AppProvider></ThemeProvider></body></html>}
