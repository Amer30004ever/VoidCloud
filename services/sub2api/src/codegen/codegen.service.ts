import { Injectable } from '@nestjs/common';
import { inferSchema, InferredSchema } from './schema-inference';
import { generateProjectFiles } from './templates';
import { createZip } from './zip';

export interface CodegenInput {
  projectName: string;
  description: string;
  supabaseUrl?: string | null;
  supabaseAnonKey?: string | null;
  /** When set, only files whose path matches one of these globs are regenerated. */
  targetFiles?: string[];
  /** Previously generated files, merged with the new output during partial regeneration. */
  previousFiles?: Record<string, string> | null;
}

export interface CodegenResult {
  files: Record<string, string>;
  schema: InferredSchema;
}

function matches(path: string, patterns: string[]): boolean {
  return patterns.some((raw) => {
    const pattern = raw.trim();
    if (!pattern) return false;
    if (pattern === path) return true;
    const regex = new RegExp(
      `^${pattern
        .replace(/[.+^${}()|[\]\\]/g, '\\$&')
        .replace(/\*\*/g, '\u0000')
        .replace(/\*/g, '[^/]*')
        .replace(/\u0000/g, '.*')}$`,
      'i',
    );
    return regex.test(path);
  });
}

@Injectable()
export class CodegenService {
  /** Infer the data model from a natural-language description. */
  infer(description: string, projectName = ''): InferredSchema {
    return inferSchema(description, projectName);
  }

  /** Generate a complete React + Supabase project, optionally regenerating only some files. */
  generate(input: CodegenInput): CodegenResult {
    const schema = this.infer(input.description, input.projectName);
    const fresh = generateProjectFiles({
      projectName: input.projectName,
      description: input.description,
      schema,
      supabaseUrl: input.supabaseUrl,
      supabaseAnonKey: input.supabaseAnonKey,
    });

    if (input.targetFiles?.length && input.previousFiles) {
      const merged: Record<string, string> = { ...input.previousFiles };
      for (const [path, contents] of Object.entries(fresh)) {
        if (matches(path, input.targetFiles)) merged[path] = contents;
      }
      return { files: merged, schema };
    }

    return { files: fresh, schema };
  }

  /** Package a generated file map into a downloadable zip archive. */
  archive(files: Record<string, string>): Buffer {
    return createZip(files);
  }
}
