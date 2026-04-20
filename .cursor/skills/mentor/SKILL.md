---
name: mentor
description: >-
  Domain context for the Rabino Mentor IA at route /mentor (Código Judaico da
  Prosperidade). Covers the four journey phases, spending-trigger focus, Jewish
  prosperity framing, and how the SPA sends prompts to the backend OpenAI
  integration. Use when editing mentor chat, system prompts, or
  /api/rabino-mentor.
---

# Rabino Mentor IA (`/mentor`)

## Product intent

- Users ask questions about the **Código Judaico da Prosperidade** process and receive answers grounded in **Jewish wisdom**, **behavioral finance**, and **practical micro-actions**.
- The SPA calls `POST /api/rabino-mentor` with `message`, `systemPrompt`, and `recentHistory` (no API keys in the browser).
- The .NET API calls OpenAI when `OpenAI__ApiKey` is set; otherwise it uses `MentorFallbackService`.

## Journey phases (day index `currentDay`, aligned with `ESCADA_PHASES`)

| Days        | Phase focus |
|------------|-------------|
| 0–20       | **21 days** — identify **mental/emotional spending triggers** (fatigue, comparison, reward, stress, validation). Pause before buying; name the impulse. |
| 21–50      | **30 days** — **self-control**: daily habits, limits, impulse logging, small measurable commitments. |
| 51–200     | **~6 months** — **home and life organization**: spending categories, routines, medium-term planning. |
| 201–365    | **1 year** — **wealth building**: emergency fund, prudent investing, legacy, ethics—no unrealistic promises. |

## Tracks (diagnosis)

- **Tikun do Impulso** — compulsion, emotional escape, dopamine, hidden spending.
- **Fundação do Patrimônio** — status, ego debt, building before foundation.
- **Abundância com Prudência** — fear, scarcity, paralysis.

## Code touchpoints

- System prompt and phase text: `src/constants/systemPrompt.js` (`journeyPhaseContext`, `buildSystemPromptWithContext`).
- Chat hook: `src/hooks/useRabinoMentor.js` → `src/services/rabinoMentorService.js` → `POST /api/rabino-mentor`.
- Backend: `backend/CodigoJudaico.Api/Endpoints/MentorEndpoints.cs`, `Services/MentorOpenAiClient.cs`.

## Backend configuration

Set server-side only:

- `OpenAI__ApiKey`
- Optional: `OpenAI__Model` (default `gpt-4o-mini`), `OpenAI__BaseUrl`
