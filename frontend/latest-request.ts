export class LatestRequest {
  private version = 0;

  begin(): number {
    this.version += 1;
    return this.version;
  }

  invalidate(): void {
    this.version += 1;
  }

  isCurrent(token: number): boolean {
    return token === this.version;
  }
}
