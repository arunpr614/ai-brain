#include <node.h>
#include <sqlite3.h>
#include <v8.h>

#include <cerrno>
#include <climits>
#include <cstdio>
#include <cstdint>
#include <cstring>
#include <string>
#include <vector>

#include <dirent.h>
#include <fcntl.h>
#include <sys/stat.h>
#include <sys/types.h>
#include <unistd.h>

namespace {

constexpr const char* kDatabaseName = "factory.sqlite3";
constexpr const char* kWalName = "factory.sqlite3-wal";
constexpr const char* kShmName = "factory.sqlite3-shm";
constexpr const char* kJournalName = "factory.sqlite3-journal";
constexpr const char* kDatabaseQuarantineName =
    ".factory.sqlite3.delete";
constexpr const char* kWalQuarantineName =
    ".factory.sqlite3-wal.delete";
constexpr const char* kShmQuarantineName =
    ".factory.sqlite3-shm.delete";
constexpr const char* kJournalQuarantineName =
    ".factory.sqlite3-journal.delete";
constexpr const char* kRootPrefix = "brain-s28-file-factory-";
constexpr const char* kExpectedTempParent = "/private/tmp";
constexpr const char* kExpectedSqliteVersion = "3.49.2";
constexpr const char* kExpectedSqliteSourceId =
    "2025-05-07 10:39:52 "
    "17144570b0d96ae63cd6f3edca39e27ebd74925252bbaf6723bcb2f6b4861fb1";
thread_local const char* gCurrentStage = "uninitialized";

enum class AuthorizerMode {
  kDefaultDeny,
  kPragma,
  kTransaction,
  kSelect,
};

struct AuthorizerState {
  AuthorizerMode mode = AuthorizerMode::kDefaultDeny;
  int expected_action = -1;
  const char* expected_one = nullptr;
  const char* expected_two = nullptr;
  int statement_calls = 0;
  int statement_denials = 0;
  bool invalid = false;
};

struct ConnectionState {
  sqlite3* db = nullptr;
  AuthorizerState authorizer;
  int prepare_count = 0;
  int created_statement_count = 0;
  int finalized_statement_count = 0;
  int protected_boundary_count = 0;
  int protected_pragma_read_count = 0;
  bool authorizer_installed_before_first_prepare = false;
};

struct FileIdentity {
  dev_t device = 0;
  ino_t inode = 0;
  uid_t owner = 0;
  mode_t mode = 0;
  nlink_t links = 0;
};

struct MatrixEvidence {
  int bootstrap_pragma_count = 0;
  int initial_attestation_count = 0;
  int terminal_attestation_count = 0;
  int schema_prepare_code = -1;
  int pragma_mutation_prepare_code = -1;

  int owner_begin_step_code = -1;
  int owner_begin_finalize_code = -1;
  int rival_busy_step_code = -1;
  int rival_busy_finalize_code = -1;
  int rival_busy_reset_step_code = -1;
  int rival_busy_reset_code = -1;
  int rival_busy_reset_finalize_code = -1;
  int owner_rollback_step_code = -1;
  int owner_rollback_finalize_code = -1;
  int post_release_begin_step_code = -1;
  int post_release_begin_finalize_code = -1;
  int post_release_rollback_step_code = -1;
  int post_release_rollback_finalize_code = -1;

