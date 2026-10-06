"use client";
import { useEffect, useState } from "react";
export function ParentEntry({ notice = false }: { notice?: boolean }) {
  const [local, setLocal] = useState(false);
  useEffect(() => { void fetch("/api/parent").then(r => r.json()).then(data => {
    setLocal(Boolean(data.enabled));
    sessionStorage.setItem("leen-parent-enabled", data.enabled ? "true" : "false");
  }).catch(() => {}); }, []);
  if (!local) return null;
  return notice ? <p className="parent-notice">يحفظ هذا المتصفح نص الحديث لولي الأمر، ويمكن حذفه من صفحته. لا تُحفظ التسجيلات.</p>
    : <a className="parent-entry" href="/parent">ولي أمر؟ اضغط هنا</a>;
}
