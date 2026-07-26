import { createHash, createHmac } from 'node:crypto';

const utf8 = (value) => Buffer.from(value, 'utf8');
const hex = (value) => value.toString('hex');
const sha256 = (value) => createHash('sha256').update(value).digest();
const hmacSha256 = (key, value) => createHmac('sha256', key).update(value).digest();

const u64be = (value) => {
  const result = Buffer.alloc(8);
  result.writeBigUInt64BE(BigInt(value));
  return result;
};

const i64be = (value) => {
  const result = Buffer.alloc(8);
  result.writeBigInt64BE(BigInt(value));
  return result;
};

const value = {
  null: () => ({ kind: 'null' }),
  text: (text) => ({ kind: 'text', text }),
  bytes: (bytes) => ({ kind: 'bytes', bytes: Buffer.from(bytes) }),
  digest: (digestHex) => ({ kind: 'bytes', bytes: Buffer.from(digestHex, 'hex') }),
  int: (integer) => ({ kind: 'int', integer: BigInt(integer) }),
  bool: (boolean) => ({ kind: 'bool', boolean }),
};

const fixtureValue = (input) => {
  switch (input.kind) {
    case 'null':
      return { type: 'null' };
    case 'text':
      return { type: 'text', value: input.text };
    case 'bytes':
      return { type: 'bytes_or_digest', hex: hex(input.bytes) };
    case 'int':
      return { type: 'signed_int64', decimal: input.integer.toString() };
    case 'bool':
      return { type: 'boolean', value: input.boolean };
    default:
      throw new Error(`unknown fixture value kind: ${input.kind}`);
  }
};

const fixtureColumns = (columns) =>
  columns.map(({ token, fieldValue }) => ({
    token,
    value: fixtureValue(fieldValue),
  }));

const frame = (input) => {
  switch (input.kind) {
    case 'null':
      return Buffer.concat([Buffer.from([0x00]), u64be(0)]);
    case 'text': {
      const payload = utf8(input.text);
      return Buffer.concat([Buffer.from([0x01]), u64be(payload.length), payload]);
    }
    case 'bytes':
      return Buffer.concat([Buffer.from([0x02]), u64be(input.bytes.length), input.bytes]);
    case 'int': {
      const payload = i64be(input.integer);
      return Buffer.concat([Buffer.from([0x03]), u64be(payload.length), payload]);
    }
    case 'bool': {
      const payload = Buffer.from([input.boolean ? 0x01 : 0x00]);
      return Buffer.concat([Buffer.from([0x04]), u64be(payload.length), payload]);
    }
    default:
      throw new Error(`unknown value kind: ${input.kind}`);
  }
};

const framed = (inputs) => Buffer.concat(inputs.map(frame));
const typedPreimage = (domain, inputs) =>
  Buffer.concat([utf8(domain), Buffer.from([0x00]), framed(inputs)]);
const typedDigest = (domain, inputs) => sha256(typedPreimage(domain, inputs));

const digestHex = (fillByte) => Buffer.alloc(32, fillByte).toString('hex');
const nullableDigest = (digest) => (digest === null ? value.null() : value.digest(digest));

const frameVectors = {
  null: hex(frame(value.null())),
  empty_text: hex(frame(value.text(''))),
  text_a: hex(frame(value.text('A'))),
  raw_000102: hex(frame(value.bytes([0x00, 0x01, 0x02]))),
  int64_negative_one: hex(frame(value.int(-1n))),
  int64_zero: hex(frame(value.int(0n))),
  boolean_false: hex(frame(value.bool(false))),
  boolean_true: hex(frame(value.bool(true))),
};

const int64BoundaryVectors = [
  9007199254740991n,
  9007199254740992n,
  9223372036854775807n,
].map((integer) => ({
  decimal: integer.toString(),
  frame_hex: hex(frame(value.int(integer))),
}));

const framingSelfTestInputs = [
  value.null(),
  value.text(''),
  value.text('A'),
  value.bytes([0x00, 0x01, 0x02]),
  value.int(-1n),
  value.bool(false),
  value.bool(true),
];
const framingSelfTestPreimage = typedPreimage(
  'typed-framing-self-test-v1',
  framingSelfTestInputs,
);

const retiredTupleHash = (fields) =>
  hex(
    typedDigest('youtube-retired-item-v1', [
      value.text(fields.item_id),
      value.int(fields.earliest_cleanup_start_by),
      value.int(fields.earliest_source_delete_by),
      value.int(fields.retention_cleanup_budget_ms),
      value.digest(fields.retention_budget_profile_hash),
      value.digest(fields.obligation_set_hash),
      value.int(fields.obligation_count),
      value.digest(fields.client_storage_contract_hash),
      value.int(fields.retired_at),
    ]),
  );

const genesisHash = sha256(
  Buffer.concat([
    utf8('youtube-retired-item-ledger-genesis-v1'),
    Buffer.from([0x00]),
  ]),
);
const ledgerKey = Buffer.from(
  '000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f',
  'hex',
);

const ledgerRecord = (fields, signingKey = ledgerKey) => {
  const stableFields = {
    ...fields,
    retired_tuple_hash: retiredTupleHash(fields),
  };
  const payload = framed([
    value.int(stableFields.sequence),
    value.digest(stableFields.previous_entry_hash),
    value.text(stableFields.item_id),
    value.int(stableFields.earliest_cleanup_start_by),
    value.int(stableFields.earliest_source_delete_by),
    value.int(stableFields.retention_cleanup_budget_ms),
    value.digest(stableFields.retention_budget_profile_hash),
    value.digest(stableFields.obligation_set_hash),
    value.int(stableFields.obligation_count),
    value.digest(stableFields.client_storage_contract_hash),
    value.int(stableFields.retired_at),
    value.digest(stableFields.retired_tuple_hash),
    value.text(stableFields.origin_reason),
    value.digest(stableFields.origin_evidence_hash),
  ]);
  const entryHash = sha256(
    Buffer.concat([
      utf8('youtube-retired-item-ledger-entry-hash-v1'),
      Buffer.from([0x00]),
      u64be(payload.length),
      payload,
    ]),
  );
  const entryHmac = hmacSha256(
    signingKey,
    Buffer.concat([
      utf8('youtube-retired-item-ledger-entry-hmac-v1'),
      Buffer.from([0x00]),
      u64be(payload.length),
      payload,
      entryHash,
    ]),
  );
  const record = Buffer.concat([
    u64be(payload.length + 64),
    payload,
    entryHash,
    entryHmac,
  ]);
  return {
    fields: Object.fromEntries(
      Object.entries(stableFields).map(([key, fieldValue]) => [
        key,
        typeof fieldValue === 'bigint' ? fieldValue.toString() : fieldValue,
      ]),
    ),
    payload_hex: hex(payload),
    entry_hash: hex(entryHash),
    entry_hmac_sha256: hex(entryHmac),
    record_hex: hex(record),
    record_sha256: hex(sha256(record)),
  };
};

const recordFromParts = (payloadHex, entryHashHex, entryHmacHex) => {
  const payload = Buffer.from(payloadHex, 'hex');
  const record = Buffer.concat([
    u64be(payload.length + 64),
    payload,
    Buffer.from(entryHashHex, 'hex'),
    Buffer.from(entryHmacHex, 'hex'),
  ]);
  return {
    record_hex: hex(record),
    record_sha256: hex(sha256(record)),
  };
};

const entryHmacForParts = (payloadHex, entryHashHex, key = ledgerKey) => {
  const payload = Buffer.from(payloadHex, 'hex');
  return hex(
    hmacSha256(
      key,
      Buffer.concat([
        utf8('youtube-retired-item-ledger-entry-hmac-v1'),
        Buffer.from([0x00]),
        u64be(payload.length),
        payload,
        Buffer.from(entryHashHex, 'hex'),
      ]),
    ),
  );
};

const columnFrames = (columns) =>
  columns.flatMap(({ token, fieldValue }) => [value.text(token), fieldValue]);

const rootRow = (tableToken, primaryKeyColumns, storedColumns) => {
  const primaryKeyPreimage = typedPreimage(
    'brain-sensitive-backup-root-primary-key-v1',
    [
      value.text(tableToken),
      value.int(primaryKeyColumns.length),
      ...columnFrames(primaryKeyColumns),
    ],
  );
  const rowPreimage = typedPreimage(
    'brain-sensitive-backup-root-row-preimage-v1',
    [
      value.text(tableToken),
      value.int(storedColumns.length),
      ...columnFrames(storedColumns),
    ],
  );
  return {
    primary_key_columns: fixtureColumns(primaryKeyColumns),
    stored_columns: fixtureColumns(storedColumns),
    primary_key_preimage_hex: hex(primaryKeyPreimage),
    primary_key_hash: hex(sha256(primaryKeyPreimage)),
    row_preimage_hex: hex(rowPreimage),
    row_preimage_sha256: hex(sha256(rowPreimage)),
  };
};

const rootPreimage = (tables) => {
  const inputs = [value.int(tables.length)];
  const emittedTables = [];
  for (const table of tables) {
    const rows = [...table.rows].sort((left, right) =>
      Buffer.compare(
        Buffer.from(left.primary_key_hash, 'hex'),
        Buffer.from(right.primary_key_hash, 'hex'),
      ),
    );
    for (let index = 1; index < rows.length; index += 1) {
      if (rows[index - 1].primary_key_hash === rows[index].primary_key_hash) {
        throw new Error('duplicate primary-key hash');
      }
    }
    inputs.push(value.text(table.table_token), value.int(rows.length));
    for (const row of rows) {
      inputs.push(
        value.digest(row.primary_key_hash),
        value.digest(row.row_preimage_sha256),
      );
    }
    emittedTables.push({ table_token: table.table_token, rows });
  }
  return {
    tables: emittedTables,
    preimage_hex: hex(typedPreimage('brain-sensitive-backup-root-preimage-v1', inputs)),
    root_preimage_sha256: hex(
      typedDigest('brain-sensitive-backup-root-preimage-v1', inputs),
    ),
  };
};

const rootOne = rootPreimage([
  {
    table_token: 'items',
    rows: [
      rootRow(
        'items',
        [{ token: 'id', fieldValue: value.text('item-α') }],
        [
          { token: 'id', fieldValue: value.text('item-α') },
          { token: 'body', fieldValue: value.text('alpha body') },
          { token: 'summary', fieldValue: value.null() },
        ],
      ),
    ],
  },
  {
    table_token: 'transcript_sources',
    rows: [
      rootRow(
        'transcript_sources',
        [{ token: 'id', fieldValue: value.text('source-a') }],
        [
          { token: 'id', fieldValue: value.text('source-a') },
          { token: 'item_id', fieldValue: value.text('item-α') },
          { token: 'text_sha256', fieldValue: value.digest(digestHex(0x91)) },
        ],
      ),
    ],
  },
]);
const rootTwo = rootPreimage([
  {
    table_token: 'items',
    rows: [
      rootRow(
        'items',
        [{ token: 'id', fieldValue: value.text('item-z') }],
        [
          { token: 'id', fieldValue: value.text('item-z') },
          { token: 'body', fieldValue: value.text('z body') },
          { token: 'summary', fieldValue: value.text('') },
        ],
      ),
    ],
  },
  { table_token: 'transcript_sources', rows: [] },
]);

const setDigest = (domain, rows) =>
  hex(
    typedDigest(domain, [
      value.int(rows.length),
      ...rows.flatMap((row) => row),
    ]),
  );

const aggregateVector = (domain, orderedFields, sortContract, rows) => {
  const inputs = [
    value.int(rows.length),
    ...rows.flatMap((row) => row.fields),
  ];
  const preimage = typedPreimage(domain, inputs);
  return {
    domain,
    ordered_fields: orderedFields,
    sort_contract: sortContract,
    sorted_rows: rows.map((row) => ({
      values: row.fields.map(fixtureValue),
    })),
    preimage_hex: hex(preimage),
    sha256: hex(sha256(preimage)),
  };
};

const emptyAggregateVector = (domain) => {
  const preimage = typedPreimage(domain, [value.int(0n)]);
  return {
    domain,
    preimage_hex: hex(preimage),
    sha256: hex(sha256(preimage)),
  };
};

const removedObligationFieldOrder = [
  'obligation_id',
  'item_id',
  'policy_decision_id',
  'accepted_content_revision',
  'source_delete_by',
  'source_kind',
  'retention_cleanup_budget_ms',
  'retention_cleanup_start_by',
  'retention_budget_profile_hash',
  'metadata_cache_scope_hash',
  'client_storage_contract_hash',
  'admission_evidence_kind',
  'admission_evidence_id',
  'created_at',
  'artifact_manifest_hash',
  'artifact_manifest_count',
  'survivor_manifest_hash',
  'survivor_manifest_count',
];

const removedObligationRows = [
  {
    item_id: 'item-z',
    obligation_id: 'obl-z',
    fields: [
      value.text('obl-z'),
      value.text('item-z'),
      value.text('policy-z'),
      value.int(4n),
      value.int(6300000n),
      value.text('lab_public_caption'),
      value.int(300000n),
      value.int(6000000n),
      value.digest(digestHex(0x55)),
      value.digest(digestHex(0xb2)),
      value.digest(digestHex(0x77)),
      value.text('recovery_receipt'),
      value.text('receipt-z'),
      value.int(1700000n),
      value.null(),
      value.null(),
      value.null(),
      value.null(),
    ],
  },
  {
    item_id: 'item-α',
    obligation_id: 'obl-a',
    fields: [
      value.text('obl-a'),
      value.text('item-α'),
      value.text('policy-a'),
      value.int(3n),
      value.int(5300000n),
      value.text('browser_visible_transcript'),
      value.int(300000n),
      value.int(5000000n),
      value.digest(digestHex(0x11)),
      value.digest(digestHex(0xb1)),
      value.digest(digestHex(0x33)),
      value.text('browser_receipt'),
      value.text('receipt-a'),
      value.int(1800000n),
      value.null(),
      value.null(),
      value.null(),
      value.null(),
    ],
  },
].sort((left, right) => {
  const itemOrder = Buffer.compare(utf8(left.item_id), utf8(right.item_id));
  return itemOrder || Buffer.compare(utf8(left.obligation_id), utf8(right.obligation_id));
});

const obligationSetHashByItem = Object.fromEntries(
  removedObligationRows.map((row) => [
    row.item_id,
    setDigest('youtube-retention-obligation-set-v1', [row.fields]),
  ]),
);

const fixtureDescriptor = {
  descriptor_id: 'stage2-conformance-encoder-subset-v1',
  purpose: 'cryptographic_encoder_fixture_only',
  production_descriptor_complete: false,
  root_table_registry: [
    {
      table_token: 'items',
      primary_key_columns: ['id'],
      stored_columns: ['id', 'body', 'summary'],
    },
    {
      table_token: 'transcript_sources',
      primary_key_columns: ['id'],
      stored_columns: ['id', 'item_id', 'text_sha256'],
    },
  ],
  survivor_table_registry: ['capture_metadata_cache', 'collections'],
  zero_scan_surface_registry: ['main_pages', 'wal'],
};

const cacheAlphaRow = rootRow(
  'capture_metadata_cache',
  [{ token: 'id', fieldValue: value.text('cache-alpha') }],
  [
    { token: 'id', fieldValue: value.text('cache-alpha') },
    { token: 'platform', fieldValue: value.text('youtube_data_api') },
    { token: 'cache_key', fieldValue: value.text('video:abcdefghijk') },
    { token: 'payload_json', fieldValue: value.text('{"fixture":"alpha"}') },
    { token: 'status', fieldValue: value.text('ok') },
    { token: 'expires_at', fieldValue: value.int(5200000n) },
    { token: 'created_at', fieldValue: value.int(1500000n) },
    { token: 'updated_at', fieldValue: value.int(1600000n) },
  ],
);

const collectionZPreRow = rootRow(
  'collections',
  [{ token: 'id', fieldValue: value.text('collection-z') }],
  [
    { token: 'id', fieldValue: value.text('collection-z') },
    { token: 'name', fieldValue: value.text('Shared collection') },
    { token: 'kind', fieldValue: value.text('manual') },
    { token: 'description', fieldValue: value.text('fixture collection') },
    { token: 'pinned', fieldValue: value.int(0n) },
    { token: 'created_at', fieldValue: value.int(1000000n) },
    {
      token: 'live_item_ids',
      fieldValue: value.text('["item-other","item-z"]'),
    },
  ],
);

const collectionZPostRow = rootRow(
  'collections',
  [{ token: 'id', fieldValue: value.text('collection-z') }],
  [
    { token: 'id', fieldValue: value.text('collection-z') },
    { token: 'name', fieldValue: value.text('Shared collection') },
    { token: 'kind', fieldValue: value.text('manual') },
    { token: 'description', fieldValue: value.text('fixture collection') },
    { token: 'pinned', fieldValue: value.int(0n) },
    { token: 'created_at', fieldValue: value.int(1000000n) },
    { token: 'live_item_ids', fieldValue: value.text('["item-other"]') },
  ],
);

