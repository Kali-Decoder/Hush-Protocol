import {migrate, closePool} from "./client.js";

migrate()
  .then(async () => {
    await closePool();
    console.log("migrate ok");
  })
  .catch(async (err) => {
    console.error(err);
    await closePool();
    process.exit(1);
  });