  int active_rebind_step_code = -1;
  int active_rebind_code = -1;
  int active_rebind_finalize_code = -1;
  int close_busy_code = -1;
  int close_busy_finalize_code = -1;
  int close_recovery_code = -1;
};

void AppendProfileSetTrace(
    std::vector<std::string>* trace,
    const char* owner) {
  for (const char* suffix : {
           "01.SQLITE_PRAGMA.fullfsync.ON",
           "02.SQLITE_PRAGMA.checkpoint_fullfsync.ON",
           "03.SQLITE_PRAGMA.journal_mode.WAL",
           "04.SQLITE_PRAGMA.synchronous.FULL",
           "05.SQLITE_PRAGMA.foreign_keys.ON",
           "06.SQLITE_PRAGMA.recursive_triggers.ON",
           "07.SQLITE_PRAGMA.trusted_schema.OFF",
           "08.SQLITE_PRAGMA.secure_delete.ON",
           "09.SQLITE_PRAGMA.ignore_check_constraints.OFF",
           "10.SQLITE_PRAGMA.wal_autocheckpoint.0",
       }) {
    trace->push_back(
        std::string(owner) + ".pragma.set." + suffix);
  }
}

void AppendProfileReadTrace(
    std::vector<std::string>* trace,
    const char* owner,
    const char* phase) {
  for (const char* suffix : {
           "01.SQLITE_PRAGMA.journal_mode.null",
           "02.SQLITE_PRAGMA.foreign_keys.null",
           "03.SQLITE_PRAGMA.recursive_triggers.null",
           "04.SQLITE_PRAGMA.trusted_schema.null",
           "05.SQLITE_PRAGMA.secure_delete.null",
           "06.SQLITE_PRAGMA.synchronous.null",
           "07.SQLITE_PRAGMA.ignore_check_constraints.null",
           "08.SQLITE_PRAGMA.wal_autocheckpoint.null",
           "09.SQLITE_PRAGMA.fullfsync.null",
           "10.SQLITE_PRAGMA.checkpoint_fullfsync.null",
       }) {
    trace->push_back(
        std::string(owner) + ".pragma.read." + phase + "." + suffix);
  }
}

void AppendProtectedTrace(
    std::vector<std::string>* trace,
    const char* owner,
    const char* boundary) {
  const std::string prefix =
      std::string(owner) + ".protected." + boundary + ".";
  trace->push_back(prefix + "authorizer.install");
  trace->push_back(
      prefix + "01.SQLITE_PRAGMA.foreign_keys.null");
  trace->push_back(
      prefix + "02.SQLITE_PRAGMA.recursive_triggers.null");
  trace->push_back(
      prefix + "03.SQLITE_PRAGMA.trusted_schema.null");
  trace->push_back(
      prefix + "04.SQLITE_PRAGMA.secure_delete.null");
  trace->push_back(
      prefix + "05.SQLITE_PRAGMA.ignore_check_constraints.null");
  trace->push_back(prefix + "authorizer.default");
}

const std::vector<std::string>& ExpectedOperationTrace() {
  static const std::vector<std::string> expected = [] {
    std::vector<std::string> trace = {
        "root.anchor.open",
        "root.identity.attest",
        "root.empty.precreate",
        "database.create.exclusive",
        "database.identity.attest",
        "owner.sqlite.open",
        "owner.connection.config",
        "owner.authorizer.bootstrap.install",
    };
    AppendProfileSetTrace(&trace, "owner");
    trace.push_back("owner.authorizer.initial-attest.install");
    AppendProfileReadTrace(&trace, "owner", "initial");
    trace.push_back("owner.authorizer.default.after-initial-attest");
    AppendProtectedTrace(&trace, "owner", "before-schema-auth");
    trace.push_back(
        "owner.schema.prepare.SQLITE_INSERT.sqlite_master.null.AUTH");
    AppendProtectedTrace(&trace, "owner", "after-schema-auth");
    AppendProtectedTrace(&trace, "owner", "before-pragma-auth");
    trace.push_back(
        "owner.pragma-mutation.prepare.SQLITE_PRAGMA.foreign_keys.OFF.AUTH");
    AppendProtectedTrace(&trace, "owner", "after-pragma-auth");
    trace.insert(
        trace.end(),
        {
            "rival.sqlite.open",
            "rival.connection.config",
            "rival.authorizer.bootstrap.install",
        });
    AppendProfileSetTrace(&trace, "rival");
    trace.push_back("rival.authorizer.initial-attest.install");
    AppendProfileReadTrace(&trace, "rival", "initial");
    trace.push_back("rival.authorizer.default.after-initial-attest");
    AppendProtectedTrace(&trace, "rival", "before-rebind");
    trace.insert(
        trace.end(),
        {
            "rival.rebind.SQLITE_SELECT.null.null.step.row",
            "rival.rebind.misuse",
            "rival.rebind.finalize",
            "rival.authorizer.default.after-rebind",
        });
    AppendProtectedTrace(&trace, "rival", "after-rebind");
    AppendProtectedTrace(&trace, "owner", "before-begin");
    trace.push_back(
        "owner.transaction.SQLITE_TRANSACTION.BEGIN.null.done");
    trace.push_back("owner.authorizer.default.after-begin");
    AppendProtectedTrace(&trace, "owner", "after-begin");
    AppendProtectedTrace(&trace, "rival", "before-busy-finalize");
    trace.insert(
        trace.end(),
        {
            "rival.transaction.SQLITE_TRANSACTION.BEGIN.null.busy-finalize.step",
            "rival.transaction.SQLITE_TRANSACTION.BEGIN.null.busy-finalize.finalize",
            "rival.authorizer.default.after-busy-finalize",
        });
    AppendProtectedTrace(&trace, "rival", "after-busy-finalize");
    AppendProtectedTrace(&trace, "rival", "before-busy-reset");
    trace.insert(
        trace.end(),
        {
            "rival.transaction.SQLITE_TRANSACTION.BEGIN.null.busy-reset.step",
            "rival.transaction.SQLITE_TRANSACTION.BEGIN.null.busy-reset.reset",
            "rival.transaction.SQLITE_TRANSACTION.BEGIN.null.busy-reset.finalize",
            "rival.authorizer.default.after-busy-reset",
        });
    AppendProtectedTrace(&trace, "rival", "after-busy-reset");
    AppendProtectedTrace(&trace, "owner", "before-rollback");
    trace.push_back(
        "owner.transaction.SQLITE_TRANSACTION.ROLLBACK.null.done");
    trace.push_back("owner.authorizer.default.after-rollback");
    AppendProtectedTrace(&trace, "owner", "after-rollback");
    AppendProtectedTrace(&trace, "rival", "before-post-release-begin");
    trace.push_back(
        "rival.post-release.transaction.SQLITE_TRANSACTION.BEGIN.null.done");
    trace.push_back(
        "rival.authorizer.default.after-post-release-begin");
    AppendProtectedTrace(&trace, "rival", "after-post-release-begin");
    AppendProtectedTrace(&trace, "rival", "before-post-release-rollback");
    trace.push_back(
        "rival.post-release.transaction.SQLITE_TRANSACTION.ROLLBACK.null.done");
    trace.push_back(
        "rival.authorizer.default.after-post-release-rollback");
    AppendProtectedTrace(&trace, "rival", "after-post-release-rollback");
    trace.push_back("owner.authorizer.terminal-attest.install");
    AppendProfileReadTrace(&trace, "owner", "terminal");
    trace.push_back("owner.authorizer.default.after-terminal-attest");
    trace.push_back("rival.authorizer.terminal-attest.install");
    AppendProfileReadTrace(&trace, "rival", "terminal");
    trace.push_back("rival.authorizer.default.after-terminal-attest");
    trace.push_back("connections.terminal.attest");
    AppendProtectedTrace(&trace, "rival", "before-close-busy");
    trace.insert(
        trace.end(),
        {
            "rival.close-busy.prepare.SQLITE_SELECT.null.null",
            "rival.authorizer.default.before-close-busy",
            "rival.close.busy",
            "rival.close.statement.finalize",
        });
    AppendProtectedTrace(&trace, "rival", "after-close-busy");
    trace.insert(
        trace.end(),
        {
            "rival.close.recovery",
            "owner.close",
            "connections.close.complete",
            "database.identity.final",
            "database.header.attest",
            "readonly.sqlite.open",
            "readonly.authorizer.install",
            "readonly.query-only.set.SQLITE_PRAGMA.query_only.ON",
            "readonly.query-only.attest.SQLITE_PRAGMA.query_only.null",
            "readonly.journal-mode.attest.SQLITE_PRAGMA.journal_mode.null",
            "readonly.authorizer.default",
            "readonly.zero-change.attest",
            "readonly.close",
            "sidecars.identity.validate",
            "sidecars.unlink",
            "database.unlink",
            "directory.fsync",
            "owned.empty.scan",
        });
    return trace;
  }();
  return expected;
}

bool EqualNullable(const char* actual, const char* expected) {
  if (actual == nullptr || expected == nullptr) return actual == expected;
  return std::strcmp(actual, expected) == 0;
}

int ClosedAuthorizer(
    void* opaque,
    int action,
    const char* argument_one,
    const char* argument_two,
    const char*,
    const char*) {
  AuthorizerState* state = static_cast<AuthorizerState*>(opaque);
  state->statement_calls += 1;

  bool allowed = false;
  bool expected_denial = false;
  if (state->statement_calls == 1) {
    switch (state->mode) {
      case AuthorizerMode::kPragma:
        allowed =
            action == SQLITE_PRAGMA &&
            EqualNullable(argument_one, state->expected_one) &&
            EqualNullable(argument_two, state->expected_two);
        break;
      case AuthorizerMode::kTransaction:
        allowed =
            action == SQLITE_TRANSACTION &&
            EqualNullable(argument_one, state->expected_one) &&
            argument_two == nullptr;
        break;
      case AuthorizerMode::kSelect:
        allowed =
            action == SQLITE_SELECT &&
            argument_one == nullptr &&
            argument_two == nullptr;
        break;
      case AuthorizerMode::kDefaultDeny:
        expected_denial =
            state->expected_action >= 0 &&
            action == state->expected_action &&
            EqualNullable(argument_one, state->expected_one) &&
            EqualNullable(argument_two, state->expected_two);
        break;
    }
  }

  if (allowed) return SQLITE_OK;
  state->statement_denials += 1;
  state->invalid = !expected_denial;
  return SQLITE_DENY;
}

void ResetAuthorizerExpectation(
    ConnectionState* connection,
    AuthorizerMode mode,
    const char* expected_one = nullptr,
    const char* expected_two = nullptr,
    int expected_action = -1) {
  connection->authorizer.mode = mode;
  connection->authorizer.expected_action = expected_action;
  connection->authorizer.expected_one = expected_one;
  connection->authorizer.expected_two = expected_two;
  connection->authorizer.statement_calls = 0;
  connection->authorizer.statement_denials = 0;
  connection->authorizer.invalid = false;
}

bool InstallAuthorizer(ConnectionState* connection) {
  return sqlite3_set_authorizer(
             connection->db,
             ClosedAuthorizer,
             &connection->authorizer) == SQLITE_OK;
}

bool InstallDefaultDeny(ConnectionState* connection) {
  ResetAuthorizerExpectation(connection, AuthorizerMode::kDefaultDeny);
  return InstallAuthorizer(connection);
}

bool HasOnlyWhitespace(const char* tail) {
  if (tail == nullptr) return true;
  while (*tail != '\0') {
    const unsigned char value = static_cast<unsigned char>(*tail);
    if (
        value != ' ' &&
        value != '\t' &&
        value != '\r' &&
        value != '\n' &&
        value != '\f' &&
        value != '\v') {
      return false;
    }
    tail += 1;
  }
  return true;
}

int Prepare(
    ConnectionState* connection,
    const char* sql,
    sqlite3_stmt** statement) {
  const char* tail = nullptr;
  *statement = nullptr;
  connection->prepare_count += 1;
  const int status = sqlite3_prepare_v3(
      connection->db,
      sql,
      -1,
      SQLITE_PREPARE_NO_VTAB,
      statement,
      &tail);
  if (status == SQLITE_OK && !HasOnlyWhitespace(tail)) {
    if (*statement != nullptr) {
      connection->created_statement_count += 1;
      connection->finalized_statement_count += 1;
      sqlite3_finalize(*statement);
      *statement = nullptr;
    }
    return SQLITE_MISUSE;
  }
  if (*statement != nullptr) connection->created_statement_count += 1;
  return status;
}

int Finalize(ConnectionState* connection, sqlite3_stmt** statement) {
  if (*statement == nullptr) return SQLITE_OK;
  const int status = sqlite3_finalize(*statement);
  *statement = nullptr;
  connection->finalized_statement_count += 1;
  return status;
}

enum class ResultShape {
  kNoRows,
  kInteger,
  kText,
};

bool RunPragma(
    ConnectionState* connection,
    const char* sql,
    const char* pragma_name,
    const char* pragma_argument,
    ResultShape shape,
    int expected_integer,
    const char* expected_text) {
  ResetAuthorizerExpectation(
      connection,
      AuthorizerMode::kPragma,
      pragma_name,
      pragma_argument);

  sqlite3_stmt* statement = nullptr;
  if (Prepare(connection, sql, &statement) != SQLITE_OK ||
      statement == nullptr ||
      connection->authorizer.statement_calls != 1 ||
      connection->authorizer.statement_denials != 0 ||
      connection->authorizer.invalid) {
    Finalize(connection, &statement);
    return false;
  }

  int step_code = sqlite3_step(statement);
  bool valid = false;
  if (shape == ResultShape::kNoRows) {
    valid = step_code == SQLITE_DONE;
  } else if (shape == ResultShape::kInteger) {
    valid =
        step_code == SQLITE_ROW &&
        sqlite3_column_count(statement) == 1 &&
        sqlite3_column_type(statement, 0) == SQLITE_INTEGER &&
        sqlite3_column_int(statement, 0) == expected_integer &&
        sqlite3_step(statement) == SQLITE_DONE;
  } else {
    const unsigned char* value =
        step_code == SQLITE_ROW ? sqlite3_column_text(statement, 0) : nullptr;
    valid =
        step_code == SQLITE_ROW &&
        sqlite3_column_count(statement) == 1 &&
        sqlite3_column_type(statement, 0) == SQLITE_TEXT &&
        value != nullptr &&
        expected_text != nullptr &&
        std::strcmp(
            reinterpret_cast<const char*>(value),
            expected_text) == 0 &&
        sqlite3_step(statement) == SQLITE_DONE;
  }
  return Finalize(connection, &statement) == SQLITE_OK && valid;
}

bool ConfigureConnection(
    ConnectionState* connection,
    MatrixEvidence* evidence,
    const char* owner_name,
    std::vector<std::string>* trace) {
  if (
      sqlite3_extended_result_codes(connection->db, 1) != SQLITE_OK ||
      sqlite3_busy_timeout(connection->db, 0) != SQLITE_OK) {
    return false;
  }
  sqlite3_limit(connection->db, SQLITE_LIMIT_ATTACHED, 0);

  int configured = -1;
  if (
      sqlite3_db_config(
          connection->db,
          SQLITE_DBCONFIG_ENABLE_LOAD_EXTENSION,
          0,
          &configured) != SQLITE_OK ||
      configured != 0 ||
      sqlite3_db_config(
          connection->db,
          SQLITE_DBCONFIG_DEFENSIVE,
          1,
          &configured) != SQLITE_OK ||
      configured != 1 ||
      sqlite3_db_config(
          connection->db,
          SQLITE_DBCONFIG_TRUSTED_SCHEMA,
          0,
          &configured) != SQLITE_OK ||
      configured != 0) {
    return false;
  }
  trace->push_back(std::string(owner_name) + ".connection.config");

  if (connection->prepare_count != 0) return false;
  ResetAuthorizerExpectation(connection, AuthorizerMode::kPragma);
  if (!InstallAuthorizer(connection)) return false;
  connection->authorizer_installed_before_first_prepare = true;
  trace->push_back(
      std::string(owner_name) + ".authorizer.bootstrap.install");

  struct PragmaSet {
    const char* sql;
    const char* name;
    const char* argument;
    ResultShape shape;
    int expected_integer;
    const char* expected_text;
    const char* trace_suffix;
  };
  const PragmaSet sets[] = {
      {
          "PRAGMA fullfsync=ON",
          "fullfsync",
          "ON",
          ResultShape::kNoRows,
          0,
          nullptr,
          ".pragma.set.01.SQLITE_PRAGMA.fullfsync.ON",
      },
      {
          "PRAGMA checkpoint_fullfsync=ON",
          "checkpoint_fullfsync",
          "ON",
          ResultShape::kNoRows,
          0,
          nullptr,
          ".pragma.set.02.SQLITE_PRAGMA.checkpoint_fullfsync.ON",
      },
      {
          "PRAGMA journal_mode=WAL",
          "journal_mode",
          "WAL",
          ResultShape::kText,
          0,
          "wal",
          ".pragma.set.03.SQLITE_PRAGMA.journal_mode.WAL",
      },
      {
          "PRAGMA synchronous=FULL",
          "synchronous",
          "FULL",
          ResultShape::kNoRows,
          0,
          nullptr,
          ".pragma.set.04.SQLITE_PRAGMA.synchronous.FULL",
      },
      {
          "PRAGMA foreign_keys=ON",
          "foreign_keys",
          "ON",
          ResultShape::kNoRows,
          0,
          nullptr,
          ".pragma.set.05.SQLITE_PRAGMA.foreign_keys.ON",
      },
      {
          "PRAGMA recursive_triggers=ON",
          "recursive_triggers",
          "ON",
          ResultShape::kNoRows,
          0,
          nullptr,
          ".pragma.set.06.SQLITE_PRAGMA.recursive_triggers.ON",
      },
      {
          "PRAGMA trusted_schema=OFF",
          "trusted_schema",
          "OFF",
          ResultShape::kNoRows,
          0,
          nullptr,
          ".pragma.set.07.SQLITE_PRAGMA.trusted_schema.OFF",
      },
      {
          "PRAGMA secure_delete=ON",
          "secure_delete",
          "ON",
          ResultShape::kInteger,
          1,
          nullptr,
          ".pragma.set.08.SQLITE_PRAGMA.secure_delete.ON",
      },
      {
          "PRAGMA ignore_check_constraints=OFF",
          "ignore_check_constraints",
          "OFF",
          ResultShape::kNoRows,
          0,
          nullptr,
          ".pragma.set.09.SQLITE_PRAGMA.ignore_check_constraints.OFF",
      },
      {
          "PRAGMA wal_autocheckpoint=0",
          "wal_autocheckpoint",
          "0",
          ResultShape::kInteger,
          0,
          nullptr,
          ".pragma.set.10.SQLITE_PRAGMA.wal_autocheckpoint.0",
      },
  };
  for (const PragmaSet& setting : sets) {
    gCurrentStage = setting.trace_suffix;
    if (!RunPragma(
            connection,
            setting.sql,
            setting.name,
            setting.argument,
            setting.shape,
            setting.expected_integer,
            setting.expected_text)) {
      return false;
    }
    trace->push_back(std::string(owner_name) + setting.trace_suffix);
  }
  evidence->bootstrap_pragma_count += 10;

  return true;
}

bool AttestPragmas(
    ConnectionState* connection,
    int* attestation_count,
    const char* owner_name,
    const char* phase,
    std::vector<std::string>* trace) {
  ResetAuthorizerExpectation(connection, AuthorizerMode::kPragma);
  if (!InstallAuthorizer(connection)) return false;
  trace->push_back(
      std::string(owner_name) + ".authorizer." + phase +
      "-attest.install");

  struct PragmaRead {
    const char* sql;
    const char* name;
    ResultShape shape;
    int expected_integer;
    const char* expected_text;
    const char* trace_suffix;
  };
  const PragmaRead reads[] = {
      {
          "PRAGMA journal_mode",
          "journal_mode",
          ResultShape::kText,
          0,
          "wal",
          ".01.SQLITE_PRAGMA.journal_mode.null",
      },
      {
          "PRAGMA foreign_keys",
          "foreign_keys",
          ResultShape::kInteger,
          1,
          nullptr,
          ".02.SQLITE_PRAGMA.foreign_keys.null",
      },
      {
          "PRAGMA recursive_triggers",
          "recursive_triggers",
          ResultShape::kInteger,
          1,
          nullptr,
          ".03.SQLITE_PRAGMA.recursive_triggers.null",
      },
      {
          "PRAGMA trusted_schema",
          "trusted_schema",
          ResultShape::kInteger,
          0,
          nullptr,
          ".04.SQLITE_PRAGMA.trusted_schema.null",
      },
      {
          "PRAGMA secure_delete",
          "secure_delete",
          ResultShape::kInteger,
          1,
          nullptr,
          ".05.SQLITE_PRAGMA.secure_delete.null",
      },
      {
          "PRAGMA synchronous",
          "synchronous",
          ResultShape::kInteger,
          2,
          nullptr,
          ".06.SQLITE_PRAGMA.synchronous.null",
      },
      {
          "PRAGMA ignore_check_constraints",
          "ignore_check_constraints",
          ResultShape::kInteger,
          0,
          nullptr,
          ".07.SQLITE_PRAGMA.ignore_check_constraints.null",
      },
      {
          "PRAGMA wal_autocheckpoint",
          "wal_autocheckpoint",
          ResultShape::kInteger,
          0,
          nullptr,
          ".08.SQLITE_PRAGMA.wal_autocheckpoint.null",
      },
      {
          "PRAGMA fullfsync",
          "fullfsync",
          ResultShape::kInteger,
          1,
          nullptr,
          ".09.SQLITE_PRAGMA.fullfsync.null",
      },
      {
          "PRAGMA checkpoint_fullfsync",
          "checkpoint_fullfsync",
          ResultShape::kInteger,
          1,
          nullptr,
          ".10.SQLITE_PRAGMA.checkpoint_fullfsync.null",
      },
  };
  for (const PragmaRead& read : reads) {
    gCurrentStage = read.trace_suffix;
    if (!RunPragma(
            connection,
            read.sql,
            read.name,
            nullptr,
            read.shape,
            read.expected_integer,
            read.expected_text)) {
      return false;
    }
    trace->push_back(
        std::string(owner_name) + ".pragma.read." + phase +
        read.trace_suffix);
  }
  *attestation_count += 10;
  if (!InstallDefaultDeny(connection)) return false;
  trace->push_back(
      std::string(owner_name) + ".authorizer.default.after-" + phase +
      "-attest");
  return true;
}

bool AttestProtectedPragmas(
    ConnectionState* connection,
    const char* owner_name,
    const char* boundary,
    std::vector<std::string>* trace) {
  ResetAuthorizerExpectation(connection, AuthorizerMode::kPragma);
  if (!InstallAuthorizer(connection)) return false;
  trace->push_back(
      std::string(owner_name) + ".protected." + boundary +
      ".authorizer.install");

  struct ProtectedPragma {
    const char* sql;
    const char* name;
    int expected;
    const char* ordinal;
  };
  const ProtectedPragma pragmas[] = {
      {
          "PRAGMA foreign_keys",
          "foreign_keys",
          1,
          "01.SQLITE_PRAGMA.foreign_keys.null",
      },
      {
          "PRAGMA recursive_triggers",
          "recursive_triggers",
          1,
          "02.SQLITE_PRAGMA.recursive_triggers.null",
      },
      {
          "PRAGMA trusted_schema",
          "trusted_schema",
          0,
          "03.SQLITE_PRAGMA.trusted_schema.null",
      },
      {
          "PRAGMA secure_delete",
          "secure_delete",
          1,
          "04.SQLITE_PRAGMA.secure_delete.null",
      },
      {
          "PRAGMA ignore_check_constraints",
          "ignore_check_constraints",
          0,
          "05.SQLITE_PRAGMA.ignore_check_constraints.null",
      },
  };
  for (const ProtectedPragma& pragma : pragmas) {
    if (!RunPragma(
            connection,
            pragma.sql,
            pragma.name,
            nullptr,
            ResultShape::kInteger,
            pragma.expected,
            nullptr)) {
      return false;
    }
    trace->push_back(
        std::string(owner_name) + ".protected." + boundary + "." +
        pragma.ordinal);
  }
  if (!InstallDefaultDeny(connection)) return false;
  trace->push_back(
      std::string(owner_name) + ".protected." + boundary +
      ".authorizer.default");
  connection->protected_boundary_count += 1;
  connection->protected_pragma_read_count += 5;
  return true;
}

bool AttemptDefaultDeny(
    ConnectionState* connection,
    const char* sql,
    int expected_action,
    const char* expected_one,
    const char* expected_two,
    int* prepare_code) {
  ResetAuthorizerExpectation(
      connection,
      AuthorizerMode::kDefaultDeny,
      expected_one,
      expected_two,
      expected_action);
  sqlite3_stmt* statement = nullptr;
  *prepare_code = Prepare(connection, sql, &statement);
  const bool valid =
      *prepare_code == SQLITE_AUTH &&
      statement == nullptr &&
      connection->authorizer.statement_calls == 1 &&
      connection->authorizer.statement_denials == 1 &&
      !connection->authorizer.invalid;
  Finalize(connection, &statement);
  return InstallDefaultDeny(connection) && valid;
}

bool PrepareTransaction(
    ConnectionState* connection,
    const char* sql,
    const char* action,
    sqlite3_stmt** statement) {
  ResetAuthorizerExpectation(
      connection,
      AuthorizerMode::kTransaction,
      action);
  if (!InstallAuthorizer(connection)) return false;
  const int prepare_code = Prepare(connection, sql, statement);
  return
      prepare_code == SQLITE_OK &&
      *statement != nullptr &&
      connection->authorizer.statement_calls == 1 &&
      connection->authorizer.statement_denials == 0 &&
      !connection->authorizer.invalid;
}

bool RunSuccessfulTransactionStatement(
    ConnectionState* connection,
    const char* sql,
    const char* action,
    int* step_code,
    int* finalize_code) {
  sqlite3_stmt* statement = nullptr;
  if (!PrepareTransaction(connection, sql, action, &statement)) {
    Finalize(connection, &statement);
    InstallDefaultDeny(connection);
    return false;
  }
  *step_code = sqlite3_step(statement);
  *finalize_code = Finalize(connection, &statement);
  return
      InstallDefaultDeny(connection) &&
      *step_code == SQLITE_DONE &&
      *finalize_code == SQLITE_OK;
}

bool RunBusyFinalize(
    ConnectionState* connection,
    int* step_code,
    int* finalize_code) {
  sqlite3_stmt* statement = nullptr;
  if (!PrepareTransaction(
          connection,
          "BEGIN IMMEDIATE",
          "BEGIN",
          &statement)) {
    Finalize(connection, &statement);
    InstallDefaultDeny(connection);
    return false;
  }
  *step_code = sqlite3_step(statement);
  *finalize_code = Finalize(connection, &statement);
  return
      InstallDefaultDeny(connection) &&
      *step_code == SQLITE_BUSY &&
      *finalize_code == SQLITE_BUSY;
}

bool RunBusyReset(
    ConnectionState* connection,
    int* step_code,
    int* reset_code,
    int* finalize_code) {
  sqlite3_stmt* statement = nullptr;
  if (!PrepareTransaction(
          connection,
          "BEGIN IMMEDIATE",
          "BEGIN",
          &statement)) {
    Finalize(connection, &statement);
    InstallDefaultDeny(connection);
    return false;
  }
  *step_code = sqlite3_step(statement);
  *reset_code = sqlite3_reset(statement);
  *finalize_code = Finalize(connection, &statement);
  return
      InstallDefaultDeny(connection) &&
      *step_code == SQLITE_BUSY &&
      *reset_code == SQLITE_BUSY &&
      *finalize_code == SQLITE_OK;
}

bool RunActiveRebindMisuse(
    ConnectionState* connection,
    MatrixEvidence* evidence) {
  ResetAuthorizerExpectation(connection, AuthorizerMode::kSelect);
  if (!InstallAuthorizer(connection)) return false;

  sqlite3_stmt* statement = nullptr;
  if (
      Prepare(connection, "SELECT ?1", &statement) != SQLITE_OK ||
      statement == nullptr ||
      connection->authorizer.statement_calls != 1 ||
      connection->authorizer.statement_denials != 0 ||
      connection->authorizer.invalid ||
      sqlite3_bind_int64(statement, 1, 7) != SQLITE_OK) {
    Finalize(connection, &statement);
    InstallDefaultDeny(connection);
    return false;
  }

  evidence->active_rebind_step_code = sqlite3_step(statement);
  evidence->active_rebind_code = sqlite3_bind_int64(statement, 1, 8);
  evidence->active_rebind_finalize_code =
      Finalize(connection, &statement);
  return
      InstallDefaultDeny(connection) &&
      evidence->active_rebind_step_code == SQLITE_ROW &&
      evidence->active_rebind_code == SQLITE_MISUSE &&
      evidence->active_rebind_finalize_code == SQLITE_OK;
}

bool StatIdentity(int descriptor, FileIdentity* identity) {
  struct stat value {};
  if (fstat(descriptor, &value) != 0) return false;
  identity->device = value.st_dev;
  identity->inode = value.st_ino;
  identity->owner = value.st_uid;
  identity->mode = value.st_mode;
  identity->links = value.st_nlink;
  return true;
}

bool StatIdentityAt(
    int directory,
    const char* name,
    FileIdentity* identity) {
  struct stat value {};
  if (fstatat(directory, name, &value, AT_SYMLINK_NOFOLLOW) != 0) {
    return false;
  }
  identity->device = value.st_dev;
  identity->inode = value.st_ino;
  identity->owner = value.st_uid;
  identity->mode = value.st_mode;
  identity->links = value.st_nlink;
  return true;
}

bool IsAbsentAt(int directory, const char* name) {
  struct stat value {};
  errno = 0;
  return
      fstatat(directory, name, &value, AT_SYMLINK_NOFOLLOW) != 0 &&
      errno == ENOENT;
}

bool SameObject(const FileIdentity& left, const FileIdentity& right) {
  return
      left.device == right.device &&
      left.inode == right.inode &&
      left.owner == right.owner &&
      (left.mode & S_IFMT) == (right.mode & S_IFMT);
}

bool IsExactRoot(const FileIdentity& identity) {
  return
      S_ISDIR(identity.mode) &&
      identity.owner == geteuid() &&
      (identity.mode & 07777) == 0700;
}

bool IsExactDatabaseFile(const FileIdentity& identity) {
  return
      S_ISREG(identity.mode) &&
      identity.owner == geteuid() &&
      identity.links == 1 &&
      (identity.mode & 07777) == 0600;
}

bool IsExactRootPath(std::string* root_path) {
  char buffer[PATH_MAX];
  if (getcwd(buffer, sizeof(buffer)) == nullptr) return false;
  *root_path = buffer;
  const std::size_t slash = root_path->find_last_of('/');
  if (slash == std::string::npos || slash == root_path->size() - 1) {
    return false;
  }
  const std::string parent = root_path->substr(0, slash);
  const std::string basename = root_path->substr(slash + 1);
  return
      parent == kExpectedTempParent &&
      basename.size() > std::strlen(kRootPrefix) &&
      basename.compare(0, std::strlen(kRootPrefix), kRootPrefix) == 0 &&
      basename.find('/') == std::string::npos;
}

bool IsKnownOwnedName(const char* name) {
  return
      std::strcmp(name, kDatabaseName) == 0 ||
      std::strcmp(name, kWalName) == 0 ||
      std::strcmp(name, kShmName) == 0 ||
      std::strcmp(name, kJournalName) == 0;
}

enum class DirectoryState {
  kEmpty,
  kOwnedDatabase,
};

bool ScanDirectory(int root_descriptor, DirectoryState expected) {
  const int duplicate = dup(root_descriptor);
  if (duplicate < 0) return false;
  DIR* directory = fdopendir(duplicate);
  if (directory == nullptr) {
    close(duplicate);
    return false;
  }
  rewinddir(directory);
  bool valid = true;
  int entry_count = 0;
  bool main_present = false;
  errno = 0;
  while (dirent* entry = readdir(directory)) {
    if (
        std::strcmp(entry->d_name, ".") == 0 ||
        std::strcmp(entry->d_name, "..") == 0) {
      continue;
    }
    entry_count += 1;
    if (!IsKnownOwnedName(entry->d_name)) {
      valid = false;
      break;
    }
    if (std::strcmp(entry->d_name, kDatabaseName) == 0) {
      main_present = true;
    }
  }
  if (errno != 0) valid = false;
  if (closedir(directory) != 0) valid = false;
  if (expected == DirectoryState::kEmpty) {
    valid = valid && entry_count == 0;
  } else {
    valid = valid && main_present && entry_count >= 1 && entry_count <= 4;
  }
  return valid;
}

class MatrixRunner {
 public:
  MatrixRunner() = default;
  MatrixRunner(const MatrixRunner&) = delete;
  MatrixRunner& operator=(const MatrixRunner&) = delete;

