export type QuizLevel = "beginner" | "intermediate" | "advanced";

export interface QuizQuestion {
  id: string;
  prompt: string;
  options: string[];
  /** Index into `options`. */
  answer: number;
  explanation: string;
}

export interface QuizBank {
  id: string;
  certId: string;
  title: string;
  summary: string;
  level: QuizLevel;
  tags: string[];
  /** Percentage needed to pass. */
  passMark: number;
  /** Suggested time budget, in minutes. */
  minutes: number;
  questions: QuizQuestion[];
}

export const QUIZ_BANKS: QuizBank[] = [
  {
    id: "quiz-cka",
    certId: "cert-cka",
    title: "CKA practice exam",
    summary: "Cluster architecture, workloads, networking and troubleshooting.",
    level: "advanced",
    tags: ["kubernetes", "certification", "cka"],
    passMark: 66,
    minutes: 15,
    questions: [
      {
        id: "q1",
        prompt: "Which component watches for newly created Pods with no assigned node and selects a node for them?",
        options: ["kube-controller-manager", "kube-scheduler", "kubelet", "kube-proxy"],
        answer: 1,
        explanation: "kube-scheduler assigns unscheduled Pods to nodes based on resource requests, affinities and taints.",
      },
      {
        id: "q2",
        prompt: "Where does a kubeadm cluster store all API object state by default?",
        options: ["A PostgreSQL database", "etcd", "The kubelet's local disk", "ConfigMaps in kube-system"],
        answer: 1,
        explanation: "etcd is the consistent key-value store backing the API server; back it up before upgrades.",
      },
      {
        id: "q3",
        prompt: "A node must be emptied for maintenance without deleting its DaemonSet pods. Which command fits?",
        options: [
          "kubectl delete node <node>",
          "kubectl cordon <node>",
          "kubectl drain <node> --ignore-daemonsets",
          "kubectl taint node <node> maintenance=true:NoExecute",
        ],
        answer: 2,
        explanation: "drain evicts workloads and cordons the node; --ignore-daemonsets skips DaemonSet-managed pods.",
      },
      {
        id: "q4",
        prompt: "Which Service type gives a stable cluster-internal virtual IP only?",
        options: ["ClusterIP", "NodePort", "LoadBalancer", "ExternalName"],
        answer: 0,
        explanation: "ClusterIP is the default and is reachable only from inside the cluster.",
      },
      {
        id: "q5",
        prompt: "A pod is stuck in Pending with 'Insufficient cpu'. What is the first check?",
        options: [
          "Restart the kubelet",
          "Compare the pod's CPU requests against allocatable capacity on the nodes",
          "Delete and recreate the namespace",
          "Increase the liveness probe timeout",
        ],
        answer: 1,
        explanation: "Pending with Insufficient cpu means the scheduler found no node with enough allocatable CPU for the request.",
      },
      {
        id: "q6",
        prompt: "Which object binds a ClusterRole to a user inside one namespace only?",
        options: ["ClusterRoleBinding", "RoleBinding", "ServiceAccount", "NetworkPolicy"],
        answer: 1,
        explanation: "A RoleBinding can reference a ClusterRole; the permissions then apply only in the RoleBinding's namespace.",
      },
    ],
  },
  {
    id: "quiz-ckad",
    certId: "cert-ckad",
    title: "CKAD practice exam",
    summary: "Application design, configuration, observability and deployment.",
    level: "intermediate",
    tags: ["kubernetes", "certification", "ckad"],
    passMark: 66,
    minutes: 12,
    questions: [
      {
        id: "q1",
        prompt: "Which probe determines whether a container should receive traffic?",
        options: ["livenessProbe", "readinessProbe", "startupProbe", "preStop hook"],
        answer: 1,
        explanation: "readinessProbe controls Service endpoint membership; liveness restarts the container.",
      },
      {
        id: "q2",
        prompt: "How do you expose a Secret value as an environment variable?",
        options: [
          "env.valueFrom.secretKeyRef",
          "envFrom.configMapRef",
          "volumeMounts.secretName",
          "spec.secrets[0].env",
        ],
        answer: 0,
        explanation: "secretKeyRef pulls a single key from a Secret into an env var; envFrom.secretRef injects all keys.",
      },
      {
        id: "q3",
        prompt: "Which workload type runs to completion a fixed number of times?",
        options: ["Deployment", "DaemonSet", "Job", "StatefulSet"],
        answer: 2,
        explanation: "A Job runs pods until the configured number of successful completions.",
      },
      {
        id: "q4",
        prompt: "Which container runs and finishes before the app container starts?",
        options: ["Sidecar container", "Init container", "Ephemeral container", "Ambassador container"],
        answer: 1,
        explanation: "Init containers run sequentially to completion before app containers start.",
      },
      {
        id: "q5",
        prompt: "What is the effect of setting requests equal to limits for CPU and memory?",
        options: [
          "The pod gets BestEffort QoS",
          "The pod gets Guaranteed QoS",
          "The pod is never scheduled",
          "The pod bypasses the scheduler",
        ],
        answer: 1,
        explanation: "Equal requests and limits on all containers yields the Guaranteed QoS class, evicted last under pressure.",
      },
    ],
  },
  {
    id: "quiz-terraform",
    certId: "cert-terraform",
    title: "Terraform Associate practice exam",
    summary: "State, modules, providers and the core workflow.",
    level: "beginner",
    tags: ["terraform", "iac", "certification"],
    passMark: 70,
    minutes: 10,
    questions: [
      {
        id: "q1",
        prompt: "Which command creates an execution plan without applying it?",
        options: ["terraform init", "terraform plan", "terraform apply -auto-approve", "terraform refresh"],
        answer: 1,
        explanation: "terraform plan diffs desired configuration against state and shows proposed changes.",
      },
      {
        id: "q2",
        prompt: "Why use a remote backend with state locking?",
        options: [
          "To speed up provider downloads",
          "To prevent concurrent applies from corrupting shared state",
          "To encrypt the .tf source files",
          "To avoid needing terraform init",
        ],
        answer: 1,
        explanation: "Remote backends store state centrally and lock it so two applies cannot race.",
      },
      {
        id: "q3",
        prompt: "What does terraform init do?",
        options: [
          "Creates cloud resources",
          "Downloads providers and configures the backend",
          "Destroys the workspace",
          "Formats configuration files",
        ],
        answer: 1,
        explanation: "init installs providers/modules and initialises the configured backend.",
      },
      {
        id: "q4",
        prompt: "Which block imports reusable configuration from another directory or registry?",
        options: ["resource", "module", "provider", "locals"],
        answer: 1,
        explanation: "The module block sources reusable configuration and passes input variables to it.",
      },
      {
        id: "q5",
        prompt: "How should provider credentials be supplied in CI?",
        options: [
          "Hardcoded in the provider block",
          "Committed in terraform.tfvars",
          "Environment variables or a secrets manager",
          "In the state file",
        ],
        answer: 2,
        explanation: "Credentials belong in environment variables or a secrets manager, never in version control or state.",
      },
    ],
  },
  {
    id: "quiz-aws-devops",
    certId: "cert-aws-devops",
    title: "AWS DevOps Professional practice exam",
    summary: "CI/CD, monitoring, IaC and incident response on AWS.",
    level: "advanced",
    tags: ["aws", "ci/cd", "certification"],
    passMark: 70,
    minutes: 12,
    questions: [
      {
        id: "q1",
        prompt: "Which deployment strategy shifts a small percentage of traffic to a new version first?",
        options: ["All-at-once", "Canary", "Immutable", "Recreate"],
        answer: 1,
        explanation: "Canary deployments route a small traffic slice to the new version before a full shift.",
      },
      {
        id: "q2",
        prompt: "Which service best stores and rotates database credentials automatically?",
        options: ["S3", "AWS Secrets Manager", "Parameter Store standard tier", "DynamoDB"],
        answer: 1,
        explanation: "Secrets Manager supports built-in scheduled rotation with Lambda rotation functions.",
      },
      {
        id: "q3",
        prompt: "A CloudFormation stack update fails midway. What is the default behaviour?",
        options: [
          "The stack is deleted",
          "The stack rolls back to the previous state",
          "The stack stays half-updated",
          "The stack retries indefinitely",
        ],
        answer: 1,
        explanation: "CloudFormation rolls back to the last known good state unless rollback is disabled.",
      },
      {
        id: "q4",
        prompt: "What is the most reliable signal for alerting on user-facing degradation?",
        options: [
          "Instance CPU utilisation",
          "Error rate and latency against an SLO",
          "Number of deployments per day",
          "Disk inode usage",
        ],
        answer: 1,
        explanation: "SLO-based error rate and latency alerts track user impact; CPU is a cause, not a symptom.",
      },
      {
        id: "q5",
        prompt: "Which practice keeps blue/green rollbacks fast?",
        options: [
          "Running database migrations that drop columns during the cutover",
          "Keeping the previous environment warm until the new one is verified",
          "Deleting the old target group immediately",
          "Disabling health checks during cutover",
        ],
        answer: 1,
        explanation: "Keeping the old environment healthy makes rollback a traffic switch rather than a redeploy.",
      },
    ],
  },
];

export function getQuizBank(id: string): QuizBank | null {
  return QUIZ_BANKS.find((q) => q.id === id) ?? null;
}