const survivorManifestVector = (itemId, rowsByTable) => {
  const inputs = [value.int(fixtureDescriptor.survivor_table_registry.length)];
  const tables = [];
  let rowCount = 0;
  for (const tableToken of fixtureDescriptor.survivor_table_registry) {
    const rows = [...(rowsByTable[tableToken] ?? [])].sort((left, right) =>
      Buffer.compare(
        Buffer.from(left.primary_key_hash, 'hex'),
        Buffer.from(right.primary_key_hash, 'hex'),
      ),
    );
    inputs.push(value.text(tableToken), value.int(rows.length));
    for (const row of rows) {
      inputs.push(
        value.digest(row.primary_key_hash),
        value.text(row.action),
        value.digest(row.preimage_sha256),
        nullableDigest(row.expected_postimage_sha256),
      );
    }
    rowCount += rows.length;
    tables.push({
      table_token: tableToken,
      rows: rows.map((row) => ({
        primary_key_hash: row.primary_key_hash,
        action: row.action,
        preimage_sha256: row.preimage_sha256,
        expected_postimage_sha256: row.expected_postimage_sha256,
        row_descriptor: row.row_descriptor,
      })),
    });
  }
  const preimage = typedPreimage('youtube-retention-survivor-manifest-v1', inputs);
  return {
    item_id: itemId,
    domain: 'youtube-retention-survivor-manifest-v1',
    table_registry: fixtureDescriptor.survivor_table_registry,
    tables,
    survivor_manifest_count: rowCount,
    preimage_hex: hex(preimage),
    sha256: hex(sha256(preimage)),
  };
};

const survivorManifests = {
  'item-z': survivorManifestVector('item-z', {
    collections: [
      {
        primary_key_hash: collectionZPreRow.primary_key_hash,
        action: 'cascade_verify',
        preimage_sha256: collectionZPreRow.row_preimage_sha256,
        expected_postimage_sha256: collectionZPostRow.row_preimage_sha256,
        row_descriptor: {
          before: collectionZPreRow,
          after: collectionZPostRow,
        },
      },
    ],
  }),
  'item-α': survivorManifestVector('item-α', {
    capture_metadata_cache: [
      {
        primary_key_hash: cacheAlphaRow.primary_key_hash,
        action: 'delete',
        preimage_sha256: cacheAlphaRow.row_preimage_sha256,
        expected_postimage_sha256: null,
        row_descriptor: { before: cacheAlphaRow, after: null },
      },
    ],
  }),
};

const survivorActionFieldOrder = [
  'item_id',
  'ordinal',
  'table_token',
  'primary_key_hash',
  'action',
  'preimage_sha256',
  'expected_postimage_sha256',
];

const survivorActionRows = [
  {
    item_id: 'item-z',
    ordinal: 0n,
    fields: [
      value.text('item-z'),
      value.int(0n),
      value.text('collections'),
      value.digest(collectionZPreRow.primary_key_hash),
      value.text('cascade_verify'),
      value.digest(collectionZPreRow.row_preimage_sha256),
      value.digest(collectionZPostRow.row_preimage_sha256),
    ],
  },
  {
    item_id: 'item-α',
    ordinal: 0n,
    fields: [
      value.text('item-α'),
      value.int(0n),
      value.text('capture_metadata_cache'),
      value.digest(cacheAlphaRow.primary_key_hash),
      value.text('delete'),
      value.digest(cacheAlphaRow.row_preimage_sha256),
      value.null(),
    ],
  },
].sort((left, right) => {
  const itemOrder = Buffer.compare(utf8(left.item_id), utf8(right.item_id));
  return itemOrder || (left.ordinal < right.ordinal ? -1 : left.ordinal > right.ordinal ? 1 : 0);
});

const attestationId = '00000000000000000000000000';
const tPlan = 2000000n;
const tDelete = 2000100n;
const tFinalize = 2000200n;
const detachedKey = Buffer.alloc(32);
const backupKeyIdHash = hex(
  sha256(
    Buffer.concat([
      utf8('brain-sensitive-backup-key-id-v1'),
      Buffer.from([0x00]),
      detachedKey,
    ]),
  ),
);

const backupKeyProvisioningDomain =
  'brain-sensitive-backup-key-provisioning-v1';
const backupKeyProvisioningFieldOrder = [
  'receipt_id',
  'operation_id',
  'provisioning_kind',
  'input_evidence_kind',
  'input_evidence_sha256',
  'prior_backup_key_id_hash',
  'new_backup_key_id_hash',
  'local_signer_store_identity_sha256',
  'recovery_verifier_store_identity_sha256',
  'recovery_install_ack_sha256',
  'verification_challenge_sha256',
  'operator_artifact_sha256',
  'scrubber_tool_hash',
  'retention_capability_hash',
  'retired_ledger_head_sequence',
  'retired_ledger_head_hash',
  'created_at',
];
const backupKeyProvisioningFields = {
  receipt_id: '00000000000000000000000001',
  operation_id: 'restore-fixture-0001',
  provisioning_kind: 'declared_root_loss_reprovision_v1',
  input_evidence_kind: 's28_scrub_attestation_v2',
  input_evidence_sha256: digestHex(0xc1),
  prior_backup_key_id_hash: digestHex(0xc2),
  new_backup_key_id_hash: backupKeyIdHash,
  local_signer_store_identity_sha256: digestHex(0xc3),
  recovery_verifier_store_identity_sha256: digestHex(0xc4),
  recovery_install_ack_sha256: digestHex(0xc5),
  verification_challenge_sha256: digestHex(0xc6),
  operator_artifact_sha256: digestHex(0xc7),
  scrubber_tool_hash: digestHex(0x06),
  retention_capability_hash: digestHex(0x0a),
  retired_ledger_head_sequence: 0n,
  retired_ledger_head_hash: hex(genesisHash),
  created_at: 1999900n,
};
const backupKeyProvisioningInputsFor = (fields) => [
  value.text(fields.receipt_id),
  value.text(fields.operation_id),
  value.text(fields.provisioning_kind),
  value.text(fields.input_evidence_kind),
  value.digest(fields.input_evidence_sha256),
  nullableDigest(fields.prior_backup_key_id_hash),
  value.digest(fields.new_backup_key_id_hash),
  value.digest(fields.local_signer_store_identity_sha256),
  value.digest(fields.recovery_verifier_store_identity_sha256),
  value.digest(fields.recovery_install_ack_sha256),
  value.digest(fields.verification_challenge_sha256),
  value.digest(fields.operator_artifact_sha256),
  value.digest(fields.scrubber_tool_hash),
  value.digest(fields.retention_capability_hash),
  value.int(fields.retired_ledger_head_sequence),
  value.digest(fields.retired_ledger_head_hash),
  value.int(fields.created_at),
];
const backupKeyProvisioningVectorFromInputs = (inputs) => {
  const preimage = typedPreimage(backupKeyProvisioningDomain, inputs);
  return {
    values: inputs.map(fixtureValue),
    preimage_hex: hex(preimage),
    sha256: hex(sha256(preimage)),
  };
};
const backupKeyProvisioningInputs = backupKeyProvisioningInputsFor(
  backupKeyProvisioningFields,
);
const backupKeyProvisioningReceipt =
  backupKeyProvisioningVectorFromInputs(backupKeyProvisioningInputs);
const provisioningKindSubstitution =
  backupKeyProvisioningVectorFromInputs(
    backupKeyProvisioningInputsFor({
      ...backupKeyProvisioningFields,
      provisioning_kind: 'prepositioned_dual_copy_v1',
    }),
  );
const provisioningKeyIdSubstitution =
  backupKeyProvisioningVectorFromInputs(
    backupKeyProvisioningInputsFor({
      ...backupKeyProvisioningFields,
      new_backup_key_id_hash: digestHex(0xc8),
    }),
  );
const provisioningFieldOrderSubstitutionInputs = [
  ...backupKeyProvisioningInputs,
];
[
  provisioningFieldOrderSubstitutionInputs[7],
  provisioningFieldOrderSubstitutionInputs[8],
] = [
  provisioningFieldOrderSubstitutionInputs[8],
  provisioningFieldOrderSubstitutionInputs[7],
];
const provisioningFieldOrderSubstitution =
  backupKeyProvisioningVectorFromInputs(
    provisioningFieldOrderSubstitutionInputs,
  );
const backupKeyProvisioningVector = {
  domain: backupKeyProvisioningDomain,
  ordered_fields: backupKeyProvisioningFieldOrder,
  ...backupKeyProvisioningReceipt,
  negative_vectors: {
    provisioning_kind_substitution: {
      mutation:
        'provisioning kind changed to prepositioned while the original receipt digest is supplied',
      preimage_hex: provisioningKindSubstitution.preimage_hex,
      recomputed_receipt_sha256: provisioningKindSubstitution.sha256,
      supplied_receipt_sha256: backupKeyProvisioningReceipt.sha256,
      expected: 'reject_key_provisioning_receipt',
    },
    new_key_id_substitution: {
      mutation:
        'cryptographically valid provisioning receipt names a different new key ID than the backup attestation',
      preimage_hex: provisioningKeyIdSubstitution.preimage_hex,
      recomputed_receipt_sha256: provisioningKeyIdSubstitution.sha256,
      attestation_backup_key_id_hash: backupKeyIdHash,
      substituted_new_backup_key_id_hash: digestHex(0xc8),
      expected: 'reject_key_provisioning_key_id',
    },
    local_recovery_store_order_substitution: {
      mutation:
        'local-signer and recovery-verifier store identities are swapped while the original receipt digest is supplied',
      preimage_hex: provisioningFieldOrderSubstitution.preimage_hex,
      recomputed_receipt_sha256: provisioningFieldOrderSubstitution.sha256,
      supplied_receipt_sha256: backupKeyProvisioningReceipt.sha256,
      expected: 'reject_key_provisioning_receipt',
    },
  },
};

const browserPreviousAuthorityEpoch = Buffer.alloc(32, 0xd0);
const browserCurrentAuthorityEpoch = Buffer.alloc(32, 0xd1);
const browserAuthoritySecret = Buffer.from(
  '000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f',
  'hex',
);
const browserAuthoritySecretBase64url =
  browserAuthoritySecret.toString('base64url');
const browserAuthorityEnvelope = (epoch) =>
  `yb2.${hex(epoch)}.${browserAuthoritySecretBase64url}`;
const browserAuthoritySecretVector = (domain, epoch) => {
  const preimage = Buffer.concat([
    utf8(domain),
    Buffer.from([0x00]),
    epoch,
    browserAuthoritySecret,
  ]);
  return {
    preimage_hex: hex(preimage),
    sha256: hex(sha256(preimage)),
  };
};
const browserAuthorityDomainSpecs = [
  {
    authority: 'intent',
    domain: 'youtube-browser-intent-secret-v2',
  },
  {
    authority: 'inspect',
    domain: 'youtube-browser-inspect-secret-v2',
  },
  {
    authority: 'upload_grant',
    domain: 'youtube-browser-upload-grant-secret-v2',
  },
].map((spec) => ({
  ...spec,
  previous_epoch: browserAuthoritySecretVector(
    spec.domain,
    browserPreviousAuthorityEpoch,
  ),
  current_epoch: browserAuthoritySecretVector(
    spec.domain,
    browserCurrentAuthorityEpoch,
  ),
}));
const browserAuthorityByName = Object.fromEntries(
  browserAuthorityDomainSpecs.map((spec) => [spec.authority, spec]),
);
const browserAuthorityEpochVector = {
  epoch_contract: 'youtube-browser-authority-epoch-v1',
  previous_epoch_id_hex: hex(browserPreviousAuthorityEpoch),
  current_epoch_id_hex: hex(browserCurrentAuthorityEpoch),
  creation_reason: 'restore_invalidate_v1',
  operation_id: 'restore-fixture-0001',
  secret_hash_framing:
    'UTF8(domain) || 0x00 || raw32(authority_epoch_id) || raw32(secret)',
  raw_secret_hex: hex(browserAuthoritySecret),
  raw_secret_base64url: browserAuthoritySecretBase64url,
  token_envelope_format: 'yb2.<64-lowercase-hex-epoch>.<base64url-raw32>',
  previous_epoch_envelope: browserAuthorityEnvelope(
    browserPreviousAuthorityEpoch,
  ),
  current_epoch_envelope: browserAuthorityEnvelope(
    browserCurrentAuthorityEpoch,
  ),
  domains: browserAuthorityDomainSpecs,
  current_epoch_hashes_are_cross_domain_distinct:
    new Set(
      browserAuthorityDomainSpecs.map((spec) => spec.current_epoch.sha256),
    ).size === browserAuthorityDomainSpecs.length,
  negative_vectors: {
    old_epoch_replay: {
      mutation:
        'previous-epoch intent token is presented after restore selected the current epoch',
      presented_envelope: browserAuthorityEnvelope(
        browserPreviousAuthorityEpoch,
      ),
      presented_epoch_id_hex: hex(browserPreviousAuthorityEpoch),
      presented_hash:
        browserAuthorityByName.intent.previous_epoch.sha256,
      current_epoch_id_hex: hex(browserCurrentAuthorityEpoch),
      epoch_matches_current: false,
      database_lookup: false,
      dom_or_body_read: false,
      expected: 'reject_authority_epoch_before_lookup',
    },
    missing_epoch_envelope: {
      mutation: 'yb2 token envelope has an empty epoch component',
      presented_envelope: `yb2..${browserAuthoritySecretBase64url}`,
      parsed_components: {
        scheme: 'yb2',
        epoch_component: '',
        secret_component: browserAuthoritySecretBase64url,
      },
      required_epoch_hex_length: 64,
      actual_epoch_hex_length: 0,
      database_lookup: false,
      dom_or_body_read: false,
      expected: 'reject_token_envelope',
    },
    malformed_epoch_envelope: {
      mutation: 'current epoch token envelope has a non-hex epoch component',
      presented_envelope: `yb2.${'z'.repeat(64)}.${browserAuthoritySecretBase64url}`,
      parsed_components: {
        scheme: 'yb2',
        epoch_component: 'z'.repeat(64),
        secret_component: browserAuthoritySecretBase64url,
      },
      required_epoch_pattern: '^[0-9a-f]{64}$',
      epoch_component_matches_required_pattern: false,
      database_lookup: false,
      dom_or_body_read: false,
      expected: 'reject_token_envelope',
    },
    inspect_domain_substitution: {
      mutation:
        'current-epoch intent-domain hash is supplied where inspect-domain authority is required',
      supplied_domain: browserAuthorityByName.intent.domain,
      supplied_hash: browserAuthorityByName.intent.current_epoch.sha256,
      required_domain: browserAuthorityByName.inspect.domain,
      required_hash: browserAuthorityByName.inspect.current_epoch.sha256,
      supplied_hash_matches_required_hash: false,
      expected: 'reject_secret_domain',
    },
    duplicate_inspect_issuance: {
      mutation:
        'the exact current-epoch inspect secret is inserted a second time',
      authority_epoch_id_hex: hex(browserCurrentAuthorityEpoch),
      inspect_grant_hash:
        browserAuthorityByName.inspect.current_epoch.sha256,
      first_insert_state: 'present',
      second_insert_state: 'duplicate',
      unique_key:
        'authority_epoch_id_hex,inspect_grant_hash',
      expected: 'reject_inspect_secret_reuse',
    },
  },
};

const plannedItemSpecs = [
  {
    item_id: 'item-z',
    earliest_cleanup_start_by: 6000000n,
    earliest_source_delete_by: 6300000n,
    retention_cleanup_budget_ms: 300000n,
    retention_budget_profile_hash: digestHex(0x55),
    obligation_set_hash: obligationSetHashByItem['item-z'],
    obligation_count: 1n,
    survivor_manifest_hash: survivorManifests['item-z'].sha256,
    survivor_manifest_count: 1n,
    client_storage_contract_hash: digestHex(0x77),
    retired_at: tPlan,
    root_preimage_sha256: rootTwo.root_preimage_sha256,
  },
  {
    item_id: 'item-α',
    earliest_cleanup_start_by: 5000000n,
    earliest_source_delete_by: 5300000n,
    retention_cleanup_budget_ms: 300000n,
    retention_budget_profile_hash: digestHex(0x11),
    obligation_set_hash: obligationSetHashByItem['item-α'],
    obligation_count: 1n,
    survivor_manifest_hash: survivorManifests['item-α'].sha256,
    survivor_manifest_count: 1n,
    client_storage_contract_hash: digestHex(0x33),
    retired_at: tPlan,
    root_preimage_sha256: rootOne.root_preimage_sha256,
  },
]
  .map((spec) => ({ ...spec, retired_tuple_hash: retiredTupleHash(spec) }))
  .sort((left, right) => Buffer.compare(utf8(left.item_id), utf8(right.item_id)));

