import type { PropertyFilterProps } from "@cloudscape-design/components/property-filter";
import type { Deployment } from "../api/types";

export function matchesToken(
  deployment: Deployment,
  token: PropertyFilterProps.Token,
): boolean {
  const { propertyKey, operator, value } = token;

  if (!propertyKey) {
    // Free-text search — match against name
    const name = deployment.name.toLowerCase();
    const v = value.toLowerCase();
    return name.includes(v);
  }

  let fieldValue: string;
  if (propertyKey === "tag") {
    // Tag filter: value format is "key=value" or just "value" that matches any tag
    const tagStr = Object.entries(deployment.tags)
      .map(([k, v]) => `${k}=${v}`)
      .join(" ");
    fieldValue = tagStr.toLowerCase();
    const v = value.toLowerCase();
    switch (operator) {
      case "=":
        return fieldValue.includes(v);
      case "!=":
        return !fieldValue.includes(v);
      case ":":
        return fieldValue.includes(v);
      case "!:":
        return !fieldValue.includes(v);
      default:
        return true;
    }
  }

  fieldValue = (deployment[propertyKey as keyof Deployment] as string) ?? "";

  switch (operator) {
    case "=":
      return fieldValue === value;
    case "!=":
      return fieldValue !== value;
    case ":":
      return fieldValue.toLowerCase().includes(value.toLowerCase());
    case "!:":
      return !fieldValue.toLowerCase().includes(value.toLowerCase());
    default:
      return true;
  }
}

export function matchesQuery(
  deployment: Deployment,
  query: PropertyFilterProps.Query,
): boolean {
  const { tokens, operation } = query;
  if (tokens.length === 0) return true;

  if (operation === "and") {
    return tokens.every((t) => matchesToken(deployment, t));
  }
  return tokens.some((t) => matchesToken(deployment, t));
}
