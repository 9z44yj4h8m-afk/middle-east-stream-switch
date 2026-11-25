import { Plus, RotateCcw, Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  AI_FONTS,
  AI_THEME_PRESETS,
  DEFAULT_AI_LOGO,
  resolvedAiLogoSrc,
  type AiPageConfig,
} from "@/lib/ai-page-config";

type Props = {
  draft: AiPageConfig;
  logoPreview: string;
  onChange: (next: AiPageConfig) => void;
  onPickLogoFile: (file: File) => void;
  onResetLogo: () => void;
};

export function AiControlFields({
  draft,
  logoPreview,
  onChange,
  onPickLogoFile,
  onResetLogo,
}: Props) {
  const [newTitle, setNewTitle] = useState("");
  const [newPrompt, setNewPrompt] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const set = <K extends keyof AiPageConfig>(key: K, value: AiPageConfig[K]) =>
    onChange({ ...draft, [key]: value });

  const setColor = (
    key: "accentColor" | "bgColor" | "surfaceColor" | "textColor" | "mutedTextColor" | "headingColor",
    value: string,
  ) => onChange({ ...draft, themePreset: "custom", [key]: value });

  function addSection() {
    const title = newTitle.trim();
    if (!title) return;
    const prompt = newPrompt.trim() || title;
    const id = `sec-${Date.now().toString(36)}`;
    onChange({ ...draft, sections: [...draft.sections, { id, title, prompt }] });
    setNewTitle("");
    setNewPrompt("");
  }

  function updateSection(id: string, patch: { title?: string; prompt?: string }) {
    onChange({
      ...draft,
      sections: draft.sections.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    });
  }

  function removeSection(id: string) {
    onChange({ ...draft, sections: draft.sections.filter((s) => s.id !== id) });
  }

  const currentLogo = logoPreview || resolvedAiLogoSrc(draft);

  return (
    <div className="ai-ctrl-body">
      <section className="ai-ctrl-card">
        <h3>تغيير الشعار</h3>
        <div className="ai-ctrl-logo-row">
          <img src={currentLogo} alt="معاينة الشعار" className="ai-ctrl-logo-preview" />
          <div className="ai-ctrl-logo-actions">
            <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
              <Upload />
              <span>رفع شعار من جهازي</span>
            </Button>
            {(logoPreview || draft.logoPath || (draft.logoUrl && draft.logoUrl !== DEFAULT_AI_LOGO)) && (
              <Button type="button" variant="ghost" size="sm" onClick={onResetLogo}>
                <RotateCcw />
                <span>الشعار الأصلي</span>
              </Button>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="hidden"
              aria-label="اختيار صورة الشعار"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onPickLogoFile(f);
                e.target.value = "";
              }}
            />
          </div>
        </div>
        <label className="ai-ctrl-field">
          <span>أو رابط صورة الشعار (اختياري)</span>
          <input
            type="url"
            dir="ltr"
            placeholder="https://..."
            value={draft.logoUrl}
            onChange={(e) => onChange({ ...draft, logoUrl: e.target.value, logoPath: "" })}
          />
        </label>
      </section>

      <section className="ai-ctrl-card">
        <h3>تغيير الكتابات</h3>
        <div className="ai-ctrl-grid">
          <label className="ai-ctrl-field">
            <span>الاسم أعلى الصفحة</span>
            <input maxLength={50} value={draft.brandTitle} onChange={(e) => set("brandTitle", e.target.value)} />
          </label>
          <label className="ai-ctrl-field">
            <span>الوصف تحت الاسم</span>
            <input maxLength={60} value={draft.brandSubtitle} onChange={(e) => set("brandSubtitle", e.target.value)} />
          </label>
          <label className="ai-ctrl-field">
            <span>عنوان الترحيب</span>
            <input maxLength={60} value={draft.welcomeTitle} onChange={(e) => set("welcomeTitle", e.target.value)} />
          </label>
          <label className="ai-ctrl-field">
            <span>كلام خانة السؤال</span>
            <input maxLength={90} value={draft.inputPlaceholder} onChange={(e) => set("inputPlaceholder", e.target.value)} />
          </label>
          <label className="ai-ctrl-field">
            <span>اسم زر الرئيسية</span>
            <input maxLength={24} value={draft.homeLabel} onChange={(e) => set("homeLabel", e.target.value)} />
          </label>
          <label className="ai-ctrl-field">
            <span>اسم زر محادثة جديدة</span>
            <input maxLength={24} value={draft.newChatLabel} onChange={(e) => set("newChatLabel", e.target.value)} />
          </label>
        </div>
        <label className="ai-ctrl-field">
          <span>عبارة الترحيب</span>
          <textarea rows={2} maxLength={240} value={draft.welcomeSubtitle} onChange={(e) => set("welcomeSubtitle", e.target.value)} />
        </label>
      </section>

      <section className="ai-ctrl-card">
        <h3>الأقسام (زيادة قسم / حذف قسم)</h3>
        <div className="ai-ctrl-add-box">
          <input
            maxLength={120}
            placeholder="عنوان القسم الجديد…"
            aria-label="عنوان القسم الجديد"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
          />
          <input
            maxLength={300}
            placeholder="السؤال عند الضغط (اختياري — يأخذ العنوان تلقائياً)"
            aria-label="السؤال عند الضغط"
            value={newPrompt}
            onChange={(e) => setNewPrompt(e.target.value)}
          />
          <Button type="button" variant="broadcast" size="sm" disabled={!newTitle.trim()} onClick={addSection}>
            <Plus />
            <span>زيادة قسم</span>
          </Button>
        </div>

        {draft.sections.length === 0 ? (
          <p className="ai-ctrl-empty">لا توجد أقسام حالياً — أضف قسماً جديداً من الأعلى.</p>
        ) : (
          <div className="ai-ctrl-sections">
            {draft.sections.map((sec, i) => (
              <div key={sec.id} className="ai-ctrl-sec-row">
                <div className="ai-ctrl-sec-inputs">
                  <input
                    maxLength={120}
                    aria-label={`عنوان القسم ${i + 1}`}
                    value={sec.title}
                    onChange={(e) => updateSection(sec.id, { title: e.target.value })}
                  />
                  <input
                    maxLength={300}
                    aria-label={`سؤال القسم ${i + 1}`}
                    placeholder="السؤال المرسل للمساعد"
                    value={sec.prompt}
                    onChange={(e) => updateSection(sec.id, { prompt: e.target.value })}
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label={`حذف قسم ${sec.title}`}
                  onClick={() => removeSection(sec.id)}
                >
                  <Trash2 />
                </Button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="ai-ctrl-card">
        <h3>تغيير النسق</h3>
        <div className="ai-ctrl-presets">
          {AI_THEME_PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              className={draft.themePreset === p.id ? "ai-ctrl-preset is-active" : "ai-ctrl-preset"}
              onClick={() =>
                onChange({
                  ...draft,
                  themePreset: p.id,
                  accentColor: p.accentColor,
                  bgColor: p.bgColor,
                  surfaceColor: p.surfaceColor,
                  textColor: p.textColor,
                  mutedTextColor: p.mutedTextColor,
                  headingColor: p.headingColor,
                })
              }
            >
              <span className="ai-ctrl-swatches" aria-hidden="true">
                <i style={{ background: p.bgColor }} />
                <i style={{ background: p.accentColor }} />
                <i style={{ background: p.textColor }} />
              </span>
              <span>{p.label}</span>
            </button>
          ))}
        </div>
        <div className="ai-ctrl-layout-row">
          <span>ترتيب الأقسام:</span>
          <div className="ai-ctrl-layout-btns">
            <Button
              type="button"
              size="sm"
              variant={draft.layoutStyle === "cards" ? "broadcast" : "outline"}
              onClick={() => set("layoutStyle", "cards")}
            >
              بطاقات (عمودين)
            </Button>
            <Button
              type="button"
              size="sm"
              variant={draft.layoutStyle === "list" ? "broadcast" : "outline"}
              onClick={() => set("layoutStyle", "list")}
            >
              قائمة (عمود واحد)
            </Button>
          </div>
        </div>
      </section>

      <section className="ai-ctrl-card">
        <h3>تغيير لون التصميم</h3>
        <div className="ai-ctrl-colors">
          <label className="ai-ctrl-color">
            <input type="color" value={draft.accentColor} onChange={(e) => setColor("accentColor", e.target.value)} />
            <span>اللون الأساسي والأزرار</span>
          </label>
          <label className="ai-ctrl-color">
            <input type="color" value={draft.bgColor} onChange={(e) => setColor("bgColor", e.target.value)} />
            <span>لون الخلفية</span>
          </label>
          <label className="ai-ctrl-color">
            <input type="color" value={draft.surfaceColor} onChange={(e) => setColor("surfaceColor", e.target.value)} />
            <span>لون المربعات والبطاقات</span>
          </label>
        </div>
      </section>

      <section className="ai-ctrl-card">
        <h3>تغيير لون الخط</h3>
        <div className="ai-ctrl-colors">
          <label className="ai-ctrl-color">
            <input type="color" value={draft.textColor} onChange={(e) => setColor("textColor", e.target.value)} />
            <span>لون الخط الرئيسي</span>
          </label>
          <label className="ai-ctrl-color">
            <input type="color" value={draft.headingColor} onChange={(e) => setColor("headingColor", e.target.value)} />
            <span>لون العناوين</span>
          </label>
          <label className="ai-ctrl-color">
            <input type="color" value={draft.mutedTextColor} onChange={(e) => setColor("mutedTextColor", e.target.value)} />
            <span>لون الكلام الثانوي</span>
          </label>
        </div>
      </section>

      <section className="ai-ctrl-card">
        <h3>تغيير نوع الخط</h3>
        <label className="ai-ctrl-field">
          <span>اختر نوع الخط</span>
          <select value={draft.fontFamily} onChange={(e) => set("fontFamily", e.target.value)}>
            {AI_FONTS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </label>
        <p className="ai-ctrl-font-sample" style={{ fontFamily: `"${draft.fontFamily}", sans-serif` }}>
          معاينة الخط: أهلاً بك في المغني الذكي — ALMOGHANI AI
        </p>
      </section>
    </div>
  );
}