const plannedByItem = Object.fromEntries(
  plannedItemSpecs.map((spec) => [spec.item_id, spec]),
);

const removedItemFieldOrder = [
  'item_id',
  'earliest_cleanup_start_by',
  'earliest_source_delete_by',
  'retention_cleanup_budget_ms',
  'retention_budget_profile_hash',
  'obligation_set_hash',
  'obligation_count',
  'survivor_manifest_hash',
  'survivor_manifest_count',
  'client_storage_contract_hash',
  'retired_at',
  'retired_tuple_hash',
  'root_preimage_sha256',
];

const removedItemRows = plannedItemSpecs.map((spec) => ({
  item_id: spec.item_id,
  fields: [
    value.text(spec.item_id),
    value.int(spec.earliest_cleanup_start_by),
    value.int(spec.earliest_source_delete_by),
    value.int(spec.retention_cleanup_budget_ms),
    value.digest(spec.retention_budget_profile_hash),
    value.digest(spec.obligation_set_hash),
    value.int(spec.obligation_count),
    value.digest(spec.survivor_manifest_hash),
    value.int(spec.survivor_manifest_count),
    value.digest(spec.client_storage_contract_hash),
    value.int(spec.retired_at),
    value.digest(spec.retired_tuple_hash),
    value.digest(spec.root_preimage_sha256),
  ],
}));

const planAggregateHashes = {
  removed_item_set_hash: setDigest(
    'brain-sensitive-backup-removed-item-set-v1',
    removedItemRows.map((row) => row.fields),
  ),
  removed_obligation_set_hash: setDigest(
    'brain-sensitive-backup-removed-obligation-set-v1',
    removedObligationRows.map((row) => row.fields),
  ),
  survivor_action_set_hash: setDigest(
    'brain-sensitive-backup-survivor-action-set-v1',
    survivorActionRows.map((row) => row.fields),
  ),
};

const scrubApplicationFieldOrder = [
  'attestation_id',
  'input_database_sha256',
  'scrub_contract',
  'backup_key_id_hash',
  'backup_key_provisioning_kind',
  'backup_key_provisioning_receipt_sha256',
  'migration_ledger_hash',
  'schema_descriptor_hash',
  'guard_descriptor_hash',
  'scrubber_tool_hash',
  'sqlite_runtime_hash',
  'sqlite_vec_runtime_hash',
  'scalar_registry_hash',
  'retention_capability_hash',
  'removed_item_set_hash',
  'removed_item_count',
  'removed_obligation_set_hash',
  'removed_obligation_count',
  'survivor_action_set_hash',
  'survivor_action_count',
  'retired_ledger_base_sequence',
  'retired_ledger_base_hash',
  'effective_clock_ms',
  'max_observed_wall_ms',
  'created_at',
];

const scrubApplicationValues = {
  attestation_id: attestationId,
  input_database_sha256: digestHex(0x01),
  scrub_contract: 'brain-sensitive-backup-scrub-v2',
  backup_key_id_hash: backupKeyIdHash,
  backup_key_provisioning_kind:
    backupKeyProvisioningFields.provisioning_kind,
  backup_key_provisioning_receipt_sha256:
    backupKeyProvisioningReceipt.sha256,
  migration_ledger_hash: digestHex(0x03),
  schema_descriptor_hash: digestHex(0x04),
  guard_descriptor_hash: digestHex(0x05),
  scrubber_tool_hash: digestHex(0x06),
  sqlite_runtime_hash: digestHex(0x07),
  sqlite_vec_runtime_hash: digestHex(0x08),
  scalar_registry_hash: digestHex(0x09),
  retention_capability_hash: digestHex(0x0a),
  removed_item_set_hash: planAggregateHashes.removed_item_set_hash,
  removed_item_count: 2n,
  removed_obligation_set_hash: planAggregateHashes.removed_obligation_set_hash,
  removed_obligation_count: 2n,
  survivor_action_set_hash: planAggregateHashes.survivor_action_set_hash,
  survivor_action_count: 2n,
  retired_ledger_base_sequence: 0n,
  retired_ledger_base_hash: hex(genesisHash),
  effective_clock_ms: tPlan,
  max_observed_wall_ms: tPlan,
  created_at: tPlan,
};

const scrubApplicationInputs = [
  value.text(scrubApplicationValues.attestation_id),
  value.digest(scrubApplicationValues.input_database_sha256),
  value.text(scrubApplicationValues.scrub_contract),
  value.digest(scrubApplicationValues.backup_key_id_hash),
  value.text(scrubApplicationValues.backup_key_provisioning_kind),
  value.digest(
    scrubApplicationValues.backup_key_provisioning_receipt_sha256,
  ),
  value.digest(scrubApplicationValues.migration_ledger_hash),
  value.digest(scrubApplicationValues.schema_descriptor_hash),
  value.digest(scrubApplicationValues.guard_descriptor_hash),
  value.digest(scrubApplicationValues.scrubber_tool_hash),
  value.digest(scrubApplicationValues.sqlite_runtime_hash),
  value.digest(scrubApplicationValues.sqlite_vec_runtime_hash),
  value.digest(scrubApplicationValues.scalar_registry_hash),
  value.digest(scrubApplicationValues.retention_capability_hash),
  value.digest(scrubApplicationValues.removed_item_set_hash),
  value.int(scrubApplicationValues.removed_item_count),
  value.digest(scrubApplicationValues.removed_obligation_set_hash),
  value.int(scrubApplicationValues.removed_obligation_count),
  value.digest(scrubApplicationValues.survivor_action_set_hash),
  value.int(scrubApplicationValues.survivor_action_count),
  value.int(scrubApplicationValues.retired_ledger_base_sequence),
  value.digest(scrubApplicationValues.retired_ledger_base_hash),
  value.int(scrubApplicationValues.effective_clock_ms),
  value.int(scrubApplicationValues.max_observed_wall_ms),
  value.int(scrubApplicationValues.created_at),
];
const scrubPlanPreimage = typedPreimage(
  'brain-sensitive-backup-scrub-plan-v1',
  scrubApplicationInputs,
);
const scrubPlanHash = hex(sha256(scrubPlanPreimage));

const ledgerFieldsFor = (spec, sequence, previousEntryHash) => ({
  sequence,
  previous_entry_hash: previousEntryHash,
  item_id: spec.item_id,
  earliest_cleanup_start_by: spec.earliest_cleanup_start_by,
  earliest_source_delete_by: spec.earliest_source_delete_by,
  retention_cleanup_budget_ms: spec.retention_cleanup_budget_ms,
  retention_budget_profile_hash: spec.retention_budget_profile_hash,
  obligation_set_hash: spec.obligation_set_hash,
  obligation_count: spec.obligation_count,
  client_storage_contract_hash: spec.client_storage_contract_hash,
  retired_at: spec.retired_at,
  origin_reason: 'backup_scrubbed_restricted_root',
  origin_evidence_hash: scrubPlanHash,
});

const ledgerRecordOne = ledgerRecord(
  ledgerFieldsFor(plannedByItem['item-z'], 1n, hex(genesisHash)),
);
const ledgerRecordTwo = ledgerRecord(
  ledgerFieldsFor(plannedByItem['item-α'], 2n, ledgerRecordOne.entry_hash),
);
const ledgerByItem = {
  'item-z': ledgerRecordOne,
  'item-α': ledgerRecordTwo,
};

const copyRetiredFieldOrder = [
  'attestation_id',
  'item_id',
  'earliest_cleanup_start_by',
  'earliest_source_delete_by',
  'retention_cleanup_budget_ms',
  'retention_budget_profile_hash',
  'obligation_set_hash',
  'obligation_count',
  'survivor_manifest_hash',
  'survivor_manifest_count',
  'client_storage_contract_hash',
  'retired_tuple_hash',
  'retired_at',
  'local_root_absent_at',
  'ledger_sequence',
  'ledger_entry_hash',
];

const copyRetiredRows = plannedItemSpecs.map((spec) => {
  const ledger = ledgerByItem[spec.item_id];
  return {
    item_id: spec.item_id,
    fields: [
      value.text(attestationId),
      value.text(spec.item_id),
      value.int(spec.earliest_cleanup_start_by),
      value.int(spec.earliest_source_delete_by),
      value.int(spec.retention_cleanup_budget_ms),
      value.digest(spec.retention_budget_profile_hash),
      value.digest(spec.obligation_set_hash),
      value.int(spec.obligation_count),
      value.digest(spec.survivor_manifest_hash),
      value.int(spec.survivor_manifest_count),
      value.digest(spec.client_storage_contract_hash),
      value.digest(spec.retired_tuple_hash),
      value.int(spec.retired_at),
      value.int(tDelete),
      value.int(ledger.fields.sequence),
      value.digest(ledger.entry_hash),
    ],
  };
});

const resultingRetiredFieldOrder = [
  'item_id',
  'reason',
  'root_purge_seal_id',
  'backup_scrub_attestation_id',
  'ledger_sequence',
  'ledger_entry_hash',
  'earliest_cleanup_start_by',
  'earliest_source_delete_by',
  'retention_cleanup_budget_ms',
  'retention_budget_profile_hash',
  'obligation_set_hash',
  'obligation_count',
  'client_storage_contract_hash',
  'retired_tuple_hash',
  'retired_at',
  'local_root_absent_at',
];

const resultingRetiredRows = plannedItemSpecs.map((spec) => ({
  item_id: spec.item_id,
  fields: [
    value.text(spec.item_id),
    value.text('backup_scrubbed_restricted_root'),
    value.null(),
    value.text(attestationId),
    value.null(),
    value.null(),
    value.int(spec.earliest_cleanup_start_by),
    value.int(spec.earliest_source_delete_by),
    value.int(spec.retention_cleanup_budget_ms),
    value.digest(spec.retention_budget_profile_hash),
    value.digest(spec.obligation_set_hash),
    value.int(spec.obligation_count),
    value.digest(spec.client_storage_contract_hash),
    value.digest(spec.retired_tuple_hash),
    value.int(spec.retired_at),
    value.int(tDelete),
  ],
}));

const copyOutboxFieldOrder = [
  'item_id',
  'root_purge_application_id',
  'backup_scrub_application_id',
  'retired_item_id',
  'retired_tuple_hash',
  'state',
  'ledger_sequence',
  'ledger_entry_hash',
  'created_at',
  'mirrored_at',
];

const copyOutboxRows = plannedItemSpecs.map((spec) => {
  const ledger = ledgerByItem[spec.item_id];
  return {
    item_id: spec.item_id,
    fields: [
      value.text(spec.item_id),
      value.null(),
      value.text(attestationId),
      value.text(spec.item_id),
      value.digest(spec.retired_tuple_hash),
      value.text('mirrored'),
      value.int(ledger.fields.sequence),
      value.digest(ledger.entry_hash),
      value.int(tFinalize),
      value.int(tFinalize),
    ],
  };
});

const aggregateHashes = {
  ...planAggregateHashes,
  resulting_retired_id_set_hash: setDigest(
    'brain-sensitive-backup-resulting-retired-id-set-v1',
    resultingRetiredRows.map((row) => row.fields),
  ),
};

const aggregateVectors = {
  removed_item_set: aggregateVector(
    'brain-sensitive-backup-removed-item-set-v1',
    removedItemFieldOrder,
    [{ field: 'item_id', mode: 'raw_utf8_lexicographic' }],
    removedItemRows,
  ),
  removed_obligation_set: aggregateVector(
    'brain-sensitive-backup-removed-obligation-set-v1',
    removedObligationFieldOrder,
    [
      { field: 'item_id', mode: 'raw_utf8_lexicographic' },
      { field: 'obligation_id', mode: 'raw_utf8_lexicographic' },
    ],
    removedObligationRows,
  ),
  survivor_action_set: aggregateVector(
    'brain-sensitive-backup-survivor-action-set-v1',
    survivorActionFieldOrder,
    [
      { field: 'item_id', mode: 'raw_utf8_lexicographic' },
      { field: 'ordinal', mode: 'signed_int64_numeric' },
    ],
    survivorActionRows,
  ),
  resulting_retired_id_set: aggregateVector(
    'brain-sensitive-backup-resulting-retired-id-set-v1',
    resultingRetiredFieldOrder,
    [{ field: 'item_id', mode: 'raw_utf8_lexicographic' }],
    resultingRetiredRows,
  ),
};

const emptyAggregateVectors = {
  removed_item_set: emptyAggregateVector(
    'brain-sensitive-backup-removed-item-set-v1',
  ),
  removed_obligation_set: emptyAggregateVector(
    'brain-sensitive-backup-removed-obligation-set-v1',
  ),
  survivor_action_set: emptyAggregateVector(
    'brain-sensitive-backup-survivor-action-set-v1',
  ),
  resulting_retired_id_set: emptyAggregateVector(
    'brain-sensitive-backup-resulting-retired-id-set-v1',
  ),
};

const zeroScanVector = (phase, domain, surfaces) => {
  const inputs = [
    value.int(surfaces.length),
    ...surfaces.flatMap((surface) => [
      value.text(surface.surface_token),
      value.int(surface.scanned_row_count),
      value.int(surface.scanned_byte_count),
      value.int(surface.surface_violation_count),
    ]),
    value.int(0n),
  ];
  const payload = framed(inputs);
  const preimage = typedPreimage(domain, inputs);
  return {
    phase,
    domain,
    surfaces: surfaces.map((surface) => ({
      ...surface,
      scanned_row_count: surface.scanned_row_count.toString(),
      scanned_byte_count: surface.scanned_byte_count.toString(),
      surface_violation_count: surface.surface_violation_count.toString(),
    })),
    total_violation_count: '0',
    payload_hex: hex(payload),
    preimage_hex: hex(preimage),
    sha256: hex(sha256(preimage)),
  };
};

const scrubStageZeroScan = zeroScanVector(
  'scrub_stage',
  'brain-sensitive-backup-scrub-stage-zero-scan-v1',
  [
    {
      surface_token: 'main_pages',
      scanned_row_count: 100n,
      scanned_byte_count: 40960n,
      surface_violation_count: 0n,
    },
    {
      surface_token: 'wal',
      scanned_row_count: 0n,
      scanned_byte_count: 0n,
      surface_violation_count: 0n,
    },
  ],
);

const preFinalizationZeroScan = zeroScanVector(
  'pre_finalization',
  'brain-sensitive-backup-pre-finalization-zero-scan-v1',
  [
    {
      surface_token: 'main_pages',
      scanned_row_count: 100n,
      scanned_byte_count: 40960n,
      surface_violation_count: 0n,
    },
    {
      surface_token: 'wal',
      scanned_row_count: 0n,
      scanned_byte_count: 0n,
      surface_violation_count: 0n,
    },
  ],
);

const postFinalizationZeroScan = zeroScanVector(
  'post_finalization',
  'brain-sensitive-backup-post-finalization-zero-scan-v1',
  [
    {
      surface_token: 'main_pages',
      scanned_row_count: 108n,
      scanned_byte_count: 45056n,
      surface_violation_count: 0n,
    },
    {
      surface_token: 'wal',
      scanned_row_count: 0n,
      scanned_byte_count: 0n,
      surface_violation_count: 0n,
    },
  ],
);

const zeroScanByPhase = {
  scrub_stage: scrubStageZeroScan,
  pre_finalization: preFinalizationZeroScan,
  post_finalization: postFinalizationZeroScan,
};
const zeroScanSurfacesAsInputs = (vector) =>
  vector.surfaces.map((surface) => ({
    surface_token: surface.surface_token,
    scanned_row_count: BigInt(surface.scanned_row_count),
    scanned_byte_count: BigInt(surface.scanned_byte_count),
    surface_violation_count: BigInt(surface.surface_violation_count),
  }));
