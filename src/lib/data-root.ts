import { dirname, isAbsolute, resolve } from "node:path";

export function brainDataRoot(
  env: Readonly<Record<string, string | undefined>> = process.env,
  cwd: string = process.cwd(),
): string {
  const databasePath = env.BRAIN_DB_PATH?.trim();
  if (databasePath && isAbsolute(databasePath)) {
    return dirname(resolve(databasePath));
  }
  return resolve(cwd, "data");
}

export function brainDataPath(...segments: string[]): string {
  return resolve(brainDataRoot(), ...segments);
}
