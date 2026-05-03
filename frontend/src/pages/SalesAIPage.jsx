import { useState } from "react";

import {
  API_BASE_URL,
  buildGuestRequest,
  consumeSseStream,
  fallbackChatMessages,
  fallbackGuestAdvisor,
  fallbackLeadScore,
  fallbackPlaybook,
  fetchConversionPlaybook,
  fetchGuestAdvisor,
  fetchLeadScoring,
  formatEnumLabel,
  normalizeStreamProviderError,
  normalizeUiErrorMessage,
} from "../lib/dashboardApi";
import ReadableInsightBody from "../components/ReadableInsightBody";
import {
  OrganicLayout,
  OrganicSection,
  OrganicStatCard,
  SalesIllustration,
  ToneBadge,
} from "../components/organic/OrganicUI";

function StageCard({ step, title, detail }) {
  return (
    <article className="hover-glow grid gap-3 rounded-[32px_18px_36px_22px] border border-[rgba(107,66,38,0.14)] bg-[rgba(255,255,255,0.56)] p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--earth-primary)]">Step {step}</p>
      <h3 className="text-[clamp(1.35rem,2vw,1.9rem)] text-[var(--earth-secondary)]">{title}</h3>
      {detail ? <p className="text-sm leading-7 text-[var(--earth-text-muted)]">{detail}</p> : null}
    </article>
  );
}

