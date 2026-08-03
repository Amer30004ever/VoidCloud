export interface DocEntry {
  id: string;
  title: string;
  summary: string;
  tags: string[];
  href: string;
}

export interface ChecklistStep {
  id: string;
  title: string;
  hint?: string;
}

export interface ChecklistTemplate {
  id: string;
  title: string;
  summary: string;
  category: string;
  tags: string[];
  steps: ChecklistStep[];
}

export interface CertEntry {
  id: string;
  title: string;
  summary: string;
  tags: string[];
  href: string;
}

export const LEARNING_DOCS: DocEntry[] = [
  {
    id: "doc-k8s-basics",
    title: "Kubernetes fundamentals",
    summary: "Namespaces, pods, deployments, services and how the cluster dashboard maps to them.",
    tags: ["kubernetes", "cluster", "pods"],
    href: "/docs/kubernetes",
  },
  {
    id: "doc-cicd",
    title: "CI/CD with GitHub Actions",
    summary: "Workflow anatomy, triggers, secrets and reusable jobs for the pipeline builder.",
    tags: ["ci/cd", "github actions", "pipelines"],
    href: "/pipelines",
  },
  {
    id: "doc-observability",
    title: "Observability and alerting",
    summary: "Metrics, logs and traces: what to collect first and which alerts actually page you.",
    tags: ["monitoring", "logs", "alerts"],
    href: "/monitoring",
  },
  {
    id: "doc-iac",
    title: "Infrastructure as Code",
    summary: "Terraform and Helm patterns for reproducible environments.",
    tags: ["terraform", "helm", "iac"],
    href: "/docs/iac",
  },
  {
    id: "doc-security",
    title: "Platform security baseline",
    summary: "RBAC, secret rotation, image scanning and audit logging expectations.",
    tags: ["security", "rbac", "secrets"],
    href: "/security",
  },
  {
    id: "doc-incident",
    title: "Incident response playbook",
    summary: "Severity levels, comms, mitigation and blameless postmortems.",
    tags: ["incidents", "sre", "postmortem"],
    href: "/incidents",
  },
];

export const LEARNING_CERTS: CertEntry[] = [
  {
    id: "cert-cka",
    title: "CKA — Certified Kubernetes Administrator",
    summary: "Cluster architecture, workloads, networking, storage and troubleshooting.",
    tags: ["kubernetes", "certification"],
    href: "/learning/certifications",
  },
  {
    id: "cert-ckad",
    title: "CKAD — Certified Kubernetes Application Developer",
    summary: "Application design, config, observability and deployment on Kubernetes.",
    tags: ["kubernetes", "certification"],
    href: "/learning/certifications",
  },
  {
    id: "cert-terraform",
    title: "HashiCorp Certified: Terraform Associate",
    summary: "State, modules, providers and workflow fundamentals.",
    tags: ["terraform", "iac", "certification"],
    href: "/learning/certifications",
  },
  {
    id: "cert-aws-devops",
    title: "AWS Certified DevOps Engineer — Professional",
    summary: "CI/CD, monitoring, IaC and incident response on AWS.",
    tags: ["aws", "ci/cd", "certification"],
    href: "/learning/certifications",
  },
];