const zeroScanSurfaceOrderVectors = Object.fromEntries(
  Object.entries(zeroScanByPhase).map(([phase, vector]) => {
    const reordered = zeroScanVector(
      phase,
      vector.domain,
      [...zeroScanSurfacesAsInputs(vector)].reverse(),
    );
    return [
      phase,
      {
        supplied_phase: phase,
        supplied_domain: reordered.domain,
        supplied_payload_hex: reordered.payload_hex,
        supplied_preimage_hex: reordered.preimage_hex,
        supplied_hash: reordered.sha256,
        required_surface_order: vector.surfaces.map(
          (surface) => surface.surface_token,
        ),
        supplied_surface_order: reordered.surfaces.map(
          (surface) => surface.surface_token,
        ),
        expected: 'reject_surface_order',
      },
    ];
  }),
);
const zeroScanPhasePairs = [
  ['scrub_stage', 'pre_finalization'],
  ['scrub_stage', 'post_finalization'],
  ['pre_finalization', 'scrub_stage'],
  ['pre_finalization', 'post_finalization'],
  ['post_finalization', 'scrub_stage'],
  ['post_finalization', 'pre_finalization'],
];
const zeroScanPhaseSubstitutionVectors = Object.fromEntries(
  zeroScanPhasePairs.map(([suppliedPhase, requiredPhase]) => {
    const supplied = zeroScanByPhase[suppliedPhase];
    const required = zeroScanByPhase[requiredPhase];
    return [
      `${suppliedPhase}_as_${requiredPhase}`,
      {
        supplied_phase: suppliedPhase,
        supplied_domain: supplied.domain,
        supplied_payload_hex: supplied.payload_hex,
        supplied_preimage_hex: supplied.preimage_hex,
        supplied_hash: supplied.sha256,
        required_phase: requiredPhase,
        required_domain: required.domain,
        required_payload_hex: required.payload_hex,
        required_preimage_hex: required.preimage_hex,
        required_hash: required.sha256,
        supplied_phase_matches_required_phase: false,
        supplied_domain_matches_required_domain: false,
        supplied_hash_matches_required_hash: false,
        expected: 'reject_zero_scan_phase',
      },
    ];
  }),
);

const preFinalizationDatabaseHash = digestHex(0xe2);
const preFinalizationInputs = [
  value.text(attestationId),
  value.digest(scrubPlanHash),
  value.digest(preFinalizationDatabaseHash),
  value.int(40960n),
  value.int(4096n),
  value.int(10n),
  value.int(0n),
  value.text('ok'),
  value.text('ok'),
  value.int(0n),
  value.digest(preFinalizationZeroScan.sha256),
  value.int(0n),
  value.int(2n),
  value.digest(ledgerRecordTwo.entry_hash),
];
const preFinalizationPreimage = typedPreimage(
  'brain-sensitive-backup-pre-finalization-checks-v1',
  preFinalizationInputs,
);
const preFinalizationHash = hex(sha256(preFinalizationPreimage));

const wrongLedgerKey = Buffer.alloc(32, 0xff);
const recordTwoBytes = Buffer.from(ledgerRecordTwo.record_hex, 'hex');
const truncatedRecordBytes = recordTwoBytes.subarray(0, recordTwoBytes.length - 1);
const shortenedLengthRecordBytes = Buffer.from(recordTwoBytes);
shortenedLengthRecordBytes.writeBigUInt64BE(
  shortenedLengthRecordBytes.readBigUInt64BE(0) - 1n,
  0,
);

const tamperedLedgerRecordBase = ledgerRecord({
  ...ledgerFieldsFor(plannedByItem['item-α'], 2n, ledgerRecordOne.entry_hash),
  origin_reason: 'live_retention_purge',
});
const tamperedLedgerRecord = recordFromParts(
  tamperedLedgerRecordBase.payload_hex,
  tamperedLedgerRecordBase.entry_hash,
  ledgerRecordTwo.entry_hmac_sha256,
);
const wrongKeyLedgerRecord = ledgerRecord(
  ledgerFieldsFor(plannedByItem['item-α'], 2n, ledgerRecordOne.entry_hash),
  wrongLedgerKey,
);
const substitutedHmacRecord = recordFromParts(
  ledgerRecordTwo.payload_hex,
  ledgerRecordTwo.entry_hash,
  ledgerRecordOne.entry_hmac_sha256,
);
const substitutedEntryHashHmac = entryHmacForParts(
  ledgerRecordTwo.payload_hex,
  ledgerRecordOne.entry_hash,
);
const substitutedEntryHashRecord = recordFromParts(
  ledgerRecordTwo.payload_hex,
  ledgerRecordOne.entry_hash,
  substitutedEntryHashHmac,
);
const validForkRecord = ledgerRecord(
  ledgerFieldsFor(plannedByItem['item-α'], 2n, hex(genesisHash)),
);
const validProjectionSubstitutionRecord = tamperedLedgerRecordBase;
const dualEntryHashHmacRecord = recordFromParts(
  ledgerRecordTwo.payload_hex,
  ledgerRecordOne.entry_hash,
  ledgerRecordOne.entry_hmac_sha256,
);
const noncontiguousLedgerRecord = ledgerRecord(
  ledgerFieldsFor(
    plannedByItem['item-α'],
    3n,
    ledgerRecordOne.entry_hash,
  ),
);
const noncontiguousBadHmacRecord = recordFromParts(
  noncontiguousLedgerRecord.payload_hex,
  noncontiguousLedgerRecord.entry_hash,
  ledgerRecordOne.entry_hmac_sha256,
);
const noncontiguousForkRecord = ledgerRecord(
  ledgerFieldsFor(plannedByItem['item-α'], 3n, hex(genesisHash)),
);
const forkProjectionSubstitutionRecord = ledgerRecord({
  ...ledgerFieldsFor(plannedByItem['item-α'], 2n, hex(genesisHash)),
  origin_reason: 'live_retention_purge',
});
const ledgerVerificationContext = {
  verification_key_hex: hex(ledgerKey),
  expected_sequence: ledgerRecordTwo.fields.sequence,
  expected_previous_entry_hash: ledgerRecordOne.entry_hash,
  expected_decoded_fields: ledgerRecordTwo.fields,
};
const ledgerPrecedenceDualFaultVectors = {
  framing_or_length_before_record_sha256: {
    precedence_edge: {
      earlier_stage: 'framing_or_length',
      later_stage: 'record_sha256',
    },
    ...ledgerVerificationContext,
    record_hex: hex(truncatedRecordBytes),
    supplied_record_sha256: ledgerRecordOne.record_sha256,
    recomputed_record_sha256: hex(sha256(truncatedRecordBytes)),
    faults: {
      framing_or_length: {
        declared_body_length: recordTwoBytes
          .readBigUInt64BE(0)
          .toString(),
        actual_body_length: (truncatedRecordBytes.length - 8).toString(),
        lengths_match: false,
      },
      record_sha256: {
        supplied: ledgerRecordOne.record_sha256,
        recomputed: hex(sha256(truncatedRecordBytes)),
        hashes_match: false,
      },
    },
    expected_precedence_stage: 'framing_or_length',
    expected: 'reject_record_truncated',
  },
  record_sha256_before_entry_hash: {
    precedence_edge: {
      earlier_stage: 'record_sha256',
      later_stage: 'entry_hash',
    },
    ...ledgerVerificationContext,
    record_hex: substitutedEntryHashRecord.record_hex,
    supplied_record_sha256: ledgerRecordTwo.record_sha256,
    recomputed_record_sha256: substitutedEntryHashRecord.record_sha256,
    faults: {
      record_sha256: {
        supplied: ledgerRecordTwo.record_sha256,
        recomputed: substitutedEntryHashRecord.record_sha256,
        hashes_match: false,
      },
      entry_hash: {
        embedded: ledgerRecordOne.entry_hash,
        recomputed: ledgerRecordTwo.entry_hash,
        hashes_match: false,
      },
    },
    expected_precedence_stage: 'record_sha256',
    expected: 'reject_record_sha256',
  },
  entry_hash_before_entry_hmac_sha256: {
    precedence_edge: {
      earlier_stage: 'entry_hash',
      later_stage: 'entry_hmac_sha256',
    },
    ...ledgerVerificationContext,
    record_hex: dualEntryHashHmacRecord.record_hex,
    supplied_record_sha256: dualEntryHashHmacRecord.record_sha256,
    recomputed_record_sha256: dualEntryHashHmacRecord.record_sha256,
    faults: {
      entry_hash: {
        embedded: ledgerRecordOne.entry_hash,
        recomputed: ledgerRecordTwo.entry_hash,
        hashes_match: false,
      },
      entry_hmac_sha256: {
        embedded: ledgerRecordOne.entry_hmac_sha256,
        recomputed: substitutedEntryHashHmac,
        hashes_match: false,
      },
    },
    expected_precedence_stage: 'entry_hash',
    expected: 'reject_entry_hash',
  },
  entry_hmac_sha256_before_sequence_contiguity: {
    precedence_edge: {
      earlier_stage: 'entry_hmac_sha256',
      later_stage: 'sequence_contiguity',
    },
    ...ledgerVerificationContext,
    record_hex: noncontiguousBadHmacRecord.record_hex,
    supplied_record_sha256: noncontiguousBadHmacRecord.record_sha256,
    recomputed_record_sha256: noncontiguousBadHmacRecord.record_sha256,
    faults: {
      entry_hmac_sha256: {
        embedded: ledgerRecordOne.entry_hmac_sha256,
        recomputed: noncontiguousLedgerRecord.entry_hmac_sha256,
        hashes_match: false,
      },
      sequence_contiguity: {
        decoded: noncontiguousLedgerRecord.fields.sequence,
        expected: ledgerRecordTwo.fields.sequence,
        sequences_match: false,
      },
    },
    expected_precedence_stage: 'entry_hmac_sha256',
    expected: 'reject_entry_hmac',
  },
  sequence_contiguity_before_previous_entry_hash: {
    precedence_edge: {
      earlier_stage: 'sequence_contiguity',
      later_stage: 'previous_entry_hash',
    },
    ...ledgerVerificationContext,
    record_hex: noncontiguousForkRecord.record_hex,
    supplied_record_sha256: noncontiguousForkRecord.record_sha256,
    recomputed_record_sha256: noncontiguousForkRecord.record_sha256,
    faults: {
      sequence_contiguity: {
        decoded: noncontiguousForkRecord.fields.sequence,
        expected: ledgerRecordTwo.fields.sequence,
        sequences_match: false,
      },
      previous_entry_hash: {
        decoded: noncontiguousForkRecord.fields.previous_entry_hash,
        expected: ledgerRecordOne.entry_hash,
        hashes_match: false,
      },
    },
    expected_precedence_stage: 'sequence_contiguity',
    expected: 'reject_sequence_contiguity',
  },
  previous_entry_hash_before_decoded_projection: {
    precedence_edge: {
      earlier_stage: 'previous_entry_hash',
      later_stage: 'decoded_field_or_projection_equality',
    },
    ...ledgerVerificationContext,
    record_hex: forkProjectionSubstitutionRecord.record_hex,
    supplied_record_sha256:
      forkProjectionSubstitutionRecord.record_sha256,
    recomputed_record_sha256:
      forkProjectionSubstitutionRecord.record_sha256,
    faults: {
      previous_entry_hash: {
        decoded:
          forkProjectionSubstitutionRecord.fields.previous_entry_hash,
        expected: ledgerRecordOne.entry_hash,
        hashes_match: false,
      },
      decoded_field_or_projection_equality: {
        field: 'origin_reason',
        decoded: forkProjectionSubstitutionRecord.fields.origin_reason,
        expected: ledgerRecordTwo.fields.origin_reason,
        fields_match: false,
      },
    },
    expected_precedence_stage: 'previous_entry_hash',
    expected: 'reject_previous_entry_hash',
  },
};

const ledgerNegativeVectors = {
  truncated_record: {
    mutation: 'record two truncated by one byte with original length prefix',
    record_hex: hex(truncatedRecordBytes),
    supplied_record_sha256: hex(sha256(truncatedRecordBytes)),
    expected: 'reject_record_truncated',
  },
  length_prefix_minus_one: {
    mutation: 'record two length prefix minus one with all bytes retained',
    record_hex: hex(shortenedLengthRecordBytes),
    supplied_record_sha256: hex(sha256(shortenedLengthRecordBytes)),
    expected: 'reject_record_length',
  },
  field_changed_original_hmac: {
    mutation:
      'record two origin_reason changed; entry hash and record SHA recomputed; original HMAC retained',
    record_hex: tamperedLedgerRecord.record_hex,
    supplied_record_sha256: tamperedLedgerRecord.record_sha256,
    expected: 'reject_entry_hmac',
  },
  wrong_signing_key: {
    mutation: 'record two recomputed with wrong 32-byte signing key',
    wrong_key_hex: hex(wrongLedgerKey),
    record_hex: wrongKeyLedgerRecord.record_hex,
    supplied_record_sha256: wrongKeyLedgerRecord.record_sha256,
    expected: 'reject_entry_hmac',
  },
  hmac_substitution: {
    mutation: 'record two HMAC replaced by record one HMAC; record SHA recomputed',
    record_hex: substitutedHmacRecord.record_hex,
    supplied_record_sha256: substitutedHmacRecord.record_sha256,
    expected: 'reject_entry_hmac',
  },
  entry_hash_substitution: {
    mutation:
      'record two entry hash replaced by record one entry hash; HMAC and record SHA recomputed',
    record_hex: substitutedEntryHashRecord.record_hex,
    supplied_record_sha256: substitutedEntryHashRecord.record_sha256,
    expected: 'reject_entry_hash',
  },
  record_sha_substitution: {
    mutation: 'record two bytes supplied with record one record SHA',
    record_hex: ledgerRecordTwo.record_hex,
    supplied_record_sha256: ledgerRecordOne.record_sha256,
    expected: 'reject_record_sha256',
  },
  valid_fork: {
    mutation:
      'cryptographically valid alternate sequence-two record whose previous hash is genesis',
    record_hex: validForkRecord.record_hex,
    supplied_record_sha256: validForkRecord.record_sha256,
    expected: 'reject_previous_entry_hash',
  },
  valid_projection_substitution: {
    mutation:
      'cryptographically valid contiguous sequence-two record whose decoded origin_reason differs from the expected backup projection',
    record_hex: validProjectionSubstitutionRecord.record_hex,
    supplied_record_sha256:
      validProjectionSubstitutionRecord.record_sha256,
    expected: 'reject_decoded_projection',
  },
  reversed_record_order: {
    mutation: 'complete valid records supplied sequence two then sequence one',
    ordered_record_hex: [ledgerRecordTwo.record_hex, ledgerRecordOne.record_hex],
    supplied_record_sha256: [
      ledgerRecordTwo.record_sha256,
      ledgerRecordOne.record_sha256,
    ],
    expected: 'reject_sequence_contiguity',
  },
};

const clockProof = (proof) => {
  const inputs = [
    value.text(proof.proof_kind),
    value.int(proof.reanchor_counter),
    value.digest(proof.boot_id_hash),
    value.int(proof.monotonic_anchor_ms),
    value.int(proof.raw_wall_observed_ms),
    value.int(proof.reference_lower_ms),
    value.int(proof.reference_upper_ms),
    value.int(proof.proof_max_error_ms),
    value.digest(proof.provider_set_hash),
    nullableDigest(proof.operator_artifact_hash),
    value.int(proof.proof_at),
  ];
  return {
    fields: Object.fromEntries(
      Object.entries(proof).map(([key, fieldValue]) => [
        key,
        typeof fieldValue === 'bigint' ? fieldValue.toString() : fieldValue,
      ]),
    ),
    preimage_hex: hex(typedPreimage('trusted-time-proof-v1', inputs)),
    trusted_reference_proof_hash: hex(
      typedDigest('trusted-time-proof-v1', inputs),
    ),
  };
};

const clockProofVectors = [
  clockProof({
    proof_kind: 'automatic_same_boot',
    reanchor_counter: 0n,
    boot_id_hash: digestHex(0xf1),
    monotonic_anchor_ms: 123456n,
    raw_wall_observed_ms: 2000000n,
    reference_lower_ms: 1999000n,
    reference_upper_ms: 2001000n,
    proof_max_error_ms: 1000n,
    provider_set_hash: digestHex(0xf2),
    operator_artifact_hash: null,
    proof_at: 2000000n,
  }),
  clockProof({
    proof_kind: 'operator_reanchor_v1',
    reanchor_counter: 1n,
    boot_id_hash: digestHex(0xf3),
    monotonic_anchor_ms: 654321n,
    raw_wall_observed_ms: 3000000n,
    reference_lower_ms: 2999500n,
    reference_upper_ms: 3000500n,
    proof_max_error_ms: 500n,
    provider_set_hash: digestHex(0xf4),
    operator_artifact_hash: digestHex(0xf5),
    proof_at: 3000000n,
  }),
];

const obligationSetVectors = Object.fromEntries(
  removedObligationRows.map((row) => {
    const inputs = [value.int(1n), ...row.fields];
    const preimage = typedPreimage('youtube-retention-obligation-set-v1', inputs);
    return [
      row.item_id,
      {
        domain: 'youtube-retention-obligation-set-v1',
        ordered_fields: removedObligationFieldOrder,
        row_count: '1',
        row: row.fields.map(fixtureValue),
        preimage_hex: hex(preimage),
        sha256: hex(sha256(preimage)),
      },
    ];
  }),
);

