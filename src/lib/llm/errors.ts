// src/lib/llm/errors.ts — Provider-agnostic LLM error (v0.6.0 B-1).
//
// All providers throw LLMError so call sites can branch on .code without
// knowing the backend. cause.raw is set when a parse failure leaves a
// response worth persisting for forensics (used by enrich/pipeline.ts to
// store malformed JSON for later inspection).
//
// Codes match the existing OllamaError shape exactly. New codes get added
// only when an actual call site needs to branch on them.

export class LLMError extends Error {
  code: "http" | "timeout" | "connection" | "invalid_response";
  status?: number;
  constructor(code: LLMError["code"], message: string, status?: number) {
    super(message);
    this.code = code;
    this.name = "LLMError";
    this.status = status;
  }
}
