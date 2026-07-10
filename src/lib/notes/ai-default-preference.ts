import { getJsonSetting, setJsonSetting } from "@/db/settings";

export const NOTE_AI_DEFAULT_SETTING_KEY = "notes.ai.include_by_default";

export function getNoteAiDefaultPreference(): boolean {
  return getJsonSetting<boolean>(NOTE_AI_DEFAULT_SETTING_KEY, false) === true;
}

export function setNoteAiDefaultPreference(enabled: boolean): void {
  setJsonSetting(NOTE_AI_DEFAULT_SETTING_KEY, enabled);
}
