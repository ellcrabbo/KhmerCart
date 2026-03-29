import type { AppId } from "./apps";

export type DependencyState = "down" | "skipped" | "up";

export type DependencyReport = {
  detail: string;
  status: DependencyState;
};

export type DependencyHealth = Record<string, DependencyReport>;

export type HealthPayload = {
  app: AppId;
  dependencies: DependencyHealth;
  status: "DEGRADED" | "OK";
  timestamp: string;
};

export function createHealthPayload(
  app: AppId,
  dependencies: DependencyHealth = {}
): HealthPayload {
  const hasFailure = Object.values(dependencies).some(
    (dependency) => dependency.status === "down"
  );

  return {
    app,
    dependencies,
    status: hasFailure ? "DEGRADED" : "OK",
    timestamp: new Date().toISOString()
  };
}
