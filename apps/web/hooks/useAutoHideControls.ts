"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const DEFAULT_AUTO_HIDE_DELAY_MS = 3_000;

interface UseAutoHideControlsResult {
  /** 재생 중(enabled)일 때만 자동 숨김이 동작하고, 그 외에는 항상 보인다. */
  isVisible: boolean;
  /** 컨트롤을 보여주고 자동 숨김 타이머를 처음부터 다시 건다. */
  showControls: () => void;
}

/**
 * 몰입형 재생 화면에서 상단/하단 컨트롤을 평소에는 숨기고,
 * 화면을 톡 치거나(pointerdown) 마우스를 움직이거나 키를 누르면
 * 잠시 보여준 뒤 `delayMs`가 지나면 다시 숨긴다.
 */
export function useAutoHideControls(
  enabled: boolean,
  delayMs: number = DEFAULT_AUTO_HIDE_DELAY_MS,
): UseAutoHideControlsResult {
  const [isVisible, setIsVisible] = useState(false);
  const [prevEnabled, setPrevEnabled] = useState(enabled);
  const timerRef = useRef<number | null>(null);

  // 재생이 시작/종료될 때마다 숨김 상태에서 출발한다.
  // (effect가 아닌 렌더 중 조정 패턴으로 lint 규칙을 피한다.)
  if (prevEnabled !== enabled) {
    setPrevEnabled(enabled);
    setIsVisible(false);
  }

  const clearTimer = useCallback((): void => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const showControls = useCallback((): void => {
    if (!enabled) return;
    clearTimer();
    setIsVisible(true);
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      setIsVisible(false);
    }, delayMs);
  }, [clearTimer, delayMs, enabled]);

  // 자동 숨김이 꺼지면(예: 재생 중지) 남은 타이머를 정리한다.
  // 컨트롤 자체는 enabled가 false인 동안 항상 보이도록 아래에서 보정한다.
  useEffect(() => {
    if (enabled) return;
    clearTimer();
  }, [clearTimer, enabled]);

  // 키보드 사용자는 숨겨진 버튼에 Tab으로 닿을 수 없으므로,
  // 어떤 키를 눌러도 컨트롤이 나타나게 한다.
  useEffect(() => {
    if (!enabled) return;
    window.addEventListener("keydown", showControls);
    return () => window.removeEventListener("keydown", showControls);
  }, [enabled, showControls]);

  useEffect(() => clearTimer, [clearTimer]);

  return {
    isVisible: enabled ? isVisible : true,
    showControls,
  };
}
