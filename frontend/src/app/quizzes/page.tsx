"use client";
import { HelpCircle } from "lucide-react";
import { ResourcePage } from "@/components/common/ResourcePage";

export default function QuizzesPage() {
  return (
    <ResourcePage
      storageKey="amer.quizzes"
      title="Quizzes"
      subtitle="Self-quiz banks for CKA / CKAD / AWS / Terraform."
      icon={<HelpCircle className="h-6 w-6 text-primary" />}
      searchKeys={["question", "topic", "cert"]}
      fields={[
        { name: "cert", label: "Cert", type: "select", options: ["CKA", "CKAD", "CKS", "AWS SAA", "AWS DOP", "Terraform Associate", "Other"], required: true },
        { name: "topic", label: "Topic" },
        { name: "question", label: "Question", type: "textarea", required: true },
        { name: "answer", label: "Answer", type: "textarea", required: true },
      ]}
    />
  );
}