  ~MatrixRunner() {
    BestEffortCleanup();
  }

  bool Run(std::string* json) {
    gCurrentStage = "sqlite-identity";
    if (
        std::strcmp(sqlite3_libversion(), kExpectedSqliteVersion) != 0 ||
        std::strcmp(sqlite3_sourceid(), kExpectedSqliteSourceId) != 0 ||
        !OpenOwnedFile() ||
        !OpenConnection(&owner_, "owner") ||
        !ConfigureConnection(
            &owner_,
            &evidence_,
            "owner",
            &operation_trace_) ||
        !AttestPragmas(
            &owner_,
            &evidence_.initial_attestation_count,
            "owner",
            "initial",
            &operation_trace_)) {
      return false;
    }
    if (
        !AttestProtectedPragmas(
            &owner_,
            "owner",
            "before-schema-auth",
            &operation_trace_) ||
        !AttemptDefaultDeny(
            &owner_,
            "CREATE TABLE forbidden(value INTEGER)",
            SQLITE_INSERT,
            "sqlite_master",
            nullptr,
            &evidence_.schema_prepare_code)) {
      return false;
    }
    operation_trace_.push_back(
        "owner.schema.prepare.SQLITE_INSERT.sqlite_master.null.AUTH");
    if (
        !AttestProtectedPragmas(
            &owner_,
            "owner",
            "after-schema-auth",
            &operation_trace_) ||
        !AttestProtectedPragmas(
            &owner_,
            "owner",
            "before-pragma-auth",
            &operation_trace_) ||
        !AttemptDefaultDeny(
            &owner_,
            "PRAGMA foreign_keys=OFF",
            SQLITE_PRAGMA,
            "foreign_keys",
            "OFF",
            &evidence_.pragma_mutation_prepare_code)) {
      return false;
    }
    operation_trace_.push_back(
        "owner.pragma-mutation.prepare.SQLITE_PRAGMA.foreign_keys.OFF.AUTH");
    if (
        !AttestProtectedPragmas(
            &owner_,
            "owner",
            "after-pragma-auth",
            &operation_trace_) ||
        !OpenConnection(&rival_, "rival") ||
        !ConfigureConnection(
            &rival_,
            &evidence_,
            "rival",
            &operation_trace_) ||
        !AttestPragmas(
            &rival_,
            &evidence_.initial_attestation_count,
            "rival",
            "initial",
            &operation_trace_) ||
        !AttestProtectedPragmas(
            &rival_,
            "rival",
            "before-rebind",
            &operation_trace_) ||
        !RunActiveRebindMisuse(&rival_, &evidence_)) {
      return false;
    }
    operation_trace_.push_back(
        "rival.rebind.SQLITE_SELECT.null.null.step.row");
    operation_trace_.push_back("rival.rebind.misuse");
    operation_trace_.push_back("rival.rebind.finalize");
    operation_trace_.push_back("rival.authorizer.default.after-rebind");
    if (
        !AttestProtectedPragmas(
            &rival_,
            "rival",
            "after-rebind",
            &operation_trace_) ||
        !AttestProtectedPragmas(
            &owner_,
            "owner",
            "before-begin",
            &operation_trace_) ||
        !RunSuccessfulTransactionStatement(
            &owner_,
            "BEGIN IMMEDIATE",
            "BEGIN",
            &evidence_.owner_begin_step_code,
            &evidence_.owner_begin_finalize_code)) {
      return false;
    }
    operation_trace_.push_back(
        "owner.transaction.SQLITE_TRANSACTION.BEGIN.null.done");
    operation_trace_.push_back("owner.authorizer.default.after-begin");
    if (
        !AttestProtectedPragmas(
            &owner_,
            "owner",
            "after-begin",
            &operation_trace_) ||
        !AttestProtectedPragmas(
            &rival_,
            "rival",
            "before-busy-finalize",
            &operation_trace_) ||
        !RunBusyFinalize(
            &rival_,
            &evidence_.rival_busy_step_code,
            &evidence_.rival_busy_finalize_code)) {
      return false;
    }
    operation_trace_.push_back(
        "rival.transaction.SQLITE_TRANSACTION.BEGIN.null.busy-finalize.step");
    operation_trace_.push_back(
        "rival.transaction.SQLITE_TRANSACTION.BEGIN.null.busy-finalize.finalize");
    operation_trace_.push_back(
        "rival.authorizer.default.after-busy-finalize");
    if (
        !AttestProtectedPragmas(
            &rival_,
            "rival",
            "after-busy-finalize",
            &operation_trace_) ||
        !AttestProtectedPragmas(
            &rival_,
            "rival",
            "before-busy-reset",
            &operation_trace_) ||
        !RunBusyReset(
            &rival_,
            &evidence_.rival_busy_reset_step_code,
            &evidence_.rival_busy_reset_code,
            &evidence_.rival_busy_reset_finalize_code)) {
      return false;
    }
    operation_trace_.push_back(
        "rival.transaction.SQLITE_TRANSACTION.BEGIN.null.busy-reset.step");
    operation_trace_.push_back(
        "rival.transaction.SQLITE_TRANSACTION.BEGIN.null.busy-reset.reset");
    operation_trace_.push_back(
        "rival.transaction.SQLITE_TRANSACTION.BEGIN.null.busy-reset.finalize");
    operation_trace_.push_back(
        "rival.authorizer.default.after-busy-reset");
    if (
        !AttestProtectedPragmas(
            &rival_,
            "rival",
            "after-busy-reset",
            &operation_trace_) ||
        !AttestProtectedPragmas(
            &owner_,
            "owner",
            "before-rollback",
            &operation_trace_) ||
        !RunSuccessfulTransactionStatement(
            &owner_,
            "ROLLBACK",
            "ROLLBACK",
            &evidence_.owner_rollback_step_code,
            &evidence_.owner_rollback_finalize_code)) {
      return false;
    }
    operation_trace_.push_back(
        "owner.transaction.SQLITE_TRANSACTION.ROLLBACK.null.done");
    operation_trace_.push_back("owner.authorizer.default.after-rollback");
    if (
        !AttestProtectedPragmas(
            &owner_,
            "owner",
            "after-rollback",
            &operation_trace_) ||
        !AttestProtectedPragmas(
            &rival_,
            "rival",
            "before-post-release-begin",
            &operation_trace_) ||
        !RunSuccessfulTransactionStatement(
            &rival_,
            "BEGIN IMMEDIATE",
            "BEGIN",
            &evidence_.post_release_begin_step_code,
            &evidence_.post_release_begin_finalize_code)) {
      return false;
    }
    operation_trace_.push_back(
        "rival.post-release.transaction.SQLITE_TRANSACTION.BEGIN.null.done");
    operation_trace_.push_back(
        "rival.authorizer.default.after-post-release-begin");
    if (
        !AttestProtectedPragmas(
            &rival_,
            "rival",
            "after-post-release-begin",
            &operation_trace_) ||
        !AttestProtectedPragmas(
            &rival_,
            "rival",
            "before-post-release-rollback",
            &operation_trace_) ||
        !RunSuccessfulTransactionStatement(
            &rival_,
            "ROLLBACK",
            "ROLLBACK",
            &evidence_.post_release_rollback_step_code,
            &evidence_.post_release_rollback_finalize_code)) {
      return false;
    }
    operation_trace_.push_back(
        "rival.post-release.transaction.SQLITE_TRANSACTION.ROLLBACK.null.done");
    operation_trace_.push_back(
        "rival.authorizer.default.after-post-release-rollback");
    if (
        !AttestProtectedPragmas(
            &rival_,
            "rival",
            "after-post-release-rollback",
            &operation_trace_) ||
        !AttestPragmas(
            &owner_,
            &evidence_.terminal_attestation_count,
            "owner",
            "terminal",
            &operation_trace_) ||
        !AttestPragmas(
            &rival_,
            &evidence_.terminal_attestation_count,
            "rival",
            "terminal",
            &operation_trace_) ||
        !AttestTerminalConnection(owner_) ||
        !AttestTerminalConnection(rival_)) {
      return false;
    }
    operation_trace_.push_back("connections.terminal.attest");
    if (
        !ExerciseCloseBusy() ||
        !CloseConnection(&owner_, "owner") ||
        !RevalidateOwnedFile()) {
      return false;
    }
    operation_trace_.push_back("database.identity.final");
    if (
        !AttestHeaderAndReadOnlyReopen() ||
        !RemoveExactOwnedObjects()) {
      return false;
    }
    gCurrentStage = "operation-trace";
    if (operation_trace_ != ExpectedOperationTrace()) {
      return false;
    }

    *json = BuildJson();
    CloseDescriptors();
    return true;
  }

