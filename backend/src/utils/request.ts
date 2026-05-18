export function getBody(value: unknown): Record<string, unknown> {
  if (!isObject(value) || Array.isArray(value)) {
    return {};
  }

  return value;
}

export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
