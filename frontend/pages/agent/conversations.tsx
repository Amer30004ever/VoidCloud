import { useListConversations } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquare } from "lucide-react";

export default function AgentConversations() {
  const { data: conversations, isLoading: isConvosLoading } = useListConversations();

  if (isConvosLoading) return <Skeleton className="h-64 w-full rounded-xl" />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Conversations</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Assigned to Me</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {conversations?.map((convo: any) => (
              <div key={convo.id} className="flex justify-between items-center border-b border-border pb-4 last:border-0 last:pb-0 hover:bg-muted/50 p-2 rounded-lg cursor-pointer transition-colors">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 bg-accent rounded-full flex items-center justify-center">
                    <MessageSquare className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <div className="font-medium">{convo.contactId || 'Unknown Contact'}</div>
                    <div className="text-sm text-muted-foreground">{convo.lastMessageAt ? new Date(convo.lastMessageAt).toLocaleString() : 'No messages'}</div>
                  </div>
                </div>
                <Badge variant={convo.status === 'OPEN' ? 'default' : 'secondary'}>{convo.status}</Badge>
              </div>
            ))}
            {!conversations?.length && (
              <div className="text-center py-6 text-muted-foreground">No assigned conversations</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