 private:
  bool OpenOwnedFile() {
    gCurrentStage = "filesystem-root-path";
    std::string root_path;
    if (!IsExactRootPath(&root_path)) return false;

    gCurrentStage = "filesystem-root-descriptor";
    root_descriptor_ =
        open(".", O_RDONLY | O_DIRECTORY | O_NOFOLLOW | O_CLOEXEC);
    if (root_descriptor_ < 0) return false;
    operation_trace_.push_back("root.anchor.open");

    gCurrentStage = "filesystem-root-identity";
    FileIdentity root_identity;
    if (!StatIdentity(root_descriptor_, &root_identity) ||
        !IsExactRoot(root_identity)) {
      return false;
    }

    gCurrentStage = "filesystem-root-path-identity";
    FileIdentity root_path_identity;
    if (!StatIdentityAt(AT_FDCWD, ".", &root_path_identity) ||
        !SameObject(root_identity, root_path_identity)) {
      return false;
    }
    operation_trace_.push_back("root.identity.attest");
    gCurrentStage = "filesystem-root-empty";
    if (!ScanDirectory(root_descriptor_, DirectoryState::kEmpty)) {
      return false;
    }
    operation_trace_.push_back("root.empty.precreate");

    gCurrentStage = "filesystem-database-create";
    anchor_descriptor_ = openat(
        root_descriptor_,
        kDatabaseName,
        O_CREAT | O_EXCL | O_RDWR | O_NOFOLLOW | O_CLOEXEC,
        0600);
    if (anchor_descriptor_ < 0) return false;
    gCurrentStage = "filesystem-database-descriptor-identity";
    if (fchmod(anchor_descriptor_, 0600) != 0 ||
        !StatIdentity(anchor_descriptor_, &database_identity_) ||
        !IsExactDatabaseFile(database_identity_)) {
      return false;
    }
    operation_trace_.push_back("database.create.exclusive");

    gCurrentStage = "filesystem-database-path-identity";
    FileIdentity path_identity;
    if (!StatIdentityAt(root_descriptor_, kDatabaseName, &path_identity) ||
        !IsExactDatabaseFile(path_identity) ||
        !SameObject(database_identity_, path_identity)) {
      return false;
    }
    operation_trace_.push_back("database.identity.attest");

    gCurrentStage = "filesystem-owned-scan";
    expected_database_path_ = root_path + "/" + kDatabaseName;
    return ScanDirectory(
        root_descriptor_,
        DirectoryState::kOwnedDatabase);
  }

