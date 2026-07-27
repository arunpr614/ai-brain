#include "better_sqlite3.hpp"
#include "brain_s28_bridge.hpp"

#include <atomic>
#include <cctype>
#include <cstdint>
#include <string>

namespace {

constexpr const char* kNoReadinessClaim = "none";
constexpr const char* kPreparedRoleSql =
    "INSERT INTO temp.brain_s28_disposable_probe(role_key,value) "
    "VALUES (?1,?2)";
constexpr const char* kPreparedRoleTable = "brain_s28_disposable_probe";
constexpr const char* kPreparedRoleKey = "stage2-disposable-canary-v1";
constexpr sqlite3_int64 kPreparedRoleValue = 28;
constexpr int kCommitNotAttempted = -1;
std::atomic<std::uint64_t> g_next_observer_nonce{1};

bool AllocateObserverNonce(std::uint64_t* nonce) {
  std::uint64_t current =
      g_next_observer_nonce.load(std::memory_order_relaxed);
  while (current != 0 && current != UINT64_MAX) {
    if (g_next_observer_nonce.compare_exchange_weak(
            current,
            current + 1,
            std::memory_order_relaxed,
            std::memory_order_relaxed)) {
      *nonce = current;
      return true;
    }
  }
  return false;
}

struct ProbeState {
  int authorizer_calls = 0;
  int authorizer_denials = 0;
  int role_authorizer_calls = 0;
  int role_authorizer_denials = 0;
  int commit_hook_calls = 0;
  int rollback_hook_calls = 0;
  int commit_prepare_count = 0;
  int commit_step_count = 0;
  int commit_finalize_count = 0;
  int post_classification_sql_count = 0;
  int prepare_count = 0;
  int bind_validation_count = 0;
  int bind_validation_denials = 0;
  int bind_count = 0;
  int step_count = 0;
  int finalize_count = 0;
  int role_step_code = kCommitNotAttempted;
  int role_finalize_code = kCommitNotAttempted;
  int replay_attempt_count = 0;
  int replay_operation_count = 0;
  int reset_attempt_count = 0;
  int reset_operation_count = 0;
  int rebind_attempt_count = 0;
  int rebind_operation_count = 0;
  sqlite3_int64 outer_changes = 0;
  int commit_step_code = kCommitNotAttempted;
  int commit_finalize_code = kCommitNotAttempted;
  sqlite3* observer_db = nullptr;
  std::uint64_t observer_nonce = 0;
  bool observer_armed = false;
  bool hooks_installed = false;
  bool callback_active = false;
  bool observer_invalid = false;
  bool observer_refused = false;
  bool hooks_present_at_classification = false;
  bool nonce_matched_at_classification = false;
  bool cleanup_rollback_attested = false;
  bool commit_refusal_open_classifier_attested = false;
  bool unfinalized_commit_classifier_refused = false;
  bool finalize_error_classifier_attested = false;
  bool commit_attempted = false;
  bool role_attested = false;
  bool role_refused = false;
  bool pragma_attested = false;
  bool pragma_before_attested = false;
  bool pragma_after_attempted = false;
  bool pragma_after_attested = false;
};

struct PreparedRoleState {
  ProbeState* probe = nullptr;
  bool consumed = false;
  int expected_action = SQLITE_INSERT;
  const char* expected_table = kPreparedRoleTable;
  const char* expected_database = "temp";
  const char* expected_source = nullptr;
  bool force_schema_drift = false;
};

struct PragmaReadState {
  const char* expected_name = nullptr;
  int calls = 0;
  bool invalid = false;
};

bool IsAllowedPublicFunction(const char* name) {
  return name != nullptr &&
      (std::strcmp(name, "brain_s28_bridge_present") == 0 ||
       std::strcmp(name, "sqlite_version") == 0 ||
       std::strcmp(name, "sqlite_source_id") == 0);
}

int DefaultDenyAuthorizer(
    void*,
    int action,
    const char* argument_one,
    const char* argument_two,
    const char*,
    const char*) {
  if (action == SQLITE_SELECT) return SQLITE_OK;
  if (action == SQLITE_FUNCTION &&
      (IsAllowedPublicFunction(argument_one) ||
       IsAllowedPublicFunction(argument_two))) {
    return SQLITE_OK;
  }
  return SQLITE_DENY;
}

void BridgePresent(
    sqlite3_context* context,
    int argument_count,
    sqlite3_value**) {
  if (argument_count != 0) {
    sqlite3_result_error(context, "brain_s28_bridge_present takes no arguments", -1);
    return;
  }
  sqlite3_result_int(context, 1);
}

int ProbeAuthorizer(
    void* opaque,
    int action,
    const char*,
    const char*,
    const char*,
    const char*) {
  ProbeState* state = static_cast<ProbeState*>(opaque);
  state->authorizer_calls += 1;
  if (action == SQLITE_ATTACH || action == SQLITE_DETACH ||
      action == SQLITE_PRAGMA) {
    state->authorizer_denials += 1;
    return SQLITE_DENY;
  }
  return SQLITE_OK;
}

int PreparedRoleAuthorizer(
    void* opaque,
    int action,
    const char* argument_one,
    const char* argument_two,
    const char* database_name,
    const char* source_name) {
  PreparedRoleState* role = static_cast<PreparedRoleState*>(opaque);
  ProbeState* state = role->probe;
  state->authorizer_calls += 1;
  state->role_authorizer_calls += 1;
  const bool allowed =
      state->authorizer_calls == 1 &&
      action == role->expected_action &&
      argument_one != nullptr &&
      std::strcmp(argument_one, role->expected_table) == 0 &&
      argument_two == nullptr &&
      database_name != nullptr &&
      std::strcmp(database_name, role->expected_database) == 0 &&
      (
        (source_name == nullptr && role->expected_source == nullptr) ||
        (
          source_name != nullptr &&
          role->expected_source != nullptr &&
          std::strcmp(source_name, role->expected_source) == 0
        )
      );
  if (allowed) return SQLITE_OK;
  state->authorizer_denials += 1;
  state->role_authorizer_denials += 1;
  return SQLITE_DENY;
}

int PragmaReadAuthorizer(
    void* opaque,
    int action,
    const char* argument_one,
    const char* argument_two,
    const char*,
    const char*) {
  PragmaReadState* state = static_cast<PragmaReadState*>(opaque);
  state->calls += 1;
  const bool allowed =
      state->calls == 1 &&
      action == SQLITE_PRAGMA &&
      argument_one != nullptr &&
      std::strcmp(argument_one, state->expected_name) == 0 &&
      argument_two == nullptr;
  if (allowed) return SQLITE_OK;
  state->invalid = true;
  return SQLITE_DENY;
}

int ProbeCommitHook(void* opaque) {
  ProbeState* state = static_cast<ProbeState*>(opaque);
  if (!state->observer_armed || state->callback_active) {
    state->observer_invalid = true;
    return 0;
  }
  state->callback_active = true;
  state->commit_hook_calls += 1;
  if (state->commit_hook_calls > 1) state->observer_invalid = true;
  state->callback_active = false;
  return 0;
}

void ProbeRollbackHook(void* opaque) {
  ProbeState* state = static_cast<ProbeState*>(opaque);
  if (!state->observer_armed || state->callback_active) {
    state->observer_invalid = true;
    return;
  }
  state->callback_active = true;
  state->rollback_hook_calls += 1;
  if (state->rollback_hook_calls > 1) state->observer_invalid = true;
  state->callback_active = false;
}

bool HasNonWhitespaceTail(const char* tail) {
  if (tail == nullptr) return false;
  while (*tail != '\0') {
    if (!std::isspace(static_cast<unsigned char>(*tail))) return true;
    tail += 1;
  }
  return false;
}

int StepOneNoTail(sqlite3* db_handle, const char* sql, int* step_code) {
  sqlite3_stmt* statement = nullptr;
  const char* tail = nullptr;
  int status =
      sqlite3_prepare_v3(db_handle, sql, -1, 0, &statement, &tail);
  if (status != SQLITE_OK) {
    if (statement != nullptr) sqlite3_finalize(statement);
    *step_code = status;
    return status;
  }
  if (statement == nullptr || HasNonWhitespaceTail(tail)) {
    if (statement != nullptr) sqlite3_finalize(statement);
    *step_code = SQLITE_MISUSE;
    return SQLITE_MISUSE;
  }

  *step_code = sqlite3_step(statement);
  const int finalize_status = sqlite3_finalize(statement);
  if (*step_code != SQLITE_DONE) return *step_code;
  return finalize_status;
}

bool RunOneNoTail(sqlite3* db_handle, const char* sql, int* step_code) {
  return StepOneNoTail(db_handle, sql, step_code) == SQLITE_OK &&
         *step_code == SQLITE_DONE;
}

bool RunControlNoTail(
    sqlite3* db_handle,
    const char* sql,
    int* step_code,
    int* finalize_code,
    int* sql_attempt_count = nullptr) {
  sqlite3_stmt* statement = nullptr;
  const char* tail = nullptr;
  if (sql_attempt_count != nullptr) *sql_attempt_count += 1;
  const int prepare_code =
      sqlite3_prepare_v3(db_handle, sql, -1, 0, &statement, &tail);
  if (prepare_code != SQLITE_OK ||
      statement == nullptr ||
      HasNonWhitespaceTail(tail)) {
    if (statement != nullptr) sqlite3_finalize(statement);
    *step_code = prepare_code == SQLITE_OK ? SQLITE_MISUSE : prepare_code;
    *finalize_code = kCommitNotAttempted;
    return false;
  }
  *step_code = sqlite3_step(statement);
  *finalize_code = sqlite3_finalize(statement);
  return *step_code == SQLITE_DONE && *finalize_code == SQLITE_OK;
}

bool RunCommitControlNoTail(
    sqlite3* db_handle,
    ProbeState* state) {
  sqlite3_stmt* statement = nullptr;
  const char* tail = nullptr;
  state->commit_attempted = true;
  state->commit_prepare_count += 1;
  const int prepare_code = sqlite3_prepare_v3(
      db_handle,
      "COMMIT",
      -1,
      0,
      &statement,
      &tail);
  if (
      prepare_code != SQLITE_OK ||
      statement == nullptr ||
      HasNonWhitespaceTail(tail)) {
    if (statement != nullptr) {
      state->commit_finalize_count += 1;
      state->commit_finalize_code = sqlite3_finalize(statement);
    }
    return false;
  }
  state->commit_step_count += 1;
  state->commit_step_code = sqlite3_step(statement);
  state->commit_finalize_count += 1;
  state->commit_finalize_code = sqlite3_finalize(statement);
  return
      state->commit_step_code == SQLITE_DONE &&
      state->commit_finalize_code == SQLITE_OK;
}

bool ReadIntegerPragma(
    sqlite3* db_handle,
    const char* pragma_name,
    int expected_value,
    int* sql_attempt_count = nullptr) {
  PragmaReadState state;
  state.expected_name = pragma_name;
  if (sqlite3_set_authorizer(
          db_handle,
          PragmaReadAuthorizer,
          &state) != SQLITE_OK) {
    return false;
  }

  const std::string sql = std::string("PRAGMA ") + pragma_name;
  sqlite3_stmt* statement = nullptr;
  const char* tail = nullptr;
  if (sql_attempt_count != nullptr) *sql_attempt_count += 1;
  const int prepare_code =
      sqlite3_prepare_v3(db_handle, sql.c_str(), -1, 0, &statement, &tail);
  bool valid =
      prepare_code == SQLITE_OK &&
      statement != nullptr &&
      !HasNonWhitespaceTail(tail) &&
      state.calls == 1 &&
      !state.invalid;
  if (valid) {
    valid =
        sqlite3_step(statement) == SQLITE_ROW &&
        sqlite3_column_count(statement) == 1 &&
        sqlite3_column_type(statement, 0) == SQLITE_INTEGER &&
        sqlite3_column_int(statement, 0) == expected_value &&
        sqlite3_step(statement) == SQLITE_DONE;
  }
  if (statement != nullptr && sqlite3_finalize(statement) != SQLITE_OK) {
    valid = false;
  }
  if (S28RestoreDisposableDefaultAuthorizer(db_handle) != SQLITE_OK) {
    return false;
  }
  return valid;
}

bool AttestDisposablePragmas(
    sqlite3* db_handle,
    int* sql_attempt_count = nullptr) {
  return
      ReadIntegerPragma(
          db_handle, "foreign_keys", 1, sql_attempt_count) &&
      ReadIntegerPragma(
          db_handle, "recursive_triggers", 1, sql_attempt_count) &&
      ReadIntegerPragma(
          db_handle, "trusted_schema", 0, sql_attempt_count) &&
      ReadIntegerPragma(
          db_handle, "ignore_check_constraints", 0, sql_attempt_count) &&
      ReadIntegerPragma(
          db_handle, "secure_delete", 1, sql_attempt_count) &&
      ReadIntegerPragma(
          db_handle, "synchronous", 2, sql_attempt_count) &&
      ReadIntegerPragma(
          db_handle, "wal_autocheckpoint", 0, sql_attempt_count);
}

bool AttestBridgeTripwire(sqlite3* db_handle) {
  constexpr const char* kTripwireSql =
      "SELECT brain_s28_bridge_present(),sqlite_version(),"
      "sqlite_source_id()";
  sqlite3_stmt* statement = nullptr;
  const char* tail = nullptr;
  const int prepare_code = sqlite3_prepare_v3(
      db_handle,
      kTripwireSql,
      -1,
      0,
      &statement,
      &tail);
  bool valid =
      prepare_code == SQLITE_OK &&
      statement != nullptr &&
      !HasNonWhitespaceTail(tail) &&
      sqlite3_column_count(statement) == 3;
  if (valid) {
    valid =
        sqlite3_step(statement) == SQLITE_ROW &&
        sqlite3_column_type(statement, 0) == SQLITE_INTEGER &&
        sqlite3_column_int(statement, 0) == 1 &&
        sqlite3_column_type(statement, 1) == SQLITE_TEXT &&
        std::strcmp(
            reinterpret_cast<const char*>(
                sqlite3_column_text(statement, 1)),
            sqlite3_libversion()) == 0 &&
        sqlite3_column_type(statement, 2) == SQLITE_TEXT &&
        std::strcmp(
            reinterpret_cast<const char*>(
                sqlite3_column_text(statement, 2)),
            sqlite3_sourceid()) == 0 &&
        sqlite3_step(statement) == SQLITE_DONE;
  }
  if (
      statement != nullptr &&
      sqlite3_finalize(statement) != SQLITE_OK) {
    valid = false;
  }
  return valid;
}

void AttestTerminalPragmas(
    sqlite3* db_handle,
    ProbeState* state,
    int* sql_attempt_count = nullptr) {
  state->pragma_after_attempted = true;
  state->pragma_after_attested =
      AttestDisposablePragmas(db_handle, sql_attempt_count);
  state->pragma_attested =
      state->pragma_before_attested &&
      state->pragma_after_attested;
}

bool ArmObserver(sqlite3* db_handle, ProbeState* state) {
  if (
      state->observer_armed ||
      sqlite3_get_autocommit(db_handle) != 1 ||
      sqlite3_txn_state(db_handle, "main") != SQLITE_TXN_NONE ||
      sqlite3_next_stmt(db_handle, nullptr) != nullptr) {
    state->observer_refused = true;
    return false;
  }
  std::uint64_t nonce = 0;
  if (!AllocateObserverNonce(&nonce)) {
    state->observer_refused = true;
    return false;
  }
  state->observer_db = db_handle;
  state->observer_nonce = nonce;
  state->observer_armed = true;
  state->hooks_installed = true;
  state->hooks_present_at_classification = true;
  state->nonce_matched_at_classification = true;
  state->callback_active = false;
  state->observer_invalid = false;
  state->commit_hook_calls = 0;
  state->rollback_hook_calls = 0;
  sqlite3_commit_hook(db_handle, ProbeCommitHook, state);
  sqlite3_rollback_hook(db_handle, ProbeRollbackHook, state);
  return true;
}

bool CommitEvidenceCoherent(const ProbeState& state) {
  if (!state.commit_attempted) {
    return
        state.commit_prepare_count == 0 &&
        state.commit_step_count == 0 &&
        state.commit_finalize_count == 0 &&
        state.commit_step_code == kCommitNotAttempted &&
        state.commit_finalize_code == kCommitNotAttempted;
  }
  return
      state.commit_prepare_count == 1 &&
      state.commit_step_count >= 0 &&
      state.commit_step_count <= 1 &&
      state.commit_finalize_count >= 0 &&
      state.commit_finalize_count <= 1 &&
      (
        state.commit_step_count == 0 ||
        state.commit_finalize_count == 1
      ) &&
      (
        (state.commit_step_count == 0 &&
         state.commit_step_code == kCommitNotAttempted) ||
        (state.commit_step_count == 1 &&
         state.commit_step_code >= SQLITE_OK)
      ) &&
      (
        (state.commit_finalize_count == 0 &&
         state.commit_finalize_code == kCommitNotAttempted) ||
        (state.commit_finalize_count == 1 &&
         state.commit_finalize_code >= SQLITE_OK)
      );
}

const char* ClassifyObserver(
    sqlite3* db_handle,
    const ProbeState& state,
    std::uint64_t nonce) {
  const int autocommit = sqlite3_get_autocommit(db_handle);
  const int transaction_state = sqlite3_txn_state(db_handle, "main");
  if (
      !state.observer_armed ||
      !state.hooks_installed ||
      state.observer_invalid ||
      state.observer_db != db_handle ||
      state.observer_nonce != nonce ||
      state.commit_hook_calls > 1 ||
      state.rollback_hook_calls > 1 ||
      state.commit_prepare_count > 1 ||
      state.commit_step_count > 1 ||
      state.commit_finalize_count > 1 ||
      !CommitEvidenceCoherent(state) ||
      (state.commit_hook_calls != 0 &&
       state.rollback_hook_calls != 0)) {
    return "indeterminate";
  }
  if (
      autocommit == 0 &&
      transaction_state == SQLITE_TXN_WRITE &&
      state.commit_hook_calls == 0 &&
      state.rollback_hook_calls == 0 &&
      state.commit_step_code != SQLITE_DONE) {
    return "open";
  }
  if (
      autocommit == 1 &&
      transaction_state == SQLITE_TXN_NONE &&
      state.commit_hook_calls == 1 &&
      state.rollback_hook_calls == 0 &&
      state.commit_attempted &&
      state.commit_prepare_count == 1 &&
      state.commit_step_count == 1 &&
      state.commit_finalize_count == 1 &&
      state.commit_step_code == SQLITE_DONE) {
    return "committed";
  }
  if (
      autocommit == 1 &&
      transaction_state == SQLITE_TXN_NONE &&
      state.commit_hook_calls == 0 &&
      state.rollback_hook_calls == 1) {
    return "rolled_back";
  }
  return "indeterminate";
}

bool SetupDisposableProbeTable(sqlite3* db_handle, ProbeState* state) {
  int step_code = SQLITE_OK;
  sqlite3_set_authorizer(db_handle, ProbeAuthorizer, state);
  const bool success =
      RunOneNoTail(
          db_handle,
          "CREATE TEMP TABLE IF NOT EXISTS brain_s28_disposable_probe "
          "(role_key TEXT PRIMARY KEY,value INTEGER NOT NULL) WITHOUT ROWID",
          &step_code) &&
      RunOneNoTail(
          db_handle,
          "DELETE FROM temp.brain_s28_disposable_probe",
          &step_code);
  return S28RestoreDisposableDefaultAuthorizer(db_handle) == SQLITE_OK &&
         success;
}

bool BeginObservedTransaction(sqlite3* db_handle, ProbeState* state) {
  int step_code = SQLITE_OK;
  sqlite3_set_authorizer(db_handle, ProbeAuthorizer, state);
  const bool success =
      RunOneNoTail(db_handle, "BEGIN IMMEDIATE", &step_code);
  return S28RestoreDisposableDefaultAuthorizer(db_handle) == SQLITE_OK &&
         success;
}

bool RunPreparedRole(
    sqlite3* db_handle,
    PreparedRoleState* role,
    const char* sql,
    const char* bind_key,
    sqlite3_int64 bind_value,
    int bind_key_type,
    int bind_value_type,
    int supplied_bind_count) {
  ProbeState* state = role->probe;
  if (role->consumed) {
    state->replay_attempt_count += 1;
    state->role_refused = true;
    return false;
  }
  if (
      !state->observer_armed ||
      state->observer_db != db_handle ||
      sqlite3_get_autocommit(db_handle) != 0 ||
      sqlite3_txn_state(db_handle, "main") != SQLITE_TXN_WRITE ||
      sql == nullptr ||
      std::strcmp(sql, kPreparedRoleSql) != 0) {
    state->role_refused = true;
    return false;
  }
  state->authorizer_calls = 0;
  state->authorizer_denials = 0;
  state->role_authorizer_calls = 0;
  state->role_authorizer_denials = 0;
  if (sqlite3_set_authorizer(
          db_handle,
          PreparedRoleAuthorizer,
          role) != SQLITE_OK) {
    state->role_refused = true;
    return false;
  }
  role->consumed = true;

  sqlite3_stmt* statement = nullptr;
  const char* tail = nullptr;
  state->prepare_count += 1;
  const int prepare_code =
      sqlite3_prepare_v3(db_handle, sql, -1, 0, &statement, &tail);
  bool success =
      prepare_code == SQLITE_OK &&
      statement != nullptr &&
      !HasNonWhitespaceTail(tail) &&
      state->authorizer_calls == 1 &&
      state->authorizer_denials == 0 &&
      state->role_authorizer_calls == 1 &&
      state->role_authorizer_denials == 0 &&
      sqlite3_bind_parameter_count(statement) == 2;

  if (success) {
    state->bind_validation_count += 1;
  }
  if (
      success &&
      (
        supplied_bind_count != 2 ||
        bind_key_type != SQLITE_TEXT ||
        bind_value_type != SQLITE_INTEGER ||
        bind_key == nullptr ||
        std::strcmp(bind_key, kPreparedRoleKey) != 0 ||
        bind_value != kPreparedRoleValue
      )
  ) {
    state->bind_validation_denials += 1;
    state->role_refused = true;
    success = false;
  }
  if (success) {
    state->bind_count += 2;
    success =
        sqlite3_bind_text(
            statement,
            1,
            bind_key,
            -1,
            SQLITE_STATIC) == SQLITE_OK &&
        sqlite3_bind_int64(statement, 2, bind_value) == SQLITE_OK;
  }
  if (success && role->force_schema_drift) {
    ProbeState drift_state;
    int drift_step_code = SQLITE_OK;
    sqlite3_set_authorizer(
        db_handle,
        ProbeAuthorizer,
        &drift_state);
    success = RunOneNoTail(
        db_handle,
        "CREATE TEMP TABLE brain_s28_reprepare_drift("
        "value INTEGER NOT NULL)",
        &drift_step_code);
    if (
        sqlite3_set_authorizer(
            db_handle,
            PreparedRoleAuthorizer,
            role) != SQLITE_OK
    ) {
      success = false;
    }
  }
  if (success) {
    state->step_count += 1;
    state->role_step_code = sqlite3_step(statement);
    success = state->role_step_code == SQLITE_DONE;
    state->outer_changes = success
        ? sqlite3_changes64(db_handle)
        : 0;
    success = success && state->outer_changes == 1;
  }
  if (statement != nullptr) {
    state->finalize_count += 1;
    state->role_finalize_code = sqlite3_finalize(statement);
    if (state->role_finalize_code != SQLITE_OK) success = false;
  }
  if (S28RestoreDisposableDefaultAuthorizer(db_handle) != SQLITE_OK) {
    success = false;
  }
  state->role_attested =
      success &&
      state->prepare_count == 1 &&
      state->bind_count == 2 &&
      state->step_count == 1 &&
      state->finalize_count == 1 &&
      state->outer_changes == 1;
  if (!success) state->role_refused = true;
  return success;
}

bool AttemptPreparedRoleReset(PreparedRoleState* role) {
  role->probe->reset_attempt_count += 1;
  role->probe->role_refused = true;
  return false;
}

bool AttemptPreparedRoleRebind(PreparedRoleState* role) {
  role->probe->rebind_attempt_count += 1;
  role->probe->role_refused = true;
  return false;
}

void RemoveCallbacks(sqlite3* db_handle, ProbeState* state = nullptr) {
  S28RestoreDisposableDefaultAuthorizer(db_handle);
  sqlite3_commit_hook(db_handle, nullptr, nullptr);
  sqlite3_rollback_hook(db_handle, nullptr, nullptr);
  if (state != nullptr) state->hooks_installed = false;
}

bool RollBackObserved(
    sqlite3* db_handle,
    ProbeState* state,
    int* sql_attempt_count = nullptr) {
  if (sqlite3_get_autocommit(db_handle) != 0) return true;
  int step_code = SQLITE_OK;
  int finalize_code = SQLITE_OK;
  sqlite3_set_authorizer(db_handle, ProbeAuthorizer, state);
  const bool success =
      RunControlNoTail(
          db_handle,
          "ROLLBACK",
          &step_code,
          &finalize_code,
          sql_attempt_count);
  return S28RestoreDisposableDefaultAuthorizer(db_handle) == SQLITE_OK &&
         success;
}

std::string JsonResult(
    const char* scenario,
    const char* outcome,
    const ProbeState& state,
    int autocommit,
    int transaction_state,
    bool authorizer_denied) {
  return std::string("{") +
      "\"format\":\"brain-s28-disposable-native-probe-v4\"," +
      "\"scenario\":\"" + scenario + "\"," +
      "\"outcome\":\"" + outcome + "\"," +
      "\"quarantineRequired\":" +
      (std::strcmp(outcome, "indeterminate") == 0 ? "true" : "false") +
      "," +
      "\"bridgePresent\":true," +
      "\"authorizerDenied\":" +
      (authorizer_denied ? "true" : "false") + "," +
      "\"authorizerCalls\":" + std::to_string(state.authorizer_calls) + "," +
      "\"authorizerDenials\":" +
      std::to_string(state.authorizer_denials) + "," +
      "\"roleAuthorizerCalls\":" +
      std::to_string(state.role_authorizer_calls) + "," +
      "\"roleAuthorizerDenials\":" +
      std::to_string(state.role_authorizer_denials) + "," +
      "\"commitHookCalls\":" +
      std::to_string(state.commit_hook_calls) + "," +
      "\"rollbackHookCalls\":" +
      std::to_string(state.rollback_hook_calls) + "," +
      "\"commitPrepareCount\":" +
      std::to_string(state.commit_prepare_count) + "," +
      "\"commitStepCount\":" +
      std::to_string(state.commit_step_count) + "," +
      "\"commitFinalizeCount\":" +
      std::to_string(state.commit_finalize_count) + "," +
      "\"postClassificationSqlCount\":" +
      std::to_string(state.post_classification_sql_count) + "," +
      "\"autocommit\":" + std::to_string(autocommit) + "," +
      "\"transactionState\":" + std::to_string(transaction_state) + "," +
      "\"commitStepCode\":" +
      std::to_string(state.commit_step_code) + "," +
      "\"commitFinalizeCode\":" +
      std::to_string(state.commit_finalize_code) + "," +
      "\"commitAttempted\":" +
      (state.commit_attempted ? "true" : "false") + "," +
      "\"prepareCount\":" + std::to_string(state.prepare_count) + "," +
      "\"bindValidationCount\":" +
      std::to_string(state.bind_validation_count) + "," +
      "\"bindValidationDenials\":" +
      std::to_string(state.bind_validation_denials) + "," +
      "\"bindCount\":" + std::to_string(state.bind_count) + "," +
      "\"stepCount\":" + std::to_string(state.step_count) + "," +
      "\"finalizeCount\":" + std::to_string(state.finalize_count) + "," +
      "\"roleStepCode\":" +
      std::to_string(state.role_step_code) + "," +
      "\"roleFinalizeCode\":" +
      std::to_string(state.role_finalize_code) + "," +
      "\"replayAttemptCount\":" +
      std::to_string(state.replay_attempt_count) + "," +
      "\"replayOperationCount\":" +
      std::to_string(state.replay_operation_count) + "," +
      "\"resetAttemptCount\":" +
      std::to_string(state.reset_attempt_count) + "," +
      "\"resetOperationCount\":" +
      std::to_string(state.reset_operation_count) + "," +
      "\"rebindAttemptCount\":" +
      std::to_string(state.rebind_attempt_count) + "," +
      "\"rebindOperationCount\":" +
      std::to_string(state.rebind_operation_count) + "," +
      "\"outerChanges\":" + std::to_string(state.outer_changes) + "," +
      "\"roleAttested\":" +
      (state.role_attested ? "true" : "false") + "," +
      "\"roleRefused\":" +
      (state.role_refused ? "true" : "false") + "," +
      "\"pragmaAttested\":" +
      (state.pragma_attested ? "true" : "false") + "," +
      "\"pragmaBeforeAttested\":" +
      (state.pragma_before_attested ? "true" : "false") + "," +
      "\"pragmaAfterAttempted\":" +
      (state.pragma_after_attempted ? "true" : "false") + "," +
      "\"pragmaAfterAttested\":" +
      (state.pragma_after_attested ? "true" : "false") + "," +
      "\"observerArmed\":" +
      (state.observer_armed ? "true" : "false") + "," +
      "\"observerRefused\":" +
      (state.observer_refused ? "true" : "false") + "," +
      "\"observerInvalid\":" +
      (state.observer_invalid ? "true" : "false") + "," +
      "\"hooksPresentAtClassification\":" +
      (state.hooks_present_at_classification ? "true" : "false") + "," +
      "\"nonceMatchedAtClassification\":" +
      (state.nonce_matched_at_classification ? "true" : "false") + "," +
      "\"cleanupRollbackAttested\":" +
      (state.cleanup_rollback_attested ? "true" : "false") + "," +
      "\"commitRefusalOpenClassifierAttested\":" +
      (state.commit_refusal_open_classifier_attested ? "true" : "false") +
      "," +
      "\"unfinalizedCommitClassifierRefused\":" +
      (state.unfinalized_commit_classifier_refused ? "true" : "false") +
      "," +
      "\"finalizeErrorClassifierAttested\":" +
      (state.finalize_error_classifier_attested ? "true" : "false") +
      "," +
      "\"sqliteVersion\":\"" + sqlite3_libversion() + "\"," +
      "\"sqliteSourceId\":\"" + sqlite3_sourceid() + "\"," +
      "\"readinessClaim\":\"" + kNoReadinessClaim + "\"}";
}

void ReturnJson(
    const v8::FunctionCallbackInfo<v8::Value>& info,
    const std::string& json) {
  info.GetReturnValue().Set(
      StringFromUtf8(info.GetIsolate(), json.c_str(), -1));
}

void ThrowProbeError(sqlite3* db_handle, const char* stage) {
  const std::string message =
      std::string("Disposable S28 native probe failed at ") + stage +
      ": " + sqlite3_errmsg(db_handle);
  ThrowError(message.c_str());
}

}  // namespace

