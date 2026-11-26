export function validAiAdminUsername(username: string | undefined): boolean {
  return username === undefined || username.trim().toLowerCase() === "ahmed";
}

export function mayDisableAiAccount(actorId: string, targetId: string, targetEmail: string | undefined): boolean {
  return actorId !== targetId && targetEmail?.toLowerCase() !== "a0552525337@gmail.com";
}