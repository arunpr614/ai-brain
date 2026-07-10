export const MAX_ASK_SELECTED_ITEMS = 50;

export interface AskSelectedActionState {
  disabled: boolean;
  label: string;
  title: string;
}

export function getAskSelectedActionState(count: number): AskSelectedActionState {
  if (count <= 0) {
    return {
      disabled: true,
      label: "Ask",
      title: "Select at least one source",
    };
  }

  if (count > MAX_ASK_SELECTED_ITEMS) {
    return {
      disabled: true,
      label: "Limit 50",
      title: `Ask up to ${MAX_ASK_SELECTED_ITEMS} selected sources at a time`,
    };
  }

  return {
    disabled: false,
    label: "Ask",
    title: "Ask selected sources",
  };
}