const detachedValues = {
  attestation_id: attestationId,
  scrub_plan_hash: scrubPlanHash,
  input_database_sha256: scrubApplicationValues.input_database_sha256,
  scrub_contract: scrubApplicationValues.scrub_contract,
  backup_key_id_hash: scrubApplicationValues.backup_key_id_hash,
  backup_key_provisioning_kind:
    scrubApplicationValues.backup_key_provisioning_kind,
  backup_key_provisioning_receipt_sha256:
    scrubApplicationValues.backup_key_provisioning_receipt_sha256,
  migration_ledger_hash: scrubApplicationValues.migration_ledger_hash,
  schema_descriptor_hash: scrubApplicationValues.schema_descriptor_hash,
  guard_descriptor_hash: scrubApplicationValues.guard_descriptor_hash,
  scrubber_tool_hash: scrubApplicationValues.scrubber_tool_hash,
  sqlite_runtime_hash: scrubApplicationValues.sqlite_runtime_hash,
  sqlite_vec_runtime_hash: scrubApplicationValues.sqlite_vec_runtime_hash,
  scalar_registry_hash: scrubApplicationValues.scalar_registry_hash,
  retention_capability_hash: scrubApplicationValues.retention_capability_hash,
  removed_item_set_hash: aggregateHashes.removed_item_set_hash,
  removed_item_count: 2,
  removed_obligation_set_hash: aggregateHashes.removed_obligation_set_hash,
  removed_obligation_count: 2,
  resulting_retired_id_set_hash: aggregateHashes.resulting_retired_id_set_hash,
  resulting_retired_id_count: 2,
  survivor_action_set_hash: aggregateHashes.survivor_action_set_hash,
  survivor_action_count: 2,
  retired_ledger_base_sequence: 0,
  retired_ledger_base_hash: hex(genesisHash),
  retired_ledger_head_sequence: 2,
  retired_ledger_head_hash: ledgerRecordTwo.entry_hash,
  effective_clock_ms: Number(tPlan),
  max_observed_wall_ms: Number(tPlan),
  application_created_at: Number(tPlan),
  pre_finalization_database_sha256: preFinalizationDatabaseHash,
  pre_finalization_database_size_bytes: 40960,
  pre_finalization_page_size: 4096,
  pre_finalization_page_count: 10,
  pre_finalization_freelist_count: 0,
  pre_finalization_integrity_check_token: 'ok',
  pre_finalization_quick_check_token: 'ok',
  pre_finalization_foreign_key_violation_count: 0,
  pre_finalization_zero_scan_hash: preFinalizationZeroScan.sha256,
  pre_finalization_zero_scan_violation_count: 0,
  pre_finalization_retired_ledger_head_sequence: 2,
  pre_finalization_retired_ledger_head_hash: ledgerRecordTwo.entry_hash,
  pre_finalization_check_evidence_sha256: preFinalizationHash,
  completed_at: Number(tFinalize),
  database_sha256: digestHex(0x0b),
  database_size_bytes: 45056,
  final_page_size: 4096,
  final_page_count: 11,
  final_freelist_count: 0,
  final_integrity_check_token: 'ok',
  final_quick_check_token: 'ok',
  final_foreign_key_violation_count: 0,
  post_finalization_zero_scan_hash: postFinalizationZeroScan.sha256,
  post_finalization_zero_scan_violation_count: 0,
  wal_sidecar_state: 'absent',
  shm_sidecar_state: 'absent',
  rollback_journal_state: 'absent',
  temp_surface_state: 'absent',
};
const canonicalWithoutHmac = JSON.stringify(detachedValues);
const detachedHmac = hex(
  hmacSha256(
    detachedKey,
    Buffer.concat([
      utf8('brain-sensitive-backup-attestation-v2'),
      Buffer.from([0x00]),
      utf8(canonicalWithoutHmac),
    ]),
  ),
);
const finalDetachedBytes = Buffer.concat([
  utf8(canonicalWithoutHmac.slice(0, -1)),
  utf8(`,"hmac_sha256":"${detachedHmac}"}\n`),
]);

const detachedFileFromEntries = (entries) => {
  const values = Object.fromEntries(entries);
  const canonical = JSON.stringify(values);
  const hmac = hex(
    hmacSha256(
      detachedKey,
      Buffer.concat([
        utf8('brain-sensitive-backup-attestation-v2'),
        Buffer.from([0x00]),
        utf8(canonical),
      ]),
    ),
  );
  const finalBytes = Buffer.concat([
    utf8(canonical.slice(0, -1)),
    utf8(`,"hmac_sha256":"${hmac}"}\n`),
  ]);
  return {
    ordered_keys_without_hmac: Object.keys(values),
    canonical_utf8_without_hmac_hex: hex(utf8(canonical)),
    hmac_sha256: hmac,
    final_file_hex: hex(finalBytes),
  };
};
const detachedFileWithOverrides = (overrides) =>
  detachedFileFromEntries(
    Object.entries({
      ...detachedValues,
      ...overrides,
    }),
  );
const detachedEntries = Object.entries(detachedValues);
const detachedReorderedEntries = [...detachedEntries];
[detachedReorderedEntries[0], detachedReorderedEntries[1]] = [
  detachedReorderedEntries[1],
  detachedReorderedEntries[0],
];
const detachedReorderedFile = detachedFileFromEntries(
  detachedReorderedEntries,
);
const detachedProvisioningKindSubstitution = detachedFileWithOverrides({
  backup_key_provisioning_kind: 'prepositioned_dual_copy_v1',
});
const detachedProvisioningReceiptSubstitution = detachedFileWithOverrides({
  backup_key_provisioning_receipt_sha256: digestHex(0xc9),
});
const detachedWhitespaceFile = Buffer.concat([
  finalDetachedBytes.subarray(0, 1),
  utf8(' '),
  finalDetachedBytes.subarray(1),
]);
const detachedBomFile = Buffer.concat([
  Buffer.from([0xef, 0xbb, 0xbf]),
  finalDetachedBytes,
]);
const detachedMissingNewlineFile = finalDetachedBytes.subarray(
  0,
  finalDetachedBytes.length - 1,
);
const detachedDoubledNewlineFile = Buffer.concat([
  finalDetachedBytes,
  Buffer.from([0x0a]),
]);
const stalePostFinalizationZeroScan = zeroScanVector(
  'post_finalization',
  postFinalizationZeroScan.domain,
  zeroScanSurfacesAsInputs(preFinalizationZeroScan),
);
const changedClosedDatabaseBytes = Buffer.from([0x00]);
const requestedLossyInteger = 9007199254740993n;
const roundedLossyInteger = BigInt(Number(requestedLossyInteger));
const canonicalLossyIntegerFrame = frame(value.int(requestedLossyInteger));
const roundedLossyIntegerFrame = frame(value.int(roundedLossyInteger));
const mutatedRetiredClockFields = {
  ...plannedByItem['item-α'],
  retired_at: plannedByItem['item-α'].retired_at + 1n,
};
const mutatedRetiredClockTupleHash = retiredTupleHash(
  mutatedRetiredClockFields,
);

const negativeVector = ({
  caseId,
  category,
  mutationKind,
  baseline,
  mutation,
  oracleFacts,
  expectedPrecedenceStage,
  expectedOutcome,
}) => ({
  schema_version: 'stage2-negative-vector-v1',
  case_id: caseId,
  category,
  mutation_kind: mutationKind,
  baseline,
  mutation,
  oracle: oracleFacts,
  expected_precedence_stage: expectedPrecedenceStage,
  expected_outcome: expectedOutcome,
});
const ledgerRecordTwoBaseline = {
  record_hex: ledgerRecordTwo.record_hex,
  supplied_record_sha256: ledgerRecordTwo.record_sha256,
  verification_key_hex: hex(ledgerKey),
  expected_sequence: ledgerRecordTwo.fields.sequence,
  expected_previous_entry_hash: ledgerRecordOne.entry_hash,
  expected_decoded_fields: ledgerRecordTwo.fields,
};

