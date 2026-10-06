"use client";
import { useEffect, useState } from "react";
import { isLocalPreview } from "@/lib/parent-preview";
export function ParentEntry({ notice = false }: { notice?: boolean }) {
  const [local, setLocal] = useState(false);
  useEffect(() => setLocal(isLocalPreview()), []);
  if (!local) return null;
  return notice ? <p className="parent-notice">يحفظ هذا المتصفح نص الحديث لولي الأمر، ويمكن حذفه من صفحته. لا تُحفظ التسجيلات.</p>
    : <a className="parent-entry" href="/parent">ولي أمر؟ اضغط هنا</a>;
}