export default function SalesAIPage() {
  const [form, setForm] = useState({
    areaName: "Nha Trang",
    source: "",
    customerName: "",
    customerMessage:
      "Looking for a clean room near the beach, reliable service, and fair pricing for 2 guests for 2 nights.",
    partySize: "",
    nights: "",
    budget: "",
    travelIntent: "leisure",
  });
  const [advisor, setAdvisor] = useState(fallbackGuestAdvisor);
  const [leadScore, setLeadScore] = useState(fallbackLeadScore);
  const [playbook, setPlaybook] = useState(fallbackPlaybook);
  const [messages, setMessages] = useState(fallbackChatMessages);
  const [chatInput, setChatInput] = useState("");
  const [chatMeta, setChatMeta] = useState({
    suggested_next_step: "",
    playbook_stage: "considering_options",
    upsell_focus: "Breakfast add-on",
    lead_temperature: "WARM",
    model_used: "heuristic_fallback",
  });
  const [loadingAdvice, setLoadingAdvice] = useState(false);
  const [loadingChat, setLoadingChat] = useState(false);

  const workflowSteps = [
    { step: "01", title: "Brief", detail: null },
    { step: "02", title: "Recommendation", detail: null },
    { step: "03", title: "Chat", detail: null },
  ];

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleGenerate() {
    setLoadingAdvice(true);
    const payload = buildGuestRequest(form);

    try {
      const [advisorData, leadData, playbookData] = await Promise.all([
        fetchGuestAdvisor(payload),
        fetchLeadScoring(payload),
        fetchConversionPlaybook(payload),
      ]);

      setAdvisor(advisorData);
      setLeadScore(leadData);
      setPlaybook(playbookData);
      setMessages([{ role: "assistant", content: playbookData.opening_script }]);
      setChatMeta((current) => ({
        ...current,
        suggested_next_step: playbookData.follow_up_cadence,
        playbook_stage: playbookData.journey_stage,
        lead_temperature: leadData.lead_temperature,
        upsell_focus: leadData.recommended_upsells?.[0] || "Breakfast add-on",
        model_used: advisorData.model_used,
      }));
    } catch {
      setAdvisor(fallbackGuestAdvisor);
      setLeadScore(fallbackLeadScore);
      setPlaybook(fallbackPlaybook);
    } finally {
      setLoadingAdvice(false);
    }
  }

  async function handleSendChat() {
    const message = chatInput.trim();
    if (!message) return;

    const nextHistory = [...messages, { role: "user", content: message }];
    setMessages(nextHistory);
    setChatInput("");
    setLoadingChat(true);

    try {
      const response = await fetch(`${API_BASE_URL}/ai/guest-chat/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...buildGuestRequest(form),
          customer_message: message,
          history: nextHistory,
        }),
      });
      if (!response.ok) throw new Error("stream failed");

      let assistantInserted = false;
      await consumeSseStream(response, (event) => {
        if (event.type === "meta") {
          setChatMeta((current) => ({ ...current, ...event }));
        } else if (event.type === "model") {
          setChatMeta((current) => ({ ...current, model_used: event.model_used }));
        } else if (event.type === "error") {
          const errorMessage = normalizeStreamProviderError(
            event,
            "AI chat unavailable. Check backend logs for details."
          );
          setChatMeta((current) => ({ ...current, model_used: "provider_error" }));
          setMessages((current) => {
            const updated = current.filter(
              (item, index, array) => !(index === array.length - 1 && item.role === "assistant" && !item.content)
            );
            return [...updated, { role: "assistant", content: errorMessage }];
          });
        } else if (event.type === "chunk") {
          setMessages((current) => {
            const updated = [...current];
            if (!assistantInserted || updated[updated.length - 1]?.role !== "assistant") {
              assistantInserted = true;
              updated.push({ role: "assistant", content: event.content });
              return updated;
            }
            const last = updated.length - 1;
            updated[last] = { ...updated[last], content: `${updated[last].content}${event.content}` };
            return updated;
          });
        }
      });
    } catch (error) {
      const errorMessage = normalizeUiErrorMessage(
        error,
        "Could not stream AI response. Check backend logs for details."
      );
      setMessages((current) => [
        ...current.filter((item, index, array) => !(index === array.length - 1 && item.role === "assistant" && !item.content)),
        { role: "assistant", content: errorMessage },
      ]);
    } finally {
      setLoadingChat(false);
    }
  }

  return (
    <OrganicLayout
      pageKey="sales-ai"
      sideArtwork={SalesIllustration}
      hero={{
        eyebrow: null,
        title: "Sales AI",
        description: null,
        stats: [
          { label: "Lead Score", value: String(leadScore.lead_score).padStart(2, "0") },
          { label: "Buyer Type", value: formatEnumLabel(leadScore.buyer_type) },
          { label: "Model", value: advisor.model_used },
        ],
        illustration: SalesIllustration,
      }}
    >
      <OrganicSection eyebrow={null} title="Workflow" description={null}>
        <div className="grid gap-6 lg:grid-cols-3">
          {workflowSteps.map((item) => (
            <StageCard key={item.step} step={item.step} title={item.title} detail={item.detail} />
          ))}
        </div>
      </OrganicSection>

      <OrganicSection eyebrow={null} title="Brief" description={null}>
        <div className="grid gap-6 xl:grid-cols-[0.96fr_1.04fr]">
          <article className="grid gap-4 rounded-[36px_18px_34px_24px] border border-[rgba(107,66,38,0.14)] bg-[rgba(255,255,255,0.56)] p-6">
            <div className="flex flex-wrap items-center gap-2">
              <ToneBadge tone="neutral">Inputs</ToneBadge>
              <ToneBadge tone="praise">Brief</ToneBadge>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <input value={form.customerName} onChange={(e) => updateField("customerName", e.target.value)} placeholder="Guest name" className="px-4 py-3" />
              <select value={form.travelIntent} onChange={(e) => updateField("travelIntent", e.target.value)} className="px-4 py-3">
                <option value="leisure">Leisure</option>
                <option value="family">Family</option>
                <option value="business">Business</option>
                <option value="romantic">Romantic</option>
                <option value="premium">Premium</option>
              </select>
              <input type="number" min="1" value={form.partySize} onChange={(e) => updateField("partySize", e.target.value)} placeholder="Guests" className="px-4 py-3" />
              <input type="number" min="1" value={form.nights} onChange={(e) => updateField("nights", e.target.value)} placeholder="Nights" className="px-4 py-3" />
            </div>
            <input type="number" min="0" value={form.budget} onChange={(e) => updateField("budget", e.target.value)} placeholder="Budget (total)" className="px-4 py-3" />
            <textarea
              rows={7}
              value={form.customerMessage}
              onChange={(e) => updateField("customerMessage", e.target.value)}
              className="px-4 py-4 leading-7"
              placeholder="Stay needs…"
            />
            <button type="button" onClick={handleGenerate} disabled={loadingAdvice} className="px-5 py-3 text-sm font-semibold">
              {loadingAdvice ? "Building advice..." : "Generate advice"}
            </button>
          </article>

          <article className="grid gap-5 rounded-[22px_40px_20px_42px] border border-[rgba(107,66,38,0.14)] bg-[rgba(255,255,255,0.56)] p-6">
            <div className="flex flex-wrap gap-2">
              <ToneBadge tone="praise">{advisor.recommended_room_type}</ToneBadge>
              <ToneBadge tone="neutral">{advisor.recommended_price_anchor}</ToneBadge>
            </div>
            <h2 className="text-[clamp(1.8rem,3vw,2.8rem)] text-[var(--earth-secondary)]">Recommended offer</h2>
            <ReadableInsightBody text={advisor.summary} className="mt-3" />
            <div className="grid gap-3 md:grid-cols-2">
              {advisor.upsell_items.map((item) => (
                <div key={item} className="rounded-[24px] border border-[rgba(143,175,143,0.24)] bg-[rgba(143,175,143,0.08)] px-4 py-3 text-sm text-[var(--earth-secondary)]">
                  {item}
                </div>
              ))}
            </div>
            <div className="grid gap-3">
              <div className="rounded-[26px] border border-[rgba(107,66,38,0.14)] bg-[rgba(255,255,255,0.5)] p-4 text-sm leading-7 text-[var(--earth-text-muted)]">
                {advisor.sales_script}
              </div>
              <div className="rounded-[22px] border border-[rgba(143,175,143,0.2)] bg-[rgba(143,175,143,0.08)] p-4 text-sm leading-7 text-[var(--earth-secondary)]">
                {advisor.objection_handling?.[0]}
              </div>
              <div className="rounded-[22px] border border-[rgba(196,113,74,0.18)] bg-[rgba(196,113,74,0.06)] p-4 text-sm leading-7 text-[var(--earth-secondary)]">
                {advisor.suggested_discount}
              </div>
            </div>
          </article>
        </div>
      </OrganicSection>

      <section className="grid gap-6 xl:grid-cols-2">
        <OrganicSection eyebrow={null} title="Lead" description={null}>
          <div className="grid gap-6">
            <div className="grid gap-4 md:grid-cols-3">
              <OrganicStatCard label="Score" value={leadScore.lead_score} />
              <OrganicStatCard label="Close probability" value={leadScore.close_probability} />
              <OrganicStatCard label="Upsell" value={leadScore.upsell_priority} />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-[30px_18px_32px_20px] border border-[rgba(107,66,38,0.14)] bg-[rgba(255,255,255,0.54)] p-5">
                <h3 className="text-[clamp(1.4rem,2vw,2rem)] text-[var(--earth-secondary)]">Buying signals</h3>
                <div className="mt-4 flex flex-wrap gap-2">
                  {leadScore.buying_signals.map((item) => (
                    <ToneBadge key={item} tone="praise">
                      {item}
                    </ToneBadge>
                  ))}
                </div>
              </div>
              <div className="rounded-[20px_34px_22px_36px] border border-[rgba(107,66,38,0.14)] bg-[rgba(255,255,255,0.54)] p-5">
                <h3 className="text-[clamp(1.4rem,2vw,2rem)] text-[var(--earth-secondary)]">Friction points</h3>
                <div className="mt-4 flex flex-wrap gap-2">
                  {leadScore.blockers.map((item) => (
                    <ToneBadge key={item} tone="complaint">
                      {item}
                    </ToneBadge>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </OrganicSection>

        <OrganicSection eyebrow={null} title="Playbook" description={null}>
          <div className="grid gap-4">
            <p className="rounded-[26px] border border-[rgba(196,113,74,0.22)] bg-[rgba(196,113,74,0.08)] p-5 text-sm leading-7 text-[var(--earth-secondary)]">
              {playbook.opening_script}
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              {[
                ["Value", playbook.value_points],
                ["Upsell", playbook.upsell_strategy],
                ["Close", playbook.close_strategy],
                ["Script", playbook.script_variants],
              ].map(([title, items]) => (
                <div key={title} className="rounded-[28px] border border-[rgba(107,66,38,0.14)] bg-[rgba(255,255,255,0.52)] p-5">
                  <h3 className="text-[clamp(1.3rem,2vw,1.8rem)] text-[var(--earth-secondary)]">{title}</h3>
                  <ul className="mt-4 list-inside list-disc space-y-2 text-sm leading-7 text-[var(--earth-text)]">
                    {items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </OrganicSection>
      </section>

      <OrganicSection eyebrow={null} title="Chat" description={null}>
        <div className="organic-chat-stack grid gap-6 xl:grid-cols-[1.12fr_0.88fr]">
          <article className="grid gap-4 rounded-[36px_18px_38px_20px] border border-[rgba(107,66,38,0.14)] bg-[rgba(255,255,255,0.54)] p-6">
            <div className="max-h-[520px] space-y-3 overflow-y-auto pr-2">
              {messages.map((message, index) => (
                <div
                  key={`${message.role}-${index}`}
                  className={
                    message.role === "assistant"
                      ? "mr-8 rounded-[28px] border border-[rgba(143,175,143,0.22)] bg-[rgba(143,175,143,0.1)] px-4 py-4 text-sm leading-7 text-[var(--earth-secondary)]"
                      : "ml-8 rounded-[28px] border border-[rgba(196,113,74,0.18)] bg-[rgba(196,113,74,0.08)] px-4 py-4 text-sm leading-7 text-[var(--earth-secondary)]"
                  }
                >
                  {message.content}
                </div>
              ))}
              {loadingChat ? (
                <div className="mr-8 rounded-[28px] border border-[rgba(107,66,38,0.14)] bg-[rgba(255,255,255,0.44)] px-4 py-4 text-sm text-[var(--earth-secondary)]">
                  <span className="typing-dots">
                    Drafting reply<span>.</span><span>.</span><span>.</span>
                  </span>
                </div>
              ) : null}
            </div>
            <div className="organic-chat-composer flex gap-3">
              <textarea
                rows={3}
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Message…"
                className="min-h-[92px] flex-1 px-4 py-3 leading-7"
              />
              <button type="button" onClick={handleSendChat} disabled={loadingChat || !chatInput.trim()} className="self-end px-5 py-3 text-sm font-semibold">
                Send
              </button>
            </div>
          </article>

          <div className="grid gap-4">
            <OrganicStatCard label="Stage" value={formatEnumLabel(chatMeta.playbook_stage)} />
            <OrganicStatCard label="Upsell" value={chatMeta.upsell_focus} />
            <OrganicStatCard label="Model" value={chatMeta.model_used} />
          </div>
        </div>
      </OrganicSection>
    </OrganicLayout>
  );
}
