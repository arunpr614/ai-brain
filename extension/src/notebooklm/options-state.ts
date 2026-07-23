export interface ConnectorControlStateInput {
  paired: boolean;
  bound: boolean;
  hasBinding: boolean;
  brainAccess: boolean;
  notebookLmAccess: boolean;
}

export function connectorControlState(input: ConnectorControlStateInput) {
  return {
    grantDisabled: input.notebookLmAccess,
    pairDisabled: input.paired || !input.brainAccess,
    pairingInputDisabled: input.paired || !input.brainAccess,
    pairingRevealDisabled: input.paired || !input.brainAccess,
    targetDisabled: !input.paired || !input.brainAccess,
    bindDisabled: !input.paired || !input.brainAccess || !input.notebookLmAccess,
    runDisabled: !input.bound || !input.brainAccess || !input.notebookLmAccess,
    emergencyHidden: !input.paired && !input.hasBinding,
  };
}
