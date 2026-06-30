"use client";
import { MessageSquareQuote } from "lucide-react";
import { ResourcePage } from "@/components/common/ResourcePage";

export default function InterviewPrepPage() {
  return (
    <ResourcePage
      storageKey="amer.interview"
      title="Interview Prep"
      subtitle="Question bank by company & topic."
      icon={<MessageSquareQuote className="h-6 w-6 text-primary" />}
      searchKeys={["question", "company", "topic"]}
      fields={[
        { name: "company", label: "Company" },
        { name: "topic", label: "Topic", type: "select", options: ["System Design", "K8s", "Linux", "Networking", "Behavioral", "Terraform", "AWS", "Other"] },
        { name: "question", label: "Question", type: "textarea", required: true },
        { name: "answer", label: "Your answer", type: "textarea" },
      ]}
    />
  );
}
