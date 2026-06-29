import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
export declare class CrmService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    private tenantFilter;
    listCustomers(user: {
        id: string;
        role: Role;
    }): import(".prisma/client").Prisma.PrismaPromise<{
        id: string;
        userId: string;
        name: string;
        email: string | null;
        phone: string | null;
        company: string | null;
        title: string | null;
        notes: string | null;
        tags: string[];
        createdAt: Date;
        updatedAt: Date;
    }[]>;
    createCustomer(user: {
        id: string;
    }, data: Record<string, unknown>): import(".prisma/client").Prisma.Prisma__CrmContactClient<{
        id: string;
        userId: string;
        name: string;
        email: string | null;
        phone: string | null;
        company: string | null;
        title: string | null;
        notes: string | null;
        tags: string[];
        createdAt: Date;
        updatedAt: Date;
    }, never, import("@prisma/client/runtime/client").DefaultArgs, import(".prisma/client").Prisma.PrismaClientOptions>;
    getCustomer(id: string): Promise<{
        id: string;
        userId: string;
        name: string;
        email: string | null;
        phone: string | null;
        company: string | null;
        title: string | null;
        notes: string | null;
        tags: string[];
        createdAt: Date;
        updatedAt: Date;
    }>;
    updateCustomer(id: string, data: Record<string, unknown>): import(".prisma/client").Prisma.Prisma__CrmContactClient<{
        id: string;
        userId: string;
        name: string;
        email: string | null;
        phone: string | null;
        company: string | null;
        title: string | null;
        notes: string | null;
        tags: string[];
        createdAt: Date;
        updatedAt: Date;
    }, never, import("@prisma/client/runtime/client").DefaultArgs, import(".prisma/client").Prisma.PrismaClientOptions>;
    listLeads(user: {
        id: string;
        role: Role;
    }): import(".prisma/client").Prisma.PrismaPromise<{
        id: string;
        userId: string;
        name: string | null;
        email: string | null;
        phone: string | null;
        notes: string | null;
        createdAt: Date;
        updatedAt: Date;
        source: string;
        status: string;
        value: number | null;
        currency: string;
        assignedTo: string | null;
    }[]>;
    createLead(user: {
        id: string;
    }, data: Record<string, unknown>): import(".prisma/client").Prisma.Prisma__CrmLeadClient<{
        id: string;
        userId: string;
        name: string | null;
        email: string | null;
        phone: string | null;
        notes: string | null;
        createdAt: Date;
        updatedAt: Date;
        source: string;
        status: string;
        value: number | null;
        currency: string;
        assignedTo: string | null;
    }, never, import("@prisma/client/runtime/client").DefaultArgs, import(".prisma/client").Prisma.PrismaClientOptions>;
    convertLead(id: string): Promise<{
        contact: {
            id: string;
            userId: string;
            name: string;
            email: string | null;
            phone: string | null;
            company: string | null;
            title: string | null;
            notes: string | null;
            tags: string[];
            createdAt: Date;
            updatedAt: Date;
        };
        lead: {
            id: string;
            userId: string;
            name: string | null;
            email: string | null;
            phone: string | null;
            notes: string | null;
            createdAt: Date;
            updatedAt: Date;
            source: string;
            status: string;
            value: number | null;
            currency: string;
            assignedTo: string | null;
        };
    }>;
    listDeals(user: {
        id: string;
        role: Role;
    }): import(".prisma/client").Prisma.PrismaPromise<{
        id: string;
        userId: string;
        title: string;
        notes: string | null;
        createdAt: Date;
        updatedAt: Date;
        value: number;
        currency: string;
        leadId: string | null;
        stage: string;
        probability: number;
        expectedCloseDate: Date | null;
        actualCloseDate: Date | null;
    }[]>;
    createDeal(user: {
        id: string;
    }, data: Record<string, unknown>): import(".prisma/client").Prisma.Prisma__CrmDealClient<{
        id: string;
        userId: string;
        title: string;
        notes: string | null;
        createdAt: Date;
        updatedAt: Date;
        value: number;
        currency: string;
        leadId: string | null;
        stage: string;
        probability: number;
        expectedCloseDate: Date | null;
        actualCloseDate: Date | null;
    }, never, import("@prisma/client/runtime/client").DefaultArgs, import(".prisma/client").Prisma.PrismaClientOptions>;
    updateDealStage(id: string, stage: string): import(".prisma/client").Prisma.Prisma__CrmDealClient<{
        id: string;
        userId: string;
        title: string;
        notes: string | null;
        createdAt: Date;
        updatedAt: Date;
        value: number;
        currency: string;
        leadId: string | null;
        stage: string;
        probability: number;
        expectedCloseDate: Date | null;
        actualCloseDate: Date | null;
    }, never, import("@prisma/client/runtime/client").DefaultArgs, import(".prisma/client").Prisma.PrismaClientOptions>;
    listTasks(user: {
        id: string;
        role: Role;
    }): import(".prisma/client").Prisma.PrismaPromise<{
        id: string;
        userId: string;
        title: string;
        createdAt: Date;
        updatedAt: Date;
        status: string;
        description: string | null;
        dueDate: Date | null;
        priority: string;
        relatedTo: string | null;
        relatedId: string | null;
    }[]>;
    createTask(user: {
        id: string;
    }, data: Record<string, unknown>): import(".prisma/client").Prisma.Prisma__CrmTaskClient<{
        id: string;
        userId: string;
        title: string;
        createdAt: Date;
        updatedAt: Date;
        status: string;
        description: string | null;
        dueDate: Date | null;
        priority: string;
        relatedTo: string | null;
        relatedId: string | null;
    }, never, import("@prisma/client/runtime/client").DefaultArgs, import(".prisma/client").Prisma.PrismaClientOptions>;
    completeTask(id: string): import(".prisma/client").Prisma.Prisma__CrmTaskClient<{
        id: string;
        userId: string;
        title: string;
        createdAt: Date;
        updatedAt: Date;
        status: string;
        description: string | null;
        dueDate: Date | null;
        priority: string;
        relatedTo: string | null;
        relatedId: string | null;
    }, never, import("@prisma/client/runtime/client").DefaultArgs, import(".prisma/client").Prisma.PrismaClientOptions>;
    private findContact;
}
