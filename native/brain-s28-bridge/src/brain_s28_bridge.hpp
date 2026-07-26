#ifndef BRAIN_S28_DISPOSABLE_BRIDGE_HPP
#define BRAIN_S28_DISPOSABLE_BRIDGE_HPP

#include <sqlite3.h>
#include <v8.h>

// This bridge is a disposable feasibility probe. It is not an S28 readiness
// implementation and deliberately refuses every file-backed connection.
int S28InstallDisposableBridge(sqlite3* db_handle);

// Reinstalls the permanent public-surface deny policy after a closed native
// probe temporarily applies its purpose-specific authorizer.
int S28RestoreDisposableDefaultAuthorizer(sqlite3* db_handle);

// The only native probe surface accepts a closed scenario enum. It never
// accepts caller-supplied SQL, role definitions, callbacks, or file paths.
void S28DisposableBridgeProbe(
    const v8::FunctionCallbackInfo<v8::Value>& info);

#endif
