#include "better_sqlite3.hpp"
#include "brain_s28_bridge.hpp"

#include <cctype>
#include <string>

namespace {

constexpr const char* kNoReadinessClaim = "none";

struct ProbeState {
  int authorizer_calls = 0;
  int authorizer_denials = 0;
  int commit_hook_calls = 0;
  int rollback_hook_calls = 0;
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

int ProbeCommitHook(void* opaque) {
  static_cast<ProbeState*>(opaque)->commit_hook_calls += 1;
  return 0;
}

void ProbeRollbackHook(void* opaque) {
  static_cast<ProbeState*>(opaque)->rollback_hook_calls += 1;
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

void RemoveCallbacks(sqlite3* db_handle) {
  S28RestoreDisposableDefaultAuthorizer(db_handle);
  sqlite3_commit_hook(db_handle, nullptr, nullptr);
  sqlite3_rollback_hook(db_handle, nullptr, nullptr);
}

void RollBackIfOpen(sqlite3* db_handle) {
  if (sqlite3_get_autocommit(db_handle) == 0) {
    int ignored_step = SQLITE_OK;
    RunOneNoTail(db_handle, "ROLLBACK", &ignored_step);
  }
}

std::string JsonResult(
    const char* scenario,
    const char* outcome,
    const ProbeState& state,
    int autocommit,
    int transaction_state,
    int commit_step_code,
    bool authorizer_denied) {
  return std::string("{") +
      "\"format\":\"brain-s28-disposable-native-probe-v1\"," +
      "\"scenario\":\"" + scenario + "\"," +
      "\"outcome\":\"" + outcome + "\"," +
      "\"bridgePresent\":true," +
      "\"authorizerDenied\":" +
      (authorizer_denied ? "true" : "false") + "," +
      "\"authorizerCalls\":" + std::to_string(state.authorizer_calls) + "," +
      "\"authorizerDenials\":" +
      std::to_string(state.authorizer_denials) + "," +
      "\"commitHookCalls\":" +
      std::to_string(state.commit_hook_calls) + "," +
      "\"rollbackHookCalls\":" +
      std::to_string(state.rollback_hook_calls) + "," +
      "\"autocommit\":" + std::to_string(autocommit) + "," +
      "\"transactionState\":" + std::to_string(transaction_state) + "," +
      "\"commitStepCode\":" + std::to_string(commit_step_code) + "," +
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

  if (scenario == "bridge-attestation") {
    ReturnJson(
        info,
        JsonResult(
            "bridge-attestation",
            "not_applicable",
            state,
            sqlite3_get_autocommit(db_handle),
            sqlite3_txn_state(db_handle, "main"),
            -1,
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
            -1,
            true));
    return;
  }

  if (scenario != "observer-open" &&
      scenario != "observer-committed" &&
      scenario != "observer-rolled-back" &&
      scenario != "observer-indeterminate") {
    return ThrowRangeError("Unknown closed disposable probe scenario");
  }

  int step_code = SQLITE_OK;
  sqlite3_set_authorizer(db_handle, ProbeAuthorizer, &state);
  if (!RunOneNoTail(
          db_handle,
          "CREATE TEMP TABLE IF NOT EXISTS brain_s28_disposable_probe "
          "(value INTEGER NOT NULL)",
          &step_code) ||
      !RunOneNoTail(
          db_handle,
          "DELETE FROM temp.brain_s28_disposable_probe",
          &step_code)) {
    RemoveCallbacks(db_handle);
    return ThrowProbeError(db_handle, "setup");
  }

  state.authorizer_calls = 0;
  state.authorizer_denials = 0;
  sqlite3_commit_hook(db_handle, ProbeCommitHook, &state);
  sqlite3_rollback_hook(db_handle, ProbeRollbackHook, &state);

  if (!RunOneNoTail(db_handle, "BEGIN IMMEDIATE", &step_code) ||
      !RunOneNoTail(
          db_handle,
          "INSERT INTO temp.brain_s28_disposable_probe(value) VALUES (28)",
          &step_code)) {
    RollBackIfOpen(db_handle);
    RemoveCallbacks(db_handle);
    return ThrowProbeError(db_handle, "transaction body");
  }

  const char* outcome = "indeterminate";
  int observed_autocommit = sqlite3_get_autocommit(db_handle);
  int observed_transaction_state = sqlite3_txn_state(db_handle, "main");
  int observed_commit_step = -1;
  ProbeState observed_state = state;

  if (scenario == "observer-open") {
    outcome =
        observed_autocommit == 0 ? "open" : "indeterminate";
    RollBackIfOpen(db_handle);
  } else if (scenario == "observer-committed") {
    if (!RunOneNoTail(db_handle, "COMMIT", &observed_commit_step)) {
      RollBackIfOpen(db_handle);
      RemoveCallbacks(db_handle);
      return ThrowProbeError(db_handle, "commit");
    }
    observed_autocommit = sqlite3_get_autocommit(db_handle);
    observed_transaction_state = sqlite3_txn_state(db_handle, "main");
    observed_state = state;
    outcome =
        observed_commit_step == SQLITE_DONE &&
                observed_autocommit == 1 &&
                observed_state.commit_hook_calls == 1 &&
                observed_state.rollback_hook_calls == 0
            ? "committed"
            : "indeterminate";
  } else if (scenario == "observer-rolled-back") {
    if (!RunOneNoTail(db_handle, "ROLLBACK", &step_code)) {
      RemoveCallbacks(db_handle);
      return ThrowProbeError(db_handle, "rollback");
    }
    observed_autocommit = sqlite3_get_autocommit(db_handle);
    observed_transaction_state = sqlite3_txn_state(db_handle, "main");
    observed_state = state;
    outcome =
        observed_autocommit == 1 &&
                observed_state.commit_hook_calls == 0 &&
                observed_state.rollback_hook_calls == 1
            ? "rolled_back"
            : "indeterminate";
  } else {
    // Deliberately remove observer hooks before cleanup. The resulting closed
    // transaction has no observed hook and no raw COMMIT SQLITE_DONE, so a
    // fail-closed observer must classify it as indeterminate.
    sqlite3_commit_hook(db_handle, nullptr, nullptr);
    sqlite3_rollback_hook(db_handle, nullptr, nullptr);
    if (!RunOneNoTail(db_handle, "ROLLBACK", &step_code)) {
      RemoveCallbacks(db_handle);
      return ThrowProbeError(db_handle, "indeterminate cleanup");
    }
    observed_autocommit = sqlite3_get_autocommit(db_handle);
    observed_transaction_state = sqlite3_txn_state(db_handle, "main");
    observed_state = state;
    outcome = "indeterminate";
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
          observed_commit_step,
          false));
}
