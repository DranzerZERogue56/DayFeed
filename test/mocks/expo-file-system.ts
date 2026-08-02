// Test stand-in for expo-file-system, backed by node's fs so the real read
// paths (and the docx unzip) can run in-memory against fixture files.
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

export class File {
  constructor(public readonly uri: string) {}

  get exists(): boolean {
    return fs.existsSync(this.uri);
  }

  async text(): Promise<string> {
    return fs.promises.readFile(this.uri, 'utf8');
  }

  async bytes(): Promise<Uint8Array> {
    return new Uint8Array(await fs.promises.readFile(this.uri));
  }

  copy(dest: File): void {
    fs.copyFileSync(this.uri, dest.uri);
  }

  delete(): void {
    fs.rmSync(this.uri, { force: true });
  }
}

export class Directory {
  readonly uri: string;

  constructor(base: string, name?: string) {
    this.uri = name ? path.join(base, name) : base;
  }

  get exists(): boolean {
    return fs.existsSync(this.uri);
  }

  create(opts?: { intermediates?: boolean }): void {
    fs.mkdirSync(this.uri, { recursive: opts?.intermediates ?? false });
  }
}

export const Paths = {
  document: path.join(os.tmpdir(), 'dayfeed-test-documents'),
  cache: path.join(os.tmpdir(), 'dayfeed-test-cache'),
};
