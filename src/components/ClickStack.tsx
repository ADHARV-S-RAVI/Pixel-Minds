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
  enableSwipeRight = true,
}) => {
  const [internalIndex, setInternalIndex] = useState(0);
  const isControlled = typeof controlledIndex === 'number';
  const activeIndex = isControlled ? controlledIndex : internalIndex;

  const stackContainerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const isAnimatingRef = useRef(false);

  // Robust pointer tracking
  const activePointerIdRef = useRef<number | null>(null);
  const dragTargetRef = useRef<HTMLDivElement | null>(null);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const dragDeltaRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

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

  // Clean, reset all drag state and release pointer capture
  const resetDragState = useCallback(() => {
    if (dragTargetRef.current && activePointerIdRef.current !== null) {
      try {
        if (dragTargetRef.current.hasPointerCapture(activePointerIdRef.current)) {
          dragTargetRef.current.releasePointerCapture(activePointerIdRef.current);
        }
      } catch {
        // Safe to ignore if capture was already released
      }
    }

    activePointerIdRef.current = null;
    dragTargetRef.current = null;
    isDraggingRef.current = false;
    dragStartRef.current = null;
    dragDeltaRef.current = { x: 0, y: 0 };
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

  // Whenever activeIndex or stack props change:
  // 1. Reset lingering drag state
  // 2. Position every card in the stack with GSAP, strictly resetting rotation to 0 and overwriting previous tweens
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
        rotation: 0, // Enforce 0 rotation on all cards so no residual tilt remains
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

  // Unified Pointer Event Handlers using Pointer Capture
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Only respond to primary pointer (left mouse button or first touch finger)
    if (!e.isPrimary || e.button !== 0 || isAnimatingRef.current) return;

    // Only prevent dragging when clicking explicitly marked non-drag action elements (like bookmark/share) or links
    const targetEl = e.target as HTMLElement;
    if (
      targetEl.closest('[data-no-drag="true"]') ||
      targetEl.closest('a')
    ) {
      return;
    }

    // Only allow starting drag if no drag is already active
    if (isDraggingRef.current) {
      resetDragState();
    }

    const cardEl = e.currentTarget;

    // Prevent browser native drag / text selection
    e.preventDefault();

    try {
      cardEl.setPointerCapture(e.pointerId);
    } catch {
      // ignore if pointer capture unsupported or already captured
    }

    activePointerIdRef.current = e.pointerId;
    dragTargetRef.current = cardEl;
    isDraggingRef.current = true;
    dragStartRef.current = { x: e.clientX, y: e.clientY, time: Date.now() };
    dragDeltaRef.current = { x: 0, y: 0 };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    if (e.pointerId !== activePointerIdRef.current) return;
    if (!dragStartRef.current || !dragTargetRef.current) return;

    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    dragDeltaRef.current = { x: dx, y: dy };

    // Apply live drag feedback only if movement is primarily horizontal (or starting a horizontal drag)
    if (Math.abs(dx) > Math.abs(dy) || Math.abs(dx) > 6) {
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

    // Reset drag refs and release pointer capture immediately
    resetDragState();

    if (!targetEl || !start) return;

    // Calculate true delta at the moment pointer is lifted:
    const dx = e.clientX ? e.clientX - start.x : delta.x;
    const dy = e.clientY ? e.clientY - start.y : delta.y;
    const elapsed = Math.max(Date.now() - start.time, 1);
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);
    const isHorizontal = absDx > absDy * 1.05;
    const velocityX = absDx / elapsed;

    // 1. Swipe Right Detected -> open full details view
    // Works reliably across 100% of card width & height (top, middle, bottom):
    // Either a deliberate 32px drag or a quick 18px flick
    const isSwipeRight =
      enableSwipeRight &&
      isHorizontal &&
      (dx > 32 || (dx > 18 && velocityX > 0.15));

    if (isSwipeRight) {
      // Smoothly return target card to center position with 0 rotation
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

    // 2. Swipe Left Detected -> advance to next card
    const isSwipeLeft =
      isHorizontal &&
      (dx < -32 || (dx < -18 && velocityX > 0.15));

    if (isSwipeLeft) {
      gsap.set(targetEl, { x: 0, rotation: 0 });
      goNext();
      return;
    }

    // 3. Clean Click / Tap Detected (Short duration and small movement)
    // As instructed: "Click to see next"
    if (elapsed < 380 && Math.hypot(dx, dy) < 14) {
      // Reset card position
      gsap.to(targetEl, {
        x: 0,
        rotation: 0,
        duration: 0.18,
        ease: 'power2.out',
        overwrite: 'auto',
      });

      // Click to see next opportunity
      if (activeIndex < items.length - 1) {
        goNext();
      } else {
        onCardClick?.(activeIndex);
      }
      return;
    }

    // Drag cancelled / insufficient distance: smoothly spring back to origin
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

    // If pointer was cancelled (e.g. OS gesture) after an already valid swipe right, still honor it!
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

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in an input or textarea
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return;
      }

      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        goNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goPrev();
      } else if (e.key === 'Enter' || e.key === 'ArrowUp') {
        e.preventDefault();
        onSwipeRight?.(activeIndex);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goNext, goPrev, onSwipeRight, activeIndex]);

  // Visible subset of cards
  const visibleItems = items.slice(activeIndex, activeIndex + visibleCount);

  // Synchronize cardRefs array size with visible items
  cardRefs.current = cardRefs.current.slice(0, visibleItems.length);

  const containerWidth = typeof cardWidth === 'number' ? `${cardWidth}px` : cardWidth;
  const containerHeight = typeof cardHeight === 'number' ? `${cardHeight}px` : cardHeight;

  return (
    <div
      ref={stackContainerRef}
      className={`relative select-none ${className}`}
      style={{
        width: containerWidth,
        height: containerHeight,
        perspective: '1200px',
        touchAction: 'none',
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
                ? 'cursor-grab active:cursor-grabbing pointer-events-auto select-none'
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
              touchAction: isTop ? 'none' : 'auto',
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
