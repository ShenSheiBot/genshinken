export function topicMembershipNumber(groupNumber: string, itemIndex: number): string {
  if (groupNumber === "00" && itemIndex === 0) return "00";
  return String(itemIndex + 1).padStart(2, "0");
}