int S28InstallDisposableBridge(sqlite3* db_handle) {
  sqlite3_limit(db_handle, SQLITE_LIMIT_ATTACHED, 0);
  char* pragma_error = nullptr;
  int status = sqlite3_exec(
      db_handle,
      "PRAGMA foreign_keys=ON;"
      "PRAGMA recursive_triggers=ON;"
      "PRAGMA trusted_schema=OFF;"
      "PRAGMA ignore_check_constraints=OFF;"
      "PRAGMA secure_delete=ON;"
      "PRAGMA synchronous=FULL;"
      "PRAGMA wal_autocheckpoint=0;",
      nullptr,
      nullptr,
      &pragma_error);
  if (pragma_error != nullptr) sqlite3_free(pragma_error);
  if (status != SQLITE_OK) return status;

  status = sqlite3_create_function_v2(
      db_handle,
      "brain_s28_bridge_present",
      0,
      SQLITE_UTF8 | SQLITE_DETERMINISTIC | SQLITE_INNOCUOUS,
      nullptr,
      BridgePresent,
      nullptr,
      nullptr,
      nullptr);
  if (status != SQLITE_OK) return status;
  return S28RestoreDisposableDefaultAuthorizer(db_handle);
}

int S28RestoreDisposableDefaultAuthorizer(sqlite3* db_handle) {
  return sqlite3_set_authorizer(
      db_handle,
      DefaultDenyAuthorizer,
      nullptr);
}

