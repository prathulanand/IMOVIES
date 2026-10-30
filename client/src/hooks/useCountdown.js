import { useState, useEffect, useRef } from 'react';

export function useCountdown(targetDate, onExpire) {
  const calculateTimeLeft = () => {
    if (!targetDate) return null;
    const targetMs = new Date(targetDate).getTime();
    if (isNaN(targetMs)) return null;
    const diff = targetMs - Date.now();
    return Math.max(0, Math.floor(diff / 1000));
  };

  const [timeLeft, setTimeLeft] = useState(() => {
    const initial = calculateTimeLeft();
    return initial !== null ? initial : 0;
  });

  const onExpireCalledRef = useRef(false);
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  useEffect(() => {
    onExpireCalledRef.current = false;
    if (!targetDate) return;

    const getRemaining = () => {
      const targetMs = new Date(targetDate).getTime();
      if (isNaN(targetMs)) return null;
      return Math.max(0, Math.floor((targetMs - Date.now()) / 1000));
    };

    const initial = getRemaining();
    if (initial === null) return;

    setTimeLeft(initial);

    if (initial <= 0) {
      if (!onExpireCalledRef.current && onExpireRef.current) {
        onExpireCalledRef.current = true;
        onExpireRef.current();
      }
      return;
    }

    const timer = setInterval(() => {
      const remaining = getRemaining();
      if (remaining === null) return;

      setTimeLeft(remaining);

      if (remaining <= 0) {
        clearInterval(timer);
        if (!onExpireCalledRef.current && onExpireRef.current) {
          onExpireCalledRef.current = true;
          onExpireRef.current();
        }
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  const isExpired = timeLeft <= 0;

  return {
    timeLeft,
    minutes,
    seconds,
    formattedTime,
    isExpired,
  };
}
