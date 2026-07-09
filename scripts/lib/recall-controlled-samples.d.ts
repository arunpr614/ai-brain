export const DEFAULT_MANIFEST_PATH: string;

export interface ControlledSampleManifestSample {
  label: string;
  contentType: string;
  cardId: string;
  expectedTitle: string;
  createdAt: string;
  sourceUrl: string | null;
  allowTitleInPublicReport: boolean;
  allowSourceUrlInPublicReport: boolean;
}

export interface ControlledSampleManifest {
  manifestPath: string;
  dateWindow: {
    dateFrom: string;
    dateTo: string;
  };
  samples: ControlledSampleManifestSample[];
  negativeControl: {
    label: string;
    cardId: string;
    createdAt: string;
    expectedTitle: string;
  };
}

export function loadControlledSampleManifest(path?: string): ControlledSampleManifest;
export function assertControlledSampleManifestFileSafety(path?: string): {
  path: string;
  exists: boolean;
  underPrivateRecallEvidencePath: boolean;
  ignored: boolean;
  tracked: boolean;
  safeForPrivateValues: boolean;
  mode?: string;
  securePermissions?: boolean;
};