  bool OpenConnection(
      ConnectionState* connection,
      const char* owner_name) {
    gCurrentStage =
        std::strcmp(owner_name, "owner") == 0
            ? "owner-open"
            : "rival-open";
    constexpr int kOpenFlags =
        SQLITE_OPEN_READWRITE |
        SQLITE_OPEN_NOMUTEX |
        SQLITE_OPEN_PRIVATECACHE |
        SQLITE_OPEN_NOFOLLOW |
        SQLITE_OPEN_EXRESCODE;
    if (sqlite3_open_v2(
            kDatabaseName,
            &connection->db,
            kOpenFlags,
            nullptr) != SQLITE_OK ||
        connection->db == nullptr) {
      return false;
    }
    const char* opened_name = sqlite3_db_filename(connection->db, "main");
    const bool valid =
        opened_name != nullptr &&
        expected_database_path_ == opened_name &&
        sqlite3_db_readonly(connection->db, "main") == 0 &&
        sqlite3_get_autocommit(connection->db) == 1 &&
        sqlite3_txn_state(connection->db, "main") == SQLITE_TXN_NONE &&
        RevalidateOwnedFile();
    if (valid) {
      operation_trace_.push_back(
          std::string(owner_name) + ".sqlite.open");
    }
    return valid;
  }