const negativeVectors = [
  negativeVector({
    caseId: 'framing_unknown_marker',
    category: 'typed_framing',
    mutationKind: 'byte_substitution',
    baseline: {
      frame_hex: frameVectors.text_a,
      marker_hex: '01',
      allowed_marker_hex: Object.values({
        null: '00',
        text: '01',
        bytes_or_digest: '02',
        signed_int64: '03',
        boolean: '04',
      }),
    },
    mutation: {
      frame_hex: `05${frameVectors.text_a.slice(2)}`,
      marker_hex: '05',
    },
    oracleFacts: {
      marker_is_registered: false,
    },
    expectedPrecedenceStage: 'framing_or_length',
    expectedOutcome: 'reject_frame_marker',
  }),
  negativeVector({
    caseId: 'framing_null_nonzero_length',
    category: 'typed_framing',
    mutationKind: 'length_substitution',
    baseline: {
      frame_hex: frameVectors.null,
      marker_hex: '00',
      declared_length: '0',
    },
    mutation: {
      frame_hex: '00000000000000000100',
      marker_hex: '00',
      declared_length: '1',
      payload_hex: '00',
    },
    oracleFacts: {
      required_null_length: '0',
      supplied_null_length: '1',
      lengths_match: false,
    },
    expectedPrecedenceStage: 'framing_or_length',
    expectedOutcome: 'reject_null_length',
  }),
  negativeVector({
    caseId: 'framing_lossy_javascript_integer',
    category: 'typed_framing',
    mutationKind: 'numeric_transport_substitution',
    baseline: {
      requested_decimal: requestedLossyInteger.toString(),
      canonical_frame_hex: hex(canonicalLossyIntegerFrame),
    },
    mutation: {
      transport: 'javascript_number',
      materialized_decimal: roundedLossyInteger.toString(),
      supplied_frame_hex: hex(roundedLossyIntegerFrame),
    },
    oracleFacts: {
      requested_decimal: requestedLossyInteger.toString(),
      materialized_decimal: roundedLossyInteger.toString(),
      decimals_match:
        requestedLossyInteger.toString() === roundedLossyInteger.toString(),
      frames_match:
        hex(canonicalLossyIntegerFrame) === hex(roundedLossyIntegerFrame),
    },
    expectedPrecedenceStage: 'typed_integer_transport',
    expectedOutcome: 'reject_lossy_integer',
  }),
  negativeVector({
    caseId: 'ledger_truncated_record',
    category: 'ledger_integrity',
    mutationKind: 'record_truncation',
    baseline: ledgerRecordTwoBaseline,
    mutation: ledgerNegativeVectors.truncated_record,
    oracleFacts: {
      declared_body_length: recordTwoBytes
        .readBigUInt64BE(0)
        .toString(),
      actual_body_length: (truncatedRecordBytes.length - 8).toString(),
      lengths_match: false,
    },
    expectedPrecedenceStage: 'framing_or_length',
    expectedOutcome: 'reject_record_truncated',
  }),
  negativeVector({
    caseId: 'ledger_length_prefix_minus_one',
    category: 'ledger_integrity',
    mutationKind: 'length_prefix_substitution',
    baseline: ledgerRecordTwoBaseline,
    mutation: ledgerNegativeVectors.length_prefix_minus_one,
    oracleFacts: {
      declared_body_length: shortenedLengthRecordBytes
        .readBigUInt64BE(0)
        .toString(),
      actual_body_length: (shortenedLengthRecordBytes.length - 8).toString(),
      lengths_match: false,
    },
    expectedPrecedenceStage: 'framing_or_length',
    expectedOutcome: 'reject_record_length',
  }),
  negativeVector({
    caseId: 'ledger_field_changed_original_hmac',
    category: 'ledger_integrity',
    mutationKind: 'decoded_field_substitution',
    baseline: ledgerRecordTwoBaseline,
    mutation: ledgerNegativeVectors.field_changed_original_hmac,
    oracleFacts: {
      field: 'origin_reason',
      baseline_value: ledgerRecordTwo.fields.origin_reason,
      mutated_value: tamperedLedgerRecordBase.fields.origin_reason,
      embedded_entry_hash: tamperedLedgerRecordBase.entry_hash,
      recomputed_entry_hash: tamperedLedgerRecordBase.entry_hash,
      embedded_hmac_sha256: ledgerRecordTwo.entry_hmac_sha256,
      recomputed_hmac_sha256:
        tamperedLedgerRecordBase.entry_hmac_sha256,
      hmacs_match:
        ledgerRecordTwo.entry_hmac_sha256 ===
        tamperedLedgerRecordBase.entry_hmac_sha256,
    },
    expectedPrecedenceStage: 'entry_hmac_sha256',
    expectedOutcome: 'reject_entry_hmac',
  }),
  negativeVector({
    caseId: 'ledger_wrong_signing_key',
    category: 'ledger_integrity',
    mutationKind: 'signing_key_substitution',
    baseline: ledgerRecordTwoBaseline,
    mutation: ledgerNegativeVectors.wrong_signing_key,
    oracleFacts: {
      required_key_hex: hex(ledgerKey),
      supplied_key_hex: hex(wrongLedgerKey),
      embedded_hmac_sha256: wrongKeyLedgerRecord.entry_hmac_sha256,
      required_hmac_sha256: ledgerRecordTwo.entry_hmac_sha256,
      hmacs_match:
        wrongKeyLedgerRecord.entry_hmac_sha256 ===
        ledgerRecordTwo.entry_hmac_sha256,
    },
    expectedPrecedenceStage: 'entry_hmac_sha256',
    expectedOutcome: 'reject_entry_hmac',
  }),
  negativeVector({
    caseId: 'ledger_hmac_substitution',
    category: 'ledger_integrity',
    mutationKind: 'hmac_substitution',
    baseline: ledgerRecordTwoBaseline,
    mutation: ledgerNegativeVectors.hmac_substitution,
    oracleFacts: {
      embedded_hmac_sha256: ledgerRecordOne.entry_hmac_sha256,
      recomputed_hmac_sha256: ledgerRecordTwo.entry_hmac_sha256,
      hmacs_match:
        ledgerRecordOne.entry_hmac_sha256 ===
        ledgerRecordTwo.entry_hmac_sha256,
    },
    expectedPrecedenceStage: 'entry_hmac_sha256',
    expectedOutcome: 'reject_entry_hmac',
  }),
  negativeVector({
    caseId: 'ledger_entry_hash_substitution',
    category: 'ledger_integrity',
    mutationKind: 'entry_hash_substitution',
    baseline: ledgerRecordTwoBaseline,
    mutation: ledgerNegativeVectors.entry_hash_substitution,
    oracleFacts: {
      embedded_entry_hash: ledgerRecordOne.entry_hash,
      recomputed_entry_hash: ledgerRecordTwo.entry_hash,
      entry_hashes_match:
        ledgerRecordOne.entry_hash === ledgerRecordTwo.entry_hash,
      embedded_hmac_sha256: substitutedEntryHashHmac,
      recomputed_hmac_sha256: substitutedEntryHashHmac,
      hmacs_match: true,
    },
    expectedPrecedenceStage: 'entry_hash',
    expectedOutcome: 'reject_entry_hash',
  }),
  negativeVector({
    caseId: 'ledger_record_sha_substitution',
    category: 'ledger_integrity',
    mutationKind: 'record_sha256_substitution',
    baseline: ledgerRecordTwoBaseline,
    mutation: ledgerNegativeVectors.record_sha_substitution,
    oracleFacts: {
      supplied_record_sha256: ledgerRecordOne.record_sha256,
      recomputed_record_sha256: ledgerRecordTwo.record_sha256,
      hashes_match:
        ledgerRecordOne.record_sha256 === ledgerRecordTwo.record_sha256,
    },
    expectedPrecedenceStage: 'record_sha256',
    expectedOutcome: 'reject_record_sha256',
  }),
  negativeVector({
    caseId: 'ledger_valid_fork',
    category: 'ledger_integrity',
    mutationKind: 'previous_entry_hash_substitution',
    baseline: ledgerRecordTwoBaseline,
    mutation: ledgerNegativeVectors.valid_fork,
    oracleFacts: {
      decoded_previous_entry_hash:
        validForkRecord.fields.previous_entry_hash,
      expected_previous_entry_hash: ledgerRecordOne.entry_hash,
      hashes_match:
        validForkRecord.fields.previous_entry_hash ===
        ledgerRecordOne.entry_hash,
    },
    expectedPrecedenceStage: 'previous_entry_hash',
    expectedOutcome: 'reject_previous_entry_hash',
  }),
  negativeVector({
    caseId: 'ledger_valid_projection_substitution',
    category: 'ledger_integrity',
    mutationKind: 'decoded_projection_substitution',
    baseline: ledgerRecordTwoBaseline,
    mutation: ledgerNegativeVectors.valid_projection_substitution,
    oracleFacts: {
      field: 'origin_reason',
      decoded_value:
        validProjectionSubstitutionRecord.fields.origin_reason,
      expected_value: ledgerRecordTwo.fields.origin_reason,
      fields_match:
        validProjectionSubstitutionRecord.fields.origin_reason ===
        ledgerRecordTwo.fields.origin_reason,
    },
    expectedPrecedenceStage: 'decoded_field_or_projection_equality',
    expectedOutcome: 'reject_decoded_projection',
  }),
  negativeVector({
    caseId: 'ledger_reversed_record_order',
    category: 'ledger_integrity',
    mutationKind: 'record_order_substitution',
    baseline: {
      ordered_record_hex: [
        ledgerRecordOne.record_hex,
        ledgerRecordTwo.record_hex,
      ],
      decoded_sequence_order: ['1', '2'],
    },
    mutation: ledgerNegativeVectors.reversed_record_order,
    oracleFacts: {
      decoded_sequence_order: ['2', '1'],
      expected_sequence_order: ['1', '2'],
      sequences_are_contiguous: false,
    },
    expectedPrecedenceStage: 'sequence_contiguity',
    expectedOutcome: 'reject_sequence_contiguity',
  }),
  ...Object.entries(ledgerPrecedenceDualFaultVectors).map(
    ([edgeId, vector]) =>
      negativeVector({
        caseId: `ledger_precedence_${edgeId}`,
        category: 'ledger_precedence',
        mutationKind: 'adjacent_dual_fault',
        baseline: ledgerRecordTwoBaseline,
        mutation: vector,
        oracleFacts: {
          precedence_edge: vector.precedence_edge,
          faults: vector.faults,
          both_adjacent_faults_present: true,
        },
        expectedPrecedenceStage: vector.expected_precedence_stage,
        expectedOutcome: vector.expected,
      }),
  ),
  negativeVector({
    caseId: 'ledger_cross_connection_replay',
    category: 'transaction_context',
    mutationKind: 'connection_context_substitution',
    baseline: {
      armed_connection_id: 'connection-a',
      armed_operation_id: 'restore-fixture-0001',
      record_hex: ledgerRecordTwo.record_hex,
    },
    mutation: {
      presented_connection_id: 'connection-b',
      presented_operation_id: 'restore-fixture-0001',
      record_hex: ledgerRecordTwo.record_hex,
    },
    oracleFacts: {
      connection_ids_match: false,
      operation_ids_match: true,
    },
    expectedPrecedenceStage: 'connection_context',
    expectedOutcome: 'reject_unarmed_context',
  }),
  negativeVector({
    caseId: 'root_duplicate_primary_key_hash',
    category: 'root_descriptor',
    mutationKind: 'row_duplication',
    baseline: {
      table_token: 'items',
      row_count: 1,
      primary_key_hash:
        rootOne.tables[0].rows[0].primary_key_hash,
      row_preimage_sha256:
        rootOne.tables[0].rows[0].row_preimage_sha256,
    },
    mutation: {
      table_token: 'items',
      row_count: 2,
      ordered_primary_key_hashes: [
        rootOne.tables[0].rows[0].primary_key_hash,
        rootOne.tables[0].rows[0].primary_key_hash,
      ],
    },
    oracleFacts: {
      unique_primary_key_hash_count: 1,
      supplied_row_count: 2,
      duplicate_primary_key_hash:
        rootOne.tables[0].rows[0].primary_key_hash,
    },
    expectedPrecedenceStage: 'root_primary_key_uniqueness',
    expectedOutcome: 'reject_duplicate_primary_key_hash',
  }),
  negativeVector({
    caseId: 'descriptor_fixture_scope_as_production',
    category: 'root_descriptor',
    mutationKind: 'descriptor_scope_substitution',
    baseline: {
      descriptor_id: fixtureDescriptor.descriptor_id,
      purpose: fixtureDescriptor.purpose,
      production_descriptor_complete:
        fixtureDescriptor.production_descriptor_complete,
    },
    mutation: {
      descriptor_id: fixtureDescriptor.descriptor_id,
      asserted_scope: 'production_schema_descriptor',
      asserted_production_descriptor_complete: true,
    },
    oracleFacts: {
      descriptor_declares_production_complete:
        fixtureDescriptor.production_descriptor_complete,
      asserted_scope_matches_descriptor: false,
    },
    expectedPrecedenceStage: 'descriptor_scope',
    expectedOutcome: 'reject_fixture_descriptor_scope',
  }),
  negativeVector({
    caseId: 'scrub_plan_hash_substitution',
    category: 'scrub_plan',
    mutationKind: 'digest_substitution',
    baseline: {
      domain: 'brain-sensitive-backup-scrub-plan-v1',
      preimage_hex: hex(scrubPlanPreimage),
      supplied_sha256: scrubPlanHash,
    },
    mutation: {
      supplied_sha256: digestHex(0xaa),
      unchanged_preimage_hex: hex(scrubPlanPreimage),
    },
    oracleFacts: {
      recomputed_sha256: scrubPlanHash,
      supplied_sha256: digestHex(0xaa),
      hashes_match: false,
    },
    expectedPrecedenceStage: 'scrub_plan_hash',
    expectedOutcome: 'reject_scrub_plan_hash',
  }),
  negativeVector({
    caseId: 'obligation_source_kind_browser_recovery',
    category: 'obligation_shape',
    mutationKind: 'enum_substitution',
    baseline: {
      obligation_id: 'obl-a',
      source_kind: 'browser_visible_transcript',
      allowed_source_kinds: [
        'browser_visible_transcript',
        'lab_public_caption',
      ],
    },
    mutation: {
      obligation_id: 'obl-a',
      source_kind: 'browser_recovery',
    },
    oracleFacts: {
      supplied_source_kind: 'browser_recovery',
      supplied_source_kind_is_allowed: false,
    },
    expectedPrecedenceStage: 'obligation_source_kind',
    expectedOutcome: 'reject_source_kind',
  }),
  negativeVector({
    caseId: 'pending_obligation_artifact_manifest_nonnull',
    category: 'obligation_shape',
    mutationKind: 'pending_artifact_manifest_population',
    baseline: {
      obligation_id: 'obl-a',
      obligation_state: 'pending',
      artifact_manifest_hash: null,
      artifact_manifest_count: null,
    },
    mutation: {
      obligation_id: 'obl-a',
      artifact_manifest_hash: digestHex(0xd2),
      artifact_manifest_count: '1',
    },
    oracleFacts: {
      pending_requires_artifact_manifest_hash: null,
      pending_requires_artifact_manifest_count: null,
      supplied_manifest_is_null: false,
    },
    expectedPrecedenceStage: 'pending_obligation_manifest_shape',
    expectedOutcome: 'reject_pending_manifest_shape',
  }),
  negativeVector({
    caseId: 'pending_obligation_survivor_manifest_nonnull',
    category: 'obligation_shape',
    mutationKind: 'pending_survivor_manifest_population',
    baseline: {
      obligation_id: 'obl-a',
      obligation_state: 'pending',
      survivor_manifest_hash: null,
      survivor_manifest_count: null,
    },
    mutation: {
      obligation_id: 'obl-a',
      survivor_manifest_hash: survivorManifests['item-α'].sha256,
      survivor_manifest_count: '1',
    },
    oracleFacts: {
      pending_requires_survivor_manifest_hash: null,
      pending_requires_survivor_manifest_count: null,
      supplied_manifest_is_null: false,
    },
    expectedPrecedenceStage: 'pending_obligation_manifest_shape',
    expectedOutcome: 'reject_pending_manifest_shape',
  }),
  negativeVector({
    caseId: 'planned_survivor_count_zero_with_action',
    category: 'survivor_manifest',
    mutationKind: 'count_substitution',
    baseline: {
      item_id: 'item-α',
      planned_survivor_manifest_count:
        plannedByItem['item-α'].survivor_manifest_count.toString(),
      emitted_action_count: 1,
      survivor_manifest_hash:
        plannedByItem['item-α'].survivor_manifest_hash,
    },
    mutation: {
      item_id: 'item-α',
      planned_survivor_manifest_count: '0',
      emitted_action_count: 1,
    },
    oracleFacts: {
      declared_count: '0',
      observed_action_count: 1,
      counts_match: false,
    },
    expectedPrecedenceStage: 'survivor_action_count',
    expectedOutcome: 'reject_survivor_action_count',
  }),
  negativeVector({
    caseId: 'scrub_base_ledger_sequence_substitution',
    category: 'scrub_plan',
    mutationKind: 'base_sequence_substitution',
    baseline: {
      retired_ledger_base_sequence:
        scrubApplicationValues.retired_ledger_base_sequence.toString(),
      retired_ledger_base_hash:
        scrubApplicationValues.retired_ledger_base_hash,
    },
    mutation: {
      retired_ledger_base_sequence: '1',
      retired_ledger_base_hash:
        scrubApplicationValues.retired_ledger_base_hash,
    },
    oracleFacts: {
      observed_base_sequence: '0',
      supplied_base_sequence: '1',
      sequences_match: false,
    },
    expectedPrecedenceStage: 'base_ledger_binding',
    expectedOutcome: 'reject_base_or_retired_clock',
  }),
  negativeVector({
    caseId: 'scrub_base_ledger_hash_substitution',
    category: 'scrub_plan',
    mutationKind: 'base_hash_substitution',
    baseline: {
      retired_ledger_base_sequence:
        scrubApplicationValues.retired_ledger_base_sequence.toString(),
      retired_ledger_base_hash:
        scrubApplicationValues.retired_ledger_base_hash,
    },
    mutation: {
      retired_ledger_base_sequence:
        scrubApplicationValues.retired_ledger_base_sequence.toString(),
      retired_ledger_base_hash: digestHex(0xd3),
    },
    oracleFacts: {
      observed_base_hash:
        scrubApplicationValues.retired_ledger_base_hash,
      supplied_base_hash: digestHex(0xd3),
      hashes_match: false,
    },
    expectedPrecedenceStage: 'base_ledger_binding',
    expectedOutcome: 'reject_base_or_retired_clock',
  }),
  negativeVector({
    caseId: 'planned_retired_clock_substitution',
    category: 'scrub_plan',
    mutationKind: 'retired_clock_substitution',
    baseline: {
      item_id: 'item-α',
      retired_at: plannedByItem['item-α'].retired_at.toString(),
      retired_tuple_hash:
        plannedByItem['item-α'].retired_tuple_hash,
    },
    mutation: {
      item_id: 'item-α',
      retired_at: mutatedRetiredClockFields.retired_at.toString(),
      recomputed_retired_tuple_hash: mutatedRetiredClockTupleHash,
    },
    oracleFacts: {
      planned_retired_at:
        plannedByItem['item-α'].retired_at.toString(),
      supplied_retired_at:
        mutatedRetiredClockFields.retired_at.toString(),
      clocks_match: false,
    },
    expectedPrecedenceStage: 'planned_retired_clock',
    expectedOutcome: 'reject_base_or_retired_clock',
  }),
  negativeVector({
    caseId: 'backup_tombstone_ledger_sequence_populated',
    category: 'retired_proof_family',
    mutationKind: 'ledger_sequence_population',
    baseline: {
      item_id: 'item-α',
      backup_scrub_attestation_id: attestationId,
      ledger_sequence: null,
      ledger_entry_hash: null,
    },
    mutation: {
      item_id: 'item-α',
      ledger_sequence: ledgerRecordTwo.fields.sequence,
      ledger_entry_hash: null,
    },
    oracleFacts: {
      active_proof_family: 'backup_scrub_attestation',
      ledger_sequence_must_be_null: true,
      supplied_ledger_sequence_is_null: false,
    },
    expectedPrecedenceStage: 'retired_proof_family',
    expectedOutcome: 'reject_retired_proof_family',
  }),
  negativeVector({
    caseId: 'backup_tombstone_ledger_hash_populated',
    category: 'retired_proof_family',
    mutationKind: 'ledger_hash_population',
    baseline: {
      item_id: 'item-α',
      backup_scrub_attestation_id: attestationId,
      ledger_sequence: null,
      ledger_entry_hash: null,
    },
    mutation: {
      item_id: 'item-α',
      ledger_sequence: null,
      ledger_entry_hash: ledgerRecordTwo.entry_hash,
    },
    oracleFacts: {
      active_proof_family: 'backup_scrub_attestation',
      ledger_entry_hash_must_be_null: true,
      supplied_ledger_entry_hash_is_null: false,
    },
    expectedPrecedenceStage: 'retired_proof_family',
    expectedOutcome: 'reject_retired_proof_family',
  }),
  ...Object.entries(zeroScanSurfaceOrderVectors).map(
    ([phase, vector]) =>
      negativeVector({
        caseId: `zero_scan_${phase}_surface_order_reversed`,
        category: 'zero_scan',
        mutationKind: 'surface_order_substitution',
        baseline: zeroScanByPhase[phase],
        mutation: vector,
        oracleFacts: {
          required_surface_order: vector.required_surface_order,
          supplied_surface_order: vector.supplied_surface_order,
          orders_match: false,
        },
        expectedPrecedenceStage: 'zero_scan_surface_order',
        expectedOutcome: 'reject_surface_order',
      }),
  ),
  ...Object.entries(zeroScanPhaseSubstitutionVectors).map(
    ([direction, vector]) =>
      negativeVector({
        caseId: `zero_scan_phase_${direction}`,
        category: 'zero_scan_phase',
        mutationKind: 'phase_substitution',
        baseline: zeroScanByPhase[vector.required_phase],
        mutation: vector,
        oracleFacts: {
          direction,
          supplied_phase: vector.supplied_phase,
          required_phase: vector.required_phase,
          supplied_phase_matches_required_phase: false,
          supplied_domain_matches_required_domain: false,
          supplied_hash_matches_required_hash: false,
        },
        expectedPrecedenceStage: 'zero_scan_phase',
        expectedOutcome: 'reject_zero_scan_phase',
      }),
  ),
  negativeVector({
    caseId: 'zero_scan_stale_post_measurements',
    category: 'zero_scan',
    mutationKind: 'measurement_replay',
    baseline: {
      pre_finalization: preFinalizationZeroScan,
      post_finalization: postFinalizationZeroScan,
    },
    mutation: {
      supplied_post_finalization: stalePostFinalizationZeroScan,
      replayed_surface_measurements_from_phase: 'pre_finalization',
    },
    oracleFacts: {
      expected_post_hash: postFinalizationZeroScan.sha256,
      supplied_post_hash: stalePostFinalizationZeroScan.sha256,
      hashes_match: false,
      supplied_post_measurements_equal_pre_measurements: true,
    },
    expectedPrecedenceStage: 'zero_scan_measurements',
    expectedOutcome: 'reject_zero_scan_measurements',
  }),
  negativeVector({
    caseId: 'closed_database_changed_after_post_scan',
    category: 'finalization',
    mutationKind: 'closed_file_byte_append',
    baseline: {
      database_sha256: detachedValues.database_sha256,
      database_size_bytes:
        detachedValues.database_size_bytes.toString(),
      post_finalization_zero_scan_hash:
        detachedValues.post_finalization_zero_scan_hash,
    },
    mutation: {
      appended_bytes_hex: hex(changedClosedDatabaseBytes),
      recomputed_changed_bytes_sha256: hex(
        sha256(changedClosedDatabaseBytes),
      ),
      observed_size_delta_bytes: '1',
    },
    oracleFacts: {
      attested_database_sha256: detachedValues.database_sha256,
      changed_bytes_sha256: hex(sha256(changedClosedDatabaseBytes)),
      database_hashes_match: false,
    },
    expectedPrecedenceStage: 'database_sha256',
    expectedOutcome: 'reject_database_sha256',
  }),
  negativeVector({
    caseId: 'planned_item_omitted_from_retired_rows',
    category: 'copy_finalization',
    mutationKind: 'planned_row_omission',
    baseline: {
      planned_item_ids: plannedItemSpecs.map((spec) => spec.item_id),
      resulting_retired_item_ids:
        resultingRetiredRows.map((row) => row.item_id),
    },
    mutation: {
      resulting_retired_item_ids: ['item-z'],
      omitted_item_id: 'item-α',
    },
    oracleFacts: {
      planned_item_count: 2,
      supplied_retired_item_count: 1,
      set_equality: false,
    },
    expectedPrecedenceStage: 'planned_retired_set_equality',
    expectedOutcome: 'reject_planned_retired_mismatch',
  }),
  negativeVector({
    caseId: 'plan_input_verifier_kind_substitution',
    category: 'external_evidence',
    mutationKind: 'verifier_kind_substitution',
    baseline: {
      evidence_phase: 'plan_input',
      verifier_kind: 'backup_plan_input_v1',
      file_identity_sha256: scrubApplicationValues.input_database_sha256,
    },
    mutation: {
      evidence_phase: 'plan_input',
      verifier_kind: 'backup_pre_finalization_v1',
      file_identity_sha256: scrubApplicationValues.input_database_sha256,
    },
    oracleFacts: {
      required_verifier_kind: 'backup_plan_input_v1',
      supplied_verifier_kind: 'backup_pre_finalization_v1',
      kinds_match: false,
    },
    expectedPrecedenceStage: 'external_evidence_context',
    expectedOutcome: 'reject_external_evidence_context',
  }),
  negativeVector({
    caseId: 'plan_input_file_identity_substitution',
    category: 'external_evidence',
    mutationKind: 'file_identity_substitution',
    baseline: {
      evidence_phase: 'plan_input',
      verifier_kind: 'backup_plan_input_v1',
      file_identity_sha256: scrubApplicationValues.input_database_sha256,
    },
    mutation: {
      evidence_phase: 'plan_input',
      verifier_kind: 'backup_plan_input_v1',
      file_identity_sha256: digestHex(0xd4),
    },
    oracleFacts: {
      required_file_identity_sha256:
        scrubApplicationValues.input_database_sha256,
      supplied_file_identity_sha256: digestHex(0xd4),
      identities_match: false,
    },
    expectedPrecedenceStage: 'external_evidence_context',
    expectedOutcome: 'reject_external_evidence_context',
  }),
  negativeVector({
    caseId: 'pre_finalization_verifier_kind_substitution',
    category: 'external_evidence',
    mutationKind: 'verifier_kind_substitution',
    baseline: {
      evidence_phase: 'pre_finalization',
      verifier_kind: 'backup_pre_finalization_v1',
      attestation_id: attestationId,
    },
    mutation: {
      evidence_phase: 'pre_finalization',
      verifier_kind: 'backup_plan_input_v1',
      attestation_id: attestationId,
    },
    oracleFacts: {
      required_verifier_kind: 'backup_pre_finalization_v1',
      supplied_verifier_kind: 'backup_plan_input_v1',
      kinds_match: false,
    },
    expectedPrecedenceStage: 'external_evidence_context',
    expectedOutcome: 'reject_external_evidence_context',
  }),
  negativeVector({
    caseId: 'pre_finalization_phase_substitution',
    category: 'external_evidence',
    mutationKind: 'evidence_phase_substitution',
    baseline: {
      evidence_phase: 'pre_finalization',
      verifier_kind: 'backup_pre_finalization_v1',
      attestation_id: attestationId,
    },
    mutation: {
      evidence_phase: 'plan_input',
      verifier_kind: 'backup_pre_finalization_v1',
      attestation_id: attestationId,
    },
    oracleFacts: {
      required_evidence_phase: 'pre_finalization',
      supplied_evidence_phase: 'plan_input',
      phases_match: false,
    },
    expectedPrecedenceStage: 'external_evidence_context',
    expectedOutcome: 'reject_external_evidence_context',
  }),
  negativeVector({
    caseId: 'attestation_id_uppercase',
    category: 'detached_attestation',
    mutationKind: 'identifier_case_substitution',
    baseline: {
      attestation_id: attestationId,
      required_pattern: '^[0-9a-hjkmnp-tv-z]{26}$',
    },
    mutation: {
      attestation_id: '0000000000000000000000000A',
    },
    oracleFacts: {
      supplied_matches_required_pattern: false,
      supplied_is_lowercase_canonical: false,
    },
    expectedPrecedenceStage: 'attestation_id_shape',
    expectedOutcome: 'reject_attestation_id_shape',
  }),
  negativeVector({
    caseId: 'detached_json_key_order_substitution',
    category: 'detached_attestation',
    mutationKind: 'key_order_substitution',
    baseline: {
      ordered_keys_without_hmac: Object.keys(detachedValues),
      final_file_hex: hex(finalDetachedBytes),
    },
    mutation: {
      ordered_keys_without_hmac:
        detachedReorderedFile.ordered_keys_without_hmac,
      final_file_hex: detachedReorderedFile.final_file_hex,
    },
    oracleFacts: {
      required_first_key: Object.keys(detachedValues)[0],
      supplied_first_key:
        detachedReorderedFile.ordered_keys_without_hmac[0],
      byte_identity: false,
    },
    expectedPrecedenceStage: 'detached_byte_identity',
    expectedOutcome: 'reject_detached_bytes',
  }),
  negativeVector({
    caseId: 'detached_json_whitespace_injection',
    category: 'detached_attestation',
    mutationKind: 'whitespace_injection',
    baseline: {
      final_file_hex: hex(finalDetachedBytes),
      byte_length: finalDetachedBytes.length,
    },
    mutation: {
      final_file_hex: hex(detachedWhitespaceFile),
      byte_length: detachedWhitespaceFile.length,
      injected_byte_hex: '20',
      injected_byte_offset: 1,
    },
    oracleFacts: {
      expected_byte_length: finalDetachedBytes.length,
      supplied_byte_length: detachedWhitespaceFile.length,
      byte_identity: false,
    },
    expectedPrecedenceStage: 'detached_byte_identity',
    expectedOutcome: 'reject_detached_bytes',
  }),
  negativeVector({
    caseId: 'detached_json_bom_prefix',
    category: 'detached_attestation',
    mutationKind: 'bom_prefix',
    baseline: {
      final_file_hex: hex(finalDetachedBytes),
      byte_length: finalDetachedBytes.length,
    },
    mutation: {
      final_file_hex: hex(detachedBomFile),
      byte_length: detachedBomFile.length,
      prefix_hex: 'efbbbf',
    },
    oracleFacts: {
      required_prefix_hex: hex(finalDetachedBytes.subarray(0, 3)),
      supplied_prefix_hex: hex(detachedBomFile.subarray(0, 3)),
      byte_identity: false,
    },
    expectedPrecedenceStage: 'detached_byte_identity',
    expectedOutcome: 'reject_detached_bytes',
  }),
  negativeVector({
    caseId: 'detached_json_final_newline_missing',
    category: 'detached_attestation',
    mutationKind: 'final_newline_removal',
    baseline: {
      final_file_hex: hex(finalDetachedBytes),
      final_byte_hex: '0a',
    },
    mutation: {
      final_file_hex: hex(detachedMissingNewlineFile),
      final_byte_hex: hex(
        detachedMissingNewlineFile.subarray(
          detachedMissingNewlineFile.length - 1,
        ),
      ),
    },
    oracleFacts: {
      required_final_newline_count: 1,
      supplied_final_newline_count: 0,
      byte_identity: false,
    },
    expectedPrecedenceStage: 'detached_byte_identity',
    expectedOutcome: 'reject_detached_bytes',
  }),
  negativeVector({
    caseId: 'detached_json_final_newline_doubled',
    category: 'detached_attestation',
    mutationKind: 'final_newline_duplication',
    baseline: {
      final_file_hex: hex(finalDetachedBytes),
      final_newline_count: 1,
    },
    mutation: {
      final_file_hex: hex(detachedDoubledNewlineFile),
      final_newline_count: 2,
    },
    oracleFacts: {
      required_final_newline_count: 1,
      supplied_final_newline_count: 2,
      byte_identity: false,
    },
    expectedPrecedenceStage: 'detached_byte_identity',
    expectedOutcome: 'reject_detached_bytes',
  }),
  negativeVector({
    caseId: 'backup_key_copy_identity_mismatch',
    category: 'backup_key',
    mutationKind: 'recovery_key_identity_substitution',
    baseline: {
      active_local_key_id_hash: backupKeyIdHash,
      recovery_verifier_key_id_hash: backupKeyIdHash,
    },
    mutation: {
      active_local_key_id_hash: backupKeyIdHash,
      recovery_verifier_key_id_hash: digestHex(0xd5),
    },
    oracleFacts: {
      local_key_id_hash: backupKeyIdHash,
      recovery_key_id_hash: digestHex(0xd5),
      key_identities_match: false,
    },
    expectedPrecedenceStage: 'backup_key_identity',
    expectedOutcome: 'reject_key_disagreement',
  }),
  negativeVector({
    caseId: 'root_loss_authenticated_ledger_head_missing',
    category: 'backup_key',
    mutationKind: 'recovery_head_omission',
    baseline: {
      provisioning_kind:
        backupKeyProvisioningFields.provisioning_kind,
      authenticated_retired_ledger_head_sequence:
        backupKeyProvisioningFields.retired_ledger_head_sequence.toString(),
      authenticated_retired_ledger_head_hash:
        backupKeyProvisioningFields.retired_ledger_head_hash,
    },
    mutation: {
      authenticated_retired_ledger_head_sequence: null,
      authenticated_retired_ledger_head_hash: null,
    },
    oracleFacts: {
      root_loss_requires_authenticated_head: true,
      supplied_authenticated_head_present: false,
    },
    expectedPrecedenceStage: 'recovery_ledger_head',
    expectedOutcome: 'reject_recovery_head',
  }),
  negativeVector({
    caseId: 'provisioning_kind_substitution',
    category: 'backup_key_provisioning',
    mutationKind: 'provisioning_kind_substitution',
    baseline: {
      provisioning_kind:
        backupKeyProvisioningFields.provisioning_kind,
      receipt_sha256: backupKeyProvisioningReceipt.sha256,
      preimage_hex: backupKeyProvisioningReceipt.preimage_hex,
    },
    mutation:
      backupKeyProvisioningVector.negative_vectors
        .provisioning_kind_substitution,
    oracleFacts: {
      recomputed_receipt_sha256:
        provisioningKindSubstitution.sha256,
      supplied_receipt_sha256:
        backupKeyProvisioningReceipt.sha256,
      hashes_match: false,
    },
    expectedPrecedenceStage: 'key_provisioning_receipt',
    expectedOutcome: 'reject_key_provisioning_receipt',
  }),
  negativeVector({
    caseId: 'provisioning_new_key_id_substitution',
    category: 'backup_key_provisioning',
    mutationKind: 'new_key_id_substitution',
    baseline: {
      new_backup_key_id_hash:
        backupKeyProvisioningFields.new_backup_key_id_hash,
      attestation_backup_key_id_hash: backupKeyIdHash,
      receipt_sha256: backupKeyProvisioningReceipt.sha256,
    },
    mutation:
      backupKeyProvisioningVector.negative_vectors
        .new_key_id_substitution,
    oracleFacts: {
      attestation_backup_key_id_hash: backupKeyIdHash,
      substituted_new_backup_key_id_hash: digestHex(0xc8),
      key_ids_match: false,
    },
    expectedPrecedenceStage: 'key_provisioning_key_id',
    expectedOutcome: 'reject_key_provisioning_key_id',
  }),
  negativeVector({
    caseId: 'provisioning_store_field_order_substitution',
    category: 'backup_key_provisioning',
    mutationKind: 'field_order_substitution',
    baseline: {
      ordered_fields: backupKeyProvisioningFieldOrder,
      receipt_sha256: backupKeyProvisioningReceipt.sha256,
      local_signer_store_identity_sha256:
        backupKeyProvisioningFields.local_signer_store_identity_sha256,
      recovery_verifier_store_identity_sha256:
        backupKeyProvisioningFields
          .recovery_verifier_store_identity_sha256,
    },
    mutation:
      backupKeyProvisioningVector.negative_vectors
        .local_recovery_store_order_substitution,
    oracleFacts: {
      recomputed_receipt_sha256:
        provisioningFieldOrderSubstitution.sha256,
      supplied_receipt_sha256:
        backupKeyProvisioningReceipt.sha256,
      hashes_match: false,
    },
    expectedPrecedenceStage: 'key_provisioning_receipt',
    expectedOutcome: 'reject_key_provisioning_receipt',
  }),
  negativeVector({
    caseId: 'detached_provisioning_kind_substitution',
    category: 'detached_attestation',
    mutationKind: 'provisioning_kind_substitution',
    baseline: {
      backup_key_provisioning_kind:
        detachedValues.backup_key_provisioning_kind,
      backup_key_provisioning_receipt_sha256:
        detachedValues.backup_key_provisioning_receipt_sha256,
      final_file_hex: hex(finalDetachedBytes),
    },
    mutation: {
      backup_key_provisioning_kind:
        'prepositioned_dual_copy_v1',
      final_file_hex:
        detachedProvisioningKindSubstitution.final_file_hex,
      hmac_sha256:
        detachedProvisioningKindSubstitution.hmac_sha256,
    },
    oracleFacts: {
      required_provisioning_kind:
        backupKeyProvisioningFields.provisioning_kind,
      supplied_provisioning_kind: 'prepositioned_dual_copy_v1',
      provisioning_kinds_match: false,
    },
    expectedPrecedenceStage: 'detached_provisioning_binding',
    expectedOutcome: 'reject_key_provisioning_binding',
  }),
  negativeVector({
    caseId: 'detached_provisioning_receipt_substitution',
    category: 'detached_attestation',
    mutationKind: 'provisioning_receipt_substitution',
    baseline: {
      backup_key_provisioning_kind:
        detachedValues.backup_key_provisioning_kind,
      backup_key_provisioning_receipt_sha256:
        detachedValues.backup_key_provisioning_receipt_sha256,
      final_file_hex: hex(finalDetachedBytes),
    },
    mutation: {
      backup_key_provisioning_receipt_sha256: digestHex(0xc9),
      final_file_hex:
        detachedProvisioningReceiptSubstitution.final_file_hex,
      hmac_sha256:
        detachedProvisioningReceiptSubstitution.hmac_sha256,
    },
    oracleFacts: {
      required_receipt_sha256:
        backupKeyProvisioningReceipt.sha256,
      supplied_receipt_sha256: digestHex(0xc9),
      receipt_hashes_match: false,
    },
    expectedPrecedenceStage: 'detached_provisioning_binding',
    expectedOutcome: 'reject_key_provisioning_binding',
  }),
  negativeVector({
    caseId: 'browser_token_malformed_epoch',
    category: 'browser_authority',
    mutationKind: 'epoch_component_malformed',
    baseline: {
      token_envelope:
        browserAuthorityEpochVector.current_epoch_envelope,
      epoch_component:
        browserAuthorityEpochVector.current_epoch_id_hex,
      required_epoch_pattern: '^[0-9a-f]{64}$',
    },
    mutation:
      browserAuthorityEpochVector.negative_vectors
        .malformed_epoch_envelope,
    oracleFacts: {
      parsed_epoch_component:
        browserAuthorityEpochVector.negative_vectors
          .malformed_epoch_envelope.parsed_components
          .epoch_component,
      epoch_component_matches_required_pattern: false,
      database_lookup: false,
    },
    expectedPrecedenceStage: 'token_envelope',
    expectedOutcome: 'reject_token_envelope',
  }),
  negativeVector({
    caseId: 'browser_token_missing_epoch',
    category: 'browser_authority',
    mutationKind: 'epoch_component_omission',
    baseline: {
      token_envelope:
        browserAuthorityEpochVector.current_epoch_envelope,
      epoch_component:
        browserAuthorityEpochVector.current_epoch_id_hex,
      required_epoch_hex_length: 64,
    },
    mutation:
      browserAuthorityEpochVector.negative_vectors
        .missing_epoch_envelope,
    oracleFacts: {
      actual_epoch_hex_length: 0,
      required_epoch_hex_length: 64,
      database_lookup: false,
    },
    expectedPrecedenceStage: 'token_envelope',
    expectedOutcome: 'reject_token_envelope',
  }),
  negativeVector({
    caseId: 'browser_token_retired_epoch_replay',
    category: 'browser_authority',
    mutationKind: 'retired_epoch_substitution',
    baseline: {
      current_epoch_id_hex:
        browserAuthorityEpochVector.current_epoch_id_hex,
      current_epoch_envelope:
        browserAuthorityEpochVector.current_epoch_envelope,
      current_intent_hash:
        browserAuthorityByName.intent.current_epoch.sha256,
    },
    mutation:
      browserAuthorityEpochVector.negative_vectors.old_epoch_replay,
    oracleFacts: {
      presented_epoch_id_hex:
        browserAuthorityEpochVector.previous_epoch_id_hex,
      required_epoch_id_hex:
        browserAuthorityEpochVector.current_epoch_id_hex,
      epoch_matches_current: false,
      database_lookup: false,
    },
    expectedPrecedenceStage: 'authority_epoch_before_lookup',
    expectedOutcome: 'reject_authority_epoch_before_lookup',
  }),
  negativeVector({
    caseId: 'browser_inspect_domain_substitution',
    category: 'browser_authority',
    mutationKind: 'secret_domain_substitution',
    baseline: {
      required_domain: browserAuthorityByName.inspect.domain,
      required_hash:
        browserAuthorityByName.inspect.current_epoch.sha256,
      authority_epoch_id_hex:
        browserAuthorityEpochVector.current_epoch_id_hex,
    },
    mutation:
      browserAuthorityEpochVector.negative_vectors
        .inspect_domain_substitution,
    oracleFacts: {
      supplied_hash:
        browserAuthorityByName.intent.current_epoch.sha256,
      required_hash:
        browserAuthorityByName.inspect.current_epoch.sha256,
      hashes_match: false,
    },
    expectedPrecedenceStage: 'secret_domain',
    expectedOutcome: 'reject_secret_domain',
  }),
  negativeVector({
    caseId: 'browser_duplicate_inspect_issuance',
    category: 'browser_authority',
    mutationKind: 'duplicate_secret_issuance',
    baseline: {
      authority_epoch_id_hex:
        browserAuthorityEpochVector.current_epoch_id_hex,
      inspect_grant_hash:
        browserAuthorityByName.inspect.current_epoch.sha256,
      issuance_count: 1,
    },
    mutation:
      browserAuthorityEpochVector.negative_vectors
        .duplicate_inspect_issuance,
    oracleFacts: {
      unique_key:
        'authority_epoch_id_hex,inspect_grant_hash',
      attempted_issuance_count: 2,
      unique_constraint_satisfied: false,
    },
    expectedPrecedenceStage: 'inspect_secret_uniqueness',
    expectedOutcome: 'reject_inspect_secret_reuse',
  }),
  negativeVector({
    caseId: 'browser_sanitized_intent_row_present',
    category: 'browser_sanitization',
    mutationKind: 'intent_row_population',
    baseline: {
      capture_intent_row_count: 0,
      upload_grant_row_count: 0,
      authority_epoch_id_hex:
        browserAuthorityEpochVector.current_epoch_id_hex,
    },
    mutation: {
      capture_intent_row_count: 1,
      upload_grant_row_count: 0,
      inserted_intent_hash:
        browserAuthorityByName.intent.current_epoch.sha256,
    },
    oracleFacts: {
      required_capture_intent_row_count: 0,
      supplied_capture_intent_row_count: 1,
      counts_match: false,
    },
    expectedPrecedenceStage: 'mutable_browser_authority_zero_scan',
    expectedOutcome: 'reject_mutable_browser_authority',
  }),
  negativeVector({
    caseId: 'browser_sanitized_upload_grant_row_present',
    category: 'browser_sanitization',
    mutationKind: 'upload_grant_row_population',
    baseline: {
      capture_intent_row_count: 0,
      upload_grant_row_count: 0,
      authority_epoch_id_hex:
        browserAuthorityEpochVector.current_epoch_id_hex,
    },
    mutation: {
      capture_intent_row_count: 0,
      upload_grant_row_count: 1,
      inserted_upload_grant_hash:
        browserAuthorityByName.upload_grant.current_epoch.sha256,
    },
    oracleFacts: {
      required_upload_grant_row_count: 0,
      supplied_upload_grant_row_count: 1,
      counts_match: false,
    },
    expectedPrecedenceStage: 'mutable_browser_authority_zero_scan',
    expectedOutcome: 'reject_mutable_browser_authority',
  }),
  negativeVector({
    caseId: 'browser_epoch_rotation_unarmed',
    category: 'transaction_context',
    mutationKind: 'arming_context_omission',
    baseline: {
      operation_id: 'restore-fixture-0001',
      authority_epoch_id_hex:
        browserAuthorityEpochVector.current_epoch_id_hex,
      arming_state: 'armed',
    },
    mutation: {
      operation_id: 'restore-fixture-0001',
      requested_creation_reason: 'restore_invalidate_v1',
      arming_state: 'unarmed',
    },
    oracleFacts: {
      required_arming_state: 'armed',
      supplied_arming_state: 'unarmed',
      arming_states_match: false,
    },
    expectedPrecedenceStage: 'connection_context',
    expectedOutcome: 'reject_unarmed_context',
  }),
];

