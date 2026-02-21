import { ReactNode, Suspense } from "react"
import Navbar from "./Navbar/Navbar"
import Footer from "./Footer/Footer"
import styles from './NavFootLayout.module.css'
import ScrollToTop from "@/components/ui/ScrollToTop/ScrollToTop"
import PageTransition from "@/components/ui/PageTransition/PageTransition"

export default function NavFootLayout({ children }: { children: ReactNode }) {
    return (
        <>
            <Suspense fallback={null}>
                <ScrollToTop />
            </Suspense>
            <PageTransition />
            <div className={styles.navbarWrapper}>
                <Navbar />
            </div>
            {children}
            <Footer />
        </>
    )
}