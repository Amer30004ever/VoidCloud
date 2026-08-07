import { redirect } from "next/navigation";

/**
 * `/voidcloud/agent` previously 404'd — the agent role only had child routes.
 * Send agents straight to their dashboard so the role root behaves like the
 * tenant, business, and admin roots do.
 */
export default function AgentIndex() {
  redirect("/voidcloud/agent/dashboard");
}
