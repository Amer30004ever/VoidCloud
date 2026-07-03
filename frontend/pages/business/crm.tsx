import { useListContacts, useListLeads } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

export default function BusinessCRM() {
  const { data: contacts, isLoading: isContactsLoading } = useListContacts();
  const { data: leads, isLoading: isLeadsLoading } = useListLeads();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">CRM</h2>
      </div>

      <Tabs defaultValue="contacts" className="w-full">
        <TabsList>
          <TabsTrigger value="contacts">Contacts</TabsTrigger>
          <TabsTrigger value="leads">Leads</TabsTrigger>
        </TabsList>
        
        <TabsContent value="contacts" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row justify-between items-center">
              <CardTitle>All Contacts</CardTitle>
              <Button size="sm">Add Contact</Button>
            </CardHeader>
            <CardContent>
              {isContactsLoading ? <Skeleton className="h-64 w-full" /> : (
                <div className="space-y-4">
                  {contacts?.map((contact: any) => (
                    <div key={contact.id} className="flex justify-between items-center border-b border-border pb-4 last:border-0 last:pb-0">
                      <div>
                        <div className="font-medium">{contact.name}</div>
                        <div className="text-sm text-muted-foreground">{contact.phone}</div>
                      </div>
                    </div>
                  ))}
                  {!contacts?.length && (
                    <div className="text-center py-6 text-muted-foreground">No contacts found</div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="leads" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row justify-between items-center">
              <CardTitle>Pipeline</CardTitle>
              <Button size="sm">Add Lead</Button>
            </CardHeader>
            <CardContent>
              {isLeadsLoading ? <Skeleton className="h-64 w-full" /> : (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {['NEW', 'CONTACTED', 'QUALIFIED', 'CONVERTED'].map(status => (
                    <div key={status} className="bg-muted/50 p-4 rounded-xl min-h-[200px]">
                      <h3 className="font-semibold mb-4 text-sm">{status}</h3>
                      <div className="space-y-3">
                        {leads?.filter((l: any) => l.status === status).map((lead: any) => (
                          <Card key={lead.id} className="p-3">
                            <div className="font-medium text-sm">{lead.title}</div>
                            <div className="text-xs text-muted-foreground mt-1">{lead.contact?.name}</div>
                          </Card>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
