import { execFileSync } from 'child_process';
import { mkdtempSync, writeFileSync, readdirSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { inferSchema, pluralize, singularize } from '../../services/sub2api/src/codegen/schema-inference';
import { generateProjectFiles } from '../../services/sub2api/src/codegen/templates';
import { createZip } from '../../services/sub2api/src/codegen/zip';
import { CodegenService } from '../../services/sub2api/src/codegen/codegen.service';

describe('sub2api codegen engine', () => {
  describe('schema inference', () => {
    it('pluralizes and singularizes common nouns', () => {
      expect(pluralize('task')).toBe('tasks');
      expect(pluralize('category')).toBe('categories');
      expect(pluralize('box')).toBe('boxes');
      expect(singularize('categories')).toBe('category');
      expect(singularize('people')).toBe('person');
    });

    it('infers known entities from a description', () => {
      const schema = inferSchema('A CRM with customers, leads and invoices, with user login', 'Sales CRM');
      const names = schema.entities.map((e) => e.name);
      expect(names).toEqual(expect.arrayContaining(['customer', 'lead', 'invoice']));
      expect(schema.auth).toBe(true);
    });

    it('falls back to a generic entity when nothing is recognised', () => {
      const schema = inferSchema('something entirely unrecognisable');
      expect(schema.entities.length).toBeGreaterThan(0);
      expect(schema.entities[0].fields.length).toBeGreaterThan(0);
    });
  });

  describe('project generation', () => {
    const schema = inferSchema('A todo app with tasks and user auth', 'Todo App');
    const files = generateProjectFiles({
      projectName: 'Todo App',
      description: 'A todo app with tasks and user auth',
      schema,
      supabaseUrl: 'https://abc.supabase.co',
      supabaseAnonKey: 'anon-key-123',
    });

    it('emits a runnable Vite project skeleton', () => {
      for (const path of ['package.json', 'index.html', 'vite.config.ts', 'src/main.tsx', 'src/App.tsx', 'README.md']) {
        expect(Object.keys(files)).toContain(path);
      }
      const pkg = JSON.parse(files['package.json']);
      expect(pkg.dependencies['@supabase/supabase-js']).toBeDefined();
      expect(pkg.scripts.dev).toBe('vite');
    });

    it('emits list, detail, form and hook files per entity', () => {
      for (const entity of schema.entities) {
        expect(files[`src/pages/${entity.pascal}ListPage.tsx`]).toContain(`${entity.pascal}ListPage`);
        expect(files[`src/pages/${entity.pascal}DetailPage.tsx`]).toContain(`${entity.pascal}DetailPage`);
        expect(files[`src/components/${entity.pascal}Form.tsx`]).toContain(`${entity.pascal}Form`);
        expect(files[`src/hooks/use${entity.pascalPlural}.ts`]).toContain(`from('${entity.table}')`);
      }
    });

    it('writes the provisioned Supabase credentials into .env.example', () => {
      expect(files['.env.example']).toContain('https://abc.supabase.co');
      expect(files['.env.example']).toContain('anon-key-123');
    });

    it('enables row level security and grants on every table', () => {
      const sql = files['supabase/migrations/0001_init.sql'];
      for (const entity of schema.entities) {
        expect(sql).toContain(`create table if not exists public.${entity.table}`);
        expect(sql).toContain(`alter table public.${entity.table} enable row level security`);
        expect(sql).toContain(`grant select, insert, update, delete on public.${entity.table} to authenticated`);
        expect(sql).toContain(`grant all on public.${entity.table} to service_role`);
      }
    });

    it('includes an auth gate when the description asks for auth', () => {
      expect(files['src/components/AuthGate.tsx']).toContain('signInWithPassword');
    });
  });

  describe('partial regeneration', () => {
    it('replaces only files matching the target globs', () => {
      const service = new CodegenService();
      const first = service.generate({ projectName: 'Todo App', description: 'a todo app with tasks' });
      const previousFiles = { ...first.files, 'src/App.tsx': 'CUSTOM EDIT', 'README.md': 'CUSTOM README' };

      const second = service.generate({
        projectName: 'Todo App',
        description: 'a todo app with tasks',
        targetFiles: ['src/App.tsx'],
        previousFiles,
      });

      expect(second.files['src/App.tsx']).not.toBe('CUSTOM EDIT');
      expect(second.files['README.md']).toBe('CUSTOM README');
    });

    it('regenerates everything when no targets are given', () => {
      const service = new CodegenService();
      const result = service.generate({
        projectName: 'Todo App',
        description: 'a todo app with tasks',
        previousFiles: { 'README.md': 'CUSTOM README' },
      });
      expect(result.files['README.md']).not.toBe('CUSTOM README');
    });
  });

  describe('zip archive', () => {
    it('produces an archive that standard unzip can extract', () => {
      const buffer = createZip({
        'README.md': '# hello\n'.repeat(50),
        'src/main.tsx': 'console.log("hi");',
      });

      expect(buffer.subarray(0, 4).toString('hex')).toBe('504b0304');

      const dir = mkdtempSync(join(tmpdir(), 'sub2api-zip-'));
      const zipPath = join(dir, 'out.zip');
      writeFileSync(zipPath, buffer);

      let unzipAvailable = true;
      try {
        execFileSync('unzip', ['-o', zipPath, '-d', join(dir, 'extracted')], { stdio: 'ignore' });
      } catch (err: any) {
        if (err?.code === 'ENOENT') unzipAvailable = false;
        else throw err;
      }

      if (unzipAvailable) {
        expect(readdirSync(join(dir, 'extracted')).sort()).toEqual(['README.md', 'src']);
        expect(existsSync(join(dir, 'extracted', 'src', 'main.tsx'))).toBe(true);
      }
    });
  });
});