  bool RevalidateOwnedFile() {
    if (root_descriptor_ < 0 || anchor_descriptor_ < 0) return false;
    FileIdentity descriptor_identity;
    FileIdentity path_identity;
    return
        StatIdentity(anchor_descriptor_, &descriptor_identity) &&
        StatIdentityAt(root_descriptor_, kDatabaseName, &path_identity) &&
        IsExactDatabaseFile(descriptor_identity) &&
        IsExactDatabaseFile(path_identity) &&
        SameObject(database_identity_, descriptor_identity) &&
        SameObject(database_identity_, path_identity);
  }

  bool AttestHeaderAndReadOnlyReopen() {
    gCurrentStage = "readonly-reopen";
    unsigned char header[16] = {};
    constexpr unsigned char kExpectedHeader[16] = {
        'S', 'Q', 'L', 'i', 't', 'e', ' ', 'f',
        'o', 'r', 'm', 'a', 't', ' ', '3', 0,
    };
    if (
        pread(anchor_descriptor_, header, sizeof(header), 0) !=
            static_cast<ssize_t>(sizeof(header)) ||
        std::memcmp(header, kExpectedHeader, sizeof(header)) != 0 ||
        !RevalidateOwnedFile()) {
      return false;
    }
    operation_trace_.push_back("database.header.attest");

    ConnectionState read_only;
    constexpr int kReadOnlyFlags =
        SQLITE_OPEN_READONLY |
        SQLITE_OPEN_NOMUTEX |
        SQLITE_OPEN_PRIVATECACHE |
        SQLITE_OPEN_NOFOLLOW |
        SQLITE_OPEN_EXRESCODE;
    if (
        sqlite3_open_v2(
            kDatabaseName,
            &read_only.db,
            kReadOnlyFlags,
            nullptr) != SQLITE_OK ||
        read_only.db == nullptr) {
      if (read_only.db != nullptr) sqlite3_close_v2(read_only.db);
      return false;
    }
    const char* opened_name = sqlite3_db_filename(read_only.db, "main");
    if (
        opened_name == nullptr ||
        expected_database_path_ != opened_name ||
        sqlite3_db_readonly(read_only.db, "main") != 1 ||
        sqlite3_extended_result_codes(read_only.db, 1) != SQLITE_OK ||
        sqlite3_busy_timeout(read_only.db, 0) != SQLITE_OK ||
        !RevalidateOwnedFile()) {
      sqlite3_close_v2(read_only.db);
      return false;
    }
    operation_trace_.push_back("readonly.sqlite.open");

    int configured = -1;
    sqlite3_limit(read_only.db, SQLITE_LIMIT_ATTACHED, 0);
    if (
        sqlite3_db_config(
            read_only.db,
            SQLITE_DBCONFIG_ENABLE_LOAD_EXTENSION,
            0,
            &configured) != SQLITE_OK ||
        configured != 0 ||
        sqlite3_db_config(
            read_only.db,
            SQLITE_DBCONFIG_DEFENSIVE,
            1,
            &configured) != SQLITE_OK ||
        configured != 1 ||
        sqlite3_db_config(
            read_only.db,
            SQLITE_DBCONFIG_TRUSTED_SCHEMA,
            0,
            &configured) != SQLITE_OK ||
        configured != 0 ||
        read_only.prepare_count != 0) {
      sqlite3_close_v2(read_only.db);
      return false;
    }
    ResetAuthorizerExpectation(&read_only, AuthorizerMode::kPragma);
    if (!InstallAuthorizer(&read_only)) {
      sqlite3_close_v2(read_only.db);
      return false;
    }
    read_only.authorizer_installed_before_first_prepare = true;
    operation_trace_.push_back("readonly.authorizer.install");

    if (!RunPragma(
            &read_only,
            "PRAGMA query_only=ON",
            "query_only",
            "ON",
            ResultShape::kNoRows,
            0,
            nullptr)) {
      sqlite3_close_v2(read_only.db);
      return false;
    }
    operation_trace_.push_back(
        "readonly.query-only.set.SQLITE_PRAGMA.query_only.ON");
    if (!RunPragma(
            &read_only,
            "PRAGMA query_only",
            "query_only",
            nullptr,
            ResultShape::kInteger,
            1,
            nullptr)) {
      sqlite3_close_v2(read_only.db);
      return false;
    }
    operation_trace_.push_back(
        "readonly.query-only.attest.SQLITE_PRAGMA.query_only.null");
    if (!RunPragma(
            &read_only,
            "PRAGMA journal_mode",
            "journal_mode",
            nullptr,
            ResultShape::kText,
            0,
            "wal")) {
      sqlite3_close_v2(read_only.db);
      return false;
    }
    operation_trace_.push_back(
        "readonly.journal-mode.attest.SQLITE_PRAGMA.journal_mode.null");
    if (!InstallDefaultDeny(&read_only)) {
      sqlite3_close_v2(read_only.db);
      return false;
    }
    operation_trace_.push_back("readonly.authorizer.default");
    if (
        sqlite3_total_changes64(read_only.db) != 0 ||
        sqlite3_get_autocommit(read_only.db) != 1 ||
        sqlite3_txn_state(read_only.db, "main") != SQLITE_TXN_NONE ||
        sqlite3_next_stmt(read_only.db, nullptr) != nullptr ||
        read_only.created_statement_count !=
            read_only.finalized_statement_count) {
      sqlite3_close_v2(read_only.db);
      return false;
    }
    operation_trace_.push_back("readonly.zero-change.attest");
    const int close_status = sqlite3_close(read_only.db);
    read_only.db = nullptr;
    if (close_status != SQLITE_OK) return false;
    operation_trace_.push_back("readonly.close");
    return RevalidateOwnedFile();
  }

