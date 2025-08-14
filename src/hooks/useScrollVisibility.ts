import { useEffect, useRef, useState } from 'react';

/**
 * Hook to manage scroll visibility for Safari-style scrollbars
 * Shows scrollbar temporarily when scrolling, like macOS Safari
 */
export function useScrollVisibility(element?: HTMLElement | null) {
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout>();
  const elementRef = useRef<HTMLElement>(null);

  const targetElement = element || elementRef.current;

  useEffect(() => {
    if (!targetElement) return;

    const handleScrollStart = () => {
      setIsScrolling(true);
      targetElement.classList.add('scrolling');
      
      // Clear existing timeout
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };

    const handleScrollEnd = () => {
      // Hide scrollbar after 1 second of no scrolling
      scrollTimeoutRef.current = setTimeout(() => {
        setIsScrolling(false);
        targetElement.classList.remove('scrolling');
      }, 1000);
    };

    const handleScroll = () => {
      handleScrollStart();
      handleScrollEnd();
    };

    // Also show scrollbar when mouse enters the scrollable area
    const handleMouseEnter = () => {
      setIsScrolling(true);
      targetElement.classList.add('scrolling');
    };

    const handleMouseLeave = () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      
      scrollTimeoutRef.current = setTimeout(() => {
        setIsScrolling(false);
        targetElement.classList.remove('scrolling');
      }, 500);
    };

    targetElement.addEventListener('scroll', handleScroll, { passive: true });
    targetElement.addEventListener('mouseenter', handleMouseEnter);
    targetElement.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      
      targetElement.removeEventListener('scroll', handleScroll);
      targetElement.removeEventListener('mouseenter', handleMouseEnter);
      targetElement.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [targetElement]);

  return {
    isScrolling,
    elementRef,
  };
}