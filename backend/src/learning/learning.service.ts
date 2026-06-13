import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class LearningService {
  private readonly logger = new Logger(LearningService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  // DevOps Jobs
  async getJobs(source?: string, keyword?: string, location?: string) {
    try {
      const search = keyword?.trim().toLowerCase();
      const response = await fetch(
        'https://remotive.com/api/remote-jobs?category=devops',
      );
      if (!response.ok)
        throw new Error(`Remotive API failed: ${response.status}`);
      const payload = await response.json();
      let jobs = (payload.jobs ?? []).map((job: any) => ({
        id: String(job.id),
        title: job.title,
        company: job.company_name,
        location: job.candidate_required_location ?? 'Remote',
        salary: job.salary ?? 'Not specified',
        description: job.description?.replace(/<[^>]+>/g, ' ').slice(0, 500),
        skills: job.tags ?? [],
        postedAt: job.publication_date,
        url: job.url,
        source: 'remotive',
      }));

      if (search) {
        jobs = jobs.filter((job: any) =>
          `${job.title} ${job.company} ${job.description}`
            .toLowerCase()
            .includes(search),
        );
      }
      if (location) {
        jobs = jobs.filter((job: any) =>
          job.location.toLowerCase().includes(location.toLowerCase()),
        );
      }
      if (source) {
        jobs = jobs.filter((job: any) => job.source === source);
      }

      return { jobs: jobs.slice(0, 50), source: 'remotive' };
    } catch (error) {
      this.logger.error(`Error fetching jobs: ${error.message}`);
      return { jobs: [], source: 'fallback', error: error.message };
    }
  }

  async getJobDetails(id: string) {
    try {
      // This would fetch from job API
      this.logger.log(`Fetching job details for ${id}`);
      return { job: null };
    } catch (error) {
      this.logger.error(`Error fetching job details: ${error.message}`);
      throw error;
    }
  }

  async saveJob(jobData: { jobId: string; userId: string }) {
    try {
      const savedJob = await this.prisma.savedJob.create({
        data: {
          jobId: jobData.jobId,
          userId: jobData.userId,
        },
      });

      this.logger.log(`Saved job ${jobData.jobId} for user ${jobData.userId}`);
      return { savedJob };
    } catch (error) {
      this.logger.error(`Error saving job: ${error.message}`);
      throw error;
    }
  }

  async getSavedJobs(userId: string) {
    try {
      const savedJobs = await this.prisma.savedJob.findMany({
        where: { userId },
        orderBy: { savedAt: 'desc' },
      });

      return { savedJobs };
    } catch (error) {
      this.logger.error(`Error fetching saved jobs: ${error.message}`);
      throw error;
    }
  }

  async removeSavedJob(id: string) {
    try {
      await this.prisma.savedJob.delete({
        where: { id },
      });

      this.logger.log(`Removed saved job ${id}`);
      return { success: true, message: 'Job removed' };
    } catch (error) {
      this.logger.error(`Error removing saved job: ${error.message}`);
      throw error;
    }
  }

  // Tech News
  async getNews(source?: string, category?: string, limit: number = 20) {
    try {
      // This would integrate with news APIs (Hacker News, Reddit, tech blogs)
      this.logger.log('Fetching news - requires news API integration');

      const news = [
        {
          id: '1',
          title: 'Kubernetes 1.30 Released with New Features',
          source: 'Hacker News',
          category: 'Kubernetes',
          url: 'https://example.com/news/1',
          publishedAt: new Date().toISOString(),
          summary: 'Kubernetes 1.30 introduces several new features...',
        },
      ];

      return { news };
    } catch (error) {
      this.logger.error(`Error fetching news: ${error.message}`);
      throw error;
    }
  }

  async getNewsDetails(id: string) {
    try {
      this.logger.log(`Fetching news details for ${id}`);
      return { news: null };
    } catch (error) {
      this.logger.error(`Error fetching news details: ${error.message}`);
      throw error;
    }
  }

  // Learning Paths
  async getLearningPaths(category?: string) {
    try {
      const where = category ? { category } : {};

      const paths = await this.prisma.learningPath.findMany({
        where,
        include: {
          modules: {
            orderBy: { order: 'asc' },
          },
        },
        orderBy: { title: 'asc' },
      });

      return { paths };
    } catch (error) {
      this.logger.error(`Error fetching learning paths: ${error.message}`);
      throw error;
    }
  }

  async getLearningPath(id: string) {
    try {
      const path = await this.prisma.learningPath.findUnique({
        where: { id },
        include: {
          modules: {
            orderBy: { order: 'asc' },
            include: {
              resources: true,
            },
          },
        },
      });

      if (!path) {
        throw new Error('Learning path not found');
      }

      return { path };
    } catch (error) {
      this.logger.error(`Error fetching learning path: ${error.message}`);
      throw error;
    }
  }

  async enrollInPath(id: string, userId: string) {
    try {
      const enrollment = await this.prisma.pathEnrollment.create({
        data: {
          pathId: id,
          userId,
          status: 'in_progress',
          enrolledAt: new Date(),
        },
      });

      this.logger.log(`User ${userId} enrolled in path ${id}`);
      return { enrollment };
    } catch (error) {
      this.logger.error(`Error enrolling in path: ${error.message}`);
      throw error;
    }
  }

  async getPathProgress(id: string, userId: string) {
    try {
      const enrollment = await this.prisma.pathEnrollment.findUnique({
        where: {
          userId_pathId: {
            userId,
            pathId: id,
          },
        },
        include: {
          progress: true,
        },
      });

      if (!enrollment) {
        throw new Error('Enrollment not found');
      }

      return { enrollment };
    } catch (error) {
      this.logger.error(`Error fetching path progress: ${error.message}`);
      throw error;
    }
  }

  async updatePathProgress(id: string, userId: string, progressData: any) {
    try {
      const enrollment = await this.prisma.pathEnrollment.update({
        where: {
          userId_pathId: {
            userId,
            pathId: id,
          },
        },
        data: {
          progress: {
            create: {
              moduleId: progressData.moduleId,
              completed: progressData.completed,
              completedAt: progressData.completed ? new Date() : null,
            },
          },
        },
      });

      this.logger.log(`Updated progress for user ${userId} in path ${id}`);
      return { enrollment };
    } catch (error) {
      this.logger.error(`Error updating path progress: ${error.message}`);
      throw error;
    }
  }

  // Certifications
  async getCertifications(provider?: string) {
    try {
      const where = provider ? { provider } : {};

      const certifications = await this.prisma.certification.findMany({
        where,
        orderBy: { title: 'asc' },
      });

      return { certifications };
    } catch (error) {
      this.logger.error(`Error fetching certifications: ${error.message}`);
      throw error;
    }
  }

  async getCertification(id: string) {
    try {
      const certification = await this.prisma.certification.findUnique({
        where: { id },
      });

      if (!certification) {
        throw new Error('Certification not found');
      }

      return { certification };
    } catch (error) {
      this.logger.error(`Error fetching certification: ${error.message}`);
      throw error;
    }
  }

  async trackCertification(trackerData: any) {
    try {
      const tracker = await this.prisma.certificationTracker.create({
        data: {
          certificationId: trackerData.certificationId,
          userId: trackerData.userId,
          status: 'not_started',
          targetDate: trackerData.targetDate,
        },
      });

      this.logger.log(
        `Created certification tracker for user ${trackerData.userId}`,
      );
      return { tracker };
    } catch (error) {
      this.logger.error(`Error tracking certification: ${error.message}`);
      throw error;
    }
  }

  async getCertificationTracker(userId: string) {
    try {
      const trackers = await this.prisma.certificationTracker.findMany({
        where: { userId },
        include: {
          certification: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      return { trackers };
    } catch (error) {
      this.logger.error(
        `Error fetching certification tracker: ${error.message}`,
      );
      throw error;
    }
  }

  async updateCertificationTracker(id: string, updateData: any) {
    try {
      const tracker = await this.prisma.certificationTracker.update({
        where: { id },
        data: {
          status: updateData.status,
          completedAt: updateData.status === 'completed' ? new Date() : null,
          notes: updateData.notes,
        },
      });

      this.logger.log(`Updated certification tracker ${id}`);
      return { tracker };
    } catch (error) {
      this.logger.error(
        `Error updating certification tracker: ${error.message}`,
      );
      throw error;
    }
  }

  // CV Studio
  async getCVs(userId: string) {
    try {
      const cvs = await this.prisma.cV.findMany({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
      });

      return { cvs };
    } catch (error) {
      this.logger.error(`Error fetching CVs: ${error.message}`);
      throw error;
    }
  }

  async getCV(id: string) {
    try {
      const cv = await this.prisma.cV.findUnique({
        where: { id },
        include: {
          sections: {
            orderBy: { order: 'asc' },
          },
        },
      });

      if (!cv) {
        throw new Error('CV not found');
      }

      return { cv };
    } catch (error) {
      this.logger.error(`Error fetching CV: ${error.message}`);
      throw error;
    }
  }

  async createCV(cvData: any) {
    try {
      const cv = await this.prisma.cV.create({
        data: {
          userId: cvData.userId,
          title: cvData.title,
          templateId: cvData.templateId,
          content: cvData.content,
          fileType: cvData.fileType || 'markdown',
          fileName: cvData.fileName,
          atsScore: cvData.atsScore,
          sections: {
            create: cvData.sections || [],
          },
        },
        include: {
          sections: true,
        },
      });

      this.logger.log(`Created CV: ${cvData.title}`);
      return { cv };
    } catch (error) {
      this.logger.error(`Error creating CV: ${error.message}`);
      throw error;
    }
  }

  async updateCV(id: string, cvData: any) {
    try {
      const cv = await this.prisma.cV.update({
        where: { id },
        data: {
          title: cvData.title,
          content: cvData.content,
          updatedAt: new Date(),
        },
      });

      this.logger.log(`Updated CV: ${id}`);
      return { cv };
    } catch (error) {
      this.logger.error(`Error updating CV: ${error.message}`);
      throw error;
    }
  }

  async deleteCV(id: string) {
    try {
      await this.prisma.cV.delete({
        where: { id },
      });

      this.logger.log(`Deleted CV: ${id}`);
      return { success: true, message: 'CV deleted' };
    } catch (error) {
      this.logger.error(`Error deleting CV: ${error.message}`);
      throw error;
    }
  }

  async compileCV(id: string) {
    try {
      // This would integrate with LaTeX compiler
      this.logger.log(`Compiling CV ${id} - requires LaTeX integration`);
      return { success: false, message: 'LaTeX compiler integration required' };
    } catch (error) {
      this.logger.error(`Error compiling CV: ${error.message}`);
      throw error;
    }
  }

  async getATSScore(id: string, jobDescription?: string) {
    try {
      // This would integrate with AI/ATS scoring service
      this.logger.log(
        `Getting ATS score for CV ${id} - requires AI integration`,
      );
      return { score: 0, suggestions: [] };
    } catch (error) {
      this.logger.error(`Error getting ATS score: ${error.message}`);
      throw error;
    }
  }

  async optimizeCV(id: string, jobDescription: string) {
    try {
      // This would integrate with AI optimization service
      this.logger.log(`Optimizing CV ${id} - requires AI integration`);
      return {
        success: false,
        message: 'AI optimization integration required',
      };
    } catch (error) {
      this.logger.error(`Error optimizing CV: ${error.message}`);
      throw error;
    }
  }

  async exportCV(id: string, format: 'pdf' | 'docx' | 'markdown' | 'html') {
    try {
      const cv = await this.prisma.cV.findUnique({
        where: { id },
      });

      if (!cv) {
        throw new Error('CV not found');
      }

      this.logger.log(`Exporting CV ${id} to ${format}`);

      return {
        format,
        content: cv.content,
        fileName: `${cv.title}.${format === 'markdown' ? 'md' : format}`,
      };
    } catch (error) {
      this.logger.error(`Error exporting CV: ${error.message}`);
      throw error;
    }
  }

  async getCVTemplates(category?: string) {
    try {
      const where = category ? { category } : {};

      const templates = await this.prisma.cVTemplate.findMany({
        where,
        orderBy: { name: 'asc' },
      });

      return { templates };
    } catch (error) {
      this.logger.error(`Error fetching CV templates: ${error.message}`);
      throw error;
    }
  }

  async importGitHubProjects(id: string, username: string) {
    try {
      // This would integrate with GitHub API
      this.logger.log(
        `Importing GitHub projects for CV ${id} - requires GitHub API integration`,
      );
      return { success: false, message: 'GitHub API integration required' };
    } catch (error) {
      this.logger.error(`Error importing GitHub projects: ${error.message}`);
      throw error;
    }
  }

  // Conferences
  async getConferences(year?: string) {
    try {
      const where = year ? { year: parseInt(year) } : {};

      const conferences = await this.prisma.conference.findMany({
        where,
        orderBy: { startDate: 'asc' },
      });

      return { conferences };
    } catch (error) {
      this.logger.error(`Error fetching conferences: ${error.message}`);
      throw error;
    }
  }

  async registerConferenceInterest(id: string, userId: string) {
    try {
      const interest = await this.prisma.conferenceInterest.create({
        data: {
          conferenceId: id,
          userId,
        },
      });

      this.logger.log(`Registered interest for conference ${id}`);
      return { interest };
    } catch (error) {
      this.logger.error(
        `Error registering conference interest: ${error.message}`,
      );
      throw error;
    }
  }

  // Books
  async getBooks(category?: string) {
    try {
      const where = category ? { category } : {};

      const books = await this.prisma.book.findMany({
        where,
        orderBy: { title: 'asc' },
      });

      return { books };
    } catch (error) {
      this.logger.error(`Error fetching books: ${error.message}`);
      throw error;
    }
  }

  async getBook(id: string) {
    try {
      const book = await this.prisma.book.findUnique({
        where: { id },
      });

      if (!book) {
        throw new Error('Book not found');
      }

      return { book };
    } catch (error) {
      this.logger.error(`Error fetching book: ${error.message}`);
      throw error;
    }
  }

  async trackBook(trackerData: any) {
    try {
      const tracker = await this.prisma.bookTracker.create({
        data: {
          bookId: trackerData.bookId,
          userId: trackerData.userId,
          status: 'reading',
          startedAt: new Date(),
        },
      });

      this.logger.log(`Created book tracker for user ${trackerData.userId}`);
      return { tracker };
    } catch (error) {
      this.logger.error(`Error tracking book: ${error.message}`);
      throw error;
    }
  }

  async getBookTracker(userId: string) {
    try {
      const trackers = await this.prisma.bookTracker.findMany({
        where: { userId },
        include: {
          book: true,
        },
        orderBy: { startedAt: 'desc' },
      });

      return { trackers };
    } catch (error) {
      this.logger.error(`Error fetching book tracker: ${error.message}`);
      throw error;
    }
  }

  // Blog Posts
  async getBlogPosts(category?: string) {
    try {
      const where = category ? { category } : {};

      const posts = await this.prisma.blogPost.findMany({
        where,
        include: {
          author: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { publishedAt: 'desc' },
      });

      return { posts };
    } catch (error) {
      this.logger.error(`Error fetching blog posts: ${error.message}`);
      throw error;
    }
  }

  async getBlogPost(id: string) {
    try {
      const post = await this.prisma.blogPost.findUnique({
        where: { id },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      if (!post) {
        throw new Error('Blog post not found');
      }

      return { post };
    } catch (error) {
      this.logger.error(`Error fetching blog post: ${error.message}`);
      throw error;
    }
  }

  async createBlogPost(postData: any) {
    try {
      const post = await this.prisma.blogPost.create({
        data: {
          title: postData.title,
          content: postData.content,
          category: postData.category,
          authorId: postData.authorId,
          publishedAt: postData.published ? new Date() : null,
        },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      this.logger.log(`Created blog post: ${postData.title}`);
      return { post };
    } catch (error) {
      this.logger.error(`Error creating blog post: ${error.message}`);
      throw error;
    }
  }

  async updateBlogPost(id: string, postData: any) {
    try {
      const post = await this.prisma.blogPost.update({
        where: { id },
        data: {
          title: postData.title,
          content: postData.content,
          category: postData.category,
          updatedAt: new Date(),
        },
      });

      this.logger.log(`Updated blog post: ${id}`);
      return { post };
    } catch (error) {
      this.logger.error(`Error updating blog post: ${error.message}`);
      throw error;
    }
  }

  async deleteBlogPost(id: string) {
    try {
      await this.prisma.blogPost.delete({
        where: { id },
      });

      this.logger.log(`Deleted blog post: ${id}`);
      return { success: true, message: 'Blog post deleted' };
    } catch (error) {
      this.logger.error(`Error deleting blog post: ${error.message}`);
      throw error;
    }
  }
}