  bool AttestTerminalConnection(const ConnectionState& connection) {
    return
        connection.db != nullptr &&
        connection.authorizer.mode == AuthorizerMode::kDefaultDeny &&
        connection.authorizer.statement_calls == 0 &&
        !connection.authorizer.invalid &&
        connection.authorizer_installed_before_first_prepare &&
        connection.created_statement_count ==
            connection.finalized_statement_count &&
        sqlite3_get_autocommit(connection.db) == 1 &&
        sqlite3_txn_state(connection.db, "main") == SQLITE_TXN_NONE &&
        sqlite3_next_stmt(connection.db, nullptr) == nullptr;
  }

  bool ExerciseCloseBusy() {
    gCurrentStage = "close-busy";
    if (!AttestProtectedPragmas(
            &rival_,
            "rival",
            "before-close-busy",
            &operation_trace_)) {
      return false;
    }
    ResetAuthorizerExpectation(&rival_, AuthorizerMode::kSelect);
    if (!InstallAuthorizer(&rival_)) return false;
    sqlite3_stmt* statement = nullptr;
    if (
        Prepare(&rival_, "SELECT 1", &statement) != SQLITE_OK ||
        statement == nullptr ||
        rival_.authorizer.statement_calls != 1 ||
        rival_.authorizer.statement_denials != 0 ||
        rival_.authorizer.invalid) {
      Finalize(&rival_, &statement);
      InstallDefaultDeny(&rival_);
      return false;
    }
    if (!InstallDefaultDeny(&rival_)) {
      Finalize(&rival_, &statement);
      return false;
    }
    operation_trace_.push_back(
        "rival.close-busy.prepare.SQLITE_SELECT.null.null");
    operation_trace_.push_back(
        "rival.authorizer.default.before-close-busy");
    evidence_.close_busy_code = sqlite3_close(rival_.db);
    operation_trace_.push_back("rival.close.busy");
    evidence_.close_busy_finalize_code = Finalize(&rival_, &statement);
    operation_trace_.push_back("rival.close.statement.finalize");
    if (!AttestProtectedPragmas(
            &rival_,
            "rival",
            "after-close-busy",
            &operation_trace_)) {
      return false;
    }
    evidence_.close_recovery_code = sqlite3_close(rival_.db);
    operation_trace_.push_back("rival.close.recovery");
    if (
        evidence_.close_busy_code != SQLITE_BUSY ||
        evidence_.close_busy_finalize_code != SQLITE_OK ||
        evidence_.close_recovery_code != SQLITE_OK) {
      return false;
    }
    rival_.db = nullptr;
    return true;
  }

  bool CloseConnection(
      ConnectionState* connection,
      const char* owner_name) {
    if (connection->db == nullptr) return true;
    const int status = sqlite3_close(connection->db);
    if (status != SQLITE_OK) return false;
    connection->db = nullptr;
    operation_trace_.push_back(std::string(owner_name) + ".close");
    if (owner_.db == nullptr && rival_.db == nullptr) {
      operation_trace_.push_back("connections.close.complete");
    }
    return true;
  }

  bool ValidateSidecar(
      const char* name,
      bool* present,
      FileIdentity* identity) {
    if (!StatIdentityAt(root_descriptor_, name, identity)) {
      if (errno == ENOENT) {
        *present = false;
        return true;
      }
      return false;
    }
    *present = true;
    return IsExactDatabaseFile(*identity);
  }

  bool QuarantineAndUnlink(
      const char* name,
      const char* quarantine_name,
      bool expected_present,
      const FileIdentity& expected_identity) {
    if (!expected_present) {
      return
          IsAbsentAt(root_descriptor_, name) &&
          IsAbsentAt(root_descriptor_, quarantine_name);
    }

    FileIdentity current_identity;
    if (
        !StatIdentityAt(
            root_descriptor_,
            name,
            &current_identity) ||
        !IsExactDatabaseFile(current_identity) ||
        !SameObject(expected_identity, current_identity) ||
        !IsAbsentAt(root_descriptor_, quarantine_name) ||
        renameatx_np(
            root_descriptor_,
            name,
            root_descriptor_,
            quarantine_name,
            RENAME_EXCL) != 0) {
      return false;
    }

    FileIdentity quarantine_identity;
    if (
        !StatIdentityAt(
            root_descriptor_,
            quarantine_name,
            &quarantine_identity) ||
        !IsExactDatabaseFile(quarantine_identity) ||
        !SameObject(expected_identity, quarantine_identity) ||
        !IsAbsentAt(root_descriptor_, name)) {
      return false;
    }
    if (unlinkat(root_descriptor_, quarantine_name, 0) != 0) {
      return false;
    }
    return
        IsAbsentAt(root_descriptor_, quarantine_name) &&
        IsAbsentAt(root_descriptor_, name);
  }

  bool RemoveExactOwnedObjects() {
    gCurrentStage = "filesystem-remove-scan";
    if (
        !ScanDirectory(
            root_descriptor_,
            DirectoryState::kOwnedDatabase) ||
        !RevalidateOwnedFile()) {
      return false;
    }

    struct Sidecar {
      const char* name;
      const char* quarantine_name;
      bool present = false;
      FileIdentity identity;
    };
    Sidecar sidecars[] = {
        {kWalName, kWalQuarantineName},
        {kShmName, kShmQuarantineName},
        {kJournalName, kJournalQuarantineName},
    };
    gCurrentStage = "filesystem-sidecar-validate";
    for (Sidecar& sidecar : sidecars) {
      if (!ValidateSidecar(
              sidecar.name,
              &sidecar.present,
              &sidecar.identity)) {
        return false;
      }
    }
    operation_trace_.push_back("sidecars.identity.validate");
    gCurrentStage = "filesystem-sidecar-unlink";
    for (const Sidecar& sidecar : sidecars) {
      if (!QuarantineAndUnlink(
              sidecar.name,
              sidecar.quarantine_name,
              sidecar.present,
              sidecar.identity)) {
        return false;
      }
    }
    operation_trace_.push_back("sidecars.unlink");

    gCurrentStage = "filesystem-main-unlink";
    FileIdentity final_descriptor_identity;
    FileIdentity final_path_identity;
    if (
        !StatIdentity(anchor_descriptor_, &final_descriptor_identity) ||
        !StatIdentityAt(
            root_descriptor_,
            kDatabaseName,
            &final_path_identity) ||
        !SameObject(database_identity_, final_descriptor_identity) ||
        !SameObject(database_identity_, final_path_identity) ||
        !IsExactDatabaseFile(final_descriptor_identity) ||
        !IsExactDatabaseFile(final_path_identity) ||
        !QuarantineAndUnlink(
            kDatabaseName,
            kDatabaseQuarantineName,
            true,
            database_identity_)) {
      return false;
    }
    operation_trace_.push_back("database.unlink");

    FileIdentity unlinked_descriptor_identity;
    if (
        !StatIdentity(
            anchor_descriptor_,
            &unlinked_descriptor_identity) ||
        !SameObject(
            database_identity_,
            unlinked_descriptor_identity) ||
        unlinked_descriptor_identity.owner != geteuid() ||
        !S_ISREG(unlinked_descriptor_identity.mode) ||
        (unlinked_descriptor_identity.mode & 07777) != 0600 ||
        unlinked_descriptor_identity.links != 0) {
      return false;
    }
    gCurrentStage = "filesystem-directory-fsync";
    if (fsync(root_descriptor_) != 0) return false;
    operation_trace_.push_back("directory.fsync");
    gCurrentStage = "filesystem-empty-scan";
    if (!ScanDirectory(root_descriptor_, DirectoryState::kEmpty)) {
      return false;
    }
    operation_trace_.push_back("owned.empty.scan");
    return true;
  }

