import React, { useState, useRef, useEffect, useCallback } from 'react';
import gsap from 'gsap';

export interface ClickStackProps {
  items: React.ReactNode[];
  cardWidth?: number | string;
  cardHeight?: number | string;
  spreadX?: number;
  spreadY?: number;
  duration?: number;
  ease?: string;
  visibleCount?: number;
  depthScale?: number;
  depthOpacity?: number;
  borderRadius?: number | string;
  shadowBlur?: number;
  shadowOpacity?: number;
  cardColor?: string;
  className?: string;
  currentIndex?: number;
  onIndexChange?: (index: number) => void;
  onSwipeRight?: (index: number) => void;
  onCardClick?: (index: number) => void;
  onDesktopCardClick?: (index: number) => void;
  enableSwipeRight?: boolean;
}

export const ClickStack: React.FC<ClickStackProps> = ({
  items,
  cardWidth = 380,
  cardHeight = 560,
  spreadX = 0,
  spreadY = -18,
  duration = 0.38,
  ease = 'power3.out',
  visibleCount = 4,
  depthScale = 0.05,
  depthOpacity = 0.82,
  borderRadius = 28,
  shadowBlur = 24,
  shadowOpacity = 0.12,
  cardColor = 'transparent',
  className = '',
  currentIndex: controlledIndex,
  onIndexChange,
  onSwipeRight,
  onCardClick,
  onDesktopCardClick,
  enableSwipeRight = true,
}) => {
  const [internalIndex, setInternalIndex] = useState(0);
  const isControlled = typeof controlledIndex === 'number';
  const activeIndex = isControlled ? controlledIndex : internalIndex;

  const stackContainerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const isAnimatingRef = useRef(false);

  const activePointerIdRef = useRef<number | null>(null);
  const dragTargetRef = useRef<HTMLDivElement | null>(null);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const dragDeltaRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const gestureLockRef = useRef<'none' | 'horizontal' | 'vertical'>('none');

  const updateIndex = useCallback(
    (newIndex: number) => {
      const clamped = Math.max(0, Math.min(items.length - 1, newIndex));
      if (!isControlled) {
        setInternalIndex(clamped);
      }
      onIndexChange?.(clamped);
    },
    [isControlled, items.length, onIndexChange]
  );

  const resetDragState = useCallback(() => {
    if (dragTargetRef.current && activePointerIdRef.current !== null) {
      try {
        if (dragTargetRef.current.hasPointerCapture(activePointerIdRef.current)) {
          dragTargetRef.current.releasePointerCapture(activePointerIdRef.current);
        }
      } catch {
        // Ignore if already released
      }
    }

    activePointerIdRef.current = null;
    dragTargetRef.current = null;
    isDraggingRef.current = false;
    dragStartRef.current = null;
    dragDeltaRef.current = { x: 0, y: 0 };
    gestureLockRef.current = 'none';
  }, []);

  const goNext = useCallback(() => {
    if (items.length === 0 || isAnimatingRef.current) return;
    if (activeIndex >= items.length - 1) return;

    resetDragState();
    const topCard = cardRefs.current[0];
    if (topCard) {
      isAnimatingRef.current = true;
      gsap.to(topCard, {
        x: -70,
        opacity: 0,
        scale: 0.94,
        rotation: -5,
        duration: duration * 0.65,
        ease,
        overwrite: 'auto',
        onComplete: () => {
          gsap.set(topCard, { x: 0, y: 0, opacity: 1, scale: 1, rotation: 0 });
          updateIndex(activeIndex + 1);
          isAnimatingRef.current = false;
        },
      });
    } else {
      updateIndex(activeIndex + 1);
    }
  }, [activeIndex, items.length, duration, ease, updateIndex, resetDragState]);

  const goPrev = useCallback(() => {
    if (items.length === 0 || isAnimatingRef.current) return;
    if (activeIndex <= 0) return;

    resetDragState();
    isAnimatingRef.current = true;
    updateIndex(activeIndex - 1);
    requestAnimationFrame(() => {
      const topCard = cardRefs.current[0];
      if (topCard) {
        gsap.fromTo(
          topCard,
          { x: -50, opacity: 0, scale: 1.03, rotation: -4 },
          {
            x: 0,
            y: 0,
            opacity: 1,
            scale: 1,
            rotation: 0,
            duration,
            ease,
            overwrite: 'auto',
            onComplete: () => {
              isAnimatingRef.current = false;
            },
          }
        );
      } else {
        isAnimatingRef.current = false;
      }
    });
  }, [activeIndex, items.length, duration, ease, updateIndex, resetDragState]);

  useEffect(() => {
    resetDragState();

    const cards = cardRefs.current;
    cards.forEach((card, i) => {
      if (!card) return;
      const targetY = i * spreadY;
      const targetX = i * spreadX;
      const targetScale = Math.max(0.7, 1 - i * depthScale);
      const targetOpacity = Math.pow(depthOpacity, i);
      const targetZIndex = visibleCount - i;

      gsap.to(card, {
        x: targetX,
        y: targetY,
        rotation: 0,
        scale: targetScale,
        opacity: targetOpacity,
        zIndex: targetZIndex,
        duration,
        ease,
        overwrite: 'auto',
      });
    });
  }, [
    activeIndex,
    spreadX,
    spreadY,
    depthScale,
    depthOpacity,
    visibleCount,
    duration,
    ease,
    resetDragState,
  ]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!e.isPrimary || e.button !== 0 || isAnimatingRef.current) return;

    const targetEl = e.target as HTMLElement;
    if (targetEl.closest('[data-no-drag="true"]') || targetEl.closest('a')) {
      return;
    }

    if (isDraggingRef.current) {
      resetDragState();
    }

    const cardEl = e.currentTarget;

    if (e.pointerType === 'mouse') {
      e.preventDefault();
      try {
        cardEl.setPointerCapture(e.pointerId);
      } catch {}
    }

    activePointerIdRef.current = e.pointerId;
    dragTargetRef.current = cardEl;
    isDraggingRef.current = true;
    gestureLockRef.current = 'none';
    dragStartRef.current = { x: e.clientX, y: e.clientY, time: Date.now() };
    dragDeltaRef.current = { x: 0, y: 0 };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    if (e.pointerId !== activePointerIdRef.current) return;
    if (!dragStartRef.current || !dragTargetRef.current) return;

    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;

    if (gestureLockRef.current === 'none') {
      const absX = Math.abs(dx);
      const absY = Math.abs(dy);
      if (Math.hypot(dx, dy) > 8) {
        if (absY >= absX) {
          gestureLockRef.current = 'vertical';
          isDraggingRef.current = false;
          gsap.to(dragTargetRef.current, {
            x: 0,
            rotation: 0,
            duration: 0.15,
            overwrite: 'auto',
          });
          return;
        } else {
          gestureLockRef.current = 'horizontal';
          try {
            dragTargetRef.current.setPointerCapture(e.pointerId);
          } catch {}
        }
      }
    }

    if (gestureLockRef.current === 'horizontal' || e.pointerType === 'mouse') {
      dragDeltaRef.current = { x: dx, y: dy };
      const dampenedX = dx * 0.48;
      const rotation = dx * 0.032;
      gsap.set(dragTargetRef.current, {
        x: dampenedX,
        rotation,
        overwrite: 'auto',
      });
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerId !== activePointerIdRef.current) return;

    const targetEl = dragTargetRef.current;
    const start = dragStartRef.current;
    const delta = dragDeltaRef.current;
    const locked = gestureLockRef.current;

    resetDragState();

    if (!targetEl || !start) return;

    if (locked === 'vertical') {
      gsap.to(targetEl, {
        x: 0,
        rotation: 0,
        duration: 0.18,
        overwrite: 'auto',
      });
      return;
    }

    const dx = e.clientX ? e.clientX - start.x : delta.x;
    const dy = e.clientY ? e.clientY - start.y : delta.y;
    const elapsed = Math.max(Date.now() - start.time, 1);
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);
    const isHorizontal = absDx > absDy * 1.05;
    const velocityX = absDx / elapsed;

    // 1. Swipe Right -> open full details view
    const isSwipeRight =
      enableSwipeRight &&
      isHorizontal &&
      (dx > 32 || (dx > 18 && velocityX > 0.15));

    if (isSwipeRight) {
      gsap.to(targetEl, {
        x: 0,
        rotation: 0,
        duration: 0.25,
        ease: 'power2.out',
        overwrite: 'auto',
      });
      onSwipeRight?.(activeIndex);
      return;
    }

    // 2. Swipe Left -> dismiss / advance to next card
    const isSwipeLeft =
      isHorizontal &&
      (dx < -32 || (dx < -18 && velocityX > 0.15));

    if (isSwipeLeft) {
      gsap.set(targetEl, { x: 0, rotation: 0 });
      goNext();
      return;
    }

    // 3. Clean Click / Tap Detected
    if (elapsed < 380 && Math.hypot(dx, dy) < 14) {
      gsap.to(targetEl, {
        x: 0,
        rotation: 0,
        duration: 0.18,
        ease: 'power2.out',
        overwrite: 'auto',
      });

      const isDesktopPointer =
        e.pointerType === 'mouse' ||
        (typeof window !== 'undefined' && window.innerWidth >= 1024);

      if (isDesktopPointer && onDesktopCardClick) {
        onDesktopCardClick(activeIndex);
        return;
      }

      if (activeIndex < items.length - 1) {
        goNext();
      } else {
        onCardClick?.(activeIndex);
      }
      return;
    }

    gsap.to(targetEl, {
      x: 0,
      rotation: 0,
      duration: 0.25,
      ease: 'power2.out',
      overwrite: 'auto',
    });
  };

  const handlePointerCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerId !== activePointerIdRef.current) return;

    const targetEl = dragTargetRef.current;
    const start = dragStartRef.current;
    resetDragState();

    if (!targetEl) return;

    if (start) {
      const dx = e.clientX ? e.clientX - start.x : 0;
      const dy = e.clientY ? e.clientY - start.y : 0;
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);
      if (enableSwipeRight && absDx > absDy && dx > 32) {
        gsap.to(targetEl, {
          x: 0,
          rotation: 0,
          duration: 0.25,
          ease: 'power2.out',
          overwrite: 'auto',
        });
        onSwipeRight?.(activeIndex);
        return;
      }
    }

    gsap.to(targetEl, {
      x: 0,
      rotation: 0,
      duration: 0.25,
      ease: 'power2.out',
      overwrite: 'auto',
    });
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return;
      }

      if (e.key === 'ArrowRight') {
        e.preventDefault();
        onSwipeRight?.(activeIndex);
      } else if (e.key === 'ArrowLeft' || e.key === ' ') {
        e.preventDefault();
        goNext();
      } else if (e.key === 'Enter' || e.key === 'ArrowUp') {
        e.preventDefault();
        onSwipeRight?.(activeIndex);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goNext, goPrev, onSwipeRight, activeIndex]);

  const visibleItems = items.slice(activeIndex, activeIndex + visibleCount);
  cardRefs.current = cardRefs.current.slice(0, visibleItems.length);

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
  const responsiveWidth =
    typeof cardWidth === 'number' && isMobile
      ? Math.min(cardWidth, Math.max(300, window.innerWidth - 32))
      : cardWidth;
  const responsiveHeight =
    typeof cardHeight === 'number' && isMobile
      ? Math.min(cardHeight, Math.max(460, window.innerHeight - 230))
      : cardHeight;

  const containerWidth = typeof responsiveWidth === 'number' ? `${responsiveWidth}px` : responsiveWidth;
  const containerHeight = typeof responsiveHeight === 'number' ? `${responsiveHeight}px` : responsiveHeight;

  return (
    <div
      ref={stackContainerRef}
      className={`relative select-none ${className}`}
      style={{
        width: containerWidth,
        height: containerHeight,
        perspective: '1200px',
        touchAction: 'pan-y',
      }}
    >
      {visibleItems.map((item, index) => {
        const isTop = index === 0;
        const itemKey =
          React.isValidElement(item) && item.key != null
            ? String(item.key)
            : `card-slot-${activeIndex + index}`;

        return (
          <div
            key={itemKey}
            ref={(el) => {
              cardRefs.current[index] = el;
            }}
            className={`absolute inset-0 overflow-hidden ${
              isTop
                ? 'cursor-pointer lg:cursor-pointer active:cursor-grabbing pointer-events-auto select-none'
                : 'pointer-events-none select-none'
            }`}
            aria-hidden={!isTop}
            style={{
              borderRadius,
              boxShadow: isTop
                ? `0 ${shadowBlur}px ${shadowBlur * 1.5}px rgba(14, 27, 51, ${shadowOpacity})`
                : `0 ${shadowBlur * 0.5}px ${shadowBlur}px rgba(14, 27, 51, ${shadowOpacity * 0.6})`,
              backgroundColor: cardColor,
              transformOrigin: 'bottom center',
              willChange: 'transform, opacity',
              touchAction: isTop ? 'pan-y' : 'auto',
              pointerEvents: isTop ? 'auto' : 'none',
              userSelect: 'none',
              WebkitUserSelect: 'none',
            }}
            onPointerDown={isTop ? handlePointerDown : undefined}
            onPointerMove={isTop ? handlePointerMove : undefined}
            onPointerUp={isTop ? handlePointerUp : undefined}
            onPointerCancel={isTop ? handlePointerCancel : undefined}
            onDragStart={(e) => e.preventDefault()}
          >
            {item}
          </div>
        );
      })}
    </div>
  );
};

export default ClickStack;