import { noteAiProviderPolicy } from "./provider-policy";
import { getNoteAiDefaultPreference } from "./ai-default-preference";

export {
  getNoteAiDefaultPreference,
  NOTE_AI_DEFAULT_SETTING_KEY,
  setNoteAiDefaultPreference,
} from "./ai-default-preference";

/** A global preference never bypasses the active provider-consent boundary. */
export function getEffectiveNoteAiDefault(): boolean {
  return getNoteAiDefaultPreference() && noteAiProviderPolicy().eligible;
}
