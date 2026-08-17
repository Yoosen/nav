import { useEffect, useState } from 'react';

/**
 * 浅色模式下的动态朦胧背景：4 个彩色小球各自沿不同路径缓慢缓动漂浮。
 * 仅在浅色模式（html 无 .dark 类）渲染；暗色模式保持原实色风格。
 */
export function AmbientBackground() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark');
    setEnabled(!isDark);
    const observer = new MutationObserver(() => {
      setEnabled(!document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  if (!enabled) return null;

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
      <span className="ambient-blob ambient-blob-1" />
      <span className="ambient-blob ambient-blob-2" />
      <span className="ambient-blob ambient-blob-3" />
      <span className="ambient-blob ambient-blob-4" />
    </div>
  );
}
