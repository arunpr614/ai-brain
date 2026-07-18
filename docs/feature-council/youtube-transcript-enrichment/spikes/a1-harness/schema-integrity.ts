import { readFileSync } from "node:fs";

import { sha256Hex } from "./attestation";
import { A1HarnessError } from "./errors";

export const EXPECTED_A1_ATTESTATION_SCHEMA_SHA256 =
  "1e1e74f71c9b8c68ad90c1a8eb79285926504cc9fc384ea42035ecbf2db7367b";
export const EXPECTED_NORMALIZED_TRANSCRIPT_SCHEMA_SHA256 =
  "889689c7339c4136681559463e48a33c5355468fbd411e408124c165d1a57ce1";

export interface SchemaIntegrityEvidence {
  attestationSchemaSha256: string;
  normalizedTranscriptSchemaSha256: string;
}

export function verifyHarnessSchemaFiles(): SchemaIntegrityEvidence {
  const attestationSchemaSha256 = sha256Hex(readFileSync(
    new URL("../../benchmark/A1_ATTESTATION.schema.json", import.meta.url),
  ));
  const normalizedTranscriptSchemaSha256 = sha256Hex(readFileSync(
    new URL("../../benchmark/NORMALIZED_TRANSCRIPT.schema.json", import.meta.url),
  ));

  if (
    attestationSchemaSha256 !== EXPECTED_A1_ATTESTATION_SCHEMA_SHA256
    || normalizedTranscriptSchemaSha256 !== EXPECTED_NORMALIZED_TRANSCRIPT_SCHEMA_SHA256
  ) {
    throw new A1HarnessError(
      "SCHEMA_FILE_MISMATCH",
      "A frozen schema changed without a corresponding harness review.",
    );
  }

  return { attestationSchemaSha256, normalizedTranscriptSchemaSha256 };
}