const negativeVectorRegistry = Object.fromEntries(
  negativeVectors.map((vector) => [vector.case_id, vector]),
);
const negativeCases = negativeVectors.map((vector) => ({
  case_id: vector.case_id,
  vector_ref: `#/negative_vector_registry/${vector.case_id}`,
}));

const isNonemptyObject = (candidate) =>
  candidate !== null &&
  typeof candidate === 'object' &&
  !Array.isArray(candidate) &&
  Object.keys(candidate).length > 0;
const assertFixture = (condition, message) => {
  if (!condition) {
    throw new Error(`fixture completeness assertion failed: ${message}`);
  }
};

assertFixture(
  new Set(negativeVectors.map((vector) => vector.case_id)).size ===
    negativeVectors.length,
  'negative case IDs must be unique',
);
assertFixture(
  Object.keys(negativeVectorRegistry).length === negativeVectors.length,
  'registry must contain every vector exactly once',
);
assertFixture(
  negativeCases.length === Object.keys(negativeVectorRegistry).length &&
    negativeCases.every(
      ({ case_id: caseId, vector_ref: vectorRef }) =>
        vectorRef === `#/negative_vector_registry/${caseId}` &&
        negativeVectorRegistry[caseId] !== undefined,
    ) &&
    Object.keys(negativeVectorRegistry).every((caseId) =>
      negativeCases.some((entry) => entry.case_id === caseId),
    ),
  'negative registry and catalog must be an exact resolvable bijection',
);
assertFixture(
  negativeVectors.every(
    (vector) =>
      vector.schema_version === 'stage2-negative-vector-v1' &&
      typeof vector.case_id === 'string' &&
      vector.case_id.length > 0 &&
      typeof vector.category === 'string' &&
      vector.category.length > 0 &&
      isNonemptyObject(vector.baseline) &&
      isNonemptyObject(vector.mutation) &&
      isNonemptyObject(vector.oracle) &&
      typeof vector.expected_precedence_stage === 'string' &&
      vector.expected_precedence_stage.length > 0 &&
      typeof vector.expected_outcome === 'string' &&
      vector.expected_outcome.length > 0,
  ),
  'every registry entry must carry a complete structured contract',
);
assertFixture(
  negativeVectors.every(
    (vector) =>
      Object.keys(vector.mutation).some(
        (key) =>
          ![
            'description',
            'mutation',
            'expected',
            'outcome',
          ].includes(key),
      ),
  ),
  'every mutation must be concrete rather than outcome-only',
);

