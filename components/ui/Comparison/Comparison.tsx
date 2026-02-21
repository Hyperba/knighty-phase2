
'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import styles from './Comparison.module.css'

const GLIDE_FACTOR = 0.12
const SNAP_EPSILON = 0.5
const MIN_PERCENT = 0
const MAX_PERCENT = 100

interface ComparisonProps {
    beforeImage: string
    afterImage: string
    altText?: string
}

export default function Comparison({ beforeImage, afterImage, altText = 'Comparison' }: ComparisonProps) {
    const [sliderPosition, setSliderPosition] = useState(50)
    const containerRef = useRef<HTMLDivElement>(null)
    const targetPositionRef = useRef(50)
    const animationFrameRef = useRef<number | null>(null)
    const isDraggingRef = useRef(false)
    const latestPointerXRef = useRef<number | null>(null)

    const lerp = (start: number, end: number, factor: number) => {
        return start + (end - start) * factor
    }

    const animateSlider = useCallback(() => {
        setSliderPosition((current) => {
            const next = lerp(current, targetPositionRef.current, GLIDE_FACTOR)

            if (Math.abs(next - targetPositionRef.current) <= SNAP_EPSILON) {
                animationFrameRef.current = null
                return targetPositionRef.current
            }

            animationFrameRef.current = window.requestAnimationFrame(animateSlider)
            return next
        })
    }, [])

    const updateTargetFromClientX = useCallback((clientX: number) => {
        if (!containerRef.current) return

        const rect = containerRef.current.getBoundingClientRect()
        const x = clientX - rect.left
        const percentage = (x / rect.width) * 100

        targetPositionRef.current = Math.min(Math.max(percentage, MIN_PERCENT), MAX_PERCENT)

        if (animationFrameRef.current === null) {
            animationFrameRef.current = window.requestAnimationFrame(animateSlider)
        }
    }, [animateSlider])

    useEffect(() => {
        const node = containerRef.current
        if (!node) return

        const onPointerDown = (e: PointerEvent) => {
            isDraggingRef.current = true
            latestPointerXRef.current = e.clientX

            try {
                node.setPointerCapture(e.pointerId)
            } catch {
                // ignore
            }

            updateTargetFromClientX(e.clientX)
        }

        const onPointerMove = (e: PointerEvent) => {
            if (!isDraggingRef.current) return
            latestPointerXRef.current = e.clientX
            updateTargetFromClientX(e.clientX)
        }

        const stopDragging = () => {
            isDraggingRef.current = false
            latestPointerXRef.current = null
        }

        node.addEventListener('pointerdown', onPointerDown)
        node.addEventListener('pointermove', onPointerMove)
        node.addEventListener('pointerup', stopDragging)
        node.addEventListener('pointercancel', stopDragging)
        node.addEventListener('pointerleave', stopDragging)

        return () => {
            node.removeEventListener('pointerdown', onPointerDown)
            node.removeEventListener('pointermove', onPointerMove)
            node.removeEventListener('pointerup', stopDragging)
            node.removeEventListener('pointercancel', stopDragging)
            node.removeEventListener('pointerleave', stopDragging)
        }
    }, [updateTargetFromClientX])

    useEffect(() => {
        return () => {
            if (animationFrameRef.current !== null) {
                window.cancelAnimationFrame(animationFrameRef.current)
            }
        }
    }, [])

    return (
        <div 
            ref={containerRef}
            className={styles.comparisonContainer}
        >
            <img
                src={afterImage}
                alt={`${altText} - After`}
                className={styles.baseImage}
                draggable={false}
            />

            <div
                className={styles.overlay}
                style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
            >
                <img
                    src={beforeImage}
                    alt={`${altText} - Before`}
                    className={styles.baseImage}
                    draggable={false}
                />
            </div>

            <div 
                className={styles.slider}
                style={{ left: `${sliderPosition}%` }}
            >
                <div className={styles.sliderLine} />
                <div className={styles.sliderHandle}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M15 18L9 12L15 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M9 18L15 12L9 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                </div>
            </div>
        </div>
    )
}
