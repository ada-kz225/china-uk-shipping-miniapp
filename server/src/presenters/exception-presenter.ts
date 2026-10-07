import type { DomainException } from "../domain/index.js";

export type ActiveExceptionDto = {
  title: string;
  description: string;
  impact: string;
  requiredAction: string;
  progress: string;
  support: string;
};

/** Produces only user-facing Chinese exception information. */
export function presentActiveException(
  exception: DomainException
): ActiveExceptionDto {
  return {
    title: exception.title,
    description: exception.description,
    impact: exception.impact,
    requiredAction: exception.requiredAction,
    progress: progressFor(exception.type),
    support: "如需帮助，请联系人工客服。"
  };
}

function progressFor(type: string): string {
  const progressByType: Record<string, string> = {
    PACKAGE_MATCHING_UNCONFIRMED: "等待信息确认。",
    PACKAGE_MATCHING: "等待信息确认。",
    UK_LAST_MILE_INFORMATION_PENDING: "正在核实英国末端派送信息。",
    UK_LAST_MILE_DELAY: "正在核实英国末端派送信息。"
  };

  return progressByType[type] ?? "正在处理中。";
}
