'use client'

import { ReactNode } from "react"
import Sidebar from "./Sidebar/Sidebar"
import styles from "./AdminLayout.module.css"

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className={styles.layout}>
      <Sidebar />
      <main className={styles.main}>
        <div className={styles.content}>
          {children}
        </div>
      </main>
    </div>
  )
}