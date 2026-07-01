import { useListConversations } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquare, Radio } from "lucide-react";

export default function AdminWhatsApp() {
  const { data: conversations, isLoading: isConvosLoading } = useListConversations();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">WhatsApp CRM</h2>
      </div>

      <Tabs defaultValue="conversations" className="w-full">
        <TabsList>
          <TabsTrigger value="conversations">All Conversations</TabsTrigger>
          <TabsTrigger value="broadcast">Broadcast</TabsTrigger>
        </TabsList>
        
        <TabsContent value="conversations" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Conversations</CardTitle>
            </CardHeader>
            <CardContent>
              {isConvosLoading ? <Skeleton className="h-64 w-full" /> : (
                <div className="space-y-4">
                  {conversations?.map((convo: any) => (
                    <div key={convo.id} className="flex justify-between items-center border-b border-border pb-4 last:border-0 last:pb-0">
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
                    <div className="text-center py-6 text-muted-foreground">No conversations found</div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="broadcast" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Send Broadcast</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <Radio className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p>Broadcast interface goes here.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