const requiredNegativeCategoryCounts = {
  typed_framing: 3,
  ledger_integrity: 10,
  ledger_precedence: 6,
  transaction_context: 2,
  root_descriptor: 2,
  scrub_plan: 4,
  obligation_shape: 3,
  survivor_manifest: 1,
  retired_proof_family: 2,
  zero_scan: 4,
  zero_scan_phase: 6,
  finalization: 1,
  copy_finalization: 1,
  external_evidence: 4,
  detached_attestation: 8,
  backup_key: 2,
  backup_key_provisioning: 3,
  browser_authority: 5,
  browser_sanitization: 2,
};
const observedNegativeCategoryCounts = negativeVectors.reduce(
  (counts, vector) => {
    counts[vector.category] = (counts[vector.category] ?? 0) + 1;
    return counts;
  },
  {},
);
assertFixture(
  negativeVectors.length === 69 &&
    Object.keys(observedNegativeCategoryCounts).length ===
      Object.keys(requiredNegativeCategoryCounts).length &&
    Object.entries(requiredNegativeCategoryCounts).every(
      ([category, expectedCount]) =>
        observedNegativeCategoryCounts[category] === expectedCount,
    ) &&
    Object.keys(observedNegativeCategoryCounts).every(
      (category) =>
        requiredNegativeCategoryCounts[category] !== undefined,
    ),
  'negative registry must contain exactly 69 vectors with the frozen category counts',
);

const requiredLedgerPrecedenceEdges = [
  [
    'framing_or_length_before_record_sha256',
    'framing_or_length',
    'record_sha256',
  ],
  [
    'record_sha256_before_entry_hash',
    'record_sha256',
    'entry_hash',
  ],
  [
    'entry_hash_before_entry_hmac_sha256',
    'entry_hash',
    'entry_hmac_sha256',
  ],
  [
    'entry_hmac_sha256_before_sequence_contiguity',
    'entry_hmac_sha256',
    'sequence_contiguity',
  ],
  [
    'sequence_contiguity_before_previous_entry_hash',
    'sequence_contiguity',
    'previous_entry_hash',
  ],
  [
    'previous_entry_hash_before_decoded_projection',
    'previous_entry_hash',
    'decoded_field_or_projection_equality',
  ],
];
assertFixture(
  requiredLedgerPrecedenceEdges.every(
    ([edgeId, earlierStage, laterStage]) => {
      const vector =
        negativeVectorRegistry[`ledger_precedence_${edgeId}`];
      const faultStages = Object.keys(vector?.mutation?.faults ?? {});
      return (
        vector?.mutation?.precedence_edge?.earlier_stage ===
          earlierStage &&
        vector?.mutation?.precedence_edge?.later_stage === laterStage &&
        vector?.expected_precedence_stage === earlierStage &&
        vector?.mutation?.expected_precedence_stage === earlierStage &&
        vector?.oracle?.both_adjacent_faults_present === true &&
        faultStages.length === 2 &&
        faultStages.includes(earlierStage) &&
        faultStages.includes(laterStage) &&
        faultStages.every((stage) =>
          Object.values(vector.mutation.faults[stage]).includes(false),
        )
      );
    },
  ) &&
    negativeVectors.filter(
      (vector) => vector.category === 'ledger_precedence',
    ).length === requiredLedgerPrecedenceEdges.length,
  'all six adjacent ledger precedence edges must exist exactly once',
);

assertFixture(
  zeroScanPhasePairs.every(
    ([suppliedPhase, requiredPhase]) => {
      const direction = `${suppliedPhase}_as_${requiredPhase}`;
      const vector =
        negativeVectorRegistry[`zero_scan_phase_${direction}`];
      return (
        vector?.mutation?.supplied_phase === suppliedPhase &&
        vector?.mutation?.required_phase === requiredPhase &&
        vector?.mutation?.supplied_phase_matches_required_phase ===
          false &&
        vector?.mutation?.supplied_domain_matches_required_domain ===
          false &&
        vector?.mutation?.supplied_hash_matches_required_hash ===
          false &&
        vector?.oracle?.direction === direction
      );
    },
  ) &&
    negativeVectors.filter(
      (vector) => vector.category === 'zero_scan_phase',
    ).length === zeroScanPhasePairs.length,
  'all six directed zero-scan phase substitutions must exist exactly once',
);
assertFixture(
  negativeVectorRegistry.browser_token_malformed_epoch?.mutation
    ?.epoch_component_matches_required_pattern === false &&
    negativeVectorRegistry.browser_token_malformed_epoch?.mutation
      ?.database_lookup === false &&
    negativeVectorRegistry.browser_token_malformed_epoch?.mutation
      ?.dom_or_body_read === false &&
    negativeVectorRegistry.browser_token_missing_epoch?.mutation
      ?.actual_epoch_hex_length === 0 &&
    negativeVectorRegistry.browser_token_missing_epoch?.mutation
      ?.database_lookup === false &&
    negativeVectorRegistry.browser_token_missing_epoch?.mutation
      ?.dom_or_body_read === false &&
    negativeVectorRegistry.browser_token_retired_epoch_replay
      ?.mutation?.epoch_matches_current === false &&
    negativeVectorRegistry.browser_token_retired_epoch_replay
      ?.mutation?.database_lookup === false &&
    negativeVectorRegistry.browser_token_retired_epoch_replay
      ?.mutation?.dom_or_body_read === false,
  'malformed, missing, and retired epoch cases must all exist',
);
assertFixture(
  negativeCases.every(
    (entry) =>
      Object.keys(entry).length === 2 &&
      Object.hasOwn(entry, 'case_id') &&
      Object.hasOwn(entry, 'vector_ref') &&
      !entry.case_id.includes(' or ') &&
      !entry.vector_ref.includes(' or '),
  ),
  'catalog entries must be ref-only and contain no compound " or " branches',
);

const fixture = {
  fixture_version: 'stage2-schema-conformance-v4',
  fixture_descriptor: fixtureDescriptor,
  scenario: {
    purpose: 'coherent_two_item_backup_scrub_encoder_scenario',
    production_database_image: false,
    timeline_ms: {
      plan: tPlan.toString(),
      clone_root_delete: tDelete.toString(),
      finalization: tFinalize.toString(),
    },
    planned_item_order_raw_utf8: plannedItemSpecs.map((spec) => spec.item_id),
    ledger_append_order_raw_utf8: ['item-z', 'item-α'],
    ledger_base_sequence: '0',
    both_items_absent_from_base_ledger: true,
    pending_obligation_manifests_are_null: true,
    backup_tombstones_use_only_backup_proof_family: true,
  },
  framing: {
    marker_registry: {
      null: '00',
      text: '01',
      bytes_or_digest: '02',
      signed_int64: '03',
      boolean: '04',
    },
    single_frame_hex: frameVectors,
    signed_int64_boundaries: int64BoundaryVectors,
    self_test: {
      domain: 'typed-framing-self-test-v1',
      preimage_hex: hex(framingSelfTestPreimage),
      sha256: hex(sha256(framingSelfTestPreimage)),
    },
  },
  trusted_time_proofs: clockProofVectors,
  backup_key_provisioning: backupKeyProvisioningVector,
  browser_authority_epoch: browserAuthorityEpochVector,
  retired_ledger: {
    header_ascii: 'youtube-retired-item-ledger-v1\n',
    header_hex: hex(utf8('youtube-retired-item-ledger-v1\n')),
    test_key_hex: hex(ledgerKey),
    genesis_hash: hex(genesisHash),
    verification_precedence: [
      'framing_or_length',
      'record_sha256',
      'entry_hash',
      'entry_hmac_sha256',
      'sequence_contiguity',
      'previous_entry_hash',
      'decoded_field_or_projection_equality',
    ],
    records: [ledgerRecordOne, ledgerRecordTwo],
    negative_vectors: ledgerNegativeVectors,
  },
  backup_hashes: {
    obligation_sets: obligationSetVectors,
    nested_root_preimages: [
      { item_id: 'item-z', ...rootTwo },
      { item_id: 'item-α', ...rootOne },
    ],
    survivor_manifests: [
      survivorManifests['item-z'],
      survivorManifests['item-α'],
    ],
    empty_aggregates: emptyAggregateVectors,
    two_row_aggregates: aggregateVectors,
    scrub_plan: {
      domain: 'brain-sensitive-backup-scrub-plan-v1',
      ordered_application_fields_excluding_scrub_plan_hash:
        scrubApplicationFieldOrder,
      values: scrubApplicationInputs.map(fixtureValue),
      preimage_hex: hex(scrubPlanPreimage),
      sha256: scrubPlanHash,
    },
    copy_finalization_rows: {
      copy_retired_items: {
        ordered_fields: copyRetiredFieldOrder,
        rows: copyRetiredRows.map((row) => ({
          item_id: row.item_id,
          values: row.fields.map(fixtureValue),
        })),
      },
      backup_tombstones: {
        ordered_fields: resultingRetiredFieldOrder,
        rows: resultingRetiredRows.map((row) => ({
          item_id: row.item_id,
          values: row.fields.map(fixtureValue),
        })),
      },
      mirrored_copy_outboxes: {
        ordered_fields: copyOutboxFieldOrder,
        rows: copyOutboxRows.map((row) => ({
          item_id: row.item_id,
          values: row.fields.map(fixtureValue),
        })),
      },
    },
    zero_scans: {
      scrub_stage: scrubStageZeroScan,
      pre_finalization: preFinalizationZeroScan,
      post_finalization: postFinalizationZeroScan,
    },
    pre_finalization: {
      domain: 'brain-sensitive-backup-pre-finalization-checks-v1',
      ordered_fields: [
        'attestation_id',
        'scrub_plan_hash',
        'pre_finalization_database_sha256',
        'pre_finalization_database_size_bytes',
        'pre_finalization_page_size',
        'pre_finalization_page_count',
        'pre_finalization_freelist_count',
        'pre_finalization_integrity_check_token',
        'pre_finalization_quick_check_token',
        'pre_finalization_foreign_key_violation_count',
        'pre_finalization_zero_scan_hash',
        'pre_finalization_zero_scan_violation_count',
        'pre_finalization_retired_ledger_head_sequence',
        'pre_finalization_retired_ledger_head_hash',
      ],
      values: preFinalizationInputs.map(fixtureValue),
      preimage_hex: hex(preFinalizationPreimage),
      sha256: preFinalizationHash,
    },
  },
  detached_attestation: {
    hmac_test_key_hex: hex(detachedKey),
    hmac_test_key_id_hash: backupKeyIdHash,
    ordered_keys_without_hmac: Object.keys(detachedValues),
    canonical_utf8_without_hmac_hex: hex(utf8(canonicalWithoutHmac)),
    hmac_sha256: detachedHmac,
    final_file_hex: hex(finalDetachedBytes),
  },
  negative_vector_registry: negativeVectorRegistry,
  negative_cases: negativeCases,
};

process.stdout.write(`${JSON.stringify(fixture, null, 2)}\n`);