  std::string BuildJson() const {
    std::string json;
    json.reserve(4096);
    json +=
        "{\"format\":\"brain-s28-disposable-file-factory-native-matrix-v1\","
        "\"readinessClaim\":\"none\","
        "\"disposableOnly\":true,"
        "\"nominalDisposableFileFactoryMatrixSatisfied\":true,"
        "\"routeSucceeded\":true,"
        "\"oracleSatisfied\":true,"
        "\"adversarialCoverage\":{"
        "\"hostileFilesystem\":false,"
        "\"injectedFilesystemFaults\":false,"
        "\"injectedSqliteFaults\":false,"
        "\"abruptExitRestart\":false},"
        "\"sqliteVersion\":\"";
    json += kExpectedSqliteVersion;
    json += "\",\"sqliteSourceId\":\"";
    json += kExpectedSqliteSourceId;
    json +=
        "\",\"filesystem\":{"
        "\"rootMode\":448,"
        "\"databaseMode\":384,"
        "\"ownerUidAttested\":true,"
        "\"singleLinkAttested\":true,"
        "\"descriptorRelativeCreate\":true,"
        "\"sqliteNoFollowOpen\":true,"
        "\"pathAnchorIdentityStable\":true,"
        "\"headerAttested\":true,"
        "\"readOnlyReopenAttested\":true,"
        "\"sidecarsValidated\":true,"
        "\"exactOwnedObjectsRemoved\":true},"
        "\"pragmas\":{"
        "\"journalMode\":\"wal\","
        "\"foreignKeys\":1,"
        "\"recursiveTriggers\":1,"
        "\"trustedSchema\":0,"
        "\"secureDelete\":1,"
        "\"synchronous\":2,"
        "\"ignoreCheckConstraints\":0,"
        "\"walAutocheckpoint\":0,"
        "\"fullfsync\":1,"
        "\"checkpointFullfsync\":1},"
        "\"authorizer\":{"
        "\"installedBeforeFirstPrepare\":true,"
        "\"bootstrapPragmaCount\":";
    json += std::to_string(evidence_.bootstrap_pragma_count);
    json += ",\"initialAttestationCount\":";
    json += std::to_string(evidence_.initial_attestation_count);
    json += ",\"terminalAttestationCount\":";
    json += std::to_string(evidence_.terminal_attestation_count);
    json += ",\"protectedBoundaryCount\":";
    json += std::to_string(
        owner_.protected_boundary_count +
        rival_.protected_boundary_count);
    json += ",\"protectedPragmaReadCount\":";
    json += std::to_string(
        owner_.protected_pragma_read_count +
        rival_.protected_pragma_read_count);
    json += ",\"schemaPrepareCode\":";
    json += std::to_string(evidence_.schema_prepare_code);
    json += ",\"pragmaMutationPrepareCode\":";
    json += std::to_string(evidence_.pragma_mutation_prepare_code);
    json +=
        ",\"defaultDenyRestored\":true},"
        "\"writerLock\":{"
        "\"ownerBeginStepCode\":";
    json += std::to_string(evidence_.owner_begin_step_code);
    json += ",\"ownerBeginFinalizeCode\":";
    json += std::to_string(evidence_.owner_begin_finalize_code);
    json += ",\"rivalBusyStepCode\":";
    json += std::to_string(evidence_.rival_busy_step_code);
    json += ",\"rivalBusyFinalizeCode\":";
    json += std::to_string(evidence_.rival_busy_finalize_code);
    json += ",\"rivalBusyResetStepCode\":";
    json += std::to_string(evidence_.rival_busy_reset_step_code);
    json += ",\"rivalBusyResetCode\":";
    json += std::to_string(evidence_.rival_busy_reset_code);
    json += ",\"rivalBusyResetFinalizeCode\":";
    json += std::to_string(evidence_.rival_busy_reset_finalize_code);
    json += ",\"ownerRollbackStepCode\":";
    json += std::to_string(evidence_.owner_rollback_step_code);
    json += ",\"ownerRollbackFinalizeCode\":";
    json += std::to_string(evidence_.owner_rollback_finalize_code);
    json += ",\"postReleaseBeginStepCode\":";
    json += std::to_string(evidence_.post_release_begin_step_code);
    json += ",\"postReleaseBeginFinalizeCode\":";
    json += std::to_string(evidence_.post_release_begin_finalize_code);
    json += ",\"postReleaseRollbackStepCode\":";
    json += std::to_string(evidence_.post_release_rollback_step_code);
    json += ",\"postReleaseRollbackFinalizeCode\":";
    json += std::to_string(evidence_.post_release_rollback_finalize_code);
    json +=
        "},\"lifecycle\":{"
        "\"connectionsOpened\":3,"
        "\"allStatementsFinalized\":true,"
        "\"ownerRolledBack\":true,"
        "\"rivalReleased\":true,"
        "\"allConnectionsClosed\":true,"
        "\"autocommitRestored\":true,"
        "\"transactionStateNone\":true,"
        "\"cleanupComplete\":true},"
        "\"operationTrace\":[";
    for (std::size_t index = 0; index < operation_trace_.size(); index += 1) {
      if (index != 0) json += ",";
      json += "\"";
      json += operation_trace_[index];
      json += "\"";
    }
    json +=
        "],\"faults\":{"
        "\"activeRebindStepCode\":";
    json += std::to_string(evidence_.active_rebind_step_code);
    json += ",\"activeRebindCode\":";
    json += std::to_string(evidence_.active_rebind_code);
    json += ",\"activeRebindFinalizeCode\":";
    json += std::to_string(evidence_.active_rebind_finalize_code);
    json += ",\"closeBusyCode\":";
    json += std::to_string(evidence_.close_busy_code);
    json += ",\"closeBusyFinalizeCode\":";
    json += std::to_string(evidence_.close_busy_finalize_code);
    json += ",\"closeRecoveryCode\":";
    json += std::to_string(evidence_.close_recovery_code);
    json +=
        "},\"rawDatabaseReturned\":false,"
        "\"artifactPathsReturned\":false,"
        "\"processIdentifiersReturned\":false,"
        "\"reusableHandleReturned\":false,"
        "\"checkpointCoordinatorAuthority\":false,"
        "\"migration028Authority\":false,"
        "\"productionAuthority\":false,"
        "\"s28ReadinessProven\":false,"
        "\"implementationGoProven\":false}";
    return json;
  }

  void BestEffortCleanup() {
    if (rival_.db != nullptr) {
      sqlite3_close_v2(rival_.db);
      rival_.db = nullptr;
    }
    if (owner_.db != nullptr) {
      sqlite3_close_v2(owner_.db);
      owner_.db = nullptr;
    }
    CloseDescriptors();
  }

  void CloseDescriptors() {
    if (anchor_descriptor_ >= 0) {
      close(anchor_descriptor_);
      anchor_descriptor_ = -1;
    }
    if (root_descriptor_ >= 0) {
      close(root_descriptor_);
      root_descriptor_ = -1;
    }
  }

  int root_descriptor_ = -1;
  int anchor_descriptor_ = -1;
  FileIdentity database_identity_;
  std::string expected_database_path_;
  ConnectionState owner_;
  ConnectionState rival_;
  MatrixEvidence evidence_;
  std::vector<std::string> operation_trace_;
};

v8::Local<v8::String> StringFromUtf8(
    v8::Isolate* isolate,
    const char* value) {
  return v8::String::NewFromUtf8(
             isolate,
             value,
             v8::NewStringType::kNormal)
      .ToLocalChecked();
}

void ThrowTypeError(v8::Isolate* isolate, const char* message) {
  isolate->ThrowException(
      v8::Exception::TypeError(StringFromUtf8(isolate, message)));
}

void ThrowError(v8::Isolate* isolate, const char* message) {
  isolate->ThrowException(
      v8::Exception::Error(StringFromUtf8(isolate, message)));
}

void RunDisposableFileFactoryMatrix(
    const v8::FunctionCallbackInfo<v8::Value>& info) {
  v8::Isolate* isolate = info.GetIsolate();
  if (info.Length() != 0) {
    ThrowTypeError(
        isolate,
        "Disposable file factory matrix accepts zero arguments");
    return;
  }

  MatrixRunner runner;
  std::string json;
  if (!runner.Run(&json) || json.size() > 65536) {
    const std::string message =
        std::string("Disposable file factory native matrix refused at ") +
        gCurrentStage;
    ThrowError(isolate, message.c_str());
    return;
  }
  info.GetReturnValue().Set(StringFromUtf8(isolate, json.c_str()));
}

}  // namespace

NODE_MODULE_INIT(/* exports, context */) {
  v8::Isolate* isolate = context->GetIsolate();
  v8::HandleScope scope(isolate);
  v8::Local<v8::Function> function =
      v8::FunctionTemplate::New(isolate, RunDisposableFileFactoryMatrix)
          ->GetFunction(context)
          .ToLocalChecked();
  function->SetName(
      StringFromUtf8(isolate, "runDisposableFileFactoryMatrix"));
  function->SetIntegrityLevel(context, v8::IntegrityLevel::kFrozen).Check();
  exports
      ->DefineOwnProperty(
          context,
          StringFromUtf8(isolate, "runDisposableFileFactoryMatrix"),
          function,
          static_cast<v8::PropertyAttribute>(
              v8::ReadOnly | v8::DontDelete))
      .Check();
  exports->SetIntegrityLevel(context, v8::IntegrityLevel::kFrozen).Check();
}
