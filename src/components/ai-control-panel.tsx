import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Lock, RotateCcw, Save, Settings, X } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";

import { AiControlFields } from "@/components/ai-control-fields";
import { Button } from "@/components/ui/button";
import {
  aiPageConfigKey,
  defaultAiPageConfig,
  type AiPageConfig,
} from "@/lib/ai-page-config";
import {
  getAiAdminStatus,
  lockAiAdmin,
  saveAiPageConfig,
  unlockAiAdmin,
  uploadAiLogo,
} from "@/lib/ai-page.functions";

type Props = {
  open: boolean;
  savedConfig: AiPageConfig;
  onClose: () => void;
  onPreviewChange: (draft: AiPageConfig | null, logoPreview: string) => void;
};

async function fileToBase64(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(bin);
}

export function AiControlPanel({ open, savedConfig, onClose, onPreviewChange }: Props) {
  const qc = useQueryClient();
  const checkStatus = useServerFn(getAiAdminStatus);
  const doUnlock = useServerFn(unlockAiAdmin);
  const doLock = useServerFn(lockAiAdmin);
  const doSave = useServerFn(saveAiPageConfig);
  const doUploadLogo = useServerFn(uploadAiLogo);

  const [unlocked, setUnlocked] = useState<boolean | null>(null);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [checkingPin, setCheckingPin] = useState(false);

  const [draft, setDraft] = useState<AiPageConfig>(savedConfig);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState("");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const savedRef = useRef(savedConfig);
  savedRef.current = savedConfig;
  const checkStatusRef = useRef(checkStatus);
  checkStatusRef.current = checkStatus;

  useEffect(() => {
    if (!open) return;
    setDraft(savedRef.current);
    setPendingFile(null);
    setLogoPreview("");
    setStatus("");
    setPin("");
    setPinError("");
    let alive = true;
    void checkStatusRef.current().then((r) => {
      if (alive) setUnlocked(r.unlocked);
    }).catch(() => {
      if (alive) setUnlocked(false);
    });
    return () => { alive = false; };
  }, [open]);

  useEffect(() => {
    return () => {
      if (logoPreview) URL.revokeObjectURL(logoPreview);
    };
  }, [logoPreview]);

  if (!open) return null;

  function handleClose() {
    onPreviewChange(null, "");
    onClose();
  }

  function updateDraft(next: AiPageConfig) {
    setDraft(next);
    setStatus("");
    onPreviewChange(next, logoPreview);
  }

  function handlePickLogoFile(file: File) {
    if (file.size > 2 * 1024 * 1024) {
      setStatus("حجم الشعار كبير جداً — اختر صورة أصغر من 2 ميجابايت.");
      return;
    }
    if (logoPreview) URL.revokeObjectURL(logoPreview);
    const url = URL.createObjectURL(file);
    setPendingFile(file);
    setLogoPreview(url);
    const next = { ...draft, logoUrl: "" };
    setDraft(next);
    setStatus("");
    onPreviewChange(next, url);
  }

  function handleResetLogo() {
    if (logoPreview) URL.revokeObjectURL(logoPreview);
    setPendingFile(null);
    setLogoPreview("");
    const next = { ...draft, logoUrl: "", logoPath: "" };
    setDraft(next);
    setStatus("");
    onPreviewChange(next, "");
  }

  async function submitPin(e: FormEvent) {
    e.preventDefault();
    if (!pin.trim() || checkingPin) return;
    setCheckingPin(true);
    setPinError("");
    try {
      const res = await doUnlock({ data: { pin } });
      if (res.ok) {
        setUnlocked(true);
        setPin("");
      } else {
        setPinError("الرقم السري غير صحيح");
        setPin("");
      }
    } catch {
      setPinError("تعذّر التحقق، حاول مرة أخرى.");
    } finally {
      setCheckingPin(false);
    }
  }

  async function handleSave(target = draft, skipUpload = false) {
    setSaving(true);
    setStatus("");
    try {
      let toSave = target;
      if (!skipUpload && pendingFile) {
        const base64 = await fileToBase64(pendingFile);
        const uploaded = await doUploadLogo({
          data: { contentType: pendingFile.type || "image/png", base64 },
        });
        toSave = { ...target, logoPath: uploaded.logoPath, logoUrl: "" };
      }
      const res = await doSave({ data: { config: toSave } });
      qc.setQueryData(aiPageConfigKey, res.config);
      if (logoPreview) URL.revokeObjectURL(logoPreview);
      setPendingFile(null);
      setLogoPreview("");
      setDraft(res.config);
      onPreviewChange(null, "");
      setStatus("تم حفظ التغييرات ✓");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "تعذّر الحفظ؛ حاول مرة أخرى.";
      setStatus(msg);
      if (msg.includes("الرقم السري")) setUnlocked(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleResetAll() {
    if (logoPreview) URL.revokeObjectURL(logoPreview);
    setPendingFile(null);
    setLogoPreview("");
    setDraft(defaultAiPageConfig);
    onPreviewChange(defaultAiPageConfig, "");
    await handleSave(defaultAiPageConfig, true);
  }

  async function handleLock() {
    try { await doLock(); } catch { /* ignore */ }
    setUnlocked(false);
    handleClose();
  }

  return (
    <div className="ai-ctrl-backdrop" role="dialog" aria-modal="true" aria-label="لوحة تحكم المساعد الذكي">
      <div className="ai-ctrl-drawer" dir="rtl">
        <header className="ai-ctrl-header">
          <div className="ai-ctrl-title">
            <Settings aria-hidden="true" />
            <h2>لوحة تحكم الصفحة</h2>
          </div>
          <div className="ai-ctrl-head-actions">
            {unlocked && (
              <Button type="button" variant="outline" size="sm" onClick={() => void handleLock()} aria-label="قفل اللوحة">
                <Lock />
                <span>قفل</span>
              </Button>
            )}
            <Button type="button" variant="outline" size="icon" onClick={handleClose} aria-label="إغلاق اللوحة">
              <X />
            </Button>
          </div>
        </header>

        {unlocked === null ? (
          <div className="ai-ctrl-pin-wrap">
            <p>جارٍ التحقق…</p>
          </div>
        ) : !unlocked ? (
          <div className="ai-ctrl-pin-wrap">
            <form className="ai-ctrl-pin-form" onSubmit={(e) => void submitPin(e)}>
              <div className="ai-ctrl-pin-icon"><Lock aria-hidden="true" /></div>
              <h3>أدخل الرقم السري</h3>
              <p>لوحة التحكم خاصة بالمالك لتعديل صفحة المساعد الذكي.</p>
              <input
                autoFocus
                type="password"
                inputMode="numeric"
                placeholder="الرقم السري"
                aria-label="الرقم السري"
                value={pin}
                onChange={(e) => { setPin(e.target.value); setPinError(""); }}
              />
              {pinError && <p role="alert" className="ai-ctrl-pin-err">{pinError}</p>}
              <Button type="submit" variant="broadcast" disabled={checkingPin || !pin.trim()}>
                {checkingPin ? "جارٍ الدخول…" : "فتح لوحة التحكم"}
              </Button>
            </form>
          </div>
        ) : (
          <>
            <AiControlFields
              draft={draft}
              logoPreview={logoPreview}
              onChange={updateDraft}
              onPickLogoFile={handlePickLogoFile}
              onResetLogo={handleResetLogo}
            />
            <footer className="ai-ctrl-footer">
              {status && <p role="status" className="ai-ctrl-status">{status}</p>}
              <div className="ai-ctrl-footer-btns">
                <Button type="button" variant="broadcast" className="flex-1" disabled={saving} onClick={() => void handleSave()}>
                  <Save />
                  <span>{saving ? "جارٍ الحفظ…" : "حفظ التغييرات"}</span>
                </Button>
                <Button type="button" variant="outline" disabled={saving} onClick={() => void handleResetAll()}>
                  <RotateCcw />
                  <span>الأصل</span>
                </Button>
              </div>
            </footer>
          </>
        )}
      </div>
    </div>
  );
}