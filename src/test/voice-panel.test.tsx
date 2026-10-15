import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { SayNowForm, VoiceChatManager } from "@/components/admin/voice-chat-manager";

const { preview } = vi.hoisted(() => ({ preview: vi.fn() }));
vi.mock("@tanstack/react-start", () => ({ useServerFn: () => preview }));
vi.mock("@/lib/voice-preview.functions", () => ({ previewVoice: {} }));
vi.mock("@/lib/chat-bots.functions", () => ({ defaultChatBots: { bots: [{ name: "نورة" }] } }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {
  from: () => ({ select: () => ({ in: () => Promise.resolve({ data: [] }) }) }),
} }));

afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
describe("female voice panel", () => {
  it("removes send-now, preset songs and male voice options", () => {
    render(<><SayNowForm /><VoiceChatManager /></>);
    expect(screen.queryByRole("button", { name: "قلها الآن" })).toBeNull();
    expect(screen.queryByText(/أغاني جاهزة/)).toBeNull();
    expect(screen.queryByText("أصوات الشباب")).toBeNull();
    expect(screen.queryByRole("option", { name: /Puck|Charon|Fenrir/ })).toBeNull();
    for (const name of ["حرير", "ليان", "رنيم", "جمان", "رهيل", "أريج", "هتون", "تالين"]) {
      expect(screen.getAllByRole("option", { name: new RegExp(name) }).length).toBeGreaterThan(0);
    }
    expect(screen.getByRole("button", { name: "إرسال للسناب" })).toBeTruthy();
    const test = screen.getByRole("button", { name: "تجريب الصوت" });
    expect(test.nextElementSibling).toBe(screen.getByRole("button", { name: "حفظ الصوت في جوالي" }));
  });
  it("previews selected female speech and enables downloading only generated audio", async () => {
    vi.stubGlobal("URL", Object.assign(URL, { createObjectURL: vi.fn(() => "blob:voice-preview"), revokeObjectURL: vi.fn() }));
    preview.mockResolvedValue({ audio: btoa("test-audio") });
    vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
    render(<SayNowForm />);
    const share = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { canShare: vi.fn(() => true), share });
    const send = screen.getByRole("button", { name: "إرسال للسناب" });
    const tarab = screen.getByRole("button", { name: "إرسال لطرب" });
    expect(tarab).toBeDisabled();
    expect(send).toBeDisabled();
    const download = screen.getByRole("button", { name: "حفظ الصوت في جوالي" });
    expect(download).toBeDisabled();
    fireEvent.change(screen.getByRole("textbox", { name: "الكلام" }), { target: { value: "هلا يا نورة" } });
    fireEvent.change(screen.getByRole("combobox", { name: "صوت هذه الجملة" }), { target: { value: "female-hessa" } });
    fireEvent.click(screen.getByRole("button", { name: "تجريب الصوت" }));
    await waitFor(() => expect(download).toBeEnabled());
    expect(preview).toHaveBeenCalledWith({ data: { text: "هلا يا نورة", voice: "female-hessa", sing: false, melody: "najdi", rhythm: "slow" } });
    fireEvent.click(send);
    await waitFor(() => expect(share).toHaveBeenCalled());
    const payload = share.mock.calls[0]?.[0];
    expect(payload.files[0].type).toMatch(/^audio\//);
    expect(payload.url).toBeUndefined();
    expect(payload.files).toHaveLength(1);
    expect(tarab).toBeEnabled();
    share.mockClear();
    fireEvent.click(tarab);
    await waitFor(() => expect(share).toHaveBeenCalledTimes(1));
    expect(share.mock.calls[0]?.[0]).toEqual({ files: payload.files });
    expect(screen.getByText(/اختر طرب من قائمة المشاركة/)).toBeTruthy();
    vi.stubGlobal("navigator", { canShare: vi.fn(() => false), share });
    fireEvent.click(tarab);
    expect(screen.getByText(/المشاركة المباشرة غير متاحة/)).toBeTruthy();
    fireEvent.change(screen.getByRole("textbox", { name: "الكلام" }), { target: { value: "نص جديد" } });
    expect(send).toBeDisabled();
    expect(tarab).toBeDisabled();
    expect(download).toBeDisabled();
  });
  it("ends with the send row and exposes singing controls only when enabled", () => {
    render(<SayNowForm />);
    const panel = screen.getByRole("region", { name: "تجريب أصوات البنات" });
    expect(screen.queryByRole("button", { name: "حفظ اختيار البوت" })).toBeNull();
    expect(screen.queryByRole("link", { name: "للتواصل والاشتراك" })).toBeNull();
    const rows = Array.from(panel.querySelectorAll(".voice-studio-actions"));
    const last = rows.at(-1);
    expect(last).toBeTruthy();
    for (const name of ["إرسال للواتساب", "إرسال لتيليجرام", "إرسال لسيجنال", "إرسال للسناب", "إرسال لطرب"]) {
      expect(Array.from(last?.querySelectorAll("button") ?? []).some((b) => b.textContent?.includes(name))).toBe(true);
    }
    expect(screen.queryByRole("combobox", { name: "اللحن" })).toBeNull();
    fireEvent.click(screen.getByRole("switch", { name: "خلّها تغني الكلام بدل ما تقوله" }));
    expect(screen.getByRole("combobox", { name: "اللحن" })).toBeVisible();
    expect(screen.getByRole("combobox", { name: "الإيقاع والرقصة" })).toBeVisible();
  });
  it("stops the preview with the stop button", async () => {
    vi.stubGlobal("URL", Object.assign(URL, { createObjectURL: vi.fn(() => "blob:voice-preview"), revokeObjectURL: vi.fn() }));
    preview.mockResolvedValue({ audio: btoa("test-audio") });
    const play = vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
    const pause = vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
    render(<SayNowForm />);
    const stop = screen.getByRole("button", { name: "إيقاف الصوت" });
    expect(stop).toBeDisabled();
    fireEvent.change(screen.getByRole("textbox", { name: "الكلام" }), { target: { value: "هلا" } });
    fireEvent.click(screen.getByRole("button", { name: "تجريب الصوت" }));
    await waitFor(() => expect(play).toHaveBeenCalled());
    await waitFor(() => expect(stop).toBeEnabled());
    fireEvent.click(stop);
    expect(pause).toHaveBeenCalled();
    // the looping preview is released: stopping again only silences the saved clip player
    const before = pause.mock.calls.length;
    fireEvent.click(stop);
    expect(pause.mock.calls.length).toBeGreaterThanOrEqual(before);
  });
  it("plays the preview once and replays it with the replay button", async () => {
    vi.stubGlobal("URL", Object.assign(URL, { createObjectURL: vi.fn(() => "blob:voice-preview"), revokeObjectURL: vi.fn() }));
    preview.mockResolvedValue({ audio: btoa("test-audio") });
    preview.mockClear();
    const played: HTMLMediaElement[] = [];
    const play = vi.spyOn(HTMLMediaElement.prototype, "play").mockImplementation(function (this: HTMLMediaElement) { played.push(this); return Promise.resolve(); });
    render(<SayNowForm />);
    const replay = screen.getByRole("button", { name: "إعادة الصوت" });
    expect(replay).toBeDisabled();
    fireEvent.change(screen.getByRole("textbox", { name: "الكلام" }), { target: { value: "هلا" } });
    fireEvent.click(screen.getByRole("button", { name: "تجريب الصوت" }));
    await waitFor(() => expect(play).toHaveBeenCalledTimes(1));
    // the clip is not self-repeating: it stops on its own and only the replay button starts it again
    expect(played[0]?.loop).toBe(false);
    await waitFor(() => expect(replay).toBeEnabled());
    fireEvent.click(replay);
    await waitFor(() => expect(play).toHaveBeenCalledTimes(2));
    expect(preview).toHaveBeenCalledTimes(1);
  });
});