process.env.NODE_ENV = "test";
require("dotenv").config({ quiet: true });
process.env.SECRET =
  process.env.SECRET || "fixon-test-only-secret-at-least-32-characters";
