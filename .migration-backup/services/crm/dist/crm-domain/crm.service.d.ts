import { PrismaService } from '../prisma/prisma.service';
import { User } from '@prisma/client';
export interface CreateLeadDto {
    name?: string;
    email?: string;
    phone?: string;
    source?: string;
    value?: number;
    currency?: string;
    notes?: string;
}
export interface UpdateLeadDto {
    name?: string;
    email?: string;
    phone?: string;
    status?: string;
    value?: number;
    currency?: string;
    notes?: string;
    assignedTo?: string;
}
export interface CreateContactDto {
    name: string;
    email?: string;
    phone?: string;
    company?: string;
    title?: string;
    notes?: string;
    tags?: string[];
}
export interface UpdateContactDto {
    name?: string;
    email?: string;
    phone?: string;
    company?: string;
    title?: string;
    notes?: string;
    tags?: string[];
}
export interface CreateCompanyDto {
    name: string;
    website?: string;
    industry?: string;
    size?: string;
    address?: string;
    notes?: string;
}
export interface UpdateCompanyDto {
    name?: string;
    website?: string;
    industry?: string;
    size?: string;
    address?: string;
    notes?: string;
}
export interface CreateDealDto {
    leadId?: string;
    title: string;
    value: number;
    currency?: string;
    stage?: string;
    probability?: number;
    expectedCloseDate?: Date;
    notes?: string;
}
export interface UpdateDealDto {
    title?: string;
    value?: number;
    currency?: string;
    stage?: string;
    probability?: number;
    expectedCloseDate?: Date;
    actualCloseDate?: Date;
    notes?: string;
}
export interface CreateTaskDto {
    title: string;
    description?: string;
    dueDate?: Date;
    priority?: string;
    relatedTo?: string;
    relatedId?: string;
}
export interface UpdateTaskDto {
    title?: string;
    description?: string;
    dueDate?: Date;
    priority?: string;
    status?: string;
}
export interface CreateActivityDto {
    leadId?: string;
    type: string;
    subject?: string;
    description: string;
}
export declare class CrmService {
    private prisma;
    constructor(prisma: PrismaService);
    getLeads(user: User): Promise<({
        deals: {
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
        }[];
        activities: {
            id: string;
            userId: string;
            createdAt: Date;
            leadId: string | null;
            description: string;
            type: string;
            subject: string | null;
        }[];
    } & {
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
    })[]>;
    getLead(user: User, id: string): Promise<{
        deals: {
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
        }[];
        activities: {
            id: string;
            userId: string;
            createdAt: Date;
            leadId: string | null;
            description: string;
            type: string;
            subject: string | null;
        }[];
    } & {
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
    }>;
    createLead(user: User, dto: CreateLeadDto): Promise<{
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
    }>;
    updateLead(user: User, id: string, dto: UpdateLeadDto): Promise<{
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
    }>;
    deleteLead(user: User, id: string): Promise<{
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
    }>;
    getContacts(user: User): Promise<{
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
    getContact(user: User, id: string): Promise<{
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
    createContact(user: User, dto: CreateContactDto): Promise<{
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
    updateContact(user: User, id: string, dto: UpdateContactDto): Promise<{
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
    deleteContact(user: User, id: string): Promise<{
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
    getCompanies(user: User): Promise<{
        id: string;
        userId: string;
        name: string;
        notes: string | null;
        createdAt: Date;
        updatedAt: Date;
        website: string | null;
        industry: string | null;
        size: string | null;
        address: string | null;
    }[]>;
    getCompany(user: User, id: string): Promise<{
        id: string;
        userId: string;
        name: string;
        notes: string | null;
        createdAt: Date;
        updatedAt: Date;
        website: string | null;
        industry: string | null;
        size: string | null;
        address: string | null;
    }>;
    createCompany(user: User, dto: CreateCompanyDto): Promise<{
        id: string;
        userId: string;
        name: string;
        notes: string | null;
        createdAt: Date;
        updatedAt: Date;
        website: string | null;
        industry: string | null;
        size: string | null;
        address: string | null;
    }>;
    updateCompany(user: User, id: string, dto: UpdateCompanyDto): Promise<{
        id: string;
        userId: string;
        name: string;
        notes: string | null;
        createdAt: Date;
        updatedAt: Date;
        website: string | null;
        industry: string | null;
        size: string | null;
        address: string | null;
    }>;
    deleteCompany(user: User, id: string): Promise<{
        id: string;
        userId: string;
        name: string;
        notes: string | null;
        createdAt: Date;
        updatedAt: Date;
        website: string | null;
        industry: string | null;
        size: string | null;
        address: string | null;
    }>;
    getDeals(user: User): Promise<({
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
    } & {
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
    })[]>;
    getDeal(user: User, id: string): Promise<{
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
    } & {
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
    }>;
    createDeal(user: User, dto: CreateDealDto): Promise<{
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
    }>;
    updateDeal(user: User, id: string, dto: UpdateDealDto): Promise<{
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
    }>;
    deleteDeal(user: User, id: string): Promise<{
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
    }>;
    getTasks(user: User): Promise<{
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
    getTask(user: User, id: string): Promise<{
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
    }>;
    createTask(user: User, dto: CreateTaskDto): Promise<{
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
    }>;
    updateTask(user: User, id: string, dto: UpdateTaskDto): Promise<{
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
    }>;
    deleteTask(user: User, id: string): Promise<{
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
    }>;
    getActivities(user: User, leadId?: string): Promise<({
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
    } & {
        id: string;
        userId: string;
        createdAt: Date;
        leadId: string | null;
        description: string;
        type: string;
        subject: string | null;
    })[]>;
    getActivity(user: User, id: string): Promise<{
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
    } & {
        id: string;
        userId: string;
        createdAt: Date;
        leadId: string | null;
        description: string;
        type: string;
        subject: string | null;
    }>;
    createActivity(user: User, dto: CreateActivityDto): Promise<{
        id: string;
        userId: string;
        createdAt: Date;
        leadId: string | null;
        description: string;
        type: string;
        subject: string | null;
    }>;
    deleteActivity(user: User, id: string): Promise<{
        id: string;
        userId: string;
        createdAt: Date;
        leadId: string | null;
        description: string;
        type: string;
        subject: string | null;
    }>;
    getStats(user: User): Promise<{
        leads: number;
        contacts: number;
        companies: number;
        deals: number;
        pendingTasks: number;
        totalDealValue: number;
    }>;
}