export const CHECKLIST_TEMPLATES: ChecklistTemplate[] = [
  {
    id: "tpl-deploy-service",
    title: "Deploy a new service to Kubernetes",
    summary: "From container image to a healthy, reachable deployment.",
    category: "Kubernetes",
    tags: ["kubernetes", "deployment"],
    steps: [
      { id: "s1", title: "Build and push the container image", hint: "Tag with the commit SHA, not latest." },
      { id: "s2", title: "Create or pick the target namespace" },
      { id: "s3", title: "Define resource requests and limits" },
      { id: "s4", title: "Add liveness and readiness probes" },
      { id: "s5", title: "Create the Service and Ingress rule" },
      { id: "s6", title: "Verify rollout status and pod health" },
      { id: "s7", title: "Add a dashboard panel and an alert" },
    ],
  },
  {
    id: "tpl-cicd-pipeline",
    title: "Set up a CI/CD pipeline",
    summary: "A build-test-deploy workflow with safe secrets handling.",
    category: "CI/CD",
    tags: ["ci/cd", "github actions", "pipelines"],
    steps: [
      { id: "s1", title: "Define triggers (push, PR, manual dispatch)" },
      { id: "s2", title: "Add install and cache steps" },
      { id: "s3", title: "Run lint, typecheck and unit tests" },
      { id: "s4", title: "Build and push the image on main only" },
      { id: "s5", title: "Store credentials as repository secrets" },
      { id: "s6", title: "Add a deploy job with an environment gate" },
      { id: "s7", title: "Upload test and coverage artifacts" },
    ],
  },
  {
    id: "tpl-incident",
    title: "Production incident response",
    summary: "Structured response from detection to postmortem.",
    category: "Reliability",
    tags: ["incidents", "sre"],
    steps: [
      { id: "s1", title: "Declare severity and open an incident channel" },
      { id: "s2", title: "Assign incident commander and comms lead" },
      { id: "s3", title: "Stabilise: roll back or scale before debugging" },
      { id: "s4", title: "Post status updates on a fixed cadence" },
      { id: "s5", title: "Confirm recovery with metrics, not vibes" },
      { id: "s6", title: "Write a blameless postmortem within 48h" },
      { id: "s7", title: "File and assign follow-up actions" },
    ],
  },
  {
    id: "tpl-security-review",
    title: "Security hardening review",
    summary: "Quarterly pass over access, secrets and images.",
    category: "Security",
    tags: ["security", "rbac", "secrets"],
    steps: [
      { id: "s1", title: "Review roles and remove unused access" },
      { id: "s2", title: "Rotate long-lived credentials and tokens" },
      { id: "s3", title: "Scan images for known vulnerabilities" },
      { id: "s4", title: "Confirm audit logging covers admin actions" },
      { id: "s5", title: "Verify backups restore successfully" },
      { id: "s6", title: "Check TLS certs and expiry alerts" },
    ],
  },
  {
    id: "tpl-onboarding",
    title: "Onboard a new engineer",
    summary: "Access, context and a first safe change in week one.",
    category: "Team",
    tags: ["onboarding", "team"],
    steps: [
      { id: "s1", title: "Create account and assign the right role" },
      { id: "s2", title: "Grant repository and cluster access" },
      { id: "s3", title: "Walk through architecture docs" },
      { id: "s4", title: "Pair on a small production-safe change" },
      { id: "s5", title: "Add to on-call shadow rotation" },
    ],
  },
  {
    id: "tpl-monitoring",
    title: "Instrument a service with monitoring",
    summary: "Golden signals plus alerts that mean something.",
    category: "Observability",
    tags: ["monitoring", "alerts", "logs"],
    steps: [
      { id: "s1", title: "Emit structured logs with a correlation ID" },
      { id: "s2", title: "Expose latency, traffic, error and saturation metrics" },
      { id: "s3", title: "Create a service dashboard" },
      { id: "s4", title: "Define SLOs and error budget" },
      { id: "s5", title: "Wire alerts to the on-call channel" },
    ],
  },
];

export type ContentLevel = "beginner" | "intermediate" | "advanced";

/** Difficulty level per content id, used by Learning Hub search filters. */
export const CONTENT_LEVELS: Record<string, ContentLevel> = {
  "doc-k8s-basics": "beginner",
  "doc-cicd": "beginner",
  "doc-observability": "intermediate",
  "doc-iac": "intermediate",
  "doc-security": "advanced",
  "doc-incident": "advanced",
  "cert-cka": "advanced",
  "cert-ckad": "intermediate",
  "cert-terraform": "beginner",
  "cert-aws-devops": "advanced",
  "tpl-deploy-service": "intermediate",
  "tpl-cicd-pipeline": "beginner",
  "tpl-incident": "advanced",
  "tpl-security-review": "advanced",
  "tpl-onboarding": "beginner",
  "tpl-monitoring": "intermediate",
};

export function levelOf(id: string): ContentLevel {
  return CONTENT_LEVELS[id] ?? "intermediate";
}
