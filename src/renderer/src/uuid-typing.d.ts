// The DOM library exposes randomUUID() as a UUID template-literal type.
// Experiment identifiers are persisted as general strings for backwards
// compatibility with imported and older saved experiments, so keep the
// renderer-facing return type widened to string.
interface Crypto {
  randomUUID(): string;
}