void S28DisposableBridgeProbe(
    const v8::FunctionCallbackInfo<v8::Value>& info) {
  Database* db = node::ObjectWrap::Unwrap<Database>(info.This());
  if (info.Length() != 1 || !info[0]->IsString()) {
    return ThrowTypeError(
        "Expected one closed disposable probe scenario string");
  }
  Database::State* db_state = db->GetState();
  if (!db_state->open) {
    return ThrowTypeError("The disposable database connection is not open");
  }
  if (db_state->busy) {
    return ThrowTypeError("The disposable database connection is busy");
  }

  v8::String::Utf8Value scenario_value(info.GetIsolate(), info[0]);
  const std::string scenario(*scenario_value);
  sqlite3* db_handle = db->GetHandle();
  ProbeState state;
  state.pragma_before_attested =
      AttestDisposablePragmas(db_handle);
  state.pragma_attested = state.pragma_before_attested;
  if (!state.pragma_attested) {
    RemoveCallbacks(db_handle);
    return ThrowError(
        "Disposable S28 PRAGMA attestation failed before the probe");
  }

  if (scenario == "bridge-attestation") {
    if (!AttestBridgeTripwire(db_handle)) {
      return ThrowError(
          "Disposable S28 SQL bridge tripwire attestation failed");
    }
    ReturnJson(
        info,
        JsonResult(
            "bridge-attestation",
            "not_applicable",
            state,
            sqlite3_get_autocommit(db_handle),
            sqlite3_txn_state(db_handle, "main"),
            false));
    return;
  }

  if (scenario == "authorizer-denial") {
    sqlite3_set_authorizer(db_handle, ProbeAuthorizer, &state);
    sqlite3_stmt* denied_statement = nullptr;
    const char* tail = nullptr;
    const int prepare_status = sqlite3_prepare_v3(
        db_handle,
        "ATTACH ':memory:' AS forbidden_stage2_probe",
        -1,
        0,
        &denied_statement,
        &tail);
    if (denied_statement != nullptr) sqlite3_finalize(denied_statement);
    RemoveCallbacks(db_handle);
    const bool denied =
        prepare_status == SQLITE_AUTH && state.authorizer_denials == 1;
    if (!denied) {
      return ThrowError(
          "Disposable S28 authorizer negative control was not denied");
    }
    ReturnJson(
        info,
        JsonResult(
            "authorizer-denial",
            "not_applicable",
            state,
            sqlite3_get_autocommit(db_handle),
            sqlite3_txn_state(db_handle, "main"),
            true));
    return;
  }

  const bool prepared_role_scenario =
      scenario == "prepared-role" ||
      scenario == "prepared-role-bind-root-key-refused" ||
      scenario == "prepared-role-bind-value-refused" ||
      scenario == "prepared-role-bind-key-type-refused" ||
      scenario == "prepared-role-bind-value-type-refused" ||
      scenario == "prepared-role-bind-count-missing-refused" ||
      scenario == "prepared-role-bind-count-extra-refused" ||
      scenario == "prepared-role-sql-refused" ||
      scenario == "prepared-role-trace-refused" ||
      scenario == "prepared-role-step-finalize-refused" ||
      scenario == "prepared-role-auto-reprepare-refused" ||
      scenario == "prepared-role-replay-refused" ||
      scenario == "prepared-role-reset-refused" ||
      scenario == "prepared-role-rebind-refused";
  const bool observer_scenario =
      scenario == "observer-open" ||
      scenario == "observer-committed" ||
      scenario == "observer-rolled-back" ||
      scenario == "observer-indeterminate" ||
      scenario == "observer-stale-nonce" ||
      scenario == "observer-double-event";
  if (
      !prepared_role_scenario &&
      !observer_scenario &&
      scenario != "observer-arm-refused" &&
      scenario != "observer-statement-arm-refused") {
    return ThrowRangeError("Unknown closed disposable probe scenario");
  }

  if (!SetupDisposableProbeTable(db_handle, &state)) {
    RemoveCallbacks(db_handle);
    return ThrowProbeError(db_handle, "setup");
  }

  state.authorizer_calls = 0;
  state.authorizer_denials = 0;

  if (scenario == "observer-statement-arm-refused") {
    sqlite3_stmt* open_statement = nullptr;
    const char* tail = nullptr;
    const int prepare_code = sqlite3_prepare_v3(
        db_handle,
        "SELECT 1",
        -1,
        0,
        &open_statement,
        &tail);
    const bool refused =
        prepare_code == SQLITE_OK &&
        open_statement != nullptr &&
        !HasNonWhitespaceTail(tail) &&
        !ArmObserver(db_handle, &state) &&
        state.observer_refused;
    const int finalize_code =
        open_statement == nullptr
          ? SQLITE_MISUSE
          : sqlite3_finalize(open_statement);
    if (!refused || finalize_code != SQLITE_OK) {
      RemoveCallbacks(db_handle);
      return ThrowError(
          "Disposable S28 observer did not refuse an open statement");
    }
    AttestTerminalPragmas(db_handle, &state);
    ReturnJson(
        info,
        JsonResult(
            scenario.c_str(),
            "not_applicable",
            state,
            sqlite3_get_autocommit(db_handle),
            sqlite3_txn_state(db_handle, "main"),
            false));
    return;
  }

  if (scenario == "observer-arm-refused") {
    if (!BeginObservedTransaction(db_handle, &state)) {
      RemoveCallbacks(db_handle);
      return ThrowProbeError(db_handle, "observer refusal setup");
    }
    if (ArmObserver(db_handle, &state) ||
        !state.observer_refused ||
        !RollBackObserved(db_handle, &state)) {
      RemoveCallbacks(db_handle);
      return ThrowError(
          "Disposable S28 observer did not refuse an open transaction");
    }
    AttestTerminalPragmas(db_handle, &state);
    ReturnJson(
        info,
        JsonResult(
            scenario.c_str(),
            "not_applicable",
            state,
            sqlite3_get_autocommit(db_handle),
            sqlite3_txn_state(db_handle, "main"),
            false));
    return;
  }

  if (!ArmObserver(db_handle, &state) ||
      !BeginObservedTransaction(db_handle, &state)) {
    RollBackObserved(db_handle, &state);
    RemoveCallbacks(db_handle);
    return ThrowProbeError(db_handle, "observer arm or begin");
  }
  const std::uint64_t observer_nonce = state.observer_nonce;

  if (prepared_role_scenario) {
    PreparedRoleState role;
    role.probe = &state;
    bool expected_result = false;
    if (scenario == "prepared-role") {
      expected_result =
          RunPreparedRole(
              db_handle,
              &role,
              kPreparedRoleSql,
              kPreparedRoleKey,
              kPreparedRoleValue,
              SQLITE_TEXT,
              SQLITE_INTEGER,
              2);
    } else if (
        scenario == "prepared-role-bind-root-key-refused" ||
        scenario == "prepared-role-bind-value-refused" ||
        scenario == "prepared-role-bind-key-type-refused" ||
        scenario == "prepared-role-bind-value-type-refused" ||
        scenario == "prepared-role-bind-count-missing-refused" ||
        scenario == "prepared-role-bind-count-extra-refused") {
      const char* bind_key =
          scenario == "prepared-role-bind-root-key-refused"
            ? "stage2-disposable-canary-mutated"
            : kPreparedRoleKey;
      const sqlite3_int64 bind_value =
          scenario == "prepared-role-bind-value-refused"
            ? kPreparedRoleValue + 1
            : kPreparedRoleValue;
      const int bind_key_type =
          scenario == "prepared-role-bind-key-type-refused"
            ? SQLITE_INTEGER
            : SQLITE_TEXT;
      const int bind_value_type =
          scenario == "prepared-role-bind-value-type-refused"
            ? SQLITE_TEXT
            : SQLITE_INTEGER;
      const int supplied_bind_count =
          scenario == "prepared-role-bind-count-missing-refused"
            ? 1
            : (
                scenario == "prepared-role-bind-count-extra-refused"
                  ? 3
                  : 2
              );
      expected_result =
          !RunPreparedRole(
              db_handle,
              &role,
              kPreparedRoleSql,
              bind_key,
              bind_value,
              bind_key_type,
              bind_value_type,
              supplied_bind_count) &&
          state.role_refused &&
          state.bind_validation_count == 1 &&
          state.bind_validation_denials == 1 &&
          state.step_count == 0 &&
          state.outer_changes == 0;
    } else if (scenario == "prepared-role-sql-refused") {
      expected_result =
          !RunPreparedRole(
              db_handle,
              &role,
              "INSERT INTO temp.brain_s28_disposable_probe(role_key,value) "
              "VALUES (?1,?2); SELECT 1",
              kPreparedRoleKey,
              kPreparedRoleValue,
              SQLITE_TEXT,
              SQLITE_INTEGER,
              2) &&
          state.role_refused &&
          state.prepare_count == 0;
    } else if (scenario == "prepared-role-trace-refused") {
      role.expected_action = SQLITE_UPDATE;
      expected_result =
          !RunPreparedRole(
              db_handle,
              &role,
              kPreparedRoleSql,
              kPreparedRoleKey,
              kPreparedRoleValue,
              SQLITE_TEXT,
              SQLITE_INTEGER,
              2) &&
          state.role_refused &&
          state.authorizer_denials == 1 &&
          state.step_count == 0;
    } else if (scenario == "prepared-role-step-finalize-refused") {
      ProbeState duplicate_setup;
      int duplicate_step_code = SQLITE_OK;
      sqlite3_set_authorizer(
          db_handle,
          ProbeAuthorizer,
          &duplicate_setup);
      const bool duplicate_ready =
          RunOneNoTail(
              db_handle,
              "INSERT INTO temp.brain_s28_disposable_probe("
              "role_key,value) VALUES "
              "('stage2-disposable-canary-v1',27)",
              &duplicate_step_code) &&
          S28RestoreDisposableDefaultAuthorizer(db_handle) == SQLITE_OK;
      expected_result =
          duplicate_ready &&
          !RunPreparedRole(
              db_handle,
              &role,
              kPreparedRoleSql,
              kPreparedRoleKey,
              kPreparedRoleValue,
              SQLITE_TEXT,
              SQLITE_INTEGER,
              2) &&
          state.role_refused &&
          state.step_count == 1 &&
          state.finalize_count == 1 &&
          state.role_step_code == SQLITE_CONSTRAINT_PRIMARYKEY &&
          state.role_finalize_code == SQLITE_CONSTRAINT_PRIMARYKEY &&
          state.outer_changes == 0;
    } else if (scenario == "prepared-role-auto-reprepare-refused") {
      role.force_schema_drift = true;
      expected_result =
          !RunPreparedRole(
              db_handle,
              &role,
              kPreparedRoleSql,
              kPreparedRoleKey,
              kPreparedRoleValue,
              SQLITE_TEXT,
              SQLITE_INTEGER,
              2) &&
          state.role_refused &&
          state.role_authorizer_calls == 2 &&
          state.role_authorizer_denials == 1 &&
          state.step_count == 1 &&
          state.finalize_count == 1 &&
          state.role_step_code == SQLITE_AUTH &&
          state.role_finalize_code == SQLITE_AUTH &&
          state.outer_changes == 0;
    } else {
      const bool first_role_succeeded =
          RunPreparedRole(
              db_handle,
              &role,
              kPreparedRoleSql,
              kPreparedRoleKey,
              kPreparedRoleValue,
              SQLITE_TEXT,
              SQLITE_INTEGER,
              2);
      bool refused_operation = false;
      if (scenario == "prepared-role-replay-refused") {
        refused_operation =
            !RunPreparedRole(
                db_handle,
                &role,
                kPreparedRoleSql,
                kPreparedRoleKey,
                kPreparedRoleValue,
                SQLITE_TEXT,
                SQLITE_INTEGER,
                2) &&
            state.replay_attempt_count == 1 &&
            state.reset_attempt_count == 0 &&
            state.rebind_attempt_count == 0;
      } else if (scenario == "prepared-role-reset-refused") {
        refused_operation =
            !AttemptPreparedRoleReset(&role) &&
            state.replay_attempt_count == 0 &&
            state.reset_attempt_count == 1 &&
            state.rebind_attempt_count == 0;
      } else {
        refused_operation =
            !AttemptPreparedRoleRebind(&role) &&
            state.replay_attempt_count == 0 &&
            state.reset_attempt_count == 0 &&
            state.rebind_attempt_count == 1;
      }
      expected_result =
          first_role_succeeded &&
          refused_operation &&
          state.role_attested &&
          state.role_refused &&
          state.prepare_count == 1 &&
          state.outer_changes == 1;
    }
    if (!expected_result || !RollBackObserved(db_handle, &state)) {
      RemoveCallbacks(db_handle);
      return ThrowProbeError(db_handle, "prepared role");
    }
    AttestTerminalPragmas(db_handle, &state);
    const char* outcome =
        ClassifyObserver(db_handle, state, observer_nonce);
    ProbeState observed_state = state;
    RemoveCallbacks(db_handle);
    if (
        std::strcmp(outcome, "rolled_back") != 0 ||
        !observed_state.pragma_attested) {
      return ThrowError(
          "Disposable S28 prepared role terminal state was not attested");
    }
    ReturnJson(
        info,
        JsonResult(
            scenario.c_str(),
            outcome,
            observed_state,
            sqlite3_get_autocommit(db_handle),
            sqlite3_txn_state(db_handle, "main"),
            false));
    return;
  }

  int step_code = SQLITE_OK;
  sqlite3_set_authorizer(db_handle, ProbeAuthorizer, &state);
  if (!RunOneNoTail(
          db_handle,
          "INSERT INTO temp.brain_s28_disposable_probe(role_key,value) "
          "VALUES ('observer-canary-v1',28)",
          &step_code) ||
      S28RestoreDisposableDefaultAuthorizer(db_handle) != SQLITE_OK) {
    RollBackObserved(db_handle, &state);
    RemoveCallbacks(db_handle);
    return ThrowProbeError(db_handle, "observer transaction body");
  }

  const char* outcome = "indeterminate";
  int observed_autocommit = sqlite3_get_autocommit(db_handle);
  int observed_transaction_state = sqlite3_txn_state(db_handle, "main");
  ProbeState observed_state = state;

  if (scenario == "observer-open") {
    outcome = ClassifyObserver(db_handle, state, observer_nonce);
    observed_autocommit = sqlite3_get_autocommit(db_handle);
    observed_transaction_state = sqlite3_txn_state(db_handle, "main");
    if (std::strcmp(outcome, "open") != 0) {
      RemoveCallbacks(db_handle);
      return ThrowError(
          "Disposable S28 no-COMMIT tuple did not classify open");
    }
    ProbeState refused_commit_model = state;
    refused_commit_model.commit_attempted = true;
    refused_commit_model.commit_prepare_count = 1;
    refused_commit_model.commit_step_count = 1;
    refused_commit_model.commit_finalize_count = 1;
    refused_commit_model.commit_step_code = SQLITE_BUSY;
    refused_commit_model.commit_finalize_code = SQLITE_BUSY;
    state.commit_refusal_open_classifier_attested =
        std::strcmp(
            ClassifyObserver(
                db_handle,
                refused_commit_model,
                observer_nonce),
            "open") == 0;
    ProbeState unfinalized_commit_model = refused_commit_model;
    unfinalized_commit_model.commit_finalize_count = 0;
    unfinalized_commit_model.commit_finalize_code = kCommitNotAttempted;
    state.unfinalized_commit_classifier_refused =
        std::strcmp(
            ClassifyObserver(
                db_handle,
                unfinalized_commit_model,
                observer_nonce),
            "indeterminate") == 0;
    if (
        !state.commit_refusal_open_classifier_attested ||
        !state.unfinalized_commit_classifier_refused) {
      RemoveCallbacks(db_handle);
      return ThrowError(
          "Disposable S28 refused-COMMIT classifier vector failed");
    }
    if (!RollBackObserved(
            db_handle,
            &state,
            &state.post_classification_sql_count)) {
      RemoveCallbacks(db_handle);
      return ThrowProbeError(db_handle, "open cleanup");
    }
    state.cleanup_rollback_attested =
        sqlite3_get_autocommit(db_handle) == 1 &&
        sqlite3_txn_state(db_handle, "main") == SQLITE_TXN_NONE &&
        state.commit_hook_calls == 0 &&
        state.rollback_hook_calls == 1;
    AttestTerminalPragmas(
        db_handle,
        &state,
        &state.post_classification_sql_count);
    observed_state.post_classification_sql_count =
        state.post_classification_sql_count;
    observed_state.cleanup_rollback_attested =
        state.cleanup_rollback_attested;
    observed_state.commit_refusal_open_classifier_attested =
        state.commit_refusal_open_classifier_attested;
    observed_state.unfinalized_commit_classifier_refused =
        state.unfinalized_commit_classifier_refused;
    observed_state.pragma_attested = state.pragma_attested;
    observed_state.pragma_after_attempted =
        state.pragma_after_attempted;
    observed_state.pragma_after_attested =
        state.pragma_after_attested;
  } else if (scenario == "observer-committed") {
    sqlite3_set_authorizer(db_handle, ProbeAuthorizer, &state);
    RunCommitControlNoTail(db_handle, &state);
    if (S28RestoreDisposableDefaultAuthorizer(db_handle) != SQLITE_OK) {
      RemoveCallbacks(db_handle);
      return ThrowProbeError(db_handle, "commit authorizer restore");
    }
    AttestTerminalPragmas(db_handle, &state);
    outcome = ClassifyObserver(db_handle, state, observer_nonce);
    observed_autocommit = sqlite3_get_autocommit(db_handle);
    observed_transaction_state = sqlite3_txn_state(db_handle, "main");
    if (std::strcmp(outcome, "committed") != 0) {
      RemoveCallbacks(db_handle);
      return ThrowError(
          "Disposable S28 COMMIT tuple was not definitive committed");
    }
    ProbeState finalize_error_model = state;
    finalize_error_model.commit_finalize_code = SQLITE_IOERR;
    state.finalize_error_classifier_attested =
        std::strcmp(
            ClassifyObserver(
                db_handle,
                finalize_error_model,
                observer_nonce),
            "committed") == 0;
    if (!state.finalize_error_classifier_attested) {
      RemoveCallbacks(db_handle);
      return ThrowError(
          "Disposable S28 finalize-error classifier vector failed");
    }
    observed_state = state;
  } else if (scenario == "observer-rolled-back") {
    if (!RollBackObserved(db_handle, &state)) {
      RemoveCallbacks(db_handle);
      return ThrowProbeError(db_handle, "rollback");
    }
    AttestTerminalPragmas(db_handle, &state);
    outcome = ClassifyObserver(db_handle, state, observer_nonce);
    observed_autocommit = sqlite3_get_autocommit(db_handle);
    observed_transaction_state = sqlite3_txn_state(db_handle, "main");
    if (std::strcmp(outcome, "rolled_back") != 0) {
      RemoveCallbacks(db_handle);
      return ThrowError(
          "Disposable S28 rollback tuple was not definitive rolled_back");
    }
    observed_state = state;
  } else if (scenario == "observer-stale-nonce") {
    state.nonce_matched_at_classification = false;
    outcome = ClassifyObserver(db_handle, state, observer_nonce + 1);
    observed_autocommit = sqlite3_get_autocommit(db_handle);
    observed_transaction_state = sqlite3_txn_state(db_handle, "main");
    observed_state = state;
  } else if (scenario == "observer-double-event") {
    ProbeCommitHook(&state);
    ProbeCommitHook(&state);
    outcome = ClassifyObserver(db_handle, state, observer_nonce);
    observed_autocommit = sqlite3_get_autocommit(db_handle);
    observed_transaction_state = sqlite3_txn_state(db_handle, "main");
    observed_state = state;
  } else {
    sqlite3_commit_hook(db_handle, nullptr, nullptr);
    sqlite3_rollback_hook(db_handle, nullptr, nullptr);
    state.hooks_installed = false;
    state.hooks_present_at_classification = false;
    outcome = ClassifyObserver(db_handle, state, observer_nonce);
    observed_autocommit = sqlite3_get_autocommit(db_handle);
    observed_transaction_state = sqlite3_txn_state(db_handle, "main");
    observed_state = state;
  }

  if (
      std::strcmp(outcome, "indeterminate") == 0 &&
      (
        state.post_classification_sql_count != 0 ||
        state.pragma_after_attempted
      )
  ) {
    RemoveCallbacks(db_handle);
    return ThrowError(
        "Disposable S28 indeterminate tuple attempted post-classification SQL");
  }
  RemoveCallbacks(db_handle);
  ReturnJson(
      info,
      JsonResult(
          scenario.c_str(),
          outcome,
          observed_state,
          observed_autocommit,
          observed_transaction_state,
          false));
}
